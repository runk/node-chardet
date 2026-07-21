import * as chardet from '..';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Singlebyte Character Sets', () => {
  const base = path.join(__dirname, '/../test/data/encodings');
  const corpus = path.join(__dirname, '../../corpus/generated');

  const detect = (filename: string) => {
    return chardet.detectFileSync(path.join(base, filename));
  };

  const analyse = (filename: string) => {
    return chardet.analyse(fs.readFileSync(path.join(base, filename)))[0];
  };

  const corpusFixture = (
    encoding: string,
    language: string,
    filename = 'validation/river-trip.bin',
  ) => path.join(corpus, encoding, language, filename);

  it('should return ISO-8859-1 (English)', () => {
    expect(detect('iso88591_en')).toBe('ISO-8859-1');
  });

  it('should retain a weak ISO-8859-1 candidate after byte prefiltering', () => {
    const fixture = path.join(
      __dirname,
      '../../corpus/generated/ISO-8859-1/es/validation/river-trip.bin',
    );
    expect(chardet.detectFileSync(fixture)).toBe('ISO-8859-1');
  });

  it('should return ISO-8859-2 (Czech)', () => {
    expect(detect('iso88592_cs')).toBe('ISO-8859-2');
  });

  it.each([
    ['ISO-8859-3', 'mt'],
    ['ISO-8859-4', 'lv'],
    ['ISO-8859-10', 'is'],
    ['ISO-8859-14', 'cy'],
    ['ISO-8859-16', 'ro'],
  ])('should return %s (%s)', (encoding, language) => {
    const fixture = corpusFixture(encoding, language);
    expect(chardet.detectFileSync(fixture)).toBe(encoding);
    expect(chardet.analyse(fs.readFileSync(fixture))[0]).toMatchObject({
      name: encoding,
      lang: language,
    });
  });

  it('should return ISO-8859-5 (Russian)', () => {
    expect(detect('iso88595_ru')).toBe('ISO-8859-5');
  });

  it('should return ISO-8859-6 (Arabic)', () => {
    expect(detect('iso88596_ar')).toBe('ISO-8859-6');
  });

  it('should return ISO-8859-7 (Greek)', () => {
    expect(detect('iso88597_el')).toBe('ISO-8859-7');
  });

  it('should return ISO-8859-8 (Hebrew)', () => {
    expect(detect('iso88598_he')).toBe('ISO-8859-8');
  });

  it('should return ISO-8859-9 (Turkish)', () => {
    expect(detect('iso88599_tr')).toBe('ISO-8859-9');
  });

  it('should return windows-874 for ISO-8859-11-compatible Thai text', () => {
    expect(detect('windows_874')).toBe('windows-874');
  });

  it.each(['validation/river-trip.bin', 'test/community-garden.bin'])(
    'should prefer windows-874 to weak multibyte matches in %s',
    (filename) => {
      const matches = chardet.analyse(
        fs.readFileSync(corpusFixture('windows-874', 'th', filename)),
      );
      const windows874 = matches.find((match) => match.name === 'windows-874');
      const eucJp = matches.find((match) => match.name === 'EUC-JP');

      expect(matches[0]).toMatchObject({ name: 'windows-874', lang: 'th' });
      expect(eucJp?.confidence).toBeLessThanOrEqual(
        windows874?.confidence ?? 0,
      );
    },
  );

  // iso-8859-12 is abandoned
  it.each([
    ['ISO-8859-13', 'lt'],
    ['ISO-8859-15', 'fr'],
  ])(
    'should return a %s candidate for byte-compatible text',
    (encoding, language) => {
      const fixture = corpusFixture(encoding, language);
      expect(chardet.analyse(fs.readFileSync(fixture))).toContainEqual(
        expect.objectContaining({
          name: encoding,
          lang: language,
        }),
      );
    },
  );

  it('should return windows-1250 (Czech)', () => {
    expect(detect('windows_1250')).toBe('windows-1250');
  });

  it('should return windows-1251 (Russian)', () => {
    expect(detect('windows_1251')).toBe('windows-1251');
  });

  it('should return windows-1252 (English)', () => {
    expect(detect('windows_1252')).toBe('windows-1252');
  });

  it('should return windows-1253 (Greek)', () => {
    expect(detect('windows_1253')).toBe('windows-1253');
  });

  it('should return windows-1254 (Turkish)', () => {
    expect(detect('windows_1254')).toBe('windows-1254');
  });

  it('should return windows-1255 (Hebrew)', () => {
    expect(detect('windows_1255')).toBe('windows-1255');
  });

  it('should return windows-1256 (Arabic)', () => {
    expect(detect('windows_1256')).toBe('windows-1256');
  });

  it.each(['et', 'lv', 'lt'])('should return windows-1257 (%s)', (language) => {
    expect(analyse(`windows_1257_${language}`)).toMatchObject({
      name: 'windows-1257',
      lang: language,
    });
  });

  it('should return windows-1258 (Vietnamese)', () => {
    expect(analyse('windows_1258')).toMatchObject({
      name: 'windows-1258',
      lang: 'vi',
    });
  });

  it('should return KOI8-R (Russian)', () => {
    expect(detect('koi8r')).toBe('KOI8-R');
  });
});
