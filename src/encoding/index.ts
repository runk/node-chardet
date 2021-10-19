import { Match } from '../match';

export interface Recogniser {
  match(input: Context): Match | null;
  name(input?: Context): string;
  language?(): string;
}

export interface Context {
  byteStats: number[];
  c1Bytes: boolean;
  rawInput: Uint8Array;
  rawLen: number;
  inputBytes: Uint8Array;
  inputLen: number;
}
