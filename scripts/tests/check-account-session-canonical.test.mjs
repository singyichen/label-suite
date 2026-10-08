import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
