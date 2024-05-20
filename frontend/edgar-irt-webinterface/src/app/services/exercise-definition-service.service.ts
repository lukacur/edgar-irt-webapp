import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { INodeQuestionClass } from '../models/exercise-definition/node-question-class.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ExerciseDefinitionServiceService {

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getQuestionClassesForDefinition(idExerciseDefinition: number): Observable<INodeQuestionClass[]> {
        return this.http
            .get<INodeQuestionClass[]>(
                `${environment.backendServerInfo.applicationAddress}` +
                `/exercise-definition/${idExerciseDefinition}/question-classes`
            );
    }
}
