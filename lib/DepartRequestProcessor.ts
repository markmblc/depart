import * as Busboy from 'busboy';
import { Request } from 'express';
import { DepartError, DepartErrorCodes, DepartFile, DepartConfig, DepartStoredFile } from './models';
import { Counter } from './Counter';
import { DepartFormDataManager, DepartFormData } from './DepartFormData';
import { MemoryStorage, MemoryStorageResult } from '../storage/MemoryStorage';

const StreamClone = require('readable-stream-clone');
const onFinished = require('on-finished');
const is = require('type-is');

export class DepartRequestProcessor {
  constructor(public options: DepartConfig = {} as DepartConfig) {
    if (typeof options.storage === 'undefined') (options.storage as any) = new MemoryStorage();
  }

  request: Request;

  private formData = new DepartFormDataManager();
  private pendingWrites = new Counter();
  private uploadedFiles = new Array<DepartStoredFile>();
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

    const storedFile = Object.assign({}, file) as DepartStoredFile;

    const fieldFiles = this.formData.files.in(fieldName);

    const fileValid = this._validateFileLimits(file, fieldFiles);
    if (!fileValid) {
      throw new DepartError(DepartErrorCodes.LIMIT_UNEXPECTED_FILE, file.fieldName);
    }

    this.formData.files.push(storedFile);

    let error: DepartError;

    fileStream.on('error', (err) => {
      error = new DepartError(err.message);
    });

    fileStream.on('limit', () => {
      this.uploadedFiles.push(storedFile); // A truncated file still exists.
      error = new DepartError(DepartErrorCodes.LIMIT_FILE_SIZE, file.fieldName);
    });

    let storageSetup: any;
    if (this.options.onFile) {
      try {
        storageSetup = await this.options.onFile(file);
        if (!storageSetup) {
          this.formData.files.remove(file);
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

    let storageResult: any;
    try {
      if (Array.isArray(this.options.storage)) {
        const calls = new Array<Promise<any>>();
        for (let x = 0; x < this.options.storage.length; x++) {
          const storage = this.options.storage[x];
          if (!storageSetup) {
            calls.push(storage.handleFile(new StreamClone(fileStream), file));
            continue;
          }

          let fileStorageInfo = storageSetup;
          if (Array.isArray(storageSetup)) {
            if (storageSetup.length !== this.options.storage.length) throw new DepartError(DepartErrorCodes.STORAGE_ERROR, `Return value of onFile should be an array with same length as number of storage modules (${this.options.storage.length})`);
            fileStorageInfo = storageSetup[x];
          }

          if (typeof fileStorageInfo === 'boolean' && fileStorageInfo === false) calls.push(Promise.resolve(false as any));
          else calls.push(storage.handleFile(new StreamClone(fileStream), file, fileStorageInfo));
        }
        storageResult = await Promise.all(calls);
      } else {
        storageResult = await this.options.storage.handleFile(fileStream, file, storageSetup);
      }
    } catch (err) {
      error = err;
    }

    this.pendingWrites.decrement();

    storedFile.storage = {
      setup: storageSetup,
      result: storageResult
    };

    if (this.options.onFileStored) {
      try {
        await this.options.onFileStored(storedFile);
      } catch (err) {
        this.uploadedFiles.push(storedFile);
        error = err;
      }
    }

    if (error) {
      this.formData.files.remove(file);
      throw error;
    }

    this.uploadedFiles.push(storedFile);

  }

  private async removeUploadedFiles(uploadedFiles: DepartStoredFile[]) {
    var length = uploadedFiles.length;
    var errors = new Array<DepartError>();

    if (length === 0) return;

    await Promise.all(uploadedFiles.map(async file => {
      try {
        if (Array.isArray(this.options.storage)) {
          const calls = new Array<Promise<void>>();
          for (let x = 0; x < this.options.storage.length; x++) {
            const storage = this.options.storage[x];
            const storageResult = file.storage.result;

            let fileStorageInfo = storageResult;
            if (Array.isArray(storageResult)) {
              if (storageResult.length !== this.options.storage.length) throw new DepartError(DepartErrorCodes.STORAGE_ERROR, `Return value of onFile should be an array with same length as number of storage modules (${this.options.storage.length})`);
              fileStorageInfo = storageResult[x];
            }

            if (typeof fileStorageInfo === 'boolean' && fileStorageInfo === false) calls.push(Promise.resolve());
            else calls.push(storage.removeFile(fileStorageInfo));
          }
          await Promise.all(calls);
        } else {
          if (typeof file.storage.result !== 'boolean' || file.storage.result !== false)
            await this.options.storage.removeFile(file.storage.result);
        }
      } catch (storageErr) {
        const err = new DepartError(DepartErrorCodes.STORAGE_ERROR, `${file.fieldName}.${file.originalName}: ${storageErr.message}`);
        errors.push(err);
      }
    }));
    return errors;
  }

  private _validateFileLimits(file: DepartFile, fieldFiles: DepartFile[]) {
    if (this.options.fileFields) {
      if (Array.isArray(this.options.fileFields) && !this.options.fileFields.find(thisFieldName => thisFieldName === file.fieldName)) return false;
      else if (!Array.isArray(this.options.fileFields)) {
        const fieldOpts = this.options.fileFields[file.fieldName];
        if (typeof fieldOpts === 'undefined') return false;
        else {
          if (typeof fieldOpts.maxFiles !== 'undefined' && fieldOpts.maxFiles >= 0 && fieldFiles.length >= fieldOpts.maxFiles) return false;
          if (typeof fieldOpts.requireUniqueOriginalName !== 'undefined') {
            const existingFile = fieldFiles.find(thisFile => thisFile.originalName === file.originalName);
            if (existingFile) throw new DepartError(DepartErrorCodes.LIMIT_UNEXPECTED_FILE, file.originalName + ' is a duplicate.');
          }
        }
      }
    }
    return true;
  }

  private _validateFieldName(fieldName: string) {
    if (this.options.limits && this.options.limits.fieldNameSize && fieldName.length > this.options.limits.fieldNameSize) return false;
    return true;
  }
}