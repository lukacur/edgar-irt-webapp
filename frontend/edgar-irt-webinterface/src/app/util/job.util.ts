import { IJobStep } from "../models/jobs/job-step.model.js";
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

    public static getJobStepStatusText(jobStep: IJobStep) {
        switch (jobStep.job_step_status) {
            case 'NOT_STARTED': return "Not started";
            case 'RUNNING': return "Running...";
            case 'SUCCESS': return "Success";
            case 'FAILURE': return "Failure";
            case 'SKIP_CHAIN': return "Skip chain";
            case 'CRITICALLY_ERRORED': return "Critically errored";
            default: return jobStep.job_step_status;
        }
    }

    public static getJobStepStatusColor(jobStep: IJobStep) {
        switch (jobStep.job_step_status) {
            case 'RUNNING': return 'text-yellow-500';
            case 'SUCCESS': return 'text-green-500';
            case 'FAILURE': return 'text-red-500';
            case 'NOT_STARTED': return 'text-orange-500';
            case 'SKIP_CHAIN': return 'text-gray-500';
            case 'CRITICALLY_ERRORED': return 'text-red-800';
            default: return 'text-slate-500';
        }
    }
}
