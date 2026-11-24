import sys
P = sys.argv[1]; s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""  deadeye: 'deadeyes and lanyards',""", """  deadeye: 'deadeyes with their lanyards',""")
rep("""bench: 'rowing benches', bowsprit: 'a bowsprit', head: 'a head and beakhead',""",
    """bench: 'rowing benches', bowsprit: 'a bowsprit', head: 'the beakhead at the bow',""")
rep("""compassPlatform: 'a compass platform', tower: null, gundeck: null, sangjang: null,""",
    """compassPlatform: 'a compass platform', tower: null, gundeck: null, sangjang: null,
  maku: 'the maku (a cloth band hung over the oar band)', sama: 'sama (loopholes in the shield wall)',""")
rep("""                                      .map(t => t === 'Sangjang' ? 'the sangjang, an upper deck built over the rowers'
                                              : t === 'Gun deck' ? 'a gun deck over the rowers' : t.toLowerCase());""",
    """                                      .map(t => t === 'Sangjang' ? 'the sangjang (a fighting deck built over the rowers)'
                                              : t === 'Gun deck' ? 'a gun deck over the rowers'
                                              : t === 'Tate-ita' ? 'the tate-ita (the shield wall)'
                                              : /yagura$/i.test(t) ? 'the ' + t.toLowerCase() + ' (the fighting superstructure)'
                                              : t.toLowerCase());""")
rep("""    if (['forecast', 'mastband', 'stowage', 'tower'].includes(k))
      return nameList(k).map(t => k === 'forecast' ? 'the ' + t : t);""",
    """    if (k === 'tower') return nameList(k).map(t => t === 'yakata' ? 'the yakata (a deckhouse)'
                                                 : t === "commander's tower" ? "the commander's tower" : t);
    if (['forecast', 'mastband', 'stowage'].includes(k))
      return nameList(k).map(t => k === 'forecast' ? 'the ' + t : t);""")
rep("""      const one = ny === 1;
      bits.push(swCap(swNum(ny)) + ' yard' + (one ? ' is' : 's are') + ' crossed on the square-rigged mast'
                + (masts.filter(e => e.m.rig === 'square').length > 1 ? 's' : '')
                + (one ? '; the square sail hangs from it.' : '; the square sails hang from them.')""",
    """      const one = ny === 1, sq = masts.filter(e => e.m.rig === 'square').length;
      bits.push((sq > 1 ? 'The square-rigged masts cross ' : 'The square-rigged mast crosses ')
                + swNum(ny) + ' yard' + (one ? '' : 's')
                + (one ? '; the square sail hangs from it.' : '; the square sails hang from them.')""")
open(P, 'w').write(s); print('ok')
