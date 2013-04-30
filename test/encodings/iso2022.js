
var assert = require('assert'),
    chardet = require('../../');

describe('ISO-2022', function() {

    var base = __dirname + '/../data/encodings';

    it('should return ISO-2022-JP', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso2022jp'),
            'ISO-2022-JP'
        );
    });

    it('should return ISO-2022-KR', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso2022kr'),
            'ISO-2022-KR'
        );
    });

    it('should return ISO-2022-CN', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso2022cn'),
            'ISO-2022-CN'
        );
    });
});