import * as chardet from '..';
import path from 'path';
import { describe, expect, it, test } from 'vitest';

describe('Singlebyte Character Sets', () => {
  const base = path.join(__dirname, '/../test/data/encodings');

  const detect = (filename: string) => {
    return chardet.detectFileSync(path.join(base, filename));
  }

  it('should return ISO-8859-1 (English)', () => {
    expect(detect('iso88591_en')).toBe('ISO-8859-1');
  });

  it('should return ISO-8859-2 (Czech)', () => {
    expect(detect('iso88592_cs')).toBe('ISO-8859-2');
  });

  test.todo('should return ISO-8859-3');
  test.todo('should return ISO-8859-4');

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

  test.todo('should return ISO-8859-10');
  test.todo('should return ISO-8859-11');
  // iso-8859-12 is abandoned
  test.todo('should return ISO-8859-13');
  test.todo('should return ISO-8859-14');
  test.todo('should return ISO-8859-15');
  test.todo('should return ISO-8859-16');

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

  it('should return KOI8-R (Russian)', () => {
    expect(detect('koi8r')).toBe('KOI8-R');
  });
});
