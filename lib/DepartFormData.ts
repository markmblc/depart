import { DepartFile, DepartStoredFile } from './models';
import { DepartFileArray } from './DepartFileArray';

import * as appendField from 'append-field';


// These classes only serve to add functionality to the formData returned.
export class DepartFormDataManager {
  private _fields = {};

  files = new DepartFileArray();

  get fields() {
    return this._fields;
  }

  field(fieldName: string, value: string) {
    appendField(this._fields, fieldName, value);
  }

  seal<Schema extends DepartFormDataSchema>(): DepartFormData<Schema> {
    return {
      fields: this._fields,
      files: this.files.byField()
    } as any;
  }
}

// Test
export type DepartFormData<Schema = DepartFormDataSchema> = Readonly<SchemaProperties<Schema>>;

export type SchemaKeys<T> = { readonly [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type SchemaProperties<T> = Pick<T, SchemaKeys<T>>;

export type DepartFormDataSchema = {
  fields?: {
    [key: string]: string;
  },
  files?: {
    [key: string]: DepartStoredFile[];
  }
};

