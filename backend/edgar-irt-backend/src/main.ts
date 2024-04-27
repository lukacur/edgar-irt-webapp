import { AbstractController } from "./Controlllers/AbstractController.js";
import { AdaptiveExercisesController } from "./Controlllers/AdaptiveExercisesController.js";
import { EdgarController } from "./Controlllers/EdgarController.js";
import { JobController } from "./Controlllers/JobController.js";
import { StatisticsController } from "./Controlllers/StatisticsController.js";
import { DatabaseConnection } from "./Database/DatabaseConnection.js";
import { DbConnProvider } from "./DbConnProvider.js";
import { ExpressServer } from "./ExpressServer.js";
import { IExerciseInstance } from "./Models/Database/AdaptiveExercise/IExerciseInstance.js";
import { IExerciseInstanceQuestion } from "./Models/Database/AdaptiveExercise/IExerciseInstanceQuestion.js";
import { IQuestion } from "./Models/Database/Edgar/IQuestion.js";
import { IQuestionAnswer } from "./Models/Database/Edgar/IQuestionAnswer.js";
import { IEdgarStatProcessingQuestionIRTInfo } from "./Models/Database/Statistics/IEdgarStatProcessingQuestionIRTInfo.js";
import { PgBossProvider } from "./PgBossProvider.js";
import { AdaptiveExerciseService } from "./Services/AdaptiveExerciseService.js";
import { CourseService } from "./Services/CourseService.js";
import { EdgarService } from "./Services/EdgarService.js";

const EDGAR_STATPROC_QUEUE_NAME = "edgar-irt-work-request-queue";

export class Main {
    private static server: ExpressServer;

    private static edgarService: EdgarService;

    private static async provideAQuestion(
        exercise: IExerciseInstance,
        questionPool: IQuestion[],
        initial: boolean,
    ): Promise<Pick<IExerciseInstanceQuestion, "id_question" | "id_question_irt_cb_info" | "id_question_irt_tb_info" | "correct_answers">> {
        const dbConn = DbConnProvider.getDbConn();

        const q = questionPool[Math.round(Math.random() * (questionPool.length - 1))];
        const answers = (await Main.edgarService.getQuestionAnswers(q.id, true)) as (IQuestionAnswer & { is_correct: boolean })[] | null;

        const irtInfo: IEdgarStatProcessingQuestionIRTInfo | null = (
            await dbConn.doQuery<IEdgarStatProcessingQuestionIRTInfo>(
                `SELECT *
                FROM statistics_schema.question_irt_parameters
                    JOIN statistics_schema.question_param_calculation
                        ON question_irt_parameters.id_course_based_info = question_param_calculation.id
                WHERE question_irt_parameters.id_question = $1 AND
                        question_param_calculation.id_based_on_course = $2`,
                [
                    /* $1 */ q.id,
                    /* $2 */ exercise.id_course,
                ]
            )
        )?.rows[0] ?? null;
        if (irtInfo === null) {
            throw new Error("IRT info was null");
        }

        return {
            id_question: q.id,
            correct_answers: answers?.filter(a => a.is_correct).map(a => a.ordinal) ?? null,
            id_question_irt_cb_info: irtInfo.id_course_based_info,
            id_question_irt_tb_info: irtInfo.id_test_based_info,
        };
    }

    public static async main(args: string[]): Promise<void> {
        Main.server = ExpressServer.initialize();
        DbConnProvider.setDbConn(await DatabaseConnection.fromConfigFile("./database-config.json"));
        const courseService = new CourseService(DbConnProvider.getDbConn());
        const edgarService = new EdgarService(DbConnProvider.getDbConn());
        const adaptiveExerciseService = new AdaptiveExerciseService(DbConnProvider.getDbConn());

        Main.edgarService = edgarService;

        Main.server.useJsonBodyParsing();

        const jobController: AbstractController = new JobController(
            DbConnProvider.getDbConn(),
            EDGAR_STATPROC_QUEUE_NAME,
            PgBossProvider.instance
        );
        const statisticsController: AbstractController = new StatisticsController(DbConnProvider.getDbConn());
        const edgarController: AbstractController = new EdgarController(DbConnProvider.getDbConn(), courseService);
        const adaptiveExercisesController: AbstractController =
            new AdaptiveExercisesController(
                DbConnProvider.getDbConn(),
                courseService,
                edgarService,
                adaptiveExerciseService,
                { provideQuestion: Main.provideAQuestion },
                { generateTheta: async () => (1.0) },
                { generateThetaDelta: async () => ({ type: "percentage", value: 0.08 }) }
            );

        jobController.applyController(Main.server);
        statisticsController.applyController(Main.server);
        edgarController.applyController(Main.server);
        adaptiveExercisesController.applyController(Main.server);
        
        Main.server
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

            Main.server.shutdown((err) => {
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
