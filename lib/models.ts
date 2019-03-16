import { Request as ExpressRequest } from 'express';
import { DepartFileArray } from './DepartFileCollection';
import { IStorageModule } from '../storage/IStorageModule';

export enum DepartFileStrategyEnum {
    None,
    Value,
    Array,
    Object,
}

export enum DepartTransferStatusEnum {
    Idle,
    ParsingFiles,
    ParsingFilesComplete,
    TransferingFile,
    TransferComplete,
    StoringFile,
    StorageComplete,
    Finished,
    Error
}

export class DepartFile {
    fieldName: string;
    originalName?: string;
    encoding?: string;
    mimeType?: string;
    storage?: any | any[];
}


export interface DepartConfig {
    fileFields?: string[] | {
        [fieldName: string]: number
    }

    storage?: IStorageModule<any> | IStorageModule<any>[];

    onFile?: (file: DepartFile, fieldFiles: DepartFileArray, req: ExpressRequest) => boolean;

    limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
    };
    preservePaths?: boolean;
}

export enum DepartErrorCodes {
    'INTERNAL_ERROR',
    'LIMIT_PART_COUNT',
    'LIMIT_FILE_SIZE',
    'LIMIT_FILE_COUNT',
    'LIMIT_FIELD_KEY',
    'LIMIT_FIELD_VALUE',
    'LIMIT_FIELD_COUNT',
    'LIMIT_UNEXPECTED_FILE',
    'INVALID_CONFIGURATION',
    'INVALID_FORMDATA',
    'STORAGE_ERROR',
}

const errorMessages = {
    [DepartErrorCodes.INTERNAL_ERROR]: 'Unhandled exception',
    [DepartErrorCodes.LIMIT_PART_COUNT]: 'Too many parts',
    [DepartErrorCodes.LIMIT_FILE_SIZE]: 'File too large',
    [DepartErrorCodes.LIMIT_FILE_COUNT]: 'Too many files',
    [DepartErrorCodes.LIMIT_FIELD_KEY]: 'Field name too long',
    [DepartErrorCodes.LIMIT_FIELD_VALUE]: 'Field value too long',
    [DepartErrorCodes.LIMIT_FIELD_COUNT]: 'Too many fields',
    [DepartErrorCodes.LIMIT_UNEXPECTED_FILE]: 'Unexpected field',
    [DepartErrorCodes.INVALID_CONFIGURATION]: 'A required configuration property is missing or invalid',
    [DepartErrorCodes.INVALID_FORMDATA]: 'Invalid form or data',
    [DepartErrorCodes.STORAGE_ERROR]: 'Error during file storage'
}

export class DepartError extends Error {
    constructor(message: string);
    constructor(code: DepartErrorCodes, details?: string);
    constructor(codeOrMsg: string | DepartErrorCodes, details?: string) {
        super();
        if (typeof codeOrMsg === 'string') {
            details = codeOrMsg;
            codeOrMsg = DepartErrorCodes.INTERNAL_ERROR;
        }
        if (details) this.details = details;
        this.name = this.constructor.name;
        this.message = errorMessages[codeOrMsg];
        this.code = codeOrMsg;
    }

    details?: string;
    storageErrors?: Error[];
    code: DepartErrorCodes;

    toString() {
        let str = `${this.message}`;
        if (this.details) str = `${str}`;
    }
}