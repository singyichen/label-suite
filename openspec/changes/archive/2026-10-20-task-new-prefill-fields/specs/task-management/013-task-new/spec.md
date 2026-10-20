# Task New — 預填來源欄位設定 prefill_fields（issue #1430）

## Purpose

本 delta 新增任務設定鍵 `prefill_fields`，由設定宣告整合預覽預填實體與預填三元組的來源欄位，取代以固定鍵名讀取。**只新增 FR-002c-11、AC-1.15、AC-1.16、SC-002k**；讀取端規則屬 annotation/015-annotation-workspace。

## ADDED Requirements

### Requirement: FR-002c-11 任務設定鍵 prefill_fields 宣告預填來源欄位

任務設定 MUST 支援選填鍵 `prefill_fields`（`{ entities, triples }`，兩者皆為資料列紀錄中的欄位名稱字串或 `null`；整個鍵可為 `null`），用以宣告整合預覽預填實體與預填三元組的來源欄位。整個鍵預設為 `null`；缺少 `entities` 或 `triples` 子鍵時 MUST 視同 `null`；既有任務或種子缺少此鍵時 MUST 視同 `null`。建立任務 payload MUST 帶 `prefill_fields`；Step 1 目前不提供設定此鍵的介面，故由精靈建立的任務其值為 `null`。任務詳情載入與儲存設定時 MUST 原樣保留此鍵。預填來源宣告不改變欄位角色，下游讀取時仍須通過欄位角色守門（specs/annotation/015-annotation-workspace/spec.md FR-107），角色為 Output 或未知的宣告欄位不得預填。

#### Scenario: AC-1.15 預設為 null，缺鍵與缺子鍵視同 null

- **GIVEN** 使用者以精靈建立任務（Step 1 無設定預填來源的介面），或讀入缺少 `prefill_fields` 的既有任務、或 `prefill_fields` 只含 `entities` 子鍵的任務
- **WHEN** 建立任務，或載入任務設定
- **THEN** 精靈建立任務的 `prefill_fields` 為 `null`
- **AND** 缺少 `prefill_fields` 的既有任務視同 `null`，只含 `entities` 子鍵的任務其 `triples` 視同 `null`

#### Scenario: AC-1.16 種子宣告的預填來源欄位帶入任務詳情設定

- **GIVEN** 種子任務 T008 宣告 `prefill_fields` 為 `{ entities: 'entities', triples: null }`
- **WHEN** 開啟 T008 任務詳情並載入其設定
- **THEN** 任務資料與設定狀態的 `prefill_fields` 為該宣告
- **AND** 儲存設定後 `prefill_fields` 仍為該宣告，未宣告的任務（含 T010、T013）仍為 `null`

#### Scenario: SC-002k 預填來源設定隨建立任務 payload 帶出

- **GIVEN** 使用者完成精靈
- **WHEN** 建立任務
- **THEN** 建立任務 payload 含 `prefill_fields` 鍵，精靈建立的任務值為 `null`
- **AND** 既有 payload 的其他鍵（含 `dialogue_fields`）不受影響
