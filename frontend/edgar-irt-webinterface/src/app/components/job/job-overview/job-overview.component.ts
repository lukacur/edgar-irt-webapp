import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { IJob } from 'src/app/models/jobs/job.model.js';
import { JobsService } from 'src/app/services/jobs.service';

@Component({
  selector: 'app-job-overview',
  templateUrl: './job-overview.component.html',
})
export class JobOverviewComponent implements OnInit {
  expandedJobId: string | null = null;
  jobs$: Observable<IJob[]> | null = null;

  constructor(
    private readonly jobsService: JobsService,

    private readonly route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.has("jobId")) {
      this.expandedJobId = this.route.snapshot.queryParamMap.get("jobId");
    }

    this.jobs$ = this.jobsService.getAllJobs();
  }
}
