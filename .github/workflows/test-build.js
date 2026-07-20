const assert = require('assert');

const chardet = require(process.cwd());

assert(typeof chardet.analyse, 'function');
assert(typeof chardet.detect, 'function');
assert(typeof chardet.detectFile, 'function');
assert(typeof chardet.detectFileSync, 'function');

assert.deepStrictEqual(chardet.analyse(Buffer.from('This is a test')), [
  { confidence: 1, name: 'ASCII', lang: undefined },
  { name: 'ISO-8859-2', lang: 'hu', confidence: 0.6 },
  { name: 'windows-1250', lang: 'hu', confidence: 0.6 },
  { name: 'ISO-8859-1', lang: 'en', confidence: 0.4 },
  { name: 'windows-1252', lang: 'en', confidence: 0.4 },
  { name: 'ISO-8859-10', lang: 'is', confidence: 0.4 },
  { name: 'windows-1257', lang: 'lv', confidence: 0.2 },
  { name: 'macintosh', lang: 'de', confidence: 0.2 },
  { name: 'ISO-8859-3', lang: 'mt', confidence: 0.2 },
  { name: 'ISO-8859-4', lang: 'lv', confidence: 0.2 },
  { name: 'ISO-8859-13', lang: 'lt', confidence: 0.2 },
  { name: 'ISO-8859-14', lang: 'cy', confidence: 0.2 },
  { name: 'ISO-8859-15', lang: 'de', confidence: 0.2 },
  { name: 'ISO-8859-16', lang: 'ro', confidence: 0.2 },
  { name: 'CP850', lang: 'de', confidence: 0.2 },
  { name: 'CP852', lang: 'pl', confidence: 0.2 },
  { confidence: 0.1, name: 'UTF-8', lang: undefined },
  { confidence: 0.1, name: 'Shift_JIS', lang: 'ja' },
  { confidence: 0.1, name: 'Big5', lang: 'zh' },
  { confidence: 0.1, name: 'EUC-JP', lang: 'ja' },
  { confidence: 0.1, name: 'EUC-KR', lang: 'ko' },
  { confidence: 0.1, name: 'GB18030', lang: 'zh' },
]);

console.log(' > test-build.js OK');
