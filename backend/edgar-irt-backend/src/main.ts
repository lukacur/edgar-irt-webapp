import { AbstractController } from "./Controlllers/AbstractController.js";
import { EdgarController } from "./Controlllers/EdgarController.js";
import { JobController } from "./Controlllers/JobController.js";
import { StatisticsController } from "./Controlllers/StatisticsController.js";
import { DatabaseConnection } from "./Database/DatabaseConnection.js";
import { DbConnProvider } from "./DbConnProvider.js";
import { ExpressServer } from "./ExpressServer.js";
import { PgBossProvider } from "./PgBossProvider.js";

const EDGAR_STATPROC_QUEUE_NAME = "edgar-irt-work-request-queue";

export class Main {
    private static server: ExpressServer;

    public static async main(args: string[]): Promise<void> {
        Main.server = ExpressServer.initialize();
        DbConnProvider.setDbConn(await DatabaseConnection.fromConfigFile("./database-config.json"));

        Main.server.useJsonBodyParsing();

        const jobController: AbstractController = new JobController(
            DbConnProvider.getDbConn(),
            EDGAR_STATPROC_QUEUE_NAME,
            PgBossProvider.instance
        );
        const statisticsController: AbstractController = new StatisticsController(DbConnProvider.getDbConn());
        const edgarController: EdgarController = new EdgarController(DbConnProvider.getDbConn());

        jobController.applyController(Main.server);
        statisticsController.applyController(Main.server);
        edgarController.applyController(Main.server);
        
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
