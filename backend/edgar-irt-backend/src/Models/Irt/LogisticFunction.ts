import { ILogisticFunctionParameters } from "./ILogisticFunctionParameters.js";

export class LogisticFunction {
    private constructor(
        private readonly params: ILogisticFunctionParameters,
        private readonly defaultOffsetConstant: number,
    ) {}

    private logisticFnCommon(theta: number) {
        return 1.0 /
            (1.0 +
                Math.pow(
                    Math.E,
                    -this.params.levelOfItemKnowledge *
                        this.defaultOffsetConstant *
                        (theta - this.params.itemDifficulty)
                )
            );
    }

    public fourParamLogisticFn(theta: number) {
        return this.params.itemGuessProbability +
            (
                (1 - this.params.itemMistakeProbability) - this.params.itemGuessProbability
            ) * this.logisticFnCommon(theta);
    }

    public static withParams(logFnParams: ILogisticFunctionParameters, defaultOffsetConstant: number = 1.0) {
        return new LogisticFunction(logFnParams, defaultOffsetConstant);
    }
}
