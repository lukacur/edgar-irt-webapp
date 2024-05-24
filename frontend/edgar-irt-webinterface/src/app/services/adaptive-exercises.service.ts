import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IQuestionType } from '../models/edgar/question-type.model';
import { IEdgarNode } from '../models/edgar/node.model.js';
import { IQuestionNodeWhitelistEntry } from '../models/adaptive-exercises/question-node-whitelist-entry.model.js';
import { IEdgarCourse } from '../models/edgar/course.model.js';
import { IExerciseDefinition } from '../models/adaptive-exercises/exercise-definition.model.js';

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

    public getCourseExerciseDefinitions(idCourse: number): Observable<IExerciseDefinition[]> {
        return this.http
            .post<IExerciseDefinition[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/course-exercise-definitions`,
                { idCourse }
            );
    }

    public createExerciseDefinition(
        idCourse: number,
        exerciseName: string,
        correctAnswersToUpgrade: number | null,
        incorrectAnswersToDowngrade: number | null,
        skippedQuestionsToDowngrade: number | null,
    ): Observable<void> {
        return this.http
            .post(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/define-exercise`,
                {
                    idCourse,
                    exerciseName,
                    correctAnswersToUpgrade,
                    incorrectAnswersToDowngrade,
                    skippedQuestionsToDowngrade,
                },
                {
                    responseType: "text"
                }
            ).pipe(map(_ => {}));
    }

    public removeExerciseDefinitions(removedExerciseDefinitions: IExerciseDefinition[]): Observable<void> {
        return this.http
            .delete(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/exercise-definition/remove`,
                {
                    body: { definitionIds: removedExerciseDefinitions.map(def => def.id) },
                    responseType: "text"
                }
            ).pipe(map(_ => {}));
    }

    public getExerciseDefinitionNodeWhitelist(
        idExerciseDefinition: number,
    ): Observable<(IEdgarNode & { whitelisted_on: string })[]> {
        return this.http
            .get<(IEdgarNode & { whitelisted_on: string })[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/exercise-definition/${idExerciseDefinition}/question-node-whitelist`
            );
    }

    public getExerciseDefinitionWhitelistableQuestionNodes(idExerciseDefinition: number): Observable<IEdgarNode[]> {
        return this.http
            .get<IEdgarNode[]>(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/exercise-definition/${idExerciseDefinition}/whitelistable-nodes`
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

    public removeQuestionNodesFromWhitelist(
        nodes: Omit<IQuestionNodeWhitelistEntry, "whitelisted_on">[]
    ): Observable<void> {
        return this.http
            .delete(
                `${environment.backendServerInfo.applicationAddress}/adaptive-exercises/question-node-whitelist/remove`,
                { body: { nodes }, responseType: "text" }
            ).pipe(map(() => {}));
    }
}
