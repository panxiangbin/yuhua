from pathlib import Path

TARGETS = [
    ".github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml",
    ".github/workflows/cnc-beginner-placement-offline-pages-smoke.yml",
    ".github/workflows/cnc-g95-cold-offline-source-trust-smoke.yml",
    ".github/workflows/cnc-g96-g97-cold-offline-source-trust-smoke.yml",
    ".github/workflows/cnc-g98-g99-cold-offline-source-trust-smoke.yml",
    ".github/workflows/cnc-learning-media-smoke.yml",
    ".github/workflows/cnc-pwa-offline-cache-smoke.yml",
    ".github/workflows/cnc-pwa-self-test-smoke.yml",
    ".github/workflows/cnc-pwa-upgrade-data-smoke.yml",
    ".github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml",
]

OLD_PWA = "20260817-pwa51"
NEW_PWA = "20260818-pwa52"
OLD_CACHE = "20260817-learning51"
NEW_CACHE = "20260818-learning52"

changed = []
for raw_path in TARGETS:
    path = Path(raw_path)
    text = path.read_text(encoding="utf-8")
    pwa_count = text.count(OLD_PWA)
    cache_count = text.count(OLD_CACHE)
    if pwa_count == 0 or cache_count == 0:
        raise SystemExit(f"{raw_path}: missing expected current PWA51 pins: pwa={pwa_count} cache={cache_count}")
    if NEW_PWA in text or NEW_CACHE in text:
        raise SystemExit(f"{raw_path}: already contains PWA52 target; refusing ambiguous rewrite")
    updated = text.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE)
    path.write_text(updated, encoding="utf-8")
    changed.append((raw_path, pwa_count, cache_count))

print("PWA52 workflow pin sync complete")
for raw_path, pwa_count, cache_count in changed:
    print(f"{raw_path}: pwa={pwa_count}, cache={cache_count}")
