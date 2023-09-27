import { isByteArray } from './utils';

describe('isByteArray', () => {
  test('positives', () => {
    expect(isByteArray(Buffer.from('hello'))).toBe(true);
    expect(isByteArray(new Uint8Array(0))).toBe(true);
    expect(isByteArray(new Uint8Array(1))).toBe(true);
    expect(isByteArray([])).toBe(true);
    expect(isByteArray([1])).toBe(true);
  });

  test('negatives', () => {
    expect(isByteArray(null)).toBe(false);
    expect(isByteArray('')).toBe(false);
    expect(isByteArray('hello')).toBe(false);
    expect(isByteArray(123)).toBe(false);
  });
});
