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

const iterations = Number(option('iterations', '100'));
const split = option('split', 'all');

if (!Number.isInteger(iterations) || iterations < 1) {
  throw new Error('--iterations must be a positive integer');
}

const rows = corpusIndex.filter(
  (row) => split === 'all' || row.split === split,
);
if (rows.length === 0) {
  throw new Error(`No corpus files matched split: ${split}`);
}

const inputs = rows.map((row) => ({
  ...row,
  buffer: readFileSync(join(generatedCorpus, row.path)),
}));

for (const input of inputs) analyse(input.buffer);

const startedAt = process.hrtime.bigint();
let matches = 0;
let bytes = 0;

for (let iteration = 0; iteration < iterations; iteration += 1) {
  for (const input of inputs) {
    matches += analyse(input.buffer).length;
    bytes += input.buffer.length;
  }
}

const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
const calls = inputs.length * iterations;
const bytesPerSecond = bytes / (elapsedMs / 1000);

console.log('Library corpus benchmark');
console.log('========================');
console.log(`Split: ${split}`);
console.log(`Files: ${inputs.length}`);
console.log(`Iterations: ${iterations}`);
console.log(`Calls: ${calls}`);
console.log(`Bytes processed: ${bytes}`);
console.log(`Matches produced: ${matches}`);
console.log(`Elapsed: ${elapsedMs.toFixed(2)} ms`);
console.log(`Throughput: ${(calls / (elapsedMs / 1000)).toFixed(2)} files/sec`);
console.log(
  `Byte throughput: ${(bytesPerSecond / 1024 / 1024).toFixed(2)} MiB/sec`,
);
