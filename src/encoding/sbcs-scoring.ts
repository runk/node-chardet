import type { EncodingName } from '../match';
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

export interface SBCSScore {
  readonly confidence: number;
  readonly hitRate: number;
  readonly hits: number;
  readonly total: number;
}

export interface SBCSCandidate extends SBCSScore {
  readonly encoding: EncodingName;
  readonly language: string;
  readonly byteLogLikelihood: number;
}

interface RankedSBCSCandidate extends SBCSCandidate {
  readonly modelIndex: number;
  readonly byteDifferences: ReadonlyMap<EncodingName, ReadonlySet<number>>;
}

interface PreparedSBCSLanguage {
  readonly model: GeneratedSBCSLanguage;
  readonly highByteLogProbabilities: Float64Array;
}

export interface PreparedSBCSModel {
  readonly model: GeneratedSBCSModel;
  readonly modelIndex: number;
  readonly languages: readonly PreparedSBCSLanguage[];
  readonly ngramLanguageIndexes: ReadonlyMap<number, readonly number[]>;
  readonly byteDifferences: ReadonlyMap<EncodingName, ReadonlySet<number>>;
}

type HighByteCounts = readonly (readonly [number, number])[];

export const equivalentEncodingFamilies = [
  ['ISO-8859-1', 'ISO-8859-15', 'windows-1252'],
  ['ISO-8859-2', 'windows-1250'],
  ['ISO-8859-7', 'windows-1253'],
  ['ISO-8859-8', 'windows-1255'],
  ['ISO-8859-9', 'windows-1254'],
  ['ISO-8859-13', 'windows-1257'],
] as const;

function scanTrigrams(
  input: Uint8Array,
  byteMap: readonly number[],
  record: (value: number) => void,
): number {
  let ignoreSpace = false;
  let ngram = 0;
  let total = 0;

  const append = (mapped: number) => {
    ngram = ((ngram << 8) + mapped) & N_GRAM_MASK;
    total += 1;
    record(ngram);
  };

  for (const byte of input) {
    const mapped = byteMap[byte];
    if (mapped !== 0) {
      if (!(mapped === 0x20 && ignoreSpace)) append(mapped);
      ignoreSpace = mapped === 0x20;
    }
  }

  append(0x20);
  return total;
}

export function trigrams(
  input: Uint8Array,
  byteMap: readonly number[],
): number[] {
  const values: number[] = [];
  scanTrigrams(input, byteMap, (value) => values.push(value));
  return values;
}

export function statisticallyCompetitive(
  best: SBCSScore,
  candidate: SBCSScore,
): boolean {
  const variance =
    (best.hitRate * (1 - best.hitRate)) / best.total +
    (candidate.hitRate * (1 - candidate.hitRate)) / candidate.total;
  return best.hitRate - candidate.hitRate <= 1.96 * Math.sqrt(variance);
}

function highByteCounts(input: Uint8Array): HighByteCounts {
  const counts = new Uint32Array(128);
  for (const byte of input) {
    if (byte >= 0x80) counts[byte - 0x80] += 1;
  }

  const result: [number, number][] = [];
  counts.forEach((count, index) => {
    if (count > 0) result.push([index + 0x80, count]);
  });
  return result;
}

function highByteLogProbabilities(distribution: HighByteDistribution) {
  const counts = new Map(distribution.counts);
  const denominator = distribution.total + 128;
  return Float64Array.from({ length: 128 }, (_, index) =>
    Math.log(((counts.get(index + 0x80) ?? 0) + 1) / denominator),
  );
}

function ngramLanguageIndexes(model: GeneratedSBCSModel) {
  const indexes = new Map<number, number[]>();
  model.languages.forEach((language, languageIndex) => {
    for (const ngram of new Set(language.ngrams)) {
      const languageIndexes = indexes.get(ngram) ?? [];
      languageIndexes.push(languageIndex);
      indexes.set(ngram, languageIndexes);
    }
  });
  return indexes;
}

export function prepareSBCSModels(
  models: readonly GeneratedSBCSModel[],
): readonly PreparedSBCSModel[] {
  return models.map((model, modelIndex) => ({
    model,
    modelIndex,
    languages: model.languages.map((language) => ({
      model: language,
      highByteLogProbabilities: highByteLogProbabilities(language.highBytes),
    })),
    ngramLanguageIndexes: ngramLanguageIndexes(model),
    byteDifferences: new Map(
      model.byteDifferences.map(({ encoding, bytes }) => [
        encoding,
        new Set(bytes),
      ]),
    ),
  }));
}

function byteLogLikelihood(
  counts: HighByteCounts,
  logProbabilities: Float64Array,
) {
  let highBytes = 0;
  let likelihood = 0;

  for (const [byte, count] of counts) {
    likelihood += logProbabilities[byte - 0x80] * count;
    highBytes += count;
  }

  return highBytes === 0
    ? Number.NEGATIVE_INFINITY
    : Number((likelihood / highBytes).toFixed(12));
}

function modelByteLogLikelihood(
  counts: HighByteCounts,
  prepared: PreparedSBCSModel,
) {
  let best = Number.NEGATIVE_INFINITY;
  for (const language of prepared.languages) {
    best = Math.max(
      best,
      byteLogLikelihood(counts, language.highByteLogProbabilities),
    );
  }
  return best;
}

function candidate(
  input: Uint8Array,
  counts: HighByteCounts,
  prepared: PreparedSBCSModel,
  hits: Uint32Array,
): RankedSBCSCandidate {
  hits.fill(0, 0, prepared.languages.length);
  const total = scanTrigrams(input, prepared.model.byteMap, (value) => {
    for (const languageIndex of prepared.ngramLanguageIndexes.get(value) ??
      []) {
      hits[languageIndex] += 1;
    }
  });

  let bestIndex = 0;
  let bestConfidence = -1;
  let bestByteLogLikelihood = Number.NEGATIVE_INFINITY;
  let bestHitRate = 0;

  for (let index = 0; index < prepared.languages.length; index += 1) {
    const hitRate = hits[index] / total;
    const confidence = hitRate > 0.33 ? 98 : Math.floor(hitRate * 300);
    const likelihood = byteLogLikelihood(
      counts,
      prepared.languages[index].highByteLogProbabilities,
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
    encoding: prepared.model.encoding,
    language: prepared.languages[bestIndex].model.language,
    confidence: bestConfidence,
    byteLogLikelihood: bestByteLogLikelihood,
    hits: hits[bestIndex],
    total,
    hitRate: bestHitRate,
    modelIndex: prepared.modelIndex,
    byteDifferences: prepared.byteDifferences,
  };
}

function family(name: EncodingName) {
  return equivalentEncodingFamilies.find((value) =>
    value.includes(name as never),
  );
}

function familyPreference(
  left: RankedSBCSCandidate,
  right: RankedSBCSCandidate,
  input: Uint8Array,
) {
  const leftFamily = family(left.encoding);
  if (!leftFamily || leftFamily !== family(right.encoding)) return 0;
  const differences = left.byteDifferences.get(right.encoding);
  if (!differences) return 0;
  const observedDifferences = input.filter((byte) => differences.has(byte));
  if (observedDifferences.some((byte) => byte >= 0x80 && byte <= 0x9f)) {
    const leftWindows = left.encoding.startsWith('windows-');
    const rightWindows = right.encoding.startsWith('windows-');
    if (leftWindows !== rightWindows) return leftWindows ? -1 : 1;
  }
  if (observedDifferences.length > 0) return 0;
  return (
    leftFamily.indexOf(left.encoding as never) -
    leftFamily.indexOf(right.encoding as never)
  );
}

export function scoreSBCS(
  input: Uint8Array,
  preparedModels: readonly PreparedSBCSModel[],
): SBCSCandidate[] {
  if (preparedModels.length === 0) return [];

  const counts = highByteCounts(input);
  const hits = new Uint32Array(
    Math.max(...preparedModels.map((model) => model.languages.length)),
  );
  const models =
    counts.length === 0
      ? preparedModels
      : preparedModels
          .map((model) => ({
            model,
            likelihood: modelByteLogLikelihood(counts, model),
          }))
          .sort(
            (left, right) =>
              right.likelihood - left.likelihood ||
              left.model.modelIndex - right.model.modelIndex,
          )
          .slice(0, MAX_SBCS_CANDIDATES)
          .map(({ model }) => model);
  const candidates = models.map((model) =>
    candidate(input, counts, model, hits),
  );
  candidates.sort(
    (left, right) =>
      right.confidence - left.confidence || left.modelIndex - right.modelIndex,
  );

  const strongest = candidates[0];
  const competitive = candidates.filter((value) =>
    statisticallyCompetitive(strongest, value),
  );
  const competitiveNames = new Set(competitive.map((value) => value.encoding));
  competitive.sort(
    (left, right) =>
      familyPreference(left, right, input) ||
      right.byteLogLikelihood - left.byteLogLikelihood ||
      right.confidence - left.confidence ||
      left.modelIndex - right.modelIndex,
  );
  const remaining = candidates.filter(
    (value) => !competitiveNames.has(value.encoding),
  );

  return [...competitive, ...remaining].map(
    ({
      modelIndex: _modelIndex,
      byteDifferences: _byteDifferences,
      ...value
    }) => value,
  );
}
