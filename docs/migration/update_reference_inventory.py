#!/usr/bin/env python3
"""Utility for generating and verifying the legacy reference inventory."""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_JSON = Path(__file__).with_name("reference-inventory.json")


@dataclass(frozen=True)
class Pattern:
    pattern: str
    category: str
    target: str
    flags: Iterable[str] = ()


PATTERNS: List[Pattern] = [
    Pattern("docs/docusaurus", "legacy_docs_docusaurus", "docs"),
    Pattern("docs/context", "legacy_docs_context", "docs/content"),
    Pattern("docs/", "legacy_docs_root", "docs"),
    Pattern(r"\b3004\b", "legacy_port_3004", "3205", flags=("-E",)),
]

EXCLUDE_DIRS = ["node_modules", ".git", "docs/context"]
EXCLUDE_FILES = [
    "*.log",
    "COMPLETE-REFERENCE-INVENTORY.md",
    "REFERENCE-UPDATE-TRACKING.md",
    "reference-inventory.json",
    "update_reference_inventory.py",
]

CATEGORY_LABELS: Dict[str, str] = {
    "legacy_docs_docusaurus": "Configuration",
    "legacy_docs_context": "Documentation",
    "legacy_docs_root": "Documentation",
    "legacy_port_3004": "Infrastructure",
}

PRIORITY_LABELS: Dict[str, str] = {
    "legacy_docs_docusaurus": "P0",
    "legacy_docs_context": "P1",
    "legacy_docs_root": "P1",
    "legacy_port_3004": "P0",
}

OWNER_LABELS: Dict[str, str] = {
    "legacy_docs_docusaurus": "DevOps",
    "legacy_docs_context": "DocsOps",
    "legacy_docs_root": "DocsOps",
    "legacy_port_3004": "DevOps",
}

DESIRED_STATE_LABELS: Dict[str, str] = {
    "legacy_docs_docusaurus": "Replace with docs path",
    "legacy_docs_context": "Replace with docs/content reference",
    "legacy_docs_root": "Replace with docs path",
    "legacy_port_3004": "Update to port 3205",
}


def run_grep(pattern: Pattern) -> List[Dict[str, object]]:
    base_cmd = [
        "grep",
        "-R",
        "--line-number",
        "--color=never",
        "--binary-files=without-match",
    ]
    for directory in EXCLUDE_DIRS:
        base_cmd.append(f"--exclude-dir={directory}")
    for file_pattern in EXCLUDE_FILES:
        base_cmd.append(f"--exclude={file_pattern}")
    base_cmd.extend(pattern.flags)
    base_cmd.extend([pattern.pattern, "."])

    try:
        output = subprocess.check_output(
            base_cmd, cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True
        )
    except subprocess.CalledProcessError as exc:
        if exc.returncode == 1:
            output = ""
        else:
            raise

    entries: List[Dict[str, object]] = []
    for line in output.splitlines():
        if not line:
            continue
        split_parts = line.split(":", 2)
        if len(split_parts) != 3:
            continue
        raw_path, lineno, match = split_parts
        rel_path = os.path.relpath(os.path.join(REPO_ROOT, raw_path), REPO_ROOT)
        entries.append(
            {
                "file_path": rel_path,
                "line": int(lineno),
                "match": match.strip(),
                "category": pattern.category,
                "desired_target": pattern.target,
            }
        )
    return entries


def scan() -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    for pattern in PATTERNS:
        entries.extend(run_grep(pattern))
    entries.sort(key=lambda item: (item["file_path"], item["line"], item["category"]))
    return entries


def write_json(entries: List[Dict[str, object]], json_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(entries, handle, indent=2, sort_keys=False)
        handle.write("\n")


def load_json(json_path: Path) -> List[Dict[str, object]]:
    with json_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
        data.sort(key=lambda item: (item["file_path"], item["line"], item["category"]))
        return data


def compare_entries(new_entries: List[Dict[str, object]], reference: List[Dict[str, object]]) -> bool:
    return new_entries == reference


def emit_markdown(entries: List[Dict[str, object]]) -> str:
    lines = [
        "| file_path | line | match | category | desired_target |",
        "|-----------|------|-------|----------|----------------|",
    ]
    for entry in entries:
        match_text = entry["match"].replace("|", "\\|")
        lines.append(
            f"| {entry['file_path']} | {entry['line']} | {match_text} | "
            f"{entry['category']} | {entry['desired_target']} |"
        )
    return "\n".join(lines)


def emit_tracking_csv(entries: List[Dict[str, object]], starting_index: int) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "Category",
            "File Path",
            "Line(s)",
            "Current Reference",
            "Desired State",
            "Priority",
            "Status",
            "Owner",
            "Issue/PR",
            "Notes",
            "Updated Date",
            "Validated Date",
        ]
    )

    offset = starting_index
    for entry in entries:
        category = CATEGORY_LABELS.get(entry["category"], "Auto Inventory")
        priority = PRIORITY_LABELS.get(entry["category"], "P1")
        owner = OWNER_LABELS.get(entry["category"], "Unassigned")
        desired_state = DESIRED_STATE_LABELS.get(
            entry["category"], f"Update to {entry['desired_target']}"
        )
        writer.writerow(
            [
                f"REF-{offset:03d}",
                category,
                entry["file_path"],
                str(entry["line"]),
                entry["match"],
                desired_state,
                priority,
                "Not Started",
                owner,
                "-",
                "Auto-detected via inventory script",
                "-",
                "-",
            ]
        )
        offset += 1
    return buffer.getvalue()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    refresh = subparsers.add_parser("refresh", help="Regenerate the reference inventory JSON file.")
    refresh.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON,
        help=f"Target JSON path (default: {DEFAULT_JSON})",
    )

    verify = subparsers.add_parser("verify", help="Compare live scan with the stored JSON file.")
    verify.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON,
        help="Reference JSON path to compare against.",
    )

    markdown = subparsers.add_parser("markdown", help="Emit the inventory as a Markdown table.")
    markdown.add_argument(
        "--json",
        type=Path,
        default=None,
        help="Optional JSON file to read instead of scanning live.",
    )

    tracking = subparsers.add_parser(
        "tracking-csv", help="Emit CSV rows suitable for REFERENCE-UPDATE-TRACKING.md."
    )
    tracking.add_argument(
        "--json",
        type=Path,
        default=None,
        help="Optional JSON file to read instead of scanning live.",
    )
    tracking.add_argument(
        "--start",
        type=int,
        default=21,
        help="Starting numeric suffix for REF identifiers (default: 21).",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.command == "refresh":
        entries = scan()
        write_json(entries, args.json)
        print(f"Wrote {len(entries)} entries to {args.json}")
        return 0

    if args.command == "verify":
        reference = load_json(args.json)
        current = scan()
        if compare_entries(current, reference):
            print(f"Verification succeeded: {len(reference)} entries match {args.json}")
            return 0
        print("Verification failed: inventory JSON is out of date.")
        return 1

    if args.command == "markdown":
        if args.json:
            entries = load_json(args.json)
        else:
            entries = scan()
        print(emit_markdown(entries))
        return 0

    if args.command == "tracking-csv":
        if args.json:
            entries = load_json(args.json)
        else:
            entries = scan()
        print(emit_tracking_csv(entries, args.start), end="")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
