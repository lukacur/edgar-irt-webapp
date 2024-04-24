import { IImportInfo } from "./IImportInfo.js";
import { IJobStepDescriptor } from "./IJobStepDescriptor.js";

export interface IJobWorkerConfig {
    type: string;
    importInfo?: IImportInfo;

    databaseConnection: string;
    steps: IJobStepDescriptor[];
}
