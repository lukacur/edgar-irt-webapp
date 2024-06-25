import { NextFunction, Request, Response } from "express";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { Put } from "../Decorators/Put.decorator.js";
import { Delete } from "../Decorators/Delete.decorator.js";
import { IQuestionType } from "../Models/Database/Edgar/IQuestionType.js";
import { Post } from "../Decorators/Post.decorator.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";
import { CourseService } from "../Services/CourseService.js";
import { IQuestionNodeWhitelistEntry } from "../Models/Database/AdaptiveExercise/IQuestionNodeWhitelistEntry.js";
import { ICurrentExercise } from "../Models/Database/AdaptiveExercise/ICurrentExercise.js";
import { IQuestionAnswer } from "../Models/Database/Edgar/IQuestionAnswer.js";
import { EdgarService } from "../Services/EdgarService.js";
import { AdaptiveExerciseService } from "../Services/AdaptiveExerciseService.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
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
        private readonly courseService: CourseService,
        private readonly edgarService: EdgarService,
        private readonly exerciseDefinitionService: ExerciseDefinitionService,
        private readonly adaptiveExerciseService: AdaptiveExerciseService,

        basePath: string = "adaptive-exercises"
    ) {
        super(basePath);
    }

    @Get("courses-startable")
    public async getCoursesWithStartableExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const courses: IEdgarCourse[] = await this.courseService.getCoursesWithStartableExercises();

        res
            .status(200)
            .send(courses);
    }

    @Post("starting-difficulty")
    public async getStudentStartingDifficulty(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { idStudent, idExerciseDefinition } = req.body;

        if ((idStudent ?? null) === null || (idExerciseDefinition ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        res.send({
            difficulty: await this.adaptiveExerciseService.getStudentStartingDifficulty(idStudent, idExerciseDefinition)
        });
    }

    @Post("previous")
    public async getStudentPreviousExercises(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { idStudent, idCourse } = req.body;
        if ((idStudent ?? null) === null || (idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const exercises: IExerciseInstance[] =
            await this.adaptiveExerciseService.getPreviousExercises(idStudent, idCourse);

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

        const lastExerciseInfo = await this.adaptiveExerciseService.getCurrentExercise(idStudent, idCourse);

        if (lastExerciseInfo.exerciseInstance === null || lastExerciseInfo.lastQuestion === null) {
            res.send(null);
            return;
        }

        const questionInfo = await this.edgarService.getQuestionInfo(lastExerciseInfo.lastQuestion.id_question);

        const answers: IQuestionAnswer[] | null = (
            await this.edgarService.getQuestionAnswers(lastExerciseInfo.lastQuestion.id_question)
        );

        const currentExercise: ICurrentExercise = {
            exerciseInstance: lastExerciseInfo.exerciseInstance,
            questionInfo: {
                ...lastExerciseInfo.lastQuestion,
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
        const allowedQuestionTypes: IQuestionType[] = await this.adaptiveExerciseService.getAllowedQuestionTypes();

        res
            .status(200)
            .send(allowedQuestionTypes);
    }

    @Get("available-allowed-question-types")
    public async getAvailableAllowedQuestionTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const allowedQuestionTypes: IQuestionType[] =
            await this.adaptiveExerciseService.getAvailableQuestionTypesToAllow();

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

        res.sendStatus(
            (await this.adaptiveExerciseService.allowQuestionTypes(idQuestionTypes)) ? 200 : 400
        );
    }

    @Delete("allowed-question-types/remove")
    public async removeAllowedQuestionType(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idQuestionTypes = req.body.idQuestionTypes;
        if ((idQuestionTypes ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        res.sendStatus(
            (await this.adaptiveExerciseService.disallowQuestionTypes(idQuestionTypes)) ? 200 : 400
        );
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

        const result = await this.adaptiveExerciseService.startExercise(
            idStudent,
            idCourse,
            idExerciseDefinition,
            questionsCount,
            startDifficulty,
            considerPreviousExercises,
        );
        if ("error" in result) {
            if (result.status === 500) {
                console.log(result.error);
                res.sendStatus(500);
                return;
            }

            if (result.error === null) {
                res.sendStatus(result.status);
                return;
            }

            res
                .status(result.status)
                .send({ error: result.error });

            return;
        }

        res
            .status(200)
            .send(result);
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

        const result = await this.adaptiveExerciseService.advanceQuestion(
            idExercise,
            studentAnswers,
            studentTextAnswer,
            questionSkipped,
            questionCorrect,
        );
        if ("error" in result) {
            if (result.status === 500) {
                console.log(result.error);
                res.sendStatus(500);
                return;
            }

            if (result.error === null) {
                res.sendStatus(result.status);
                return;
            }

            res
                .status(result.status)
                .send({ error: result.error });

            return;
        }

        res
            .status(200)
            .send(result);
    }
}
