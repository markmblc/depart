import * as Busboy from 'busboy';
import { Request } from 'express';
import { DepartError, DepartErrorCodes, DepartFile, DepartConfig } from './models';
import { Counter } from './Counter';
import { DepartFormDataManager, DepartFormData } from './DepartFormData';
import { DepartFileArray } from './DepartFileCollection';
import { MemoryStorage } from '../storage/MemoryStorage';

const StreamClone = require('readable-stream-clone');
const onFinished = require('on-finished');
const is = require('type-is');

export class DepartRequestProcessor {
  constructor(public options = {} as DepartConfig) {
    if (typeof options.storage === 'undefined') options.storage = new MemoryStorage();
  }

  request: Request;

  private formData = new DepartFormDataManager();
  private pendingWrites = new Counter();
  private uploadedFiles = new Array<DepartFile>();
  private writeStream: NodeJS.WritableStream;

  async parse<Schema = any>(request: Request): Promise<DepartFormData<Schema>> {
    if (!is(request, ['multipart'])) {
      throw new DepartError(DepartErrorCodes.INVALID_FORMDATA, 'Attempt to process a non-multipart form');
    }

    return new Promise(async (resolve, reject) => {
      this.request = request;

      this.writeStream = new Busboy({
        headers: request.headers,
        limits: this.options.limits,
        preservePath: this.options.preservePaths
      });

      this.request.pipe(this.writeStream);

      let error: DepartError;
      try {
        await this.parseForm();
      } catch (err) {
        error = err;
      }

      this.request.unpipe(this.writeStream);
      this.request.on('readable', this.request.read.bind(this.request));
      this.writeStream.removeAllListeners();

      if (error) onFinished(request, () => reject(error));
      const final = this.formData.seal<Schema>();
      onFinished(request, () => resolve(final));
    });
  }

  private async parseForm() {
    return new Promise((resolve, reject) => {
      let readsComplete = false;
      let error: DepartError;

      const setError = (err) => {
        if (error) return;
        error = err;

        if (!this.options.storage) return reject(err);

        this.pendingWrites.onceZero(async () => {
          let errors = [err];
          try {
            const storageErrors = await this.removeUploadedFiles(this.uploadedFiles);
            errors.concat(storageErrors);
          } catch (storageErr) {
            errors.push(storageErr);
          }
          if (errors.length === 1) reject(errors[0]);
          else reject(new DepartError(errors.map(error => error.message).reduce((prevVal, error) => `${prevVal}, ${error}`)));
        });
      }

      const checkStatus = () => {
        if (readsComplete && this.pendingWrites.isZero && !error) resolve();
      }

      this.writeStream.on('partsLimit', () => setError(new DepartError(DepartErrorCodes.LIMIT_PART_COUNT)));
      this.writeStream.on('filesLimit', () => setError(new DepartError(DepartErrorCodes.LIMIT_FILE_COUNT)));
      this.writeStream.on('fieldsLimit', () => setError(new DepartError(DepartErrorCodes.LIMIT_FIELD_COUNT)));
      this.writeStream.on('error', setError);

      this.writeStream.on('field', async (...args: any[]) => {
        try {
          await this._handleField.apply(this, args);
        } catch (err) {
          setError(err);
        }
      });

      this.writeStream.on('file', async (...args: any[]) => {
        try {
          await this._handleFile.apply(this, args);
        } catch (err) {
          setError(err);
        }
        checkStatus();
      });

      this.writeStream.on('finish', () => {
        readsComplete = true;
        checkStatus();
      })
    })
  }

  private async _handleField(fieldName: string, value: string, fieldNameTruncated: boolean, valueTruncated: boolean) {
    if (fieldNameTruncated) throw new DepartError(DepartErrorCodes.LIMIT_FIELD_KEY);
    if (valueTruncated) throw new DepartError(DepartErrorCodes.LIMIT_FIELD_VALUE, fieldName);
    if (!this._validateFieldName(fieldName)) throw new DepartError(DepartErrorCodes.LIMIT_FIELD_KEY);

    this.formData.field(fieldName, value);
  }

  private async _handleFile(fieldName: string, fileStream: NodeJS.ReadableStream, fileName: string, encoding: string, mimeType: string) {
    if (!fileName) return fileStream.resume()
    if (!this._validateFieldName(fieldName)) throw new DepartError(DepartErrorCodes.LIMIT_FIELD_KEY);

    const file = <DepartFile>{
      fieldName: fieldName,
      originalName: fileName,
      encoding: encoding,
      mimeType: mimeType,
    };

    const fieldFiles = this.formData.fields[fieldName] && Array.isArray(this.formData.fields[fieldName]) ? this.formData.fields[fieldName] : new DepartFileArray();

    const fileValid = this._validateFileLimits(file, fieldFiles);
    if (!fileValid) throw new DepartError(DepartErrorCodes.LIMIT_UNEXPECTED_FILE, file.fieldName);

    this.formData.file(file);

    let error: DepartError;

    fileStream.on('error', (err) => {
      error = new DepartError(err.message);
    });

    fileStream.on('limit', () => {
      this.uploadedFiles.push(file); // A truncated file still exists.
      error = new DepartError(DepartErrorCodes.LIMIT_FILE_SIZE, file.fieldName);
    });

    if (this.options.onFile) {
      try {
        const result = await this.options.onFile(file, fieldFiles, this.request);
        if (!result) {
          this.formData.removeFile(file);
          return fileStream.resume();
        }
      } catch (err) {
        error = err;
      }
    }

    if (!this.options.storage) {
      return fileStream.emit('end');
    }

    this.pendingWrites.increment();

    try {
      if (Array.isArray(this.options.storage)) {
        file.storage = await Promise.all(this.options.storage.map(async handler => await handler.handleFile(new StreamClone(fileStream), file, fieldFiles, this.request)));
      } else {
        file.storage = await this.options.storage.handleFile(fileStream, file, fieldFiles, this.request);
      }
    } catch (err) {
      error = err;
    }

    this.pendingWrites.decrement();

    if (error) {
      this.formData.removeFile(file);
      throw error;
    }
    this.uploadedFiles.push(file);
  }

  private async removeUploadedFiles(uploadedFiles: DepartFile[]) {
    var length = uploadedFiles.length;
    var errors = new Array<DepartError>();

    if (length === 0) return;

    await Promise.all(uploadedFiles.map(async file => {
      try {
        if (Array.isArray(this.options.storage)) {
          if (!Array.isArray(file.storage)) throw new DepartError(DepartErrorCodes.STORAGE_ERROR, 'File storage details should be an array');

          const calls = new Array<Promise<void>>();
          for (let x = 0; x < this.options.storage.length; x++) {
            const storage = this.options.storage[x];
            const fileStorageInfo = file.storage[x];
            calls.push(storage.removeFile(fileStorageInfo, uploadedFiles as DepartFileArray, this.request));
          }
          await Promise.all(calls);
        } else {
          await this.options.storage.removeFile(file.storage, uploadedFiles as DepartFileArray, this.request);
        }
      } catch (storageErr) {
        const err = new DepartError(DepartErrorCodes.STORAGE_ERROR, `${file.fieldName}.${file.originalName}: ${storageErr.message}`);
        errors.push(err);
      }
    }));
    return errors;
  }

  private _validateFileLimits(file: DepartFile, fieldFiles: DepartFileArray) {
    let fieldMaxfileCount = -1;
    if (this.options.fileFields) {
      if (Array.isArray(this.options.fileFields) && !this.options.fileFields.find(thisFieldName => thisFieldName === file.fieldName)) return false;
      else if (!Array.isArray(this.options.fileFields)) {
        fieldMaxfileCount = this.options.fileFields[file.fieldName];
        if (typeof fieldMaxfileCount === 'undefined') return false;
        if (fieldFiles.length >= fieldMaxfileCount) return false;
      }
    }
    return true;
  }

  private _validateFieldName(fieldName: string) {
    if (this.options.limits && this.options.limits.fieldNameSize && fieldName.length > this.options.limits.fieldNameSize) return false;
    return true;
  }
}