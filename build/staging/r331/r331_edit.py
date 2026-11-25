"""r331 (0y176): the fluyt's fore and main topsail yards read off Hollar's 1647 etching of a fluyt under sail.
The plate crosses no yard on either topgallant mast, so that section answers UNREAD inside the read.
Audit (A-HOIST-READ): a section may answer `unread` with its reason; a section both read and unread convicts; and a
hoist read and a mast read off the same plate agree on the mast's foot row and the section's head row (1 px).
Usage: r331_edit.py [WEB] [AUDIT ...]   every replace asserted."""
import json, sys
ROOT = '/Users/augustgweon/Ships/'
WEB = sys.argv[1] if len(sys.argv) > 1 else ROOT + 'web'
AUDS = sys.argv[2:] if len(sys.argv) > 2 else [ROOT + 'Research/audit-hulls.js', ROOT + 'web/audit-hulls.js']
T = json.load(open(ROOT + 'build/staging/r331/trace.json'))
PLATE_SHORT = 'build/staging/r328/dl/hollar-flute.jpg (Hollar 1647, 1920 px)'
PLATE = ("Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - "
         "A Flute (State 2).jpg, read at the 1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m at the masts, bow at the left)")
TG_UNREAD = ("UNREAD, r331: this plate crosses no yard on the topgallant mast. Above the topmast's cap the pole is bare and carries a "
             "pennant. Hollar's plate of fluyts at anchor (1647, build/staging/r328/dl/fleuten-1647.jpg, 644 px wide) draws topgallant "
             "yards crossed, but its sails are furled, so it does not show where a set yard is hoisted. The yard stays at the class 0.88 "
             "of its section.")
MAST = {0: dict(name='fore', foot=902, head=285, footTxt="row 902, the mast's foot on the forecastle deck",
                capTxt="row 285, the topmast's cap, where the ring of the crosstrees shows at column 693"),
        1: dict(name='main', foot=933, head=192, footTxt=("row 933, the waist rail, where the mast comes out from behind it. The waist deck "
                "is hidden behind the bulwark and may lie up to 30 px lower, at row 963; read from there the share is 0.8987, "
                "0.004 more, inside the bound"),
                capTxt="row 192, the topmast's cap at column 1176")}
P = WEB + '/data/vessels.json'
d = json.loads(open(P).read())
V = {x['id']: x for x in d['vessels']}
ms = V['fluyt']['hull']['masts']
for mi, M in MAST.items():
    m = ms[mi]; t = T[M['name']]
    assert 'hoistRead' not in m and m['hoistProvenance'].startswith('UNREAD, r324'), 'already read?'
    MR = m['mastHeightsRead']; assert MR['foot'][1] == M['foot'] and MR['rows']['crosstrees'] == M['head']
    yard = t['row']; share = round((M['foot'] - yard) / (M['foot'] - M['head']), 4)
    m['hoistRead'] = {
        'topmast': {'ofFootToHead': share, 'rows': {'foot': M['foot'], 'head': M['head'], 'yard': yard},
                    'fit': {'col': t['axisCol'], 'slope': t['slope'], 'icpt': t['icpt'], 'rmsPx': t['rms'], 'n': t['n'],
                            'cols': [t['points'][0][0], t['points'][-1][0]]},
                    'spanPx': M['foot'] - M['head']},
        'topgallantMast': {'unread': TG_UNREAD},
        'plate': PLATE_SHORT, 'boundPm': 0.01, 'script': 'build/staging/r331/r331_trace.py, r331_edit.py'}
    hm = (M['foot'] - M['head']) / 36.0
    m['hoistProvenance'] = (
        f"PLATE READ, r331 (0y¹⁷⁶): the {M['name']} topsail yard, read off {PLATE}. The yard is the head edge of the set topsail, "
        f"traced as the centroid of the dark pixels on each of {t['n']} columns ({t['points'][0][0]}-{t['points'][-1][0]}) and fitted "
        f"as a straight line (rms {t['rms']} px). It crosses the mast's axis, the line from the foot to the cap, at column {t['axisCol']}, "
        f"row {yard}. The foot is {M['footTxt']}. The head of the topmast is {M['capTxt']}. The yard stands {share} of the height from "
        f"the foot to the topmast's head. The yard slopes {abs(t['slope'])} px per column on the plate, because it is braced round and "
        f"the ship is seen from a little forward of the beam; the model hangs it level at the crossing. A 3 px error in the yard's row "
        f"is 0.005 of the {M['foot'] - M['head']} px span, and the bound is 0.01. The foot and head rows are r329's mast read "
        f"(mastHeightsRead). Until r331 the yard was set at the class 0.88 of its section, 0.944 of this height. The topgallant "
        f"yard is not read: {TG_UNREAD[len('UNREAD, r331: '):]}")
open(P, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('record written', {mi: ms[mi]['hoistRead']['topmast']['ofFootToHead'] for mi in MAST})

A_OLD = """          const e = R[k];
          if (!e || typeof e.ofFootToHead !== 'number') { say(v.id, 'a hoist read missing a section', `${at}: hoistRead.${k}.ofFootToHead is absent`); return; }"""
A_NEW = """          const e = R[k];
          if (e && typeof e.unread === 'string') {   // r331: a section the plate does not draw answers unread, with its reason
            if (typeof e.ofFootToHead === 'number' || e.rows)
              say(v.id, 'a hoist section both read and unread', `${at} ${k}: hoistRead.${k} carries a figure and an unread answer`);
            else if (!/^UNREAD/.test(e.unread) || e.unread.length < 60)
              say(v.id, 'an unread hoist section that does not say why', `${at} ${k}: hoistRead.${k}.unread is '${e.unread.slice(0, 40)}'`);
            return;
          }
          if (!e || typeof e.ofFootToHead !== 'number') { say(v.id, 'a hoist read missing a section', `${at}: hoistRead.${k}.ofFootToHead is absent`); return; }
          {   // r331: a hoist read and a mast read off the same plate agree on the mast's foot and the section's head (1 px)
            const MR = mk.mastHeightsRead, file = s => String(s || '').split(' (')[0], hk = k === 'topmast' ? 'crosstrees' : 'truck';
            if (e.rows && MR && MR.rows && Array.isArray(MR.foot) && file(R.plate) === file(MR.plate)) {
              if (Math.abs(e.rows.foot - MR.foot[1]) > 1)
                say(v.id, 'a hoist and a mast read that disagree on the foot', `${at} ${k}: hoistRead puts the foot on row ${e.rows.foot} and mastHeightsRead on row ${MR.foot[1]}, off the same plate (${file(R.plate)})`);
              if (typeof MR.rows[hk] === 'number' && Math.abs(e.rows.head - MR.rows[hk]) > 1)
                say(v.id, 'a hoist and a mast read that disagree on the head', `${at} ${k}: hoistRead puts the section's head on row ${e.rows.head} and mastHeightsRead's ${hk} on row ${MR.rows[hk]}, off the same plate (${file(R.plate)})`);
            }
          }"""
H_OLD = """       one tested, and a set build's yard stands at it (0.005 m). */"""
H_NEW = """       one tested, and a set build's yard stands at it (0.005 m).
       r331 (0y¹⁷⁶): a section the plate does not draw answers `{ unread: 'UNREAD, …' }` with its reason, and its yard is drawn
       at the class figure; a section both read and unread convicts. Hollar's fluyt under sail (1647) crosses no topgallant
       yard. A hoist read and a mast read taken off the same plate agree on the mast's foot row and the section's head row
       within 1 px, so the two reads cannot measure the yard against a different mast. */"""
for A in AUDS:
    s = open(A).read()
    for o, n in [(A_OLD, A_NEW), (H_OLD, H_NEW)]:
        assert s.count(o) == 1, (A, o[:60]); s = s.replace(o, n)
    open(A, 'w').write(s); print('audit written', A)
