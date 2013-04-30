
var assert = require('assert'),
    chardet = require('../../');

describe('UTF-8', function() {
    it('should return UTF-8', function() {
        assert.equal(
            chardet.detectFileSync(__dirname + '/../data/encodings/utf8'),
            'UTF-8'
        );
    });
});