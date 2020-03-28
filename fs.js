var fs = require('fs');
var self = require('./index');

module.exports.detectFile = function(filepath, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
  
    var fd;
  
    var handler = function(err, buffer) {
      if (fd) {
        fs.closeSync(fd);
      }
  
      if (err) return cb(err, null);
      cb(null, self.detect(buffer, opts));
    };
  
    if (opts && opts.sampleSize) {
      fd = fs.openSync(filepath, 'r'),
        sample = Buffer.allocUnsafe(opts.sampleSize);
  
      fs.read(fd, sample, 0, opts.sampleSize, null, function(err) {
        handler(err, sample);
      });
      return;
    }
  
    fs.readFile(filepath, handler);
  };
  
  module.exports.detectFileSync = function(filepath, opts) {
    if (opts && opts.sampleSize) {
      var fd = fs.openSync(filepath, 'r'),
        sample = Buffer.allocUnsafe(opts.sampleSize);
  
      fs.readSync(fd, sample, 0, opts.sampleSize);
      fs.closeSync(fd);
      return self.detect(sample, opts);
    }
  
    return self.detect(fs.readFileSync(filepath), opts);
  };
  