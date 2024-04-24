import { IImportInfo } from "./IImportInfo.js";

export interface IJobStepDescriptor {
    type: string;
    importInfo?: IImportInfo;

    stepTimeoutMs: number;
    resultTTL?: number;
    configContent: object;

    isCritical: boolean;
}
