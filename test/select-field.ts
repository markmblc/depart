/* eslint-env mocha */
import 'mocha';
import { TestForm } from './TestForm';
import { DepartRequestProcessor } from '../lib/DepartRequestProcessor';
var assert = require('assert')

function generateForm(parser) {
  var form = new TestForm(parser)

  form.append('CA$|-|', form.file('empty.dat'))
  form.append('set-1', form.file('tiny0.dat'))
  form.append('set-1', form.file('empty.dat'))
  form.append('set-1', form.file('tiny1.dat'))
  form.append('set-2', form.file('tiny1.dat'))
  form.append('set-2', form.file('tiny0.dat'))
  form.append('set-2', form.file('empty.dat'))

  return form
}

function assertSet(files, setName, fileNames) {
  var len = fileNames.length

  assert.equal(files.length, len)

  for (var i = 0; i < len; i++) {
    assert.equal(files[i].fieldName, setName)
    assert.equal(files[i].originalName, fileNames[i])
  }
}

describe('Select Field', function () {
  var parser

  before(function () {
    parser = new DepartRequestProcessor({
      fileFields: {
        'CA$|-|': 1,
        'set-1': 3,
        'set-2': 3
      }
    })
  })

  it('should select the first file with fieldName', async () => {
    const form = generateForm(parser);
    const result = await form.submit();

    var file

    file = result.files['CA$|-|'][0]
    assert.equal(file.fieldName, 'CA$|-|')
    assert.equal(file.originalName, 'empty.dat')

    file = result.files['set-1'][0]
    assert.equal(file.fieldName, 'set-1')
    assert.equal(file.originalName, 'tiny0.dat')

    file = result.files['set-2'][0]
    assert.equal(file.fieldName, 'set-2')
    assert.equal(file.originalName, 'tiny1.dat')
  })

  it('should select all files with fieldName', async () => {
    const form = generateForm(parser);
    const result = await form.submit();

    assertSet(result.files['CA$|-|'], 'CA$|-|', ['empty.dat'])
    assertSet(result.files['set-1'], 'set-1', ['tiny0.dat', 'empty.dat', 'tiny1.dat'])
    assertSet(result.files['set-2'], 'set-2', ['tiny1.dat', 'tiny0.dat', 'empty.dat'])
  })
})