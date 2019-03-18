/* eslint-env mocha */
import 'mocha';
import * as assert from 'assert';

import * as express from 'express';
import { DepartErrorCodes, DepartError } from '../lib/models';
import * as fs from 'fs';
import * as path from 'path';
import { DepartExpressMiddleware } from '../lib/DepartExpressMiddleware';
var FormData = require('form-data');
var concat = require('concat-stream')
var onFinished = require('on-finished')

var port = 34279

describe('Express Integration', function () {
  var app, server

  beforeEach((done) => {
    app = express()
    server = app.listen(port, done)
  })

  afterEach((done) => {
    server.close(done);
  })

  function submitForm(form, path, cb) {
    form.submit('http://localhost:' + port + path, (err, res) => {
      if (err) return cb(err);
      res.on('error', cb)
      res.pipe(concat({
        encoding: 'buffer'
      }, function (body) {
        onFinished(res, function () {
          cb(null, res, body)
        })
      }))
    })
  }

  it('should attach populated formData to request object', (done) => {
    var router = new (express.Router as any)()
    var form = new FormData();
    var depart = new DepartExpressMiddleware();

    var routeCalled = 0
    var errorCalled = 0

    form.append('avatar', fs.createReadStream(path.join(__dirname, 'files', 'large.jpg')));

    router.post('/profile', depart.handleRequest, function (req, res, next) {
      routeCalled++
      assert.notEqual(req.formData, undefined);
      assert.equal(req.formData.files.avatar.length, 1);
      res.status(200).end('SUCCESS')
    })

    router.use(function (err, req, res, next) {
      assert.equal(err.code, DepartErrorCodes.LIMIT_FILE_SIZE);

      errorCalled++
      res.status(500).end('ERROR')
    })

    app.use('/t1', router)
    submitForm(form, '/t1/profile', function (err, res, body) {
      assert.ifError(err)

      assert.equal(routeCalled, 1)
      assert.equal(errorCalled, 0)
      assert.equal(body.toString(), 'SUCCESS')
      assert.equal(res.statusCode, 200)

      done()
    })
  })


  it('should work with express error handling', (done) => {
    const cfg = {
      limits: {
        fileSize: 200
      }
    };
    var router = new (express.Router as any)()
    var form = new FormData();
    var depart = new DepartExpressMiddleware(cfg);

    var routeCalled = 0
    var errorCalled = 0

    form.append('avatar', fs.createReadStream(path.join(__dirname, 'files', 'large.jpg')));

    router.post('/profile', depart.handleRequest, function (req, res, next) {
      routeCalled++
      res.status(200).end('SUCCESS')
    })

    router.use(function (err, req, res, next) {
      assert.equal(err.code, DepartErrorCodes.LIMIT_FILE_SIZE);

      errorCalled++
      res.status(500).end('ERROR')
    })

    app.use('/t1', router)
    submitForm(form, '/t1/profile', function (err, res, body) {
      assert.ifError(err)

      assert.equal(routeCalled, 0)
      assert.equal(errorCalled, 1)
      assert.equal(body.toString(), 'ERROR')
      assert.equal(res.statusCode, 500)

      done()
    })
  })

  it('should work when receiving error from onFile', (done) => {
    const onFile = () => {
      throw new DepartError('Boom!');
    }

    var depart = new DepartExpressMiddleware({
      onFile: onFile
    });
    var router = new (express.Router as any)()
    var form = new FormData()

    var routeCalled = 0
    var errorCalled = 0

    form.append('avatar', fs.createReadStream(path.join(__dirname, 'files', 'large.jpg')));

    router.post('/profile', depart.handleRequest, function (req, res, next) {
      routeCalled++
      res.status(200).end('SUCCESS')
    })

    router.use(function (err, req, res, next) {
      assert.equal(err.details, 'Boom!')

      errorCalled++
      res.status(500).end('ERROR')
    })

    app.use('/t2', router)
    submitForm(form, '/t2/profile', function (err, res, body) {
      assert.ifError(err)

      assert.equal(routeCalled, 0)
      assert.equal(errorCalled, 1)
      assert.equal(body.toString(), 'ERROR')
      assert.equal(res.statusCode, 500)
      done()
    })
  })
})