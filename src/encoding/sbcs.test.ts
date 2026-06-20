import * as chardet from '..';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Singlebyte Character Sets', () => {
  const base = path.join(__dirname, '/../test/data/encodings');

  const detect = (filename: string) => {
    return chardet.detectFileSync(path.join(base, filename));
  };

  const analyse = (filename: string) => {
    return chardet.analyse(fs.readFileSync(path.join(base, filename)))[0];
  };

  it('should return ISO-8859-1 (English)', () => {
    expect(detect('iso88591_en')).toBe('ISO-8859-1');
  });

  it('should return ISO-8859-2 (Czech)', () => {
    expect(detect('iso88592_cs')).toBe('ISO-8859-2');
  });

  it('should return ISO-8859-3 (Maltese)', () => {
    expect(analyse('iso88593_mt')).toMatchObject({
      name: 'ISO-8859-3',
      lang: 'mt',
    });
  });

  it('should return ISO-8859-4 (Latvian)', () => {
    expect(analyse('iso88594_lv')).toMatchObject({
      name: 'ISO-8859-4',
      lang: 'lv',
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

  it('should return ISO-8859-10 (Icelandic)', () => {
    expect(analyse('iso885910_is')).toMatchObject({
      name: 'ISO-8859-10',
      lang: 'is',
    });
  });
  it('should detect ISO-8859-11 / TIS-620 under its windows-874 name', () => {
    expect(detect('windows_874')).toBe('windows-874');
  });
  // iso-8859-12 is abandoned
  it('should return ISO-8859-13 (Lithuanian)', () => {
    expect(analyse('iso885913_lt')).toMatchObject({
      name: 'ISO-8859-13',
      lang: 'lt',
    });
  });

  it('should return ISO-8859-14 (Welsh)', () => {
    expect(analyse('iso885914_cy')).toMatchObject({
      name: 'ISO-8859-14',
      lang: 'cy',
    });
  });

  it('should return ISO-8859-15 (French)', () => {
    expect(analyse('iso885915_fr')).toMatchObject({
      name: 'ISO-8859-15',
      lang: 'fr',
    });
  });

  it('should return ISO-8859-16 (Romanian)', () => {
    expect(analyse('iso885916_ro')).toMatchObject({
      name: 'ISO-8859-16',
      lang: 'ro',
    });
  });

  it('should return windows-874 for Thai text', () => {
    expect(detect('windows_874')).toBe('windows-874');
  });

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

  it('should return KOI8-U (Ukrainian)', () => {
    expect(analyse('koi8u')).toMatchObject({
      name: 'KOI8-U',
      lang: 'uk',
    });
  });

  it('should return IBM866 (Russian)', () => {
    expect(analyse('ibm866')).toMatchObject({
      name: 'IBM866',
      lang: 'ru',
    });
  });

  it.each(['bg', 'ru', 'sr'])('should return IBM855 (%s)', (language) => {
    expect(analyse(`ibm855_${language}`)).toMatchObject({
      name: 'IBM855',
    });
  });

  it.each(['ru', 'uk'])('should return x-mac-cyrillic (%s)', (language) => {
    expect(analyse(`x_mac_cyrillic_${language}`)).toMatchObject({
      name: 'x-mac-cyrillic',
      lang: language,
    });
  });

  it.each(['en', 'fr', 'de', 'es'])(
    'should return macintosh (%s)',
    (language) => {
      expect(analyse(`macintosh_${language}`)).toMatchObject({
        name: 'macintosh',
        lang: language,
      });
    },
  );

  it('should return CP850 (French)', () => {
    expect(analyse('cp850_fr')).toMatchObject({ name: 'CP850', lang: 'fr' });
  });

  it('should return CP852 (Polish)', () => {
    expect(analyse('cp852_pl')).toMatchObject({ name: 'CP852', lang: 'pl' });
  });

  it('should return KOI8-R (Russian)', () => {
    expect(detect('koi8r')).toBe('KOI8-R');
  });
});
