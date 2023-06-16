import assert from 'assert';

const main = async () => {
  const chardet = await import(process.cwd());

  assert(typeof chardet.analyse, 'function');
  assert(typeof chardet.detect, 'function');
  assert(typeof chardet.detectFile, 'function');
  assert(typeof chardet.detectFileSync, 'function');

  assert.deepStrictEqual(chardet.analyse(Buffer.from('This is a test')), [
    { confidence: 100, name: 'ASCII', lang: undefined },
    { confidence: 98, name: 'ISO-8859-1', lang: 'en' },
    { confidence: 98, name: 'ISO-8859-2', lang: 'hu' },
    { confidence: 10, name: 'UTF-8', lang: undefined },
    { confidence: 10, name: 'Shift_JIS', lang: 'ja' },
    { confidence: 10, name: 'Big5', lang: 'zh' },
    { confidence: 10, name: 'EUC-JP', lang: 'ja' },
    { confidence: 10, name: 'EUC-KR', lang: 'ko' },
    { confidence: 10, name: 'GB18030', lang: 'zh' },
  ]);
};

main()
  .then(() => console.log(' > test-build.ts OK'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
