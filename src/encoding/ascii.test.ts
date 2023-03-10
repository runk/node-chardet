import * as chardet from '..';

describe('ASCII', () => {
  it('should return ASCII', () => {
    expect(
      chardet.detectFileSync(__dirname + '/../test/data/encodings/ascii')
    ).toBe('ASCII');
  });
});
