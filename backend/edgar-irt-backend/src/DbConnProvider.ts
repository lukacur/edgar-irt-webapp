import { DatabaseConnection } from "./Database/DatabaseConnection.js";

export class DbConnProvider {
    private static dbConn: DatabaseConnection | null = null;

    public static getDbConn(): DatabaseConnection {
        if (DbConnProvider.dbConn === null) {
            throw new Error("Connection not set up yet");
        }

        return DbConnProvider.dbConn;
    }

    public static setDbConn(dbConn: DatabaseConnection): void {
        if (DbConnProvider.dbConn !== null) {
            throw new Error("Database connection already set");
        }

        DbConnProvider.dbConn = dbConn;
    }

    public static async closeConnection(): Promise<void> {
        await DbConnProvider.dbConn?.close();
        DbConnProvider.dbConn = null;
    }
}
