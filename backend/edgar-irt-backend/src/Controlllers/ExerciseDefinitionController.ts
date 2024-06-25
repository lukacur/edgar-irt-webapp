import { NextFunction, Request, Response } from "express";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { Post } from "../Decorators/Post.decorator.js";
import { ExerciseDefinitionService } from "../Services/ExerciseDefinitionService.js";


export class ExerciseDefinitionController extends AbstractController {
    constructor(
        private readonly exerciseDefinitionService: ExerciseDefinitionService,

        basePath: string = "exercise-definition"
    ) {
        super(basePath);
    }

    @Get(":idExerciseDefinition/question-classes")
    public async getQuestionClassificationInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idExerciseDefinition = req.params['idExerciseDefinition'];
        if ((idExerciseDefinition ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const result = await this.exerciseDefinitionService.getByNodeQuestionDifficultyInformation(
            parseInt(idExerciseDefinition)
        );

        res.send({
            nodeQuestionClasses: result.nodeQuestionClasses.map(
                nqc => ({
                    ...nqc,
                    number_of_questions:
                        typeof(nqc.number_of_questions) === "string" ?
                            parseInt(nqc.number_of_questions) :
                            nqc.number_of_questions
                })
            ),
            questionClassInfo: result.questionClassInfo.map(
                qci => ({
                    ...qci,
                    number_of_questions:
                        typeof(qci.number_of_questions) === "string" ?
                            parseInt(qci.number_of_questions) :
                            qci.number_of_questions
                })
            ),
        });
    }

    @Post("update-progression")
    public async updateExerciseProgressionInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            idExerciseDefinition,
            correctAnswersToUpgrade,
            incorrectAnswersToDowngrade,
            skippedQuestionsToDowngrade,
        } = req.body;

        if ((idExerciseDefinition ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const success = await this.exerciseDefinitionService.updateExerciseDefinition(
            idExerciseDefinition,
            { correctAnswersToUpgrade, incorrectAnswersToDowngrade, skippedQuestionsToDowngrade }
        );

        res.sendStatus((success) ? 200 : 400);
    }

    @Get(":idExerciseDefinition/question-difficulty-info")
    public async getQuestionDifficultyInformation(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idExerciseDefinition = req.params['idExerciseDefinition'];
        if ((idExerciseDefinition ?? null) === null || Number.isNaN(parseInt(idExerciseDefinition))) {
            res.sendStatus(400);
            return;
        }

        const difficultyInfo = await this.exerciseDefinitionService.getQuestionDifficultyInformation(
            parseInt(idExerciseDefinition)
        );

        res.send(difficultyInfo);
    }

    @Post("override-question-difficulties")
    public async overrideQuestionDifficulties(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {
            idExerciseDefinition,
            overrides,
        } = req.body;
        if (
            (idExerciseDefinition ?? null) === null ||
            (overrides ?? null) === null ||
            !Array.isArray(overrides)
        ) {
            res.sendStatus(400);
            return;
        }

        const overriden = await this.exerciseDefinitionService.overrideQuestionDifficulties(
            idExerciseDefinition,
            overrides,
        );

        res.sendStatus((overriden) ? 200 : 400);
    }
}
