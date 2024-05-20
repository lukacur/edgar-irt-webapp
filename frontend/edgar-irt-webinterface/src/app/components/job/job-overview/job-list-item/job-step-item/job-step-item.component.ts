import { Component, Input, OnInit } from '@angular/core';
import { IJobStep } from 'src/app/models/jobs/job-step.model.js';
import { JobUtil } from 'src/app/util/job.util';

@Component({
  selector: 'app-job-step-item',
  templateUrl: './job-step-item.component.html',
})
export class JobStepItemComponent implements OnInit {
  @Input("jobStep")
  jobStep: IJobStep = null!;

  constructor() { }

  getJobStepStatusText() {
    return JobUtil.getJobStepStatusText(this.jobStep);
  }

  getJobStepStatusColor() {
    return JobUtil.getJobStepStatusColor(this.jobStep);
  }

  ngOnInit(): void {
  }

}
