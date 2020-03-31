import * as chardet from '..';

describe('ISO-2022', () => {
  var base = __dirname + '/../test/data/encodings';

  it('should return ISO-2022-JP', () => {
    expect(chardet.detectFileSync(base + '/iso2022jp')).toBe('ISO-2022-JP');
  });

  it('should return ISO-2022-KR', () => {
    expect(chardet.detectFileSync(base + '/iso2022kr')).toBe('ISO-2022-KR');
  });

  it('should return ISO-2022-CN', () => {
    expect(chardet.detectFileSync(base + '/iso2022cn')).toBe('ISO-2022-CN');
  });
});
