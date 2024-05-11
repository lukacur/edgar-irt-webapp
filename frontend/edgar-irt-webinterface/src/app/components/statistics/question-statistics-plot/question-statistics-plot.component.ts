import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { map, Observable, Subscription, take } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model.js';
import { ICourseLevelStatisticsCalculation } from 'src/app/models/statistics-processing/course-level-statistics-calculation.model.js';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
    selector: 'app-question-info-plot',
    templateUrl: './question-statistics-plot.component.html',
})
export class QuestionStatisticsPlotComponent implements OnInit {
    readonly questionStatisticsPlotForm: FormGroup = new FormGroup({
        course: new FormControl<IEdgarCourse | null>(null),
        idCalculation: new FormControl<string | null>(null),
    });

    courses$: Observable<{ text: string, course: IEdgarCourse }[]> | null = null;
    courseCalculations: { calculationGroup: string, acYears: string }[] = [];

    selectedCalculation: { calculationGroup: string, acYears: string } | null = null;

    courseLevelCalcs: ICourseLevelStatisticsCalculation[] | null = null;

    private readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly statisticsService: StatisticsService,
    ) { }

    ngOnInit(): void {
        this.courses$ = this.statisticsService.getCoursesWithCalculatedStatistics()
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

        this.subscriptions.push(
            this.questionStatisticsPlotForm.get("course")!.valueChanges.subscribe(_ => this.courseSelected())
        )
    }

    private getCalculations$() {
        const selectedCourse = this.questionStatisticsPlotForm.get("course")?.value ?? null
        if (selectedCourse === null) {
            throw new Error("Course not selected");
        }

        return this.statisticsService.getCourseCalculations(selectedCourse.id)
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

    courseSelected() {
        if ((this.questionStatisticsPlotForm.get("course")?.value ?? null) === null) {
            return;
        }

        this.selectedCalculation = null;
        this.questionStatisticsPlotForm.get('idCalculation')?.setValue(null);

        this.getCalculations$()
            .pipe(take(1))
            .subscribe(calcs => this.courseCalculations = calcs);
    }

    selectCalculation(calculation: { calculationGroup: string, acYears: string }) {
        this.selectedCalculation = calculation;

        this.statisticsService.getCourseLevelCalculations(this.selectedCalculation.calculationGroup)
            .pipe(take(1))
            .subscribe(clCalcs => {this.courseLevelCalcs = clCalcs; console.log(clCalcs);});
    }


    //#region Difficulty bar chart init
    @ViewChild("difficultyBarChart")
    difficultyBarChart: ElementRef<SVGSVGElement> | null = null;

    private createDifficultyBarChart() {
        
    }
    //#endregion
    @ViewChild("meanHistogram")
    meanHistogram: ElementRef<SVGSVGElement> | null = null;

    private createMeanHistogram() {
        
    }

    @ViewChild("stdDevHistogram")
    stdDevHistogram: ElementRef<SVGSVGElement> | null = null;

    private createStdDevHistogram() {
        
    }

    @ViewChild("medianHistogram")
    medianHistogram: ElementRef<SVGSVGElement> | null = null;

    private createMedianHistogram() {
        
    }

    //#region Histograms init
    //#endregion


    //#region Scatterplots init
    @ViewChild("questionCorrectnessScatterplot")
    questionCorrectnessScatterplot: ElementRef<SVGSVGElement> | null = null;

    private createQuestionCorrectnessScatterplot() {
        
    }

    @ViewChild("questionIncorrectnessScatterplot")
    questionIncorrectnessScatterplot: ElementRef<SVGSVGElement> | null = null;

    private createQuestionIncorrectnessScatterplot() {
        
    }

    //#region Acquired score scatterplot init
    @ViewChild("acquiredScoreScatterplot")
    acquiredScoreScatterplot: ElementRef<SVGSVGElement> | null = null;

    private createAcquiredScoreScatterplot() {
        
    }
    //#endregion

    //#endregion
}
