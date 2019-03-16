import { DepartFile } from './models';
import { DepartFileArray } from './DepartFileCollection';

import * as appendField from 'append-field';


// These classes only serve to add functionality to the formData returned.
export class DepartFormDataManager {
  private _fields = {};
  private _files = new DepartFileArray();

  get fields() {
    return Object.assign({}, this._fields);
  }

  get files() {
    return this._files.slice(0);
  }

  field(fieldName: string, value: string) {
    appendField(this._fields, fieldName, value);
  }

  file(file: DepartFile) {
    if (!this._fields[file.fieldName]) this._fields[file.fieldName] = new DepartFileArray();
    const collection = this._fields[file.fieldName] as DepartFileArray;
    collection.push(file);
    this._files.push(file);
    return collection.length;
  }

  removeFile(file: DepartFile) {
    if (this._fields[file.fieldName]) this._fields[file.fieldName].remove(file);
    this._files.remove(file);
  }

  seal<Schema>(): DepartFormData<Schema> {
    return {
      fields: this._fields,
      files: this._files
    } as any;
  }
}

// Test
export type DepartFormData<Schema = any> = {
  fields: Readonly<SchemaProperties<Schema>>,
  files?: DepartFileArray
}
export type SchemaKeys<T> = { readonly [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type SchemaProperties<T> = Pick<T, SchemaKeys<T>>;

export type DepartFormDataSchema = {
  [key: string]: string | DepartFile | DepartFileArray;
};

