import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, map, Observable, Subscription, tap } from 'rxjs';
import { ICurrentExercise } from 'src/app/models/adaptive-exercises/current-exercise.model';
import { IExerciseInstance } from 'src/app/models/adaptive-exercises/exercise-instance.model';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { AdaptiveExerciseProgressionService } from 'src/app/services/adaptive-exercise-progression.service';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';

@Component({
    selector: 'app-my-exercises',
    templateUrl: './my-exercises.component.html',
})
export class MyExercisesComponent implements OnInit, OnDestroy {
    readonly startExerciseForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, [Validators.required]),
        questionsCount: new FormControl<number | null>(null, [Validators.required]),
        considerPreviousExercises: new FormControl<boolean | null>(false),
    });

    readonly selectableQuestionCounts: { text: string, value: number }[] = [
        { text: "5", value: 5 },
        { text: "10", value: 10 },
        { text: "15", value: 15 },
        { text: "20", value: 20 },
        { text: "25", value: 25 },
        { text: "30", value: 30 },
    ]

    courses$: Observable<{ courseTitle: string, course: IEdgarCourse }[]> = null!;

    currentlyActiveExercise: ICurrentExercise | null = null;
    previousExercises$: Observable<IExerciseInstance[]> = new BehaviorSubject([]);

    numberOfPreviousExercises: number = 0;

    readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly adaptveExercisesService: AdaptiveExercisesService,
        private readonly adaptiveExerciseProgressionService: AdaptiveExerciseProgressionService,

        private readonly route: ActivatedRoute,
        private readonly router: Router,
    ) { }

    gotoActiveExercise(studentId: number | null, courseId: number) {
        this.adaptiveExerciseProgressionService.activateCurrentExercise(studentId, courseId)
            .subscribe(() => {
                this.router.navigate(['..', 'exercise'], { relativeTo: this.route });
            });
    }

    startExercise() {
        const formValue = this.startExerciseForm.getRawValue();
        if (formValue.selectedCourse === null) {
            window.alert("Please select a course to continue");
            return;
        }

        if (formValue.questionsCount === null) {
            window.alert("Please specify a question count for the exercise");
            return;
        }

        this.adaptiveExerciseProgressionService.startExercise({
            idStudent: null,
            idCourse: formValue.selectedCourse.id,
            questionsCount: formValue.questionsCount,
            considerPreviousExercises: formValue.considerPreviousExercises ?? false,
        }).subscribe(_ => {
            window.alert(
                "Your exercise was started successfully. You will be redirected to it after confirming this dialog."
            );

            this.gotoActiveExercise(null, formValue.selectedCourse!.id);
        });
    }

    continueExercise() {
        const formValue = this.startExerciseForm.getRawValue();
        if (formValue.selectedCourse === null) {
            window.alert("Please select a course to continue");
            return;
        }

        this.gotoActiveExercise(null, formValue.selectedCourse.id);
    }

    ngOnInit(): void {
        this.courses$ = this.adaptveExercisesService.getCoursesWithStartableExercises()
            .pipe(map(courses => {
                return courses.map(crs => ({
                    courseTitle: `(${crs.course_acronym}) ${crs.course_name} - ${crs.ects_credits} ECTS`,
                    course: crs,
                }));
            }));

        this.startExerciseForm.get('selectedCourse')?.valueChanges.subscribe(crs => {
            if (crs !== null) {
                this.previousExercises$ =
                    this.adaptiveExerciseProgressionService.getStudentPreviousExercises(null, crs.id)
                        .pipe(tap(exercises => this.numberOfPreviousExercises = exercises.length));

                this.adaptiveExerciseProgressionService.getStudentCurrentExercise(null, crs.id)
                    .subscribe(ex => this.currentlyActiveExercise = ex);
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}
