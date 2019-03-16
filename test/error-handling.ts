/* eslint-env mocha 

var assert = require('assert')

var os = require('os')
var util = require('./_util')
var depart = require('..')
var stream = require('stream')
var FormData = require('form-data')

function withLimits(limits, fields) {
  var storage = depart.memoryStorage()
  return depart({
    storage: storage,
    limits: limits
  }).fields(fields)
}

describe('Error Handling', function () {
  it('should be an instance of both `Error` and `DepartError` classes in case of the Depart\'s error', () => {
    var form = new TestForm()
    var storage = depart.diskStorage({
      destination: os.tmpdir()
    })
    var upload = depart({
      storage: storage
    }).fields([{
      name: 'small0',
      maxCount: 1
    }])

    form.append('small0', form.file('small0.dat'))
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit(upload, form, function (err, req) {
      assert.equal(err instanceof Error, true)
      assert.equal(err instanceof depart.DepartError, true)

    })
  })

  it('should respect parts limit', () => {
    var form = new TestForm()
    var parser = withLimits({
      parts: 1
    }, [{
      name: 'small0',
      maxCount: 1
    }])

    form.append('field0', 'BOOM!')
    form.append('small0', form.file('small0.dat'))

    const result = await form.submit();
    assert.equal(err.code, 'LIMIT_PART_COUNT')

  })
})

it('should respect file size limit', () => {
var form = new TestForm()
var parser = withLimits({
  fileSize: 1500
}, [{
    name: 'tiny0',
    maxCount: 1
  },
  {
    name: 'small0',
    maxCount: 1
  }
])

form.append('tiny0', form.file('tiny0.dat'))
form.append('small0', form.file('small0.dat'))

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FILE_SIZE')
assert.equal(err.field, 'small0')

})
})

it('should respect file count limit', () => {
var form = new TestForm()
var parser = withLimits({
  files: 1
}, [{
    name: 'small0',
    maxCount: 1
  },
  {
    name: 'small1',
    maxCount: 1
  }
])

form.append('small0', form.file('small0.dat'))
form.append('small1', form.file('small1.dat'))

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FILE_COUNT')

})
})

it('should respect file key limit', () => {
var form = new TestForm()
var parser = withLimits({
  fieldNameSize: 4
}, [{
  name: 'small0',
  maxCount: 1
}])

form.append('small0', form.file('small0.dat'))

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FIELD_KEY')

})
})

it('should respect field key limit', () => {
var form = new TestForm()
var parser = withLimits({
  fieldNameSize: 4
}, [])

form.append('ok', 'SMILE')
form.append('blowup', 'BOOM!')

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FIELD_KEY')

})
})

it('should respect field value limit', () => {
var form = new TestForm()
var parser = withLimits({
  fieldSize: 16
}, [])

form.append('field0', 'This is okay')
form.append('field1', 'This will make the parser explode')

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FIELD_VALUE')
assert.equal(err.field, 'field1')

})
})

it('should respect field count limit', () => {
var form = new TestForm()
var parser = withLimits({
  fields: 1
}, [])

form.append('field0', 'BOOM!')
form.append('field1', 'BOOM!')

const result = await form.submit();
assert.equal(err.code, 'LIMIT_FIELD_COUNT')

})
})

it('should respect fields given', () => {
var form = new TestForm()
var parser = withLimits(undefined, [{
  name: 'wrongname',
  maxCount: 1
}])

form.append('small0', form.file('small0.dat'))

const result = await form.submit();
assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
assert.equal(err.field, 'small0')

})
})

it('should report errors from storage engines', () => {
var storage = depart.memoryStorage()

storage._removeFile = function _removeFile(req, file, cb) {
  var err = new Error('Test error')
  err.code = 'TEST'
  cb(err)
}

var form = new TestForm()
var upload = depart({
  storage: storage
})
var parser = upload.single('tiny0')

form.append('tiny0', form.file('tiny0.dat'))
form.append('small0', form.file('small0.dat'))

const result = await form.submit();
assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
assert.equal(err.field, 'small0')

assert.equal(err.storageErrors.length, 1)
assert.equal(err.storageErrors[0].code, 'TEST')
assert.equal(err.storageErrors[0].field, 'tiny0')
assert.equal(err.storageErrors[0].file, req.file)


})
})

it('should report errors from busboy constructor', () => {
  var req = new stream.PassThrough()
  var storage = depart.memoryStorage()
  var upload = depart({
    storage: storage
  }).single('tiny0')
  var body = 'test'

  req.headers = {
    'content-type': 'multipart/form-data',
    'content-length': body.length
  }

  req.end(body)

  upload(req, null, function (err) {
    assert.equal(err.message, 'Multipart: Boundary not found')

  })
})

it('should report errors from busboy parsing', () => {
  var req = new stream.PassThrough()
  var storage = depart.memoryStorage()
  var upload = depart({
    storage: storage
  }).single('tiny0')
  var boundary = 'AaB03x'
  var body = [
    '--' + boundary,
    'Content-Disposition: form-data; name="tiny0"; fileName="test.txt"',
    'Content-Type: text/plain',
    '',
    'test without end boundary'
  ].join('\r\n')

  req.headers = {
    'content-type': 'multipart/form-data; boundary=' + boundary,
    'content-length': body.length
  }

  req.end(body)

  upload(req, null, function (err) {
    assert.equal(err.message, 'Unexpected end of multipart data')

  })
})

it('should gracefully handle more than one error at a time', () => {
var form = new TestForm()
var storage = depart.diskStorage({
  destination: os.tmpdir()
})
var upload = depart({
  storage: storage,
  limits: {
    fileSize: 1,
    files: 1
  }
}).fields([{
  name: 'small0',
  maxCount: 1
}])

form.append('small0', form.file('small0.dat'))
form.append('small0', form.file('small0.dat'))

const result = await form.submit(upload, form, function (err, req) {
  assert.equal(err.code, 'LIMIT_FILE_SIZE')

})
})
})*/