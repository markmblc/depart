/* eslint-env mocha */

import 'mocha';
import * as assert from 'assert';
import { DepartErrorCodes, DepartError } from '../lib/models';
import { TestForm } from './TestForm';

describe('Expected files', function () {
  it('should reject single unexpected file', async () => {
    var form = new TestForm({
      fileFields: ['me']
    })

    form.append('notme', form.file('small0.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_UNEXPECTED_FILE);
    assert.equal(error.details, 'notme')
  })

  it('should reject array of multiple files', async () => {
    var form = new TestForm({
      fileFields: ['me']
    })

    form.append('notme', form.file('small0.dat'))
    form.append('notme', form.file('small1.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_UNEXPECTED_FILE);
    assert.equal(error.details, 'notme')
  })

  it('should reject overflowing arrays', async () => {
    var form = new TestForm({
      fileFields: {
        'butme': {
          maxFiles: 1
        }
      }
    })


    form.append('butme', form.file('small0.dat'))
    form.append('butme', form.file('small1.dat'))
    form.append('notme', form.file('small1.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_UNEXPECTED_FILE);
    assert.equal(error.details, 'butme')
  })

  it('should accept files with expected fieldName', async () => {
    var form = new TestForm({
      fileFields: {
        'butme': { maxFiles: 2 },
        'andme': { maxFiles: 2 }
      }
    })

    form.append('butme', form.file('small0.dat'))
    form.append('butme', form.file('small1.dat'))
    form.append('andme', form.file('empty.dat'))

    const result = await form.submit();

    assert.equal(result.files.butme.length, 2);
    assert.equal(result.files.andme.length, 1);
  })

  it('should reject files with unexpected fieldName', async () => {
    var form = new TestForm({
      fileFields: {
        'butme': { maxFiles: 2 },
        'andme': { maxFiles: 2 }
      }
    })

    form.append('butme', form.file('small0.dat'))
    form.append('butme', form.file('small1.dat'))
    form.append('andme', form.file('empty.dat'))
    form.append('notme', form.file('empty.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_UNEXPECTED_FILE);
    assert.equal(error.details, 'notme');
  })

  it('should allow any file to come thru', async () => {
    var form = new TestForm()

    form.append('butme', form.file('small0.dat'));
    form.append('butme', form.file('small1.dat'));
    form.append('andme', form.file('empty.dat'));

    const result = await form.submit();
    assert.equal(result.files.butme.length, 2);
    assert.equal(result.files.andme.length, 1);
  })
})
