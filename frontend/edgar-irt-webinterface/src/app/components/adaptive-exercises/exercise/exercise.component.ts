import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { ICurrentExercise } from 'src/app/models/adaptive-exercises/current-exercise.model';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { AdaptiveExerciseProgressionService } from 'src/app/services/adaptive-exercise-progression.service';
import { EdgarService } from 'src/app/services/edgar.service';

@Component({
    selector: 'app-exercise',
    templateUrl: './exercise.component.html',
})
export class ExerciseComponent implements OnInit, OnDestroy {
    currentExercise: ICurrentExercise | null = null;
    currentExerciseCourse: IEdgarCourse | null = null;

    readonly studentAnswers: number[] = [];

    studentCodeOrTextAnswer: string | null = null;

    loading = true;
    finished = false;

    readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly adaptiveExerciseProgressionService: AdaptiveExerciseProgressionService,
        private readonly edgarService: EdgarService,

        public readonly route: ActivatedRoute,
        private readonly router: Router,
    ) { }

    toggleAnswerSelection(answerOrdinal: number) {
        const idx = this.studentAnswers.indexOf(answerOrdinal);
        if (idx === -1) {
            this.studentAnswers.push(answerOrdinal);
        } else {
            this.studentAnswers.splice(idx, 1);
        }
    }

    private subscribeToQuestionAnswering(obs: Observable<ICurrentExercise | { exerciseComplete: true }>) {
        obs.subscribe(val => {
            if ("exerciseComplete" in val && val.exerciseComplete) {
                this.finished = true;
            }

            this.studentAnswers.splice(0, this.studentAnswers.length);
            this.studentCodeOrTextAnswer = null;
            this.loading = true;
        });
    }

    answerQuestion() {
        if (this.currentExercise === null) {
            this.router.navigate(['..', 'my-exercises'], { relativeTo: this.route });
            return;
        }

        this.subscribeToQuestionAnswering(
            this.adaptiveExerciseProgressionService.nextQuestion(
                this.currentExercise.exerciseInstance.id,
                this.studentAnswers,
                this.studentCodeOrTextAnswer,
                null,
                null,
            )
        );
    }

    forceQuestionAnswer(correct: boolean) {
        if (this.currentExercise === null) {
            this.router.navigate(['..', 'my-exercises'], { relativeTo: this.route });
            return;
        }

        this.subscribeToQuestionAnswering(
            this.adaptiveExerciseProgressionService.nextQuestion(
                this.currentExercise.exerciseInstance.id,
                null,
                null,
                false,
                correct,
            )
        );
    }

    skipQuestion() {
        if (this.currentExercise === null) {
            this.router.navigate(['..', 'my-exercises'], { relativeTo: this.route });
            return;
        }

        this.subscribeToQuestionAnswering(
            this.adaptiveExerciseProgressionService.nextQuestion(
                this.currentExercise.exerciseInstance.id,
                null,
                null,
                true,
                false,
            )
        );
    }

    ngOnInit(): void {
        this.subscriptions.push(
            this.adaptiveExerciseProgressionService.getActivatedExercise()
                .subscribe(async ce => {
                    if (ce === null && !this.finished) {
                        this.router.navigate(['..', 'my-exercises'], { relativeTo: this.route });
                    } else if (ce !== null) {
                        this.currentExercise = ce;

                        this.currentExerciseCourse = (await firstValueFrom(this.edgarService.getCourses()))
                            .filter(crs => crs.id === ce.exerciseInstance.id_course)[0] ?? null;

                        this.loading = false;
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}
