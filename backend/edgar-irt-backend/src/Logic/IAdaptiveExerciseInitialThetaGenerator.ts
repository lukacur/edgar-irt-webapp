import { IExerciseInstance } from "../Models/Database/AdaptiveExercise/IExerciseInstance.js";

export interface IAdaptiveExerciseInitialThetaGenerator {
    generateTheta(idCourse: number, idStudent: number, previousExercises: IExerciseInstance[]): Promise<number>;
}
