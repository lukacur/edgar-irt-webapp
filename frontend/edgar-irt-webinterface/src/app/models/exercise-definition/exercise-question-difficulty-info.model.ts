import { QuestionIrtClassification } from "src/app/util/question.util.js";

export interface IQuestionDifficultyInfo {
    id_question: number;
    question_difficulty: QuestionIrtClassification | null;
    is_override: boolean;
}
