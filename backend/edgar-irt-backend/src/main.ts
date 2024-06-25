import { DefaultAdaptiveExerciseInfoProvider } from "./AdaptiveExercises/DefaultAdaptiveExerciseInfoProvider.js";
import { AbstractController } from "./Controlllers/AbstractController.js";
import { AdaptiveExercisesController } from "./Controlllers/AdaptiveExercisesController.js";
import { EdgarController } from "./Controlllers/EdgarController.js";
import { ExerciseDefinitionController } from "./Controlllers/ExerciseDefinitionController.js";
import { JobController } from "./Controlllers/JobController.js";
import { StatisticsController } from "./Controlllers/StatisticsController.js";
import { DatabaseConnection } from "./Database/DatabaseConnection.js";
import { DbConnProvider } from "./DbConnProvider.js";
import { ExpressServer } from "./ExpressServer.js";
import { PgBossProvider } from "./PgBossProvider.js";
import { AdaptiveExerciseService } from "./Services/AdaptiveExerciseService.js";
import { CourseService } from "./Services/CourseService.js";
import { EdgarService } from "./Services/EdgarService.js";
import { ExerciseDefinitionService } from "./Services/ExerciseDefinitionService.js";

const EDGAR_STATPROC_QUEUE_NAME = "edgar-irt-work-request-queue";

export class Main {
    private static server: ExpressServer;

    public static async main(args: string[]): Promise<void> {
        Main.server = ExpressServer.initialize();
        DbConnProvider.setDbConn(await DatabaseConnection.fromConfigFile("./database-config.json"));
        const courseService = new CourseService(DbConnProvider.getDbConn());
        const edgarService = new EdgarService(DbConnProvider.getDbConn());
        const adaptiveExerciseService = new AdaptiveExerciseService(
            DbConnProvider.getDbConn(),
            edgarService,
        );
        const exerciseDefinitionService = new ExerciseDefinitionService(DbConnProvider.getDbConn(), courseService);
        const defaultAdaptiveExerciseInfoProvider = new DefaultAdaptiveExerciseInfoProvider(
            edgarService,
            adaptiveExerciseService,
            exerciseDefinitionService,
        );

        adaptiveExerciseService.setNextQuestionGenerator(defaultAdaptiveExerciseInfoProvider);
        adaptiveExerciseService.setInitialThetaGenerator(defaultAdaptiveExerciseInfoProvider);
        adaptiveExerciseService.setThetaDeltaGenerator(defaultAdaptiveExerciseInfoProvider);

        Main.server.useJsonBodyParsing();

        const jobController: AbstractController = new JobController(
            DbConnProvider.getDbConn(),
            EDGAR_STATPROC_QUEUE_NAME,
            PgBossProvider.instance
        );
        const statisticsController: AbstractController = new StatisticsController(DbConnProvider.getDbConn());
        const edgarController: AbstractController = new EdgarController(
            DbConnProvider.getDbConn(),
            edgarService,
            courseService,
        );
        const adaptiveExercisesController: AbstractController =
            new AdaptiveExercisesController(
                courseService,
                edgarService,
                exerciseDefinitionService,
                adaptiveExerciseService,
            );

        const exerDefController: AbstractController = new ExerciseDefinitionController(
            DbConnProvider.getDbConn(),
            exerciseDefinitionService
        );

        jobController.applyController(Main.server);
        statisticsController.applyController(Main.server);
        edgarController.applyController(Main.server);
        adaptiveExercisesController.applyController(Main.server);
        exerDefController.applyController(Main.server);
        
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
