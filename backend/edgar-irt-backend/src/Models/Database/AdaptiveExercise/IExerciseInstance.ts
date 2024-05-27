import { QuestionIrtClassification } from "../Statistics/IEdgarStatProcessingCourseLevelCalc.js";

export interface IExerciseInstance {
    id: number;

    id_student_started: number;

    id_course: number;
    id_exercise_definition: number;

    start_difficulty: QuestionIrtClassification;
    current_difficulty: QuestionIrtClassification;

    start_irt_theta: number;
    current_irt_theta: number;
    final_irt_theta: number;

    current_question_ordinal: number;
    questions_count: number;

    started_on: string;
    finished_on: string;

    is_finished: boolean;
}
