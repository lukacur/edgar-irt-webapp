import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IAdaptiveExerciseInitialThetaGenerator } from "../Logic/IAdaptiveExerciseInitialThetaGenerator.js";
import { IAdaptiveExerciseNextQuestionGenerator } from "../Logic/IAdaptiveExerciseNextQuestionGenerator.js";
import { IAdaptiveExerciseThetaDeltaGenerator, ThetaDeltaInfo } from "../Logic/IAdaptiveExerciseThetaDeltaGenerator.js";
import { ICurrentExercise } from "../Models/Database/AdaptiveExercise/ICurrentExercise.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";
import { IQuestionType } from "../Models/Database/Edgar/IQuestionType.js";
import { QuestionIrtClassification } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { QuestionClassificationUtil } from "../Util/QuestionClassificationUtil.js";
import { EdgarService } from "./EdgarService.js";

export interface IQuestionPoolQuestion extends IQuestion {
    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
    question_irt_classification: QuestionIrtClassification;
}

type CurrentExerciseInfo = {
    exerciseInstance: IExerciseInstance | null;
    lastQuestion: IExerciseInstanceQuestion | null;
}

export class AdaptiveExerciseService {
    constructor(
        private readonly dbConn: DatabaseConnection,

        private readonly edgarService: EdgarService,

        private nextQuestionGenerator?: IAdaptiveExerciseNextQuestionGenerator,
        private initialThetaGenerator?: IAdaptiveExerciseInitialThetaGenerator,
        private thetaDeltaGenerator?: IAdaptiveExerciseThetaDeltaGenerator,
    ) {}

    public setNextQuestionGenerator(nqg: IAdaptiveExerciseNextQuestionGenerator) {
        if (this.nextQuestionGenerator) {
            return;
        }

        this.nextQuestionGenerator = nqg;
    }

    public setInitialThetaGenerator(itg: IAdaptiveExerciseInitialThetaGenerator) {
        if (this.initialThetaGenerator) {
            return;
        }

        this.initialThetaGenerator = itg;
    }

    public setThetaDeltaGenerator(tdg: IAdaptiveExerciseThetaDeltaGenerator) {
        if (this.thetaDeltaGenerator) {
            return;
        }

        this.thetaDeltaGenerator = tdg;
    }

    public async getQuestionPool(
        idExercise: number,
        idExerciseDefinition: number,
        transaction: TransactionContext | null,
    ): Promise<IQuestionPoolQuestion[]> {
        return (
            await (transaction ?? this.dbConn).doQuery<IQuestionPoolQuestion>(
                `SELECT DISTINCT question.*,
                    NULL AS default_item_offset_parameter,
                    NULL AS level_of_item_knowledge,
                    NULL AS item_difficulty,
                    NULL AS item_guess_probability,
                    NULL AS item_mistake_probability,
                    CASE
                        WHEN exercise_question_difficulty.question_difficulty_override IS NOT NULL
                            THEN exercise_question_difficulty.question_difficulty_override
                        ELSE
                            exercise_question_difficulty.question_difficulty
                    END AS question_irt_classification
                FROM public.question
                    JOIN adaptive_exercise.exercise_allowed_question_type
                        ON question.id_question_type = exercise_allowed_question_type.id_question_type
                    JOIN public.question_node
                        ON question.id = question_node.id_question
                    JOIN adaptive_exercise.exercise_node_whitelist
                        ON question_node.id_node = exercise_node_whitelist.id_node
                    JOIN adaptive_exercise.exercise_instance
                        ON exercise_node_whitelist.id_exercise_definition = exercise_instance.id_exercise_definition
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                    JOIN adaptive_exercise.exercise_question_difficulty
                        ON question.id = exercise_question_difficulty.id_question AND
                            exercise_definition.id = exercise_question_difficulty.id_exercise_definition
                WHERE question.is_active AND
                    exercise_definition.id = $1 AND
                    (
                        exercise_question_difficulty.question_difficulty_override IS NOT NULL OR
                        exercise_question_difficulty.question_difficulty IS NOT NULL
                    ) AND
                    question.id NOT IN (
                        SELECT id_question
                        FROM adaptive_exercise.exercise_instance_question AS eiq
                        WHERE eiq.id_exercise = $2
                    )`,
                [
                    /* $1 */ idExerciseDefinition,
                    /* $2 */ idExercise,
                ]
            )
        )?.rows ?? [];
    }

    public async getExerciseDefinition(idExerciseInstance: number): Promise<IExerciseDefinition | null> {
        return (
            await this.dbConn.doQuery<IExerciseDefinition>(
                `SELECT exercise_definition.*
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE exercise_instance.id = $1`,
                [ idExerciseInstance ]
            )
        )?.rows[0] ?? null;
    }

    public async getAllowedQuestionTypes(): Promise<IQuestionType[]> {
        return (
            await this.dbConn.doQuery<IQuestionType>(
                `SELECT id_question_type,
                        type_name AS question_type_name,
                        allowed_on
                FROM adaptive_exercise.exercise_allowed_question_type
                    JOIN public.question_type
                        ON exercise_allowed_question_type.id_question_type = question_type.id`
            )
        )?.rows ?? [];
    }

    public async getAvailableQuestionTypesToAllow(): Promise<IQuestionType[]> {
        return (
            await this.dbConn.doQuery<IQuestionType>(
                `SELECT id AS id_question_type,
                        type_name AS question_type_name
                FROM public.question_type
                WHERE id NOT IN (
                    SELECT id_question_type
                    FROM adaptive_exercise.exercise_allowed_question_type
                )`
            )
        )?.rows ?? [];
    }

    public async allowQuestionTypes(idQuestionTypes: number[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const idQuestionType of idQuestionTypes) {
                await transaction.doQuery(
                    `INSERT INTO adaptive_exercise.exercise_allowed_question_type (id_question_type) VALUES ($1)`,
                    [idQuestionType]
                );
            }

            await transaction.commit();

            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    public async disallowQuestionTypes(idQuestionTypes: number[]): Promise<boolean> {
        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const idQuestionType of idQuestionTypes) {
                await transaction.doQuery(
                    `DELETE FROM exercise_allowed_question_type WHERE id_question_type = $1`,
                    [idQuestionType]
                );
            }

            await transaction.commit();

            return true;
        } catch {
            return false;
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    public async getStudentStartingDifficulty(
        idStudent: number,
        idExerciseDefinition: number | null,
    ): Promise<QuestionIrtClassification | null> {
        if (idExerciseDefinition === null) {
            return null;
        }

        const previousExerciseDifficulties = (
            await this.dbConn.doQuery<
                { final_difficulty: QuestionIrtClassification, correctness: 'skipped' | 'correct' | 'incorrect' }
            >(
                `SELECT exercise_instance_question.question_difficulty AS final_difficulty,
                    CASE
                        WHEN question_skipped THEN 'skipped'
                        WHEN user_answer_correct THEN 'correct'
                        ELSE 'incorrect'
                    END AS correctness
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_instance_question
                        ON exercise_instance.id = exercise_instance_question.id_exercise
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE id_student_started = $1 AND
                    id_exercise_definition = $2 AND
                    exercise_instance.finished_on IS NOT NULL`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idExerciseDefinition,
                ]
            )
        )?.rows ?? [];

        const calculationPreparedPrevExers = previousExerciseDifficulties
            .filter(ed => ed !== null && ed.final_difficulty !== null);

        if (calculationPreparedPrevExers.length === 0) {
            return null;
        }

        const difficultyRanks = QuestionClassificationUtil.instance.getDifficultyRanks(
            calculationPreparedPrevExers.filter(ed => ed.correctness === 'correct').map(ed => ed.final_difficulty)
        );

        const avgDifficulty = QuestionClassificationUtil.instance.getDifficultyForRank(
            Math.round(
                difficultyRanks.reduce((acc, el) => acc + el, 0) / calculationPreparedPrevExers.length
            )
        );

        return avgDifficulty;
    }

    public async getPreviousExercises(idStudent: number, idCourse: number): Promise<IExerciseInstance[]> {
        return (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT exercise_instance.*,
                    exercise_definition.id_course,
                    exercise_definition.exercise_name
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE id_student_started = $1 AND
                    exercise_instance.id_course = $2 AND
                    is_finished
                ORDER BY started_on DESC`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idCourse,
                ]
            )
        )?.rows ?? [];
    }

    public async getCurrentExercise(idStudent: number, idCourse: number): Promise<CurrentExerciseInfo> {
        const ret: CurrentExerciseInfo = { exerciseInstance: null, lastQuestion: null };

        const exerInst: IExerciseInstance | null = (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT exercise_instance.*,
                        exercise_definition.id_course
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE id_student_started = $1 AND
                        id_course = $2 AND
                        NOT is_finished`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idCourse,
                ]
            )
        )?.rows[0] ?? null;

        if (exerInst === null) {
            return ret;
        }

        ret.exerciseInstance = exerInst;

        const lastQuestionInst: IExerciseInstanceQuestion | null = (
            await this.dbConn.doQuery<IExerciseInstanceQuestion>(
                `SELECT exercise_instance_question.*,
                    exercise_definition.id_course
                FROM adaptive_exercise.exercise_instance_question
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE id_exercise = $1 AND
                        finished_on IS NULL`,
                [
                    /* $1 */ exerInst.id,
                ]
            )
        )?.rows[0] ?? null;

        if (lastQuestionInst === null) {
            return ret;
        }

        ret.lastQuestion = lastQuestionInst;

        return ret;
    }


    //#region Start exercise region
    private async getNthLastExerciseQuestion(
        idExercise: number,
        offset: number = 0,
        transaction: TransactionContext,
    ): Promise<IExerciseInstanceQuestion | null> {
        return (
            await transaction.doQuery<IExerciseInstanceQuestion>(
                `SELECT exercise_instance_question.*
                FROM exercise_instance_question
                WHERE id_exercise = $1
                ORDER BY question_ordinal DESC
                OFFSET $2
                LIMIT 1`,
                [idExercise, offset]
            )
        )?.rows[0] ?? null;
    }

    private async getPreviousExerciseQuestions(
        transaction: TransactionContext,
        idExercise: number,
        skip: number,
    ): Promise<IExerciseInstanceQuestion[]> {
        return (
            await transaction.doQuery<IExerciseInstanceQuestion>(
                `SELECT exercise_instance_question.*
                FROM adaptive_exercise.exercise_instance_question
                WHERE id_exercise = $1
                ORDER BY question_ordinal DESC
                OFFSET $2`,
                [
                    /* $1 */ idExercise,
                    /* $2 */ skip,
                ]
            )
        )?.rows ?? [];
    }

    private async insertNextQuestionInfo(
        exerId: number,
        nextQuestionInfo: Pick<IExerciseInstanceQuestion, "id_question" | "question_difficulty" | "id_question_irt_tb_info" | "correct_answers">,
        transactionCtx: TransactionContext
    ): Promise<IExerciseInstanceQuestion | null> {
        const answersNull = nextQuestionInfo.correct_answers === null || nextQuestionInfo.correct_answers.length === 0;

        await transactionCtx.doQuery<{ id: number }>(
            `INSERT INTO exercise_instance_question (
                id_exercise,

                id_question,

                question_difficulty,

                question_ordinal,

                correct_answers
            ) VALUES ($1, $2, $3, 1, $4)`,
            [
                /* $1 */ exerId,
                /* $2 */ nextQuestionInfo.id_question,
                /* $3 */ nextQuestionInfo.question_difficulty,
                /* $4 */ (answersNull) ? null : '{' + nextQuestionInfo.correct_answers!.join(",") + '}',
            ]
        );

        await transactionCtx.doQuery(
            `UPDATE adaptive_exercise.exercise_instance
            SET current_difficulty = $1
            WHERE id = $2`,
            [
                /* $1 */ nextQuestionInfo.question_difficulty,
                /* $2 */ exerId,
            ]
        );

        return await this.getNthLastExerciseQuestion(exerId, undefined, transactionCtx);
    }

    private async applyThetaDeltaInfo(
        transaction: TransactionContext,
        idExercise: number,
        deltaInfo: ThetaDeltaInfo,
        wasLastQuestion: boolean
    ): Promise<boolean> {
        const current: number | null = (
            await transaction.doQuery<{ current_irt_theta: number }>(
                `SELECT current_irt_theta
                FROM adaptive_exercise.exercise_instance
                WHERE id = $1`,
                [idExercise]
            )
        )?.rows[0]?.current_irt_theta ?? null;

        if (current === null) {
            return false;
        }

        const nextValue = ((deltaInfo.type === "absolute") ?
            (current + deltaInfo.value) :
            (current * (1 + deltaInfo.value)));

        return ((
            await transaction.doQuery(
                `UPDATE adaptive_exercise.exercise_instance
                    SET (current_irt_theta, final_irt_theta) = ($1, $2)
                WHERE id = $3`,
                [
                    /* $1 */ nextValue,
                    /* $2 */ (wasLastQuestion) ? nextValue : null,
                    /* $3 */ idExercise,
                ]
            )
        ) ?? null) !== null;
    }


    public async startExercise(
        idStudent: number,
        idCourse: number,
        idExerciseDefinition: number,
        questionsCount: number,
        startDifficulty: QuestionIrtClassification,
        considerPreviousExercises: boolean,
    ): Promise<ICurrentExercise | { status: number, error: string | null }> {
        if (this.initialThetaGenerator === undefined || this.nextQuestionGenerator === undefined) {
            throw new Error("Service not properly configured");
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            const prevExercises: IExerciseInstance[] = [];
            if (considerPreviousExercises) {
                prevExercises.push(
                    ...(
                        (
                            await transaction.doQuery<IExerciseInstance>(
                                `SELECT exercise_instance.*,
                                    exercise_definition.id_course
                                FROM exercise_instance
                                    JOIN adaptive_exercise.exercise_definition
                                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                                WHERE id_student_started = $1 AND
                                    id_exercise_definition = $2`,
                                [
                                    /* $1 */ idStudent,
                                    /* $2 */ idExerciseDefinition,
                                ]
                            )
                        )?.rows ?? []
                    )
                );
            }
    
            const exerId: number | null = (await transaction.doQuery<{ id: number }>(
                `INSERT INTO exercise_instance (
                    id_student_started,
                    id_exercise_definition,

                    start_difficulty,
                    current_difficulty,
    
                    start_irt_theta,
                    current_irt_theta,
    
                    questions_count
                ) VALUES ($1, $2, $3, $3, $4, $4, $5) RETURNING id`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idExerciseDefinition,
                    /* $3 */ startDifficulty,
                    /* $4 */ await this.initialThetaGenerator.generateTheta(idCourse, idStudent, prevExercises),
                    /* $5 */ questionsCount,
                ]
            ))?.rows[0]?.id ?? null;
    
            if (exerId === null) {
                return {
                    error: "ExerID is null",
                    status: 500,
                };
            }
    
            const exerInfo: IExerciseInstance | null = (
                await transaction.doQuery<IExerciseInstance>(
                    `SELECT exercise_instance.*,
                        exercise_definition.id_course
                    FROM exercise_instance
                        JOIN adaptive_exercise.exercise_definition
                            ON exercise_instance.id_exercise_definition = exercise_definition.id
                    WHERE id = $1`,
                    [exerId]
                )
            )?.rows[0] ?? null;
    
            if (exerInfo === null) {
                return {
                    error: "ExerInfo is null",
                    status: 500,
                };
            }

            const questionPool = await this.getQuestionPool(
                exerId,
                idExerciseDefinition,
                transaction
            );
            if (questionPool.length === 0 || questionPool.length < questionsCount * 2) {
                return {
                    error: "Not enough questions to create an exercise",
                    status: 400,
                };
            }
    
            const nextQuestionInfo = await this.nextQuestionGenerator.provideQuestion(
                exerInfo,
                questionPool,
                transaction,
                true
            );
    
            const insertedQuestionInfo = await this.insertNextQuestionInfo(exerId, nextQuestionInfo, transaction);
    
            if (insertedQuestionInfo === null) {
                return {
                    error: "InsertedQI was null",
                    status: 500,
                };
            }
            
            const questionInfo = (
                await transaction.doQuery<IQuestion>(
                    `SELECT *
                    FROM public.question
                    WHERE id = $1`,
                    [insertedQuestionInfo.id_question]
                )
            )?.rows[0] ?? null;
            if (questionInfo === null) {
                return {
                    error: "QI was null",
                    status: 500,
                };
            }
    
            const currentExercise: ICurrentExercise = {
                exerciseInstance: exerInfo,
                questionInfo: {
                    ...insertedQuestionInfo,
                    question_text: questionInfo.question_text,
                    correct_answers: null,
                },
                questionAnswers: await this.edgarService.getQuestionAnswers(insertedQuestionInfo.id_question),
            };

            await transaction.commit();
    
            return currentExercise;
        } catch (err) {
            return {
                error: (<any>err).toString(),
                status: 400,
            };
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    //#endregion

    //#region Advance question
    private async setLastQuestionAnswer(
        transaction: TransactionContext,
        idExercise: number,
        answerCodeText: string | null,
        answers: number[] | null,
    ): Promise<{ success: boolean, answerCorrect: boolean }> {
        const exerInstQuestion = await this.getNthLastExerciseQuestion(idExercise, 0, transaction);
        if (exerInstQuestion === null) {
            throw new Error("Exercise has no defined last question");
        }

        if (exerInstQuestion.correct_answers === null) {
            // TODO: Integrate with code evaluation
            const res = await transaction.doQuery(
                `UPDATE adaptive_exercise.exercise_instance_question
                    SET (student_answer_code, student_answer_text, user_answer_correct) = ($1, $1, FALSE)
                    WHERE id = $2`,
                [
                    /* $1 */ answerCodeText,
                    /* $2 */ exerInstQuestion.id,
                ]
            );
            if (res === null) {
                throw new Error(`Unable to update values for the last exercise question (exer. ID: ${idExercise})`);
            }

            return { success: true, answerCorrect: false, };
        }

        if (answers !== null) {
            const answerCorrect =
                answers.every(answer => exerInstQuestion.correct_answers?.includes(answer)) &&
                    answers.length === exerInstQuestion.correct_answers.length;

            const res = await transaction.doQuery(
                `UPDATE adaptive_exercise.exercise_instance_question
                    SET (student_answers, user_answer_correct) = ($1, $2)
                    WHERE id = $3`,
                [
                    /* $1 */ '{' + answers.join(', ') + '}',
                    /* $2 */ answerCorrect,
                    /* $3 */ exerInstQuestion.id,
                ]
            );
            if (res === null) {
                throw new Error(`Unable to update values for the last exercise question (exer. ID: ${idExercise})`);
            }

            return {
                success: true,
                answerCorrect,
            };
        }

        return { success: true, answerCorrect: false };
    }

    public async advanceQuestion(
        idExercise: number,
        studentAnswers: number[] | null,
        studentTextAnswer: string | null,
        questionSkipped: boolean | null,
        questionCorrect: boolean | null,
    ): Promise<IExerciseInstanceQuestion | { exerciseComplete: true } | { status: number, error: string | null }> {
        if (this.thetaDeltaGenerator === undefined || this.nextQuestionGenerator === undefined) {
            throw new Error("Service not properly configured");
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            const answerSetActionResult = await this.setLastQuestionAnswer(
                transaction,
                idExercise,
                studentTextAnswer,
                studentAnswers,
            );
        
            const lastQuestionOrdinal: number = (await transaction.doQuery<{ last_question_ordinal: number }>(
                `SELECT MAX(question_ordinal) AS last_question_ordinal
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_instance_question
                        ON exercise_instance.id = exercise_instance_question.id_exercise
                WHERE exercise_instance.id = $1
                GROUP BY exercise_instance.id`,
                [idExercise]
            ))?.rows[0]?.last_question_ordinal ?? -1;

            const exerDef: IExerciseDefinition | null =
                await this.getExerciseDefinition(idExercise);
            if (exerDef === null) {
                return {
                    error: null,
                    status: 400,
                };
            }

            const exercise: IExerciseInstance | null = (
                await transaction.doQuery<IExerciseInstance>(
                    `SELECT exercise_instance.*,
                        exercise_definition.id_course
                    FROM adaptive_exercise.exercise_instance
                        JOIN adaptive_exercise.exercise_definition
                            ON exercise_instance.id_exercise_definition = exercise_definition.id
                    WHERE id = $1`,
                    [idExercise]
                )
            )?.rows[0] ?? null;
            if (exercise === null) {
                return {
                    error: null,
                    status: 400,
                };
            }

            const wasFinalQuestion = lastQuestionOrdinal === exercise.questions_count;

            const thetaDeltaInfo = await this.thetaDeltaGenerator.generateThetaDelta(
                exerDef,
                {
                    correct: (questionSkipped) ? false : (questionCorrect ?? answerSetActionResult.answerCorrect),
                    skipped: questionSkipped ?? false,
                },
                await this.getPreviousExerciseQuestions(transaction, idExercise, 1)
            );

            const thetaDeltaApplied = await this.applyThetaDeltaInfo(
                transaction,
                idExercise,
                thetaDeltaInfo,
                wasFinalQuestion
            );
            if (!thetaDeltaApplied) {
                return {
                    error: "Theta delta not applied",
                    status: 500,
                };
            }

            await transaction.doQuery(
                `UPDATE adaptive_exercise.exercise_instance_question
                    SET (
                        finished_on,
                        user_answer_correct,
                        question_skipped,
                        irt_delta,
                        is_irt_delta_percentage
                    ) = (CURRENT_TIMESTAMP, $1, $2, $3, $4)
                WHERE id_exercise = $5 AND
                        finished_on IS NULL`,
                [
                    /* $1 */(questionSkipped) ? false : (questionCorrect ?? answerSetActionResult.answerCorrect),
                    /* $2 */questionSkipped ?? false,
                    /* $3 */thetaDeltaInfo.value,
                    /* $4 */thetaDeltaInfo.type === "percentage",
                    /* $5 */idExercise
                ]
            );

            if (wasFinalQuestion) {
                await transaction.doQuery(
                    `UPDATE adaptive_exercise.exercise_instance
                        SET (is_finished, finished_on) = (TRUE, CURRENT_TIMESTAMP)
                    WHERE id = $1`,
                    [idExercise]
                );

                await transaction.commit();

                return { exerciseComplete: true };
            }

            const questionPool = await this.getQuestionPool(
                exercise.id,
                exercise.id_exercise_definition,
                transaction
            );
            if (
                questionPool.length === 0 ||
                    questionPool.length < (exercise.questions_count - lastQuestionOrdinal) * 2
            ) {
                return {
                    error: "Not enough questions to finish exercise",
                    status: 400,
                };
            }
            
            const nextQuestionInfo = await this.nextQuestionGenerator.provideQuestion(
                exercise,
                questionPool,
                transaction,
                false,
                await this.getPreviousExerciseQuestions(transaction, idExercise, 0),
            );
    
            const insertedQuestionInfo = await this.insertNextQuestionInfo(exercise.id, nextQuestionInfo, transaction);
    
            if (insertedQuestionInfo === null) {
                return {
                    error: "Question info was not inserted",
                    status: 500,
                };
            }

            await transaction.commit();

            insertedQuestionInfo.correct_answers = null;
    
            return insertedQuestionInfo;
        } catch (err) {
            return {
                error: (<any>err).toString(),
                status: 400,
            }
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }
    //#endregion
}
