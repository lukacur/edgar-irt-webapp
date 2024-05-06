import { Component, Input, OnInit } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IJobStep } from 'src/app/models/jobs/job-step.model';
import { IJob } from 'src/app/models/jobs/job.model';
import { JobsService } from 'src/app/services/jobs.service';
import { JobUtil } from 'src/app/util/job.util';

@Component({
  selector: 'app-job-list-item',
  templateUrl: './job-list-item.component.html',
})
export class JobListItemComponent implements OnInit {
  @Input("jobInfo")
  jobInfo: IJob = null!;

  @Input("defaultExpanded")
  defaultExpanded: boolean = false;

  jobExpanded: boolean = false;

  jobSteps$: Observable<IJobStep[]> | null = null;

  stepsFetched: boolean = false;
  stepsExpanded: boolean = false;

  constructor(
    private readonly jobsService: JobsService,
  ) { }

  getJobStatusText() {
    return JobUtil.getJobStatusText(this.jobInfo);
  }

  getJobStatusColor() {
    return JobUtil.getJobStatusColor(this.jobInfo);
  }

  ngOnInit(): void {
    this.jobSteps$ = this.jobsService
      .getJobSteps(this.jobInfo.id)
      .pipe(tap(_ => this.stepsFetched = true));

    this.jobExpanded = this.defaultExpanded;
    this.stepsExpanded = this.defaultExpanded;
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
