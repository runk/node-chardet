
chardet - nodejs characted detection module, written in pure Javascript
======

# Installation

    npm install chardet

# Usage

    var chardet = require('chardet');
    chardet.detect(new Buffer('hello there!'));
    // or
    chardet.detectFile('/path/to/file', function(err, encoding) {});
    // or
    chardet.detectFileSync('/path/to/file');

# Supported Encodings:

* UTF-8
* UTF-16 LE
* UTF-16 BE
* UTF-32 LE
* UTF-32 BE
* ISO-2022-JP
* ISO-2022-KR
* ISO-2022-CN
* Shift-JIS
* Big5
* EUC-JP
* EUC-KR
* GB18030

Currently only these encodings are supported, more will be added soon.