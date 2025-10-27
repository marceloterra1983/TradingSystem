from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

from ...config import settings
from ...logging_utils import get_agent_logger

logger = get_agent_logger("DocsDailyAgent")


class DocsDailyRequest(BaseModel):
    since: Optional[str] = Field(
        default=None,
        description="Start time for change analysis (e.g., '2025-10-27 00:00')",
    )
    dry: bool = Field(default=False, description="Dry run, don't write files")
    model: Optional[str] = Field(default=None, description="Override Ollama model")
    maxContext: Optional[int] = Field(
        default=None, description="Max diff characters included in prompt"
    )
    noValidate: bool = Field(default=False, description="Skip frontmatter validation")
    outDir: Optional[str] = Field(
        default=None, description="Output dir for reports (relative to project root)"
    )


class DocsDailyResponse(BaseModel):
    report_file: str
    used_model: Optional[str]
    since: str
    changes_count: int
    used_fallback: bool


def _project_root() -> Path:
    # Walk upwards until we find .env or .git, fallback to CWD
    p = Path(__file__).resolve()
    for parent in [p.parent, *p.parents]:
        if (parent / ".env").exists() or (parent / ".git").exists():
            # If inside tools/agno-agents/src/... the root is likely several levels up
            # Find repo root by scanning upwards for package.json as a heuristic
            cur = parent
            while cur != cur.parent:
                if (cur / "package.json").exists():
                    return cur
                cur = cur.parent
            return parent
    return Path.cwd()


def _sh(cmd: str, cwd: Optional[Path] = None) -> str:
    try:
        out = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            shell=True,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return (out.stdout or "").strip()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Shell command failed", extra={"cmd": cmd})
        return ""


def _local_midnight() -> str:
    now = datetime.now()
    d = datetime(now.year, now.month, now.day, 0, 0, 0)
    return d.strftime("%Y-%m-%d %H:%M")


def _base_ref_since(since: str, root: Path) -> str:
    ref = _sh(f"git rev-list -1 --before=\"{since}\" HEAD", cwd=root)
    if ref:
        return ref
    return _sh("git rev-parse HEAD~1", cwd=root)


def _list_changes(base_ref: str, root: Path) -> tuple[str, str, str]:
    if not base_ref:
        return "", "", ""
    files = _sh(f"git diff --name-status {base_ref}..HEAD || true", cwd=root)
    diff = _sh(f"git diff --unified=0 {base_ref}..HEAD || true", cwd=root)
    midnight = _local_midnight()
    log = _sh(
        f"git log --since=\"{midnight}\" --pretty=format:\"%h %ad %s\" --date=short || true",
        cwd=root,
    )
    return files, diff, log


async def _summarize_with_ollama(
    *,
    diff: str,
    files: str,
    log: str,
    model_override: Optional[str],
    max_context_override: Optional[int],
) -> tuple[str, bool, Optional[str]]:
    base_url = settings.ollama_base_url or "http://localhost:11434"
    model = model_override or settings.docs_agent_model
    max_chars = int(max_context_override or settings.docs_agent_max_context or 20000)

    context = (
        f"Changed files (name-status):\n{files}\n\n"
        f"Commits (since midnight):\n{log}\n\n"
        f"Unified diff (truncated):\n{diff[:max_chars]}"
    )
    prompt = (
        "You are a technical writer agent. Summarize today's code changes into a concise developer-facing changelog in Markdown.\n\n"
        "Guidelines:\n- Organize by domain: Frontend, Backend, Docs, Tools/Infra\n"
        "- For each domain, list 3-7 key changes with short bullets\n"
        "- Highlight breaking changes, new env vars, new scripts, and docs-impact\n"
        "- Keep it factual. Use file paths for precision.\n"
        "- Output ONLY Markdown content (no extra commentary).\n\n"
        f"Context:\n{context}"
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{base_url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
            )
            res.raise_for_status()
            data = res.json()
            text = data.get("response") or data.get("text") or ""
            if not text:
                raise ValueError("empty ollama response")
        return text, False, model
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ollama not available, using fallback summary", extra={"err": str(exc)})
        fallback = (
            "### Summary (No local LLM available)\n"
            "- Local Ollama not reachable. Falling back to raw change list.\n"
            "#### Changed files\n\n`````\n"
            f"{files}\n"
            "`````\n"
            "#### Commits\n\n`````\n"
            f"{log}\n"
            "`````\n"
        )
        return fallback, True, None


async def run_docs_daily(payload: DocsDailyRequest) -> DocsDailyResponse:
    root = _project_root()
    since = payload.since or _local_midnight()

    base_ref = _base_ref_since(since, root)
    files, diff, log = _list_changes(base_ref, root)

    # Collect counts
    changes_count = 0
    if files:
        changes_count = len([l for l in files.splitlines() if l.strip()])

    summary, used_fallback, used_model = await _summarize_with_ollama(
        diff=diff,
        files=files,
        log=log,
        model_override=payload.model,
        max_context_override=payload.maxContext,
    )

    date_str = datetime.now().strftime("%Y-%m-%d")
    title = f"Daily Updates – {date_str}"
    frontmatter = (
        f"---\n"
        f"title: {title}\n"
        f"description: Daily summary of code changes and docs impact for {date_str}.\n"
        f"tags: [automation, daily, changelog]\n"
        f"owner: DocsOps\n"
        f"lastReviewed: '{date_str}'\n"
        f"---\n\n"
    )

    body = (
        frontmatter
        + "> Generated by Docusaurus Daily Agent (local).\n\n"
        + summary
        + "\n\n#### Raw changes (name-status)\n\n`````\n"
        + (files or "No changes detected.")
        + "\n`````\n"
    )

    out_dir_rel = payload.outDir or os.path.join("docs", "content", "reports", "daily")
    out_dir = (root / out_dir_rel).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{date_str}.mdx"
    if not payload.dry:
        out_file.write_text(body, encoding="utf-8")

        # Ensure categories
        reports_cat = (root / "docs" / "content" / "reports" / "_category_.json").resolve()
        if not reports_cat.exists():
            reports_cat.parent.mkdir(parents=True, exist_ok=True)
            reports_cat.write_text(
                json.dumps(
                    {
                        "label": "Reports",
                        "position": 50,
                        "collapsed": False,
                        "link": {
                            "type": "generated-index",
                            "title": "Automation Reports",
                            "slug": "/reports",
                        },
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
        daily_cat = (out_dir / "_category_.json").resolve()
        if not daily_cat.exists():
            daily_cat.write_text(
                json.dumps({"label": "Daily Updates", "position": 1, "collapsed": True}, indent=2)
                + "\n",
                encoding="utf-8",
            )

        # Optionally validate frontmatter: call repo script if PyYAML is present
        if not payload.noValidate:
            try:
                _ = _sh("python3 -c \"import yaml\" 2>/dev/null", cwd=root)
                _ = _sh(
                    "python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content --schema v2",
                    cwd=root,
                )
            except Exception:  # noqa: BLE001
                logger.warning("Frontmatter validation skipped (PyYAML missing) or reported issues")

    return DocsDailyResponse(
        report_file=str(out_file),
        used_model=used_model,
        since=since,
        changes_count=changes_count,
        used_fallback=used_fallback,
    )


def load_agent_manifest() -> dict[str, Any] | None:
    """Load manifest from config/agents/docusaurus-daily.json at project root."""
    root = _project_root()
    manifest_path = root / "config" / "agents" / "docusaurus-daily.json"
    if manifest_path.exists():
        try:
            return json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return None
    return None


def list_manifests() -> list[dict[str, Any]]:
    root = _project_root()
    cfg = root / "config" / "agents"
    items: list[dict[str, Any]] = []
    if not cfg.exists():
        return items
    for p in cfg.glob("*.json"):
        try:
            items.append(json.loads(p.read_text(encoding="utf-8")))
        except Exception:  # noqa: BLE001
            continue
    return items


def _resolve_env_default(var_name: str) -> Any:
    # Prefer environment variable
    val = os.getenv(var_name)
    if val is not None and val != "":
        return val
    # Fallback to settings for known vars
    mapping = {
        "DOCS_AGENT_MODEL": settings.docs_agent_model,
        "DOCS_AGENT_MAX_CONTEXT": settings.docs_agent_max_context,
        "OLLAMA_BASE_URL": settings.ollama_base_url,
    }
    return mapping.get(var_name)


def get_args_descriptor(agent_id: str) -> dict[str, Any] | None:
    """Return args schema with resolved defaults for a given agent id."""
    data = None
    for m in list_manifests():
        if m.get("id") == agent_id:
            data = m
            break
    if not data:
        return None

    raw_schema = data.get("argsSchema") or {}
    args_out: list[dict[str, Any]] = []
    for name, spec in raw_schema.items():
        default_val = spec.get("default")
        resolved_default = default_val
        if isinstance(default_val, str) and default_val.startswith("env:"):
            env_name = default_val.split(":", 1)[1]
            resolved = _resolve_env_default(env_name)
            resolved_default = resolved
        args_out.append(
            {
                "name": name,
                "type": spec.get("type", "string"),
                "default": default_val,
                "resolvedDefault": resolved_default,
                "description": spec.get("description", ""),
            }
        )

    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "role": data.get("role"),
        "instructions": data.get("instructions"),
        "runtime": data.get("runtime"),
        "entry": data.get("entry"),
        "env": data.get("env", []),
        "args": args_out,
    }
