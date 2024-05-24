import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { INodeQuestionClass } from '../models/exercise-definition/node-question-class.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

type ProgressionInformation = {
    correctAnswersToUpgrade: number | null;
    incorrectAnswersToDowngrade: number | null;
    skippedQuestionsToDowngrade: number | null;
};

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

    public updateProgressionInformation(
        idExerciseDefinition: number,
        progressionInformation: ProgressionInformation,
    ): Observable<void> {
        return this.http
            .post(
                `${environment.backendServerInfo.applicationAddress}/exercise-definition/update-progression`,
                { idExerciseDefinition, ...progressionInformation },
                { responseType: "text" },
            )
            .pipe(map(_ => {}));
    }
}
