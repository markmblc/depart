/* eslint-env mocha */
import 'mocha';
import { DepartRequestProcessor } from '../lib/DepartRequestProcessor';
import { TestForm } from './TestForm';
import { DepartStoredFile } from '../lib/models';
var assert = require('assert')

describe('Reuse Middleware', function () {
  var parser

  before(() => {
    parser = new DepartRequestProcessor();
  })

  it('should accept multiple requests', async () => {
    var pending = 8

    const submitData = async (fileCount) => {
      var form = new TestForm(parser);

      form.append('name', 'Depart')
      form.append('files', '' + fileCount)

      for (var i = 0; i < fileCount; i++) {
        form.append('them-files', form.file('small0.dat'))
      }

      const result = await form.submit();

      assert.equal(result.fields.name, 'Depart')
      assert.equal(result.files['them-files'].length, +result.fields.files)

      result.files['them-files'].forEach(function (file: DepartStoredFile) {
        assert.equal(file.fieldName, 'them-files')
        assert.equal(file.originalName, 'small0.dat')
        assert.equal(file.storage.result.size, 1803)
        assert.equal(file.storage.result.buffer.length, 1803)
      })
    }

    submitData(9)
    submitData(1)
    submitData(5)
    submitData(7)
    submitData(2)
    submitData(8)
    submitData(3)
    submitData(4)
  });
});

