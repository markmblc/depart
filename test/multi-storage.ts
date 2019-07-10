import { TestForm } from "./TestForm";
import { DepartErrorCodes, DepartConfig, DepartError } from '../lib/models';
import 'mocha';
import { DiskStorage } from '../storage/DiskStorage';
import { MemoryStorage } from "../storage/MemoryStorage";

var assert = require('assert')

var fs = require('fs')
var path = require('path')
var temp = require('fs-temp')
var rimraf = require('rimraf')

describe('Multi Storage', function () {
  let uploadDir: string;
  let departCfg: DepartConfig;

  beforeEach((done) => {
    temp.mkdir(function (err, path) {
      if (err) return done(err)

      uploadDir = path
      departCfg = { storage: [new DiskStorage({ destination: path }), new MemoryStorage()] };

      done()
    })
  })

  afterEach((done) => {
    rimraf(uploadDir, done)
  })

  it('should store on disk and in memory', async () => {
    var form = new TestForm(departCfg)

    form.append('name', 'Depart')
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit();
    assert.equal(result.fields.name, 'Depart');
    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result[0].size, 1803);
    assert.equal(result.files.small0[0].storage.result[1].buffer.length, 1803);
    assert.equal(form.fileSize(result.files.small0[0].storage.result[0].path), 1803);
  })

  it('should store on disk in two places', async () => {
    var form = new TestForm(departCfg)

    form.append('name', 'Depart')
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit();
    assert.equal(result.fields.name, 'Depart');
    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result[0].size, 1803);
    assert.equal(result.files.small0[0].storage.result[1].buffer.length, 1803);
    assert.equal(form.fileSize(result.files.small0[0].storage.result[0].path), 1803);
  })

  it('should process empty fields and store an empty file in disk and memory', async () => {
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

debugger;
    assert.equal(result.fields.name, 'Depart')
    assert.equal(result.fields.version, '')
    assert.equal(result.fields.year, '')

    assert.deepEqual(result.fields.checkboxfull, ['cb1', 'cb2'])
    assert.deepEqual(result.fields.checkboxhalfempty, ['cb1', ''])
    assert.deepEqual(result.fields.checkboxempty, ['', ''])

    assert.equal(result.files.empty[0].originalName, 'empty.dat')
    assert.equal(result.files.empty[0].storage.result[0].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[0].path), 0)
    assert.equal(result.files.empty[0].storage.result[1].buffer.length, 0)
    assert.equal(Buffer.isBuffer(result.files.empty[0].storage.result[1].buffer), true)
  })

  it('should store multiple files on disk and memory', async () => {
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
    assert.equal(result.files.empty[0].storage.result[0].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[0].path), 0)
    assert.equal(result.files.empty[0].storage.result[1].buffer.length, 0)

    assert.equal(result.files.tiny0[0].originalName, 'tiny0.dat')
    assert.equal(result.files.tiny0[0].storage.result[0].size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result[0].path), 128)
    assert.equal(result.files.tiny0[0].storage.result[1].buffer.length, 128)

    assert.equal(result.files.tiny1[0].originalName, 'tiny1.dat')
    assert.equal(result.files.tiny1[0].storage.result[0].size, 7)
    assert.equal(form.fileSize(result.files.tiny1[0].storage.result[0].path), 7)
    assert.equal(result.files.tiny1[0].storage.result[1].buffer.length, 7)

    assert.equal(result.files.small0[0].originalName, 'small0.dat')
    assert.equal(result.files.small0[0].storage.result[0].size, 1803)
    assert.equal(form.fileSize(result.files.small0[0].storage.result[0].path), 1803)
    assert.equal(result.files.small0[0].storage.result[1].buffer.length, 1803)

    assert.equal(result.files.small1[0].originalName, 'small1.dat')
    assert.equal(result.files.small1[0].storage.result[0].size, 329)
    assert.equal(form.fileSize(result.files.small1[0].storage.result[0].path), 329)
    assert.equal(result.files.small1[0].storage.result[1].buffer.length, 329)

    assert.equal(result.files.medium[0].originalName, 'medium.dat')
    assert.equal(result.files.medium[0].storage.result[0].size, 13386)
    assert.equal(form.fileSize(result.files.medium[0].storage.result[0].path), 13386)
    assert.equal(result.files.medium[0].storage.result[1].buffer.length, 13386)

    assert.equal(result.files.large[0].originalName, 'large.jpg')
    assert.equal(result.files.large[0].storage.result[0].size, 2413677)
    assert.equal(form.fileSize(result.files.large[0].storage.result[0].path), 2413677)
    assert.equal(result.files.large[0].storage.result[1].buffer.length, 2413677)
  })

  it('should allow multiple disk storages', async () => {

    fs.mkdirSync(uploadDir + '\\sub1');
    fs.mkdirSync(uploadDir + '\\sub2');

    departCfg = {};
    const newCfg = <DepartConfig>{
      storage: [new DiskStorage({ destination: uploadDir + '\\sub1' }), new DiskStorage({ destination: uploadDir + '\\sub2' })],
    };
    var form = new TestForm(newCfg);

    form.append('empty', form.file('empty.dat'))
    form.append('tiny0', form.file('tiny0.dat'))

    let error: DepartError;
    const result = await form.submit();

    assert.equal(result.files.empty[0].originalName, 'empty.dat')
    assert.equal(result.files.empty[0].storage.result[0].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[0].path), 0)
    assert.equal(result.files.empty[0].storage.result[1].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[1].path), 0)

    assert.equal(result.files.tiny0[0].originalName, 'tiny0.dat')
    assert.equal(result.files.tiny0[0].storage.result[0].size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result[0].path), 128)
    assert.equal(result.files.tiny0[0].storage.result[1].size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result[1].path), 128)
  });


  it('should allow skipping a storage method', async () => {

    fs.mkdirSync(uploadDir + '\\sub1');
    fs.mkdirSync(uploadDir + '\\sub2');
    fs.mkdirSync(uploadDir + '\\sub3');

    departCfg = {};
    const newCfg = <DepartConfig>{
      onFile: () => Promise.resolve([true, false, true]),
      storage: [
        new DiskStorage({ destination: uploadDir + '\\sub1' }),
        new DiskStorage({ destination: uploadDir + '\\sub2' }),
        new DiskStorage({ destination: uploadDir + '\\sub3' })
      ],
    };
    var form = new TestForm(newCfg);

    form.append('empty', form.file('empty.dat'))
    form.append('tiny0', form.file('tiny0.dat'))

    let error: DepartError;
    const result = await form.submit();

    assert.equal(result.files.empty[0].originalName, 'empty.dat')
    assert.equal(result.files.empty[0].storage.result[0].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[0].path), 0)

    assert.equal(result.files.empty[0].storage.result[1], false)

    assert.equal(result.files.empty[0].storage.result[2].size, 0)
    assert.equal(form.fileSize(result.files.empty[0].storage.result[2].path), 0)

    assert.equal(result.files.tiny0[0].originalName, 'tiny0.dat')
    assert.equal(result.files.tiny0[0].storage.result[0].size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result[0].path), 128)

    assert.equal(result.files.tiny0[0].storage.result[1], false)

    assert.equal(result.files.tiny0[0].storage.result[2].size, 128)
    assert.equal(form.fileSize(result.files.tiny0[0].storage.result[2].path), 128)
  });

  it('should remove uploaded files from two disk storages on error', async () => {

    fs.mkdirSync(uploadDir + '\\sub1');
    fs.mkdirSync(uploadDir + '\\sub2');

    departCfg = {};
    const newCfg = <DepartConfig>{
      storage: [new DiskStorage({ destination: uploadDir + '\\sub1' }), new DiskStorage({ destination: uploadDir + '\\sub2' })],
      limits: {
        fileSize: 1
      }
    };
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

    var files = fs.readdirSync(uploadDir + '\\sub1')
    assert.deepEqual(files, [])

    files = fs.readdirSync(uploadDir + '\\sub2')
    assert.deepEqual(files, [])
  })
})
