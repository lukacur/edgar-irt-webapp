import { IImportInfo } from "./IImportInfo.js";

export interface IDataPersistorConfig<TConfigContent extends object> {
    type: string;
    importInfo?: IImportInfo;

    persistanceTimeoutMs: number;
    configContent: TConfigContent;
}
