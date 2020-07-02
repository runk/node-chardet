import { Match } from '../match';

export interface Recogniser {
  match(input: Context): Match | null;
  name(input?: Context): string;
  language?(): string;
}

export interface Context {
  fByteStats: number[];
  fC1Bytes: boolean;
  fRawInput: Uint8Array;
  fRawLength: number;
  fInputBytes: Uint8Array;
  fInputLen: number;
}
