import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable, take } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { ICourseLevelStatisticsCalculation } from 'src/app/models/statistics-processing/course-level-statistics-calculation.model.js';
import { ITestLevelStatisticsCalculation } from 'src/app/models/statistics-processing/test-level-statistics-calculation.model.js';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
    selector: 'app-question-statistics',
    templateUrl: './question-statistics.component.html',
})
export class QuestionStatisticsComponent implements OnInit {
    selectedCourse: IEdgarCourse | null = null;
    selectedCalculation: { calculationGroup: string, acYears: string } | null = null;

    courses$: Observable<IEdgarCourse[]> | null = null;

    courseCalculations: { calculationGroup: string, acYears: string }[] = [];

    questionStatisticsForm: FormGroup = null!;

    courseLevelExpanded: boolean = false;
    courseLevelCalcs: ICourseLevelStatisticsCalculation[] | null = null;
    
    testLevelExpanded: boolean = false;
    testLevelCalcs: ITestLevelStatisticsCalculation[] | null = null;

    constructor(
        private readonly statisticsService: StatisticsService,
    ) { }

    ngOnInit(): void {
        this.questionStatisticsForm = new FormGroup({
            idCourse: new FormControl(null, [Validators.required]),
            idCalculation: new FormControl(null, [Validators.required]),
        });

        this.courses$ = this.statisticsService.getCoursesWithCalculatedStatistics();
    }

    toggleVisibilityWithClasses(element: HTMLElement) {
        if (element.classList.contains('hidden')) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }

    private getCalculations$() {
        if (this.selectedCourse === null) {
            throw new Error("Course not selected");
        }

        return this.statisticsService.getCourseCalculations(this.selectedCourse.id)
            .pipe(
                map(clcs => {
                    const obj = clcs
                        .sort((a, b) => a.id_academic_year - b.id_academic_year)
                        .reduce(
                            (acc, clc) => {
                                if ((acc[clc.calculation_group] ?? null) === null) {
                                    acc[clc.calculation_group] = [];
                                }

                                acc[clc.calculation_group].push(clc.id_academic_year);

                                return acc;
                            },
                            {} as { [calcGroup: string]: number[] }
                        );

                    const mappedArray = [];

                    for (const key in obj) {
                        mappedArray.push({ calculationGroup: key, acYears: obj[key].join(", ") });
                    }

                    return mappedArray;
                })
            );
    }

    selectCourse(course: IEdgarCourse) {
        this.selectedCourse = course;
        this.selectedCalculation = null;
        this.questionStatisticsForm.get('idCalculation')?.setValue(null);

        this.getCalculations$()
            .pipe(take(1))
            .subscribe(calcs => this.courseCalculations = calcs);
    }

    selectCalculation(calculation: { calculationGroup: string, acYears: string }) {
        this.selectedCalculation = calculation;

        this.statisticsService.getCourseLevelCalculations(this.selectedCalculation.calculationGroup)
            .pipe(take(1))
            .subscribe(clCalcs => this.courseLevelCalcs = clCalcs);

        this.statisticsService.getTestLevelCalculations(this.selectedCalculation.calculationGroup)
            .pipe(take(1))
            .subscribe(tlCalcs => this.testLevelCalcs = tlCalcs);
    }

    getExamLevelCalculationsForQuestion(idQuestion: number) {
        return this.testLevelCalcs?.filter(tlc => tlc.id_question === idQuestion) ?? [];
    }

    showHelp(event: MouseEvent, helpSpan: HTMLSpanElement) {
        event.preventDefault();
        event.stopPropagation();

        if (helpSpan.classList.contains('hidden')) {
            helpSpan.classList.replace('hidden', 'inline');
        } else {
            helpSpan.classList.replace('inline', 'hidden');
        }
    }
}
