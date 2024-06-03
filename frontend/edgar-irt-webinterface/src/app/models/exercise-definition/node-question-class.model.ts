import { QuestionIrtClassification } from "src/app/util/question.util.js";

export type NodeQuestionClass = {
    id_node: number,
    class_name: QuestionIrtClassification | null,
    number_of_questions: number
};

export type CourseQuestionClassInfo = {
    class_name: QuestionIrtClassification | null,
    number_of_questions: number
};

export interface IExerciseDefinitionQuestionClassificationInfo {
    nodeQuestionClasses: NodeQuestionClass[];
    questionClassInfo: CourseQuestionClassInfo[];
}
