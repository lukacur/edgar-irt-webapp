import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { Put } from "../Decorators/Put.decorator.js";
import { Delete } from "../Decorators/Delete.decorator.js";
import { IQuestionType } from "../Models/Database/Edgar/IQuestionType.js";
import { Post } from "../Decorators/Post.decorator.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";
import { IAdaptiveExerciseNextQuestionGenerator } from "../Logic/IAdaptiveExerciseNextQuestionGenerator.js";
import { IAdaptiveExerciseInitialThetaGenerator } from "../Logic/IAdaptiveExerciseInitialThetaGenerator.js";
import { IAdaptiveExerciseThetaDeltaGenerator, ThetaDeltaInfo } from "../Logic/IAdaptiveExerciseThetaDeltaGenerator.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";
import { CourseService } from "../Services/CourseService.js";
import { IQuestionNodeWhitelistEntry } from "../Models/Database/AdaptiveExercise/IQuestionNodeWhitelistEntry.js";
import { ICurrentExercise } from "../Models/Database/AdaptiveExercise/ICurrentExercise.js";
import { IQuestionAnswer } from "../Models/Database/Edgar/IQuestionAnswer.js";
import { EdgarService } from "../Services/EdgarService.js";
import { AdaptiveExerciseService } from "../Services/AdaptiveExerciseService.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IEdgarStatProcessingCourseLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { ExerciseDefinitionProgressionDescriptor, ExerciseDefinitionService } from "../Services/ExerciseDefinitionService.js";

type NextExerciseQuestionRequest = {
    readonly idExercise: number,
    readonly studentAnswers: number[] | null,
    readonly studentTextAnswer: string | null,
    readonly questionSkipped: boolean | null,
    readonly questionCorrect: boolean | null,
};

export class AdaptiveExercisesController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,
        private readonly courseService: CourseService,
        private readonly edgarService: EdgarService,
        private readonly exerciseDefinitionService: ExerciseDefinitionService,
        private readonly adaptiveExerciseService: AdaptiveExerciseService,

        private readonly nextQuestionGenerator: IAdaptiveExerciseNextQuestionGenerator,
        private readonly initialThetaGenerator: IAdaptiveExerciseInitialThetaGenerator,
        private readonly thetaDeltaGenerator: IAdaptiveExerciseThetaDeltaGenerator,

        basePath: string = "adaptive-exercises"
    ) {
        super(basePath);
    }

    @Get("courses-startable")
    public async getCoursesWithStartableExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const courses: IEdgarCourse[] = (
            await this.dbConn.doQuery<IEdgarCourse>(
                `SELECT DISTINCT course.*
                FROM public.course
                    JOIN statistics_schema.question_param_calculation
                        ON course.id = question_param_calculation.id_based_on_course
                    JOIN adaptive_exercise.exercise_definition
                        ON course.id = exercise_definition.id_course`
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(courses);
    }

    @Post("previous")
    public async getStudentPreviousExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { idStudent, idCourse } = req.body;
        if ((idStudent ?? null) === null || (idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const exercises: IExerciseInstance[] = (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT exercise_instance.*,
                    exercise_name
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

        res
            .status(200)
            .send(exercises);
    }

    @Post("current")
    public async getStudentCurrentExercise(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { idStudent, idCourse } = req.body;

        if ((idStudent ?? null) === null || (idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const exercise: IExerciseInstance | null = (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT *
                FROM adaptive_exercise.exercise_instance
                WHERE id_student_started = $1 AND
                        id_course = $2 AND
                        NOT is_finished`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idCourse,
                ]
            )
        )?.rows[0] ?? null;

        if (exercise === null) {
            res.send(null);
            return;
        }

        const lastExerciseInstanceQuestion: IExerciseInstanceQuestion | null = (
            await this.dbConn.doQuery<IExerciseInstanceQuestion>(
                `SELECT exercise_instance_question.*,
                        question_param_course_level_calculation.question_irt_classification AS question_difficulty
                FROM adaptive_exercise.exercise_instance_question
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON exercise_instance_question.id_question_param_course_level_calculation =
                            question_param_course_level_calculation.id_question_param_calculation
                WHERE id_exercise = $1 AND
                        finished_on IS NULL`,
                [
                    /* $1 */ exercise.id,
                ]
            )
        )?.rows[0] ?? null;

        if (lastExerciseInstanceQuestion === null) {
            res.send(null);
            return;
        }

        const questionInfo = (
            await this.dbConn.doQuery<IQuestion>(
                `SELECT *
                FROM public.question
                WHERE id = $1`,
                [lastExerciseInstanceQuestion.id_question]
            )
        )?.rows[0] ?? null;

        const answers: IQuestionAnswer[] | null = (
            await this.edgarService.getQuestionAnswers(lastExerciseInstanceQuestion.id_question)
        );

        const currentExercise: ICurrentExercise = {
            exerciseInstance: exercise,
            questionInfo: {
                ...lastExerciseInstanceQuestion,
                question_text: questionInfo?.question_text ?? "",
                correct_answers: null,
            },
            questionAnswers: answers,
        };

        res
            .status(200)
            .send(currentExercise);
    }

    @Get("allowed-question-types")
    public async getAllowedQuestionTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const allowedQuestionTypes: IQuestionType[] = (
            await this.dbConn.doQuery<IQuestionType>(
                `SELECT id_question_type,
                        type_name AS question_type_name,
                        allowed_on
                FROM adaptive_exercise.exercise_allowed_question_type
                    JOIN public.question_type
                        ON exercise_allowed_question_type.id_question_type = question_type.id`
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(allowedQuestionTypes);
    }

    @Get("available-allowed-question-types")
    public async getAvailableAllowedQuestionTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const allowedQuestionTypes: IQuestionType[] = (
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

        res
            .status(200)
            .send(allowedQuestionTypes);
    }

    @Put("allowed-question-types/add")
    public async addAllowedQuestionTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestionTypes = req.body.idQuestionTypes;
        if ((idQuestionTypes ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const idQuestionType of idQuestionTypes) {
                await transaction.doQuery(
                    `INSERT INTO adaptive_exercise.exercise_allowed_question_type (id_question_type) VALUES ($1)`,
                    [idQuestionType]
                );
            }

            await transaction.commit();

            res.sendStatus(200);
        } catch {
            res.sendStatus(400);
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    @Delete("allowed-question-types/remove")
    public async removeAllowedQuestionType(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestionTypes = req.body.idQuestionTypes;
        if ((idQuestionTypes ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const idQuestionType of idQuestionTypes) {
                await transaction.doQuery(
                    `DELETE FROM exercise_allowed_question_type WHERE id_question_type = $1`,
                    [idQuestionType]
                );
            }

            await transaction.commit();

            res.sendStatus(200);
        } catch {
            res.sendStatus(400);
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

    @Post("course-exercise-definitions")
    public async getCourseExerciseDefinitions(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idCourse = req.body.idCourse;
        if ((idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const definitions: IExerciseDefinition[] =
            await this.exerciseDefinitionService.getDefinitionsForCourse(idCourse);

        res.send(definitions);
    }

    @Post("define-exercise")
    public async createExerciseDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            idCourse,
            exerciseName,
            correctAnswersToUpgrade,
            incorrectAnswersToDowngrade,
            skippedQuestionsToDowngrade,
        } = req.body;
        if ((idCourse ?? null) === null || (exerciseName ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const progressionDescriptor: ExerciseDefinitionProgressionDescriptor | null =
            (
                (correctAnswersToUpgrade ?? 0) <= 0 ||
                (incorrectAnswersToDowngrade ?? 0) <= 0 ||
                (skippedQuestionsToDowngrade ?? 0) <= 0
            ) ?
                null :
                {
                    correctAnswersToUpgrade,
                    incorrectAnswersToDowngrade,
                    skippedQuestionsToDowngrade,
                };

        const insertedId = await this.exerciseDefinitionService.createExerciseDefinition(
            idCourse,
            exerciseName,
            progressionDescriptor,
        );

        if (insertedId === null) {
            res.sendStatus(400);
            return;
        }

        res.sendStatus(202);
    }

    @Delete("exercise-definition/remove")
    public async removeExerciseDefinitions(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { definitionIds } = req.body as { definitionIds: number[] };
        if (definitionIds === null || definitionIds.length === 0) {
            res.sendStatus(400);
            return;
        }

        const deleted = await this.exerciseDefinitionService.removeExerciseDefinitions(definitionIds);

        res.sendStatus((deleted) ? 200 : 400);
    }

    @Get("exercise-definition/:idExerciseDefinition/question-node-whitelist")
    public async getExerciseDefinitionQuestionNodeWhitelist(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const idExerciseDefinition = req.params.idExerciseDefinition;
        if ((idExerciseDefinition ?? null) === null || Number.isNaN(parseInt(idExerciseDefinition))) {
            res.sendStatus(400);
            return;
        }

        const nodeWhitelist: (IEdgarNode & { whitelisted_on: string })[] =
            await this.exerciseDefinitionService.getWhitelistedNodes(parseInt(idExerciseDefinition));

        res
            .status(200)
            .send(nodeWhitelist);
    }

    @Get("exercise-definition/:idExerciseDefinition/whitelistable-nodes")
    public async getCourseWhitelistableQuestionNodes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idExerciseDefinition = req.params['idExerciseDefinition'];
        if ((idExerciseDefinition ?? null) === null || Number.isNaN(parseInt(idExerciseDefinition))) {
            res.sendStatus(400);
            return;
        }

        const nodes = await this.exerciseDefinitionService.getWhitelistableNodes(parseInt(idExerciseDefinition));
        if (nodes === null) {
            res.sendStatus(400);
            return;
        }

        res
            .status(200)
            .send(nodes);
    }

    @Put("question-node-whitelist/add")
    public async addQuestionNodeToWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const nodeWhitelistEntries: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[] =
            req.body.nodeWhitelistEntries;

        if ((nodeWhitelistEntries ?? null) === null || nodeWhitelistEntries.length === 0) {
            res.sendStatus(400);
            return;
        }

        const whitelisted = await this.exerciseDefinitionService.whitelistNodes(nodeWhitelistEntries);

        res.sendStatus((whitelisted) ? 200 : 400);
    }

    @Delete("question-node-whitelist/remove")
    public async removeQuestionNodeFromWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const nodes: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[] = req.body.nodes;
        if ((nodes ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const deWhitelisted = await this.exerciseDefinitionService.deWhitelistNodes(nodes);

        res.sendStatus((deWhitelisted) ? 200 : 400);
    }

    private async getNthLastExerciseQuestion(
        idExercise: number,
        offset: number = 0,
        transaction: TransactionContext,
    ): Promise<IExerciseInstanceQuestion | null> {
        return (
            await transaction.doQuery<IExerciseInstanceQuestion>(
                `SELECT exercise_instance_question.*,
                    question_param_course_level_calculation.question_irt_classification AS question_difficulty
                FROM exercise_instance_question
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON exercise_instance_question.id_question_param_course_level_calculation =
                            question_param_course_level_calculation.id_question_param_calculation
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
                `SELECT exercise_instance_question.*,
                    question_param_course_level_calculation.question_irt_classification AS question_difficulty
                FROM adaptive_exercise.exercise_instance_question
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON exercise_instance_question.id_question_param_course_level_calculation =
                            question_param_course_level_calculation.id_question_param_calculation
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
        nextQuestionInfo: Pick<IExerciseInstanceQuestion, "id_question" | "id_question_irt_cb_info" | "id_question_irt_tb_info" | "correct_answers">,
        transactionCtx: TransactionContext
    ): Promise<IExerciseInstanceQuestion | null> {
        const answersNull = nextQuestionInfo.correct_answers === null || nextQuestionInfo.correct_answers.length === 0;

        await transactionCtx.doQuery<{ id: number }>(
            `INSERT INTO exercise_instance_question (
                id_exercise,

                id_question,

                id_question_param_course_level_calculation,

                question_ordinal,

                correct_answers
            ) VALUES ($1, $2, $3, 1, $4)`,
            [
                /* $1 */ exerId,
                /* $2 */ nextQuestionInfo.id_question,
                /* $3 */ nextQuestionInfo.id_question_irt_cb_info,
                /* $4 */ (answersNull) ? null : '{' + nextQuestionInfo.correct_answers!.join(",") + '}',
            ]
        );

        const questionCourseLevelCalc = (
            await transactionCtx.doQuery<IEdgarStatProcessingCourseLevelCalc>(
                `SELECT *
                FROM statistics_schema.question_param_course_level_calculation
                WHERE id_question_param_calculation = $1`,
                [ nextQuestionInfo.id_question_irt_cb_info ]
            )
        )?.rows[0] ?? null;
        if (questionCourseLevelCalc === null) {
            throw new Error(
                `Course level calculation for question with ID ${nextQuestionInfo.id_question} could not be found` +
                ` (course level calculation ID ${nextQuestionInfo.id_question_irt_cb_info})`
            );
        }

        await transactionCtx.doQuery(
            `UPDATE adaptive_exercise.exercise_instance
            SET current_difficulty = $1
            WHERE id = $2`,
            [
                /* $1 */ questionCourseLevelCalc.question_irt_classification,
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

    @Post("start-exercise")
    public async startExercise(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            idStudent,
            idCourse,
            idExerciseDefinition,
            questionsCount,
            startDifficulty,
            considerPreviousExercises,
        } = req.body;

        if (!idStudent || !idCourse || !idExerciseDefinition || !questionsCount) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            const prevExercises: IExerciseInstance[] = [];
            if (considerPreviousExercises) {
                prevExercises.push(
                    ...(
                        (
                            await transaction.doQuery<IExerciseInstance>(
                                `SELECT *
                                FROM exercise_instance
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
                    id_course,
                    id_exercise_definition,

                    start_difficulty,
                    current_difficulty,
    
                    start_irt_theta,
                    current_irt_theta,
    
                    questions_count
                ) VALUES ($1, $2, $3, $4, $4, $5, $5, $6) RETURNING id`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idCourse,
                    /* $3 */ idExerciseDefinition,
                    /* $4 */ startDifficulty,
                    /* $5 */ await this.initialThetaGenerator.generateTheta(idCourse, idStudent, prevExercises),
                    /* $6 */ questionsCount,
                ]
            ))?.rows[0]?.id ?? null;
    
            if (exerId === null) {
                console.log("ExerID is null");
                res.sendStatus(500);
                return;
            }
    
            const exerInfo: IExerciseInstance | null = (
                await transaction.doQuery<IExerciseInstance>(
                    `SELECT *
                    FROM exercise_instance
                    WHERE id = $1`,
                    [exerId]
                )
            )?.rows[0] ?? null;
    
            if (exerInfo === null) {
                console.log("ExerInfo is null");
                res.sendStatus(500);
                return;
            }
    
            const nextQuestionInfo = await this.nextQuestionGenerator.provideQuestion(
                exerInfo,
                await this.adaptiveExerciseService.getQuestionPool(idCourse, exerId, transaction),
                transaction,
                true
            );
    
            const insertedQuestionInfo = await this.insertNextQuestionInfo(exerId, nextQuestionInfo, transaction);
    
            if (insertedQuestionInfo === null) {
                console.log("InsertedQI was null");
                res.sendStatus(500);
                return;
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
                console.log("QI was null");
                res.sendStatus(500);
                return;
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
    
            res
                .status(200)
                .send(currentExercise);
        } catch (err) {
            console.log(err);
            res.sendStatus(400);
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }

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

    @Post("next-question")
    public async getNextExerciseQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            idExercise,
            studentAnswers,
            studentTextAnswer,
            questionSkipped,
            questionCorrect,
        } = req.body as NextExerciseQuestionRequest;

        if ((idExercise ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            const answerSetActionResult = await this.setLastQuestionAnswer(
                transaction,
                idExercise,
                studentTextAnswer,
                studentAnswers,
            );
        
            const wasFinalQuestion: boolean = (await transaction.doQuery<{ was_final: boolean }>(
                `SELECT questions_count = MAX(question_ordinal) AS was_final
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_instance_question
                        ON exercise_instance.id = exercise_instance_question.id_exercise
                WHERE exercise_instance.id = $1
                GROUP BY exercise_instance.id`,
                [idExercise]
            ))?.rows[0]?.was_final ?? false;

            const thetaDeltaInfo = await this.thetaDeltaGenerator.generateThetaDelta(
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
                console.log("Theta delta not applied");
                res.sendStatus(500);
                return;
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

                res
                    .status(200)
                    .send({ exerciseComplete: true });
                return;
            }

        
            const exercise: IExerciseInstance | null = (
                await transaction.doQuery<IExerciseInstance>(
                    `SELECT *
                    FROM adaptive_exercise.exercise_instance
                    WHERE id = $1`,
                    [idExercise]
                )
            )?.rows[0] ?? null;
            if (exercise === null) {
                res.sendStatus(400);
                return;
            }
            
            const nextQuestionInfo = await this.nextQuestionGenerator.provideQuestion(
                exercise,
                await this.adaptiveExerciseService.getQuestionPool(exercise.id_course, exercise.id, transaction),
                transaction,
                false,
                await this.getPreviousExerciseQuestions(transaction, idExercise, 0),
            );
    
            const insertedQuestionInfo = await this.insertNextQuestionInfo(exercise.id, nextQuestionInfo, transaction);
    
            if (insertedQuestionInfo === null) {
                console.log("Question info was not inserted");
                res.sendStatus(500);
                return;
            }

            await transaction.commit();
    
            res
                .status(200)
                .send(insertedQuestionInfo);
        } catch (err) {
            res.sendStatus(400);
            console.log(err);
        } finally {
            if (!transaction.isFinished()) {
                await transaction.rollback();
            }
        }
    }
}
