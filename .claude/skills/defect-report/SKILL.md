---
name: defect-report
description: Draft a structured defect report for a bug found during testing; filing follows the project issue protocol.
---

# Defect Report

Draft the defect content, then file it per `.claude/rules/issue-reporting.md` (Bug Report, label `bug`, `[Bug]` title prefix; the template is in `.github/issue-templates.md`, body in Traditional Chinese). Do not invent a separate `DEF-NNN` numbering; the GitHub issue number is the ID.

**Security exception**: a Critical or High security finding (including test-set leakage or an access-control bypass) is NOT filed as a public issue. Report `SECURITY ESCALATION REQUIRED` to the main session with high-level impact only.

## Usage

```
/defect-report "Scoring returns wrong F1 score for multi-label classification"
```

## Content to Capture

- **Summary**: one line, plus component (backend module / frontend feature / e2e) and environment
- **Spec reference**: `specs/[module]/NNN-feature/` and the violated `AC-N.N`, if any
- **Reproduction**: role, task config, input, exact steps; expected vs actual; reproducibility
- **Impact**: users affected; data corruption or ground-truth leakage risk
- **Root cause**: file:line evidence (locatable by grep), not speculation
- **Regression test to add**: layer and file location

## Severity

| Severity | Criteria |
|----------|----------|
| Critical | Test-set leakage, data corruption, system down, authorization bypass |
| High | Wrong scoring result, broken submission or review flow |
| Medium | Feature broken for one task type or role, wrong ordering |
| Low | Cosmetic, wording |
