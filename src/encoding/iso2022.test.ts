import * as chardet from '..';
import fs from 'fs';
import path from 'path';

describe('ISO-2022', () => {
  const base = __dirname + '/../test/data/encodings';

  const analyse = (asset: string) =>
    chardet.analyse(fs.readFileSync(path.join(base, asset))).shift();

  it('should return ISO-2022-JP', () => {
    expect(analyse('iso2022jp')).toEqual({
      confidence: 100,
      lang: 'ja',
      name: 'ISO-2022-JP',
    });
  });

  it('should return ISO-2022-KR', () => {
    expect(analyse('iso2022kr')).toEqual({
      confidence: 100,
      lang: 'kr',
      name: 'ISO-2022-KR',
    });
  });

  it('should return ISO-2022-CN', () => {
    expect(analyse('iso2022cn')).toEqual({
      confidence: 100,
      lang: 'zh',
      name: 'ISO-2022-CN',
    });
  });
});
