import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { IEdgarJobFrameworkJob } from "../Models/Database/Job/IEdgarJobFrameworkJob.js";
import { IEdgarJobFrameworkJobStep } from "../Models/Database/Job/IEdgarJobFrameworkJobStep.js";
import { IEdgarJobFrameworkJobType } from "../Models/Database/Job/IEdgarJobFrameworkJobType.js";
import { ICourseStatisticsProcessingRequest } from "../Models/Job/ICourseStatisticsProcessingRequest.js";
import { IStartJobRequest } from "../Models/Job/IStartJobRequest.js";
import { PgBossProvider } from "../PgBossProvider.js";

export class JobService {
    constructor(
        private readonly dbConn: DatabaseConnection,

        private readonly statisticsProcessingQueueName: string,
        private readonly pgBossProvider: PgBossProvider,
    ) {}

    public async getJobTypes(): Promise<IEdgarJobFrameworkJobType[]> {
        return (await this.dbConn.doQuery<IEdgarJobFrameworkJobType>(
            `SELECT *
            FROM job_tracking_schema.job_type`
        ))?.rows ?? [];
    }

    public async getJobs(): Promise<IEdgarJobFrameworkJob[]> {
        return (await this.dbConn.doQuery<IEdgarJobFrameworkJob>(
            `SELECT *
            FROM job_tracking_schema.job
            ORDER BY started_on DESC`
        ))?.rows ?? [];
    }

    public async getAllJobSteps(): Promise<IEdgarJobFrameworkJobStep[]> {
        return (await this.dbConn.doQuery<IEdgarJobFrameworkJobStep>(
            `SELECT *
            FROM job_tracking_schema.job_step`
        ))?.rows ?? [];
    }

    public async getJobSteps(idJob: string): Promise<IEdgarJobFrameworkJobStep[]> {
        return (await this.dbConn.doQuery<IEdgarJobFrameworkJobStep>(
            `SELECT *
            FROM job_tracking_schema.job_step
            WHERE parent_job = $1
            ORDER BY ordinal`,
            [idJob]
        ))?.rows ?? [];
    }

    public async startJob(statProcReq: IStartJobRequest<ICourseStatisticsProcessingRequest>): Promise<void> {
        console.log(statProcReq);

        await this.pgBossProvider.enqueue(this.statisticsProcessingQueueName, statProcReq);
    }

    public async restartJob(idJob: string): Promise<boolean> {
        const result = await this.dbConn.doQuery(
            "UPDATE job_tracking_schema.job SET rerun_requested = TRUE WHERE id = $1",
            [idJob]
        );

        return result !== null;
    }
}
