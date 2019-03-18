import { TestForm } from "./TestForm";
import 'mocha';

var assert = require('assert')

describe('Memory Storage', function () {
  it('should process parser/form-data POST request', async () => {
    var form = new TestForm()

    form.append('name', 'Depart')
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit();
    assert.equal(result.fields.name, 'Depart');
    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result.size, 1778);
    assert.equal(result.files.small0[0].storage.result.buffer.length, 1778);
  })

  it('should process empty fields and an empty file', async () => {
    var form = new TestForm()

    form.append('empty', form.file('empty.dat'))
    form.append('name', 'Depart')
    form.append('version', '')
    form.append('year', '')
    form.append('checkboxfull', 'cb1')
    form.append('checkboxfull', 'cb2')
    form.append('checkboxhalfempty', 'cb1')
    form.append('checkboxhalfempty', '')
    form.append('checkboxempty', '')
    form.append('checkboxempty', '')

    const result = await form.submit();


    assert.equal(result.fields.name, 'Depart')
    assert.equal(result.fields.version, '')
    assert.equal(result.fields.year, '')

    assert.deepEqual(result.fields.checkboxfull, ['cb1', 'cb2'])
    assert.deepEqual(result.fields.checkboxhalfempty, ['cb1', ''])
    assert.deepEqual(result.fields.checkboxempty, ['', ''])

    assert.equal(result.files.empty[0].originalName, 'empty.dat')
    assert.equal(result.files.empty[0].storage.result.size, 0)
    assert.equal(result.files.empty[0].storage.result.buffer.length, 0)
    assert.equal(Buffer.isBuffer(result.files.empty[0].storage.result.buffer), true)
  })

  it('should process multiple files', async () => {
    var form = new TestForm()

    form.append('empty', form.file('empty.dat'))
    form.append('tiny0', form.file('tiny0.dat'))
    form.append('tiny1', form.file('tiny1.dat'))
    form.append('small0', form.file('small0.dat'))
    form.append('small1', form.file('small1.dat'))
    form.append('medium', form.file('medium.dat'))
    form.append('large', form.file('large.jpg'))

    const result = await form.submit();

    assert.equal(result.files.empty[0].originalName, 'empty.dat')
    assert.equal(result.files.empty[0].storage.result.size, 0)
    assert.equal(result.files.empty[0].storage.result.buffer.length, 0)

    assert.equal(result.files.tiny0[0].originalName, 'tiny0.dat')
    assert.equal(result.files.tiny0[0].storage.result.size, 122)
    assert.equal(result.files.tiny0[0].storage.result.buffer.length, 122)

    assert.equal(result.files.tiny1[0].originalName, 'tiny1.dat')
    assert.equal(result.files.tiny1[0].storage.result.size, 7)
    assert.equal(result.files.tiny1[0].storage.result.buffer.length, 7)

    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result.size, 1778)
    assert.equal(result.files.small0[0].storage.result.buffer.length, 1778)

    assert.equal(result.files.small1[0].originalName, 'small1.dat')
    assert.equal(result.files.small1[0].storage.result.size, 315)
    assert.equal(result.files.small1[0].storage.result.buffer.length, 315)

    assert.equal(result.files.medium[0].originalName, 'medium.dat')
    assert.equal(result.files.medium[0].storage.result.size, 13196)
    assert.equal(result.files.medium[0].storage.result.buffer.length, 13196)

    assert.equal(result.files.large[0].originalName, 'large.jpg')
    assert.equal(result.files.large[0].storage.result.size, 2413677)
    assert.equal(result.files.large[0].storage.result.buffer.length, 2413677)
  })
})
