import { Context, Recogniser } from "./encoding";

export interface Match {
  confidence: number;
  name: string;
  lang?: string;
}

export default (det: Context, rec: Recogniser, confidence: number, name?: string, lang?: string): Match => ({
  confidence,
  name: name || rec.name(det),
  lang,
});
