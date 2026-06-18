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

---

## Templates

### Bug Report — `[Bug]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Bug] <component>: <one-line description>" \
  --label "bug" \
  --body-file -
## 📌 問題描述
<description>

## 🔁 重現步驟
<steps or file:line reference>

## ✅ 預期結果 vs ❌ 實際結果
**預期結果：** <expected>
**實際結果：** <actual>

## 🧾 錯誤訊息
⚠️ Remove tokens, cookies, env values, request bodies, and PII before pasting. If evidence cannot be made public, report via private channel instead.
<error log or code snippet — sensitive data removed>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
```

---

### Feature Add — `[Feature]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Feature] <module/page>: <short description>" \
  --label "feature" \
  --body-file -
## 👤 使用情境 / 功能範圍
<who needs this, when, and what should be included/excluded>

## 🎯 需求目標
<desired outcome>

## ✅ 驗收條件
- [ ] <acceptance criterion 1>
- [ ] <acceptance criterion 2>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
```

---

### Feature Change — `[Enhancement]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Enhancement] <module/page>: <short description>" \
  --label "enhancement" \
  --body-file -
## 🎯 修改目的
<why the existing behavior needs to change>

## 🔁 現況 / 觸發情境
<current behavior and where it appears>

## ✅ 預期調整
<expected behavior after the change>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
```

---

### Task — `[Task]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Task] <short description>" \
  --label "task" \
  --body-file -
## 🎯 目的
<why this task is needed>

## ✅ 任務項目
- [ ] <sub-task 1>
- [ ] <sub-task 2>

## 📝 附註
- 相關連結：
- 注意事項：<blocker details>

## 🤖 Opened by
Agent: <agent-name> | Blocked task: <task-id>
EOF
```

---

### Feature (UI) — `[UI]`

```bash
cat <<'EOF' | gh issue create \
  --title "[UI] <component>: <short description>" \
  --label "ui" \
  --body-file -
## 📌 問題描述
<UI / styling issue>

## 🔁 重現步驟
See: <file>:<line>

## ✅ 預期結果 vs ❌ 實際結果
**預期結果：** <correct appearance / behavior>
**實際結果：** <actual appearance / behavior>

## 🤖 Opened by
Agent: <agent-name>
EOF
```

---

### Spike — `[Spike]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Spike] <research topic>" \
  --label "spike" \
  --body-file -
## 🎯 研究目標
<what needs to be understood>

## ❓ 關鍵問題
- <question 1>
- <question 2>

## 📝 背景
<why this is blocking implementation>

## 🤖 Opened by
Agent: <agent-name> | Blocked task: <task-id>
EOF
```

---

### Documentation — `[Docs]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Docs] <short description>" \
  --label "docs" \
  --body-file -
## 📌 問題描述
<what documentation is missing or incorrect>

## 📝 附註
- 相關連結：
- 注意事項：

## 🤖 Opened by
Agent: <agent-name>
EOF
```

---

### Support / Question — `[Question]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Question] <short description>" \
  --label "question" \
  --body-file -
## 📌 問題 / 想問的事
<question or support request>

## 🔎 已嘗試
<what has already been checked>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
```

---

### Incident / Production Issue — `[Incident]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Incident] <short description>" \
  --label "incident" \
  --body-file -
## 🔥 嚴重度
<P0/P1/P2/P3>

## 📌 事故摘要
<what happened and who is affected>

## 🕒 時間線
- <timestamp>: <event>

## ✅ 目前處置
<mitigation or next action>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
```

---

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
