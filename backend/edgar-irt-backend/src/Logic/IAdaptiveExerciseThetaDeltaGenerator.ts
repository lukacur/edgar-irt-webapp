import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";

export type ThetaDeltaInfo = { type: "absolute" | "percentage", value: number };

export interface IAdaptiveExerciseThetaDeltaGenerator {
    generateThetaDelta(
        currentQuestionStatus: { skipped: boolean, correct: boolean },
        previousQuestions: IExerciseInstanceQuestion[],
    ): Promise<ThetaDeltaInfo>;
}
