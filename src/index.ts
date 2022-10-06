import { Match } from './match';
import { Recogniser, Context } from './encoding';

import loadFs from './fs/node';

import Utf8 from './encoding/utf8';
import * as unicode from './encoding/unicode';
import * as mbcs from './encoding/mbcs';
import * as sbcs from './encoding/sbcs';
import * as iso2022 from './encoding/iso2022';

interface FullOptions {
  sampleSize: number,
  position: number
}

type Options = Partial<FullOptions>

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
  new sbcs.ISO_8859_1(),
  new sbcs.ISO_8859_2(),
  new sbcs.ISO_8859_5(),
  new sbcs.ISO_8859_6(),
  new sbcs.ISO_8859_7(),
  new sbcs.ISO_8859_8(),
  new sbcs.ISO_8859_9(),
  new sbcs.windows_1251(),
  new sbcs.windows_1256(),
  new sbcs.KOI8_R(),
];

type DetectResult = Match[] | string | null;

export const detect = (buffer: Uint8Array): string | null => {
  const matches: Match[] = analyse(buffer);
  return matches.length > 0 ? matches[0].name : null;
};

export const analyse = (buffer: Uint8Array): Match[] => {
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

  const matches = recognisers
    .map((rec) => {
      return rec.match(context);
    })
    .filter((match) => {
      return !!match;
    })
    .sort((a, b) => {
      return b!.confidence - a!.confidence;
    });

  return matches as Match[];
}

export const detectFile = (filepath: string, opts: Options = {}): Promise<DetectResult> =>
  new Promise((resolve, reject) => {
    let fd: any;
    const fs = loadFs();

    const handler = (err: Error | null | undefined, buffer: Buffer) => {
      if (fd) {
        fs.closeSync(fd);
      }

      if (err) {
        reject(err);
      } else {
        resolve(detect(buffer));
      }
    };

    if (opts && opts.sampleSize) {
      fd = fs.openSync(filepath, 'r');
      const sample: Buffer = Buffer.allocUnsafe(opts.sampleSize);

      fs.read(fd, sample, 0, opts.sampleSize, opts.position, (err?: Error) => {
        handler(err, sample);
      });
      return;
    }

    fs.readFile(filepath, handler);
  });

export const detectFileSync = (filepath: string, opts: Options = {}): DetectResult => {
  const fs = loadFs();

  if (opts && opts.sampleSize) {
    const fd = fs.openSync(filepath, 'r');
    const sample = Buffer.allocUnsafe(opts.sampleSize);

    fs.readSync(fd, sample, 0, opts.sampleSize, opts.position);
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
