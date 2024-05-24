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

    public getClassJump(from: QuestionIrtClassification, to: QuestionIrtClassification): number {
        const index1 = this.classificationOrder.indexOf(from);
        if (index1 === -1) {
            throw new Error(`${from} is not a valid question classification`);
        }

        const index2 = this.classificationOrder.indexOf(to);
        if (index2 === -1) {
            throw new Error(`${to} is not a valid question classification`);
        }

        return index2 - index1;
    }

    public isLowestClass(qClass: QuestionIrtClassification) {
        const index = this.classificationOrder.indexOf(qClass);
        if (index === -1) {
            throw new Error(`${qClass} is not a valid question classification`);
        }

        return index === 0;
    }

    public isHighestClass(qClass: QuestionIrtClassification) {
        const index = this.classificationOrder.indexOf(qClass);
        if (index === -1) {
            throw new Error(`${qClass} is not a valid question classification`);
        }

        return index === (this.classificationOrder.length - 1);
    }

    public getAverageDifficulty(difficulties: QuestionIrtClassification[]): QuestionIrtClassification {
        const idxArr = difficulties
            .map(diff => this.classificationOrder.indexOf(diff))
            .filter(diffIdx => diffIdx !== -1);

        const finalIdx = Math.floor(
            idxArr.reduce((acc, el) => acc + el, 0) / idxArr.length
        );

        if (finalIdx < 0 || finalIdx > this.classificationOrder.length) {
            throw new Error("Unable to calculate average difficulty for given difficulties array");
        }

        return this.classificationOrder[finalIdx];
    }
}
