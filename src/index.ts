import { Match } from "./match";
import { Recogniser, Context } from './encoding';

import Utf8 from "./encoding/utf8";
import * as unicode from "./encoding/unicode";
import * as mbcs from "./encoding/mbcs";
import * as sbcs from "./encoding/sbcs";
import * as iso2022 from "./encoding/iso2022";

let fs: any;
const loadFs = () => {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    fs = fs ? fs : require('fs');
    return fs;
  }
  throw new Error('File system is not available');
}

interface FullOptions {
  sampleSize: number
}

type Options = Partial<FullOptions>

var recognisers: Recogniser[] = [
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
  new sbcs.KOI8_R()
];

type DetectResult = Match[] | string | null;

export const detect = (buffer: Buffer): string | null => {
  const matches: Match[] = analyse(buffer);
  return matches.length > 0 ? matches[0].name : null;
};

export const analyse = (buffer: Buffer): Match[] => {
  // Tally up the byte occurrence statistics.
  var fByteStats = [];
  for (var i = 0; i < 256; i++) fByteStats[i] = 0;

  for (var i = buffer.length - 1; i >= 0; i--) fByteStats[buffer[i] & 0x00ff]++;

  var fC1Bytes = false;
  for (var i = 0x80; i <= 0x9f; i += 1) {
    if (fByteStats[i] != 0) {
      fC1Bytes = true;
      break;
    }
  }

  var context: Context = {
    fByteStats: fByteStats,
    fC1Bytes: fC1Bytes,
    fRawInput: buffer,
    fRawLength: buffer.length,
    fInputBytes: buffer,
    fInputLen: buffer.length
  };

  var matches = recognisers
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
    var fd: any;
    const fs = loadFs();

    var handler = (err: Error | null | undefined, buffer: Buffer) => {
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
      fd = fs.openSync(filepath, "r");
      const sample: Buffer = Buffer.allocUnsafe(opts.sampleSize);

      fs.read(fd, sample, 0, opts.sampleSize, null, (err?: Error) => {
        handler(err, sample);
      });
      return;
    }

    fs.readFile(filepath, handler);
  });

export const detectFileSync = (filepath: string, opts: Options = {}): DetectResult => {
  const fs = loadFs();

  if (opts && opts.sampleSize) {
    var fd = fs.openSync(filepath, "r"),
      sample = Buffer.allocUnsafe(opts.sampleSize);

    fs.readSync(fd, sample, 0, opts.sampleSize);
    fs.closeSync(fd);
    return detect(sample);
  }

  return detect(fs.readFileSync(filepath));
};
