# GitHub Issue Templates (gh CLI)

> Extracted from `.claude/rules/issue-reporting.md` on 2026-07-03 to keep the always-loaded rules file small.
> Read the scenario → issue-type mapping and the security escalation rules THERE first; come here only to copy a template.
>
> **Language (issue #380)**: bodies are written in Traditional Chinese; titles use an English structural head plus a Chinese description (`[Bug] <component>: <中文描述>`); labels stay in English.

### Bug Report — `[Bug]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Bug] <component>: <一行問題描述>" \
  --label "bug" \
  --body-file -
## 📌 問題描述
<問題描述>

## 🔁 重現步驟
<重現步驟，或 file:line 位置>

## ✅ 預期結果 vs ❌ 實際結果
**預期結果：** <預期行為>
**實際結果：** <實際行為>

## 🧾 錯誤訊息
⚠️ 貼上前請移除 token、cookie、環境變數值、request body 與個資。若證據無法公開，改走私下管道回報。
<錯誤 log 或程式碼片段 —— 已移除敏感資料>

## 🤖 Opened by
Agent: <agent-name> | Context: <階段或觸發情境>
EOF
```

### Feature Add — `[Feature]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Feature] <module/page>: <中文描述>" \
  --label "feature" \
  --body-file -
## 👤 使用情境 / 功能範圍
<誰在什麼情境下需要，範圍包含什麼、排除什麼>

## 🎯 需求目標
<期望達成的結果>

## ✅ 驗收條件
- [ ] <驗收條件 1>
- [ ] <驗收條件 2>

## 🤖 Opened by
Agent: <agent-name> | Context: <階段或觸發情境>
EOF
```

### Feature Change — `[Enhancement]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Enhancement] <module/page>: <中文描述>" \
  --label "enhancement" \
  --body-file -
## 🎯 修改目的
<既有行為為什麼需要調整>

## 🔁 現況 / 觸發情境
<目前行為，以及出現在哪裡>

## ✅ 預期調整
<變更後的預期行為>

## 🤖 Opened by
Agent: <agent-name> | Context: <階段或觸發情境>
EOF
```

### Task — `[Task]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Task] <中文描述>" \
  --label "task" \
  --body-file -
## 🎯 目的
<為什麼需要這項任務>

## ✅ 任務項目
- [ ] <子任務 1>
- [ ] <子任務 2>

## 📝 附註
- 相關連結：
- 注意事項：<阻塞細節>

## 🤖 Opened by
Agent: <agent-name> | Blocked task: <task-id>
EOF
```

### Feature (UI) — `[UI]`

```bash
cat <<'EOF' | gh issue create \
  --title "[UI] <component>: <中文描述>" \
  --label "ui" \
  --body-file -
## 📌 問題描述
<UI／樣式問題>

## 🔁 重現步驟
See: <file>:<line>

## ✅ 預期結果 vs ❌ 實際結果
**預期結果：** <正確的外觀／行為>
**實際結果：** <實際的外觀／行為>

## 🤖 Opened by
Agent: <agent-name>
EOF
```

### Spike — `[Spike]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Spike] <研究主題>" \
  --label "spike" \
  --body-file -
## 🎯 研究目標
<需要釐清的問題是什麼>

## ❓ 關鍵問題
- <關鍵問題 1>
- <關鍵問題 2>

## 📝 背景
<為什麼這件事卡住實作>

## 🤖 Opened by
Agent: <agent-name> | Blocked task: <task-id>
EOF
```

### Documentation — `[Docs]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Docs] <中文描述>" \
  --label "docs" \
  --body-file -
## 📌 問題描述
<缺少或有誤的文件內容>

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
  --title "[Question] <中文描述>" \
  --label "question" \
  --body-file -
## 📌 問題 / 想問的事
<問題或協助需求>

## 🔎 已嘗試
<已經確認過哪些事>

## 🤖 Opened by
Agent: <agent-name> | Context: <階段或觸發情境>
EOF
```

### Incident / Production Issue — `[Incident]`

```bash
cat <<'EOF' | gh issue create \
  --title "[Incident] <中文描述>" \
  --label "incident" \
  --body-file -
## 🔥 嚴重度
<P0/P1/P2/P3>

## 📌 事故摘要
<發生什麼事、影響到誰>

## 🕒 時間線
- <時間戳>：<事件>

## ✅ 目前處置
<已採取的緩解措施或下一步>

## 🤖 Opened by
Agent: <agent-name> | Context: <階段或觸發情境>
EOF
```
