import { DatabaseConnection } from "./Database/DatabaseConnection.js";
import { DbConnProvider } from "./DbConnProvider.js";
import { ExpressServer } from "./ExpressServer.js";
import { PgBossProvider } from "./PgBossProvider.js";

type EdgarCourse = {
    id: number;
    course_name: string;
    course_acronym: string;
    ects_credits: number;
};

type EdgarAcademicYear = {
    id: number;
    title: string;
    date_start: string;
    date_end: string;
};

type EdgarJobFrameworkJobType = {
    id: number;
    abbrevation: string;
    title: string;
    description: string;
    request_form: object;
};

type CourseStatisticsProcessingRequest = {
    idCourse: number;
    idStartAcademicYear: number;
    numberOfIncludedPreviousYears: number;

    userRequested: number | null;

    forceCalculation: boolean;
};

type ImportInfo = {
    url: string;
};

type BlockingConfig = {
    awaitDataExtraction: boolean;
    workInBackground: boolean;
    persistResultInBackground: boolean;
};

type InputExtractorConfig<TConfigContent extends object> = {
    type: string;
    importInfo?: ImportInfo;

    configContent: TConfigContent;
};

type JobStepDescriptor = {
    type: string;
    importInfo?: ImportInfo;

    stepTimeoutMs: number;
    resultTTL?: number;
    configContent: object;

    isCritical: boolean;
};

type JobWorkerConfig = {
    type: string;
    importInfo?: ImportInfo;

    databaseConnection: string;
    steps: JobStepDescriptor[];
};

type DataPersistorConfig<TConfigContent extends object> = {
    type: string;
    importInfo?: ImportInfo;

    persistanceTimeoutMs: number;
    configContent: TConfigContent;
};

interface IJobConfiguration/* <TInputExtractorConfig, TDataPersistorConfig> */ {
    readonly jobId: string;
    readonly jobTypeAbbrevation: string;
    readonly jobName: string;
    readonly idUserStarted: number | null;
    readonly jobQueue: string | null;
    readonly jobTimeoutMs: number;
    readonly periodical: boolean;

    readonly blockingConfig: BlockingConfig;

    readonly inputExtractorConfig: InputExtractorConfig<object>;

    readonly jobWorkerConfig: JobWorkerConfig;

    readonly dataPersistorConfig: DataPersistorConfig<object>;
}

type EdgarJobFrameworkJob = {
    id: string;
    id_job_type: number;
    name: string;
    id_user_started: number;
    job_definition: IJobConfiguration;
    started_on: string;
    job_status: "RUNNING" | "FINISHED" | "FAILED";
    job_status_message: string;
    finished_on: string;
    periodical: boolean;
    rerun_requested: boolean;
}

type EdgarJobFrameworkJobStep = {
    id: string;
    started_on: string;
    finished_on: string;
    name: string;
    job_step_status: "NOT_STARTED" | "RUNNING" | "SUCCESS" | "FAILURE" | "SKIP_CHAIN" | "CRITICALLY_ERRORED";
    job_step_status_message: string;
    ordinal: number;
    parent_job: string;
}

type EdgarStatProcessingQuestionIRTInfo = {
    id_course_based_info: number;
    id_course: number;
    calculation_group: string;
    id_academic_years: number[];

    id_test_based_info: number[];
    id_question: number;

    default_item_offset_parameter: number;
    level_of_item_knowledge: number;
    item_difficulty: number;
    item_guess_probability: number;
    item_mistake_probability: number;
};

type EdgarStatProcessingQParamCalcGenericInfo = {
    id: number;
    calculation_group: string;

    id_based_on_course: number;
    id_based_on_test: number | null;
    id_question: number;
    created_on: string;
};

type EdgarStatProcessingCourseLevelCalc = {
    id_question_param_calculation: number;
    score_mean: number;
    score_std_dev: number;
    score_median: number;
    total_achieved: number;
    total_achievable: number;
    answers_count: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    partial: number;
};

type EdgarStatProcessingTestLevelCalc = {
    id_question_param_calculation: number;
    mean: number;
    std_dev: number;
    count: number;
    median: number;
    sum: number;
    part_of_total_sum: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    partial: number;
};





interface IStartJobRequest<TRequest> {
    readonly idJobType: number;

    readonly jobName?: string | null;
    readonly userNote?: string | null;
    readonly periodical: boolean;
    readonly idUserRequested?: number | null;

    readonly jobMaxTimeoutMs?: number;

    readonly request: TRequest;
}

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

                    const jobs: EdgarJobFrameworkJob[] = (await conn.doQuery<EdgarJobFrameworkJob>(
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

                    const statProcReq: IStartJobRequest<CourseStatisticsProcessingRequest> = req.body;
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

                    const jobSteps: EdgarJobFrameworkJobStep[] = (await conn.doQuery<EdgarJobFrameworkJobStep>(
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

                    const jobSteps: EdgarJobFrameworkJobStep[] = (await conn.doQuery<EdgarJobFrameworkJobStep>(
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

                    const jobTypes: EdgarJobFrameworkJobType[] = (await conn.doQuery<EdgarJobFrameworkJobType>(
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

                    const availableCourseCalculations: EdgarCourse[] =
                        (await conn.doQuery<EdgarCourse>(
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

                    const questionIRTParameters: EdgarStatProcessingQuestionIRTInfo[] =
                        (await conn.doQuery<EdgarStatProcessingQuestionIRTInfo>(
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

                    const calculations: EdgarStatProcessingQParamCalcGenericInfo[] =
                        (await conn.doQuery<EdgarStatProcessingQParamCalcGenericInfo>(
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

                    const calculations: EdgarStatProcessingCourseLevelCalc[] =
                        (await conn.doQuery<EdgarStatProcessingCourseLevelCalc>(
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

                    const calculations: EdgarStatProcessingTestLevelCalc[] =
                        (await conn.doQuery<EdgarStatProcessingTestLevelCalc>(
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

                    const courses: EdgarCourse[] = (await conn.doQuery<EdgarCourse>(
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

                    const academicYears: EdgarAcademicYear[] = (await conn.doQuery<EdgarAcademicYear>(
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
