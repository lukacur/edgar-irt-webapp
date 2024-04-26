import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, map, Observable, take, tap } from 'rxjs';
import { IQuestionType } from 'src/app/models/edgar/question-type.model.js';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';

@Component({
    selector: 'app-question-types-overview',
    templateUrl: './exercises-question-types-overview.component.html',
})
export class ExercisesQuestionTypesOverviewComponent implements OnInit {
    questionTypes$: Observable<{ idQuestionType: number, questionTypeName: string }[]> = new BehaviorSubject([]);
    whitelistedQuestionTypes$: Observable<IQuestionType[]> = new BehaviorSubject([]);

    numberOfWhitelistedQTs: number = 0;

    readonly selectedQuestionTypesForm = new FormGroup({
        questionTypeIds: new FormControl<number[] | null>(null, []),
        toRemoveQuestionTypeIds: new FormControl<number[]>([], []),
    });

    constructor(
        private readonly adaptiveExercisesService: AdaptiveExercisesService,
    ) { }

    reloadComponentData() {
        this.questionTypes$ =
            this.adaptiveExercisesService.getAvailableAllowedQuestionTypes()
                .pipe(
                    map(
                        qts =>
                            qts.map(
                                qt => ({
                                    idQuestionType: qt.id_question_type, 
                                    questionTypeName: qt.question_type_name
                                })
                            )
                    )
                );

        this.whitelistedQuestionTypes$ =
            this.adaptiveExercisesService.getAllowedQuestionTypes()
                .pipe(tap(qts => this.numberOfWhitelistedQTs = qts.length));
        this.selectedQuestionTypesForm.get('questionTypeIds')?.setValue(null);
        this.selectedQuestionTypesForm.get('toRemoveQuestionTypeIds')?.setValue([]);
    }

    ngOnInit(): void {
        this.reloadComponentData();

        this.selectedQuestionTypesForm.get('questionTypeIds')!
            .valueChanges
            .subscribe(ch => this.selectedQuestionTypesForm.markAsDirty());
  }

  removalSelectionStatus(): "indeterminate" | "full" | "empty" {
    const toRemoveIdsCount = this.selectedQuestionTypesForm.get('toRemoveQuestionTypeIds')?.value?.length ?? 0;

    return (toRemoveIdsCount > 0 && toRemoveIdsCount < this.numberOfWhitelistedQTs) ?
        "indeterminate" :
        (
            (toRemoveIdsCount === this.numberOfWhitelistedQTs && toRemoveIdsCount !== 0) ?
                "full" :
                "empty"
        );
  }

  setRemovalSelectionToAllQuestionTypes(selected: boolean) {
    this.whitelistedQuestionTypes$
        .pipe(take(1))
            .subscribe(qts => {
                this.selectedQuestionTypesForm.get('toRemoveQuestionTypeIds')
                    ?.setValue(selected ? qts.map(qt => qt.id_question_type) : []);
            });
  }

  toggleQuestionTypeForRemoval(remove: boolean, questionTypeId: number) {
    const valArr = this.selectedQuestionTypesForm.get('toRemoveQuestionTypeIds')?.value ?? [];
    const idx = valArr.indexOf(questionTypeId);

    if (idx === -1) {
        valArr.push(questionTypeId);
    } else if (remove) {
        valArr.splice(idx, 1);
    }

    this.selectedQuestionTypesForm.get('toRemoveQuestionTypeIds')?.setValue(valArr);
  }

  allowSelectedQuestionTypes() {
    const formValue = this.selectedQuestionTypesForm.getRawValue();

    if (formValue.questionTypeIds === null || formValue.questionTypeIds.length === 0) {
        window.alert("Please select question types that you want to whitelist");
        return;
    }

    this.adaptiveExercisesService.addAllowedQuestionTypes(formValue.questionTypeIds).subscribe(() => {
        window.alert("Successfully marked selected question types as allowed question types for exercises");
        this.reloadComponentData();
    });
  }

  removeSelectedQuestionTypes() {
    const formValue = this.selectedQuestionTypesForm.getRawValue();

    if (formValue.toRemoveQuestionTypeIds === null || formValue.toRemoveQuestionTypeIds.length === 0) {
        window.alert("Please select question types that you want to remove from the whitelist");
        return;
    }

    this.adaptiveExercisesService.removeAllowedQuestionTypes(formValue.toRemoveQuestionTypeIds).subscribe(() => {
        window.alert("Successfully removed selected question types from whitelist");
        this.reloadComponentData();
    });
  }
}
