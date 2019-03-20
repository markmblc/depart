import { DepartFile } from '../lib/models';
export interface IStorageModule<SetupType = any, ResultType = any> {
    handleFile: (stream: NodeJS.ReadableStream, file?: DepartFile, storageSetup?: SetupType) => Promise<ResultType | Boolean>;
    removeFile: (storageResult: ResultType) => Promise<void>;
}