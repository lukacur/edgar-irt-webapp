import { TransactionContext } from "../Database/TransactionContext.js";
import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";
import { IQuestion } from "../Models/Database/Edgar/IQuestion.js";

export interface IAdaptiveExerciseNextQuestionGenerator {
    provideQuestion(
        exercise: IExerciseInstance,
        questionPool: IQuestion[],
        transactionCtx: TransactionContext | null,
        initial: true,
    ): Promise<
        Pick<
            IExerciseInstanceQuestion,
            "id_question" | "id_question_irt_cb_info" | "id_question_irt_tb_info" | "correct_answers"
        >
    >;

    provideQuestion(
        exercise: IExerciseInstance,
        questionPool: IQuestion[],
        transactionCtx: TransactionContext | null,
        initial: false,
        lastQuestionInfo: { skipped: boolean, correct: boolean },
    ): Promise<
        Pick<
            IExerciseInstanceQuestion,
            "id_question" | "id_question_irt_cb_info" | "id_question_irt_tb_info" | "correct_answers"
        >
    >;
}
