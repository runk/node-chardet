const assert = require('assert');

const chardet = require(process.cwd());

assert(typeof chardet.analyse, 'function');
assert(typeof chardet.detect, 'function');
assert(typeof chardet.detectFile, 'function');
assert(typeof chardet.detectFileSync, 'function');

assert.deepStrictEqual(chardet.analyse(Buffer.from('This is a test')), [
  { confidence: 1, name: 'ASCII', lang: undefined },
  { confidence: 0.98, name: 'ISO-8859-1', lang: 'en' },
  { confidence: 0.98, name: 'ISO-8859-2', lang: 'hu' },
  { confidence: 0.1, name: 'UTF-8', lang: undefined },
  { confidence: 0.1, name: 'Shift_JIS', lang: 'ja' },
  { confidence: 0.1, name: 'Big5', lang: 'zh' },
  { confidence: 0.1, name: 'EUC-JP', lang: 'ja' },
  { confidence: 0.1, name: 'EUC-KR', lang: 'ko' },
  { confidence: 0.1, name: 'GB18030', lang: 'zh' },
]);

console.log(' > test-build.js OK');
