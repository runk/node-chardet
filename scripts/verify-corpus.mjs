import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCorpus, generated, verifyCorpus } from './corpus-utils.mjs';

const temporaryRoot = mkdtempSync(join(tmpdir(), 'node-chardet-corpus-'));
try {
  const rebuilt = join(temporaryRoot, 'generated');
  buildCorpus(rebuilt);
  verifyCorpus(rebuilt, generated);
  console.log('Corpus is reproducible.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
