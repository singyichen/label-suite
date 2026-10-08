import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const account = readFileSync(new URL('../../specs/account/020-auth-session-security/spec.md', import.meta.url), 'utf8');
const adr = readFileSync(new URL('../../docs/adr/021-jwt-refresh-token-auth.md', import.meta.url), 'utf8');

const requirement = (id) => {
  const line = account.match(new RegExp(`^- \\*\\*${id}\\*\\*：[^\\n]+`, 'm'))?.[0];
  assert.ok(line, `Missing account-020 ${id}`);
  return line;
};

test('account-020 FR-001 gives each login one session and a real token FK', () => {
  const fr001 = requirement('FR-001');
  assert.match(fr001, /`account_session`/);
  assert.match(fr001, /`refresh_tokens\.session_id`.*(?:真實 FK|真 FK|外鍵)/);
  assert.match(fr001, /`logged_out_at`.*(?:可空|nullable)/i);
  assert.doesNotMatch(fr001, /`account_token_family`|`refresh_tokens\.family_id`/);
});

test('account-020 FR-008 records only verifiable explicit logout', () => {
  const fr008 = requirement('FR-008');
  assert.match(fr008, /`sid`/);
  assert.match(fr008, /`session_id`|`refresh_tokens\.session_id`/);
  assert.match(fr008, /`logged_out_at`/);
  assert.match(fr008, /`revoked_at`/);
  assert.match(fr008, /同一交易/);
  assert.match(fr008, /(?:明確登出|成功登出)/);
  const cookieOnly = fr008.match(/(?:兩種憑證均不可驗證|無有效憑證)[^。]+/)?.[0];
  assert.ok(cookieOnly, 'FR-008 must cover cookie cleanup without valid credentials');
  assert.match(cookieOnly, /(?:清除 cookies|清 cookie)/);
  assert.match(cookieOnly, /`logged_out_at`.*(?:空|不寫|不填)|(?:空|不寫|不填).*`logged_out_at`/);
  const securityRevocation = fr008.match(/(?:改密碼|email|安全作廢)[^。]+/)?.[0];
  assert.ok(securityRevocation, 'FR-008 must distinguish security revocation from logout');
  assert.match(securityRevocation, /`logged_out_at`.*(?:空|不寫|不填)|(?:空|不寫|不填).*`logged_out_at`/);
});

test('ADR-021 distinguishes explicit logout from revocation and cookie cleanup', () => {
  const store = adr.split('### Refresh Token Store\n')[1]?.split('\n### ')[0];
  assert.ok(store, 'Missing ADR-021 Refresh Token Store decision');
  const paragraphs = store.split(/\n\s*\n/);
  const model = paragraphs.find((paragraph) => /`account_session` stores/.test(paragraph));
  assert.ok(model, 'ADR-021 must define the account_session record');
  assert.match(model, /nullable `logged_out_at`/);
  assert.match(model, /`refresh_tokens`.*`session_id` FK/);
  assert.doesNotMatch(store, /`account_token_family`|`family_id`/);

  const logout = paragraphs.find((paragraph) => /\bLogout\b.*\bsid\b.*cookies/i.test(paragraph));
  assert.ok(logout, 'ADR-021 must define the single-session logout flow');
  assert.match(logout, /(?:explicit|successful) logout/i);
  assert.match(logout, /`logged_out_at`/);
  assert.match(logout, /`revoked_at`/);
  assert.match(logout, /same transaction/i);
  assert.match(logout, /(?:clears? cookies|cookie cleanup).*(?:`logged_out_at`.*(?:null|unset)|(?:null|unset).*`logged_out_at`)/i);

  const security = paragraphs.find((paragraph) => /Password change.*email/i.test(paragraph));
  assert.ok(security, 'ADR-021 must cover password and email security revocations');
  assert.match(security, /`logged_out_at`.*(?:null|unset)|(?:null|unset).*`logged_out_at`/i);
});

test('ADR-021 keeps the JWT sid claim bound to the renamed session UUID', () => {
  const payload = adr.match(/### JWT Payload\s+```json\s*([\s\S]*?)\s*```/)?.[1];
  assert.ok(payload, 'Missing ADR-021 JWT payload example');
  const claims = JSON.parse(payload);
  assert.ok(Object.hasOwn(claims, 'sid'));
  assert.equal(Object.hasOwn(claims, 'session_id'), false);
  assert.equal(claims.sid, '<account_session.id>');
});

test('auth lifecycle diagram uses account_session and distinguishes explicit logout', () => {
  const diagram = JSON.parse(readFileSync(new URL('../../specs/account/001-login-email-password/diagrams/auth-token-lifecycle.json', import.meta.url), 'utf8'));
  const visible = JSON.stringify(diagram);
  assert.match(visible, /account_session/);
  assert.match(visible, /refresh_tokens\(session_id\)/);
  assert.match(visible, /logged_out_at/);
  assert.doesNotMatch(visible, /account_token_family|family_id|familyStore/);
  const logout = diagram.messages.find((message) => message.id === 'logout-session');
  assert.ok(logout, 'Explicit logout step must be documented');
  assert.match(logout.note, /logged_out_at/);
  assert.match(logout.note, /(?:無有效憑證|兩種憑證皆不可驗證)/);
});

test('session OpenSpec delta classifies renamed and newly derived requirements', () => {
  const active = new URL('../../openspec/changes/account-session-naming-contract/', import.meta.url);
  const archiveRoot = new URL('../../openspec/changes/archive/', import.meta.url);
  const archiveName = existsSync(active) ? null : readdirSync(archiveRoot).find((name) => name.endsWith('-account-session-naming-contract'));
  assert.ok(existsSync(active) || archiveName, 'Active or archived session change is required');
  const change = archiveName ? new URL(archiveName + '/', archiveRoot) : active;
  const accountDelta = readFileSync(new URL('specs/account/020-auth-session-security/spec.md', change), 'utf8');
  const foundationDelta = readFileSync(new URL('specs/foundation/000-foundation/spec.md', change), 'utf8');
  assert.match(accountDelta, /## RENAMED Requirements/);
  for (const id of ['FR-001','FR-002','FR-003','FR-006','FR-007','FR-008']) {
    assert.match(accountDelta, new RegExp('FROM: \`### Requirement: '+id+' '));
    assert.match(accountDelta, new RegExp('TO: \`### Requirement: '+id+' '));
  }
  assert.match(foundationDelta, /## ADDED Requirements/);
  const added = foundationDelta.split('## ADDED Requirements')[1]?.split('## MODIFIED Requirements')[0] ?? '';
  for (const id of ['FR-016','FR-076','FR-077']) assert.match(added, new RegExp('### Requirement: '+id+' '));
  assert.match(foundationDelta, /## RENAMED Requirements/);
});

// Issue #1224: ADR-021 defers to ADR-038 for token cleanup.
test('ADR-021 cites ADR-038 and the TBD (#1224) token cleanup, without the old pending-order wording', () => {
  const paragraph = adr.split('\n').find((line) => line.includes('per ADR-038 (#1224)'));
  assert.ok(paragraph, 'ADR-021 cleanup paragraph must cite per ADR-038 (#1224)');
  assert.ok(paragraph.includes('TBD (#1224)'), 'ADR-021 cleanup paragraph must mention TBD (#1224)');
  assert.match(paragraph, /expires_at/);
  assert.doesNotMatch(adr, /privacy deletion order must be settled/);
});

test('ADR-021 session deletion sentence conditions on every refresh token having passed its own expires_at', () => {
  const paragraph = adr.split('\n').find((line) => line.includes('per ADR-038 (#1224)'));
  assert.ok(paragraph, 'ADR-021 cleanup paragraph must cite per ADR-038 (#1224)');
  const start = paragraph.indexOf('`account_session` is deleted');
  assert.ok(start >= 0, 'Missing account_session deletion clause');
  const clause = paragraph.slice(start).split(/\.\s/)[0];
  assert.match(clause, /expires_at|expired/, 'Session deletion clause must require the session tokens to have expired');
});

// Issue #1223 G2: refresh-token and audit actor_role dictionary wording.
const dictionary = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
const erTables = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8')).tables;
const erTable = (name) => {
  const table = erTables.find((candidate) => candidate.name === name);
  assert.ok(table, `Missing ER table ${name}`);
  return table;
};
const dictionarySection = (heading) => {
  const start = dictionary.indexOf(heading);
  assert.ok(start >= 0, `Missing dictionary heading ${heading}`);
  return dictionary.slice(start).split(/\n### |\n## /)[0];
};
const refreshTokenText = () => `${dictionarySection('### 3.3 refresh_tokens')}\n${dictionarySection('### 4.3 refresh_tokens')}`;

test('refresh_tokens dictionary states 256-bit CSPRNG, hash-only storage and the use-time user checks', () => {
  const text = refreshTokenText();
  assert.match(text, /256[- ]?bit/i);
  assert.match(text, /CSPRNG/);
  assert.match(text, /(?:不存|不保存)[^|\n]*明文/);
  const useCheck = text.split('\n').find((line) => /同一交易/.test(line) && /`is_active`/.test(line) && /`credential_version`/.test(line));
  assert.ok(useCheck, 'A refresh_tokens rule must say the use-time transaction checks `is_active` and `credential_version`');
});

test('ER refresh_tokens note carries the CSPRNG, hash-only and use-time check wording', () => {
  const description = erTable('refresh_tokens').description;
  assert.match(description, /256[- ]?bit/i);
  assert.match(description, /CSPRNG/);
  assert.match(description, /明文/);
  assert.match(description, /`is_active`/);
  assert.match(description, /`credential_version`/);
});

test('audit_events.actor_role is an immutable snapshot, system for system events, not a live join', () => {
  const dictionaryRow = dictionarySection('### 3.7 audit_events').split('\n').find((line) => line.startsWith('| `actor_role`'));
  assert.ok(dictionaryRow, 'Missing actor_role dictionary row');
  const erNote = erTable('audit_events').columns.find((column) => column.name === 'actor_role').note;
  for (const [where, text] of [['dictionary', dictionaryRow], ['ER note', erNote]]) {
    assert.match(text, /快照/, `${where}: snapshot`);
    assert.match(text, /不可變/, `${where}: immutable`);
    assert.match(text, /系統事件[^|]*`system`/, `${where}: system events use 'system'`);
    assert.match(text, /(?:不是|非|不做)[^|；。]*(?:即時|live)[^|；。]*(?:join|JOIN|關聯)/, `${where}: not a live join`);
  }
});
