/**
 * Issue #1448 PR-B: task-list and annotation-list adopt pages/shared/list-page.css
 * (introduced by PR-A) and delete their duplicated list-page rules. GOAL: zero visible
 * change, so the runtime half pins computed values captured from the unmodified tree
 * (origin/main 8f4357fb) at 1440x900, zh and en identical.
 *
 * Contract:
 *   - both pages link ../shared/list-page.css BEFORE their first inline <style>
 *   - neither inline style owns a moved selector (outside @media) except the page-owned
 *     overrides:
 *       task-list:       .filter-select { min-width: 140px }, .task-table { min-width: 640px },
 *                        .page-btn.active { color: var(--color-on-cta) } (dark tokens differ)
 *       annotation-list: .filter-select { min-width: 180px }, .task-table { min-width: 640px },
 *                        :where(button, input, select) { cursor: revert } (its old reset had no
 *                        cursor:pointer; revert keeps the UA cursors so hover cursors are unchanged)
 *   - the page-local `:where(button, input, select) { font: inherit }` reset is gone from both
 *   - MASTER.md changelog has a v1.43 row naming #1448 and list-page.css
 *
 * Traceability: design/system/MASTER.md changelog; issue #1448
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { buildListUrl } from '../annotation/_workspace-helpers';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const TASK_FILE = 'pages/task-management/task-list.html';
const ANNOTATION_FILE = 'pages/annotation/annotation-list.html';
const read = (rel: string) => fs.readFileSync(path.join(PROTO_ROOT, rel), 'utf8');

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

// Drops comments and every @media / @supports block (responsive overrides may stay page-local).
function topLevelCss(css: string): string {
  let out = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (;;) {
    const at = out.search(/@(media|supports)[^{]*\{/);
    if (at === -1) return out;
    const open = out.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    while (i < out.length && depth > 0) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') depth--;
      i++;
    }
    out = out.slice(0, at) + out.slice(i);
  }
}

const MOVED = [
  ':where(button, input, select)',
  'button', 'input', 'select',
  '.toolbar', '.toolbar-left', '.search-wrap', '.search-icon',
  '.search-input', '.search-input::placeholder', '.search-input:focus',
  '.filter-select', '.filter-select:focus',
  '.clear-btn', '.clear-btn:hover', '.clear-btn.hide-clear',
  '.task-table-wrap', '.task-table', '.task-table th', '.task-table td',
  '.pagination', '.pagination-left', '.pagination-info', '.pagination-controls',
  '.page-btn', '.page-btn:disabled', '.page-btn.active',
  '.page-btn:hover:not(:disabled):not(.active)',
  '.page-ellipsis', '.page-size-select',
];
// Deliberate page-owned overrides: selector -> the only declarations it may keep.
const ALLOWED_OVERRIDES: Record<string, Record<string, string[]>> = {
  [TASK_FILE]: {
    '.filter-select': ['min-width'],
    '.task-table': ['min-width'],
    '.page-btn.active': ['color'],
  },
  [ANNOTATION_FILE]: {
    '.filter-select': ['min-width'],
    '.task-table': ['min-width'],
    ':where(button, input, select)': ['cursor'],
  },
};

function movedSelectorOffenders(file: string): string[] {
  const allowedFor = ALLOWED_OVERRIDES[file];
  const offenders: string[] = [];
  for (const m of topLevelCss(inlineStyleText(read(file))).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const props = m[2].split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter(Boolean);
    // Split on commas outside parentheses so `:where(button, input, select)` stays one selector.
    for (const raw of m[1].split(/,(?![^()]*\))/)) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      if (!MOVED.includes(sel)) continue;
      const allowed = allowedFor[sel];
      if (allowed && props.every((p) => allowed.includes(p))) continue;
      offenders.push(`${sel} { ${props.join(', ')} }`);
    }
  }
  return offenders;
}

const PAGES = [
  { name: 'task-list', file: TASK_FILE },
  { name: 'annotation-list', file: ANNOTATION_FILE },
] as const;

test.describe('Issue #1448-B list-page.css adoption: static contract', () => {
  for (const { name, file } of PAGES) {
    test(`${name} links ../shared/list-page.css before its first <style>`, () => {
      const html = read(file);
      const link = html.search(
        /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/list-page\.css"|<link[^>]+href="\.\.\/shared\/list-page\.css"[^>]+rel="stylesheet"/,
      );
      expect(link, 'list-page.css <link> position').toBeGreaterThanOrEqual(0);
      expect(link, '<link> precedes first <style>').toBeLessThan(html.search(/<style[\s>]/i));
    });

    test(`${name} inline style owns no moved selector beyond its deliberate overrides`, () => {
      expect(movedSelectorOffenders(file), 'page-owned moved rules').toEqual([]);
    });

    test(`${name} no longer carries the page-local font reset`, () => {
      const css = topLevelCss(inlineStyleText(read(file)));
      expect(css).not.toMatch(/:where\(button, input, select\)\s*\{[^}]*font:/);
      expect(css).not.toMatch(/(^|\})\s*button\s*,\s*input\s*,\s*select\s*\{/);
    });

    test(`${name} keeps .task-table { min-width: 640px }`, () => {
      expect(topLevelCss(inlineStyleText(read(file)))).toMatch(/\.task-table\s*\{[^}]*min-width:\s*640px/);
    });
  }

  test('task-list keeps .filter-select { min-width: 140px } and the on-cta active page color', () => {
    const css = topLevelCss(inlineStyleText(read(TASK_FILE)));
    expect(css).toMatch(/\.filter-select\s*\{[^}]*min-width:\s*140px/);
    expect(css).toMatch(/\.page-btn\.active\s*\{\s*color:\s*var\(--color-on-cta\)\s*;?\s*\}/);
  });

  test('annotation-list keeps .filter-select { min-width: 180px }', () => {
    expect(topLevelCss(inlineStyleText(read(ANNOTATION_FILE)))).toMatch(/\.filter-select\s*\{[^}]*min-width:\s*180px/);
  });

  test('annotation-list keeps `:where(button, input, select) { cursor: revert }` and its reviewer-stats rules', () => {
    const css = topLevelCss(inlineStyleText(read(ANNOTATION_FILE)));
    expect(css).toMatch(/:where\(button, input, select\)\s*\{\s*cursor:\s*revert\s*;?\s*\}/);
    expect(css).toContain('.task-table:has(.reviewer-stats-cell)');
  });
});

test.describe('Issue #1448-B MASTER.md changelog', () => {
  test('has a v1.43 row naming #1448 and list-page.css', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const row = master.split('\n').find((l) => /^\|\s*v1\.43\s*\|/.test(l));
    expect(row, 'v1.43 changelog row').toBeDefined();
    expect(row).toContain('#1448');
    expect(row).toContain('list-page.css');
  });
});

type Lang = 'zh' | 'en';
type Baseline = Record<string, Record<string, string>>;
async function seed(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l) => {
    localStorage.setItem('labelsuite.lang', l);
    localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  }, lang);
}

// Computed values captured from the unmodified tree (origin/main 8f4357fb) at 1440x900;
// every entry is identical in zh and en (language-dependent width / height / line-height are
// deliberately not pinned). Selector keys resolve to the first match.
const TASK_LIST_BASELINE: Baseline = {
  ".toolbar": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'0px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'24px',verticalAlign:'baseline',bgImg:'none'},
  ".toolbar-left": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-wrap": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'relative',width:'280px',minWidth:'220px',maxWidth:'280px',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-icon": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'absolute',minWidth:'0px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'hidden',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-input": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',width:'280px',minWidth:'auto',maxWidth:'none',paddingTop:'9px',paddingRight:'12px',paddingBottom:'9px',paddingLeft:'36px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'clip',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".filter-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'140px',maxWidth:'none',paddingTop:'9px',paddingRight:'32px',paddingBottom:'9px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
  ".clear-btn": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'8px',paddingRight:'12px',paddingBottom:'8px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(100, 116, 139)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table-wrap": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'auto',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table": {display:'table',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'640px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(128, 128, 128)',borderBottom:'0px none rgb(128, 128, 128)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table th": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'0px',maxWidth:'none',paddingTop:'12px',paddingRight:'20px',paddingBottom:'12px',paddingLeft:'20px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'0px',fontSize:'11px',fontWeight:'600',color:'rgb(100, 116, 139)',backgroundColor:'rgb(248, 250, 252)',cursor:'auto',opacity:'1',letterSpacing:'0.55px',textTransform:'uppercase',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".task-table td": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'0px',maxWidth:'none',paddingTop:'14px',paddingRight:'20px',paddingBottom:'14px',paddingLeft:'20px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'1px solid rgb(241, 245, 249)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'600',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".pagination": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'16px',paddingRight:'24px',paddingBottom:'16px',paddingLeft:'24px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-left": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-info": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'13px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-controls": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn.active": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(99, 102, 241)',borderBottom:'1px solid rgb(99, 102, 241)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(255, 255, 255)',backgroundColor:'rgb(99, 102, 241)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn:disabled": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'not-allowed',opacity:'0.4',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-size-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'5px',paddingRight:'28px',paddingBottom:'5px',paddingLeft:'10px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
};

const ANNOTATOR_BASELINE: Baseline = {
  ".toolbar": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'24px',verticalAlign:'baseline',bgImg:'none'},
  ".toolbar-left": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-wrap": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'relative',width:'280px',minWidth:'220px',maxWidth:'280px',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-icon": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'absolute',minWidth:'0px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'hidden',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-input": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',width:'280px',minWidth:'auto',maxWidth:'none',paddingTop:'9px',paddingRight:'12px',paddingBottom:'9px',paddingLeft:'36px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'text',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'clip',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".filter-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'180px',maxWidth:'none',paddingTop:'9px',paddingRight:'32px',paddingBottom:'9px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
  ".clear-btn": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'8px',paddingRight:'12px',paddingBottom:'8px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(100, 116, 139)',backgroundColor:'rgb(255, 255, 255)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table-wrap": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'auto',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table": {display:'table',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'640px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(128, 128, 128)',borderBottom:'0px none rgb(128, 128, 128)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table th": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'0px',maxWidth:'none',paddingTop:'12px',paddingRight:'20px',paddingBottom:'12px',paddingLeft:'20px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'0px',fontSize:'11px',fontWeight:'600',color:'rgb(100, 116, 139)',backgroundColor:'rgb(248, 250, 252)',cursor:'auto',opacity:'1',letterSpacing:'0.55px',textTransform:'uppercase',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".task-table td": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'0px',maxWidth:'none',paddingTop:'14px',paddingRight:'20px',paddingBottom:'14px',paddingLeft:'20px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'1px solid rgb(241, 245, 249)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".pagination": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'16px',paddingRight:'24px',paddingBottom:'16px',paddingLeft:'24px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-left": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-info": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'13px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-controls": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn.active": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(99, 102, 241)',borderBottom:'1px solid rgb(99, 102, 241)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(255, 255, 255)',backgroundColor:'rgb(99, 102, 241)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn:disabled": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'not-allowed',opacity:'0.4',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-size-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'5px',paddingRight:'28px',paddingBottom:'5px',paddingLeft:'10px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
};

const REVIEWER_BASELINE: Baseline = {
  ".toolbar": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'24px',verticalAlign:'baseline',bgImg:'none'},
  ".toolbar-left": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'normal',columnGap:'8px',rowGap:'8px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-wrap": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'relative',width:'280px',minWidth:'220px',maxWidth:'280px',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-icon": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'absolute',minWidth:'0px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'hidden',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".search-input": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',width:'280px',minWidth:'auto',maxWidth:'none',paddingTop:'9px',paddingRight:'12px',paddingBottom:'9px',paddingLeft:'36px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'text',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'clip',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".filter-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'180px',maxWidth:'none',paddingTop:'9px',paddingRight:'32px',paddingBottom:'9px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
  ".clear-btn": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'8px',paddingRight:'12px',paddingBottom:'8px',paddingLeft:'12px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(100, 116, 139)',backgroundColor:'rgb(255, 255, 255)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table-wrap": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'auto',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table": {display:'table',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'640px',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(128, 128, 128)',borderBottom:'0px none rgb(128, 128, 128)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'nowrap',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".task-table th": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'100px',maxWidth:'120px',paddingTop:'12px',paddingRight:'8px',paddingBottom:'12px',paddingLeft:'8px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'0px',fontSize:'11px',fontWeight:'600',color:'rgb(100, 116, 139)',backgroundColor:'rgb(248, 250, 252)',cursor:'auto',opacity:'1',letterSpacing:'0.55px',textTransform:'uppercase',textAlign:'left',whiteSpace:'normal',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".task-table td": {display:'table-cell',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'100px',maxWidth:'120px',paddingTop:'14px',paddingRight:'8px',paddingBottom:'14px',paddingLeft:'8px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'1px solid rgb(241, 245, 249)',borderTopLeftRadius:'0px',fontSize:'14px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'left',whiteSpace:'normal',borderCollapse:'collapse',overflowX:'visible',marginBottom:'0px',verticalAlign:'middle',bgImg:'none'},
  ".pagination": {display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'16px',paddingRight:'24px',paddingBottom:'16px',paddingLeft:'24px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-left": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'16px',rowGap:'16px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-info": {display:'block',flexWrap:'nowrap',alignItems:'normal',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(100, 116, 139)',borderBottom:'0px none rgb(100, 116, 139)',borderTopLeftRadius:'0px',fontSize:'13px',fontWeight:'400',color:'rgb(100, 116, 139)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".pagination-controls": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'4px',rowGap:'4px',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'0px',paddingBottom:'0px',paddingLeft:'0px',borderTop:'0px none rgb(30, 27, 75)',borderBottom:'0px none rgb(30, 27, 75)',borderTopLeftRadius:'0px',fontSize:'16px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgba(0, 0, 0, 0)',cursor:'auto',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn.active": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(99, 102, 241)',borderBottom:'1px solid rgb(99, 102, 241)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(255, 255, 255)',backgroundColor:'rgb(99, 102, 241)',cursor:'default',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-btn:disabled": {display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'center',columnGap:'normal',rowGap:'normal',position:'static',width:'32px',height:'32px',minWidth:'auto',maxWidth:'none',paddingTop:'0px',paddingRight:'8px',paddingBottom:'0px',paddingLeft:'8px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'500',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'not-allowed',opacity:'0.4',letterSpacing:'normal',textTransform:'none',textAlign:'center',whiteSpace:'normal',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'none'},
  ".page-size-select": {display:'block',flexWrap:'nowrap',alignItems:'center',justifyContent:'normal',columnGap:'normal',rowGap:'normal',position:'static',minWidth:'auto',maxWidth:'none',paddingTop:'5px',paddingRight:'28px',paddingBottom:'5px',paddingLeft:'10px',borderTop:'1px solid rgb(226, 232, 240)',borderBottom:'1px solid rgb(226, 232, 240)',borderTopLeftRadius:'8px',fontSize:'13px',fontWeight:'400',color:'rgb(30, 27, 75)',backgroundColor:'rgb(255, 255, 255)',cursor:'pointer',opacity:'1',letterSpacing:'normal',textTransform:'none',textAlign:'start',whiteSpace:'pre',borderCollapse:'separate',overflowX:'visible',marginBottom:'0px',verticalAlign:'baseline',bgImg:'url("data:image/svg+'},
};

const BASELINE_PROPS = [
  'display', 'flexWrap', 'alignItems', 'justifyContent', 'columnGap', 'rowGap', 'position', 'width', 'height',
  'minWidth', 'maxWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTop', 'borderBottom',
  'borderTopLeftRadius', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'cursor', 'opacity', 'letterSpacing',
  'textTransform', 'textAlign', 'whiteSpace', 'borderCollapse', 'overflowX', 'marginBottom', 'verticalAlign',
];

type Target = {
  name: string;
  url: string;
  baseline: Baseline;
  /** Cursor each form control must keep (UA defaults on annotation-list, pointer on task-list). */
  cursors: { button: string; input: string; select: string; pageSize: string };
};
const TARGETS: Target[] = [
  {
    name: 'task-list (project_leader)',
    url: '/pages/task-management/task-list.html?task_role=project_leader',
    baseline: TASK_LIST_BASELINE,
    cursors: { button: 'pointer', input: 'pointer', select: 'pointer', pageSize: 'pointer' },
  },
  {
    name: 'annotation-list (annotator)',
    url: buildListUrl({ task_id: 'T016', role: 'annotator', run_type: 'official_run' }),
    baseline: ANNOTATOR_BASELINE,
    cursors: { button: 'default', input: 'text', select: 'default', pageSize: 'pointer' },
  },
  {
    name: 'annotation-list (reviewer)',
    url: buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }),
    baseline: REVIEWER_BASELINE,
    cursors: { button: 'default', input: 'text', select: 'default', pageSize: 'pointer' },
  },
];
for (const lang of ['zh', 'en'] as const) {
  for (const target of TARGETS) {
    test.describe(`Issue #1448-B ${target.name} computed baseline (${lang})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await seed(page, lang);
        await page.goto(target.url);
        await page.waitForSelector('.task-table tbody tr');
      });

      for (const [selector, want] of Object.entries(target.baseline)) {
        test(`${selector} keeps its pre-refactor look`, async ({ page }) => {
          const got = await page.locator(selector).first().evaluate(
            (el, props) => {
              const cs = getComputedStyle(el) as unknown as Record<string, string>;
              const out: Record<string, string> = Object.fromEntries(props.map((p) => [p, cs[p]]));
              out.bgImg = cs.backgroundImage.slice(0, 20);
              return out;
            },
            BASELINE_PROPS.filter((p) => p in want),
          );
          expect(got, selector).toEqual(want);
        });
      }

      test('element reset: button / input / select inherit the page font and keep their cursors', async ({ page }) => {
        const got = await page.evaluate(() => {
          const bodyFont = getComputedStyle(document.body).fontFamily;
          const pick = (sel: string) => {
            const cs = getComputedStyle(document.querySelector(sel)!);
            return { family: cs.fontFamily, cursor: cs.cursor };
          };
          return {
            bodyFont,
            button: pick('#clearFiltersBtn'),
            input: pick('#searchInput'),
            select: pick('#statusFilter'),
            pageSize: pick('#pageSizeSelect'),
          };
        });
        expect(got.bodyFont).toContain('Inter');
        for (const k of ['button', 'input', 'select', 'pageSize'] as const) {
          expect(got[k].family, `${k} font-family`).toBe(got.bodyFont);
          expect(got[k].cursor, `${k} cursor`).toBe(target.cursors[k]);
        }
      });
    });
  }
}
