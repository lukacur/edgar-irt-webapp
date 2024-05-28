import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, map, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IExerciseInstance } from '../models/adaptive-exercises/exercise-instance.model';
import { HttpClient } from '@angular/common/http';
import { ICurrentExercise } from '../models/adaptive-exercises/current-exercise.model';
import { QuestionIrtClassification } from '../util/question.util.js';

type StartExerciseRequest = {
    idStudent: number | null;
    idCourse: number;
    idExerciseDefinition: number;
    questionsCount: number;
    startDifficulty: QuestionIrtClassification | null;
    considerPreviousExercises: boolean;
};

@Injectable({
    providedIn: 'root'
})
export class AdaptiveExerciseProgressionService {
    private readonly idTestStudent: number | null = environment.production ? null : 23; // id_app_user is 46

    private activatedExerciseInstanceIdStudent: number | null = null;
    private activatedExerciseInstanceIdCourse: number | null = null;

    private readonly activatedExerciseInstanceInfo: BehaviorSubject<ICurrentExercise | null> =
        new BehaviorSubject<ICurrentExercise | null>(null);

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getStudentStartDifficulty(
        idStudent: number | null,
        idExerciseDefinition: number,
    ): Observable<QuestionIrtClassification | null> {
        return this.http.post<{ difficulty: QuestionIrtClassification | null }>(
            `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/starting-difficulty`,
            { idStudent: idStudent ?? this.idTestStudent, idExerciseDefinition, }
        ).pipe(map(rsp => rsp.difficulty));
    }

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

                this.activatedExerciseInstanceIdStudent = idStudent;
                this.activatedExerciseInstanceIdCourse = idCourse;
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

    private async advanceCurrentExercise() {
        const currentExercise = await firstValueFrom(this.getStudentCurrentExercise(
            this.activatedExerciseInstanceIdStudent,
            this.activatedExerciseInstanceIdCourse!,
        ));

        this.activatedExerciseInstanceInfo.next(currentExercise);
    }

    public nextQuestion(
        idExercise: number,
        studentAnswers: number[] | null,
        studentTextAnswer: string | null,
        questionSkipped: boolean | null,
        questionCorrect: boolean | null,
    ): Observable<ICurrentExercise | { exerciseComplete: true }> {
        return this.http
            .post<ICurrentExercise>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/next-question`,
                {
                    idExercise,
                    studentAnswers,
                    studentTextAnswer,
                    questionSkipped,
                    questionCorrect,
                }
            ).pipe(
                tap(_ => this.advanceCurrentExercise())
            );
    }
}
