import sys
def rep(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:70]); return s.replace(a, b)
p = 'web/js/shipwright.js'; s = open(p).read()
s = rep(s, "window.SW_FURLED_CARD = (spec) => swFurledCard(spec);", "window.SW_FURLED_CARD = (spec, built) => swFurledCard(spec, built);")
s = rep(s, """function swFurledCard(spec) {
  const rigs = new Set(((spec.hull || {}).masts || []).map(m => m.rig));
  const how = [];
  if (rigs.has('square')) how.push('the square sails are rolled up on their yards and tied with gaskets');""",
"""function swFurledCard(spec, built) {
  const rigs = new Set(((spec.hull || {}).masts || []).map(m => m.rig));
  const how = [];
  if (rigs.has('square')) how.push('the square sails are rolled up on their yards and tied with gaskets');
  /* r314 (0y¹⁴⁶): the yards the furled build lowers onto their caps, named by kind, read off the built
     ship (userData.lowered); without a built ship the card says nothing of them */
  if (built) {
    const NAME = { top: 'topsail', topsail: 'topsail', utop: 'upper topsail', tg: 'topgallant',
                   topgallant: 'topgallant', utg: 'upper topgallant', royal: 'royal' };
    const kinds = [];
    built.traverse(o => { const L = o.userData && o.userData.lowered;
      if (L && L.setY !== undefined) { const k = NAME[L.name] || L.name; if (!kinds.includes(k)) kinds.push(k); } });
    const ORDER = ['topsail', 'upper topsail', 'topgallant', 'upper topgallant', 'royal'];
    kinds.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    if (kinds.length) how.push('the ' + swAnd(kinds) + ' yards are lowered onto the caps below them');
  }""")
s = rep(s, "    nm = swFurledCard(SW.spec);", "    nm = swFurledCard(SW.spec, SW.ship);")
open(p, 'w').write(s)
p = 'web/js/hull.js'; s = open(p).read()
s = rep(s, "loweredRec = { mast: mi, setY: +setY.toFixed(3), onto:", "loweredRec = { mast: mi, name: listName || kind, setY: +setY.toFixed(3), onto:")
open(p, 'w').write(s)
print('ok')
