import * as chardet from '..';

describe('Multibyte Character Sets', () => {
  const base = __dirname + '/../test/data/encodings';

  it('should return Shift_JIS', () => {
    expect(chardet.detectFileSync(base + '/shiftjis')).toBe('Shift_JIS');
  });

  it('should return GB18030', () => {
    expect(chardet.detectFileSync(base + '/gb18030')).toBe('GB18030');
  });

  it('should return Big5', () => {
    expect(chardet.detectFileSync(base + '/big5')).toBe('Big5');
  });

  it('should return EUC-JP', () => {
    expect(chardet.detectFileSync(base + '/euc_jp')).toBe('EUC-JP');
  });

  it('should return EUC-KR', () => {
    expect(chardet.detectFileSync(base + '/euc_kr')).toBe('EUC-KR');
  });
});
