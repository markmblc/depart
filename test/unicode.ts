import { TestForm } from "./TestForm";
import 'mocha';
import { DepartConfig } from '../lib/models';
import { DiskStorage } from '../storage/DiskStorage';

var assert = require('assert')

var path = require('path')
var temp = require('fs-temp')
var rimraf = require('rimraf')

describe('Unicode', function () {

  let uploadDir: string;
  let departCfg: DepartConfig;

  beforeEach((done) => {
    temp.mkdir(function (err, path) {
      if (err) return done(err)
      departCfg = { storage: new DiskStorage({ destination: path, fileName: (file) => file.originalName }) };
      uploadDir = path
      done()
    })
  })

  afterEach((done) => {
    rimraf(uploadDir, done)
  })

  it('should handle unicode fileNames', async () => {
    var fileName = '\ud83d\udca9.dat';
    var form = new TestForm(departCfg);

    form.append('small0', form.file('small0.dat'), {
      filename: fileName
    })

    const result = await form.submit();

    assert.equal(path.basename(result.fields.small0[0].storage.path), fileName)
    assert.equal(result.fields.small0[0].originalName, fileName)

    assert.equal(result.fields.small0[0].storage.size, 1778)
    assert.equal(form.fileSize(result.fields.small0[0].storage.path), 1778)
  })
})