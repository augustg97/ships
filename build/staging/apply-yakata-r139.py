#!/usr/bin/env python3
"""r139: splice the framed-and-planked yakata into hull.js, replacing the r117
box-slab walls branch — from its comment header through the ridge cap add."""
import sys

path = "web/js/hull.js"
src = open(path).read()
start_marker = "    /* ── THE WALLED YAKATA (round 117)"
end_marker = "      tg.add(cap);\n"

i = src.index(start_marker)
j = src.index(end_marker, i) + len(end_marker)
old = src[i:j]
assert "ridge cap" in old and old.count("tg.add(cap)") == 1, "splice window looks wrong"
assert "gable" in old, "splice window missing the gables"

new = open("build/staging/yakata-r139-draft.js").read()
open(path, "w").write(src[:i] + new + src[j:])
print(f"spliced: removed {len(old)} chars ({old.count(chr(10))} lines), "
      f"inserted {len(new)} chars ({new.count(chr(10))} lines)")
