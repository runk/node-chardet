
var assert = require('assert'),
    chardet = require('../../');

describe('Unicode', function() {

    var base = __dirname + '/../data/encodings';

    it('should return UTF-16LE', function() {
        assert.equal(
            chardet.detectFileSync(base + '/utf16le'),
            'UTF-16LE'
        );
    });

    it('should return UTF-16BE', function() {
        assert.equal(
            chardet.detectFileSync(base + '/utf16be'),
            'UTF-16BE'
        );
    });

    it('should return UTF-32LE', function() {
        assert.equal(
            chardet.detectFileSync(base + '/utf32le'),
            'UTF-32LE'
        );
    });

    it('should return UTF-32BE', function() {
        assert.equal(
            chardet.detectFileSync(base + '/utf32be'),
            'UTF-32BE'
        );
    });
});