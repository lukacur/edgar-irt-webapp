import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";

export class AdaptiveExerciseService {
    constructor(
        private readonly dbConn: DatabaseConnection,
    ) {}

    public async getQuestionPool(
        idCourse: number,
        idExercise: number,
        transaction: TransactionContext,
    ): Promise<IQuestion[]> {
        console.log({ idCourse, idExercise });
        return (
            await transaction.doQuery<IQuestion>(
                `SELECT question.*
                FROM public.question
                    JOIN statistics_schema.question_param_calculation
                        ON question.id = question_param_calculation.id_question
                    JOIN adaptive_exercise.exercise_allowed_question_type
                        ON question.id_question_type = exercise_allowed_question_type.id_question_type
                    JOIN public.question_node
                        ON question.id = question_node.id_question
                    JOIN adaptive_exercise.exercise_node_whitelist
                        ON question_node.id_node = exercise_node_whitelist.id_node
                    LEFT JOIN adaptive_exercise.exercise_instance_question
                        ON question.id = exercise_instance_question.id_question
                WHERE question.is_active AND -- // TODO: Should this be done?
                        exercise_node_whitelist.id_course = $1 AND
                        exercise_instance_question.id IS NULL`,
                [idCourse]
            )
        )?.rows ?? [];
    }
}
