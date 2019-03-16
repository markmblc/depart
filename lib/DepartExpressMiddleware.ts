import { Request, Response, NextFunction } from 'express';
import { DepartConfig } from './models';
import { DepartRequestProcessor } from './DepartRequestProcessor';

export class DepartExpressMiddleware {
  constructor(private _cfg?: DepartConfig) {
    this.handleRequest = this.handleRequest.bind(this);
  }

  handleRequest(req: Request, res: Response, next: NextFunction) {
    const processor = new DepartRequestProcessor(this._cfg);

    processor.parse(req).then(
      formData => {
        (req as any).formData = formData;
        next();
      },
      next // Error passed to next handler
    )
  }
}