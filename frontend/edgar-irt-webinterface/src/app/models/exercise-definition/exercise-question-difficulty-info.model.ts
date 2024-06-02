import { QuestionIrtClassification } from "src/app/util/question.util.js";

export interface IQuestionDifficultyInfo {
    id_question: number;
    question_text: string;
    question_difficulty: QuestionIrtClassification | null;
    question_difficulty_override: QuestionIrtClassification | null;
    is_override: boolean;
}
