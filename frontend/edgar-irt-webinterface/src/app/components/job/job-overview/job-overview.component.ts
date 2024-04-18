import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IJob } from 'src/app/models/jobs/job.model.js';
import { JobsService } from 'src/app/services/jobs.service';

@Component({
  selector: 'app-job-overview',
  templateUrl: './job-overview.component.html',
})
export class JobOverviewComponent implements OnInit {
  jobs$: Observable<IJob[]> | null = null;

  constructor(
    private readonly jobsService: JobsService,
  ) { }

  ngOnInit(): void {
    this.jobs$ = this.jobsService.getAllJobs();
  }

}
