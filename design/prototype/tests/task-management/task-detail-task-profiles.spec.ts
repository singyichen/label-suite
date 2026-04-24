import { test, expect } from '@playwright/test';

const TASK_LIST_URL = '/pages/task-management/task-list.html?task_role=project_leader';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

const TASK_PROFILES = [
  {
    id: 'T001',
    name: '新聞標題多標籤分類',
    type: '單句分類（含多標籤）',
    dataset: 'news_headlines_multilabel_2026.csv',
    settings: ['標籤清單', '政治, 社會, 娛樂, 體育, 科技', '允許多選', '是'],
    editPreview: ['政治', '社會', '娛樂', '體育', '科技'],
  },
  {
    id: 'T002',
    name: '情感 VA 雙維度評分',
    type: '單句 VA 雙維度評分（Valence / Arousal）',
    dataset: 'sentiment_va_corpus_v2.csv',
    settings: ['Valence', '1 ~ 9', 'Arousal', '1 ~ 9'],
    editPreview: ['Valence 評分', 'Arousal 評分'],
  },
  {
    id: 'T003',
    name: '產品評論序列標註（NER / Aspect）',
    type: '序列標記（含 Aspect / NER）',
    dataset: 'product_reviews_ner_aspect.tsv',
    settings: ['實體類型', 'ASPECT, OPINION, BRAND', '標記格式', 'BIOES'],
    editPreview: ['ASPECT', 'OPINION', 'BRAND', 'BIOES'],
  },
  {
    id: 'T004',
    name: '醫療關係抽取（Entity / Triple）',
    type: '關係抽取（Entity + Relation + Triple）',
    dataset: 'medical_relation_triples.jsonl',
    settings: ['實體類型', 'DRUG, DISEASE, SYMPTOM', '關係類型', 'treats, causes, indicates'],
    editPreview: ['treats', 'causes', 'indicates', 'triple'],
  },
  {
    id: 'T005',
    name: '句對相似度 / 蘊含判定',
    type: '句對任務（相似度 / 蘊含）',
    dataset: 'sentence_pairs_nli.parquet',
    settings: ['關係標籤', '相似, 不相似, 蘊含, 矛盾'],
    editPreview: ['句子 A', '句子 B', '相似', '不相似'],
  },
];

test.describe('Task detail profile mapping', () => {
  test('project leader task list rows all stay draft and open task detail', async ({ page }) => {
    await page.goto(TASK_LIST_URL);

    for (const task of TASK_PROFILES) {
      const row = page.locator('tbody tr').filter({ hasText: task.name }).first();
      await expect(row).toContainText('草稿');
      await row.click();
      await expect(page).toHaveURL(new RegExp(`${TASK_DETAIL_URL.replace(/\//g, '\\/')}\\?task_id=${task.id}$`));
      await page.goBack();
      await expect(page).toHaveURL(/task-list\.html\?task_role=project_leader/);
    }
  });

  for (const task of TASK_PROFILES) {
    test(`renders task-specific overview for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      const overview = page.locator('#overviewPanel');
      await expect(overview).toContainText(task.name);
      await expect(overview).toContainText(task.type);
      await expect(overview).toContainText(task.dataset);

      for (const text of task.settings) {
        await expect(page.locator('#settingsConfigView')).toContainText(text);
      }
    });

    test(`allows editing task-specific settings for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      const editBtn = page.locator('#settingsEditBtn');
      await expect(page.locator('#statusBadge')).toContainText('草稿');
      await expect(editBtn).toBeEnabled();

      await editBtn.click();

      await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
      for (const text of task.editPreview) {
        await expect(page.locator('#settingsEditForm')).toContainText(text);
      }
    });
  }
});
