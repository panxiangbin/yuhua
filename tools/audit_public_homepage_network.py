#!/usr/bin/env python3
"""Read-only audit of deployed homepage HTTP response representations.

Discovers the same direct local dependencies as audit_homepage_payload.py, then
measures each public URL with identity and browser-like Accept-Encoding requests.
Reported bytes are response-body representation bytes, not full wire bytes.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from audit_homepage_payload import HomepageParser, resolve_local_url

BASE_URL = "https://panxiangbin.github.io/yuhua/"
OUT_DIR = Path("reports/public_homepage_network")
HEADERS = (
    "content-type", "content-encoding", "content-length", "cache-control",
    "etag", "last-modified", "vary", "age", "server", "via", "x-cache",
)


def fetch(url: str, encoding: str, timeout: float) -> dict[str, object]:
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; YuhuaNetworkAudit/1.0)",
        "Accept": "*/*", "Accept-Encoding": encoding, "Cache-Control": "no-cache",
    })
    try:
        with urlopen(req, timeout=timeout) as r:  # noqa: S310 - fixed CI target
            body = r.read()
            headers = {k.lower(): v for k, v in r.headers.items()}
            return {"status": int(getattr(r, "status", 200)), "final_url": r.geturl(),
                    "headers": headers, "body": body}
    except HTTPError as exc:
        body = exc.read()
        return {"status": exc.code, "final_url": exc.geturl(),
                "headers": {k.lower(): v for k, v in exc.headers.items()}, "body": body}
    except URLError as exc:
        raise RuntimeError(f"request failed for {url}: {exc}") from exc


def discover(index: Path, base_url: str) -> list[dict[str, object]]:
    parser = HomepageParser()
    parser.feed(index.read_text(encoding="utf-8"))
    repo_root = Path(".").resolve()
    rows: dict[str, dict[str, object]] = {
        "index.html": {
            "repository_path": "index.html", "public_url": base_url,
            "references": [{"kind": "document", "request_expectation": "navigation_document"}],
        }
    }
    for ref in parser.references:
        scope, relative = resolve_local_url(str(ref["url"]), Path("index.html"), repo_root)
        if scope != "local" or not relative:
            continue
        row = rows.setdefault(relative, {
            "repository_path": relative,
            "public_url": urljoin(base_url, str(ref["url"])),
            "references": [],
        })
        kind = str(ref.get("kind", "resource"))
        expectation = (
            "automatic_on_document_load" if kind == "script"
            else "browser_managed_lazy_candidate" if kind == "image" and ref.get("loading") == "lazy"
            else "automatic_or_browser_managed_from_initial_html"
        )
        row["references"].append({
            "kind": kind, "tag": ref.get("tag"), "attribute": ref.get("attribute"),
            "raw_url": ref.get("url"), "request_expectation": expectation,
        })
    return list(rows.values())


def measure(row: dict[str, object], timeout: float,
            getter: Callable[[str, str, float], dict[str, object]] = fetch) -> dict[str, object]:
    url = str(row["public_url"])
    identity = getter(url, "identity", timeout)
    encoded = getter(url, "gzip, br", timeout)

    def compact(result: dict[str, object], body_key: str) -> dict[str, object]:
        body = result["body"]
        headers = result["headers"]
        assert isinstance(body, bytes) and isinstance(headers, dict)
        return {
            "status": result["status"], "final_url": result["final_url"],
            body_key: len(body), "sha256": hashlib.sha256(body).hexdigest(),
            "headers": {k: headers.get(k) for k in HEADERS},
        }

    a = compact(identity, "body_bytes")
    b = compact(encoded, "body_representation_bytes")
    raw, packed = int(a["body_bytes"]), int(b["body_representation_bytes"])
    return {**row, "identity": a, "browser_like": b,
            "representation_savings_bytes": raw - packed,
            "representation_ratio": round(packed / raw, 6) if raw else None}


def fmt(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 ** 2:
        return f"{n / 1024:.2f} KiB"
    return f"{n / 1024 ** 2:.2f} MiB"


def write_report(report: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "public_homepage_network_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = report["summary"]
    resources = report["resources"]
    assert isinstance(summary, dict) and isinstance(resources, list)
    lines = [
        "# Yuhua public homepage network audit", "",
        f"- Generated: `{report['generated_at_utc']}`",
        f"- Public base URL: `{report['base_url']}`",
        f"- Direct resources measured: **{summary['resource_count']}**",
        f"- Identity body total: **{fmt(int(summary['identity_body_bytes']))}**",
        f"- Browser-like body representation total: **{fmt(int(summary['browser_like_body_bytes']))}**",
        f"- HTTP failures: **{len(summary['http_failures'])}**", "",
        "> Byte counts are HTTP response body representation bytes only; response headers, framing, TLS and TCP/IP overhead are excluded.",
        "", "> This audit is read-only. Compression/cache headers are observations, not automatic failures. The public-site freshness workflow remains the deployed-byte equivalence guard.",
        "", "## Direct resources", "",
        "| Resource | Discovery | Identity | Browser-like | Encoding | Cache-Control |",
        "|---|---|---:|---:|---|---|",
    ]
    for row in sorted(resources, key=lambda r: int(r["identity"]["body_bytes"]), reverse=True):
        a, b = row["identity"], row["browser_like"]
        refs = row["references"]
        discovery = ", ".join(sorted({str(x.get("request_expectation", "")) for x in refs}))
        h = b["headers"]
        lines.append(
            f"| `{row['repository_path']}` | {discovery} | {fmt(int(a['body_bytes']))} | "
            f"{fmt(int(b['body_representation_bytes']))} | {h.get('content-encoding') or 'identity'} | "
            f"{str(h.get('cache-control') or '').replace('|', '\\|')} |")
    lines += ["", "## Priority data scripts", ""]
    for path in ("assets/data.js", "assets/specs.js"):
        row = next((r for r in resources if r.get("repository_path") == path), None)
        if row:
            a, b, h = row["identity"], row["browser_like"], row["browser_like"]["headers"]
            lines.append(
                f"- `{path}`: identity {fmt(int(a['body_bytes']))}; browser-like {fmt(int(b['body_representation_bytes']))}; "
                f"encoding `{h.get('content-encoding') or 'identity'}`; cache `{h.get('cache-control') or ''}`; "
                "direct `<script src>` means it is discoverable before a customer uses search.")
    lines += ["", "No product/specification facts are changed by this report.", ""]
    (out_dir / "public_homepage_network_report.md").write_text("\n".join(lines), encoding="utf-8")


def audit(index: Path, base_url: str, out_dir: Path, timeout: float,
          getter: Callable[[str, str, float], dict[str, object]] = fetch) -> dict[str, object]:
    if not base_url.endswith("/"):
        base_url += "/"
    resources = [measure(row, timeout, getter) for row in discover(index, base_url)]
    failures = []
    encodings: dict[str, int] = {}
    for row in resources:
        for mode in ("identity", "browser_like"):
            status = int(row[mode]["status"])
            if not 200 <= status < 300:
                failures.append({"path": row["repository_path"], "mode": mode, "status": status})
        enc = row["browser_like"]["headers"].get("content-encoding") or "identity"
        encodings[str(enc)] = encodings.get(str(enc), 0) + 1
    identity_total = sum(int(r["identity"]["body_bytes"]) for r in resources)
    encoded_total = sum(int(r["browser_like"]["body_representation_bytes"]) for r in resources)
    report = {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "base_url": base_url,
        "measurement_definition": "HTTP response body representation bytes; excludes headers/framing/TLS/TCP-IP overhead",
        "resources": resources,
        "summary": {
            "resource_count": len(resources), "identity_body_bytes": identity_total,
            "browser_like_body_bytes": encoded_total,
            "representation_savings_bytes": identity_total - encoded_total,
            "content_encoding_counts": dict(sorted(encodings.items())), "http_failures": failures,
        },
    }
    write_report(report, out_dir)
    return report


def self_test() -> None:
    html = '<link rel="stylesheet" href="assets/a.css"><script src="assets/data.js"></script><script src="assets/specs.js"></script><img src="assets/logo.svg" loading="lazy">'
    bodies = {"index.html": html.encode(), "assets/a.css": b"a" * 4000,
              "assets/data.js": b"data=" * 3000, "assets/specs.js": b"spec=" * 3000,
              "assets/logo.svg": b"<svg/>" * 40}

    def fake(url: str, encoding: str, timeout: float) -> dict[str, object]:
        del timeout
        path = url.split("/yuhua/", 1)[1] or "index.html"
        body = bodies[path]
        headers = {"cache-control": "max-age=600", "vary": "Accept-Encoding"}
        if encoding != "identity" and path.endswith((".js", ".css")):
            body = gzip.compress(body, compresslevel=9, mtime=0)
            headers["content-encoding"] = "gzip"
        return {"status": 200, "final_url": url, "headers": headers, "body": body}

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "index.html").write_text(html, encoding="utf-8")
        report = audit(root / "index.html", "https://example.test/yuhua/", root / "out", 1, fake)
        paths = {r["repository_path"] for r in report["resources"]}
        assert {"index.html", "assets/data.js", "assets/specs.js"} <= paths
        data = next(r for r in report["resources"] if r["repository_path"] == "assets/data.js")
        assert data["browser_like"]["headers"]["content-encoding"] == "gzip"
        assert data["browser_like"]["body_representation_bytes"] < data["identity"]["body_bytes"]
        assert not report["summary"]["http_failures"]
        assert (root / "out/public_homepage_network_report.md").is_file()
    print("self-test: ok")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base-url", default=BASE_URL)
    ap.add_argument("--index", type=Path, default=Path("index.html"))
    ap.add_argument("--output-dir", type=Path, default=OUT_DIR)
    ap.add_argument("--timeout", type=float, default=30)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test(); return 0
    if not args.index.is_file():
        print(f"error: missing {args.index}"); return 2
    try:
        report = audit(args.index, args.base_url, args.output_dir, args.timeout)
    except Exception as exc:
        print(f"error: {exc}"); return 1
    s = report["summary"]
    print(f"network audit: {s['resource_count']} resources; identity={s['identity_body_bytes']} bytes; browser-like={s['browser_like_body_bytes']} bytes; failures={len(s['http_failures'])}")
    return 1 if s["http_failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
