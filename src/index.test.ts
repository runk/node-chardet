import * as chardet from '.';
import defaultChardet from '.';
import fs from 'fs';

describe('chardet', () => {

  const path = __dirname + '/test/data/encodings/utf8';
  const getInput = () => fs.readFileSync(path);

  const expectedEncodingsFromPath = [
    { 'confidence': 100, 'name': 'UTF-8', 'lang': undefined },
    { 'confidence': 32, 'name': 'windows-1252', 'lang': 'fr' },
    { 'confidence': 19, 'name': 'KOI8-R', 'lang': undefined },
    { 'confidence': 10, 'name': 'Big5', 'lang': undefined },
    { 'confidence': 10, 'name': 'GB18030', 'lang': undefined },
    { 'confidence': 10, 'name': 'windows-1253', 'lang': undefined },
    { 'confidence': 6, 'name': 'windows-1250', 'lang': 'pl' },
    { 'confidence': 4, 'name': 'windows-1254', 'lang': undefined },
    { 'confidence': 2, 'name': 'windows-1251', 'lang': undefined },
  ];

  it('has both named and default exports', () => {
    expect(defaultChardet.analyse).toBe(chardet.analyse);
    expect(defaultChardet.detect).toBe(chardet.detect);
    expect(defaultChardet.detectFile).toBe(chardet.detectFile);
    expect(defaultChardet.detectFileSync).toBe(chardet.detectFileSync);
  });

  describe('#detect', () => {
    it('should detect encoding from a buffer', () => {
      expect(chardet.detect(getInput())).toBe('UTF-8');
    });

    it('should detect encoding from a string', () => {
      expect(chardet.detect(getInput().toString('utf-8'))).toBe('UTF-8');
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
      const matches = chardet.analyse(getInput());
      expect(matches).toEqual(expectedEncodingsFromPath);
    });

    it('should work for strings as inputs', () => {
      const matches = chardet.analyse(getInput().toString('utf8'));
      expect(matches).toEqual(expectedEncodingsFromPath);
    });
  });
});
