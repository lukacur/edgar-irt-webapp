import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { IExerciseDefinitionQuestionClassificationInfo } from '../models/exercise-definition/node-question-class.model.js';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IQuestionDifficultyInfo } from '../models/exercise-definition/exercise-question-difficulty-info.model.js';
import { QuestionIrtClassification } from '../util/question.util.js';

type ProgressionInformation = {
    correctAnswersToUpgrade: number | null;
    incorrectAnswersToDowngrade: number | null;
    skippedQuestionsToDowngrade: number | null;
};

@Injectable({
    providedIn: 'root'
})
export class ExerciseDefinitionService {

    constructor(
        private readonly http: HttpClient,
    ) { }

    public getQuestionClassesForDefinition(
        idExerciseDefinition: number
    ): Observable<IExerciseDefinitionQuestionClassificationInfo> {
        return this.http
            .get<IExerciseDefinitionQuestionClassificationInfo>(
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

    public getQuestionDifficultyInformation(
        idExerciseDefinition: number
    ): Observable<IQuestionDifficultyInfo[]> {
        return this.http.get<IQuestionDifficultyInfo[]>(
            `${environment.backendServerInfo.applicationAddress}/exercise-definition` +
            `/${idExerciseDefinition}/question-difficulty-info`
        ).pipe(tap(el => console.log(el)));
    }

    public overrideQuestionDifficulties(
        idExerciseDefinition: number,
        overrides: { idQuestion: number, newDifficulty: QuestionIrtClassification | null }[],
    ): Observable<void> {
        return this.http.post(
            `${environment.backendServerInfo.applicationAddress}/exercise-definition/override-question-difficulties`,
            { idExerciseDefinition, overrides },
            { responseType: 'text' }
        ).pipe(map(_ => {}));
    }
}
