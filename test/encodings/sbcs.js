var assert = require('assert'),
  chardet = require('../../');

describe('Singlebyte Character Sets', function() {

  var base = __dirname + '/../data/encodings';

  it('should return ISO-8859-1 (English)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88591_en'), 'ISO-8859-1'
    );
  });

  it('should return ISO-8859-2 (Czech)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88592_cs'), 'ISO-8859-2'
    );
  });

  it('should return ISO-8859-3');
  it('should return ISO-8859-4');

  it('should return ISO-8859-5 (Russian)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88595_ru'), 'ISO-8859-5'
    );
  });

  it('should return ISO-8859-6 (Arabic)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88596_ar'), 'ISO-8859-6'
    );
  });

  it('should return ISO-8859-7 (Greek)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88597_el'), 'ISO-8859-7'
    );
  });

  it('should return ISO-8859-8 (Hebrew)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88598_he'), 'ISO-8859-8'
    );
  });

  it('should return ISO-8859-9 (Turkish)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/iso88599_tr'), 'ISO-8859-9'
    );
  });

  it('should return ISO-8859-10');
  it('should return ISO-8859-11');
  // iso-8859-12 is abandoned
  it('should return ISO-8859-13');
  it('should return ISO-8859-14');
  it('should return ISO-8859-15');
  it('should return ISO-8859-16');


  it('should return windows-1250 (Czech)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1250'), 'windows-1250'
    );
  });

  it('should return windows-1251 (Russian)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1251'), 'windows-1251'
    );
  });

  it('should return windows-1252 (English)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1252'), 'windows-1252'
    );
  });

  it('should return windows-1253 (Greek)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1253'), 'windows-1253'
    );
  });

  it('should return windows-1254 (Turkish)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1254'), 'windows-1254'
    );
  });

  it('should return windows-1255 (Hebrew)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1255'), 'windows-1255'
    );
  });

  it('should return windows-1256 (Arabic)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/windows_1256'), 'windows-1256'
    );
  });


  it('should return KOI8-R (Russian)', function() {
    assert.equal(
      chardet.detectFileSync(base + '/koi8r'), 'KOI8-R'
    );
  });

});
