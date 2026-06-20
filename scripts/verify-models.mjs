import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildModels,
  generatedEvaluation,
  generatedModel,
} from './model-utils.mjs';

const temporaryRoot = mkdtempSync(join(tmpdir(), 'node-chardet-models-'));
try {
  const rebuiltModel = join(temporaryRoot, 'generated.ts');
  const rebuiltEvaluation = join(temporaryRoot, 'model-evaluation.json');
  buildModels(rebuiltModel, rebuiltEvaluation);
  if (!readFileSync(rebuiltModel).equals(readFileSync(generatedModel))) {
    throw new Error('Generated detector models are out of date');
  }
  if (
    !readFileSync(rebuiltEvaluation).equals(readFileSync(generatedEvaluation))
  ) {
    throw new Error('Generated model evaluation is out of date');
  }
  const evaluation = JSON.parse(readFileSync(rebuiltEvaluation, 'utf8'));
  if (
    evaluation.summary.encodingCorrect !== evaluation.summary.tests ||
    evaluation.summary.languageCorrect !== evaluation.summary.tests
  ) {
    throw new Error(
      `Model evaluation failed: ${evaluation.summary.encodingCorrect}/${evaluation.summary.tests} encodings, ` +
        `${evaluation.summary.languageCorrect}/${evaluation.summary.tests} languages`,
    );
  }
  console.log('Detector models and evaluation are reproducible.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
