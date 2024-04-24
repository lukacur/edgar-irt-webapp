import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { Put } from "../Decorators/Put.decorator.js";
import { Delete } from "../Decorators/Delete.decorator.js";
import { IQuestionType } from "../Models/Database/Edgar/IQuestionType.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";
import { IQuestionBlacklistEntry } from "../Models/Database/AdaptiveExercise/IQuestionBlacklistEntry.js";

export class AdaptiveExercisesController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,

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
                        question_type_name
                FROM adaptive_exercise.exercise_allowed_question_type`
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
    public async addAllowedQQuestionType(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestionType = req.body.idQuestionType;
        if ((idQuestionType ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        await this.dbConn.doQuery(
            `INSERT INTO adaptive_exercise.exercise_allowed_question_type (id_question_type) VALUES ($1)`,
            [idQuestionType]
        );

        res.sendStatus(200);
    }

    @Delete("allowed-question-types/remove")
    public async removeAllowedQQuestionType(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestionType = req.body.idQuestionType;
        if ((idQuestionType ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        await this.dbConn.doQuery(
            `DELETE FROM adaptive_exercise.exercise_allowed_question_type WHERE id_question_type = $1`,
            [idQuestionType]
        );

        res.sendStatus(200);
    }

    @Get("question-blacklist")
    public async getQuestionBlacklist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const questionBlacklist: IQuestionBlacklistEntry[] = (
            await this.dbConn.doQuery<IQuestionBlacklistEntry>(
                `SELECT *
                FROM adaptive_exercise.exercise_question_blacklist`
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(questionBlacklist);
    }

    @Get("blacklistable-questions")
    public async getBlacklistableQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        const blableQuestions: IQuestion[] = (
            await this.dbConn.doQuery<IQuestion>(
                `SELECT id,
                        id_question_type,
                        question_text,
                        question_comment
                FROM public.question
                WHERE id NOT IN (
                    SELECT id_question
                    FROM adaptive_exercise.exercise_question_blacklist
                )`
            )
        )?.rows ?? [];

        res
            .status(200)
            .send(blableQuestions);
    }

    @Put("question-blacklist/add")
    public async addQuestionToBlacklist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestion = req.body.idQuestion;
        if ((idQuestion ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        await this.dbConn.doQuery(
            `INSERT INTO adaptive_exercise.exercise_question_blacklist (id_question) VALUES ($1)`,
            [idQuestion]
        );

        res.sendStatus(200);
    }

    @Delete("question-blacklist/remove")
    public async removeQuestionFromBlacklist(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestion = req.body.idQuestion;
        if ((idQuestion ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        await this.dbConn.doQuery(
            `DELETE FROM adaptive_exercise.exercise_question_blacklist WHERE id_question = $1`,
            [idQuestion]
        );

        res.sendStatus(200);
    }
}
