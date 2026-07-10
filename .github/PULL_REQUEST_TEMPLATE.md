## Changes

<!-- List all changes by category; every item must be listed — unlisted = untested -->
<!-- Delete any category section that has no changes -->

### Added

- [Type]【Module/Page】Description

### Modified

- [Type]【Module/Page】Description

### Fixed

- [Type]【Module/Page】Description

### Removed

- [Type]【Module/Page】Description

## Test Plan

<!-- Every item must be individually verified; mark passed as [x], failed as [ ] with reason -->

- [ ] Verification item

## Notes

<!-- Delete this section if not applicable -->

- [ ] Includes database migration — run before deploy
- [ ] Includes config changes (`.env`, settings)
- [ ] Requires cache clear
- [ ] API field/schema changed
- [ ] Third-party service integration changed

## Rollback Plan (Migration PR only)

<!-- Fill in only when this PR includes a database migration; otherwise delete this section -->

**Before state**: <!-- Schema / data state before migration -->

**After state**: <!-- Schema / data state after migration -->

**Rollback procedure**:
1. <!-- Run `uv run alembic downgrade -1` or specific command -->
2. <!-- Any additional data recovery steps -->

## Impact Scope

<!-- Check the areas affected by this PR -->

- [ ] Frontend pages (list: )
- [ ] Admin pages (list: )
- [ ] API (list: )
- [ ] Scheduled jobs / Queue
- [ ] Other (describe: )

## Related

- Issue: #<!-- issue number, or "None" -->

## Checklist

- [ ] I have listed all changes completely
- [ ] I have tested locally and confirmed functionality and stability
- [ ] I have added necessary comments, especially for hard-to-understand parts
- [ ] My PR title follows the format: `<type>: <description>`

## Type Reference

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| change | Feature adjustment |
| refactor | Code restructuring without behavior change |
| perf | Performance optimization |
| style | UI / CSS |
| docs | Documentation update |
| test | Test-related |
| deps | Package update |
| config | Configuration change |
| build | Build or dev tooling |
| ci | CI/CD pipeline |
| security | Security-related |
