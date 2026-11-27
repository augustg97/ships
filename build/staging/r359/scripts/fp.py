# first-paint bytes on docs/, exactly as gate_budget sums them; prints bytes over/under 8.6 MB
import os, sys
sys.path.insert(0, 'build'); import build_site as B
B.log = lambda *a, **k: None
man = B.gate_fields()
W = B.DOCS
lv0 = next(l for l in man["levels"] if l["level"] == 0)["bytes"]
app = sum(os.path.getsize(os.path.join(W, p)) for p in ("index.html", "js/app.js", "js/route.js", "js/hull.js", "js/yard.js", "js/shipwright.js", "js/battle.js", "js/sea.js", "js/passage.js", "js/shaders.js", "js/three.min.js", "css/styles.css"))
data = sum(os.path.getsize(os.path.join(W, "data", f)) for f in os.listdir(os.path.join(W, "data")) if f not in B.LAZY_DATA)
months = sum(os.path.getsize(os.path.join(W, "fields", f"{k}_{m:02d}.png")) for k in ("sea", "wind") for m in (1, 2))
first = lv0 + app + data + months
print('first paint bytes', first, 'margin to 8.6e6:', int(8.6e6 + 5e3 - first) , '(gate is f"{first:.2f}" > 8.6 → refuses above 8,600,000 exactly)')
print('hull.js', os.path.getsize(os.path.join(W,'js/hull.js')), 'vessels.json', os.path.getsize(os.path.join(W,'data/vessels.json')))
