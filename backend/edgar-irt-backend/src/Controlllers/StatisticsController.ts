import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarStatProcessingCourseLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { IEdgarStatProcessingQParamCalcGenericInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQParamCalcGenericInfo.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "../Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { IEdgarStatProcessingTestLevelCalc } from "../Models/Database/Statistics/IEdgarStatProcessingTestLevelCalc.js";

export class StatisticsController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,
        baseEndpoint: string = "/statprocessing",
    ) {
        super(baseEndpoint);
    }

    @Get("courses")
    public async getCoursesWithStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        const availableCourseCalculations: IEdgarCourse[] =
            (await this.dbConn.doQuery<IEdgarCourse>(
                `SELECT DISTINCT course.*
                FROM public.course
                    JOIN statistics_schema.question_param_calculation
                        ON course.id = question_param_calculation.id_based_on_course`,
            ))?.rows ?? [];

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

        const availableCourseCalculations: any[] =
            (await this.dbConn.doQuery<any>(
                `SELECT DISTINCT
                    question_param_calculation.id_based_on_course,
                    created_on,
                    calculation_group,
                    id_academic_year
                FROM statistics_schema.question_param_calculation
                    JOIN statistics_schema.question_param_calculation_academic_year
                        ON question_param_calculation.id =
                            question_param_calculation_academic_year.id_question_param_calculation
                WHERE question_param_calculation.id_based_on_course = $1`,
                [idCourse],
            ))?.rows ?? [];

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
            (await this.dbConn.doQuery<IEdgarStatProcessingQuestionIRTInfo>(
                `SELECT question_param_calculation.calculation_group,
                        question_param_calculation.id_based_on_course AS id_course,
                        question_irt_parameters.*
                FROM statistics_schema.question_irt_parameters
                    JOIN statistics_schema.question_param_course_level_calculation
                        ON question_irt_parameters.id_course_based_info =
                            question_param_course_level_calculation.id_question_param_calculation
                    JOIN statistics_schema.question_param_calculation
                        ON question_param_calculation.id =
                            question_param_course_level_calculation.id_question_param_calculation
                WHERE question_irt_parameters.id_question = $1`,
                [qId],
            ))?.rows ?? [];

        for (const entry of questionIRTParameters) {
            const acYears =
                (await this.dbConn.doQuery<{ id_academic_year: number }>(
                    `SELECT DISTINCT id_academic_year
                    FROM statistics_schema.question_param_calculation
                        JOIN statistics_schema.question_param_calculation_academic_year
                            ON question_param_calculation.id =
                                question_param_calculation_academic_year.id_question_param_calculation
                    WHERE calculation_group = $1
                    ORDER BY id_academic_year`,
                    [entry.calculation_group],
                ))?.rows ?? [];

            entry.id_academic_years = acYears.map(el => el.id_academic_year);
        }

        res
            .status(200)
            .json(questionIRTParameters);
    }
    
    @Get("calculations")
    public async getAllCalculations(req: Request, res: Response, next: NextFunction): Promise<void> {
        const calculations: IEdgarStatProcessingQParamCalcGenericInfo[] =
            (await this.dbConn.doQuery<IEdgarStatProcessingQParamCalcGenericInfo>(
                `SELECT *
                FROM statistics_schema.question_param_calculation`,
            ))?.rows ?? [];

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
            (await this.dbConn.doQuery<IEdgarStatProcessingCourseLevelCalc>(
                `SELECT question_param_calculation.id_question,
                        question_param_course_level_calculation.*
                FROM statistics_schema.question_param_course_level_calculation
                    JOIN statistics_schema.question_param_calculation
                        ON question_param_course_level_calculation.id_question_param_calculation =
                            question_param_calculation.id
                WHERE question_param_calculation.calculation_group = $1`,
                [calcGroup],
            ))?.rows ?? [];

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
            (await this.dbConn.doQuery<IEdgarStatProcessingTestLevelCalc>(
                `SELECT question_param_calculation.id_question,
                        question_param_calculation.id_based_on_test,
                        question_param_test_level_calculation.*
                FROM statistics_schema.question_param_test_level_calculation
                    JOIN statistics_schema.question_param_calculation
                        ON question_param_test_level_calculation.id_question_param_calculation =
                            question_param_calculation.id
                WHERE question_param_calculation.calculation_group = $1`,
                [calcGroup],
            ))?.rows ?? [];

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
            ((await this.dbConn.doQuery<{ id_academic_year: number }>(
                `SELECT *
                FROM statistics_schema.question_param_calculation_academic_year
                WHERE id_question_param_calculation = $1`,
                [calcId],
            ))?.rows ?? []).map(e => e.id_academic_year);

        res
            .status(200)
            .json(questionIRTParameters);
    }
}
