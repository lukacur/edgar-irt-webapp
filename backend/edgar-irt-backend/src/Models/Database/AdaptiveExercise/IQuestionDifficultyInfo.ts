import { QuestionIrtClassification } from "../Statistics/IEdgarStatProcessingCourseLevelCalc.js";

export interface IQuestionDifficultyInfo {
    id_question: number;
    question_text: string;
    id_node: number;
    question_difficulty: QuestionIrtClassification | null;
    is_override: boolean;
}
