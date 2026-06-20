import { compileModels } from './model-utils.mjs';

const { report } = compileModels();
for (const result of report.results) {
  const expected = `${result.expected.encoding}/${result.expected.language}`;
  const predicted = `${result.predicted.encoding}/${result.predicted.language}`;
  const marker = result.encodingCorrect ? 'PASS' : 'FAIL';
  console.log(
    `${marker} ${expected.padEnd(24)} -> ${predicted.padEnd(24)} ${result.predicted.confidence}%`,
  );
}

console.log(
  `\nEncoding: ${report.summary.encodingCorrect}/${report.summary.tests}; ` +
    `language: ${report.summary.languageCorrect}/${report.summary.tests}; ` +
    `top-score ties: ${report.summary.topScoreTies}`,
);
