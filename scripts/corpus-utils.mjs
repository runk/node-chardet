import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corpus = join(root, 'corpus');
export const generated = join(corpus, 'generated');
const manifest = JSON.parse(
  readFileSync(join(corpus, 'manifest.json'), 'utf8'),
);
const sources = JSON.parse(readFileSync(join(corpus, 'sources.json'), 'utf8'));

function iconv(input, from, to) {
  const result = spawnSync('iconv', ['-f', from, '-t', to], {
    input,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `iconv ${from} -> ${to} failed: ${result.stderr.toString().trim()}`,
    );
  }
  return result.stdout;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function topTrigrams(buffers) {
  const counts = new Map();
  for (const buffer of buffers) {
    for (let i = 0; i <= buffer.length - 3; i++) {
      const key = (buffer[i] << 16) | (buffer[i + 1] << 8) | buffer[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(
      ([left, leftCount], [right, rightCount]) =>
        rightCount - leftCount || left - right,
    )
    .slice(0, 128)
    .map(([trigram]) => trigram);
}

export function buildCorpus(destination) {
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });

  const sourceByLanguage = new Map(
    sources.languages.map((item) => [item.code, item]),
  );
  const index = [];
  const ngrams = [];

  for (const encoding of manifest.encodings) {
    for (const languageCode of encoding.languages) {
      const language = sourceByLanguage.get(languageCode);
      if (!language)
        throw new Error(`Missing source language: ${languageCode}`);

      const trainDocuments = language.documents.filter(
        (item) => item.split === 'train',
      );
      const testDocuments = language.documents.filter(
        (item) => item.split === 'test',
      );
      if (trainDocuments.length !== 4 || testDocuments.length !== 1) {
        throw new Error(
          `${languageCode} must contain four train and one test document`,
        );
      }
      if (
        new Set(language.documents.map((item) => item.id)).size !==
        language.documents.length
      ) {
        throw new Error(`${languageCode} contains duplicate document IDs`);
      }

      const trainBuffers = [];
      let modelHighByteCount = 0;
      const modelHighByteValues = new Set();
      for (const document of language.documents) {
        const utf8 = Buffer.from(
          `${document.title}\n\n${document.text}\n`,
          'utf8',
        );
        const encoded = iconv(utf8, 'UTF-8', encoding.iconv);
        const decoded = iconv(encoded, encoding.iconv, 'UTF-8');
        if (!decoded.equals(utf8)) {
          throw new Error(
            `${encoding.name}/${languageCode}/${document.id} did not round trip`,
          );
        }

        const outputPath = join(
          destination,
          encoding.name,
          languageCode,
          document.split,
          `${document.id}.bin`,
        );
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, encoded);

        const highBytes = [...encoded].filter((byte) => byte >= 0x80);
        if (highBytes.length === 0) {
          throw new Error(
            `${encoding.name}/${languageCode}/${document.id} has no high-byte evidence`,
          );
        }
        modelHighByteCount += highBytes.length;
        highBytes.forEach((byte) => modelHighByteValues.add(byte));
        index.push({
          encoding: encoding.name,
          iconv: encoding.iconv,
          language: languageCode,
          split: document.split,
          document: document.id,
          path: relative(destination, outputPath),
          bytes: encoded.length,
          highBytes: highBytes.length,
          uniqueHighBytes: new Set(highBytes).size,
          sha256: sha256(encoded),
        });
        if (document.split === 'train') trainBuffers.push(encoded);
      }

      if (modelHighByteCount < 10 || modelHighByteValues.size < 3) {
        throw new Error(
          `${encoding.name}/${languageCode} has insufficient high-byte coverage`,
        );
      }

      ngrams.push({
        encoding: encoding.name,
        language: languageCode,
        documents: trainBuffers.length,
        trigrams: topTrigrams(trainBuffers),
      });
    }
  }

  index.sort((a, b) => a.path.localeCompare(b.path));
  ngrams.sort((a, b) =>
    `${a.encoding}/${a.language}`.localeCompare(`${b.encoding}/${b.language}`),
  );
  writeFileSync(
    join(destination, 'index.json'),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  writeFileSync(
    join(destination, 'ngrams.json'),
    `${JSON.stringify(ngrams, null, 2)}\n`,
  );
}

export function filesBelow(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(path));
    else files.push(path);
  }
  return files.sort();
}

export function verifyCorpus(actual, expected) {
  const actualFiles = filesBelow(actual).map((path) => relative(actual, path));
  const expectedFiles = filesBelow(expected).map((path) =>
    relative(expected, path),
  );
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('Generated corpus file list is out of date');
  }
  for (const path of actualFiles) {
    if (
      !readFileSync(join(actual, path)).equals(
        readFileSync(join(expected, path)),
      )
    ) {
      throw new Error(`Generated corpus differs: ${path}`);
    }
  }
}
