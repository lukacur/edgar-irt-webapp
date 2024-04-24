import { NextFunction, Request, Response } from "express";
import { AbstractController } from "./AbstractController.js";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { Post } from "../Decorators/Post.decorator.js";
import { IEdgarJobFrameworkJob } from "../Models/Database/Job/IEdgarJobFrameworkJob.js";
import { IStartJobRequest } from "../Models/Job/IStartJobRequest.js";
import { ICourseStatisticsProcessingRequest } from "../Models/Job/ICourseStatisticsProcessingRequest.js";
import { PgBossProvider } from "../PgBossProvider.js";
import { IEdgarJobFrameworkJobStep } from "../Models/Database/Job/IEdgarJobFrameworkJobStep.js";
import { IEdgarJobFrameworkJobType } from "../Models/Database/Job/IEdgarJobFrameworkJobType.js";

export class JobController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,

        private readonly statisticsProcessingQueueName: string,
        private readonly pgBossProvider: PgBossProvider,

        baseEndpoint: string = "",
    ) {
        super(baseEndpoint);
    }

    @Get("jobs")
    public async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobs: IEdgarJobFrameworkJob[] = (await this.dbConn.doQuery<IEdgarJobFrameworkJob>(
            `SELECT *
            FROM job_tracking_schema.job
            ORDER BY started_on DESC`
        ))?.rows ?? [];

        res
            .status(200)
            .json(jobs);
    }

    @Post("job/start")
    public async startJob(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!req.body) {
            res
                .status(400)
                .send();
            return;
        }

        if (!("idJobType" in req.body && "request" in req.body)) {
            res.sendStatus(400);
            return;
        }

        if (req.body.idJobType !== 1) {
            res
                .status(100)
                .send({ error: `Job type not supported: ${req.body.idJobType}` });
            return;
        }

        const statProcReq: IStartJobRequest<ICourseStatisticsProcessingRequest> = req.body;
        console.log(statProcReq);

        await this.pgBossProvider.enqueue(this.statisticsProcessingQueueName, statProcReq);

        res
            .status(202)
            .send();
    }

    @Post("job/restart")
    public async restartJob(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobId = req.body["jobId"];
        if ((jobId ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        const result = await this.dbConn.doQuery(
            "UPDATE job_tracking_schema.job SET rerun_requested = TRUE WHERE id = $1",
            [jobId]
        );

        if (result === null) {
            res.sendStatus(500);
            return;
        }

        res.sendStatus(200);
    }

    @Get("job/:jobId/steps")
    public async getJobSteps(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobId = req.params["jobId"];

        const jobSteps: IEdgarJobFrameworkJobStep[] = (await this.dbConn.doQuery<IEdgarJobFrameworkJobStep>(
            `SELECT *
            FROM job_tracking_schema.job_step
            WHERE parent_job = $1
            ORDER BY ordinal`,
            [jobId]
        ))?.rows ?? [];

        res
            .status(200)
            .json(jobSteps);
    }

    @Get("job-steps")
    public async getAllJobSteps(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobSteps: IEdgarJobFrameworkJobStep[] = (await this.dbConn.doQuery<IEdgarJobFrameworkJobStep>(
            `SELECT *
            FROM job_tracking_schema.job_step`
        ))?.rows ?? [];

        res
            .status(200)
            .json(jobSteps);
    }

    @Get("job-types")
    public async getAllJobTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobTypes: IEdgarJobFrameworkJobType[] = (await this.dbConn.doQuery<IEdgarJobFrameworkJobType>(
            `SELECT *
            FROM job_tracking_schema.job_type`
        ))?.rows ?? [];

        res
            .status(200)
            .json(jobTypes);
    }
}
