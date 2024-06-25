import { NextFunction, Request, Response } from "express";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarStatProcessingCourseLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { IEdgarStatProcessingQParamCalcGenericInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQParamCalcGenericInfo.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { IEdgarStatProcessingTestLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingTestLevelCalc.js";
import { StatisticsService } from "../Services/StatisticsService.js";
import { IEdgarStatProcessingCalculation } from "../Models/Database/Statistics/IEdgarStatProcessingCalculation.js";

export class StatisticsController extends AbstractController {
    constructor(
        private readonly statisticsService: StatisticsService,

        baseEndpoint: string = "/statprocessing",
    ) {
        super(baseEndpoint);
    }

    @Get("courses")
    public async getCoursesWithStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        const availableCourseCalculations: IEdgarCourse[] = await this.statisticsService.getCoursesWithStatistics();

        res
            .status(200)
            .json(availableCourseCalculations);
    }

    @Get(":idCourse/calculations")
    public async getCourseCalculations(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idCourse = req.params['idCourse'];
        if (!idCourse) {
            res.sendStatus(400);
            return;
        }

        const availableCourseCalculations: IEdgarStatProcessingCalculation[] =
            await this.statisticsService.getCourseCalculations(
                parseInt(idCourse)
            );

        res
            .status(200)
            .json(availableCourseCalculations);
    }
    
    @Get(":questionId/irt-parameters")
    public async getQuestionIRTParameters(req: Request, res: Response, next: NextFunction): Promise<void> {
        const qId = req.params['questionId'];
        if (!qId) {
            res.sendStatus(400);
            return;
        }

        const questionIRTParameters: IEdgarStatProcessingQuestionIRTInfo[] =
            await this.statisticsService.getQuestionIrtParameters(parseInt(qId));

        res
            .status(200)
            .json(questionIRTParameters);
    }
    
    @Get("calculations")
    public async getAllCalculations(req: Request, res: Response, next: NextFunction): Promise<void> {
        const calculations: IEdgarStatProcessingQParamCalcGenericInfo[] =
            await this.statisticsService.getAllCalculations();

        res
            .status(200)
            .json(calculations);
    }

    @Get("calculations/:calcGroup/course-level")
    public async getCalculationGroupCourseLevelCalculations(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const calcGroup = req.params['calcGroup'];
        if (!calcGroup) {
            res.sendStatus(400);
            return;
        }

        const calculations: IEdgarStatProcessingCourseLevelCalc[] =
            await this.statisticsService.getCourseLevelCalculationsOfCalculationGroup(calcGroup);

        res
            .status(200)
            .json(calculations);
    }
    
    @Get("calculations/:calcGroup/test-level")
    public async getCalculationGroupTestLevelCalculations(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const calcGroup = req.params['calcGroup'];
        if (!calcGroup) {
            res.sendStatus(400);
            return;
        }

        const calculations: IEdgarStatProcessingTestLevelCalc[] =
            await this.statisticsService.getTestLevelCalculationsOfCalculationGroup(calcGroup);

        res
            .status(200)
            .json(calculations);
    }
    
    @Get("calculation/:calculationId/included-cademic-years")
    public async getCalculationIncludedAcademicYears(req: Request, res: Response, next: NextFunction): Promise<void> {
        const calcId = req.params['calculationId'];
        if (!calcId) {
            res.sendStatus(400);
            return;
        }

        const questionIRTParameters: number[] =
            (await this.statisticsService.getAcademicYearsForCalculation(parseInt(calcId)))
                .map(e => e.id_academic_year);

        res
            .status(200)
            .json(questionIRTParameters);
    }
}
