import { Request } from 'express';
import { DepartFile } from "../lib/models";
import { DepartFileArray } from "../lib/DepartFileCollection";

export interface IStorageModule<T> {
    handleFile: (stream: NodeJS.ReadableStream, fileInfo: DepartFile, fieldFiles: DepartFileArray, req: Request) => Promise<T>;
    removeFile: (storageInfo: T, fieldFiles: DepartFileArray, req: Request) => Promise<void>;
}