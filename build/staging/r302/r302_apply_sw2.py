import sys
P = sys.argv[1]; s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""const SAIL_SKIP = new Set(['deck', 'rail', 'waterway', 'islandRail', 'stair', 'cheek', 'top',
                           'mast',""", """const SAIL_SKIP = new Set(['deck', 'rail', 'waterway', 'islandRail', 'stair', 'cheek',
                           'mast',""")
rep("""    if (k === 'funnel') return (H.funnels || 1) > 1 ? swNum(H.funnels) + ' funnels' : 'a funnel';""",
"""    if (k === 'funnel') return (H.funnels || 1) > 1 ? swNum(H.funnels) + ' funnels' : 'a funnel';
    if (k === 'top') return swAnd([...names[k]].map(t => t === 'Top' ? 'tops at the lower mastheads'
                                  : t === 'Crosstrees' ? 'crosstrees at the topmast heads' : t.toLowerCase()));
    if (k === 'gundeck') return swAnd([...names[k]].filter(t => !/^(Stanchion|Deck beam|Deck clamp|Screen cap|End bulwark|Bulwark)$/.test(t))
                                      .map(t => t.toLowerCase()));
    if (k === 'sangjang') return 'the walls and oar ports of the oar deck';""")
rep("""      t = 'Shrouds run from ' + (n === 1 ? 'the masthead' : 'each masthead') + ' down to the ship\\'s sides '""",
    """      t = 'Shrouds run from ' + (n === 1 ? 'the masthead' : 'each masthead') + ' down to the hull '""")
rep("""    if (pieces.some(pc => pc > 1))
      t += ' Each piece""", """    if (tube && pieces.every(pc => pc === 3))
      t += ' The topgallant mast stands in the doubling at the head of the tube, held up by an '
         + 'iron fid through its heel, so it can be lowered to the deck.';
    else if (pieces.some(pc => pc > 1))
      t += ' Each piece""")
rep("""      const bits = [];""", """      const bits = [];""", 0) if False else None
rep("""    const l = extras();
    let t = bits.join(' ');""", """    const l = extras(rigs.has('square') ? ['brace'] : []);
    let t = bits.join(' ');""")
rep("""    const parts7 = byRig.filter(g => SAIL_RIG[g.rig]).map(g => {
      const who = swMastGroup(g.idx, n);
      const one = g.idx.length === 1 && g.rig !== 'square';""", """    /* a square rig with as many sail meshes as masts sets one square sail on each (the cog,
       the trireme): "square sails on her mast" would be wrong for her */
    const nSail = parts.filter(p => p.key === 'sail').length;
    const oneEach = byRig.length === 1 && byRig[0].rig === 'square' && nSail === n;
    if (oneEach) {
      let t = 'The sails are bent on: ' + (n === 1 ? 'one square sail on her mast' : 'one square sail on each mast')
            + (H.headsails ? ', and ' + (H.headsails === 1 ? 'a headsail on a stay forward' : swNum(H.headsails) + ' headsails on the stays forward') : '') + '.';
      const l = extras();
      if (l.length) t += ' Also added: ' + swAnd(l) + '.';
      return ['Bent on', t];
    }
    const parts7 = byRig.filter(g => SAIL_RIG[g.rig]).map(g => {
      const who = swMastGroup(g.idx, n);
      const one = g.idx.length === 1 && g.rig !== 'square';""")
open(P, 'w').write(s); print('ok')
