import { QuestionIrtClassification } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";

export class QuestionClassificationUtil {
    public static readonly instance = new QuestionClassificationUtil();

    private constructor() {}

    private readonly classificationOrder: QuestionIrtClassification[] = [
        "very_easy",
        "easy",
        "normal",
        "hard",
        "very_hard",
    ];

    public compareQuestionClasses(class1: QuestionIrtClassification, class2: QuestionIrtClassification): number {
        const index1 = this.classificationOrder.indexOf(class1);
        if (index1 === -1) {
            throw new Error(`${class1} is not a valid question classification`);
        }

        const index2 = this.classificationOrder.indexOf(class2);
        if (index2 === -1) {
            throw new Error(`${class2} is not a valid question classification`);
        }

        return index1 - index2;
    }

    public getClassDifference(class1: QuestionIrtClassification, class2: QuestionIrtClassification): number {
        const index1 = this.classificationOrder.indexOf(class1);
        if (index1 === -1) {
            throw new Error(`${class1} is not a valid question classification`);
        }

        const index2 = this.classificationOrder.indexOf(class2);
        if (index2 === -1) {
            throw new Error(`${class2} is not a valid question classification`);
        }

        return Math.abs(index2 - index1);
    }
}
