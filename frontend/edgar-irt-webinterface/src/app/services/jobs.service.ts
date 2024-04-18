import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { IJob } from '../models/jobs/job.model';
import { Observable, tap } from 'rxjs';
import { IJobStep } from '../models/jobs/job-step.model.js';
import { IJobType } from '../models/jobs/job-type.model.js';

@Injectable({
    providedIn: 'root'
})
export class JobsService {

    constructor(
        private readonly http: HttpClient,
    ) { }

    getAllJobs(): Observable<IJob[]> {
        return this.http
            .get<IJob[]>(
                `${environment.backendServerInfo.applicationAddress}/jobs`
            )
            .pipe(tap(data => console.log(data)));
    }

    getJobSteps(jobId: string): Observable<IJobStep[]> {
        return this.http
            .get<IJobStep[]>(
                `${environment.backendServerInfo.applicationAddress}/job/${jobId}/steps`
            )
            .pipe(tap(data => console.log(data)));
    }

    getAllJobTypes(): Observable<IJobType[]> {
        return this.http
            .get<IJobType[]>(
                `${environment.backendServerInfo.applicationAddress}/job-types`
            ).pipe(tap(data => console.log(data)));
    }

    restartJob(jobId: string): Observable<void> {
        return this.http
            .post<void>(
                `${environment.backendServerInfo.applicationAddress}/job/${jobId}/restart`,
                { jobId }
            )
    }

    startJob() {
        
    }

}
