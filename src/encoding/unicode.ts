import { Context, Recogniser } from '.';
import match, { Match } from '../match';

/**
 * This class matches UTF-16 and UTF-32, both big- and little-endian. The
 * BOM will be used if it is present.
 */
export class UTF_16BE implements Recogniser {
  name() {
    return 'UTF-16BE';
  }

  match(det: Context): Match | null {
    const input = det.fRawInput;

    if (
      input.length >= 2 &&
      (input[0] & 0xff) == 0xfe &&
      (input[1] & 0xff) == 0xff
    ) {
      return match(det, this, 100); // confidence = 100
    }

    // TODO: Do some statistics to check for unsigned UTF-16BE
    return null;
  }
}

export class UTF_16LE implements Recogniser {
  name() {
    return 'UTF-16LE';
  }
  match(det: Context): Match | null {
    const input = det.fRawInput;

    if (
      input.length >= 2 &&
      (input[0] & 0xff) == 0xff &&
      (input[1] & 0xff) == 0xfe
    ) {
      // LE BOM is present.
      if (input.length >= 4 && input[2] == 0x00 && input[3] == 0x00) {
        // It is probably UTF-32 LE, not UTF-16
        return null;
      }
      return match(det, this, 100); // confidence = 100
    }

    // TODO: Do some statistics to check for unsigned UTF-16LE
    return null;
  }
}

interface WithGetChar {
  getChar(input: Uint8Array, index: number): number;
}

class UTF_32 implements Recogniser, WithGetChar {
  name() {
    return 'UTF-32';
  }

  getChar(input: Uint8Array, index: number): number {
    return -1;
  }

  match(det: Context): Match | null {
    let numValid = 0,
      numInvalid = 0,
      hasBOM = false,
      confidence = 0;
    const limit = (det.fRawLength / 4) * 4
    const input = det.fRawInput;

    if (limit == 0) {
      return null;
    }

    if (this.getChar(input, 0) == 0x0000feff) {
      hasBOM = true;
    }

    for (let i = 0; i < limit; i += 4) {
      const ch = this.getChar(input, i);

      if (ch < 0 || ch >= 0x10ffff || (ch >= 0xd800 && ch <= 0xdfff)) {
        numInvalid += 1;
      } else {
        numValid += 1;
      }
    }

    // Cook up some sort of confidence score, based on presence of a BOM
    //    and the existence of valid and/or invalid multi-byte sequences.
    if (hasBOM && numInvalid == 0) {
      confidence = 100;
    } else if (hasBOM && numValid > numInvalid * 10) {
      confidence = 80;
    } else if (numValid > 3 && numInvalid == 0) {
      confidence = 100;
    } else if (numValid > 0 && numInvalid == 0) {
      confidence = 80;
    } else if (numValid > numInvalid * 10) {
      // Probably corrupt UTF-32BE data.  Valid sequences aren't likely by chance.
      confidence = 25;
    }

    // return confidence == 0 ? null : new CharsetMatch(det, this, confidence);
    return confidence == 0 ? null : match(det, this, confidence);
  }
}

export class UTF_32BE extends UTF_32 {
  name() {
    return 'UTF-32BE';
  }
  getChar(input: Uint8Array, index: number) {
    return (
      ((input[index + 0] & 0xff) << 24) |
      ((input[index + 1] & 0xff) << 16) |
      ((input[index + 2] & 0xff) << 8) |
      (input[index + 3] & 0xff)
    );
  }
}

export class UTF_32LE extends UTF_32 {
  name() {
    return 'UTF-32LE';
  }

  getChar(input: Uint8Array, index: number) {
    return (
      ((input[index + 3] & 0xff) << 24) |
      ((input[index + 2] & 0xff) << 16) |
      ((input[index + 1] & 0xff) << 8) |
      (input[index + 0] & 0xff)
    );
  }
}
