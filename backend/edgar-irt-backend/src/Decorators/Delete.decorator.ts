import { RequestHandler } from "express";
import { AbstractController } from "../Controlllers/AbstractController.js";
import { ExpressServer } from "../ExpressServer.js";

export function Delete(relativeEndpoint: string) {
    return <TTargetClass extends AbstractController, TDecoratedItem extends RequestHandler>(
        target: TTargetClass,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<TDecoratedItem>
    ) => {
        const handler: RequestHandler | null = descriptor.value ?? null;
        if (handler === null) {
            throw new Error("Invalid handler");
        }

        const oldApplyController = target.applyController;

        target.applyController = function (server: ExpressServer) {
            this.registerEndpoint("DELETE", { relativeEndpoint, handlers: [handler.bind(this)] });
            oldApplyController.bind(this)(server);
        };
    }
}
