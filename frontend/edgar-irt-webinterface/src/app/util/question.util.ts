import { IBaseIrtParameters } from "../models/irt/question-irt-parameters.model.js";

export type QuestionIrtClassification = "very_easy" | "easy" | "normal" | "hard" | "very_hard" | "unclassified";

export interface IQuestionClassifier {
    classifyQuestion(question: IBaseIrtParameters): QuestionIrtClassification;
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

    public static classifyQuestion(question: IBaseIrtParameters) {
        return QuestionUtil.classifier?.classifyQuestion(question);
    }

    public static getQuestionClassificationText(classification: QuestionIrtClassification | null) {
        classification ??= "unclassified";

        switch (classification) {
            case "unclassified": return "Unclassified";
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
        classification: QuestionIrtClassification | null,
    ) {
        classification ??= "unclassified";

        if (type === "bg") {
            switch (classification) {
                case "unclassified": return "bg-slate-600";
                case "very_easy": return "bg-green-300";
                case "easy": return "bg-green-500";
                case "normal": return "bg-yellow-500";
                case "hard": return "bg-orange-500";
                case "very_hard": return "bg-red-500";
            }
        } else if (type === "text") {
            switch (classification) {
                case "unclassified": return "text-slate-600";
                case "very_easy": return "text-green-300";
                case "easy": return "text-green-500";
                case "normal": return "text-yellow-500";
                case "hard": return "text-orange-500";
                case "very_hard": return "text-red-500";
            }
        }

        return "bg-slate-500";
    }

    public static getMaterialColorClassForClassification(classification: QuestionIrtClassification | null) {
        classification ??= "unclassified";
        switch (classification) {
            case "unclassified": return "question-class-unc";
            case "very_easy": return "question-class-ve";
            case "easy": return "question-class-e";
            case "normal": return "question-class-n";
            case "hard": return "question-class-h";
            case "very_hard": return "question-class-vh";
        }
    }
    
    public static getSettableClasses(): QuestionIrtClassification[] {
        return [ 'very_easy', 'easy', 'normal', 'hard', 'very_hard' ];
    }

    public static getAvailableClasses(): QuestionIrtClassification[] {
        return [ 'unclassified', ...this.getSettableClasses() ];
    }

    public static getSettableClassColors(): string[] {
        return [ '#81c784', '#4caf50', '#ffeb3b', '#ff9800', '#f44336' ];
    }

    public static questionClassHexColors(): string[] {
        return [ '#475569', ...this.getSettableClassColors() ];
    }
}
