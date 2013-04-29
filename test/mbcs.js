
var assert = require('assert'),
    chardet = require('../');

describe('Multy byte character sets', function() {
    it('should return SHIFT_JIS', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/shiftjis'),
            'Shift_JIS'
        );
    });

    it('should return BIG-5');

    it('should return EUC-JP', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/euc_jp'),
            'EUC-JP'
        );
    });

    it('should return EUC-KR', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/data/encodings/euc_kr'),
            'EUC-KR'
        );
    });


});