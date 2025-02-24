import { Context, Recogniser } from "./encoding";

export type EncodingName =
  | 'ASCII'
  | 'Big5'
  | 'EUC-JP'
  | 'EUC-KR'
  | 'GB18030'
  | 'ISO_2022' // TODO: Use hyphen
  | 'ISO-2022-CN'
  | 'ISO-2022-JP'
  | 'ISO-2022-KR'
  | 'ISO-8859-1'
  | 'ISO-8859-2'
  | 'ISO-8859-5'
  | 'ISO-8859-6'
  | 'ISO-8859-7'
  | 'ISO-8859-8'
  | 'ISO-8859-9'
  | 'ISO-8859-9'
  | 'KOI8-R'
  | 'mbcs'
  | 'sbcs'
  | 'Shift_JIS' // TODO: Use hyphen
  | 'UTF-16BE'
  | 'UTF-16LE'
  | 'UTF-32'
  | 'UTF-32BE'
  | 'UTF-32LE'
  | 'UTF-8'
  | 'windows-1250'
  | 'windows-1251'
  | 'windows-1252'
  | 'windows-1253'
  | 'windows-1254'
  | 'windows-1254'
  | 'windows-1255'
  | 'windows-1256'

export interface Match {
  confidence: number;
  name: EncodingName;
  lang?: string;
}

export default (ctx: Context, rec: Recogniser, confidence: number): Match => ({
  confidence,
  name: rec.name(ctx),
  lang: rec.language ? rec.language() : undefined,
});
