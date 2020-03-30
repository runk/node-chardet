
export interface Match {
  confidence: number;
  name: string;
  lang: string;
}

// @ts-ignore
export default (det, rec, confidence, name, lang): Match => ({
  confidence: confidence,
  name: name || rec.name(det),
  lang: lang
});
