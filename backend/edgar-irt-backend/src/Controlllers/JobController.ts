import { NextFunction, Request, Response } from "express";
import { AbstractController } from "./AbstractController.js";
import { Get } from "../Decorators/Get.decorator.js";
import { Post } from "../Decorators/Post.decorator.js";
import { IEdgarJobFrameworkJob } from "../Models/Database/Job/IEdgarJobFrameworkJob.js";
import { IEdgarJobFrameworkJobStep } from "../Models/Database/Job/IEdgarJobFrameworkJobStep.js";
import { IEdgarJobFrameworkJobType } from "../Models/Database/Job/IEdgarJobFrameworkJobType.js";
import { JobService } from "../Services/JobService.js";

export class JobController extends AbstractController {
    constructor(
        private readonly jobService: JobService,

        baseEndpoint: string = "",
    ) {
        super(baseEndpoint);
    }

    @Get("jobs")
    public async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobs: IEdgarJobFrameworkJob[] = await this.jobService.getJobs();

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

        await this.jobService.startJob(req.body);

        res
            .status(202)
            .send();
    }

    @Post("job/restart")
    public async restartJob(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idJob = req.body["jobId"];
        if ((idJob ?? null) === null) {
            res.sendStatus(400);
            return;
        }

        res.sendStatus((await this.jobService.restartJob(idJob)) ? 200 : 400);
    }

    @Get("job/:jobId/steps")
    public async getJobSteps(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idJob = req.params["jobId"];

        const jobSteps: IEdgarJobFrameworkJobStep[] = await this.jobService.getJobSteps(idJob);

        res
            .status(200)
            .json(jobSteps);
    }

    @Get("job-steps")
    public async getAllJobSteps(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobSteps: IEdgarJobFrameworkJobStep[] = await this.jobService.getAllJobSteps();

        res
            .status(200)
            .json(jobSteps);
    }

    @Get("job-types")
    public async getAllJobTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const jobTypes: IEdgarJobFrameworkJobType[] = await this.jobService.getJobTypes();

        res
            .status(200)
            .json(jobTypes);
    }
}
