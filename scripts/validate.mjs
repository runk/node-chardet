import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse } from '../src/index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedCorpus = join(root, 'corpus', 'generated');
const corpusIndex = JSON.parse(
  readFileSync(join(generatedCorpus, 'index.json'), 'utf8'),
);

function option(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function percent(value, total) {
  return total === 0 ? '0.00%' : `${((value / total) * 100).toFixed(2)}%`;
}

function increment(object, key) {
  object[key] = (object[key] ?? 0) + 1;
}

const split = option('split', 'all');
const rows = corpusIndex.filter(
  (row) => split === 'all' || row.split === split,
);
if (rows.length === 0) {
  throw new Error(`No corpus files matched split: ${split}`);
}

const results = rows.map((row) => {
  const buffer = readFileSync(join(generatedCorpus, row.path));
  const matches = analyse(buffer);
  const predicted = matches[0] ?? null;
  return {
    expected: {
      encoding: row.encoding,
      language: row.language,
      split: row.split,
      path: row.path,
    },
    predicted,
    encodingCorrect: predicted?.name === row.encoding,
    languageCorrect:
      predicted?.name === row.encoding && predicted?.lang === row.language,
  };
});

const summary = {
  files: results.length,
  encodingCorrect: results.filter((result) => result.encodingCorrect).length,
  languageCorrect: results.filter((result) => result.languageCorrect).length,
  noPrediction: results.filter((result) => result.predicted === null).length,
};

const bySplit = {};
const byExpectedEncoding = {};
const topPredictions = {};

for (const result of results) {
  const splitSummary = (bySplit[result.expected.split] ??= {
    files: 0,
    encodingCorrect: 0,
    languageCorrect: 0,
  });
  splitSummary.files += 1;
  if (result.encodingCorrect) splitSummary.encodingCorrect += 1;
  if (result.languageCorrect) splitSummary.languageCorrect += 1;

  const encodingSummary = (byExpectedEncoding[result.expected.encoding] ??= {
    files: 0,
    encodingCorrect: 0,
    languageCorrect: 0,
    predictions: {},
  });
  encodingSummary.files += 1;
  if (result.encodingCorrect) encodingSummary.encodingCorrect += 1;
  if (result.languageCorrect) encodingSummary.languageCorrect += 1;
  increment(encodingSummary.predictions, result.predicted?.name ?? '<none>');
  increment(topPredictions, result.predicted?.name ?? '<none>');
}

console.log('Library corpus validation');
console.log('=========================');
console.log(`Split: ${split}`);
console.log(`Files: ${summary.files}`);
console.log(
  `Encoding correct: ${summary.encodingCorrect}/${summary.files} (${percent(
    summary.encodingCorrect,
    summary.files,
  )})`,
);
console.log(
  `Language correct: ${summary.languageCorrect}/${summary.files} (${percent(
    summary.languageCorrect,
    summary.files,
  )})`,
);
console.log(`No prediction: ${summary.noPrediction}`);

console.log('\nBy split');
console.table(
  Object.entries(bySplit).map(([name, item]) => ({
    split: name,
    files: item.files,
    encodingCorrect: item.encodingCorrect,
    encodingAccuracy: percent(item.encodingCorrect, item.files),
    languageCorrect: item.languageCorrect,
    languageAccuracy: percent(item.languageCorrect, item.files),
  })),
);

console.log('\nBy expected encoding');
console.table(
  Object.entries(byExpectedEncoding)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([encoding, item]) => ({
      encoding,
      files: item.files,
      encodingCorrect: item.encodingCorrect,
      encodingAccuracy: percent(item.encodingCorrect, item.files),
      languageCorrect: item.languageCorrect,
      mostCommonPrediction: Object.entries(item.predictions).sort(
        ([leftName, leftCount], [rightName, rightCount]) =>
          rightCount - leftCount || leftName.localeCompare(rightName),
      )[0][0],
    })),
);

console.log('\nTop predicted encodings');
console.table(
  Object.entries(topPredictions)
    .sort(
      ([leftName, leftCount], [rightName, rightCount]) =>
        rightCount - leftCount || leftName.localeCompare(rightName),
    )
    .map(([encoding, count]) => ({ encoding, count })),
);

const failures = results.filter((result) => !result.encodingCorrect);
console.log('\nFirst 20 encoding mismatches');
console.table(
  failures.slice(0, 20).map((result) => ({
    expected: result.expected.encoding,
    language: result.expected.language,
    split: result.expected.split,
    predicted: result.predicted?.name ?? '<none>',
    predictedLanguage: result.predicted?.lang ?? '',
    confidence: result.predicted?.confidence ?? '',
    path: result.expected.path,
  })),
);
