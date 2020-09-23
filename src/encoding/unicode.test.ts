import * as chardet from '..';

describe('Unicode', () => {
  const base = __dirname + '/../test/data/encodings';

  it('should return UTF-16LE', () => {
    expect(chardet.detectFileSync(base + '/utf16le')).toBe('UTF-16LE');
  });

  it('should return UTF-16BE', () => {
    expect(chardet.detectFileSync(base + '/utf16be')).toBe('UTF-16BE');
  });

  it('should return UTF-32LE', () => {
    expect(chardet.detectFileSync(base + '/utf32le')).toBe('UTF-32LE');
  });

  it('should return UTF-32BE', () => {
    expect(chardet.detectFileSync(base + '/utf32be')).toBe('UTF-32BE');
  });
});
