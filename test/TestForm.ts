var stream = require('stream')
var onFinished = require('on-finished')
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import { DepartRequestProcessor } from '../lib/DepartRequestProcessor';
import { DepartFormData } from '../lib/DepartFormData';
import { DepartConfig } from '../lib/models';

export class TestForm {
    constructor(private _cfg: DepartConfig | DepartRequestProcessor = {}) {
        if (typeof _cfg === 'object') this.depart = new DepartRequestProcessor(_cfg as DepartConfig);
        else this.depart = _cfg;
    }

    depart: DepartRequestProcessor;

    private _form = new FormData();

    append(fieldName: string, value: any, options?: FormData.AppendOptions) {
        this._form.append(fieldName, value, options);
    }

    file(name) {
        return fs.createReadStream(path.join(__dirname, 'files', name))
    }

    fileSize(path) {
        return fs.statSync(path).size
    }

    async submit(): Promise<DepartFormData> {
        return new Promise((resolve, reject) => {
            this._form.getLength(async (err, length) => {
                if (err) reject(err);

                const req = new stream.PassThrough()

                req.complete = false
                this._form.once('end', () => {
                    req.complete = true
                });

                this._form.pipe(req)
                req.headers = {
                    'content-type': 'multipart/form-data; boundary=' + this._form.getBoundary(),
                    'content-length': length
                }

                let result: DepartFormData;
                try {
                    result = await this.depart.parse(req);
                } catch (err) {
                    return onFinished(req, () => { reject(err) });
                }
                return onFinished(req, () => { resolve(result) });
            })
        })
    }
}