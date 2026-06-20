import * as chardet from '..';
import { describe, expect, it } from 'vitest';

describe('UTF-8', () => {
  it('should return UTF-8', () => {
    expect(
      chardet.detectFileSync(__dirname + '/../test/data/encodings/utf8'),
    ).toBe('UTF-8');
  });
});
