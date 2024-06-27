import { readFile } from "fs/promises";
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
import { JobService } from "./Services/JobService.js";
import { StatisticsService } from "./Services/StatisticsService.js";
import { existsSync } from "fs";

const EDGAR_STATPROC_QUEUE_NAME = "edgar-irt-work-request-queue";

type ServerConfig = {
    address: string;
    port: number;
};

export class Main {
    private static server: ExpressServer;
    private static readonly DEFAULT_SERVER_CONFIG: ServerConfig = {
        address: "localhost",
        port: 8970
    };

    private static async prepareControllers(): Promise<AbstractController[]> {
        await PgBossProvider.configureInstanceFromFile("./pgboss-config.json");
        if (PgBossProvider.instance === null) {
            throw new Error("Connection with the PgBoss provider database could not be established");
        }

        const courseService = new CourseService(DbConnProvider.getDbConn());
        const edgarService = new EdgarService(DbConnProvider.getDbConn());

        const jobService = new JobService(
            DbConnProvider.getDbConn(),
            EDGAR_STATPROC_QUEUE_NAME,
            PgBossProvider.instance,
        );

        const statisticsService = new StatisticsService(DbConnProvider.getDbConn());

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

        const jobController: AbstractController = new JobController(jobService);
        const statisticsController: AbstractController = new StatisticsController(statisticsService);
        const edgarController: AbstractController = new EdgarController(
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

        const exerDefController: AbstractController = new ExerciseDefinitionController(exerciseDefinitionService);

        return [
            jobController,
            statisticsController,
            edgarController,
            adaptiveExercisesController,
            exerDefController,
        ];
    }

    public static async main(args: string[]): Promise<void> {
        DbConnProvider.setDbConn(await DatabaseConnection.fromConfigFile("./database-config.json"));

        const controllers = await Main.prepareControllers();

        Main.server = ExpressServer.initialize();
        Main.server.useJsonBodyParsing();

        for (const controller of controllers) {
            controller.applyController(Main.server);
        }

        const serverConfig: ServerConfig = (!existsSync("./server-config.json")) ?
            Main.DEFAULT_SERVER_CONFIG :
            JSON.parse(await readFile("./server-config.json", { encoding: "utf-8" }));
        if (serverConfig === Main.DEFAULT_SERVER_CONFIG) {
            console.log(
                "[WARN]: No configuration file found. Using the default server config: ", Main.DEFAULT_SERVER_CONFIG
            );
        }

        Main.server
            .start(
                serverConfig.address,
                serverConfig.port,
                () => {
                    console.log(`Express HTTP server started @${serverConfig.address}:${serverConfig.port}`);
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
