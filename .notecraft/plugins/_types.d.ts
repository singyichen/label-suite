// 由 `notecraftapp install-plugin` 自動產生，請勿手動編輯。
// 來源：NoteCraft src/lib/plugin-types.ts

export interface PluginFileInfo {
  /** 相對筆記資料夾的路徑，含副檔名 */
  path: string;
  name: string;
  /** 檔案 mtime（ISO 日期字串） */
  updatedAt: string;
}

export interface PluginRendererProps<T = unknown> {
  /** 已 parse 且通過 schema 驗證的資料檔內容 */
  data: T;
  file: PluginFileInfo;
  /** 來自 plugins.json 的 options，renderer 自行合併預設值 */
  options: Record<string, unknown>;
  /** page：獨立全寬頁；embed：嵌在筆記內文、由外框卡片包住 */
  mode: "page" | "embed";
}
