"""FastAPI service for Schema Drift."""
from __future__ import annotations

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .logic import LogicError, provider_status, run

AGENT_SLUG = "plotxyz-schema-drift-agent"
AGENT_TITLE = "Schema Drift"
AGENT_TAGLINE = "Know which schema change will break consumers."
AGENT_PURPOSE = "Compares two declared schemas and classifies added, removed, and type-changed columns, with breaking-change flags."
FEATURES = ["Column-level drift detection", "Breaking-change classification", "Consumer-impact summary"]
LIMITATIONS = ["Type compatibility is compared textually.", "It does not read live database catalogs."]
VERSION = "1.0.0"
MAX_PAYLOAD_CHARS = int(os.getenv("MAX_PAYLOAD_CHARS", "200000"))

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "history.db"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(AGENT_SLUG)


@contextmanager
def database():
    connection = sqlite3.connect(DB_PATH)
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db():
    with database() as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS tasks ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "created_at TEXT NOT NULL, "
            "summary TEXT NOT NULL, "
            "payload TEXT NOT NULL, "
            "result TEXT NOT NULL)"
        )


init_db()


class RunRequest(BaseModel):
    payload: dict = Field(default_factory=dict, description="Agent-specific validated input payload.")


class RunResponse(BaseModel):
    agent: str
    summary: str
    result: dict
    warnings: list[str] = Field(default_factory=list)
    task_id: int | None = None


class HistoryItem(BaseModel):
    id: int
    created_at: str
    summary: str
    payload: dict


app = FastAPI(
    title=f"PlotXYZ.ai · {AGENT_TITLE}",
    version=VERSION,
    description=AGENT_PURPOSE,
)
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root():
    return {"agent": AGENT_SLUG, "title": AGENT_TITLE, "version": VERSION, "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "agent": AGENT_SLUG, "version": VERSION}


@app.get("/api/meta")
def meta():
    return {
        "agent": AGENT_SLUG,
        "title": AGENT_TITLE,
        "tagline": AGENT_TAGLINE,
        "purpose": AGENT_PURPOSE,
        "version": VERSION,
        "features": FEATURES,
        "limitations": LIMITATIONS,
        "providers": provider_status(),
        "max_payload_chars": MAX_PAYLOAD_CHARS,
    }


@app.post("/api/run", response_model=RunResponse)
def execute_agent(request: RunRequest):
    serialized = json.dumps(request.payload)
    if len(serialized) > MAX_PAYLOAD_CHARS:
        raise HTTPException(status_code=413, detail=f"Payload exceeds the {MAX_PAYLOAD_CHARS} character limit.")
    try:
        outcome = run(request.payload)
    except LogicError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception:
        logger.exception("Unhandled agent failure")
        raise HTTPException(status_code=500, detail="The agent could not process this request.") from None
    created_at = datetime.now(timezone.utc).isoformat()
    with database() as connection:
        cursor = connection.execute(
            "INSERT INTO tasks (created_at, summary, payload, result) VALUES (?, ?, ?, ?)",
            (created_at, outcome["summary"][:500], serialized[:MAX_PAYLOAD_CHARS], json.dumps(outcome)[:MAX_PAYLOAD_CHARS]),
        )
        task_id = cursor.lastrowid
    return RunResponse(agent=AGENT_SLUG, task_id=task_id, **outcome)


@app.get("/api/history")
def history(limit: int = 20):
    limit = max(1, min(limit, 50))
    with database() as connection:
        rows = connection.execute(
            "SELECT id, created_at, summary, payload FROM tasks ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    items = []
    for row in rows:
        try:
            payload = json.loads(row[3])
        except json.JSONDecodeError:
            payload = {}
        items.append(HistoryItem(id=row[0], created_at=row[1], summary=row[2], payload=payload))
    return {"items": items}


@app.delete("/api/history", status_code=204)
def clear_history():
    with database() as connection:
        connection.execute("DELETE FROM tasks")
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
