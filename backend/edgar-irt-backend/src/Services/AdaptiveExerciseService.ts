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
}
