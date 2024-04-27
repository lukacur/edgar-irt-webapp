import { IQuestionAnswer } from "../Edgar/IQuestionAnswer.js";
import { IExerciseInstance } from "./IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "./IExerciseInstanceQuestion.js";

export interface ICurrentExercise {
    exerciseInstance: IExerciseInstance;
    questionInfo: IExerciseInstanceQuestion & { question_text: string };
    questionAnswers: IQuestionAnswer[] | null;
}
