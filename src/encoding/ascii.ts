import type { Context, Recogniser } from '.';
import match, { type EncodingName, type Match } from '../match';

export default class Ascii implements Recogniser {
  name(): EncodingName {
    return 'ASCII';
  }

  match(det: Context): Match | null {
    const input = det.rawInput;

    for (let i = 0; i < det.rawLen; i++) {
      const b = input[i];
      if (b < 32 || b > 126) {
        return match(det, this, 0);
      }
    }

    return match(det, this, 100);
  }
}
