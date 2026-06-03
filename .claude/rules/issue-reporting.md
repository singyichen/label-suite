# Issue Reporting Protocol

## Scenario → Issue Type Mapping

Any agent that hits a condition below must open a GitHub issue using `gh issue create` via Bash **before** reporting to team-lead.

| Condition | Issue Type | Label | Title prefix |
|-----------|-----------|-------|--------------|
| Bug / test failure / unresolvable error after 2 retries | Bug Report | `錯誤回報` | `[Bug]` |
| Security vulnerability (Critical or High) | Bug Report | `錯誤回報` | `[Bug]` |
| Performance regression beyond target threshold | Bug Report | `錯誤回報` | `[Bug]` |
| CI/CD pipeline failure after 2 retries | Bug Report | `錯誤回報` | `[Bug]` |
| New feature request or new workflow/page/module | Feature Add | `功能新增` | `[功能新增]` |
| Existing feature behavior / flow / screen change | Feature Change | `功能修改` | `[功能修改]` |
| Task blocked by unclear / missing requirement | Task | `任務追蹤` | `[Task]` |
| UI / styling defect | Feature (UI) | `樣式調整` | `[樣式調整]` |
| Technical uncertainty blocking implementation | Spike | `技術調研` | `[Spike]` |
| Missing or incorrect documentation | Documentation | `文件需求/修正` | `[Docs]` |
| Support question / usage question / non-bug help request | Support / Question | `提問` | `[Question]` |
| Production or staging incident, outage, or service degradation | Incident / Production Issue | `線上事故` | `[Incident]` |

---

## Templates

### Bug Report — `[Bug]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Bug] <component>: <one-line description>" \
  --label "錯誤回報" \
  --body-file -
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
```

---

### Feature Add — `[功能新增]`

```bash
cat <<'EOF' | gh issue create \
  --title "[功能新增] <module/page>: <short description>" \
  --label "功能新增" \
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

### Feature Change — `[功能修改]`

```bash
cat <<'EOF' | gh issue create \
  --title "[功能修改] <module/page>: <short description>" \
  --label "功能修改" \
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
  --label "任務追蹤" \
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

### Feature (UI) — `[樣式調整]`

```bash
cat <<'EOF' | gh issue create \
  --title "[樣式調整] <component>: <short description>" \
  --label "樣式調整" \
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
  --label "技術調研" \
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
  --label "文件需求/修正" \
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
  --label "提問" \
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
  --title "[Incident][<severity>][<tracking-id>] <short description>" \
  --label "線上事故" \
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
2. Tell team-lead: `ISSUE OPENED: <url> — <one-line summary>`
3. Team-lead includes the URL in the next Progress Report under `⚠️ Needs Your Confirmation`.
