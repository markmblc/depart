import { TestForm } from "./TestForm";
import 'mocha';
import * as assert from 'assert';
import { DepartErrorCodes, DepartError } from '../lib/models';
var stream = require('stream')
var testData = require('testdata-w3c-json-form')

describe('Fields', function () {
  it('should process multiple fields', async () => {
    var form = new TestForm();

    form.append('name', 'Depart')
    form.append('key', 'value')
    form.append('abc', 'xyz')

    const result = await form.submit();
    assert.deepEqual(result.fields, {
      name: 'Depart',
      key: 'value',
      abc: 'xyz'
    });
  })

  it('should process empty fields', async () => {
    var form = new TestForm();

    form.append('name', 'Depart')
    form.append('key', '')
    form.append('abc', '')
    form.append('checkboxfull', 'cb1')
    form.append('checkboxfull', 'cb2')
    form.append('checkboxhalfempty', 'cb1')
    form.append('checkboxhalfempty', '')
    form.append('checkboxempty', '')
    form.append('checkboxempty', '')

    const result = await form.submit();
    assert.deepEqual(result.fields, {
      name: 'Depart',
      key: '',
      abc: '',
      checkboxfull: ['cb1', 'cb2'],
      checkboxhalfempty: ['cb1', ''],
      checkboxempty: ['', '']
    })
  })

  it('should not process non-multipart POST request', async () => {
    var req = new stream.PassThrough()

    req.end('name=Depart')
    req.method = 'POST'
    req.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 11
    }

    const parser = new TestForm().depart;

    let error: DepartError;
    try {
      const result = await parser.parse(req);
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.INVALID_FORMDATA);
  })

  it('should not process non-multipart GET request', async () => {
    var req = new stream.PassThrough()

    req.end('name=Depart')
    req.method = 'GET'
    req.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 11
    }

    const parser = new TestForm().depart;
    let error: DepartError;
    try {
      const result = await parser.parse(req);
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.INVALID_FORMDATA);
  })

  testData.forEach((test) => {
    it('should handle ' + test.name, async () => {
      var form = new TestForm();

      test.fields.forEach((field) => {
        form.append(field.key, field.value);
      })

      const result = await form.submit();
      assert.deepEqual(result.fields, test.expected);
    })
  })

  it('should convert arrays into objects', async () => {
    var form = new TestForm();

    form.append('obj[0]', 'a');
    form.append('obj[2]', 'c');
    form.append('obj[x]', 'yz');

    const result = await form.submit();
    assert.deepEqual(result.fields, {
      obj: {
        '0': 'a',
        '2': 'c',
        'x': 'yz'
      }
    });
  })
})
