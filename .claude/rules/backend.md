# Backend Rules

## Python Code Style

- All functions must have docstrings in English (`Args:`, `Returns:`, `Raises:`) with complete type hints
- Use pytest, not unittest; prefer f-strings over format()
- All commands via `uv run` (e.g., `uv run pytest`, `uv run uvicorn app.main:app --reload`)
