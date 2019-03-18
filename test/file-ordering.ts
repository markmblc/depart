/* eslint-env mocha */
import 'mocha';
import { TestForm } from './TestForm';
var assert = require('assert')

describe('File ordering', function () {
  it('should present files in same order as they came', async () => {
    var form = new TestForm({
      fileFields: {
        themFiles: 2
      }
    })

    form.append('themFiles', form.file('small0.dat'))
    form.append('themFiles', form.file('small1.dat'))

    const result = await form.submit();
    assert.equal(result.files.themFiles.length, 2)
    assert.equal(result.files.themFiles[0].originalName, 'small0.dat')
    assert.equal(result.files.themFiles[1].originalName, 'small1.dat')

  })
})