import { QuestionIrtClassification } from "src/app/util/question.util.js";

export interface IExerciseInstanceQuestion {
    id: number;
    id_exercise: number;

	id_question: number;

    id_question_irt_cb_info: number;
    question_difficulty: QuestionIrtClassification;

    id_question_irt_tb_info: number[];

    question_ordinal: number;

    student_answers: number[];
    correct_answers: number[];

    student_answer_code: string;
    student_answer_code_pl: number;
    c_eval_data: string;
    student_answer_text: string;

	user_answer_correct: boolean;
    question_skipped: boolean;

    irt_delta: number;
    is_irt_delta_percentage: boolean;
}
