import * as chardet from '.';
import defaultChardet from '.';
import fs from 'fs';

describe('chardet', () => {

  const path = __dirname + '/test/data/encodings/utf8';
  const expectedEncodingsFromPath = [
    { 'confidence': 100, 'name': 'UTF-8', 'lang': undefined },
    { 'confidence': 32, 'name': 'windows-1252', 'lang': 'fr' },
    { 'confidence': 19, 'name': 'KOI8-R', 'lang': 'ru' },
    { 'confidence': 10, 'name': 'Big5', 'lang': 'zh' },
    { 'confidence': 10, 'name': 'GB18030', 'lang': 'zh' }, // Mandarin
    { 'confidence': 10, 'name': 'windows-1253', 'lang': 'el' }, // Greek
    { 'confidence': 6, 'name': 'windows-1250', 'lang': 'pl' },
    { 'confidence': 4, 'name': 'windows-1254', 'lang': 'tr' },
    { 'confidence': 2, 'name': 'windows-1251', 'lang': 'ru' },
    { 'confidence': 0, 'name': 'ASCII', 'lang': undefined },
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
      // @ts-expect-error Testing invalid inputs
      invalid.forEach((input) => expect(() => chardet.detect(input)).toThrow(error));
    })
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
      const res = await chardet.detectFile(path, { sampleSize: 32, offset: 64 });
      expect(res).toBe('UTF-8');
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
      expect(chardet.detectFileSync(path, { sampleSize: 32, offset: 64 })).toBe('UTF-8');
    });
  });

  describe('#analyse', () => {
    it('should return a list of encodings, sorted by confidence level in descending order', () => {
      const matches = chardet.analyse(fs.readFileSync(path));
      expect(matches).toEqual(expectedEncodingsFromPath);
    });
  });


});
