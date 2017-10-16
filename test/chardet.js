var assert = require('assert'),
  chardet = require('../'),
  fs = require('fs');

describe('chardet', function() {

  var path = __dirname + '/data/encodings/utf8';

  describe('#detect', function() {
    it('should detect encoding', function() {
      assert.equal(chardet.detect(fs.readFileSync(path)), 'UTF-8');
    });
  });

  describe('#detectFile', function() {
    it('should detect encoding', function(done) {
      chardet.detectFile(path, function(err, res) {
        assert.equal(err, null);
        assert.equal(res, 'UTF-8');
        done();
      });
    });

    it('should detect encoding with smaller sample size', function(done) {
      chardet.detectFile(path, { sampleSize: 32 }, function(err, res) {
        assert.equal(err, null);
        assert.equal(res, 'UTF-8');
        done();
      });
    });
  });

  describe('#detectFileSync', function() {
    it('should detect encoding', function() {
      assert.equal(chardet.detectFileSync(path), 'UTF-8');
    });

    it('should detect encoding with smaller sample size', function() {
      assert.equal(chardet.detectFileSync(path, { sampleSize: 32 }), 'UTF-8');
    });
  });
});
