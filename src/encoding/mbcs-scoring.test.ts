import { describe, expect, it } from 'vitest';
import type { GeneratedMBCSModel } from './models/types';
import {
  prepareMBCSModel,
  scoreMBCS,
  type MBCSStatistics,
} from './mbcs-scoring';

const model: GeneratedMBCSModel = {
  encoding: 'EUC-JP',
  language: 'ja',
  total: 100,
  commonCharacters: [0xa1a1, 0xa4a2],
};
const prepared = prepareMBCSModel(model);

function statistics(
  multibyteCharacters: number[],
  invalidCharacters = 0,
): MBCSStatistics {
  return {
    totalCharacters: multibyteCharacters.length + invalidCharacters,
    multibyteCharacters,
    invalidCharacters,
  };
}

describe('generated MBCS scoring', () => {
  it('scores model coverage rather than structural compatibility alone', () => {
    expect(
      scoreMBCS(statistics(Array(20).fill(0xa4a2)), prepared),
    ).toMatchObject({ confidence: 1, hits: 20 });
    expect(
      scoreMBCS(statistics(Array(20).fill(0xb0b0)), prepared),
    ).toMatchObject({ confidence: 0, hits: 0 });
  });

  it('reduces model confidence when invalid sequences are present', () => {
    expect(
      scoreMBCS(statistics(Array(20).fill(0xa4a2), 1), prepared).confidence,
    ).toBe(0.5);
  });

  it('returns finite boundary scores for short and empty input', () => {
    expect(scoreMBCS(statistics([]), prepared).confidence).toBe(0);
    expect(scoreMBCS(statistics([0xa4a2]), prepared).confidence).toBe(0.1);
  });
});
