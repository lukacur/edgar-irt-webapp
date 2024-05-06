import { IJob } from "../models/jobs/job.model.js";

export class JobUtil {
    private constructor() {}

    public static getJobStatusText(job: IJob) {
        switch (job.job_status) {
            case 'RUNNING': return "Running...";
            case 'FINISHED': return "Finished";
            case 'FAILED': return "Failed";
            default: return job.job_status;
        }
    }

    public static getJobStatusColor(job: IJob) {
        switch (job.job_status) {
            case 'RUNNING': return 'text-yellow-500';
            case 'FINISHED': return 'text-green-500';
            case 'FAILED': return 'text-red-500';
            default: return 'text-slate-500';
        }
    }
}
