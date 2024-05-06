import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, take, tap } from 'rxjs';
import { IJob } from 'src/app/models/jobs/job.model';
import { JobsService } from 'src/app/services/jobs.service';
import { JobUtil } from 'src/app/util/job.util';

@Component({
    selector: 'app-job-overview',
    templateUrl: './job-overview.component.html',
})
export class JobOverviewComponent implements OnInit {
    expandedJobId: string | null = null;

    expandedJobInfo: IJob | null = null;
    jobs$: Observable<IJob[]> | null = null;

    loading: boolean = true;

    alternativeDisplay: boolean = false;

    constructor(
        private readonly jobsService: JobsService,

        private readonly route: ActivatedRoute,
    ) { }

    getDurationBetweenDates(date1: string, date2: string) {
        const dt1 = new Date(date1);
        const dt2 = new Date(date2);

        const dateDiffMs = Math.abs(dt2.getTime() - dt1.getTime());

        let remaining = dateDiffMs;

        const hours = Math.floor(remaining / (3600 * 1000));
        remaining -= hours * 3600 * 1000;

        const minutes = Math.floor(remaining / (60 * 1000));
        remaining -= minutes * 60 * 1000;

        const seconds = Math.floor(remaining / 1000);
        remaining -= seconds * 1000;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}.${remaining.toString().padStart(2, '0')}`;
    }

    expandJob(jobId: string | null) {
        this.expandedJobId = jobId;
        this.jobs$?.pipe(
            take(1),
            map(jobs => this.expandedJobInfo = jobs.find(j => j.id === this.expandedJobId) ?? null),
        ).subscribe(j => this.expandedJobInfo = j);
    }

    getJobStatusText(job: IJob) {
        return JobUtil.getJobStatusText(job);
    }

    getJobStatusColor(job: IJob) {
        return JobUtil.getJobStatusColor(job);
    }

    ngOnInit(): void {
        this.jobs$ = this.jobsService.getAllJobs().pipe(tap(_ => this.loading = false));

        if (this.route.snapshot.queryParamMap.has("jobId")) {
            this.expandedJobId = this.route.snapshot.queryParamMap.get("jobId");
            this.jobs$.pipe(
                map(jobs => this.expandedJobInfo = jobs.find(j => j.id === this.expandedJobId) ?? null)
            );
        }
    }
}
