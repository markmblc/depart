/* eslint-env mocha

var assert = require('assert')

var util = require('./_util')
var depart = require('..')
var temp = require('fs-temp')
var rimraf = require('rimraf')
var FormData = require('form-data')

function generateFilename(req, file, cb) {
  cb(null, file.fieldName + file.originalName)
}

function startsWith(str, start) {
  return (str.substring(0, start.length) === start)
}

describe('Functionality', function () {
var cleanup = []

function makeStandardEnv(cb) {
  temp.mkdir(function (err, uploadDir) {
    if (err) return cb(err)

    cleanup.push(uploadDir)

    var storage = depart.diskStorage({
      destination: uploadDir,
      fileName: generateFilename
    })

    cb(null, {
      upload: depart({
        storage: storage
      }),
      uploadDir: uploadDir,
      form: new FormData()
    })
  })
}

after(function () {
  while (cleanup.length) rimraf.sync(cleanup.pop())
})

it('should upload the file to the `dest` dir', () => {
  makeStandardEnv(function (err, env) {
    if (err) return done(err)

    var parser = env.upload.single('small0')
    env.form.append('small0', form.file('small0.dat'))

    const result = await form.submit(parser, env.form, function (err, req) {
      assert.ifError(err)
      assert.ok(startsWith(req.file.path, env.uploadDir))
      assert.equal(form.fileSize(req.file.path), 1778)

    })
  })
})

it('should rename the uploaded file', () => {
  makeStandardEnv(function (err, env) {
    if (err) return done(err)

    var parser = env.upload.single('small0')
    env.form.append('small0', form.file('small0.dat'))

    const result = await form.submit(parser, env.form, function (err, req) {
      assert.ifError(err)
      assert.equal(req.file.fileName, 'small0small0.dat')

    })
  })
})

it('should ensure all req.files values (single-file per field) point to an array', () => {
  makeStandardEnv(function (err, env) {
    if (err) return done(err)

    var parser = env.upload.single('tiny0')
    env.form.append('tiny0', form.file('tiny0.dat'))

    const result = await form.submit(parser, env.form, function (err, req) {
      assert.ifError(err)
      assert.equal(req.file.fileName, 'tiny0tiny0.dat')

    })
  })
})

it('should ensure all req.files values (multi-files per field) point to an array', () => {
  makeStandardEnv(function (err, env) {
    if (err) return done(err)

    var parser = env.upload.array('themFiles', 2)
    env.form.append('themFiles', form.file('small0.dat'))
    env.form.append('themFiles', form.file('small1.dat'))

    const result = await form.submit(parser, env.form, function (err, req) {
      assert.ifError(err)
      assert.equal(req.files.length, 2)
      assert.equal(req.files[0].fileName, 'themFilessmall0.dat')
      assert.equal(req.files[1].fileName, 'themFilessmall1.dat')

    })
  })
})

it('should rename the destination directory to a different directory', () => {
  var storage = depart.diskStorage({
    destination: function (req, file, cb) {
      temp.template('testforme-%s').mkdir(function (err, uploadDir) {
        if (err) return cb(err)

        cleanup.push(uploadDir)
        cb(null, uploadDir)
      })
    },
    fileName: generateFilename
  })

  var form = new TestForm()
  var upload = depart({
    storage: storage
  })
  var parser = upload.array('themFiles', 2)

  form.append('themFiles', form.file('small0.dat'))
  form.append('themFiles', form.file('small1.dat'))

  const result = await form.submit();
  assert.ifError(err)
  assert.equal(req.files.length, 2)
  assert.ok(req.files[0].storage.path.indexOf('/testforme-') >= 0)
  assert.ok(req.files[1].storage.path.indexOf('/testforme-') >= 0)

})
})
})*/