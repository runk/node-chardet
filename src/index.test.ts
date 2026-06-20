import * as chardet from '.';
import defaultChardet from '.';
import fs from 'fs';
import { describe, expect, it } from 'vitest';

describe('chardet', () => {
  const path = __dirname + '/test/data/encodings/utf8';
  const expectedEncodingsFromPath = [
    { confidence: 100, name: 'UTF-8', lang: undefined },
    { confidence: 32, name: 'windows-1252', lang: 'fr' },
    { confidence: 32, name: 'ISO-8859-13', lang: 'lt' },
    { confidence: 20, name: 'ISO-8859-15', lang: 'fr' },
    { confidence: 19, name: 'KOI8-R', lang: 'ru' },
    { confidence: 18, name: 'macintosh', lang: 'de' },
    { confidence: 16, name: 'ISO-8859-16', lang: 'ro' },
    { confidence: 13, name: 'CP852', lang: 'pl' },
    { confidence: 10, name: 'Big5', lang: 'zh' },
    { confidence: 10, name: 'GB18030', lang: 'zh' }, // Mandarin
    { confidence: 10, name: 'windows-1253', lang: 'el' }, // Greek
    { confidence: 8, name: 'ISO-8859-10', lang: 'is' },
    { confidence: 6, name: 'windows-1250', lang: 'pl' },
    { confidence: 6, name: 'CP850', lang: 'fr' },
    { confidence: 5, name: 'IBM866', lang: 'ru' },
    { confidence: 5, name: 'x-mac-cyrillic', lang: 'uk' },
    { confidence: 4, name: 'ISO-8859-3', lang: 'mt' },
    { confidence: 4, name: 'windows-1254', lang: 'tr' },
    { confidence: 4, name: 'KOI8-U', lang: 'uk' },
    { confidence: 3, name: 'windows-1257', lang: 'et' },
    { confidence: 2, name: 'ISO-8859-14', lang: 'cy' },
    { confidence: 2, name: 'windows-1251', lang: 'ru' },
    { confidence: 2, name: 'IBM855', lang: 'ru' },
    { confidence: 1, name: 'ISO-8859-4', lang: 'lv' },
    { confidence: 1, name: 'windows-1258', lang: 'vi' },
    { confidence: 0, name: 'ASCII', lang: undefined },
  ];

  it('has both named and default exports', () => {
    expect(defaultChardet.analyse).toBe(chardet.analyse);
    expect(defaultChardet.detect).toBe(chardet.detect);
    expect(defaultChardet.detectFile).toBe(chardet.detectFile);
    expect(defaultChardet.detectFileSync).toBe(chardet.detectFileSync);
  });

  describe('#detect', () => {
    it('should detect encoding', () => {
      expect(chardet.detect(fs.readFileSync(path))).toBe('UTF-8');
    });

    it('should not block when non-buffer supplied', () => {
      const invalid = [123, '123'];
      const error = 'Input must be a byte array, e.g. Buffer or Uint8Array';
      invalid.forEach((input) =>
        // @ts-expect-error Testing invalid inputs
        expect(() => chardet.detect(input)).toThrow(error),
      );
    });
  });

  describe('#detectFile', () => {
    it('should detect encoding', async () => {
      const res = await chardet.detectFile(path);
      expect(res).toBe('UTF-8');
    });

    it('should detect encoding with smaller sample size', async () => {
      const res = await chardet.detectFile(path, { sampleSize: 32 });
      expect(res).toBe('UTF-8');
    });

    it('should detect encoding with smaller sample size and offset', async () => {
      const res = await chardet.detectFile(path, {
        sampleSize: 32,
        offset: 64,
      });
      expect(res).toBe('UTF-8');
    });

    it('should work as expected with sampleSize larger than actual file size (1)', async () => {
      const res = await chardet.detectFile(path, { sampleSize: 1024 * 1024 });
      expect(res).toBe('UTF-8');
    });

    it('should work as expected with sampleSize larger than actual file size (2)', async () => {
      const res = await chardet.detectFile(
        __dirname + '/test/data/encodings/koi8r',
        { sampleSize: 1024 * 1024 },
      );
      expect(res).toBe('KOI8-R');
    });
  });

  describe('#detectFileSync', () => {
    it('should detect encoding', () => {
      expect(chardet.detectFileSync(path)).toBe('UTF-8');
    });

    it('should detect encoding with smaller sample size', () => {
      expect(chardet.detectFileSync(path, { sampleSize: 32 })).toBe('UTF-8');
    });

    it('should detect encoding with smaller sample size and offset', () => {
      expect(chardet.detectFileSync(path, { sampleSize: 32, offset: 64 })).toBe(
        'UTF-8',
      );
    });
  });

  describe('#analyse', () => {
    it('should return a list of encodings, sorted by confidence level in descending order', () => {
      const matches = chardet.analyse(fs.readFileSync(path));
      expect(matches).toEqual(expectedEncodingsFromPath);
    });
  });
});
