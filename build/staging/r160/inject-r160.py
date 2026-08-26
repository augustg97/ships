#!/usr/bin/env python3
"""r160 injection proofs for the rule 'a bow the record measured but the sheer ignores'.

Injection 1 (data): sheerBow put back to 3.0 with bowTopM standing -> the arithmetic
arm must convict EXACTLY azzam, citing 12.0 vs 8.2.
Injection 2 (code): sheer() clamps negative rise to 0 (the realistic future bug: someone
'sanitizes' a negative sheer) -> the ray arm must convict EXACTLY azzam: drawn 9.00 at
the stem where the record's line runs 8.2-8.3. Only azzam carries a negative sheerBow,
so the fleet stays clean and the conviction is exact.
Each injection restores and re-runs clean before exiting.
"""
import json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path.home() / "Ships"
VESS = ROOT / "web" / "data" / "vessels.json"
HULL = ROOT / "web" / "js" / "hull.js"
PY = pathlib.Path.home() / "Modeling Studio" / ".venv" / "bin" / "python"

def audit():
    r = subprocess.run([str(PY), str(ROOT / "Research" / "run_audit.py")],
                       capture_output=True, text=True, timeout=180)
    probs = json.loads(r.stdout) if r.stdout.strip() else []
    return probs

def expect(probs, n, rule=None, ship=None):
    assert len(probs) == n, (len(probs), probs)
    if rule is not None:
        assert all(p["rule"] == rule and p["id"] == ship for p in probs), probs
    return probs

# clean baseline first
expect(audit(), 0)
print("clean: 0 problems")

# ── injection 1: data ──
orig = VESS.read_text()
doc = json.loads(orig)
az = [s for s in doc["vessels"] if s["id"] == "azzam"][0]
assert az["hull"]["sheerBow"] == -0.8
az["hull"]["sheerBow"] = 3.0
VESS.write_text(json.dumps(doc, indent=1, ensure_ascii=False))
p = expect(audit(), 1, "a bow the record measured but the sheer ignores", "azzam")
print("injection 1 convicted:", p[0]["detail"])
assert "12.0 m" in p[0]["detail"] and "8.2" in p[0]["detail"], p[0]
VESS.write_text(orig)
expect(audit(), 0)
print("restore 1: clean")

# ── injection 2: code ──
horig = HULL.read_text()
needle = "const rise = u < 0.5 ? S.sheerBow : S.sheerStern;"
assert horig.count(needle) == 1
HULL.write_text(horig.replace(needle,
    "const rise = Math.max(0, u < 0.5 ? S.sheerBow : S.sheerStern);"))
p = expect(audit(), 1, "a drawn bow off its own recorded sheer line", "azzam")
print("injection 2 convicted:", p[0]["detail"])
HULL.write_text(horig)
expect(audit(), 0)
print("restore 2: clean")
print("ALL INJECTION PROOFS PASS")
