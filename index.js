
var fs = require('fs');

var UTF_8 = require('./encoding/utf8');
var unicode = require('./encoding/unicode');
var mbcs = require('./encoding/mbcs');
var iso2022 = require('./encoding/iso2022');

var self = this;

var recognisers = [
    new UTF_8,
    new unicode.UTF_16BE,
    new unicode.UTF_16LE,
    new unicode.UTF_32BE,
    new unicode.UTF_32LE,
    new mbcs.sjis,
    new mbcs.big5,
    new mbcs.euc_jp,
    new mbcs.euc_kr,
    new mbcs.gb_18030,
    new iso2022.ISO_2022_JP,
    new iso2022.ISO_2022_KR,
    new iso2022.ISO_2022_CN
];

module.exports.detect = function(buffer) {

    var context = {
        fRawInput:   buffer,
        fRawLength:  buffer.length,
        fInputBytes: buffer,
        fInputLen:   buffer.length
    };

    var matches = recognisers.map(function(rec) {
        return rec.match(context);
    }).filter(function(match) {
        return !!match;
    });

    matches.sort(function(a, b) {
        return a.confidence - b.confidence;
    });

    console.log(matches);

    return matches.length ? matches.pop().name : null;
};

module.exports.detectFile = function(filepath, fn) {
    fs.readFile(filepath, function(err, res) {
        if (err)
            return fn(err, null);
        fn(null, self.detect(res));
    });
};

module.exports.detectFileSync = function(filepath) {
    return self.detect(fs.readFileSync(filepath));
};