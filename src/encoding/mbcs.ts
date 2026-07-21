import type { Context, Recogniser } from '.';
import match, { type EncodingName, type Match } from '../match';
import {
  prepareMBCSModel,
  scoreMBCS,
  type MBCSStatistics,
} from './mbcs-scoring';
import { generatedMBCSModels } from './models/generated';
import type { GeneratedMBCSModel } from './models/types';

const models = new Map(
  (generatedMBCSModels as readonly GeneratedMBCSModel[]).map((model) => [
    model.encoding,
    prepareMBCSModel(model),
  ]),
);

class IteratedChar {
  charValue = 0;
  index = 0;
  nextIndex = 0;
  error = false;
  done = false;

  reset() {
    this.charValue = 0;
    this.index = -1;
    this.nextIndex = 0;
    this.error = false;
    this.done = false;
  }

  nextByte(det: Context) {
    if (this.nextIndex >= det.rawLen) {
      this.done = true;
      return -1;
    }
    return det.rawInput[this.nextIndex++] & 0xff;
  }
}

/**
 * Base recogniser for encodings whose structural validity is determined by
 * parsing variable-width byte sequences. Character likelihood comes from the
 * generated corpus model for the concrete encoding.
 */
export abstract class mbcs implements Recogniser {
  abstract name(): EncodingName;
  abstract nextChar(iter: IteratedChar, det: Context): boolean;

  statistics(det: Context): MBCSStatistics {
    let invalidCharacters = 0;
    let totalCharacters = 0;
    const multibyteCharacters: number[] = [];
    const iter = new IteratedChar();

    for (iter.reset(); this.nextChar(iter, det); ) {
      totalCharacters += 1;
      if (iter.error) invalidCharacters += 1;
      else if (iter.charValue > 0xff) {
        multibyteCharacters.push(iter.charValue >>> 0);
      }
    }
    return { totalCharacters, multibyteCharacters, invalidCharacters };
  }

  match(det: Context): Match | null {
    const prepared = models.get(this.name());
    if (!prepared) return null;
    const { confidence } = scoreMBCS(this.statistics(det), prepared);
    return confidence === 0 ? null : match(det, this, confidence);
  }
}

export class sjis extends mbcs {
  name(): EncodingName {
    return 'Shift_JIS';
  }

  language() {
    return 'ja';
  }

  nextChar(iter: IteratedChar, det: Context) {
    iter.index = iter.nextIndex;
    iter.error = false;
    const firstByte = (iter.charValue = iter.nextByte(det));
    if (firstByte < 0) return false;
    if (firstByte <= 0x7f || (firstByte > 0xa0 && firstByte <= 0xdf)) {
      return true;
    }

    const secondByte = iter.nextByte(det);
    if (secondByte < 0) return false;
    iter.charValue = (firstByte << 8) | secondByte;
    if (
      !(
        (secondByte >= 0x40 && secondByte <= 0x7f) ||
        (secondByte >= 0x80 && secondByte <= 0xff)
      )
    ) {
      iter.error = true;
    }
    return true;
  }
}

export class big5 extends mbcs {
  name(): EncodingName {
    return 'Big5';
  }

  language() {
    return 'zh';
  }

  nextChar(iter: IteratedChar, det: Context) {
    iter.index = iter.nextIndex;
    iter.error = false;
    const firstByte = (iter.charValue = iter.nextByte(det));
    if (firstByte < 0) return false;
    if (firstByte <= 0x7f || firstByte === 0xff) return true;

    const secondByte = iter.nextByte(det);
    if (secondByte < 0) return false;
    iter.charValue = (firstByte << 8) | secondByte;
    if (secondByte < 0x40 || secondByte === 0x7f || secondByte === 0xff) {
      iter.error = true;
    }
    return true;
  }
}

function eucNextChar(iter: IteratedChar, det: Context) {
  iter.index = iter.nextIndex;
  iter.error = false;
  const firstByte = (iter.charValue = iter.nextByte(det));
  if (firstByte < 0) {
    iter.done = true;
    return false;
  }
  if (firstByte <= 0x8d) return true;

  const secondByte = iter.nextByte(det);
  if (secondByte < 0) return false;
  iter.charValue = (firstByte << 8) | secondByte;
  if (firstByte >= 0xa1 && firstByte <= 0xfe) {
    if (secondByte < 0xa1) iter.error = true;
    return true;
  }
  if (firstByte === 0x8e) {
    if (secondByte < 0xa1) iter.error = true;
    return true;
  }
  if (firstByte === 0x8f) {
    const thirdByte = iter.nextByte(det);
    iter.charValue = (iter.charValue << 8) | thirdByte;
    if (thirdByte < 0xa1) iter.error = true;
  }
  return !iter.done;
}

export class euc_jp extends mbcs {
  name(): EncodingName {
    return 'EUC-JP';
  }

  language() {
    return 'ja';
  }

  nextChar = eucNextChar;
}

export class euc_kr extends mbcs {
  name(): EncodingName {
    return 'EUC-KR';
  }

  language() {
    return 'ko';
  }

  nextChar = eucNextChar;
}

export class gb_18030 extends mbcs {
  name(): EncodingName {
    return 'GB18030';
  }

  language() {
    return 'zh';
  }

  nextChar(iter: IteratedChar, det: Context) {
    iter.index = iter.nextIndex;
    iter.error = false;
    const firstByte = (iter.charValue = iter.nextByte(det));
    if (firstByte < 0) {
      iter.done = true;
      return false;
    }
    if (firstByte <= 0x80) return true;

    const secondByte = iter.nextByte(det);
    if (secondByte < 0) return false;
    iter.charValue = (firstByte << 8) | secondByte;
    if (firstByte >= 0x81 && firstByte <= 0xfe) {
      if (
        (secondByte >= 0x40 && secondByte <= 0x7e) ||
        (secondByte >= 0x80 && secondByte <= 0xfe)
      ) {
        return true;
      }
      if (secondByte >= 0x30 && secondByte <= 0x39) {
        const thirdByte = iter.nextByte(det);
        if (thirdByte >= 0x81 && thirdByte <= 0xfe) {
          const fourthByte = iter.nextByte(det);
          if (fourthByte >= 0x30 && fourthByte <= 0x39) {
            iter.charValue =
              (iter.charValue << 16) | (thirdByte << 8) | fourthByte;
            return true;
          }
        }
      }
      iter.error = true;
    }
    return !iter.done;
  }
}
