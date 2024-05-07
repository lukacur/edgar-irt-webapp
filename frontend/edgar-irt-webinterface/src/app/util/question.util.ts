import { IQuestionIrtParameters } from "../models/irt/question-irt-parameters.model.js";

type QuestionClassification = "very_easy" | "easy" | "normal" | "hard" | "very_hard"

export interface IQuestionClassifier {
    classifyQuestion(question: IQuestionIrtParameters): QuestionClassification;
}

export class QuestionUtil {
    private static classifier: IQuestionClassifier | null = {
            classifyQuestion(question) {
                if (question.item_guess_probability > 0.7) {
                    return "easy";
                }

                if (question.item_difficulty > 0.6 && question.level_of_item_knowledge > 0.7) {
                    return "very_hard";
                }

                if (question.item_difficulty > 0.4 && question.level_of_item_knowledge > 0.5) {
                    return "hard";
                }

                if (question.item_difficulty > 0.2 && question.level_of_item_knowledge > 0.1) {
                    return "normal";
                }

                if (question.item_mistake_probability > 0.6) {
                    return "hard";
                }

                if (question.level_of_item_knowledge < 0.1 || question.item_difficulty < 0.2) {
                    return "very_easy"
                }

                return "very_easy";
            },
    };

    private constructor() {}

    public static useClassifier(classifier: IQuestionClassifier) {
        QuestionUtil.classifier = classifier;
    }

    public static classifyQuestion(question: IQuestionIrtParameters) {
        return QuestionUtil.classifier?.classifyQuestion(question);
    }

    public static getQuestionClassificationText(classification: QuestionClassification) {
        switch (classification) {
            case "very_easy": return "Very easy";
            case "easy": return "Easy";
            case "normal": return "Normal";
            case "hard": return "Hard";
            case "very_hard": return "Very hard";
            default: throw new Error(`Unknown classfication ${classification}`);
        }
    }

    public static getColorClassForClassification(
        type: "bg" | "text",
        classification: QuestionClassification,
    ) {
        if (type === "bg") {
            switch (classification) {
                case "very_easy": return "bg-green-300";
                case "easy": return "bg-green-500";
                case "normal": return "bg-yellow-500";
                case "hard": return "bg-orange-500";
                case "very_hard": return "bg-red-500";
            }
        } else if (type === "text") {
            switch (classification) {
                case "very_easy": return "text-green-300";
                case "easy": return "text-green-500";
                case "normal": return "text-yellow-500";
                case "hard": return "text-orange-500";
                case "very_hard": return "text-red-500";
            }
        }

        return "bg-slate-500";
    }
}
