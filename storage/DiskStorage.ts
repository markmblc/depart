import { promises as fs, createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { sync } from 'mkdirp';
import { DepartFile, DepartError } from '../lib/models';
import { IStorageModule } from './IStorageModule';
import { coalesce } from 'async-coalesce';

export interface DiskStorageSetup {
  fileName?: string | ((file: DepartFile, storageSetup: DiskStorageSetup) => Promise<string>);
  destination?: string | ((file: DepartFile, storageSetup: DiskStorageSetup) => Promise<string>);
}

export interface DiskStorageResult extends DiskStorageSetup {
  path: string;
  size: number;
}

export class DiskStorage implements IStorageModule<DiskStorageSetup, DiskStorageResult> {
  constructor(private storageCfg: DiskStorageSetup = {}) { }

  async handleFile(stream: NodeJS.ReadableStream, departFile: DepartFile, storageSetup?: DiskStorageSetup): Promise<DiskStorageResult> {
    if (!storageSetup) storageSetup = {};

    const destination = await coalesce([storageSetup.destination, this.storageCfg.destination, tmpdir], [departFile, storageSetup]);
    sync(destination);
    const fileName = await coalesce([storageSetup.fileName, this.storageCfg.fileName, this._generateFilename], [departFile, storageSetup]);

    var finalPath = join(destination, fileName);
    var outStream = createWriteStream(finalPath);

    stream.pipe(outStream);

    return new Promise((resolve, reject) => {
      let error: DepartError;
      outStream.on('error', (err) => error = new DepartError(err.message));
      outStream.on('finish', () => {
        const expandedFile: DiskStorageResult = {
          fileName: fileName,
          destination: destination,
          path: finalPath,
          size: outStream.bytesWritten
        };
        if (error) return reject(error);
        resolve(expandedFile);
      });
    });
  }

  removeFile(file: DiskStorageResult) {
    var path = file.path;

    fs.unlink(path);
    return Promise.resolve();
  }

  private _generateFilename() {
    return new Promise<string>((resolve, reject) => {
      randomBytes(16, function (err, raw) {
        if (err) return reject(err);
        resolve(raw.toString('hex'));
      })
    })
  }
}
