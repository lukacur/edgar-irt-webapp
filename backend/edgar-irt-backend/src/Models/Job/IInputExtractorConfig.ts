import { IImportInfo } from "./IImportInfo.js";

export interface IInputExtractorConfig<TConfigContent extends object> {
    type: string;
    importInfo?: IImportInfo;

    configContent: TConfigContent;
}
