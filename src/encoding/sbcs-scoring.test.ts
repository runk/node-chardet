import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { Context } from '.';
import { generatedSBCSModels } from './models/generated';
import type { GeneratedSBCSModel } from './models/types';
import { analyseGeneratedSBCS } from './sbcs';
import { prepareSBCSModels, scoreSBCS, trigrams } from './sbcs-scoring';

const preparedModels = prepareSBCSModels(
  generatedSBCSModels as readonly GeneratedSBCSModel[],
);
const reversedPreparedModels = prepareSBCSModels(
  [...(generatedSBCSModels as readonly GeneratedSBCSModel[])].reverse(),
);

function context(input: Uint8Array): Context {
  const byteStats = Array<number>(256).fill(0);
  for (const byte of input) byteStats[byte] += 1;
  return {
    byteStats,
    c1Bytes: input.some((byte) => byte >= 0x80 && byte <= 0x9f),
    rawInput: input,
    rawLen: input.length,
    inputBytes: input,
    inputLen: input.length,
  };
}

describe('shared SBCS scoring', () => {
  it('normalizes ignored bytes and repeated spaces before scoring trigrams', () => {
    const byteMap = Array.from({ length: 256 }, (_, byte) => byte);
    byteMap[0x27] = 0;

    expect(
      trigrams(new Uint8Array([0x41, 0x20, 0x20, 0x27, 0x42]), byteMap),
    ).toEqual([0x41, 0x4120, 0x412042, 0x204220]);
  });

  it.each([
    new Uint8Array(),
    new Uint8Array([0x41]),
    new Uint8Array([0xff]),
    new Uint8Array([0xc3]),
    new Uint8Array([0x00, 0xff, 0x80, 0x00]),
  ])('returns deterministic finite confidence scores for %j', (input) => {
    const first = scoreSBCS(input, preparedModels);
    const second = scoreSBCS(input, preparedModels);

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
    expect(
      first.every(
        ({ confidence }) =>
          Number.isFinite(confidence) && confidence >= 0 && confidence <= 100,
      ),
    ).toBe(true);
  });

  it('keeps the runtime wrapper aligned with the shared scorer on the corpus', () => {
    const corpusRoot = path.join(__dirname, '../../corpus/generated');
    const corpusIndex = JSON.parse(
      fs.readFileSync(path.join(corpusRoot, 'index.json'), 'utf8'),
    ) as { encoding: string; path: string }[];
    const modelNames = new Set(
      generatedSBCSModels.map(({ encoding }) => encoding as string),
    );
    const rows = corpusIndex.filter(({ encoding }) => modelNames.has(encoding));

    for (const row of rows) {
      const input = fs.readFileSync(path.join(corpusRoot, row.path));
      const raw = scoreSBCS(input, preparedModels).find(
        ({ confidence }) => confidence > 0,
      );
      const runtime = analyseGeneratedSBCS(context(input))[0];

      expect(runtime, row.path).toEqual({
        name: raw?.encoding,
        lang: raw?.language,
        confidence: raw ? raw.confidence / 100 : undefined,
      });
    }
  });

  it.each([
    ['windows-1252/en/test/community-garden.bin', 'ISO-8859-1'],
    ['windows-1250/cs/test/community-garden.bin', 'ISO-8859-2'],
    ['windows-1253/el/test/community-garden.bin', 'ISO-8859-7'],
    ['windows-1255/he/test/community-garden.bin', 'ISO-8859-8'],
    ['windows-1254/tr/test/community-garden.bin', 'ISO-8859-9'],
    ['windows-1257/lt/test/community-garden.bin', 'ISO-8859-13'],
  ])(
    'keeps the canonical byte-equivalent result for %s when models are reordered',
    (fixture, expected) => {
      const input = fs.readFileSync(
        path.join(__dirname, '../../corpus/generated', fixture),
      );
      expect(scoreSBCS(input, preparedModels)[0].encoding).toBe(expected);
      expect(scoreSBCS(input, reversedPreparedModels)[0].encoding).toBe(
        expected,
      );
    },
  );
});
