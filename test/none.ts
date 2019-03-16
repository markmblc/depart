import { TestForm } from './TestForm';
import 'mocha';
import { DepartError, DepartErrorCodes } from '../lib/models';
/* eslint-env mocha */

var assert = require('assert')

describe('None', function () {
  it('should not allow file uploads', async () => {
    var form = new TestForm({
      fileFields: ['notfile']
    })

    form.append('key1', 'val1')
    form.append('key2', 'val2')
    form.append('file', form.file('small0.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }

    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_UNEXPECTED_FILE);
  })

  it('should handle text fields', async () => {
    var form = new TestForm({
      fileFields: ['notfile']
    })

    form.append('key1', 'val1')
    form.append('key2', 'val2')

    const result = await form.submit();
    assert.equal(result.fields.file, undefined)
    assert.equal(result.fields.key1, 'val1')
    assert.equal(result.fields.key2, 'val2')
  })
})