import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prepareSBCSModels,
  scoreSBCS,
  trigrams,
} from '../src/encoding/sbcs-scoring.ts';
import { big5, euc_jp, euc_kr, gb_18030, sjis } from '../src/encoding/mbcs.ts';
import { prepareMBCSModel, scoreMBCS } from '../src/encoding/mbcs-scoring.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corpus = join(root, 'corpus');
const generatedCorpus = join(corpus, 'generated');

export const generatedModel = join(
  root,
  'src',
  'encoding',
  'models',
  'generated.ts',
);
export const generatedEvaluation = join(corpus, 'model-evaluation.json');

const manifest = JSON.parse(
  readFileSync(join(corpus, 'manifest.json'), 'utf8'),
);
const corpusIndex = JSON.parse(
  readFileSync(join(generatedCorpus, 'index.json'), 'utf8'),
);

function iconv(input, from, to, discardInvalid = false) {
  const args = [];
  if (discardInvalid) args.push('-c');
  args.push('-f', from, '-t', to);
  const result = spawnSync('iconv', args, {
    input,
    maxBuffer: 16 * 1024 * 1024,
  });
  const warning = result.stderr.toString().trim();
  const ignoredInvalidCharacters =
    discardInvalid && warning.includes('invalid characters');
  if (result.status !== 0 && !ignoredInvalidCharacters) {
    throw new Error(`iconv ${from} -> ${to} failed: ${warning}`);
  }
  return result.stdout;
}

function splitAtNull(buffer) {
  const chunks = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) {
      chunks.push(buffer.subarray(start, i));
      start = i + 1;
    }
  }
  if (start !== buffer.length) chunks.push(buffer.subarray(start));
  return chunks;
}

function byteMapFor(encoding) {
  const firstByte = 0x20;
  const source = [];
  for (let byte = firstByte; byte <= 0xff; byte++) source.push(byte, 0);

  const decoded = iconv(Buffer.from(source), encoding, 'UTF-8', true);
  const characters = decoded.toString('utf8').split('\0').slice(0, -1);
  if (characters.length !== 0x100 - firstByte) {
    throw new Error(`Could not derive a complete byte map for ${encoding}`);
  }

  const lowercase = characters.map((character) => {
    if (!/^\p{L}$/u.test(character)) return '';
    const result = character.toLowerCase();
    return [...result].length === 1 ? result : '';
  });
  const encodedLowercase = iconv(
    Buffer.from(`${lowercase.join('\0')}\0`, 'utf8'),
    'UTF-8',
    encoding,
    true,
  );
  const lowercaseBytes = splitAtNull(encodedLowercase);
  if (lowercaseBytes.length !== characters.length) {
    throw new Error(`Could not encode the lowercase byte map for ${encoding}`);
  }

  const byteMap = new Array(256).fill(0x20);
  byteMap[0x27] = 0;
  for (let index = 0; index < characters.length; index++) {
    if (lowercaseBytes[index].length === 1) {
      byteMap[firstByte + index] = lowercaseBytes[index][0];
    }
  }
  return byteMap;
}

function detectorNgrams(buffers, byteMap) {
  const counts = new Map();
  for (const buffer of buffers) {
    for (const trigram of trigrams(buffer, byteMap)) {
      counts.set(trigram, (counts.get(trigram) ?? 0) + 1);
    }
  }
  const ranked = [...counts].sort(
    ([left, leftCount], [right, rightCount]) =>
      rightCount - leftCount || left - right,
  );
  const hasHighByte = (trigram) =>
    ((trigram >> 16) & 0xff) >= 0x80 ||
    ((trigram >> 8) & 0xff) >= 0x80 ||
    (trigram & 0xff) >= 0x80;
  const selected = ranked
    .filter(([trigram]) => hasHighByte(trigram))
    .slice(0, 24);
  const selectedValues = new Set(selected.map(([trigram]) => trigram));
  selected.push(
    ...ranked
      .filter(([trigram]) => !selectedValues.has(trigram))
      .slice(0, 64 - selected.length),
  );
  return selected
    .map(([trigram]) => trigram)
    .sort((left, right) => left - right);
}

function highByteDistribution(buffers) {
  const counts = new Map();
  let total = 0;
  for (const buffer of buffers) {
    for (const byte of buffer) {
      if (byte >= 0x80) {
        counts.set(byte, (counts.get(byte) ?? 0) + 1);
        total += 1;
      }
    }
  }
  return {
    total,
    counts: [...counts].sort(([left], [right]) => left - right),
  };
}

function decodedText(buffer, encodingName) {
  const encoding = manifest.encodings.find(
    (candidate) => candidate.name === encodingName,
  );
  if (!encoding) throw new Error(`Missing manifest encoding: ${encodingName}`);
  return iconv(buffer, encoding.iconv, 'UTF-8');
}

function byteEquivalent(buffer, leftEncoding, rightEncoding) {
  try {
    return decodedText(buffer, leftEncoding).equals(
      decodedText(buffer, rightEncoding),
    );
  } catch {
    return false;
  }
}

function compileSingleByteModels() {
  const models = [];
  for (const encoding of manifest.encodings) {
    if (encoding.family === 'multibyte') continue;

    const byteMap = byteMapFor(encoding.iconv);
    const languages = encoding.languages.map((language) => {
      const buffers = corpusIndex
        .filter(
          (row) =>
            row.encoding === encoding.name &&
            row.language === language &&
            row.split === 'train',
        )
        .map((row) => readFileSync(join(generatedCorpus, row.path)));
      if (buffers.length !== 4) {
        throw new Error(
          `Expected four training files for ${encoding.name}/${language}`,
        );
      }
      return {
        language,
        ngrams: detectorNgrams(buffers, byteMap),
        highBytes: highByteDistribution(buffers),
      };
    });
    models.push({ encoding: encoding.name, byteMap, languages });
  }
  return models;
}

const multibyteRecognisers = new Map([
  ['Shift_JIS', new sjis()],
  ['Big5', new big5()],
  ['EUC-JP', new euc_jp()],
  ['EUC-KR', new euc_kr()],
  ['GB18030', new gb_18030()],
]);

function detectorContext(buffer) {
  const byteStats = Array(256).fill(0);
  for (const byte of buffer) byteStats[byte] += 1;
  return {
    byteStats,
    c1Bytes: buffer.some((byte) => byte >= 0x80 && byte <= 0x9f),
    rawInput: buffer,
    rawLen: buffer.length,
    inputBytes: buffer,
    inputLen: buffer.length,
  };
}

function compileMultibyteModels() {
  return manifest.encodings
    .filter(
      (encoding) =>
        encoding.family === 'multibyte' && encoding.runtime !== false,
    )
    .map((encoding) => {
      const recogniser = multibyteRecognisers.get(encoding.name);
      if (!recogniser) {
        throw new Error(`Missing multibyte recogniser: ${encoding.name}`);
      }
      if (encoding.languages.length !== 1) {
        throw new Error(
          `Expected one language for multibyte model: ${encoding.name}`,
        );
      }
      const language = encoding.languages[0];
      const frequencies = new Map();
      let total = 0;
      for (const row of corpusIndex.filter(
        (candidate) =>
          candidate.encoding === encoding.name &&
          candidate.language === language &&
          candidate.split === 'train',
      )) {
        const buffer = readFileSync(join(generatedCorpus, row.path));
        const statistics = recogniser.statistics(detectorContext(buffer));
        if (statistics.invalidCharacters !== 0) {
          throw new Error(
            `${encoding.name}/${language}/${row.document} has invalid multibyte characters`,
          );
        }
        for (const value of statistics.multibyteCharacters) {
          frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
          total += 1;
        }
      }
      if (total === 0) {
        throw new Error(`Empty multibyte model: ${encoding.name}/${language}`);
      }
      return {
        encoding: encoding.name,
        language,
        total,
        commonCharacters: [...frequencies]
          .sort(
            ([left, leftCount], [right, rightCount]) =>
              rightCount - leftCount || left - right,
          )
          .slice(0, 128)
          .map(([value]) => value)
          .sort((left, right) => left - right),
      };
    });
}

function evaluate(models) {
  const preparedModels = prepareSBCSModels(models);
  const modelNames = new Set(models.map((model) => model.encoding));
  const tests = corpusIndex.filter(
    (row) => row.split === 'test' && modelNames.has(row.encoding),
  );
  const results = tests.map((test) => {
    const buffer = readFileSync(join(generatedCorpus, test.path));
    const candidates = scoreSBCS(buffer, preparedModels);
    const predicted = candidates[0];
    const encodingExact = predicted.encoding === test.encoding;
    const encodingEquivalent =
      !encodingExact &&
      byteEquivalent(buffer, test.encoding, predicted.encoding);
    const encodingCorrect = encodingExact || encodingEquivalent;
    return {
      expected: { encoding: test.encoding, language: test.language },
      predicted,
      encodingExact,
      encodingEquivalent,
      encodingCorrect,
      languageCorrect: encodingCorrect && predicted.language === test.language,
      tiedAtTop: candidates.filter(
        (candidate) => candidate.confidence === predicted.confidence,
      ).length,
      candidates,
    };
  });

  const confusion = {};
  for (const result of results) {
    const expected = result.expected.encoding;
    const predicted = result.predicted.encoding;
    confusion[expected] ??= {};
    confusion[expected][predicted] = (confusion[expected][predicted] ?? 0) + 1;
  }

  return {
    summary: {
      tests: results.length,
      encodingExact: results.filter((result) => result.encodingExact).length,
      encodingEquivalent: results.filter((result) => result.encodingEquivalent)
        .length,
      encodingCorrect: results.filter((result) => result.encodingCorrect)
        .length,
      languageCorrect: results.filter((result) => result.languageCorrect)
        .length,
      topScoreTies: results.filter((result) => result.tiedAtTop > 1).length,
    },
    confusion,
    results,
  };
}

function evaluateMultibyte(models) {
  const preparedModels = models.map((model) => ({
    model,
    prepared: prepareMBCSModel(model),
    recogniser: multibyteRecognisers.get(model.encoding),
  }));
  const tests = corpusIndex.filter(
    (row) =>
      row.split === 'test' &&
      models.some((model) => model.encoding === row.encoding),
  );
  const results = tests.map((test) => {
    const buffer = readFileSync(join(generatedCorpus, test.path));
    const candidates = preparedModels
      .map(({ model, prepared, recogniser }) => {
        const score = scoreMBCS(
          recogniser.statistics(detectorContext(buffer)),
          prepared,
        );
        return {
          encoding: model.encoding,
          language: model.language,
          ...score,
        };
      })
      .sort(
        (left, right) =>
          right.confidence - left.confidence ||
          left.encoding.localeCompare(right.encoding),
      );
    return {
      expected: { encoding: test.encoding, language: test.language },
      predicted: candidates[0],
      encodingCorrect: candidates[0].encoding === test.encoding,
      languageCorrect: candidates[0].language === test.language,
      candidates,
    };
  });
  return {
    summary: {
      tests: results.length,
      encodingCorrect: results.filter((result) => result.encodingCorrect)
        .length,
      languageCorrect: results.filter((result) => result.languageCorrect)
        .length,
    },
    results,
  };
}

function javascriptString(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function hex(value, width) {
  return `0x${value.toString(16).padStart(width, '0')}`;
}

function serializeModels(models, multibyteModels) {
  const lines = [
    '// Generated by npm run models:build. Do not edit manually.',
    "import type { GeneratedMBCSModel } from './types';",
    '',
    'export const generatedSBCSModels = [',
  ];
  for (const model of models) {
    lines.push('  {');
    lines.push(`    encoding: ${javascriptString(model.encoding)},`);
    lines.push('    byteMap: [');
    for (let index = 0; index < model.byteMap.length; index += 12) {
      lines.push(
        `      ${model.byteMap
          .slice(index, index + 12)
          .map((value) => hex(value, 2))
          .join(', ')},`,
      );
    }
    lines.push('    ],');
    lines.push('    languages: [');
    for (const language of model.languages) {
      lines.push('      {');
      lines.push(`        language: ${javascriptString(language.language)},`);
      lines.push('        ngrams: [');
      for (let index = 0; index < language.ngrams.length; index += 7) {
        lines.push(
          `          ${language.ngrams
            .slice(index, index + 7)
            .map((value) => hex(value, 6))
            .join(', ')},`,
        );
      }
      lines.push('        ],');
      lines.push('        highBytes: {');
      lines.push(`          total: ${language.highBytes.total},`);
      lines.push('          counts: [');
      for (
        let index = 0;
        index < language.highBytes.counts.length;
        index += 1
      ) {
        lines.push(
          `            ${language.highBytes.counts
            .slice(index, index + 1)
            .map(([byte, count]) => `[${hex(byte, 2)}, ${count}]`)
            .join(', ')},`,
        );
      }
      lines.push('          ],');
      lines.push('        },');
      lines.push('      },');
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('] as const;', '');
  lines.push(
    'export const generatedMBCSModels: readonly GeneratedMBCSModel[] = [',
  );
  for (const model of multibyteModels) {
    lines.push('  {');
    lines.push(`    encoding: ${javascriptString(model.encoding)},`);
    lines.push(`    language: ${javascriptString(model.language)},`);
    lines.push(`    total: ${model.total},`);
    lines.push('    commonCharacters: [');
    for (let index = 0; index < model.commonCharacters.length; index += 6) {
      lines.push(
        `      ${model.commonCharacters
          .slice(index, index + 6)
          .map((value) => hex(value, 8))
          .join(', ')},`,
      );
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('];', '');
  return lines.join('\n');
}

export function compileModels() {
  const models = compileSingleByteModels();
  const multibyteModels = compileMultibyteModels();
  return {
    models,
    multibyteModels,
    report: {
      ...evaluate(models),
      multibyte: evaluateMultibyte(multibyteModels),
    },
  };
}

export function buildModels(modelPath, evaluationPath) {
  const { models, multibyteModels, report } = compileModels();
  mkdirSync(dirname(modelPath), { recursive: true });
  mkdirSync(dirname(evaluationPath), { recursive: true });
  writeFileSync(modelPath, serializeModels(models, multibyteModels));
  writeFileSync(evaluationPath, `${JSON.stringify(report, null, 2)}\n`);
}
