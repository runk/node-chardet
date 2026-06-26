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

const split = option('split', 'validation');
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

function ok(value) {
  return value ? '✅' : '❌';
}

function percent(value, total) {
  return total === 0 ? '0.00%' : `${((value / total) * 100).toFixed(2)}%`;
}

const summary = {
  files: results.length,
  predicted: results.filter((result) => result.predicted !== null).length,
  encodingCorrect: results.filter((result) => result.encodingCorrect).length,
  languageCorrect: results.filter((result) => result.languageCorrect).length,
};

console.log('Library corpus validation');
console.log('=========================');
console.log(''); // empty line
const summaryRows = [
  ['Split', split],
  ['Files', summary.files],
  ['Coverage', percent(summary.predicted, summary.files)],
  ['Encoding Accuracy', percent(summary.encodingCorrect, summary.files)],
  ['Language Accuracy', percent(summary.languageCorrect, summary.files)],
];
const summaryWidth = Math.max(...summaryRows.map(([label]) => label.length));
for (const [label, value] of summaryRows) {
  console.log(`${label.padEnd(summaryWidth)}  ${value}`);
}
console.log('');
console.table(
  results
    .sort(
      (left, right) =>
        `${left.expected.encoding}/${left.expected.language}`.localeCompare(
          `${right.expected.encoding}/${right.expected.language}`,
        ) || left.expected.path.localeCompare(right.expected.path),
    )
    .map((result) => ({
      expected: result.expected.encoding,
      lang: result.expected.language,
      predicted: result.predicted?.name ?? '<none>',
      predictedLang: result.predicted?.lang ?? '',
      confidence: result.predicted?.confidence ?? '',
      encodingOk: ok(result.encodingCorrect),
      languageOk: ok(result.languageCorrect),
      path: result.expected.path,
    })),
);
