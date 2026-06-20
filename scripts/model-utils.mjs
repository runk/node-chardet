import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function normalizedBytes(buffer, byteMap) {
  const normalized = [];
  let ignoreSpace = false;
  for (const byte of buffer) {
    const mapped = byteMap[byte];
    if (mapped !== 0) {
      if (!(mapped === 0x20 && ignoreSpace)) normalized.push(mapped);
      ignoreSpace = mapped === 0x20;
    }
  }
  normalized.push(0x20);
  return normalized;
}

function trigrams(buffer, byteMap) {
  const values = [];
  let trigram = 0;
  for (const byte of normalizedBytes(buffer, byteMap)) {
    trigram = ((trigram << 8) + byte) & 0xffffff;
    values.push(trigram);
  }
  return values;
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

function confidence(buffer, byteMap, modelNgrams) {
  const known = new Set(modelNgrams);
  const values = trigrams(buffer, byteMap);
  const hits = values.filter((trigram) => known.has(trigram)).length;
  const rawPercent = hits / values.length;
  return rawPercent > 0.33 ? 98 : Math.floor(rawPercent * 300);
}

function compileSingleByteModels() {
  const models = [];
  for (const encoding of manifest.encodings) {
    if (encoding.name === 'CP949') continue;

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
      return { language, ngrams: detectorNgrams(buffers, byteMap) };
    });
    models.push({ encoding: encoding.name, byteMap, languages });
  }
  return models;
}

function evaluate(models) {
  const tests = corpusIndex.filter(
    (row) => row.split === 'test' && row.encoding !== 'CP949',
  );
  const results = tests.map((test) => {
    const buffer = readFileSync(join(generatedCorpus, test.path));
    const candidates = models.map((model) => {
      let best = { confidence: -1, language: undefined };
      for (let index = model.languages.length - 1; index >= 0; index--) {
        const language = model.languages[index];
        const score = confidence(buffer, model.byteMap, language.ngrams);
        if (score > best.confidence) {
          best = { confidence: score, language: language.language };
        }
      }
      return { encoding: model.encoding, ...best };
    });
    candidates.sort((left, right) => right.confidence - left.confidence);
    const predicted = candidates[0];
    return {
      expected: { encoding: test.encoding, language: test.language },
      predicted,
      encodingCorrect: predicted.encoding === test.encoding,
      languageCorrect:
        predicted.encoding === test.encoding &&
        predicted.language === test.language,
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

function javascriptString(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function hex(value, width) {
  return `0x${value.toString(16).padStart(width, '0')}`;
}

function serializeModels(models) {
  const lines = [
    '// Generated by npm run models:build. Do not edit manually.',
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
      lines.push('      },');
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('] as const;', '');
  return lines.join('\n');
}

export function compileModels() {
  const models = compileSingleByteModels();
  return { models, report: evaluate(models) };
}

export function buildModels(modelPath, evaluationPath) {
  const { models, report } = compileModels();
  mkdirSync(dirname(modelPath), { recursive: true });
  mkdirSync(dirname(evaluationPath), { recursive: true });
  writeFileSync(modelPath, serializeModels(models));
  writeFileSync(evaluationPath, `${JSON.stringify(report, null, 2)}\n`);
}
