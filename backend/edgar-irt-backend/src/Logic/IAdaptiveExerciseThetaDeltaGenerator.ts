import { IExerciseDefinition } from "../Models/Database/AdaptiveExercise/IExerciseDefinition.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";

export type ThetaDeltaInfo = { type: "absolute" | "percentage", value: number };

export interface IAdaptiveExerciseThetaDeltaGenerator {
    generateThetaDelta(
        exerciseDefintion: IExerciseDefinition,
        currentQuestionStatus: { skipped: boolean, correct: boolean },
        previousQuestions: IExerciseInstanceQuestion[],
    ): Promise<ThetaDeltaInfo>;
}
