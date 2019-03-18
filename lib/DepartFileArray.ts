import { DepartFile, DepartError, DepartErrorCodes } from './models';
import { strict } from 'assert';

export class DepartFileArray extends Array<DepartFile> {
  remove(file: DepartFile) {
    const index = this.findIndex(thisFile => thisFile.originalName === file.originalName);
    if (index < 0) throw new DepartError(DepartErrorCodes.LIMIT_UNEXPECTED_FILE, file.originalName);
    this.splice(index, 1);
  }

  in(fieldName: string) {
    return this.filter(file => file.fieldName === fieldName);
  }

  byField() {
    const result: {
      [fieldName: string]: DepartFile[]
    } = {};
    this.forEach(file => {
      if (!result[file.fieldName]) result[file.fieldName] = new Array<DepartFile>();
      result[file.fieldName].push(file);
    });
    return result;
  }
}