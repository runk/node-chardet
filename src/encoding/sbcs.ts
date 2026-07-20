import type { Match } from '../match';
import type { Context } from '.';
import { generatedSBCSModels } from './models/generated';
import type { GeneratedSBCSModel } from './models/types';
import { prepareSBCSModels, scoreSBCS } from './sbcs-scoring';

const preparedSBCSModels = prepareSBCSModels(
  generatedSBCSModels as readonly GeneratedSBCSModel[],
);

export function analyseGeneratedSBCS(context: Context): Match[] {
  let confidenceCeiling = 1;
  return scoreSBCS(context.inputBytes, preparedSBCSModels, context.c1Bytes)
    .filter((value) => value.confidence > 0)
    .map(({ encoding, language, confidence }) => {
      confidenceCeiling = Math.min(confidenceCeiling, confidence / 100);
      return {
        name: encoding,
        lang: language,
        confidence: confidenceCeiling,
      };
    });
}
