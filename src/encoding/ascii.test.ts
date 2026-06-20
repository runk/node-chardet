import * as chardet from '..';
import { describe, expect, it } from 'vitest';

describe('ASCII', () => {
  it('should return ASCII', () => {
    expect(
      chardet.detectFileSync(__dirname + '/../test/data/encodings/ascii'),
    ).toBe('ASCII');
  });
});
