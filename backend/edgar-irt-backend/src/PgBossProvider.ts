import PgBoss from "pg-boss";
import { IDatabaseConfig } from "./Models/Config/DatabaseConfig.model.js";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

type PgBossConfiguration =
{
    queueName?: string,
} &
(
    {
        connectionString: string
    } |
    IDatabaseConfig
);

export class PgBossProvider {
    public static instance: PgBossProvider | null = null;

    private pgBoss: PgBoss;
    private startedProm: Promise<void> | null = null;
    private readonly defaultQueueName: string | null = null;

    private constructor(
        pgBossConfig: PgBossConfiguration,
    ) {
        if ("connectionString" in pgBossConfig) {
            this.pgBoss = new PgBoss(pgBossConfig.connectionString);
        } else {
            this.pgBoss = new PgBoss({
                host: pgBossConfig.host,
                port: pgBossConfig.port,
                database: pgBossConfig.database,

                user: pgBossConfig.user,
                password: pgBossConfig.password,
                schema: pgBossConfig.schema,
                //max: this.pgBossConnStringOrConfig.maxConnections,
                newJobCheckInterval: 20000,
            });
        }
        this.startedProm = this.pgBoss.start()
            .then(b => { this.pgBoss = b; this.startedProm = null; });

        this.defaultQueueName = pgBossConfig.queueName ?? null;
    }

    public static async configureInstance(config: PgBossConfiguration) {
        if (PgBossProvider.instance !== null) {
            throw new Error("Instance already configured");
        }

        PgBossProvider.instance = new PgBossProvider(config);

        if (PgBossProvider.instance.startedProm !== null) {
            await PgBossProvider.instance.startedProm;
        }
    }

    public static async configureInstanceFromFile(configFilePath: string) {
        if (PgBossProvider.instance !== null) {
            throw new Error("Instance already configured");
        }

        if (!existsSync(configFilePath)) {
            throw new Error(`File ${configFilePath} does not exist. Uable to configure PgBossProvider`);
        }

        PgBossProvider.instance = new PgBossProvider(
            JSON.parse(await readFile(configFilePath, { encoding: "utf-8" }))
        );

        if (PgBossProvider.instance.startedProm !== null) {
            await PgBossProvider.instance.startedProm;
        }
    }

    public async enqueue(queueName: string, data: object): Promise<boolean> {
        if (this.startedProm !== null) {
            await this.startedProm;
        }

        try {
            const result = await this.pgBoss.send(queueName, data);
            return result !== null;
        } catch (err) {
            console.log(err);
        }

        return false;
    }

    public async enqueueDefault(data: object): Promise<boolean> {
        if (this.defaultQueueName === null) {
            throw new Error("Default queue name was not specified");
        }

        return this.enqueue(this.defaultQueueName, data);
    }
}
