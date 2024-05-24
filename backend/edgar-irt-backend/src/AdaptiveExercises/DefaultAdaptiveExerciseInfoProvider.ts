import { TransactionContext } from "../Database/TransactionContext.js";
import { DbConnProvider } from "../DbConnProvider.js";
import { IAdaptiveExerciseInitialThetaGenerator } from "../Logic/IAdaptiveExerciseInitialThetaGenerator.js";
import { IAdaptiveExerciseNextQuestionGenerator } from "../Logic/IAdaptiveExerciseNextQuestionGenerator.js";
import { IAdaptiveExerciseThetaDeltaGenerator, ThetaDeltaInfo } from "../Logic/IAdaptiveExerciseThetaDeltaGenerator.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";
import { IQuestionAnswer } from "../Models/Database/Edgar/IQuestionAnswer.js";
import { QuestionIrtClassification } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { LogisticFunction } from "../Models/Irt/LogisticFunction.js";
import { AdaptiveExerciseService, IQuestionPoolQuestion } from "../Services/AdaptiveExerciseService.js";
import { EdgarService } from "../Services/EdgarService.js";
import { ExerciseDefinitionService } from "../Services/ExerciseDefinitionService.js";
import { QuestionClassificationUtil } from "../Util/QuestionClassificationUtil.js";

type QuestionAnswerStreak = "correct" | "skip" | "incorrect";

export class DefaultAdaptiveExerciseInfoProvider implements 
    IAdaptiveExerciseInitialThetaGenerator,
    IAdaptiveExerciseNextQuestionGenerator, 
    IAdaptiveExerciseThetaDeltaGenerator
{
    private static readonly CORRECT_STREAK_TO_UPGRADE = 3;
    private static readonly SKIP_STREAK_TO_DOWNGRADE = 5;
    private static readonly INCORRECT_STREAK_TO_DOWNGRADE = 2;

    constructor(
        private readonly edgarService: EdgarService,
        private readonly adaptiveExerciseService: AdaptiveExerciseService,
    ) {}

    private static getQuestionStreakType(question: IExerciseInstanceQuestion): QuestionAnswerStreak {
        if (question.question_skipped) {
            return "skip";
        }

        return (question.user_answer_correct) ? "correct" : "incorrect";
    }

    async generateTheta(idCourse: number, idStudent: number, previousExercises: IExerciseInstance[]): Promise<number> {
        return (previousExercises.length === 0) ?
            (1.0) :
            (
                previousExercises.reduce(
                    (acc, el) => acc + el.final_irt_theta,
                    0
                ) / previousExercises.length
            );
    }

    private async filterQuestionPool(
        exercise: IExerciseInstance,
        qPool: IQuestionPoolQuestion[],
        initial: boolean,
        previousQuestions?: IExerciseInstanceQuestion[],
    ): Promise<IQuestionPoolQuestion[]> {
        const useOldLogic: boolean = false;

        const exerciseDefinition = await this.adaptiveExerciseService.getExerciseDefinition(exercise.id);

        let streakType: QuestionAnswerStreak | null = null;
        let streak = 0;

        let difficultyClass: QuestionIrtClassification | null = null;
        let classStreak = 0;

        let lastQuestionInfo: { correct: boolean, skipped: boolean } | null = null;

        if ((previousQuestions ?? null) !== null && previousQuestions!.length !== 0) {
            const lastQuestion = previousQuestions![0];

            lastQuestionInfo = { correct: lastQuestion.user_answer_correct, skipped: lastQuestion.question_skipped };
            streakType = DefaultAdaptiveExerciseInfoProvider.getQuestionStreakType(lastQuestion);
            difficultyClass = lastQuestion.question_difficulty;

            let classStreakBroken = false;

            for (const question of previousQuestions!) {
                if (DefaultAdaptiveExerciseInfoProvider.getQuestionStreakType(question) !== streakType) {
                    break;
                }

                if (!classStreakBroken && question.question_difficulty === difficultyClass) {
                    classStreak++;
                } else {
                    classStreakBroken = true;
                }

                streak++;
            }
        }
        
        if (useOldLogic) {
            return qPool.filter(q => {
                const logFn = LogisticFunction.withParams({
                    itemDifficulty: q.item_difficulty,
                    levelOfItemKnowledge: q.level_of_item_knowledge,
                    itemGuessProbability: q.item_guess_probability,
                    itemMistakeProbability: q.item_mistake_probability,
                }, q.default_item_offset_parameter);
    
                const correctAnswerProbability = logFn.fourParamLogisticFn(exercise.current_irt_theta);
    
                if (initial && (exercise.start_difficulty ?? null) !== null) {
                    return q.question_irt_classification === exercise.start_difficulty;
                } else if (initial) {
                    return correctAnswerProbability >= 0.2;
                } else {
                    const goodQuestion = QuestionClassificationUtil.instance.compareQuestionClasses(
                        q.question_irt_classification,
                        exercise.current_difficulty,
                    );
    
                    const classJump = Math.abs(QuestionClassificationUtil.instance.getClassJump(
                        q.question_irt_classification,
                        exercise.current_difficulty,
                    ));
    
                    // Next question has to be harder or equally as hard as the previous question if the answer to the
                    // previous question was correct
                    return ((lastQuestionInfo!.correct && goodQuestion >= 0 && correctAnswerProbability <= 0.5) ||
    
                        // Next question has to be easier or equally as hard as the previous question if the answer to the
                        // previous question was incorrect or the question was skipped 
                        (
                            (!lastQuestionInfo!.correct || lastQuestionInfo!.skipped) &&
                            goodQuestion <= 0 &&
                            correctAnswerProbability >= 0.6
                        )) && classJump <= 2;
                }
            });
        } else {
            return qPool.filter(q => {
                if (initial && (exercise.start_difficulty ?? null) !== null) {
                    return q.question_irt_classification === exercise.start_difficulty;
                } else if (initial) {
                    const logFn = LogisticFunction.withParams({
                        itemDifficulty: q.item_difficulty,
                        levelOfItemKnowledge: q.level_of_item_knowledge,
                        itemGuessProbability: q.item_guess_probability,
                        itemMistakeProbability: q.item_mistake_probability,
                    }, q.default_item_offset_parameter);
        
                    const correctAnswerProbability = logFn.fourParamLogisticFn(exercise.current_irt_theta);
                    return correctAnswerProbability >= 0.2;
                }

                const classJump = QuestionClassificationUtil.instance.getClassJump(
                    difficultyClass!,
                    q.question_irt_classification,
                );

                let testStreak: number;

                switch (streakType) {
                    case "correct": {
                        const streakToUpgrade = exerciseDefinition?.correct_answers_to_upgrade ??
                            DefaultAdaptiveExerciseInfoProvider.CORRECT_STREAK_TO_UPGRADE;

                        testStreak = (streak - 1) % streakToUpgrade;
                        testStreak++;

                        return classJump === 0 && testStreak < streakToUpgrade
                        || (QuestionClassificationUtil.instance.isHighestClass(difficultyClass!) && classJump === 0 || classJump === 1) &&
                            testStreak >= streakToUpgrade;
                    }

                    case "skip": {
                        const streakToDowngrade = exerciseDefinition?.incorrect_answers_to_downgrade ??
                            DefaultAdaptiveExerciseInfoProvider.SKIP_STREAK_TO_DOWNGRADE;

                        testStreak = (streak - 1) % streakToDowngrade;
                        testStreak++;

                        return classJump === 0 && testStreak < streakToDowngrade
                        || (QuestionClassificationUtil.instance.isLowestClass(difficultyClass!) && classJump === 0 || classJump === -1) &&
                            testStreak >= streakToDowngrade;
                    }

                    case "incorrect": {
                        const streakToDowngrade = exerciseDefinition?.skipped_questions_to_downgrade ??
                            DefaultAdaptiveExerciseInfoProvider.INCORRECT_STREAK_TO_DOWNGRADE;

                        testStreak = (streak - 1) % streakToDowngrade;
                        testStreak++;

                        return classJump === 0 && testStreak < streakToDowngrade
                        || (QuestionClassificationUtil.instance.isLowestClass(difficultyClass!) && classJump === 0 || classJump === -1) &&
                                testStreak >= streakToDowngrade;
                    }
                }
            });
        }
    }

    async provideQuestion(
        exercise: IExerciseInstance,
        questionPool: IQuestionPoolQuestion[],
        transactionCtx: TransactionContext | null,
        initial: boolean,
        previousQuestions?: IExerciseInstanceQuestion[]
    ): Promise<
        Pick<
            IExerciseInstanceQuestion,
            "id_question" | "id_question_irt_cb_info" | "id_question_irt_tb_info" | "correct_answers"
        >
    > {
        const dbConn = DbConnProvider.getDbConn();
        
        const filteredQuestionPool = await this.filterQuestionPool(exercise, questionPool, initial, previousQuestions);

        const q = filteredQuestionPool[Math.round(Math.random() * (filteredQuestionPool.length - 1))];
        const answers = (
            await this.edgarService.getQuestionAnswers(q.id, true)
        ) as (IQuestionAnswer & { is_correct: boolean })[] | null;

        const sql =
        `SELECT id_question_param_calculation AS id_course_based_info,
                default_item_offset_parameter,
                level_of_item_knowledge,
                item_difficulty,
                item_guess_probability,
                item_mistake_probability,
                question_irt_classification,
                id_based_on_course AS id_course,
                calculation_group,
                id_question
        FROM statistics_schema.question_param_course_level_calculation
            JOIN statistics_schema.question_param_calculation
                ON question_param_course_level_calculation.id_question_param_calculation = question_param_calculation.id
        WHERE question_param_calculation.id_question = $1 AND
            question_param_calculation.id_based_on_course = $2`;
        const params =
            [
                /* $1 */ q.id,
                /* $2 */ exercise.id_course,
            ];

        const irtInfoArr: IEdgarStatProcessingQuestionIRTInfo[] = (
            (transactionCtx === null) ?
                await dbConn.doQuery<IEdgarStatProcessingQuestionIRTInfo>(sql, params) :
                await transactionCtx.doQuery<IEdgarStatProcessingQuestionIRTInfo>(sql, params)
        )?.rows ?? [];

        const sqlYears =
            `SELECT DISTINCT id_academic_year
            FROM statistics_schema.question_param_calculation
                JOIN statistics_schema.question_param_calculation_academic_year
                    ON question_param_calculation.id =
                        question_param_calculation_academic_year.id_question_param_calculation
            WHERE calculation_group = $1`;

        const sqlTestBasedCalcs =
            `SELECT DISTINCT id AS id_test_based_info,
                    id_based_on_test
            FROM statistics_schema.question_param_calculation
            WHERE id_based_on_test IS NOT NULL AND
                    calculation_group = $1 AND
                    id_question = $2`;

        for (const info of irtInfoArr) {
            const paramsYears = [ info.calculation_group ];
            const paramsTestBasedCalcs = [ info.calculation_group, q.id ];

            const acYearIds: number[] = (
                (transactionCtx === null) ?
                    await dbConn.doQuery<{ id_academic_year: number }>(sqlYears, paramsYears) :
                    await transactionCtx.doQuery<{ id_academic_year: number }>(sqlYears, paramsYears)
            )?.rows.map(r => r.id_academic_year) ?? [];

            const tbInfoIds: { id_test_based_info: number, id_based_on_test: number }[] = (
                (transactionCtx === null) ?
                    await dbConn.doQuery<{ id_test_based_info: number, id_based_on_test: number }>(
                        sqlTestBasedCalcs,
                        paramsTestBasedCalcs
                    ) :
                    await transactionCtx.doQuery<{ id_test_based_info: number, id_based_on_test: number }>(
                        sqlTestBasedCalcs,
                        paramsTestBasedCalcs
                    )
            )?.rows ?? [];

            info.id_academic_years = acYearIds;
            info.testBasedInfo = tbInfoIds;
        }

        const irtInfo = irtInfoArr[0] ?? null;
        if (irtInfo === null) {
            throw new Error("IRT info was null");
        }

        return {
            id_question: q.id,
            correct_answers: answers?.filter(a => a.is_correct).map(a => a.ordinal) ?? null,
            id_question_irt_cb_info: irtInfo.id_course_based_info,
            id_question_irt_tb_info: irtInfo.testBasedInfo.map(tbi => tbi.id_test_based_info),
        };
    }

    async generateThetaDelta(
        currentQuestionStatus: { skipped: boolean; correct: boolean; },
        previousQuestions: IExerciseInstanceQuestion[]
    ): Promise<ThetaDeltaInfo> {
        return {
            type: "percentage",
            value: (currentQuestionStatus.skipped) ? -0.04 : ((currentQuestionStatus.correct) ? 0.08 : -0.08)
        };
    }
    
}
