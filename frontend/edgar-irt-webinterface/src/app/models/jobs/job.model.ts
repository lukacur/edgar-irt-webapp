import { IJobConfiguration } from "./job-configuration.model.js";

export interface IJob {
    id: string;
    id_job_type: number;
    name: string;
    user_note: string | null;
    id_user_started: number | null;
    job_definition: IJobConfiguration;
    started_on: string;
    job_status: "RUNNING" | "FINISHED" | "FAILED";
    job_status_message: string;
    finished_on: string;
    periodical: boolean;
    rerun_requested: boolean;
}
