import type { GeneratedMBCSModel } from './models/types';

export interface MBCSStatistics {
  readonly totalCharacters: number;
  readonly multibyteCharacters: readonly number[];
  readonly invalidCharacters: number;
}

export interface MBCSScore {
  readonly confidence: number;
  readonly hits: number;
  readonly multibyteCharacters: number;
  readonly invalidCharacters: number;
}

export interface PreparedMBCSModel {
  readonly model: GeneratedMBCSModel;
  readonly commonCharacters: ReadonlySet<number>;
}

export function prepareMBCSModel(model: GeneratedMBCSModel): PreparedMBCSModel {
  return {
    model,
    commonCharacters: new Set(model.commonCharacters),
  };
}

export function scoreMBCS(
  statistics: MBCSStatistics,
  prepared: PreparedMBCSModel,
): MBCSScore {
  const multibyteCharacters = statistics.multibyteCharacters.length;
  const invalidCharacters = statistics.invalidCharacters;
  const hits = statistics.multibyteCharacters.reduce(
    (count, value) => count + (prepared.commonCharacters.has(value) ? 1 : 0),
    0,
  );

  let confidence = 0;
  if (multibyteCharacters <= 10 && invalidCharacters === 0) {
    confidence =
      multibyteCharacters === 0 && statistics.totalCharacters < 10 ? 0 : 0.1;
  } else if (multibyteCharacters >= 20 * invalidCharacters) {
    const structuralValidity =
      multibyteCharacters / (multibyteCharacters + invalidCharacters * 20);
    confidence = (hits / multibyteCharacters) * structuralValidity;
  }

  return {
    confidence: Number(Math.min(confidence, 1).toFixed(2)),
    hits,
    multibyteCharacters,
    invalidCharacters,
  };
}
