# Issue Reporting Protocol

## Scenario → Issue Type Mapping

Any agent that hits a condition below must open a GitHub issue using `gh issue create` via Bash **before** reporting to team-lead.

| Condition | Issue Type | Label | Title prefix |
|-----------|-----------|-------|--------------|
| Bug / test failure / unresolvable error after 2 retries | Bug Report | `錯誤回報` | `[Bug]` |
| Security vulnerability (Critical or High) | Bug Report | `錯誤回報` | `[Bug]` |
| Performance regression beyond target threshold | Bug Report | `錯誤回報` | `[Bug]` |
| CI/CD pipeline failure after 2 retries | Bug Report | `錯誤回報` | `[Bug]` |
| Task blocked by unclear / missing requirement | Task | `任務追蹤` | `[Task]` |
| UI / styling defect | Feature (UI) | `樣式調整` | `[樣式調整]` |
| Technical uncertainty blocking implementation | Spike | `技術調研` | `[Spike]` |
| Missing or incorrect documentation | Documentation | `文件需求/修正` | `[Docs]` |

---

## Templates

### Bug Report — `[Bug]`

```bash
gh issue create \
  --title "[Bug] <component>: <one-line description>" \
  --label "錯誤回報" \
  --body "$(cat <<'EOF'
## 📌 問題描述
<description>

## 🔁 重現步驟
<steps or file:line reference>

## ✅ 預期結果 vs ❌ 實際結果
**預期結果：** <expected>
**實際結果：** <actual>

## 🧾 錯誤訊息
<error log or code snippet>

## 🤖 Opened by
Agent: <agent-name> | Context: <phase or trigger>
EOF
)"
```

---

### Task — `[Task]`

```bash
gh issue create \
  --title "[Task] <short description>" \
  --label "任務追蹤" \
  --body "$(cat <<'EOF'
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
)"
```

---

### Feature (UI) — `[樣式調整]`

```bash
gh issue create \
  --title "[樣式調整] <component>: <short description>" \
  --label "樣式調整" \
  --body "$(cat <<'EOF'
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
)"
```

---

### Spike — `[Spike]`

```bash
gh issue create \
  --title "[Spike] <research topic>" \
  --label "技術調研" \
  --body "$(cat <<'EOF'
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
)"
```

---

### Documentation — `[Docs]`

```bash
gh issue create \
  --title "[Docs] <short description>" \
  --label "文件需求/修正" \
  --body "$(cat <<'EOF'
## 📌 問題描述
<what documentation is missing or incorrect>

## 📝 附註
- 相關連結：
- 注意事項：

## 🤖 Opened by
Agent: <agent-name>
EOF
)"
```

---

## After Opening an Issue

1. Include the issue URL in your output report.
2. Tell team-lead: `ISSUE OPENED: <url> — <one-line summary>`
3. Team-lead includes the URL in the next Progress Report under `⚠️ Needs Your Confirmation`.
