import { promises as fs, createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { sync } from 'mkdirp';
import { IStorageModule } from './IStorageModule';
import { DepartFile, DepartError } from '../lib/models';

export interface DiskStorageConfig {
  fileName?: (file: DepartFile) => string | string;
  destination?: string;
}

interface DiskStorageInfo {
  destination: string;
  fileName: string;
  path: string;
  size: number;
}

export class DiskStorage implements IStorageModule<DiskStorageInfo> {
  constructor(private opts: DiskStorageConfig) {
    if (typeof opts.destination === 'string') sync(opts.destination);
    else opts.destination = tmpdir();
  }

  async handleFile(stream: NodeJS.ReadableStream, file: DepartFile): Promise<DiskStorageInfo> {
    if (!this.opts.destination) throw 'Invalid destination';

    let fileName: string;
    try {
      if (this.opts.fileName) {
        if (typeof this.opts.fileName === 'function') fileName = this.opts.fileName(file);
        else fileName = this.opts.fileName;
      } else fileName = await this._generateFilename();
    } catch (err) {
      throw `Generate fileName: ${err}`;
    }

    var finalPath = join(this.opts.destination, fileName);
    var outStream = createWriteStream(finalPath);

    stream.pipe(outStream);

    return new Promise((resolve, reject) => {
      let error: DepartError;
      outStream.on('error', (err) => error = new DepartError(err.message));
      outStream.on('finish', () => {
        const expandedFile: DiskStorageInfo = {
          destination: this.opts.destination,
          fileName: fileName,
          path: finalPath,
          size: outStream.bytesWritten
        };
        if (error) return reject(error);
        resolve(expandedFile);
      });
    });
  }

  removeFile(file: any) {
    var path = file.path;

    delete file.destination;
    delete file.fileName;
    delete file.path;

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
