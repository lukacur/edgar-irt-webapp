export interface IExerciseDefinition {
    id: number;
    id_course: number;
    exercise_name: string;

    correct_answers_to_upgrade: number;
    incorrect_answers_to_downgrade: number;
    skipped_questions_to_downgrade: number;

    created_on: string;
}
