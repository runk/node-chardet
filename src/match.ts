import { Context, Recogniser } from "./encoding";

export interface Match {
  confidence: number;
  name: string;
  lang?: string;
}

export default (ctx: Context, rec: Recogniser, confidence: number): Match => ({
  confidence,
  name: rec.name(ctx),
  lang: rec.language ? rec.language() : undefined,
});
