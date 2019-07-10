import { TestForm } from "./TestForm";
import { DepartErrorCodes, DepartConfig, DepartError } from '../lib/models';
import 'mocha';
import { DiskStorage } from '../storage/DiskStorage';

var assert = require('assert')

var fs = require('fs')
var path = require('path')
var temp = require('fs-temp')
var rimraf = require('rimraf')

describe('Disk Storage', function () {
  let uploadDir: string;
  let departCfg: DepartConfig;

  beforeEach((done) => {
    temp.mkdir(function (err, path) {
      if (err) return done(err)

      uploadDir = path
      departCfg = { storage: new DiskStorage({ destination: path }) };

      done()
    })
  })

  afterEach((done) => {
    rimraf(uploadDir, done)
  })

  it('should process parser/form-data POST request', async () => {
    var form = new TestForm(departCfg)

    form.append('name', 'Depart')
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit();
    assert.equal(result.fields.name, 'Depart');
    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result.size, 1803);
    assert.equal(form.fileSize(result.files.small0[0].storage.result.path), 1803);
  })

  it('should process empty fields and an empty file', async () => {
    var form = new TestForm(departCfg)

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
    assert.equal(form.fileSize(result.files.empty[0].storage.result.path), 0)
  })

  it('should process multiple files', async () => {
    var form = new TestForm(departCfg)

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
    assert.equal(form.fileSize(result.files.empty[0].storage.result.path), 0)

    assert.equal(result.files.tiny0[0].originalName, 'tiny0.dat')
    assert.equal(result.files.tiny0[0].storage.result.size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result.path), 128)

    assert.equal(result.files.tiny1[0].originalName, 'tiny1.dat')
    assert.equal(result.files.tiny1[0].storage.result.size, 7)
    assert.equal(form.fileSize(result.files.tiny1[0].storage.result.path), 7)

    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result.size, 1803)
    assert.equal(form.fileSize(result.files.small0[0].storage.result.path), 1803)

    assert.equal(result.files.small1[0].originalName, 'small1.dat')
    assert.equal(result.files.small1[0].storage.result.size, 329)
    assert.equal(form.fileSize(result.files.small1[0].storage.result.path), 329)

    assert.equal(result.files.medium[0].originalName, 'medium.dat')
    assert.equal(result.files.medium[0].storage.result.size, 13386)
    assert.equal(form.fileSize(result.files.medium[0].storage.result.path), 13386)

    assert.equal(result.files.large[0].originalName, 'large.jpg')
    assert.equal(result.files.large[0].storage.result.size, 2413677)
    assert.equal(form.fileSize(result.files.large[0].storage.result.path), 2413677)
  })

  it('should remove uploaded files on error', async () => {
    const newCfg = Object.assign({}, departCfg, <DepartConfig>{
      limits: {
        fileSize: 1
      }
    });
    var form = new TestForm(newCfg);

    //form.append('empty', form.file('empty.dat'))
    form.append('tiny0', form.file('tiny0.dat'))

    let error: DepartError;
    try {
      const result = await form.submit();
    } catch (err) {
      error = err;
    }
    assert.notEqual(error, undefined);
    assert.equal(error.code, DepartErrorCodes.LIMIT_FILE_SIZE);
    assert.equal(error.details, 'tiny0')

    var files = fs.readdirSync(uploadDir)
    assert.deepEqual(files, [])
  })
  /*
    it('should report error when directory doesn\'t exist', async () => {
      var directory = path.join(temp.mkdirSync(), 'ghost')
  
      var form = new TestForm({
        destination: directory
      });
  
      form.append('tiny0', form.file('tiny0.dat'))
  
      try {
        const result = await form.submit();
      } catch (err) {
        assert.equal(err.code, 'ENOENT')
        assert.equal(path.dirname(err.path), directory)
      }
    })*/
})
