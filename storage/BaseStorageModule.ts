import { IStorageModule } from "./IStorageModule";
import { DepartFile } from '../lib/models';

export abstract class BaseStorageModule<SetupType, ResultType> implements IStorageModule<SetupType, ResultType> {
    constructor(protected storageCfg: SetupType = {} as SetupType) { }

    abstract handleFile(stream: NodeJS.ReadableStream, file: DepartFile, storageSetup?: SetupType): Promise<ResultType>;
    abstract removeFile(storageResult: ResultType): Promise<void>;

    rejectCallbackError(reject: (reason?: any) => void) {
        return (...args: any[]) => { if (args && args.length && args[0]) reject(args[0]) };
    }

    async coalesce(resolvers: any[], params: any[] = [], errorIfUndefined?: string): Promise<any> {
        try {
            for (let x = 0; x < resolvers.length; x++) {
                const resolver = resolvers[x];
                if (typeof resolver === 'undefined' || resolver === null) continue;
                if (typeof resolver === 'function') return await resolver(...params);
                else return resolver;
            }
        } catch (err) {
            throw `Failed to coalesce: ${err}`;
        }
        if (errorIfUndefined) throw errorIfUndefined;
        else return undefined;
    }

    coalesceSync(resolvers: any[], params: any[] = [], errorIfUndefined?: string): any {
        try {
            for (let x = 0; x < resolvers.length; x++) {
                const resolver = resolvers[x];
                if (typeof resolver === 'undefined' || resolver === null) continue;
                if (typeof resolver === 'function') return resolver(...params);
                else return resolver;
            }
        } catch (err) {
            throw `Failed to coalesce: ${err}`;
        }
        if (errorIfUndefined) throw errorIfUndefined;
        else return undefined;
    }
}