import { HttpClient } from '@angular/common/http/index.js';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.js';
import { IQuestionType } from '../models/edgar/question-type.model.js';
import { IQuestion } from '../models/edgar/question.model.js';
import { IExerciseInstance } from '../models/adaptive-exercises/exercise-instance.model.js';
import { IQuestionBlacklistEntry } from '../models/adaptive-exercises/question-blacklist-entry.model.js';
import { IExerciseInstanceQuestion } from '../models/adaptive-exercises/exercise-instance-question.model.js';

@Injectable({
    providedIn: 'root'
})
export class AdaptiveExercisesService {
    private readonly idTestUser: number | null = environment.production ? null : 23; // id_app_user is 46 === 'Igor Mekterović'

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getUsersExercises(): Observable<IExerciseInstance[]> {
        if (this.idTestUser !== null) {
            return this.http
                .get<IExerciseInstance[]>(
                    `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/${this.idTestUser}`
                );
        }

        return this.http
            .get<IExerciseInstance[]>(`${environment.backendServerInfo.applicationAddress}/adaptive-exercises`);
    }

    public getAllowedQuestionTypes(): Observable<IQuestionType[]> {
        return this.http
            .get<IQuestionType[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/allowed-question-types`
            );
    }

    public getAvailableAllowedQuestionTypes(): Observable<IQuestionType[]> {
        return this.http
            .get<IQuestionType[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/available-allowed-question-types`
            );
    }

    public addAllowedQuestionType(idQuestionType: number): Observable<void> {
        return this.http
            .put<void>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/allowed-question-types/add`,
                { idQuestionType }
            );
    }

    public removeAllowedQuestionType(idQuestionType: number): Observable<void> {
        return this.http
            .delete<void>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/allowed-question-types/remove`,
                { body: { idQuestionType } }
            );
    }

    public getQuestionBlacklist(): Observable<IQuestionBlacklistEntry[]> {
        return this.http
            .get<IQuestionBlacklistEntry[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-blacklist`
            );
    }

    public getBlacklistableQuestions(): Observable<IQuestion[]> {
        return this.http
            .get<IQuestion[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/blacklistable-questions`
            );
    }

    public addQuestionToBlacklist(idQuestion: number): Observable<void> {
        return this.http
            .put<void>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-blacklist/add`,
                { idQuestion }
            );
    }

    public removeQuestionFromBlacklist(idQuestion: number): Observable<void> {
        return this.http
            .delete<void>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-blacklist/remove`,
                { body: { idQuestion } }
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
            )
    }
}
