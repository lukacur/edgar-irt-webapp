import PgBoss from "pg-boss";

export class PgBossProvider {
    public static instance: PgBossProvider = new PgBossProvider();

    private pgBoss: PgBoss;
    private startedProm: Promise<void> | null = null;

    private constructor() {
        this.pgBoss = new PgBoss("postgres://postgres:bazepodataka@127.0.0.1:5433/boss_test");
        this.startedProm = this.pgBoss.start()
            .then(b => { this.pgBoss = b; this.startedProm = null; });
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
}
