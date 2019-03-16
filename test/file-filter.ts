import { TestForm } from "./TestForm";
import { DepartError } from '../lib/models';

import 'mocha';
/* eslint-env mocha */

var assert = require('assert')

describe('File Filter', function () {
  it('should skip some files', async () => {
    const form = new TestForm({
      onFile: (file) => file.originalName === 'tiny1.dat'
    });

    form.append('notme', form.file('tiny0.dat'))
    form.append('butme', form.file('tiny1.dat'))

    const result = await form.submit();
    assert.equal(result.fields.notme.length, 0);
    assert.equal(result.fields.butme[0].originalName, 'tiny1.dat');
    assert.equal(result.fields.butme[0].storage.size, 7);
    assert.equal(result.fields.butme[0].storage.buffer.length, 7);

  })

  it('should report errors from onFile', async () => {
    const form = new TestForm({
      onFile: () => {
        throw new DepartError('Boom!');
      }
    });

    form.append('test', form.file('tiny0.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.details, 'Boom!')
  })
})