# Contributing to Schema Drift

Thanks for improving this PlotXYZ.ai agent MVP.

## Local setup

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install
```

## Before opening a pull request

```bash
cd backend && python -m pytest -q
cd ../frontend && npm run build
```

- Keep the deterministic path working without any paid API key.
- Add or update tests for behavior changes.
- Do not commit secrets, `.env` files, `node_modules`, build output, or local SQLite data.
- Keep the agent's logic original and scoped; do not replace it with a generic chatbot endpoint.
- Document new inputs, limits, and failure modes.

## Pull requests

Describe the problem, the change, and the verification performed. Small, focused changes are easiest to review. By contributing, you agree that your contribution is licensed under the repository's MIT license.
