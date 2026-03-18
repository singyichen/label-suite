---
name: test-data-strategy
description: Design test data strategy for Label-Eval-Portal including fixtures, factories, and security isolation.
---

# Test Data Strategy

Define how test data is created, managed, and isolated across different test types in Label-Eval-Portal.

## Usage

```
/test-data-strategy "annotation submission tests"
/test-data-strategy "scoring engine unit tests"
```

## Output Format

```markdown
# Test Data Strategy: [Scope]

**Date**: YYYY-MM-DD
**Applies To**: pytest unit | pytest integration | Playwright E2E

---

## Data Categories

| Category | Source | Managed By | Notes |
|----------|--------|------------|-------|
| Task configurations | YAML fixtures | pytest fixtures | Never load from production |
| Annotation dataset items | Factory-generated | factory_boy | Input text only, no answers |
| Test-set answers | Static fixtures | Admin-only fixture | NEVER exposed to annotator in tests |
| User accounts | Factory-generated | factory_boy | One annotator + one admin per test |
| Submission predictions | Static fixtures | Inline in test | Deterministic for score verification |
| Edge case data | Static fixtures | conftest.py | Empty, null, mismatched lengths |

---

## Fixture Design

### conftest.py — Shared Fixtures

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.main import app
from app.models import User, Task, Dataset, DatasetItem, DatasetAnswer

@pytest_asyncio.fixture
async def annotator_client(db_session) -> AsyncClient:
    """Authenticated HTTP client for annotator role."""
    user = await create_user(db_session, role="annotator")
    token = create_jwt_token(user.id, role="annotator")
    async with AsyncClient(app=app, base_url="http://test") as client:
        client.headers["Authorization"] = f"Bearer {token}"
        yield client

@pytest_asyncio.fixture
async def admin_client(db_session) -> AsyncClient:
    """Authenticated HTTP client for administrator role."""
    user = await create_user(db_session, role="administrator")
    token = create_jwt_token(user.id, role="administrator")
    async with AsyncClient(app=app, base_url="http://test") as client:
        client.headers["Authorization"] = f"Bearer {token}"
        yield client

@pytest_asyncio.fixture
async def text_classification_task(db_session) -> Task:
    """A published text classification task with dataset."""
    dataset = await DatasetFactory.create(task_type="text-classification")
    task = await TaskFactory.create(
        dataset_id=dataset.id,
        config={"task_type": "text-classification", "metric": "f1_macro",
                "labels": ["positive", "negative", "neutral"]}
    )
    return task

@pytest_asyncio.fixture
async def task_with_answers(db_session, text_classification_task) -> tuple[Task, list[str]]:
    """Task with test-set answers loaded (admin access only in tests)."""
    answers = ["positive", "negative", "neutral", "positive", "neutral"]
    for i, answer in enumerate(answers):
        await DatasetAnswerFactory.create(
            dataset_id=text_classification_task.dataset_id,
            item_id=i + 1,
            answer=answer
        )
    return text_classification_task, answers
```

### factory_boy Factories

```python
# backend/tests/factories.py
import factory
from app.models import User, Task, Dataset, DatasetItem, Submission

class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    username = factory.Sequence(lambda n: f"user_{n:04d}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@test.example")
    hashed_password = factory.LazyFunction(lambda: hash_password("test-password"))
    role = "annotator"
    is_active = True

class AdminUserFactory(UserFactory):
    role = "administrator"
    username = factory.Sequence(lambda n: f"admin_{n:04d}")

class SubmissionFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Submission

    predictions = ["positive", "negative", "neutral"]
    status = "completed"
    score = 0.833
    metric = "f1_macro"
```

---

## Prediction Test Data

| Scenario | Predictions | Expected F1 | Notes |
|----------|-------------|-------------|-------|
| All correct | `["pos", "neg", "neu"]` | 1.0 | Perfect score |
| All wrong | `["neg", "pos", "pos"]` | 0.0 | Zero score |
| Partial (2/3) | `["pos", "neg", "pos"]` | ~0.667 | Typical case |
| Empty | `[]` | 0.0 | Edge case |
| Single item | `["pos"]` vs `["pos"]` | 1.0 | Boundary |

---

## Security: Test-Set Isolation

```python
# CORRECT: Answers fetched inside Celery task, not in test assertions
def test_scoring_result_excludes_answer(annotator_client, task_with_answers):
    task, _ = task_with_answers
    # Submit predictions as annotator
    response = annotator_client.post("/api/v1/submissions", json={
        "task_id": task.id,
        "predictions": ["positive", "negative", "neutral"]
    })
    submission_id = response.json()["submission_id"]

    # Poll result
    result = annotator_client.get(f"/api/v1/submissions/{submission_id}")

    # ASSERT: No answer field in any response
    assert "answer" not in result.json()
    assert "reference" not in result.json()
    assert "gold_label" not in result.json()
```

---

## Test Isolation Rules

1. **Each test is independent** — no shared mutable state between tests
2. **Database rolled back after each test** — use `pytest.fixture(scope="function")`
3. **No production data** — all test data is factory-generated
4. **Answer fixtures are admin-only** — never passed through annotator client
5. **Celery runs eagerly in tests** — `CELERY_TASK_ALWAYS_EAGER = True`

## Test Database Configuration

```python
# backend/tests/conftest.py
@pytest.fixture(scope="session")
def engine():
    return create_engine("postgresql://test:test@localhost/test_label_eval")

@pytest.fixture(autouse=True)
async def db_session(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(conn) as session:
            yield session
            await session.rollback()
        await conn.run_sync(Base.metadata.drop_all)
```

## Playwright Test Data

```typescript
// frontend/tests/fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
    annotatorPage: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: 'playwright/.auth/annotator.json'  // pre-authenticated
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
    }
});
```
```
