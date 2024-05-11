import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, take, tap } from 'rxjs';
import { IJob } from 'src/app/models/jobs/job.model';
import { JobsService } from 'src/app/services/jobs.service';
import { JobUtil } from 'src/app/util/job.util';

@Component({
    selector: 'app-job-overview',
    templateUrl: './job-overview.component.html',
})
export class JobOverviewComponent implements OnInit, OnDestroy {
    refreshInterval: number | null = null;
    currentRefreshDuration: number = 15;
    timeToNextRefresh: number = this.currentRefreshDuration;

    expandedJobId: string | null = null;

    expandedJobInfo: IJob | null = null;
    jobs$: Observable<IJob[]> | null = null;

    loading: boolean = true;

    alternativeDisplay: boolean = false;

    constructor(
        private readonly jobsService: JobsService,

        private readonly route: ActivatedRoute,
    ) { }

    refreshPage() {
        this.loading = true;

        this.jobs$ = this.jobsService.getAllJobs().pipe(tap(_ => this.loading = false));

        if (this.route.snapshot.queryParamMap.has("jobId")) {
            this.expandedJobId = this.route.snapshot.queryParamMap.get("jobId");
            this.expandJob(this.expandedJobId);
        }
    }

    getDurationBetweenDates(date1: string | null, date2: string | null) {
        if (date1 === null || date2 === null) {
            return "-";
        }

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

        if (jobId !== null) {
            this.stopRefreshInterval();
        } else {
            this.startRefreshInterval();
        }
    }

    getJobStatusText(job: IJob) {
        return JobUtil.getJobStatusText(job);
    }

    getJobStatusColor(job: IJob) {
        return JobUtil.getJobStatusColor(job);
    }

    private startRefreshInterval() {
        let count = this.currentRefreshDuration - this.timeToNextRefresh;
        this.refreshInterval = setInterval(
            () => {
                this.timeToNextRefresh--;

                if (count === this.currentRefreshDuration) {
                    count = 0;
                    this.refreshPage();
                    this.timeToNextRefresh = this.currentRefreshDuration;
                }

                count += 1;
            },
            1000
        ) as any;
    }

    private stopRefreshInterval() {
        if (this.refreshInterval !== null) {
            clearInterval(this.refreshInterval);
        }
    }

    updateRefresh() {
        if (this.refreshInterval !== null) {
            clearInterval(this.refreshInterval);
        }

        this.timeToNextRefresh = this.currentRefreshDuration;

        this.startRefreshInterval();
    }

    refreshNow() {
        this.refreshPage();
        this.updateRefresh();
    }

    ngOnInit(): void {
        this.refreshPage();
        this.startRefreshInterval();
    }

    ngOnDestroy(): void {
        if (this.refreshInterval !== null) {
            clearInterval(this.refreshInterval);
        }
    }
}
