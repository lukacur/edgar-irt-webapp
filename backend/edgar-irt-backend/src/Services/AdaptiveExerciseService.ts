import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { TransactionContext } from "../Database/TransactionContext.js";
import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";
import { QuestionIrtClassification } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { QuestionClassificationUtil } from "../Util/QuestionClassificationUtil.js";

export interface IQuestionPoolQuestion extends IQuestion {
    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
    question_irt_classification: QuestionIrtClassification;
}

export class AdaptiveExerciseService {
    constructor(
        private readonly dbConn: DatabaseConnection,
    ) {}

    public async getQuestionPool(
        idCourse: number,
        idExercise: number,
        transaction: TransactionContext,
    ): Promise<IQuestionPoolQuestion[]> {
        return (
            await transaction.doQuery<IQuestionPoolQuestion>(
                `SELECT question.*,
                    question_param_course_level_calculation.default_item_offset_parameter,
                    question_param_course_level_calculation.level_of_item_knowledge,
                    question_param_course_level_calculation.item_difficulty,
                    question_param_course_level_calculation.item_guess_probability,
                    question_param_course_level_calculation.item_mistake_probability,
                    question_param_course_level_calculation.question_irt_classification
                FROM public.question
                    JOIN statistics_schema.question_param_calculation
                        ON question.id = question_param_calculation.id_question
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON question_param_calculation.id = question_param_course_level_calculation.id_question_param_calculation
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
                    LEFT JOIN adaptive_exercise.exercise_instance_question
                        ON question.id = exercise_instance_question.id_question
                WHERE question.is_active AND
                    exercise_definition.id_course = $1 AND
                    exercise_instance.id = $2 AND
                    exercise_instance_question.id IS NULL`,
                [
                    /* $1 */ idCourse,
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

    public async getStudentStartingDifficulty(
        idStudent: number,
        idExerciseDefinition: number,
    ): Promise<QuestionIrtClassification> {
        const previousExerciseDifficulties: { final_difficulty: QuestionIrtClassification }[] = (
            await this.dbConn.doQuery<{ final_difficulty: QuestionIrtClassification }>(
                `SELECT exercise_instance_question.question_difficulty AS final_difficulty
                FROM adaptive_exercise.exercise_instance
                    JOIN adaptive_exercise.exercise_instance_question
                        ON exercise_instance.id = exercise_instance_question.id_exercise
                    JOIN adaptive_exercise.exercise_definition
                        ON exercise_instance.id_exercise_definition = exercise_definition.id
                WHERE id_student_started = $1 AND
                    id_exercise_definition = $2 AND
                    exercise_instance.finished_on IS NOT NULL AND
                    user_answer_correct`,
                [
                    /* $1 */ idStudent,
                    /* $2 */ idExerciseDefinition,
                ]
            )
        )?.rows ?? [];

        return QuestionClassificationUtil.instance.getAverageDifficulty(
            previousExerciseDifficulties.map(ed => ed.final_difficulty)
        );
    }
}
