import { IQuestionAnswer } from "../edgar/question-answer.model.js";
import { IExerciseInstanceQuestion } from "./exercise-instance-question.model.js";
import { IExerciseInstance } from "./exercise-instance.model.js";

export interface ICurrentExercise {
    exerciseInstance: IExerciseInstance;
    questionInfo: IExerciseInstanceQuestion & { question_text: string };
    questionAnswers: IQuestionAnswer[] | null;
}
