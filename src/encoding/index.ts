import { Match } from '../match';

export interface Recogniser {
  match(input: Context): Match | null;
  name(input?: Context): string;
  language?(): string;
}

export interface Context {
  fByteStats: number[];
  fC1Bytes: boolean;
  fRawInput: Buffer;
  fRawLength: number;
  fInputBytes: Buffer;
  fInputLen: number;
}
