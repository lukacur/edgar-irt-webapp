import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "../Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";

export interface IAdaptiveExerciseNextQuestionGenerator {
    provideQuestion(
        exercise: IExerciseInstance,
        initial: true,
    ): Promise<IExerciseInstanceQuestion>;

    provideQuestion(
        exercise: IExerciseInstance,
        initial: false,
        lastQuestionInfo: { skipped: boolean, correct: boolean },
    ): Promise<IExerciseInstanceQuestion>;
}
