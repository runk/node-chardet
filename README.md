# chardet [![Build Status](https://travis-ci.org/runk/node-chardet.png)](https://travis-ci.org/runk/node-chardet)

*Chardet* is a character detection module written in pure Javascript (Typescript). Module uses occurrence analysis to determine the most probable encoding.

- Packed size is only **22 KB**
- Works in all environments: Node / Browser / Native
- Works on all platforms: Linux / Mac / Windows
- No dependencies
- No native code / bindings
- 100% written in Typescript
- Extensive code coverage

## Installation

```
npm i chardet
```

## Usage

To return the encoding with the highest confidence:

```javascript
const chardet = require('chardet');

chardet.detect(Buffer.from('hello there!'));
// or
chardet.detectFile('/path/to/file').then(encoding => console.log(encoding));
// or
chardet.detectFileSync('/path/to/file');
```

To return the full list of possible encodings use `analyse` method.

```javascript
const chardet = require('chardet');
chardet.analyse(Buffer.from('hello there!'));
```

Returned value is an array of objects sorted by confidence value in decending order

```javascript
[
  { confidence: 90, name: 'UTF-8' },
  { confidence: 20, name: 'windows-1252', lang: 'fr' }
];
```

## Working with large data sets

Sometimes, when data set is huge and you want to optimize performace (in tradeoff of less accuracy),
you can sample only first N bytes of the buffer:

```javascript
chardet
  .detectFile('/path/to/file', { sampleSize: 32 })
  .then(encoding => console.log(encoding));
```

## Supported Encodings:

- UTF-8
- UTF-16 LE
- UTF-16 BE
- UTF-32 LE
- UTF-32 BE
- ISO-2022-JP
- ISO-2022-KR
- ISO-2022-CN
- Shift_JIS
- Big5
- EUC-JP
- EUC-KR
- GB18030
- ISO-8859-1
- ISO-8859-2
- ISO-8859-5
- ISO-8859-6
- ISO-8859-7
- ISO-8859-8
- ISO-8859-9
- windows-1250
- windows-1251
- windows-1252
- windows-1253
- windows-1254
- windows-1255
- windows-1256
- KOI8-R

Currently only these encodings are supported.

## Typescript?

Yes. Type definitions are included.

### References

- ICU project http://site.icu-project.org/
