import sys
P = sys.argv[1]; s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
# phrases may return several items; the list flattens them so no item nests its own "and"
rep("""  const nameList = k => [...names[k]].map(t => t.toLowerCase());""",
    """  const nameList = k => [...names[k]].map(t => t.split(' — ')[0].toLowerCase());""")
rep("""    if (k === 'top') return swAnd([...names[k]].map(t => t === 'Top' ? 'tops at the lower mastheads'
                                  : t === 'Crosstrees' ? 'crosstrees at the topmast heads' : t.toLowerCase()));
    if (k === 'gundeck') return swAnd([...names[k]].filter(t => !/^(Stanchion|Deck beam|Deck clamp|Screen cap|End bulwark|Bulwark)$/.test(t))
                                      .map(t => t.toLowerCase()));
    if (k === 'sangjang') return 'the walls and oar ports of the oar deck';""",
"""    if (k === 'top') return [...names[k]].map(t => t === 'Top' ? 'tops at the lower mastheads'
                                  : t === 'Crosstrees' ? 'crosstrees at the topmast heads' : 'a ' + t.toLowerCase());
    if (k === 'gundeck') return [...names[k]].filter(t => !/^(Stanchion|Deck beam|Deck clamp|Screen cap|End bulwark|Bulwark)$/.test(t))
                                      .map(t => t === 'Sangjang' ? 'the sangjang, an upper deck built over the rowers'
                                              : t === 'Gun deck' ? 'a gun deck over the rowers' : t.toLowerCase());
    if (k === 'sangjang') return 'the oar deck\\'s walls and oar ports';
    if (['castle', 'castles', 'poop'].includes(k)) return nameList(k).map(t => 'the ' + t);""")
rep("""    if (['forecast', 'castle', 'castles', 'poop', 'mastband', 'stowage', 'tower', 'gundeck', 'sangjang'].includes(k))
      return swAnd(nameList(k));""", """    if (['forecast', 'mastband', 'stowage', 'tower'].includes(k))
      return nameList(k).map(t => k === 'forecast' ? 'the ' + t : t);""")
rep("""    const l = keys.filter(k => !SAIL_SKIP.has(k) && !(skip || []).includes(k)).map(phrase);
    return [...new Set(l)];""", """    const l = keys.filter(k => !SAIL_SKIP.has(k) && !(skip || []).includes(k)).map(phrase).flat();
    return [...new Set(l)];""")
rep("""    const open = [...(names.deck || [])].filter(t => /^Open hull/.test(t)).length;
    let t = open ? (open > 1 ? 'Her ' + swNum(open) + ' hulls are left open, with no deck laid.'
                             : 'Her hull is left open, with no deck laid.')
                 : 'The deck is laid, and its beams tie the two sides together.';
    const l = extras();
    if (l.length) t += ' Added at this stage: ' + swAnd(l) + '.';
    return [open ? 'Hull closed' : 'Decked', t];""",
"""    /* an open hull carries no deck; count its meshes, because two hulls share one name */
    const open = parts.filter(p => p.key === 'deck' && /^Open hull/.test(p.name)).length;
    const joined = open > 1 && has('crossbeam');
    let t = joined ? 'Her ' + swNum(open) + ' hulls are left open, with no deck laid in either. '
                   + 'Crossbeams join them' + (has('platform') ? ' and carry a platform between them.' : '.')
          : open ? 'Her hull is left open, with no deck laid.'
          : 'The deck is laid, and its beams tie the two sides together.';
    const l = extras(joined ? ['crossbeam', 'platform'] : []);
    if (l.length) t += ' Added at this stage: ' + swAnd(l) + '.';
    return [joined ? 'Hulls joined' : open ? 'Open hull' : 'Decked', t];""")
rep("""    const clauses = groups.map(g => {""", """    const clauses = groups.map((g, gi) => {""")
rep("""      return (who === 'her mast' ? 'It' : who === 'both masts' || /^all /.test(who) ? swCap(who.replace(/^all /, 'All ')) : swCap(who)) + ' ' + what;""",
    """      const subj = who === 'her mast' ? 'it' : who;
      return (gi === 0 ? swCap(subj) : subj) + ' ' + what;""")
rep("""      bits.push(swCap(swNum(ny)) + ' yard' + (ny === 1 ? ' is' : 's are') + ' crossed on the square-rigged mast'
                + (masts.filter(e => e.m.rig === 'square').length > 1 ? 's' : '') + '; the square sails hang from them.'
                + (has('brace') ? ' Braces at the yardarms swing the yards round to trim the sails to the wind.' : ''));""",
"""      const one = ny === 1;
      bits.push(swCap(swNum(ny)) + ' yard' + (one ? ' is' : 's are') + ' crossed on the square-rigged mast'
                + (masts.filter(e => e.m.rig === 'square').length > 1 ? 's' : '')
                + (one ? '; the square sail hangs from it.' : '; the square sails hang from them.')
                + (has('brace') ? (one ? ' Braces at the yardarms swing the yard round to trim the sail to the wind.'
                                       : ' Braces at the yardarms swing the yards round to trim the sails to the wind.') : ''));""")
open(P, 'w').write(s); print('ok')
