import { IBlockingConfig } from "./IBlockingConfig.js";
import { IDataPersistorConfig } from "./IDataPersistorConfig.js";
import { IInputExtractorConfig } from "./IInputExtractorConfig.js";
import { IJobWorkerConfig } from "./IJobWorkerConfig.js";

export interface IJobConfiguration {
    readonly jobId: string;
    readonly jobTypeAbbrevation: string;
    readonly jobName: string;
    readonly idUserStarted: number | null;
    readonly jobQueue: string | null;
    readonly jobTimeoutMs: number;
    readonly periodical: boolean;

    readonly blockingConfig: IBlockingConfig;

    readonly inputExtractorConfig: IInputExtractorConfig<object>;

    readonly jobWorkerConfig: IJobWorkerConfig;

    readonly dataPersistorConfig: IDataPersistorConfig<object>;
}
