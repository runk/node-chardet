# Encoding ambiguity decisions

Character encoding detection cannot recover information that is absent from the
input bytes. Several supported encodings decode a particular document to
exactly the same Unicode text. In those cases, `detect()` returns a stable
canonical name rather than claiming that the original encoding label is
knowable.

## Classification

Runtime validation classifies a non-exact result as:

- **byte-equivalent** when the expected and predicted encodings decode the
  complete input to identical UTF-8 text;
- **distinguishable** when the decoded text differs or one decoding is invalid;
- **insufficient evidence** when multiple structurally valid candidates remain
  statistically competitive but the available model evidence does not select
  the expected encoding.

Run `npm run validate -- --split=all` to reproduce the current inventory. The
validator reports exact accuracy, byte-equivalent canonical results, combined
accuracy, grouped collision counts, and fixture-level classifications.

## Canonical SBCS families

When an input contains no byte that decodes differently within a family, the
first applicable name below is canonical:

| Family                       | Canonical order                       |
| ---------------------------- | ------------------------------------- |
| Western European             | ISO-8859-1, ISO-8859-15, windows-1252 |
| Central and Eastern European | ISO-8859-2, windows-1250              |
| Greek                        | ISO-8859-7, windows-1253              |
| Hebrew                       | ISO-8859-8, windows-1255              |
| Turkish                      | ISO-8859-9, windows-1254              |
| Baltic                       | ISO-8859-13, windows-1257             |

The model compiler derives pair-specific byte-difference sets through iconv and
stores them with the generated SBCS models. Runtime family preference is
therefore applied only after inspecting the actual bytes:

1. If an observed differing byte is in `0x80`–`0x9f`, prefer the Windows
   encoding because those values are printable Windows code-page evidence and
   C1 controls in the ISO encoding.
2. If no observed byte differs between the candidates, use the canonical order
   above.
3. If a non-C1 byte distinguishes the candidates, do not apply family
   precedence; rank by statistical evidence and deterministic model order.

This prevents a broad family rule from hiding distinguishable input. The
canonical result is also independent of generated-model registration order.

## Current complete-corpus inventory

Recorded against the 432-file generated corpus:

| Expected     | Canonical prediction | Count | Byte-equivalent | Distinguishable |
| ------------ | -------------------- | ----: | --------------: | --------------: |
| CP949        | EUC-KR               |     6 |               5 |               1 |
| ISO-8859-15  | ISO-8859-1           |    18 |              18 |               0 |
| ISO-8859-2   | ISO-8859-16          |     3 |               0 |               3 |
| windows-1250 | ISO-8859-16          |     3 |               0 |               3 |
| windows-1250 | ISO-8859-2           |    12 |              12 |               0 |
| windows-1252 | ISO-8859-1           |    60 |              60 |               0 |
| windows-1253 | ISO-8859-7           |     5 |               5 |               0 |
| windows-1254 | ISO-8859-9           |     6 |               6 |               0 |
| windows-1255 | ISO-8859-8           |     6 |               6 |               0 |
| windows-1257 | ISO-8859-13          |     6 |               6 |               0 |

Summary:

- Exact encoding: 307/432 (71.06%).
- Byte-equivalent canonical result: 118/432 (27.31%).
- Exact or byte-equivalent: 425/432 (98.38%).
- Held-out test inputs are 72/72 exact or byte-equivalent.

## Tracked distinguishable defects

- `CP949/ko/train/workshop.bin` contains CP949-only byte sequences. CP949 is
  runtime-disabled until it has a dedicated parser and generated model, so the
  current EUC-KR result is expected project scope rather than a canonical
  equivalence decision.
- Three ISO-8859-2 Romanian training documents and three windows-1250 Romanian
  training documents currently rank as ISO-8859-16 despite decoding
  differently. These are confidence/model-ranking defects, not accepted
  canonical aliases, and remain work for cross-family calibration.

No distinguishable held-out test document is currently hidden by an ambiguity
rule.
