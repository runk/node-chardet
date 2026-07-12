import type { Match } from '../match';
import type { Context } from '.';
import { generatedSBCSModels } from './models/generated';
import type {
  GeneratedSBCSLanguage,
  GeneratedSBCSModel,
  HighByteDistribution,
} from './models/types';

const N_GRAM_MASK = 0xffffff;

interface Score {
  confidence: number;
  hitRate: number;
  hits: number;
  total: number;
}

interface Candidate extends Match, Score {
  byteLogLikelihood: number;
}

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

function normalizedTrigrams(input: Uint8Array, byteMap: readonly number[]) {
  const trigrams: number[] = [];
  let ignoreSpace = false;
  let ngram = 0;

  for (const byte of input) {
    const mapped = byteMap[byte];
    if (mapped !== 0) {
      if (!(mapped === 0x20 && ignoreSpace)) {
        ngram = ((ngram << 8) + mapped) & N_GRAM_MASK;
        trigrams.push(ngram);
      }
      ignoreSpace = mapped === 0x20;
    }
  }

  ngram = ((ngram << 8) + 0x20) & N_GRAM_MASK;
  trigrams.push(ngram);
  return trigrams;
}

function ngramScore(
  input: Uint8Array,
  byteMap: readonly number[],
  modelNgrams: readonly number[],
): Score {
  const known = new Set(modelNgrams);
  const values = normalizedTrigrams(input, byteMap);
  const hits = values.filter((value) => known.has(value)).length;
  const hitRate = hits / values.length;
  return {
    confidence: hitRate > 0.33 ? 98 : Math.floor(hitRate * 300),
    hits,
    total: values.length,
    hitRate,
  };
}

function byteLogLikelihood(
  input: Uint8Array,
  distribution: HighByteDistribution,
) {
  const counts = new Map(distribution.counts);
  const denominator = distribution.total + 128;
  let highBytes = 0;
  let likelihood = 0;

  for (const byte of input) {
    if (byte >= 0x80) {
      likelihood += Math.log(((counts.get(byte) ?? 0) + 1) / denominator);
      highBytes += 1;
    }
  }

  return highBytes === 0 ? Number.NEGATIVE_INFINITY : likelihood / highBytes;
}

function languageScore(
  input: Uint8Array,
  model: GeneratedSBCSModel,
  language: GeneratedSBCSLanguage,
) {
  return {
    lang: language.language,
    ...ngramScore(input, model.byteMap, language.ngrams),
    byteLogLikelihood: byteLogLikelihood(input, language.highBytes),
  };
}

function candidate(input: Uint8Array, model: GeneratedSBCSModel): Candidate {
  const languages = model.languages.map((language) =>
    languageScore(input, model, language),
  );
  languages.sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.byteLogLikelihood - left.byteLogLikelihood,
  );
  const best = languages[0];
  return {
    name: model.encoding,
    lang: best.lang,
    confidence: best.confidence,
    byteLogLikelihood: best.byteLogLikelihood,
    hits: best.hits,
    total: best.total,
    hitRate: best.hitRate,
  };
}

function statisticallyCompetitive(best: Score, value: Score) {
  const variance =
    (best.hitRate * (1 - best.hitRate)) / best.total +
    (value.hitRate * (1 - value.hitRate)) / value.total;
  return best.hitRate - value.hitRate <= 1.96 * Math.sqrt(variance);
}

export function analyseGeneratedSBCS(context: Context): Match[] {
  const candidates = (generatedSBCSModels as readonly GeneratedSBCSModel[]).map(
    (model) => candidate(context.inputBytes, model),
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
