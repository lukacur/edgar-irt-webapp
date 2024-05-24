import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, firstValueFrom, map, Observable, Subscription, take, tap } from 'rxjs';
import { IExerciseDefinition } from 'src/app/models/adaptive-exercises/exercise-definition.model';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';
import { EdgarService } from 'src/app/services/edgar.service';
import { ExerciseDefinitionServiceService } from 'src/app/services/exercise-definition-service.service';

@Component({
    selector: 'app-exercise-definition',
    templateUrl: './exercise-definition.component.html',
})
export class ExerciseDefinitionComponent implements OnInit, OnDestroy {
    readonly exerciseDefinitionForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, [Validators.required]),

        exerciseName: new FormControl<string | null>(null, [Validators.required]),

        customProgression: new FormControl<boolean>(false),

        correctAnswersToUpgrade: new FormControl<number>(3, [Validators.min(1)]),
        incorrectAnswersToDowngrade: new FormControl<number>(2, [Validators.min(1)]),
        skippedQuestionsToDowngrade: new FormControl<number>(5, [Validators.min(1)]),
    });

    courses$: Observable<{ text: string, course: IEdgarCourse }[]> = new BehaviorSubject([]);
    exerciseDefinitions$: Observable<IExerciseDefinition[]> = new BehaviorSubject([]);

    private readonly subscriptions: Subscription[] = [];
    constructor(
        private adaptiveExercisesService: AdaptiveExercisesService,
        private exerciseDefinitionService: ExerciseDefinitionServiceService,
        private edgarService: EdgarService,
    ) { }

    async defineNewExercise() {
        const exerDefForm = this.exerciseDefinitionForm.getRawValue();
        
        const course = this.exerciseDefinitionForm.get('selectedCourse')?.value;
        if ((course ?? null) === null) {
            window.alert("A course must be selected before defining a new exercise");
            return;
        }

        if (exerDefForm.exerciseName === null || exerDefForm.exerciseName.length < 5) {
            window.alert("Exercise definition must have a name set and the name must contain at least 5 characters");
            return;
        }

        const previouslyDefinedExers = await firstValueFrom(this.exerciseDefinitions$);
        if (previouslyDefinedExers.some(exer => exer.exercise_name === exerDefForm.exerciseName)) {
            window.alert("New exercise name must be unique");
            return;
        }
        
        this.adaptiveExercisesService.createExerciseDefinition(
            course!.id,
            exerDefForm.exerciseName,

            exerDefForm.correctAnswersToUpgrade,
            exerDefForm.incorrectAnswersToDowngrade,
            exerDefForm.skippedQuestionsToDowngrade,
        ).subscribe(() => {
            window.alert("New exercise definition successfully created");
            this.exerciseDefinitionForm.reset({
                selectedCourse: null,
                exerciseName: null,

                customProgression: false,

                correctAnswersToUpgrade: 3,
                incorrectAnswersToDowngrade: 2,
                skippedQuestionsToDowngrade: 5,
            });
        });
    }

    ngOnInit(): void {
        this.courses$ = this.edgarService.getCourses()
            .pipe(
                map(courses =>
                    courses.map(course => {
                        return {
                            text: `(${course.course_acronym}) ${course.course_name} - ${course.ects_credits} ECTS`,
                            course
                        };
                    })
                )
            );

        const selectedCourseControl = this.exerciseDefinitionForm.get('selectedCourse');
        if (selectedCourseControl !== null) {
            this.subscriptions.push(
                selectedCourseControl.valueChanges
                    .subscribe(crs => {
                        if (crs !== null) {
                            this.exerciseDefinitions$ =
                                this.adaptiveExercisesService.getCourseExerciseDefinitions(crs.id);
                        }
                    })
            );
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}
