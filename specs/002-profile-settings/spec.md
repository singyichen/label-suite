# Feature Specification: Profile Settings Page

**Feature Branch**: `002-profile-settings`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "個人設定頁（M1b）：登入後的使用者個人資料設定頁面。使用者可以查看與編輯自己的帳號資訊，包含顯示名稱、Email（唯讀，來自 SSO）、頭像、介面語言切換（ZH/EN）。"

## User Scenarios & Testing *(required)*

### User Story 1 - View and Edit Profile Info (Priority: P1)

登入後的使用者（管理員、標記員、審核員）可以在個人設定頁查看自己的帳號資訊，並編輯顯示名稱與頭像，讓平台上的其他使用者能識別自己。

**Why this priority**: 所有角色都需要基本的個人資料管理，是帳號模組的核心功能，且不依賴任何其他模組。

**Independent Test**: 登入後進入個人設定頁，修改顯示名稱並儲存，再重新整理頁面確認名稱已更新。

**Acceptance Scenarios**:

1. **Given** 使用者已登入，**When** 進入個人設定頁，**Then** 頁面顯示目前的顯示名稱、Email（唯讀）、頭像、角色。
2. **Given** 使用者在個人設定頁，**When** 修改顯示名稱並點擊儲存，**Then** 系統顯示儲存成功提示，頁面更新為新名稱。
3. **Given** 使用者在個人設定頁，**When** 上傳新頭像，**Then** 頭像預覽即時更新，儲存後全站導覽列顯示新頭像。
4. **Given** 使用者嘗試修改 Email 欄位，**When** 點擊 Email 輸入框，**Then** 欄位維持唯讀狀態，並顯示「Email 由 SSO 帳號管理」提示。

---

### User Story 2 - Switch Interface Language (Priority: P2)

使用者可以在個人設定頁切換介面語言（ZH 繁體中文 / EN English），切換後全站 UI 文字立即反映新語言設定。

**Why this priority**: 語言切換增強使用體驗但不影響核心標注功能，屬於增強功能，可在 P1 完成後獨立交付。

**Independent Test**: 在個人設定頁將語言從 ZH 切換為 EN，確認頁面標題、按鈕文字、導覽列全部切換為英文。

**Acceptance Scenarios**:

1. **Given** 使用者介面語言為 ZH，**When** 在個人設定頁切換為 EN 並儲存，**Then** 全站 UI 立即切換為英文，頁面不重新整理。
2. **Given** 使用者已設定語言偏好，**When** 登出後重新登入，**Then** 系統套用上次儲存的語言設定。

---

### Edge Cases

- 顯示名稱為空白時，系統應拒絕儲存並顯示驗證錯誤。
- 上傳的頭像超過檔案大小限制（5MB）時，系統應顯示錯誤提示並拒絕上傳。
- 上傳非圖片格式時，系統應顯示「僅支援 JPG、PNG、WebP」錯誤。
- 儲存時網路中斷，系統應顯示失敗提示並保留表單內容。

## Requirements *(required)*

### Functional Requirements

- **FR-001**: The system MUST display the user's current display name, Email (read-only), avatar, and role on the profile settings page.
- **FR-002**: The system MUST allow users to update their display name (non-empty, max 50 characters).
- **FR-003**: The system MUST allow users to upload a new avatar (JPG/PNG/WebP, max 5MB) with live preview before saving.
- **FR-004**: The system MUST prevent editing of the Email field, with a tooltip explaining it is managed by SSO.
- **FR-005**: Users MUST be able to switch the interface language between ZH (Traditional Chinese) and EN (English).
- **FR-006**: The system MUST persist the language preference across sessions.
- **FR-007**: The system MUST show a success/failure toast notification after save actions.

### Key Entities

- **UserProfile**: Represents a logged-in user's profile. Key attributes: `id`, `display_name`, `email` (from SSO, read-only), `avatar_url`, `role` (admin | annotator | reviewer), `language_preference` (zh | en).

## Success Criteria *(required)*

- **SC-001**: Users can view and update their profile information in under 30 seconds.
- **SC-002**: Language switch takes effect immediately without page reload.
- **SC-003**: All form validation errors are surfaced inline before submission.
- **SC-004**: Avatar upload and preview works correctly for JPG, PNG, and WebP formats under 5MB.
