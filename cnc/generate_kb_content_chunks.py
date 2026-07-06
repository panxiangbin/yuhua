from __future__ import annotations

import json
import math
import re
from pathlib import Path


PROJECT_DIR = Path(r"F:\AI工作台\cnc_param_quickfinder")
INDEX_JS = PROJECT_DIR / "kb-readme-index.js"
MANIFEST_JS = PROJECT_DIR / "kb-content-manifest.js"
CHUNK_PREFIX = "kb-content-"
TARGET_CHUNKS = 12
PREVIEW_LIMIT = 1800


def load_entries() -> list[dict]:
    text = INDEX_JS.read_text(encoding="utf-8")
    prefix = "window.CNC_KB_README_INDEX = "
    if not text.startswith(prefix):
        raise ValueError("kb-readme-index.js format mismatch")
    payload = text[len(prefix):].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def clean_markdown(raw: str) -> str:
    raw = raw.replace("\r\n", "\n")
    raw = re.sub(r"```.*?```", " ", raw, flags=re.S)
    raw = re.sub(r"`([^`]+)`", r"\1", raw)
    raw = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", raw)
    raw = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", raw)
    raw = re.sub(r"^\s{0,3}#{1,6}\s*", "", raw, flags=re.M)
    raw = re.sub(r"^\s{0,3}>\s?", "", raw, flags=re.M)
    raw = re.sub(r"^\s*[-*+]\s+", "", raw, flags=re.M)
    raw = re.sub(r"^\s*\d+\.\s+", "", raw, flags=re.M)
    raw = re.sub(r"\|", " ", raw)
    raw = re.sub(r"-{3,}", " ", raw)
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    raw = re.sub(r"[ \t]+", " ", raw)
    raw = raw.strip()
    return raw[:PREVIEW_LIMIT].strip()


def build_previews(entries: list[dict]) -> tuple[dict[str, int], list[dict[str, str]]]:
    preview_items: list[dict[str, str]] = []
    for entry in entries:
        source = Path(str(entry.get("source", "")))
        if source.suffix.lower() != ".md" or not source.exists():
            continue
        try:
            cleaned = clean_markdown(source.read_text(encoding="utf-8"))
        except Exception:
            continue
        if len(cleaned) < 60:
            continue
        preview_items.append({"id": entry["id"], "content": cleaned})

    chunk_size = max(1, math.ceil(len(preview_items) / TARGET_CHUNKS))
    manifest: dict[str, int] = {}
    chunks: list[dict[str, str]] = []
    for i in range(0, len(preview_items), chunk_size):
        chunk_index = len(chunks) + 1
        payload: dict[str, str] = {}
        for item in preview_items[i:i + chunk_size]:
            manifest[item["id"]] = chunk_index
            payload[item["id"]] = item["content"]
        chunks.append(payload)
    return manifest, chunks


def write_outputs(manifest: dict[str, int], chunks: list[dict[str, str]]) -> None:
    MANIFEST_JS.write_text(
        "window.CNC_KB_CONTENT_MANIFEST = "
        + json.dumps(
            {
                "chunkCount": len(chunks),
                "entryToChunk": manifest,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + ";\n",
        encoding="utf-8",
    )

    for index, payload in enumerate(chunks, start=1):
        chunk_path = PROJECT_DIR / f"{CHUNK_PREFIX}{index:02d}.js"
        chunk_path.write_text(
            f"window.CNC_KB_CONTENT_{index:02d} = "
            + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            + ";\n",
            encoding="utf-8",
        )


def main() -> None:
    entries = load_entries()
    manifest, chunks = build_previews(entries)
    write_outputs(manifest, chunks)
    print(f"generated {len(manifest)} previews across {len(chunks)} chunks")


if __name__ == "__main__":
    main()
