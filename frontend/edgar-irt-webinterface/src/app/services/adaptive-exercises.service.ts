import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IQuestionType } from '../models/edgar/question-type.model';
import { IExerciseInstance } from '../models/adaptive-exercises/exercise-instance.model';
import { IExerciseInstanceQuestion } from '../models/adaptive-exercises/exercise-instance-question.model';
import { IEdgarNode } from '../models/edgar/node.model.js';
import { IQuestionNodeWhitelistEntry } from '../models/adaptive-exercises/question-node-whitelist-entry.model.js';

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

    public addAllowedQuestionTypes(idQuestionTypes: number[]): Observable<void> {
        return this.http
            .put(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/allowed-question-types/add`,
                { idQuestionTypes },
                {
                    responseType: "text"
                }
            ).pipe(map(() => {}));
    }

    public removeAllowedQuestionTypes(idQuestionTypes: number[]): Observable<void> {
        return this.http
            .delete(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/allowed-question-types/remove`,
                { body: { idQuestionTypes }, responseType: "text" }
            ).pipe(map(() => {}));
    }

    public getCourseQuestionNodeWhitelist(idCourse: number): Observable<(IEdgarNode & { whitelisted_on: string })[]> {
        return this.http
            .get<(IEdgarNode & { whitelisted_on: string })[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/course/${idCourse}/question-node-whitelist`
            );
    }

    public getCourseWhitelistableQuestionNodes(idCourse: number): Observable<IEdgarNode[]> {
        return this.http
            .get<IEdgarNode[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/course/${idCourse}/whitelistable-nodes`
            );
    }

    public addQuestionNodesToWhitelist(
        nodeWhitelistEntries: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[]
    ): Observable<void> {
        return this.http
            .put(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-node-whitelist/add`,
                { nodeWhitelistEntries },
                {
                    responseType: "text"
                }
            ).pipe(map(() => {}));
    }

    public removeQuestionNodesFromWhitelist(idNodes: number[]): Observable<void> {
        return this.http
            .delete(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-node-whitelist/remove`,
                { body: { idNodes }, responseType: "text" }
            ).pipe(map(() => {}));
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
