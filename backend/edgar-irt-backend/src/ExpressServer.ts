import bodyParser from "body-parser";
import cors from "cors";
import express, { NextFunction, Request, RequestHandler, Response } from "express";
import { Express } from 'express-serve-static-core';
import { Server } from "http";

export class ExpressServer {
    private serverInstance: Server | null = null;

    private constructor(
        private readonly expressApp: Express,
    ) {}

    public static initialize() {
        return new ExpressServer(express().use(cors()));
    }

    public addEndpoint(method: "GET" | "POST" | "PUT" | "DELETE", endpoint: string, ...handlers: RequestHandler[]): ExpressServer {
        console.log(`Adding endpoint: [${method}] ${endpoint}`);
        switch (method) {
            case "GET": {
                this.expressApp.get(endpoint, ...handlers);
                break;
            }

            case "POST": {
                this.expressApp.post(endpoint, ...handlers);
                break;
            }

            case "PUT": {
                this.expressApp.put(endpoint, ...handlers);
                break;
            }

            case "DELETE": {
                this.expressApp.delete(endpoint, ...handlers);
                break;
            }

            default: {
                throw new Error(`Unsupported method ${method}`);
            }
        }

        return this;
    }

    public useJsonBodyParsing(): ExpressServer {
        this.expressApp.use(bodyParser.json({ type: "application/json" }));
        return this;
    }

    public addMiddleware(...middleware: RequestHandler[]): ExpressServer {
        this.expressApp.use(...middleware);
        return this;
    }

    public start(hostname: string = "localhost", port: number = 8970, listenStartCallback: () => void): void {
        if (this.serverInstance !== null) {
            throw new Error("Server already started");
        }

        this.serverInstance = this.expressApp.listen(
            port,
            hostname,
            listenStartCallback,
        );
    }

    public shutdown(onStopCallback?: (error?: Error) => void): void {
        if (this.serverInstance === null) {
            throw new Error("Server not running or was already closed");
        }

        this.serverInstance?.close(onStopCallback);
    }
}
