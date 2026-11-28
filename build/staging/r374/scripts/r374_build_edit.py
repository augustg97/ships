from pathlib import Path
p = Path('/Users/augustgweon/Ships/build/build_site.py'); s = p.read_text()
old = "    gate_data()\n    stamp = stamp_and_copy()\n"
new = "    gate_data()\n    gate_fetch()\n    stamp = stamp_and_copy()\n"
assert s.count(old) == 1
s = s.replace(old, new)
old2 = "def main():\n"
new2 = '''def gate_fetch():
    """r374: every request the app makes goes through fetchRetry in app.js. A bare fetch()
    fails a whole terrain level on one ERR_CONNECTION_RESET, the era then routes on the coarser
    coastline, and a frozen voyage frame shows the ship at another point on her track
    (aboard-coast 17.996%, passage-sahul 24.618% in r373). The build refuses a second call."""
    import re
    log("4b. one fetch")
    hits = []
    for f in sorted(os.listdir(os.path.join(WEB, "js"))):
        if not f.endswith(".js") or f in ("three.min.js", "shaders.js"):
            continue
        src = open(os.path.join(WEB, "js", f), encoding="utf-8").read()
        for m in re.finditer(r"(?<![\\w.$])fetch\\(", src):
            hits.append(f"{f}:{src.count(chr(10), 0, m.start()) + 1}")
    if len(hits) != 1 or not hits[0].startswith("app.js:"):
        fail("every request must go through fetchRetry (app.js); bare fetch( at " + ", ".join(hits))
    log(f"   one fetch call, inside fetchRetry ({hits[0]})")


def main():
'''
assert s.count(old2) == 1
s = s.replace(old2, new2)
p.write_text(s)
print('ok')
