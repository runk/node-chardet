import * as chardet from '.';
import fs from 'fs';

describe('chardet', () => {
  var path = __dirname + '/test/data/encodings/utf8';
  var expectedEncodingsFromPath = [
    { 'confidence': 100, 'name': 'UTF-8', 'lang': undefined },
    { 'confidence': 32, 'name': 'windows-1252', 'lang': 'fr' },
    { 'confidence': 19, 'name': 'KOI8-R', 'lang': undefined },
    { 'confidence': 10, 'name': 'Big5', 'lang': undefined },
    { 'confidence': 10, 'name': 'GB18030', 'lang': undefined },
    { 'confidence': 10, 'name': 'windows-1253', 'lang': undefined },
    { 'confidence': 6, 'name': 'windows-1250', 'lang': 'pl' },
    { 'confidence': 4, 'name': 'windows-1254', 'lang': undefined },
    { 'confidence': 2, 'name': 'windows-1251', 'lang': undefined }
  ];

  describe('#detect', () => {
    it('should detect encoding', () => {
      expect(chardet.detect(fs.readFileSync(path))).toBe('UTF-8');
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
  });

  describe('#detectFileSync', () => {
    it('should detect encoding', () => {
      expect(chardet.detectFileSync(path)).toBe('UTF-8');
    });

    it('should detect encoding with smaller sample size', () => {
      expect(chardet.detectFileSync(path, { sampleSize: 32 })).toBe('UTF-8');
    });
  });

  describe('#analyse', () => {
    it('should return a list of encodings, sorted by confidence level in decending order', () => {
      const matches = chardet.analyse(fs.readFileSync(path));
      expect(matches).toEqual(expectedEncodingsFromPath);
    });
  });
});
