import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { IJobType } from 'src/app/models/jobs/job-type.model.js';
import { JobsService } from 'src/app/services/jobs.service';

@Component({
  selector: 'app-job-execution',
  templateUrl: './job-execution.component.html',
})
export class JobExecutionComponent implements OnInit {
  jobExecutionForm: FormGroup = null!
  availableJobTypes$: Observable<IJobType[]> | null = null;

  jobExecutionFlowStep: number = 0;

  constructor(
    private readonly jobsService: JobsService,
  ) { }

  ngOnInit(): void {
    this.jobExecutionForm = new FormGroup(
      {
        jobType: new FormControl('', [Validators.required])
      }
    );

    this.availableJobTypes$ = this.jobsService.getAllJobTypes();
  }

  fooClick() {
    console.log(this.jobExecutionForm.getRawValue());
  }
}
