import { DepartFile, DepartError, DepartErrorCodes } from './models';

export class DepartFileArray extends Array<DepartFile> {
  remove(file: DepartFile) {
    const index = this.findIndex(thisFile => thisFile.originalName === file.originalName);
    if (index < 0) throw new DepartError(DepartErrorCodes.LIMIT_UNEXPECTED_FILE, file.originalName);
    this.splice(index, 1);
  }
}