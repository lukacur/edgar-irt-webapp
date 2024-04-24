import { DatabaseConnection } from "./Database/DatabaseConnection.js";
import { DbConnProvider } from "./DbConnProvider.js";
import { ExpressServer } from "./ExpressServer.js";
import { IEdgarAcademicYear } from "./Models/Database/Edgar/IEdgarAcademicYear.js";
import { IEdgarCourse } from "./Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarJobFrameworkJob } from "./Models/Database/Job/IEdgarJobFrameworkJob.js";
import { IEdgarJobFrameworkJobStep } from "./Models/Database/Job/IEdgarJobFrameworkJobStep.js";
import { IEdgarJobFrameworkJobType } from "./Models/Database/Job/IEdgarJobFrameworkJobType.js";
import { IEdgarStatProcessingCourseLevelCalc } from "./Models/Database/Statistics/IEdgarStatProcessingCourseLevelCalc.js";
import { IEdgarStatProcessingQParamCalcGenericInfo } from "./Models/Database/Statistics/IEdgarStatProcessingQParamCalcGenericInfo.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "./Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { IEdgarStatProcessingTestLevelCalc } from "./Models/Database/Statistics/IEdgarStatProcessingTestLevelCalc.js";
import { ICourseStatisticsProcessingRequest } from "./Models/Job/ICourseStatisticsProcessingRequest.js";
import { IStartJobRequest } from "./Models/Job/IStartJobRequest.js";
import { PgBossProvider } from "./PgBossProvider.js";

const EDGAR_STATPROC_QUEUE_NAME = "edgar-irt-work-request-queue";

export class Main {
    private static server: ExpressServer;

    public static async main(args: string[]): Promise<void> {
        Main.server = ExpressServer.initialize();
        DbConnProvider.setDbConn(await DatabaseConnection.fromConfigFile("./database-config.json"));

        this.server
            .useJsonBodyParsing()

            //#region Job related endpoints
            .addEndpoint(
                "GET",
                "/jobs",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const jobs: IEdgarJobFrameworkJob[] = (await conn.doQuery<IEdgarJobFrameworkJob>(
                        `SELECT *
                        FROM job_tracking_schema.job
                        ORDER BY started_on DESC`
                    ))?.rows ?? [];

                    res
                        .status(200)
                        .json(jobs);
                }
            )
            .addEndpoint(
                "POST",
                "/job/start",
                async (req, res) => {
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

                    await PgBossProvider.instance.enqueue(EDGAR_STATPROC_QUEUE_NAME, statProcReq);

                    res
                        .status(202)
                        .send();
                }
            )
            .addEndpoint(
                "POST",
                "/job/restart",
                async (req, res) => {
                    const jobId = req.body["jobId"];
                    if ((jobId ?? null) === null) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const result = await conn.doQuery(
                        "UPDATE job_tracking_schema.job SET rerun_requested = TRUE WHERE id = $1",
                        [jobId]
                    );

                    if (result === null) {
                        res.sendStatus(500);
                        return;
                    }

                    res.sendStatus(200);
                }
            )
            .addEndpoint(
                "GET",
                "/job/:jobId/steps",
                async (req, res) => {
                    const jobId = req.params["jobId"];

                    const conn = DbConnProvider.getDbConn();

                    const jobSteps: IEdgarJobFrameworkJobStep[] = (await conn.doQuery<IEdgarJobFrameworkJobStep>(
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
            )
            .addEndpoint(
                "GET",
                "/job-steps",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const jobSteps: IEdgarJobFrameworkJobStep[] = (await conn.doQuery<IEdgarJobFrameworkJobStep>(
                        `SELECT *
                        FROM job_tracking_schema.job_step`
                    ))?.rows ?? [];

                    res
                        .status(200)
                        .json(jobSteps);
                }
            )
            .addEndpoint(
                "GET",
                "/job-types",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const jobTypes: IEdgarJobFrameworkJobType[] = (await conn.doQuery<IEdgarJobFrameworkJobType>(
                        `SELECT *
                        FROM job_tracking_schema.job_type`
                    ))?.rows ?? [];

                    res
                        .status(200)
                        .json(jobTypes);
                }
            )
            //#endregion

            //#region Statistics calculation and IRT related endpoints
            .addEndpoint(
                "GET",
                "/statprocessing/courses",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const availableCourseCalculations: IEdgarCourse[] =
                        (await conn.doQuery<IEdgarCourse>(
                            `SELECT DISTINCT course.*
                            FROM public.course
                                JOIN statistics_schema.question_param_calculation
                                    ON course.id = question_param_calculation.id_based_on_course`,
                        ))?.rows ?? [];

                    res
                        .status(200)
                        .json(availableCourseCalculations);
                }
            )
            .addEndpoint(
                "GET",
                "/statprocessing/:idCourse/calculations",
                async (req, res) => {
                    const idCourse = req.params['idCourse'];
                    if (!idCourse) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const availableCourseCalculations: any[] =
                        (await conn.doQuery<any>(
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
            )
            .addEndpoint(
                "GET",
                "/statprocessing/:questionId/irt-parameters",
                async (req, res) => {
                    const qId = req.params['questionId'];
                    if (!qId) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const questionIRTParameters: IEdgarStatProcessingQuestionIRTInfo[] =
                        (await conn.doQuery<IEdgarStatProcessingQuestionIRTInfo>(
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
                            (await conn.doQuery<{ id_academic_year: number }>(
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
            )
            .addEndpoint(
                "GET",
                "/statprocessing/calculations",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const calculations: IEdgarStatProcessingQParamCalcGenericInfo[] =
                        (await conn.doQuery<IEdgarStatProcessingQParamCalcGenericInfo>(
                            `SELECT *
                            FROM statistics_schema.question_param_calculation`,
                        ))?.rows ?? [];

                    res
                        .status(200)
                        .json(calculations);
                }
            )
            .addEndpoint(
                "GET",
                "/statprocessing/calculations/:calcGroup/course-level",
                async (req, res) => {
                    const calcGroup = req.params['calcGroup'];
                    if (!calcGroup) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const calculations: IEdgarStatProcessingCourseLevelCalc[] =
                        (await conn.doQuery<IEdgarStatProcessingCourseLevelCalc>(
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
            )
            .addEndpoint(
                "GET",
                "/statprocessing/calculations/:calcGroup/test-level",
                async (req, res) => {
                    const calcGroup = req.params['calcGroup'];
                    if (!calcGroup) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const calculations: IEdgarStatProcessingTestLevelCalc[] =
                        (await conn.doQuery<IEdgarStatProcessingTestLevelCalc>(
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
            )
            .addEndpoint(
                "GET",
                "/statprocessing/calculation/:calculationId/included-cademic-years",
                async (req, res) => {
                    const calcId = req.params['calculationId'];
                    if (!calcId) {
                        res.sendStatus(400);
                        return;
                    }

                    const conn = DbConnProvider.getDbConn();

                    const questionIRTParameters: number[] =
                        ((await conn.doQuery<{ id_academic_year: number }>(
                            `SELECT *
                            FROM statistics_schema.question_param_calculation_academic_year
                            WHERE id_question_param_calculation = $1`,
                            [calcId],
                        ))?.rows ?? []).map(e => e.id_academic_year);

                    res
                        .status(200)
                        .json(questionIRTParameters);
                }
            )
            //#endregion

            //#region Course and Edgar base related endpoints
            .addEndpoint(
                "GET",
                "/courses",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const courses: IEdgarCourse[] = (await conn.doQuery<IEdgarCourse>(
                        `SELECT *
                        FROM public.course`
                    ))?.rows ?? [];

                    res
                        .status(200)
                        .json(courses);
                }
            )
            .addEndpoint(
                "GET",
                "/academic-years",
                async (req, res) => {
                    const conn = DbConnProvider.getDbConn();

                    const academicYears: IEdgarAcademicYear[] = (await conn.doQuery<IEdgarAcademicYear>(
                        `SELECT *
                        FROM public.academic_year`
                    ))?.rows ?? [];

                    res
                        .status(200)
                        .json(academicYears);
                }
            )
            //#endregion
            
            .start(
                "localhost",
                8970,
                () => {
                    console.log("Express HTTP server started @localhost:8970");
                }
            );

        process.on("SIGINT", (signal) => {
            console.log("Process received SIGINT");
            console.log("Shutting down HTTP server");

            this.server.shutdown((err) => {
                let statusCode = 0;
                if (err !== undefined) {
                    console.log("Error occured while shutting down server", err);
                    statusCode = 876546;
                } else {
                    console.log("Server shutdown successful");
                }

                console.log("Terminating process...");

                process.exit(statusCode);
            });
        });
    }
}

Main.main([]);
