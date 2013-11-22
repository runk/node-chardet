var assert = require('assert'),
  chardet = require('../../');

describe('Multybyte Character Sets', function() {

  var base = __dirname + '/../data/encodings';

  it('should return SHIFT-JIS', function() {
    assert.equal(
      chardet.detectFileSync(base + '/shiftjis'),
      'Shift-JIS'
    );
  });

  it('should return GB18030', function() {
    assert.equal(
      chardet.detectFileSync(base + '/gb18030'),
      'GB18030'
    );
  });

  it('should return Big5', function() {
    assert.equal(
      chardet.detectFileSync(base + '/big5'),
      'Big5'
    );
  });

  it('should return EUC-JP', function() {
    assert.equal(
      chardet.detectFileSync(base + '/euc_jp'),
      'EUC-JP'
    );
  });

  it('should return EUC-KR', function() {
    assert.equal(
      chardet.detectFileSync(base + '/euc_kr'),
      'EUC-KR'
    );
  });

});
