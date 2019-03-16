import { IStorageModule } from "./IStorageModule";
import { DepartFile } from "../lib/models";
const concat = require('concat-stream');


export interface MemoryStorageInfo {
  size: number;
  buffer: Buffer;
}


export class MemoryStorage implements IStorageModule<MemoryStorageInfo> {
  handleFile(stream: NodeJS.ReadableStream, file: DepartFile) {
    return new Promise<MemoryStorageInfo>((resolve, reject) => {
      stream.pipe(concat({
        encoding: 'buffer'
      }, data => {
        const fileInfo: MemoryStorageInfo = {
          buffer: data,
          size: data.length
        };
        return resolve(fileInfo);
      }));
    });
  }

  removeFile(file: MemoryStorageInfo) {
    delete file.buffer
    return Promise.resolve();
  }
}
