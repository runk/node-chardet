# Generated model migration baseline

Recorded on 2026-07-12 at commit
`df1e8dd0088f5d4b71790a54ee2fc1f2afe6cb0a` (`v3`), using Node.js v24.10.0
and npm 11.6.1.

`TODO.md` is locally present but ignored by the repository. There were no
tracked or unignored changes when this baseline was recorded. Generated `lib/`
and coverage output are also ignored.

## Checks

| Check                             | Result                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm test`                        | Pass: 8 files, 48 tests passed, 8 todo                             |
| TypeScript                        | Pass                                                               |
| Coverage                          | 93.04% statements, 85.44% branches, 95.86% functions, 93.13% lines |
| `npm run models:verify`           | Pass; models and evaluation are reproducible                       |
| `npm run validate -- --split=all` | Completes; 0/138 encoding and language predictions correct         |
| `npm run benchmark`               | 7,848.13 files/sec; 1.42 MiB/sec                                   |
| `npm run build`                   | Pass                                                               |
| Built `lib/`                      | 341,661 bytes across files; 448 KiB allocated on disk              |
| `npm pack --dry-run`              | 42,359 bytes packed; 348,964 bytes unpacked; 42 entries            |

The benchmark processed 13,800 calls and 2,622,400 bytes in 1,758.38 ms,
producing 100,200 matches. These figures are a local performance reference, not
a hard CI threshold; comparisons should use the same machine and runtime.

## Runtime corpus validation

The validation corpus currently contains only newly generated models that are
not registered with the runtime. The 0% result is therefore the expected
pre-migration baseline, not a model-evaluator failure. Every input still
received at least one prediction.

### By split

| Split      |   Files | Encoding correct | Language correct |
| ---------- | ------: | ---------------: | ---------------: |
| train      |      92 |        0 (0.00%) |        0 (0.00%) |
| validation |      23 |        0 (0.00%) |        0 (0.00%) |
| test       |      23 |        0 (0.00%) |        0 (0.00%) |
| **Total**  | **138** |    **0 (0.00%)** |    **0 (0.00%)** |

### By expected encoding

| Expected encoding | Files | Encoding correct | Most common current prediction |
| ----------------- | ----: | ---------------: | ------------------------------ |
| CP850             |    18 |                0 | windows-1252                   |
| CP852             |     6 |                0 | windows-1250                   |
| CP949             |     6 |                0 | EUC-KR                         |
| IBM855            |    12 |                0 | windows-1252                   |
| IBM866            |     6 |                0 | windows-1252                   |
| ISO-8859-10       |     6 |                0 | ISO-8859-1                     |
| ISO-8859-13       |     6 |                0 | windows-1257                   |
| ISO-8859-14       |     6 |                0 | ISO-8859-1                     |
| ISO-8859-15       |    18 |                0 | ISO-8859-1                     |
| ISO-8859-16       |     6 |                0 | ISO-8859-2                     |
| ISO-8859-3        |     6 |                0 | ISO-8859-1                     |
| ISO-8859-4        |     6 |                0 | windows-1257                   |
| KOI8-U            |     6 |                0 | KOI8-R                         |
| macintosh         |    18 |                0 | windows-1252                   |
| x-mac-cyrillic    |    12 |                0 | windows-1251                   |

The most common predictions above are useful collision targets, but do not
describe every document. Notably, weak IBM855 input can also be classified as
Shift_JIS or windows-1255.

## Public naming decisions

Existing names remain exactly as declared by `EncodingName`; the migration must
not silently recase or rename them. The new SBCS canonical result names are:

```text
KOI8-U
IBM866
IBM855
macintosh
x-mac-cyrillic
ISO-8859-3
ISO-8859-4
ISO-8859-10
ISO-8859-13
ISO-8859-14
ISO-8859-15
ISO-8859-16
CP850
CP852
```

CP949 is reserved as the canonical future result name for the separate
multibyte follow-up.

The current public API does not accept encoding-name filters and does not expose
alias normalization. Consequently, the initial migration adds only these
canonical `EncodingName` values. Iconv/compiler input labels such as `CP866`,
`CP855`, `MACINTOSH`, and `MAC-CYRILLIC` are implementation aliases and must not
be returned by `detect` or `analyse`.

## Known pre-migration limitations

- Generated SBCS models are not consumed or registered by the detector.
- New encodings therefore lose to the closest existing recognizer.
- Confidence values are not yet calibrated between generated SBCS and existing
  UTF, ISO-2022, or MBCS recognizers.
- The existing test suite has eight explicitly pending tests.
- CP949 is represented in the corpus but intentionally excluded from the SBCS
  model compiler and requires separate MBCS work.
