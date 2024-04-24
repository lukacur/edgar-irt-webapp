import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { IAcademicYear } from 'src/app/models/edgar/academic-year.model.js';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { IJobType } from 'src/app/models/jobs/job-type.model';
import { EdgarService } from 'src/app/services/edgar.service';
import { JobsService } from 'src/app/services/jobs.service';

@Component({
    selector: 'app-job-execution',
    templateUrl: './job-execution.component.html',
})
export class JobExecutionComponent implements OnInit {
    private static readonly MAX_PREVIOUS_INCLUDED_YEAR = 10;
    readonly previousIncludedYearsChoices: number[] = [];

    jobExecutionForm: FormGroup = null!
    availableJobTypes$: Observable<{ jobType: IJobType, optText: string }[]> | null = null;

    jobExecutionFlowStep: number = 0;

    courses$: Observable<{ idCourse: number, optText: string }[]> | null = null;
    academicYears$: Observable<IAcademicYear[]> | null = null;

    constructor(
        private readonly jobsService: JobsService,
        private readonly edgarService: EdgarService,
    ) {
        this.previousIncludedYearsChoices.splice(0, this.previousIncludedYearsChoices.length);
        for (let i = 1; i <= JobExecutionComponent.MAX_PREVIOUS_INCLUDED_YEAR; ++i) {
            this.previousIncludedYearsChoices.push(i);
        }
    }

    ngOnInit(): void {
        this.jobExecutionForm = new FormGroup(
            {
                jobType: new FormControl(null, [Validators.required]),

                jobSpecificConfiguration: new FormGroup({
                    idCourse: new FormControl(null, [Validators.required]),
                    idStartAcademicYear: new FormControl(null, [Validators.required]),
                    numberOfIncludedPreviousYears: new FormControl(null, [Validators.required]),
                    maxJobTimeoutMs: new FormControl(200000, [Validators.required, Validators.min(0)]),
                    forceCalculation: new FormControl(false, []),
                }),

                jobName: new FormControl(null, []),
                userNote: new FormControl(null, []),
                periodical: new FormControl(false, []),
            }
        );

        this.availableJobTypes$ = this.jobsService.getAllJobTypes()
            .pipe(
                map(jTypes =>
                    jTypes.map(jt => ({ jobType: jt, optText: `(${jt.abbrevation}) ${jt.title}` }))
                )
            );
        this.courses$ = this.edgarService.getCourses()
            .pipe(
                map(courses =>
                    courses.map(
                        crs => ({
                            idCourse: crs.id,
                            optText: `(${crs.course_acronym}) ${crs.course_name} - ${crs.ects_credits} ECTS`
                        }))
                )
            );
        this.academicYears$ = this.edgarService.getAcademicYears();
    }

    advanceToFlowStep(flowStep: number) {
        this.jobExecutionFlowStep = flowStep;

        const stepControls: (AbstractControl | null)[] = [];
        stepControls.push(this.jobExecutionForm.get('jobType'));

        if (flowStep !== 0) {
            stepControls.forEach(sc => sc?.disable());
        } else {
            stepControls.forEach(sc => sc?.enable());
        }

        stepControls.splice(0, stepControls.length);

        stepControls.push(
            this.jobExecutionForm.get('jobSpecificConfiguration'),
            this.jobExecutionForm.get('jobName'),
            this.jobExecutionForm.get('userNote'),
            this.jobExecutionForm.get('periodical'),
        );

        if (flowStep !== 1) {
            stepControls.forEach(sc => sc?.disable());
        } else {
            stepControls.forEach(sc => sc?.enable());
        }

        stepControls.splice(0, stepControls.length);
    }

    startJob() {
        const form = this.jobExecutionForm.getRawValue();
        console.log(form);
        return;

        this.jobsService.startJob({
            idJobType: parseInt(form.jobType.id),
            jobName: form.jobName,
            userNote: form.userNote,
            periodical: form.periodical,
            request: form.jobSpecificConfiguration,
        }).subscribe({
            next: () => {
                window.alert("Job start request sent successfully");
                window.location.reload();
            },
            error: () => {
                window.alert("Job was not able to be started");
                window.location.reload();
            }
        });
    }
}
