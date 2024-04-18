import { Component, Input, OnInit } from '@angular/core';
import { IJobStep } from 'src/app/models/jobs/job-step.model.js';

@Component({
  selector: 'app-job-step-item',
  templateUrl: './job-step-item.component.html',
})
export class JobStepItemComponent implements OnInit {
  @Input("jobStep")
  jobStep: IJobStep = null!;

  constructor() { }

  getJobStepStatusText() {
    switch (this.jobStep.job_step_status) {
      case 'NOT_STARTED': return "Not started";
      case 'RUNNING': return "Running...";
      case 'SUCCESS': return "Success";
      case 'FAILURE': return "Failure";
      case 'SKIP_CHAIN': return "Skip chain";
      case 'CRITICALLY_ERRORED': return "Critically errored";
      default: return this.jobStep.job_step_status;
    }
  }

  getJobStepStatusColor() {
    switch (this.jobStep.job_step_status) {
      case 'RUNNING': return 'text-yellow-500';
      case 'SUCCESS': return 'text-green-500';
      case 'FAILURE': return 'text-red-500';
      case 'NOT_STARTED': return 'text-orange-500';
      case 'SKIP_CHAIN': return 'text-gray-500';
      case 'CRITICALLY_ERRORED': return 'text-red-800';
      default: return 'text-slate-500';
    }
  }

  ngOnInit(): void {
  }

}
