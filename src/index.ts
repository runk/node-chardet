import { Match } from './match';
import { Recogniser, Context } from './encoding';

import loadFs from './fs/node';

import Ascii from './encoding/ascii';
import Utf8 from './encoding/utf8';
import * as unicode from './encoding/unicode';
import * as mbcs from './encoding/mbcs';
import { analyseGeneratedSBCS } from './encoding/sbcs';
import * as iso2022 from './encoding/iso2022';
import { isByteArray } from './utils';

interface FullOptions {
  sampleSize: number;
  offset: number;
}

export type Options = Partial<FullOptions>;

const recognisers: Recogniser[] = [
  new Utf8(),
  new unicode.UTF_16BE(),
  new unicode.UTF_16LE(),
  new unicode.UTF_32BE(),
  new unicode.UTF_32LE(),
  new mbcs.sjis(),
  new mbcs.big5(),
  new mbcs.euc_jp(),
  new mbcs.euc_kr(),
  new mbcs.gb_18030(),
  new iso2022.ISO_2022_JP(),
  new iso2022.ISO_2022_KR(),
  new iso2022.ISO_2022_CN(),
  new Ascii(),
];

export type AnalyseResult = Match[];
export type DetectResult = string | null;

export const detect = (buffer: Uint8Array): string | null => {
  const matches: Match[] = analyse(buffer);
  return matches.length > 0 ? matches[0].name : null;
};

export const analyse = (buffer: Uint8Array): AnalyseResult => {
  if (!isByteArray(buffer)) {
    throw new Error('Input must be a byte array, e.g. Buffer or Uint8Array');
  }

  // Tally up the byte occurrence statistics.
  const byteStats = [];
  for (let i = 0; i < 256; i++) byteStats[i] = 0;

  for (let i = buffer.length - 1; i >= 0; i--) byteStats[buffer[i] & 0x00ff]++;

  let c1Bytes = false;
  for (let i = 0x80; i <= 0x9f; i += 1) {
    if (byteStats[i] !== 0) {
      c1Bytes = true;
      break;
    }
  }

  const context: Context = {
    byteStats,
    c1Bytes,
    rawInput: buffer,
    rawLen: buffer.length,
    inputBytes: buffer,
    inputLen: buffer.length,
  };

  const generatedMatches = analyseGeneratedSBCS(context);
  const generatedRank = new Map(
    generatedMatches.map((value, index) => [value.name, index]),
  );
  const matches = [
    ...recognisers
      .map((rec) => {
        return rec.match(context);
      })
      .filter((match) => {
        return !!match;
      }),
    ...generatedMatches,
  ].sort((a, b) => {
    const leftRank = generatedRank.get(a!.name);
    const rightRank = generatedRank.get(b!.name);
    if (leftRank !== undefined && rightRank !== undefined) {
      return leftRank - rightRank;
    }
    return b!.confidence - a!.confidence;
  });

  return matches as Match[];
};

export const detectFile = (
  filepath: string,
  opts: Options = {},
): Promise<DetectResult> =>
  new Promise((resolve, reject) => {
    let fd: any;
    const fs = loadFs();

    const handler = (err: Error | null, buffer: Buffer | null) => {
      if (fd) {
        fs.closeSync(fd);
      }

      if (err) {
        reject(err);
      } else if (buffer) {
        resolve(detect(buffer));
      } else {
        reject(new Error('No error and no buffer received'));
      }
    };

    const sampleSize = opts?.sampleSize || 0;
    if (sampleSize > 0) {
      fd = fs.openSync(filepath, 'r');
      let sample = Buffer.allocUnsafe(sampleSize);

      fs.read(
        fd,
        sample,
        0,
        sampleSize,
        opts.offset,
        (err: NodeJS.ErrnoException | null, bytesRead: number) => {
          if (err) {
            handler(err, null);
          } else {
            if (bytesRead < sampleSize) {
              sample = sample.subarray(0, bytesRead);
            }
            handler(null, sample);
          }
        },
      );
      return;
    }

    fs.readFile(filepath, handler);
  });

export const detectFileSync = (
  filepath: string,
  opts: Options = {},
): DetectResult => {
  const fs = loadFs();

  if (opts && opts.sampleSize) {
    const fd = fs.openSync(filepath, 'r');
    let sample = Buffer.allocUnsafe(opts.sampleSize);

    const bytesRead = fs.readSync(fd, sample, 0, opts.sampleSize, opts.offset);
    if (bytesRead < opts.sampleSize) {
      sample = sample.subarray(0, bytesRead);
    }
    fs.closeSync(fd);
    return detect(sample);
  }

  return detect(fs.readFileSync(filepath));
};

export default {
  analyse,
  detect,
  detectFileSync,
  detectFile,
};

export { Match, EncodingName } from './match';
