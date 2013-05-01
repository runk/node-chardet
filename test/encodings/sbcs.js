
var assert = require('assert'),
    chardet = require('../../');

describe('Singlebyte Character Sets', function() {

    var base = __dirname + '/../data/encodings';

    it('should return ISO-8859-1', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso88591_en'),
            'ISO-8859-1'
        );
    });

    it('should return ISO-8859-2', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso88592_cs'),
            'ISO-8859-2'
        );
    });

    it('should return ISO-8859-5', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso88595_ru'),
            'ISO-8859-5'
        );
    });

    it('should return ISO-8859-6', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso88596_ar'),
            'ISO-8859-6'
        );
    });

    it('should return ISO-8859-7', function() {
        assert.equal(
            chardet.detectFileSync(base + '/iso88597_el'),
            'ISO-8859-7'
        );
    });

});