type ImportInfo = {
    url: string;
};

type BlockingConfig = {
    awaitDataExtraction: boolean;
    workInBackground: boolean;
    persistResultInBackground: boolean;
};

type InputExtractorConfig<TConfigContent extends object> = {
    type: string;
    importInfo?: ImportInfo;

    configContent: TConfigContent;
};

type JobStepDescriptor = {
    type: string;
    importInfo?: ImportInfo;

    stepTimeoutMs: number;
    resultTTL?: number;
    configContent: object;

    isCritical: boolean;
};

type JobWorkerConfig = {
    type: string;
    importInfo?: ImportInfo;

    databaseConnection: string;
    steps: JobStepDescriptor[];
};

type DataPersistorConfig<TConfigContent extends object> = {
    type: string;
    importInfo?: ImportInfo;

    persistanceTimeoutMs: number;
    configContent: TConfigContent;
};

export interface IJobConfiguration {
    readonly jobId: string;
    readonly jobTypeAbbrevation: string;
    readonly jobName: string;
    readonly idUserStarted: number | null;
    readonly jobQueue: string | null;
    readonly jobTimeoutMs: number;
    readonly periodical: boolean;

    readonly blockingConfig: BlockingConfig;

    readonly inputExtractorConfig: InputExtractorConfig<object>;

    readonly jobWorkerConfig: JobWorkerConfig;

    readonly dataPersistorConfig: DataPersistorConfig<object>;
}
