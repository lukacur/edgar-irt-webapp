import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IQuestionType } from '../models/edgar/question-type.model';
import { IEdgarNode } from '../models/edgar/node.model.js';
import { IQuestionNodeWhitelistEntry } from '../models/adaptive-exercises/question-node-whitelist-entry.model.js';
import { IEdgarCourse } from '../models/edgar/course.model.js';

@Injectable({
    providedIn: 'root'
})
export class AdaptiveExercisesService {
    constructor(
        private readonly http: HttpClient,
    ) { }

    public getCoursesWithStartableExercises(): Observable<IEdgarCourse[]> {
        return this.http
            .get<IEdgarCourse[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/courses-startable`
            );
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
}
