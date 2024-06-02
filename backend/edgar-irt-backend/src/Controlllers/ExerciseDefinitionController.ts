import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { Post } from "../Decorators/Post.decorator.js";
import { ExerciseDefinitionService } from "../Services/ExerciseDefinitionService.js";

type NodeQuestionClass = { id_node: number, class_name: string | null, number_of_questions: number };

export class ExerciseDefinitionController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,

        private readonly exerciseDefinitionService: ExerciseDefinitionService,

        basePath: string = "exercise-definition"
    ) {
        super(basePath);
    }

    @Get(":idExerciseDefinition/question-classes")
    public async getNodeQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idExerciseDefinition = req.params['idExerciseDefinition'];
        if ((idExerciseDefinition ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const nodeQuestionClasses: NodeQuestionClass[] = (
            await this.dbConn.doQuery<NodeQuestionClass>(
                `SELECT id_node,
                    class_name,
                    SUM(number_of_questions) AS number_of_questions
                FROM (
                    SELECT DISTINCT question_node.id_node,
                        exercise_question_difficulty.question_difficulty AS class_name,
                        COUNT(DISTINCT question_node.id_question) AS number_of_questions
                    FROM adaptive_exercise.exercise_node_whitelist
                        JOIN public.question_node
                            ON question_node.id_node = exercise_node_whitelist.id_node
                        JOIN public.question
                            ON question_node.id_question = question.id
                        JOIN adaptive_exercise.exercise_question_difficulty
                            ON exercise_node_whitelist.id_exercise_definition =
                                exercise_question_difficulty.id_exercise_definition AND
                                question_node.id_question = exercise_question_difficulty.id_question
                    WHERE exercise_node_whitelist.id_exercise_definition = $1 AND
                        exercise_question_difficulty.question_difficulty_override IS NULL AND
                        question.is_active
                    GROUP BY question_node.id_node, exercise_question_difficulty.question_difficulty
                    
                    UNION ALL
                    
                    SELECT DISTINCT question_node.id_node,
                        exercise_question_difficulty.question_difficulty_override AS class_name,
                        COUNT(DISTINCT question_node.id_question) AS number_of_questions
                    FROM adaptive_exercise.exercise_node_whitelist
                        JOIN public.question_node
                            ON question_node.id_node = exercise_node_whitelist.id_node
                        JOIN public.question
                            ON question_node.id_question = question.id
                        JOIN adaptive_exercise.exercise_question_difficulty
                            ON exercise_node_whitelist.id_exercise_definition =
                                exercise_question_difficulty.id_exercise_definition AND
                                question_node.id_question = exercise_question_difficulty.id_question
                    WHERE exercise_node_whitelist.id_exercise_definition = $1 AND
                        exercise_question_difficulty.question_difficulty_override IS NOT NULL AND
                        question.is_active
                    GROUP BY question_node.id_node, exercise_question_difficulty.question_difficulty_override
                ) AS union_tab
                GROUP BY id_node, class_name
                ORDER BY id_node, class_name`,
                [ idExerciseDefinition ]
            )
        )?.rows ?? [];

        res.send(
            nodeQuestionClasses.map(
                nqc => ({
                    ...nqc,
                    number_of_questions:
                        typeof(nqc.number_of_questions) === "string" ?
                            parseInt(nqc.number_of_questions) :
                            nqc.number_of_questions
                })
            )
        );
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
