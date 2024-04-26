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

export class AdaptiveExercisesController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,
        private readonly courseService: CourseService,

        private readonly nextQuestionGenerator: IAdaptiveExerciseNextQuestionGenerator,
        private readonly initialThetaGenerator: IAdaptiveExerciseInitialThetaGenerator,
        private readonly thetaDeltaGenerator: IAdaptiveExerciseThetaDeltaGenerator,

        basePath: string = "adaptive-exercises"
    ) {
        super(basePath);
    }

    @Get(":userId")
    public async getUsersExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.params['userId'];
        if ((userId ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const exercises: IExerciseInstance[] = (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT *
                FROM adaptive_exercise.exercise_instance
                WHERE id_student_started = $1`,
                [userId]
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(exercises);
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

    @Get("course/:idCourse/question-node-whitelist")
    public async getCourseQuestionNodeWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idCourse = req.params.idCourse;
        if ((idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const nodeWhitelist: (IEdgarNode & { whitelisted_on: string })[] = (
            await this.dbConn.doQuery<(IEdgarNode & { whitelisted_on: string })>(
                `SELECT node.id,
                        node.id_node_type,
                        node.node_name,
                        node.description,

                        node_type.type_name AS node_type_name,

                        exercise_node_whitelist.whitelisted_on
                FROM adaptive_exercise.exercise_node_whitelist
                    JOIN public.node
                        ON exercise_node_whitelist.id_node = node.id
                    JOIN public.node_type
                        ON node.id_node_type = node_type.id
                WHERE id_course = $1`,
                [idCourse]
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(nodeWhitelist);
    }

    @Get("course/:idCourse/whitelistable-nodes")
    public async getCourseWhitelistableQuestionNodes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idCourse = req.params['idCourse'];
        if ((idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const whitelistedNodeIds: IQuestionNodeWhitelistEntry[] = (
            await this.dbConn.doQuery<IQuestionNodeWhitelistEntry>(
                `SELECT id_node
                FROM adaptive_exercise.exercise_node_whitelist
                WHERE id_course = $1`,
                [idCourse]
            )
        )?.rows ?? [];

        const allCourseNodes = await this.courseService.getCourseNodes(parseInt(idCourse));

        res
            .status(200)
            .send(allCourseNodes.filter(cn => (whitelistedNodeIds.find(wn => wn.id_node === cn.id) ?? null) === null));
    }

    @Put("question-node-whitelist/add")
    public async addQuestionNodeToWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const nodeWhitelistEntries: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[] =
            req.body.nodeWhitelistEntries;

        if ((nodeWhitelistEntries ?? null) === null || nodeWhitelistEntries.length === 0) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const nodeWhitelistEntry of nodeWhitelistEntries) {
                if (nodeWhitelistEntry.id_course === null || nodeWhitelistEntry.id_node === null) {
                    throw new Error("Invalid entry detected, aborting");
                }

                await this.dbConn.doQuery(
                    `INSERT INTO adaptive_exercise.exercise_node_whitelist (id_node, id_course) VALUES ($1, $2)`,
                    [
                        nodeWhitelistEntry.id_node,
                        nodeWhitelistEntry.id_course,
                    ]
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

    @Delete("question-node-whitelist/remove")
    public async removeQuestionNodeFromWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idNodes = req.body.idNodes;
        if ((idNodes ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const transaction = await this.dbConn.beginTransaction("adaptive_exercise");

        try {
            for (const idNode of idNodes) {
                await this.dbConn.doQuery(
                    `DELETE FROM adaptive_exercise.exercise_node_whitelist WHERE id_node = $1`,
                    [idNode]
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

    private async getNthLastExerciseQuestion(
        idExercise: number,
        offset: number = 0,
    ): Promise<IExerciseInstanceQuestion | null> {
        return (
            await this.dbConn.doQuery<IExerciseInstanceQuestion>(
                `SELECT *
                FROM adaptive_exercise.exercise_instance_question
                WHERE id_exercise = $1
                ORDER BY question_ordinal DESC
                OFFSET $2
                LIMIT 1`,
                [idExercise, offset]
            )
        )?.rows[0] ?? null;
    }

    private async getAllButLastExerciseQuestion(idExercise: number): Promise<IExerciseInstanceQuestion[]> {
        return (
            await this.dbConn.doQuery<IExerciseInstanceQuestion>(
                `SELECT *
                FROM adaptive_exercise.exercise_instance_question
                WHERE id_exercise = $1
                ORDER BY question_ordinal DESC
                OFFSET 1`,
                [idExercise]
            )
        )?.rows ?? [];
    }

    private async insertNextQuestionInfo(
        exerId: number,
        nextQuestionInfo: IExerciseInstanceQuestion
    ): Promise<IExerciseInstanceQuestion | null> {
        await this.dbConn.doQuery<{ id: number }>(
            `INSERT INTO adaptive_exercise.exercise_instance_question (
                id_exercise,

                id_question,

                id_question_irt_cb_info,
                id_question_irt_tb_info,

                question_ordinal,

                correct_answers
            ) VALUES ($1, $2, $3, $4, 1, $5)`,
            [
                /* $1 */ exerId,
                /* $2 */ nextQuestionInfo.id_question,
                /* $3 */ nextQuestionInfo.id_question_irt_cb_info,
                /* $4 */ '{' + nextQuestionInfo.id_question_irt_tb_info.join(",") + '}',
                /* $5 */ '{' + nextQuestionInfo.correct_answers.join(",") + '}',
            ]
        );

        return await this.getNthLastExerciseQuestion(exerId);
    }

    private async applyThetaDeltaInfo(
        idExercise: number,
        deltaInfo: ThetaDeltaInfo,
        wasLastQuestion: boolean
    ): Promise<boolean> {
        const current: number | null = (
            await this.dbConn.doQuery<{ current_irt_theta: number }>(
                `SELECT current_irt_theta
                FROM adaptive_exercise.exercise_instance
                WHERE id = $1`,
                [idExercise]
            )
        )?.rows[0]?.current_irt_theta ?? null;

        if (current === null) {
            return false;
        }

        const nextValue = ((deltaInfo.type === "absolute") ? (current + deltaInfo.value) : (current * deltaInfo.value));

        return ((
            await this.dbConn.doQuery(
                `UPDATE adaptive_exercise.exercise_instance
                    SET (current_irt_theta, final_irt_theta) = ($1, $2)
                WHERE id = $3`,
                [
                    /* $1 */ nextValue,
                    /* $2 */ (wasLastQuestion) ? nextValue : null,
                    /* $3 */ idExercise,
                ]
            )
        ) ?? null) === null;
    }

    @Post("start-exercise")
    public async startExercise(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            id_student_started,
            id_course,
            questions_count,
            consider_previous_exercises,
        } = req.body;

        if (!id_student_started || !id_course || !questions_count) {
            res.sendStatus(400);
            return;
        }

        const prevExercises: IExerciseInstance[] = [];
        if (consider_previous_exercises) {
            prevExercises.push(
                ...(
                    (
                        await this.dbConn.doQuery<IExerciseInstance>(
                            `SELECT *
                            FROM adaptive_exercise.exercise_instance
                            WHERE id_student_started = $1`,
                            [id_student_started]
                        )
                    )?.rows ?? []
                )
            )
        }

        const exerId: number | null = (await this.dbConn.doQuery<{ id: number }>(
            `INSERT INTO adaptive_exercise.exercise_instance (
                id_student_started,
                id_course,

                start_irt_theta DOUBLE PRECISION,
                current_irt_theta DOUBLE PRECISION,

                questions_count INT
            ) VALUES ($1, $2, $3, $3, $4) RETURNING id`,
            [
                /* $1 */ id_student_started,
                /* $2 */ id_course,
                /* $3 */ await this.initialThetaGenerator.generateTheta(id_course, id_student_started, prevExercises),
                /* $4 */ questions_count,
            ]
        ))?.rows[0]?.id ?? null;

        if (exerId === null) {
            res.sendStatus(500);
            return;
        }

        const exerInfo: IExerciseInstance | null = (
            await this.dbConn.doQuery<IExerciseInstance>(
                `SELECT *
                FROM adaptive_exercise.exercise_instance
                WHERE id = $1`,
                [exerId]
            )
        )?.rows[0] ?? null;

        if (exerInfo === null) {
            res.sendStatus(500);
            return;
        }

        const nextQuestionInfo = await this.nextQuestionGenerator.provideQuestion(exerInfo, true);

        const insertedQuestionInfo = await this.insertNextQuestionInfo(exerId, nextQuestionInfo);

        if (insertedQuestionInfo === null) {
            res.sendStatus(500);
            return;
        }

        res
            .status(200)
            .send(insertedQuestionInfo);
    }

    @Post("restore-exercise")
    public async restoreExercise(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id_student, id_exercise } = req.body;
        if (!id_student || !id_exercise) {
            res.sendStatus(400);
            return;
        }

        const exerQuestion: IExerciseInstanceQuestion | null = await this.getNthLastExerciseQuestion(id_exercise);

        if (exerQuestion === null) {
            res.sendStatus(400);
            return;
        }

        res.send(exerQuestion);
    }

    @Post("next-question")
    public async getNextExerciseQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idExercise = req.body.idExercise;
        if ((idExercise ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const questionCorrect: boolean = req.body.questionCorrect ?? false;
        const questionSkipped: boolean = req.body.questionSkipped ?? false;

        const thetaDeltaInfo = await this.thetaDeltaGenerator.generateThetaDelta(
            { correct: questionCorrect, skipped: questionSkipped },
            await this.getAllButLastExerciseQuestion(idExercise)
        );
        
        const wasFinalQuestion: boolean = (await this.dbConn.doQuery<{ was_final: boolean }>(
            `SELECT questions_count = MAX(question_ordinal) AS was_final
            FROM adaptive_exercise.exercise_instance
                JOIN adaptive_exercise.exercise_instance_question
                    ON exercise_instance.id = exercise_instance_question.id_exercise
            WHERE exercise_instance.id = $1
            GROUP BY exercise_instance.id`,
            [idExercise]
        ))?.rows[0]?.was_final ?? false;

        const thetaDeltaApplied = await this.applyThetaDeltaInfo(idExercise, thetaDeltaInfo, wasFinalQuestion);
        if (!thetaDeltaApplied) {
            res.sendStatus(500);
            return;
        }

        await this.dbConn.doQuery(
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
                /* $1 */questionCorrect,
                /* $2 */questionSkipped,
                /* $3 */thetaDeltaInfo.value,
                /* $4 */thetaDeltaInfo.type === "percentage",
                /* $5 */idExercise
            ]
        );

        if (wasFinalQuestion) {
            res
                .status(200)
                .send({ exerciseComplete: true });
            return;
        }

        const exercise: IExerciseInstance | null = (
            await this.dbConn.doQuery<IExerciseInstance>(
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
            false,
            { skipped: questionSkipped, correct: questionCorrect },
        );

        const insertedQuestionInfo = await this.insertNextQuestionInfo(exercise.id, nextQuestionInfo);

        if (insertedQuestionInfo === null) {
            res.sendStatus(500);
            return;
        }

        res
            .status(200)
            .send(insertedQuestionInfo);
    }
}
