export interface IExerciseDefinition {
    id: number;
    id_course: number;
    exercise_name: string;

    correctAnswersToUpgrade: number;
    incorrectAnswersToDowngrade: number;
    skippedQuestionsToDowngrade: number;

    created_on: string;
}
