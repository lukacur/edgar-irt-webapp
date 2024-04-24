export interface IEdgarJobFrameworkJobStep {
    id: string;
    started_on: string;
    finished_on: string;
    name: string;
    job_step_status: "NOT_STARTED" | "RUNNING" | "SUCCESS" | "FAILURE" | "SKIP_CHAIN" | "CRITICALLY_ERRORED";
    job_step_status_message: string;
    ordinal: number;
    parent_job: string;
}
