import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
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
  selectedJobType: IJobType | null = null;

  jobExecutionForm: FormGroup = null!
  availableJobTypes$: Observable<IJobType[]> | null = null;

  jobExecutionFlowStep: number = 0;

  courses$: Observable<IEdgarCourse[]> | null = null;
  academicYears$: Observable<IAcademicYear[]> | null = null;

  constructor(
    private readonly jobsService: JobsService,
    private readonly edgarService: EdgarService,
  ) { }

  ngOnInit(): void {
    this.jobExecutionForm = new FormGroup(
      {
        jobType: new FormControl(null, [Validators.required]),

        course: new FormControl(null, [Validators.required]),
        academicYear: new FormControl(null, [Validators.required]),
        numberOfIncludedPreviousYears: new FormControl(null, [Validators.required]),
        maxJobTimeoutMs: new FormControl(null, [Validators.required, Validators.min(0)]),
        periodical: new FormControl(false, []),
        forceCalculation: new FormControl(false, []),
      }
    );

    this.availableJobTypes$ = this.jobsService.getAllJobTypes();
    this.courses$ = this.edgarService.getCourses();
    this.academicYears$ = this.edgarService.getAcademicYears();
  }

  advanceToFlowStep(flowStep: number) {
    console.log(this.jobExecutionForm.getRawValue());
    this.jobExecutionFlowStep = flowStep;

    if (flowStep !== 0) {
      this.jobExecutionForm.get('jobType')?.disable();
    }

    if (flowStep !== 1) {
      this.jobExecutionForm.get('course')?.disable();
      this.jobExecutionForm.get('academicYear')?.disable();
      this.jobExecutionForm.get('numberOfIncludedPreviousYears')?.disable();
      this.jobExecutionForm.get('maxJobTimeoutMs')?.disable();
      this.jobExecutionForm.get('periodical')?.disable();
      this.jobExecutionForm.get('forceCalculation')?.disable();
    }
  }
}
