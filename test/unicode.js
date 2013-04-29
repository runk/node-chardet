
var assert = require('assert'),
    chardet = require('../');

describe('unicode', function() {
    it('should return UTF-16LE', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/utf16le'),
            'UTF-16LE'
        );
    });

    it('should return UTF-16BE', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/utf16be'),
            'UTF-16BE'
        );
    });

    it('should return UTF-32LE', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/utf32le'),
            'UTF-32LE'
        );
    });

    it('should return UTF-32BE', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/utf32be'),
            'UTF-32BE'
        );
    });
});