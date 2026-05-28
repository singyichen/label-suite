# Testing Rules — E2E

## E2E (Playwright)

- E2E tests live in `e2e/` at the repo root; mirror page structure: `e2e/[module]/[page].spec.ts`
- Each spec covers one user journey end-to-end (login → action → assertion); don't mix journeys
- Use `page.getByRole()` / `page.getByLabel()` / `page.getByText()` — never CSS selectors or `data-testid` unless no semantic alternative exists
- Shared auth state: use `storageState` fixtures to avoid re-logging in on every test
- Never hard-code `localhost` ports; read from `playwright.config.ts` `baseURL`
- Run with: `pnpm exec playwright test` (headed: add `--headed`; specific file: append the path)
