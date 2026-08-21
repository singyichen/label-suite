(function (global) {
  'use strict';

  var outputTypes = [
    {
      key: 'single_label',
      zh: '單一標籤',
      en: 'Single label',
      badgeClass: 'badge-task-type-single'
    },
    {
      key: 'multi_label',
      zh: '多標籤',
      en: 'Multi-label',
      badgeClass: 'badge-task-type-single'
    },
    {
      key: 'single_dim',
      zh: '單維度',
      en: 'Single dimension',
      badgeClass: 'badge-task-type-scoring'
    },
    {
      key: 'multi_dim',
      zh: '多維度',
      en: 'Multi-dimension',
      badgeClass: 'badge-task-type-scoring'
    },
    {
      key: 'sequence_tagging',
      zh: '序列標註',
      en: 'Sequence Tagging',
      badgeClass: 'badge-task-type-sequence'
    },
    {
      key: 'entity_recognition',
      zh: '實體辨識',
      en: 'Entity Recognition',
      badgeClass: 'badge-task-type-sequence'
    },
    {
      key: 'relation_identification',
      zh: '關係識別',
      en: 'Relation Identification',
      badgeClass: 'badge-task-type-relation'
    },
    {
      key: 'free_text',
      zh: '自由文字',
      en: 'Free text',
      badgeClass: 'badge-task-type-pairs'
    }
  ];

  /*
   * These seeds illustrate tasks built from docs/product/example-data.
   * They are not an output-type whitelist or a system task limit.
   */
  var tasks = [
    {
      id: 'T001',
      nameZh: '醫療文本情感分類',
      nameEn: 'Medical Text Sentiment Classification',
      sourceFile: 'single-label.json',
      outputTypes: ['single_label'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-29',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T002',
      nameZh: '癌症歷程情緒多標籤分類',
      nameEn: 'Cancer Journey Emotion Multi-label Classification',
      sourceFile: 'multi-label.json',
      outputTypes: ['multi_label'],
      runType: 'dry_run',
      /* Matches the dashboard's admin sample card (adminTask1 / T002,
         dashboard.data.js, runType dry_run) so the "等待 IAA 確認" stat and
         the /task-list?status=waiting_iaa_confirmation filter reconcile
         instead of contradicting each other (issue #186). Only this dry_run
         seed carries the status: IAA confirmation follows dry-run completion
         (spec 014 lifecycle), and the other seeds must stay draft for the
         task-detail settings-edit tests. */
      status: 'waiting_iaa_confirmation',
      updatedAt: '2026-07-28',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T003',
      nameZh: '病患情緒與照護情境階層分類',
      nameEn: 'Patient Emotion and Care Context Hierarchical Classification',
      sourceFile: 'multi-label-hierarchical.json',
      outputTypes: ['multi_label'],
      /* Matches the dashboard's assignment seed for T003
         (pages/dashboard/dashboard.assignments.js -- LabelSuiteAssignmentSeeds,
         taxonomy-001 work item: runType 'official_run'). task-list.html and
         task-detail.html both render from this record, so it must agree with
         the dashboard instead of defaulting to draft (issue #194). */
      runType: 'official_run',
      status: 'official_run_in_progress',
      updatedAt: '2026-07-27',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T004',
      nameZh: '醫療文本可讀性評分',
      nameEn: 'Medical Text Readability Scoring',
      sourceFile: 'single-dim.json',
      outputTypes: ['single_dim'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-26',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T005',
      nameZh: '醫療翻譯品質多維度評分',
      nameEn: 'Medical Translation Quality Scoring',
      sourceFile: 'multi-dim.json',
      outputTypes: ['multi_dim'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-25',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T006',
      nameZh: '新聞命名實體序列標註',
      nameEn: 'News NER Sequence Tagging',
      sourceFile: 'sequence-tagging.json',
      outputTypes: ['sequence_tagging'],
      runType: 'dry_run',
      status: 'draft',
      updatedAt: '2026-07-24',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T007',
      nameZh: '產品評論觀點實體辨識',
      nameEn: 'Product Review Opinion Entity Recognition',
      sourceFile: 'entity-recognition.json',
      outputTypes: ['entity_recognition'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-23',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T008',
      nameZh: '醫療文本關係辨識',
      nameEn: 'Medical Relation Identification',
      sourceFile: 'relation-identification.json',
      outputTypes: ['relation_identification'],
      runType: 'dry_run',
      status: 'draft',
      updatedAt: '2026-07-22',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T009',
      nameZh: '醫療文本摘要',
      nameEn: 'Medical Text Summarization',
      sourceFile: 'free-text.json',
      outputTypes: ['free_text'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-21',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T010',
      nameZh: '醫療實體與關係辨識',
      nameEn: 'Medical Entity and Relation Recognition',
      sourceFile: 'medical-ner-re.json',
      outputTypes: ['entity_recognition', 'relation_identification'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-20',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T011',
      nameZh: '醫療自然語言推斷',
      nameEn: 'Medical NLI',
      sourceFile: 'nli.json',
      outputTypes: ['single_label'],
      runType: 'dry_run',
      status: 'draft',
      updatedAt: '2026-07-19',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T012',
      nameZh: '醫療閱讀理解問答',
      nameEn: 'Medical QA',
      sourceFile: 'mrc.json',
      outputTypes: ['free_text'],
      runType: 'official_run',
      status: 'draft',
      updatedAt: '2026-07-18',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T013',
      nameZh: 'ABSA + 情緒回歸（YouTube 留言）',
      nameEn: 'ABSA + Emotion Regression (YouTube Comments)',
      sourceFile: 'absa-va.json',
      outputTypes: [
        'entity_recognition',
        'relation_identification',
        'multi_dim'
      ],
      runType: 'dry_run',
      status: 'draft',
      updatedAt: '2026-07-17',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T014',
      nameZh: '審核流程示範：試標',
      nameEn: 'Review Flow Demo: Dry Run',
      sourceFile: 'review-flow-dry-run.json',
      outputTypes: ['single_label'],
      runType: 'dry_run',
      status: 'dry_run_in_progress',
      updatedAt: '2026-08-21',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T015',
      nameZh: '審核流程示範：正式標記（單一審核員）',
      nameEn: 'Review Flow Demo: Official Run (Single Reviewer)',
      sourceFile: 'review-flow-official-single.json',
      outputTypes: ['single_label'],
      runType: 'official_run',
      status: 'official_run_in_progress',
      updatedAt: '2026-08-21',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T016',
      nameZh: '審核流程示範：正式標記（三審核員多數決）',
      nameEn: 'Review Flow Demo: Official Run (Three Reviewers)',
      sourceFile: 'review-flow-official-multi.json',
      outputTypes: ['single_label'],
      runType: 'official_run',
      status: 'official_run_in_progress',
      updatedAt: '2026-08-21',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    },
    {
      id: 'T017',
      nameZh: '審核流程示範：正式標記（雙審核員平手）',
      nameEn: 'Review Flow Demo: Official Run (Two Reviewers Tie)',
      sourceFile: 'review-flow-official-tie.json',
      outputTypes: ['single_label'],
      runType: 'official_run',
      status: 'official_run_in_progress',
      updatedAt: '2026-08-21',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    }
  ];

  global.LabelSuiteTaskListData = {
    outputTypes: outputTypes,
    tasks: tasks
  };
}(window));
