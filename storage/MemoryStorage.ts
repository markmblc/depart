import { IStorageModule } from "./IStorageModule";
const concat = require('concat-stream');

export interface MemoryStorageResult {
  size: number;
  buffer: Buffer;
}

export class MemoryStorage implements IStorageModule<null, MemoryStorageResult> {
  handleFile(stream: NodeJS.ReadableStream) {
    return new Promise<MemoryStorageResult>((resolve, reject) => {
      stream.pipe(concat({
        encoding: 'buffer'
      }, data => {
        const fileInfo: MemoryStorageResult = {
          buffer: data,
          size: data.length
        };
        return resolve(fileInfo);
      }));
    });
  }

  removeFile(file: MemoryStorageResult) {
    delete file.buffer
    return Promise.resolve();
  }
}
