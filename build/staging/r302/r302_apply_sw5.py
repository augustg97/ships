import sys
P = sys.argv[1]; s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""    const l = extras(rigs.has('square') ? ['brace'] : []);
    let t = bits.join(' ');
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';""",
"""    /* the ropes are named as one sentence, the three that every rig here reeves first and a
       count of the rest: twelve kinds of line in a list made the card six lines tall */
    const ROPE = ['halyard', 'sheet', 'tack', 'lift', 'jeers', 'buntline', 'clewline', 'peakHalyard',
                  'throatHalyard', 'toppingLift', 'coil'];
    const ropes = ROPE.filter(k => has(k) && k !== 'coil').map(k => SAIL_PHRASE[k]);
    const l = extras(['brace', ...ROPE]);
    let t = bits.join(' ');
    if (ropes.length)
      t += ' The running rigging is rove: ' + (ropes.length > 3
        ? ropes.slice(0, 3).join(', ') + ' and ' + swNum(ropes.length - 3) + ' more kind' + (ropes.length - 3 > 1 ? 's' : '') + ' of line.'
        : swAnd(ropes) + '.');
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';""")
open(P, 'w').write(s); print('ok')
