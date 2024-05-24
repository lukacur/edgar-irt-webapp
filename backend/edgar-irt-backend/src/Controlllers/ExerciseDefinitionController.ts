import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { Post } from "../Decorators/Post.decorator.js";
import { ExerciseDefinitionService } from "../Services/ExerciseDefinitionService.js";

type NodeQuestionClass = { id_node: number, class_name: string, number_of_questions: number };

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
                `SELECT exercise_node_whitelist.id_node,
                        question_irt_classification AS class_name,
                        COUNT(question_param_calculation.id_question) AS number_of_questions
                FROM adaptive_exercise.exercise_node_whitelist
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_node_whitelist.id_exercise_definition = exercise_definition.id
                    JOIN public.question_node
                        ON question_node.id_node = exercise_node_whitelist.id_node
                    JOIN statistics_schema.question_param_calculation
                        ON question_node.id_question = question_param_calculation.id_question
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON question_param_calculation.id =
                            question_param_course_level_calculation.id_question_param_calculation
                WHERE exercise_definition.id = $1
                GROUP BY exercise_node_whitelist.id_node, question_param_course_level_calculation.question_irt_classification
                ORDER BY id_node, class_name;`,
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
}
