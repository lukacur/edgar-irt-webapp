import { Component, Input, OnInit } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IJobStep } from 'src/app/models/jobs/job-step.model';
import { IJob } from 'src/app/models/jobs/job.model';
import { JobsService } from 'src/app/services/jobs.service';

@Component({
  selector: 'app-job-list-item',
  templateUrl: './job-list-item.component.html',
})
export class JobListItemComponent implements OnInit {
  @Input("jobInfo")
  jobInfo: IJob = null!;

  jobExpanded: boolean = false;

  jobSteps$: Observable<IJobStep[]> | null = null;

  stepsFetched: boolean = false;
  stepsExpanded: boolean = false;

  constructor(
    private readonly jobsService: JobsService,
  ) { }

  getJobStatusText() {
    switch (this.jobInfo.job_status) {
      case 'RUNNING': return "Running...";
      case 'FINISHED': return "Finished";
      case 'FAILED': return "Failed";
      default: return this.jobInfo.job_status;
    }
  }

  getJobStatusColor() {
    switch (this.jobInfo.job_status) {
      case 'RUNNING': return 'text-yellow-500';
      case 'FINISHED': return 'text-green-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-slate-500';
    }
  }

  ngOnInit(): void {
    this.jobSteps$ = this.jobsService
      .getJobSteps(this.jobInfo.id)
      .pipe(tap(_ => this.stepsFetched = true));
  }

  restartJob(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
    
    this.jobsService.restartJob(this.jobInfo.id)
      .subscribe(() => {
        window.alert("The job will be restarted on the next job restart check cycle");
        window.location.reload();
      });
  }

}
