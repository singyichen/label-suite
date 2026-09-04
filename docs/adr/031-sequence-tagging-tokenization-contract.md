# ADR-031: Sequence Tagging Tokenization — Versioned Annotation Contract

**Status**: Superseded
**Date**: 2026-07-28
**Superseded by**: issue #581 and OpenSpec change `seq-tagging-span-config` (2026-09-04) — `sequence_tagging` no longer stores tags index-aligned to a token sequence. Annotations are half-open character-offset spans (`{ start, end, label }`), so there is no stored coordinate system to freeze and Decisions 1–4 have nothing left to govern; Decision 5's default survives only as the `snap_unit` default (`character` = no snapping), and Decision 6's deferred server-side word-segmentation engine is replaced by the frontend's `Intl.Segmenter`, which is now a *selection-time* convenience rather than a data-defining tokenizer — a different `snap_unit` changes where a drag lands, never what an existing span means. The row "Character-offset spans instead of token-aligned tags" in *Alternatives Rejected* is the option that was ultimately adopted; its stated reason (token-level `token_f1` metrics) is superseded by the span-level metrics in specs/dataset/017. Decisions 1–6 and the tables below are kept verbatim so the original reasoning stays traceable.

## Context

`sequence_tagging` annotations are stored as tag arrays index-aligned to a token sequence (`pre_tags[i]` describes `tokens[i]`). The tokenizer therefore defines the **coordinate system** of the annotation data: any change to how text is segmented shifts every stored tag. Unlike a UI library swap, this cost grows with every annotation collected — it is a one-way door.

Spec 013 (v6.2.0/v6.3.0) already made contract-level decisions that currently live only in a feature spec, although they affect every downstream consumer (014 task detail, 015 annotation workspace, 016/017 statistics and quality metrics):

- Tagging unit (`character` / `word`) and tagging scheme (`BIO` / `BIOES` / `IOB2` / `SINGLE`) are two independent, composable config dimensions — combinations like `character-BIO` must not be hardcoded as single enums (Generalization-First, ADR-010).
- The per-task config carries `tokenization: { unit, mode: unit_based, punctuation: separate, version: 2 }`.
- Whitespace never produces tokens; punctuation is always a separate token.
- Visible pre-annotations are accepted only when their count matches the token count produced by the current unit.

The Step 2 prototype preview segments text with the browser's `Intl.Segmenter` (grapheme granularity for character mode, `zh-TW` word granularity for word mode). ICU word segmentation results **vary across browsers and ICU versions** — two annotators on different browsers could derive different token boundaries for the same sentence. That is acceptable for a producer-side preview but is a data-integrity defect if it becomes the production tokenizer. Spec 013 v6.3.0 explicitly defers freezing a reproducible production tokenizer to 015; without an ADR, the prototype's `Intl.Segmenter` would silently become the de facto standard.

## Decision

1. **Tokenization is part of the annotation data contract.** The `tokenization` object (`unit`, `mode`, `punctuation`, `version`) is stored in the task config; stored tags are only interpretable relative to the exact token sequence that tokenizer configuration produces.
2. **Canonical tokenization is computed server-side, once per task.** The backend is the single tokenization authority. Production frontends render token boundaries provided by the backend and never re-derive them. The prototype's `Intl.Segmenter` is a preview-only approximation and must be treated as such.
3. **Engine and dictionary versions are frozen per task at creation.** Upgrading a segmentation engine or its dictionary bumps the tokenization version for *new* tasks; existing tasks keep the version they were created with. Re-tokenizing data of an existing task is prohibited.
4. **Determinism is a hard requirement.** Same input text + same `tokenization` config + same engine version must yield an identical token sequence in every environment.
5. **Character mode is the default unit** because it requires only Unicode grapheme segmentation — deterministic, dictionary-free, and fully decided today. Word mode depends on the engine selection below.
6. **Word-mode engine selection is deferred to before 015 implementation.** Candidates: **CKIP** (best Traditional Chinese accuracy; heavier runtime), **Jieba** (fast and light; dictionaries are Simplified-Chinese-oriented), **PyICU** (server-pinned ICU version; mirrors the preview's behavior). The choice must satisfy decisions 2–4; it does not reopen them.

## Consequences

### Easier

- Annotation datasets are reproducible — a requirement for thesis evaluation and for the Data Fairness principle (metrics computed on stable token boundaries).
- Engine upgrades cannot silently corrupt existing annotations; version bookkeeping makes drift detectable.
- Downstream consumers (014–017) read one canonical token sequence instead of re-deriving their own.
- Unit and scheme stay independent config enums, so new combinations need no schema change (ADR-010).

### Harder

- The backend must expose a tokenization capability before 015 can render production token boundaries; word mode is blocked on the engine selection in Decision 6.
- Until 015 wires backend tokens into the UI, the preview may diverge slightly from canonical boundaries (e.g. proper nouns) and must be presented as approximate.
- Frozen versions mean old tasks keep old segmentation behavior; comparing across tokenizer versions requires explicit care in analysis.

### Alternatives Rejected

| Option | Reason Rejected |
|--------|-----------------|
| Frontend (`Intl.Segmenter`) as production tokenizer | Non-deterministic across browsers/ICU versions; violates the determinism requirement |
| Tokenize-on-read without version freezing | Engine upgrades silently shift boundaries and misalign every stored tag |
| Character-offset spans instead of token-aligned tags | Changes the task semantics — `sequence_tagging` is defined by token-level tagging and token-level metrics (`token_f1`); span-based labeling already exists as `entity_recognition` |
| Hardcoding `character-BIO` style combined enums | Violates Generalization-First (ADR-010); every new combination would require a schema change |
