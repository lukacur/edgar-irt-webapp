import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model.js';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
    selector: 'app-my-exercises',
    templateUrl: './my-exercises.component.html',
})
export class MyExercisesComponent implements OnInit {
    startExerciseForm: FormGroup = null!;

    courses$: Observable<{ courseTitle: string, course: IEdgarCourse }[]> = null!;

    constructor(
        private readonly statisticsService: StatisticsService,
    ) { }

    ngOnInit(): void {
        this.startExerciseForm = new FormGroup({
            selectedCourse: new FormControl(null, Validators.required),
        });

        this.courses$ = this.statisticsService.getCoursesWithCalculatedStatistics()
            .pipe(map(courses => {
                return courses.map(crs => ({
                    courseTitle: `(${crs.course_acronym}) ${crs.course_name} - ${crs.ects_credits} ECTS`,
                    course: crs,
                }));
            }));
    }
}
