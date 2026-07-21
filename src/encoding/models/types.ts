import type { EncodingName } from '../../match';

export interface HighByteDistribution {
  readonly total: number;
  readonly counts: readonly (readonly [number, number])[];
}

export interface GeneratedSBCSLanguage {
  readonly language: string;
  readonly ngrams: readonly number[];
  readonly highBytes: HighByteDistribution;
}

export interface GeneratedSBCSModel {
  readonly encoding: EncodingName;
  readonly byteMap: readonly number[];
  readonly languages: readonly GeneratedSBCSLanguage[];
}

export interface GeneratedMBCSModel {
  readonly encoding: EncodingName;
  readonly language: string;
  readonly total: number;
  readonly commonCharacters: readonly number[];
}
