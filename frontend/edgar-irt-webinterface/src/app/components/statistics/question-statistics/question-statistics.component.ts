import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable, Subscription, take, tap } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { LogisticFunction } from 'src/app/models/irt/logistic-function.model';
import { IBaseIrtParameters } from 'src/app/models/irt/question-irt-parameters.model';
import { ICourseLevelStatisticsCalculation } from 'src/app/models/statistics-processing/course-level-statistics-calculation.model';
import { ITestLevelStatisticsCalculation } from 'src/app/models/statistics-processing/test-level-statistics-calculation.model';
import { StatisticsService } from 'src/app/services/statistics.service';
import { QuestionUtil } from 'src/app/util/question.util';

@Component({
    selector: 'app-question-statistics',
    templateUrl: './question-statistics.component.html',
})
export class QuestionStatisticsComponent implements OnInit, OnDestroy {
    readonly QUtil = QuestionUtil;

    selectedCourse: IEdgarCourse | null = null;
    selectedCalculation: { calculationGroup: string, acYears: string } | null = null;

    selectorCourses$: Observable<{ text: string, idCourse: number }[]> | null = null;
    courses: IEdgarCourse[] | null = null;

    courseCalculations: { calculationGroup: string, acYears: string }[] = [];

    readonly questionStatisticsForm = new FormGroup({
        idCourse: new FormControl<number | null>(null, [Validators.required]),
        idCalculation: new FormControl(null, [Validators.required]),
    });

    courseLevelExpanded: boolean = false;
    courseLevelCalcs: ICourseLevelStatisticsCalculation[] | null = null;
    
    testLevelExpanded: boolean = false;
    testLevelCalcs: ITestLevelStatisticsCalculation[] | null = null;

    private readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly statisticsService: StatisticsService,
    ) { }

    ngOnInit(): void {
        this.subscriptions.push(
            this.questionStatisticsForm.get("idCourse")!.valueChanges.subscribe(idCourse => {
                const course = this.courses?.find(crs => crs.id === idCourse) ?? null;
                if (course === null) {
                    throw new Error(
                        "Selected course ID is invalid (course with selected ID does not exist or was deleted)"
                    );
                }

                this.selectCourse(course);
            })
        );

        this.selectorCourses$ = this.statisticsService.getCoursesWithCalculatedStatistics().pipe(
            tap(crss => this.courses = crss),
            map(courses => 
                courses.map(course => {
                    return {
                        text: `(${course.course_acronym}) ${course.course_name} - ${course.ects_credits} ECTS`,
                        idCourse: course.id
                    };
                })
            )
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    prepareLogisticFunction(questionIrtParams: IBaseIrtParameters): (theta: number) => number {
        const logFn = LogisticFunction.withParams(
            {
                levelOfItemKnowledge: questionIrtParams.level_of_item_knowledge,
                itemDifficulty: questionIrtParams.item_difficulty,
                itemGuessProbability: questionIrtParams.item_guess_probability,
                itemMistakeProbability: questionIrtParams.item_mistake_probability,
            },
            questionIrtParams.default_item_offset_parameter
        );

        return (theta: number) => logFn.fourParamLogisticFn(theta);
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
