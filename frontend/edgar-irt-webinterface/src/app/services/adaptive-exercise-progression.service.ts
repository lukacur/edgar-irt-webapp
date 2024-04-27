import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IExerciseInstance } from '../models/adaptive-exercises/exercise-instance.model';
import { HttpClient } from '@angular/common/http';
import { IExerciseInstanceQuestion } from '../models/adaptive-exercises/exercise-instance-question.model';
import { ICurrentExercise } from '../models/adaptive-exercises/current-exercise.model';

type StartExerciseRequest = {
    idStudent: number | null;
    idCourse: number;
    questionsCount: number;
    considerPreviousExercises: boolean;
};

@Injectable({
    providedIn: 'root'
})
export class AdaptiveExerciseProgressionService {
    private readonly idTestStudent: number | null = environment.production ? null : 23; // id_app_user is 46

    private readonly activatedExerciseInstanceInfo: BehaviorSubject<ICurrentExercise | null> =
        new BehaviorSubject<ICurrentExercise | null>(null);

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getStudentPreviousExercises(idStudent: number | null, idCourse: number): Observable<IExerciseInstance[]> {
        idStudent ??= this.idTestStudent;

        if (!environment.production) {
            return this.http
                .post<IExerciseInstance[]>(
                    `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/previous`,
                    { idStudent, idCourse }
                );
        }

        return this.http
            .get<IExerciseInstance[]>(`${environment.backendServerInfo.applicationAddress}/adaptive-exercises`);
    }

    public getStudentCurrentExercise(idStudent: number | null, idCourse: number): Observable<ICurrentExercise | null> {
        return this.http
            .post<ICurrentExercise | null>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/current`,
                { idStudent: idStudent ?? ((environment.production) ? null : this.idTestStudent), idCourse }
            );
    }

    public activateCurrentExercise(idStudent: number | null, idCourse: number): Observable<ICurrentExercise> {
        return new Observable((subject) => {
            (async () => {
                const currentExercise = await firstValueFrom(this.getStudentCurrentExercise(idStudent, idCourse));
                if (currentExercise === null) {
                    subject.error(new Error("Student does not have a currently active exercise"));
                }

                this.activatedExerciseInstanceInfo.next(currentExercise);
                subject.next(this.activatedExerciseInstanceInfo.value!);
            })();
        });
    }

    public getActivatedExercise(): Observable<ICurrentExercise | null> {
        return this.activatedExerciseInstanceInfo.asObservable();
    }

    public startExercise(startExerciseRequest: StartExerciseRequest): Observable<ICurrentExercise> {
        const finalizedRequest = { ...startExerciseRequest };
        finalizedRequest.idStudent ??= this.idTestStudent;

        return this.http
            .post<ICurrentExercise>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/start-exercise`,
                finalizedRequest,
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
