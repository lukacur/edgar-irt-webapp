import { RequestHandler } from "express";
import { ExpressServer } from "../ExpressServer.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ControllerEndpoint = { relativeEndpoint: string, handlers: RequestHandler[] };

export abstract class AbstractController {
    private readonly controllerActionMap: Map<HttpMethod, ControllerEndpoint[]> = new Map();

    constructor(
        private readonly basePath: string,
    ) {}

    private buildEndpoint(relativeEndpoint: string): string {
        const baseEndpoint = ((this.basePath.startsWith("/") || this.basePath === "") ? "" : "/") + this.basePath;
        const endpoint = ((relativeEndpoint.startsWith("/") || relativeEndpoint === "") ? "" : "/") + relativeEndpoint;

        return `${baseEndpoint}${endpoint}`;
    }

    public applyController(server: ExpressServer) {
        for (const methodEntry of this.controllerActionMap.entries()) {
            const method = methodEntry[0];

            for (const endpointEntry of methodEntry[1]) {
                const endpoint = this.buildEndpoint(endpointEntry.relativeEndpoint);
    
                server.addEndpoint(method, endpoint, ...(endpointEntry.handlers));
            }
        }
    }

    public registerEndpoint(method: HttpMethod, endpoint: ControllerEndpoint) {
        if (!this.controllerActionMap.has(method)) {
            this.controllerActionMap.set(method, []);
        }

        this.controllerActionMap.get(method)!.push(endpoint);
    }
}
