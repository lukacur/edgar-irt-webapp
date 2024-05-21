import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, map, Observable, Subscription, take } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model.js';
import { ICourseLevelStatisticsCalculation } from 'src/app/models/statistics-processing/course-level-statistics-calculation.model.js';
import { StatisticsService } from 'src/app/services/statistics.service';
import { QuestionUtil } from 'src/app/util/question.util';

@Component({
    selector: 'app-question-info-plot',
    templateUrl: './question-statistics-plot.component.html',
})
export class QuestionStatisticsPlotComponent implements OnInit, AfterViewInit {
    readonly QUtil = QuestionUtil;

    readonly questionStatisticsPlotForm: FormGroup = new FormGroup({
        course: new FormControl<IEdgarCourse | null>(null),
        idCalculation: new FormControl<string | null>(null),
    });

    readonly clearSelection = new BehaviorSubject<"ALL" | string>("");

    courses$: Observable<{ text: string, course: IEdgarCourse }[]> | null = null;
    courseCalculations: { calculationGroup: string, acYears: string }[] = [];

    selectedCalculation: { calculationGroup: string, acYears: string } | null = null;

    courseLevelCalcs: ICourseLevelStatisticsCalculation[] | null = null;

    readonly focusedCourseLevelCalculations: ICourseLevelStatisticsCalculation[] = [];

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

    @ViewChild('compBase')
    compBase: ElementRef<HTMLDivElement> | null = null;

    chartsBaseWidth: number | null = null;

    ngAfterViewInit(): void {
        if ((this.compBase?.nativeElement ?? null) !== null) {
            this.chartsBaseWidth = Math.max(window.innerWidth - 200, this.compBase!.nativeElement.clientWidth);
        }
    }

    isMediumDeviceWidth() {
        return window.innerWidth >= 768;
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

    focusCalculations(
        calcs: ICourseLevelStatisticsCalculation[],
        from: "bar-chart" | "histogram",
        ...clearChannels: ("ALL" | string)[]
    ): void {
        let theCalculations: ICourseLevelStatisticsCalculation[];
        switch (from) {
            case 'histogram': {
                theCalculations = calcs.map(clc => ({
                    ...clc,
                    score_perc_mean: clc.score_perc_mean / 100,
                    score_perc_std_dev: clc.score_perc_std_dev / 100,
                    score_perc_median: clc.score_perc_median / 100,
                }));
                break;
            }

            case 'bar-chart':
            default: theCalculations = calcs;
        }
        this.focusedCourseLevelCalculations.splice(0, this.focusedCourseLevelCalculations.length);
        this.focusedCourseLevelCalculations.push(...theCalculations);

        if (clearChannels.length !== 0) {
            clearChannels.forEach(ch => this.clearSelection.next(ch));
        }
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
        this.selectedCalculation = null;
        this.questionStatisticsPlotForm.get('idCalculation')?.setValue(null);

        if ((this.questionStatisticsPlotForm.get("course")?.value ?? null) === null) {
            return;
        }

        this.getCalculations$()
            .pipe(take(1))
            .subscribe(calcs => this.courseCalculations = calcs);
    }

    formatCalculationOptionTextCallback(calculation: { calculationGroup: string, acYears: string }): string {
        return `(${calculation.calculationGroup }) Ac. years ${ calculation.acYears }`;
    }

    selectCalculation(calculation: { calculationGroup: string, acYears: string } | null) {
        this.selectedCalculation = calculation;
        this.preparedBarChartData = null;
        this.preparedHistogramData = null;

        if (this.selectedCalculation === null) {
            return;
        }

        this.statisticsService.getCourseLevelCalculations(this.selectedCalculation.calculationGroup)
            .pipe(take(1))
            .subscribe(clCalcs => {this.courseLevelCalcs = clCalcs; console.log(clCalcs);});
    }

    readonly availableQuestionClasses = QuestionUtil.getAvailableClasses();
    readonly questionClassesColors = QuestionUtil.questionClassHexColors();

    //#region Difficulty bar chart init
    private preparedBarChartData: { qClass: string, calculations: ICourseLevelStatisticsCalculation[] }[] | null = null;

    prepareDifficultyBarChartData(): { qClass: string, calculations: ICourseLevelStatisticsCalculation[] }[] {
        if (this.preparedBarChartData !== null) {
            return this.preparedBarChartData;
        }

        const retArr: { qClass: string, calculations: ICourseLevelStatisticsCalculation[] }[] = [];

        for (const questionClass of this.availableQuestionClasses) {
            retArr.push({
                qClass: questionClass,
                calculations:
                    this.courseLevelCalcs?.filter(el => el.question_irt_classification === questionClass) ?? []
            });
        }

        return this.preparedBarChartData = retArr;
    }
    //#endregion

    
    //#region Histogram data
    private preparedHistogramData: ICourseLevelStatisticsCalculation[] | null = null;

    prepareHistogramData() {
        if (this.preparedHistogramData !== null) {
            return this.preparedHistogramData;
        }

        return this.preparedHistogramData =
        (
            this.courseLevelCalcs
                ?.map(
                    clc => ({
                        ...clc,
                        score_perc_mean: clc.score_perc_mean * 100,
                        score_perc_std_dev: clc.score_perc_std_dev * 100,
                        score_perc_median: clc.score_perc_median * 100,
                    })
                )
        ) ?? [];
    }
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
