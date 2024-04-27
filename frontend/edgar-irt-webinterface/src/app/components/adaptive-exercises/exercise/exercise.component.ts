import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
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

    loading = true;

    readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly adaptiveExerciseProgressionService: AdaptiveExerciseProgressionService,
        private readonly edgarService: EdgarService,

        private readonly route: ActivatedRoute,
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

    ngOnInit(): void {
        this.subscriptions.push(
            this.adaptiveExerciseProgressionService.getActivatedExercise()
                .subscribe(async ce => {
                    if (ce === null) {
                        this.router.navigate(['..', 'my-exercises'], { relativeTo: this.route });
                    } else {
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
