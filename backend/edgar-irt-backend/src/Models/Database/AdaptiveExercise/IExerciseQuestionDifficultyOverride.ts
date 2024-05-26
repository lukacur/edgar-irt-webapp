import { QuestionIrtClassification } from "../Statistics/IEdgarStatProcessingCourseLevelCalc.js";

export interface IExerciseQuestionDifficultyOverride {
    id_exercise_definition: number;
    id_question: number;
    question_difficulty: QuestionIrtClassification;
}
