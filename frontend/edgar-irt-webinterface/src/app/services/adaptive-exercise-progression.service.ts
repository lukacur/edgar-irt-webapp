import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.js';
import { IExerciseInstance } from '../models/adaptive-exercises/exercise-instance.model.js';
import { HttpClient } from '@angular/common/http/index.js';
import { IExerciseInstanceQuestion } from '../models/adaptive-exercises/exercise-instance-question.model.js';

@Injectable({
    providedIn: 'root'
})
export class AdaptiveExerciseProgressionService {
    private readonly idTestStudent: number | null = environment.production ? null : 23; // id_app_user is 46

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getStudentExercises(idStudent: number | null): Observable<IExerciseInstance[]> {
        idStudent ??= this.idTestStudent;

        if (!environment.production) {
            return this.http
                .get<IExerciseInstance[]>(
                    `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/${idStudent}`
                );
        }

        return this.http
            .get<IExerciseInstance[]>(`${environment.backendServerInfo.applicationAddress}/adaptive-exercises`);
    }

    public getStudentCurrentExercise(idStudent: number | null): Observable<IExerciseInstance | null> {
        return this.http
            .get<IExerciseInstance | null>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/${idStudent}/current`
            );
    }

    public nextQuestion(
        idExercise: number,
        questionSkipped: boolean,
        questionCorrect: boolean,
    ): Observable<IExerciseInstanceQuestion | { exerciseCompleted: true }> {
        const bodyObj = (environment.production) ? { idExercise } : { idExercise, questionSkipped, questionCorrect };
        return this.http
            .post<IExerciseInstanceQuestion>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/next-question`,
                bodyObj
            );
    }
}
