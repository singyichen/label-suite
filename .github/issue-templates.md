# GitHub Issue Templates (gh CLI)

> Extracted from `.claude/rules/issue-reporting.md` on 2026-07-03 to keep the always-loaded rules file small.
> Read the scenario → issue-type mapping and the security escalation rules THERE first; come here only to copy a template.

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
