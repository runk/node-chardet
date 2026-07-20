import type { Match } from '../match';
import type { Context } from '.';
import { generatedSBCSModels } from './models/generated';
import type {
  GeneratedSBCSLanguage,
  GeneratedSBCSModel,
  HighByteDistribution,
} from './models/types';

const N_GRAM_MASK = 0xffffff;
// Byte distributions are cheap and sufficiently discriminative to exclude
// most encodings before the more expensive n-gram pass. The corpus needs 11
// candidates to preserve full-result accuracy; keep one additional candidate
// as headroom for unseen inputs.
const MAX_SBCS_CANDIDATES = 12;

interface Score {
  confidence: number;
  hitRate: number;
  hits: number;
  total: number;
}

interface Candidate extends Match, Score {
  byteLogLikelihood: number;
}

interface PreparedSBCSLanguage {
  readonly model: GeneratedSBCSLanguage;
  readonly highByteLogProbabilities: Float64Array;
}

interface PreparedSBCSModel {
  readonly model: GeneratedSBCSModel;
  readonly languages: readonly PreparedSBCSLanguage[];
  readonly ngramLanguageMasks: ReadonlyMap<number, number>;
}

type HighByteCounts = readonly (readonly [number, number])[];

function highByteLogProbabilities(distribution: HighByteDistribution) {
  const counts = new Map(distribution.counts);
  const denominator = distribution.total + 128;
  return Float64Array.from({ length: 128 }, (_, index) =>
    Math.log(((counts.get(index + 0x80) ?? 0) + 1) / denominator),
  );
}

function ngramLanguageMasks(model: GeneratedSBCSModel) {
  const masks = new Map<number, number>();
  model.languages.forEach((language, languageIndex) => {
    for (const ngram of new Set(language.ngrams)) {
      masks.set(ngram, (masks.get(ngram) ?? 0) | (1 << languageIndex));
    }
  });
  return masks;
}

const preparedSBCSModels: readonly PreparedSBCSModel[] = (
  generatedSBCSModels as readonly GeneratedSBCSModel[]
).map((model) => ({
  model,
  languages: model.languages.map((language) => ({
    model: language,
    highByteLogProbabilities: highByteLogProbabilities(language.highBytes),
  })),
  ngramLanguageMasks: ngramLanguageMasks(model),
}));
const maxLanguagesPerModel = Math.max(
  ...preparedSBCSModels.map((model) => model.languages.length),
);

const equivalentEncodingFamilies = [
  ['ISO-8859-1', 'ISO-8859-15', 'windows-1252'],
  ['ISO-8859-2', 'windows-1250'],
  ['ISO-8859-7', 'windows-1253'],
  ['ISO-8859-8', 'windows-1255'],
  ['ISO-8859-9', 'windows-1254'],
  ['ISO-8859-13', 'windows-1257'],
] as const;

function family(name: Match['name']) {
  return equivalentEncodingFamilies.find((value) =>
    value.includes(name as never),
  );
}

function familyPreference(left: Candidate, right: Candidate, c1Bytes: boolean) {
  const leftFamily = family(left.name);
  if (!leftFamily || leftFamily !== family(right.name)) return 0;
  const preferred =
    leftFamily[0] === 'ISO-8859-13' || c1Bytes
      ? [...leftFamily].reverse()
      : [...leftFamily];
  return (
    preferred.indexOf(left.name as never) -
    preferred.indexOf(right.name as never)
  );
}

function ngramHits(
  input: Uint8Array,
  prepared: PreparedSBCSModel,
  hits: Uint32Array,
): number {
  hits.fill(0, 0, prepared.languages.length);
  const byteMap = prepared.model.byteMap;
  let ignoreSpace = false;
  let ngram = 0;
  let total = 0;

  const record = (value: number) => {
    let languageMask = prepared.ngramLanguageMasks.get(value) ?? 0;
    while (languageMask !== 0) {
      const languageBit = languageMask & -languageMask;
      hits[31 - Math.clz32(languageBit)] += 1;
      languageMask ^= languageBit;
    }
  };

  for (let inputIndex = 0; inputIndex < input.length; inputIndex += 1) {
    const byte = input[inputIndex];
    const mapped = byteMap[byte];
    if (mapped !== 0) {
      if (!(mapped === 0x20 && ignoreSpace)) {
        ngram = ((ngram << 8) + mapped) & N_GRAM_MASK;
        total += 1;
        record(ngram);
      }
      ignoreSpace = mapped === 0x20;
    }
  }

  ngram = ((ngram << 8) + 0x20) & N_GRAM_MASK;
  total += 1;
  record(ngram);
  return total;
}

function byteLogLikelihood(
  highByteCounts: HighByteCounts,
  logProbabilities: Float64Array,
) {
  let highBytes = 0;
  let likelihood = 0;

  for (const [byte, count] of highByteCounts) {
    likelihood += logProbabilities[byte - 0x80] * count;
    highBytes += count;
  }

  return highBytes === 0 ? Number.NEGATIVE_INFINITY : likelihood / highBytes;
}

function modelByteLogLikelihood(
  highByteCounts: HighByteCounts,
  prepared: PreparedSBCSModel,
) {
  let best = Number.NEGATIVE_INFINITY;
  for (const language of prepared.languages) {
    best = Math.max(
      best,
      byteLogLikelihood(highByteCounts, language.highByteLogProbabilities),
    );
  }
  return best;
}

function candidate(
  input: Uint8Array,
  highByteCounts: HighByteCounts,
  prepared: PreparedSBCSModel,
  hits: Uint32Array,
): Candidate {
  const { model, languages: preparedLanguages } = prepared;
  const total = ngramHits(input, prepared, hits);
  let bestIndex = 0;
  let bestConfidence = -1;
  let bestByteLogLikelihood = Number.NEGATIVE_INFINITY;
  let bestHitRate = 0;

  for (let index = 0; index < preparedLanguages.length; index += 1) {
    const hitRate = hits[index] / total;
    const confidence = hitRate > 0.33 ? 98 : Math.floor(hitRate * 300);
    const likelihood = byteLogLikelihood(
      highByteCounts,
      preparedLanguages[index].highByteLogProbabilities,
    );
    if (
      confidence > bestConfidence ||
      (confidence === bestConfidence && likelihood > bestByteLogLikelihood)
    ) {
      bestIndex = index;
      bestConfidence = confidence;
      bestByteLogLikelihood = likelihood;
      bestHitRate = hitRate;
    }
  }

  return {
    name: model.encoding,
    lang: preparedLanguages[bestIndex].model.language,
    confidence: bestConfidence,
    byteLogLikelihood: bestByteLogLikelihood,
    hits: hits[bestIndex],
    total,
    hitRate: bestHitRate,
  };
}

function statisticallyCompetitive(best: Score, value: Score) {
  const variance =
    (best.hitRate * (1 - best.hitRate)) / best.total +
    (value.hitRate * (1 - value.hitRate)) / value.total;
  return best.hitRate - value.hitRate <= 1.96 * Math.sqrt(variance);
}

export function analyseGeneratedSBCS(context: Context): Match[] {
  const highByteCounts: [number, number][] = [];
  for (let byte = 0x80; byte <= 0xff; byte += 1) {
    const count = context.byteStats[byte];
    if (count > 0) highByteCounts.push([byte, count]);
  }
  const hits = new Uint32Array(maxLanguagesPerModel);
  const models =
    highByteCounts.length === 0
      ? preparedSBCSModels
      : preparedSBCSModels
          .map((model, index) => ({
            model,
            index,
            likelihood: modelByteLogLikelihood(highByteCounts, model),
          }))
          .sort(
            (left, right) =>
              right.likelihood - left.likelihood || left.index - right.index,
          )
          .slice(0, MAX_SBCS_CANDIDATES)
          .map(({ model }) => model);
  const candidates = models.map((model) =>
    candidate(context.inputBytes, highByteCounts, model, hits),
  );
  candidates.sort((left, right) => right.confidence - left.confidence);

  const strongest = candidates[0];
  const competitive = candidates.filter((value) =>
    statisticallyCompetitive(strongest, value),
  );
  const competitiveNames = new Set(competitive.map((value) => value.name));
  competitive.sort(
    (left, right) =>
      familyPreference(left, right, context.c1Bytes) ||
      right.byteLogLikelihood - left.byteLogLikelihood ||
      right.confidence - left.confidence,
  );
  const remaining = candidates.filter(
    (value) => !competitiveNames.has(value.name),
  );

  let confidenceCeiling = 1;
  return [...competitive, ...remaining]
    .filter((value) => value.confidence > 0)
    .map(({ name, lang, confidence }) => {
      confidenceCeiling = Math.min(confidenceCeiling, confidence / 100);
      return { name, lang, confidence: confidenceCeiling };
    });
}
