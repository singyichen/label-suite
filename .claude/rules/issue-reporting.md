# Issue Reporting Protocol

## Scenario → Issue Type Mapping

Any agent that hits a condition below must report it to team-lead using the mapped issue type before continuing. Team-lead or the main session owns GitHub issue creation with `gh issue create`, because not every specialist agent has Bash access.

Critical or High security vulnerabilities are the exception: do **not** create a public GitHub issue with exploit details. Report `SECURITY ESCALATION REQUIRED` to team-lead/main session and wait for the repository owner's private disclosure path or security advisory workflow. Medium or Low severity findings are safe to track publicly as Bug Reports.

| Condition | Issue Type | Label | Title prefix |
|-----------|-----------|-------|--------------|
| Bug / test failure / unresolvable error after 2 retries | Bug Report | `bug` | `[Bug]` |
| Security vulnerability (Critical or High) | Private security escalation | N/A | N/A |
| Security vulnerability (Medium or Low) | Bug Report | `bug` | `[Bug]` |
| Performance regression beyond target threshold | Bug Report | `bug` | `[Bug]` |
| CI/CD pipeline failure after 2 retries | Bug Report | `bug` | `[Bug]` |
| New feature request or new workflow/page/module | Feature Add | `feature` | `[Feature]` |
| Existing feature behavior / flow / screen change | Feature Change | `enhancement` | `[Enhancement]` |
| Task blocked by unclear / missing requirement | Task | `task` | `[Task]` |
| UI / styling defect | Feature (UI) | `ui` | `[UI]` |
| Technical uncertainty blocking implementation | Spike | `spike` | `[Spike]` |
| Missing or incorrect documentation | Documentation | `docs` | `[Docs]` |
| Support question / usage question / non-bug help request | Support / Question | `question` | `[Question]` |
| Production or staging incident, outage, or service degradation | Incident / Production Issue | `incident` | `[Incident]` |

## Templates

The full `gh issue create` command for every issue type lives in
[.github/issue-templates.md](../../.github/issue-templates.md).
**Read that file only when actually opening an issue**, then fill the matching template verbatim. Body sections are in Traditional Chinese. Titles use an English structural head plus a Chinese description — `[Enhancement] <scope>: <中文描述>` — and labels stay in English (issue #380). The same rule applies to the PR that resolves the issue: Chinese body, `<type>: <中文描述>` title. Commit messages are excluded and remain English-only.

## After Opening an Issue

1. Include the issue URL in your output report.
2. Tell team-lead: `ISSUE OPENED: <url> — <one-line summary>`.
3. If the originating specialist could not create the issue directly, team-lead/main session opens it and reports the URL back to that specialist.
4. Team-lead includes the URL in the next Progress Report under `⚠️ Needs Your Confirmation`.

## Security Escalation

For Critical or High security vulnerabilities:

1. Do not run `gh issue create`.
2. Report `SECURITY ESCALATION REQUIRED` to team-lead/main session with only high-level impact, affected area, and urgency.
3. Keep exploit steps, credentials, tokens, raw logs, and proof-of-concept details out of public issues and normal progress reports.
4. Wait for the repository owner's private disclosure path or GitHub Security Advisory instructions before documenting details.
