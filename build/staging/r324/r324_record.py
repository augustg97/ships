"""r324 (0y¹⁶⁶): where each hoisting yard is set on the East Indiaman's and the slave ship's masts, read off Vasa's rig diagram;
every other segment-rig square mast says it is UNREAD."""
import json, sys
P = sys.argv[1]; RD = json.load(open(sys.argv[2]))
v = json.load(open(P))
PLATE = "build/staging/r320/dl/vasa-rig.jpg (1920 px thumbnail of Commons File:Vasa_rig_diagram.jpg, Hocker 2023 p. 31)"
SRC = ("Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), p. 31, "
       "the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg, about 24 px/m on Vasa's hull)")
# mast: foot row (r322), heads per section (r322: the topmast's cap, the topgallant mast's cap), the top under each yard
MAST = {0: dict(name='fore', foot=1005, heads={'topmast': 330, 'topgallantMast': 220}),
        1: dict(name='main', foot=1012, heads={'topmast': 298, 'topgallantMast': 132}),
        2: dict(name='mizzen', foot=944, heads={'topmast': 459})}
FIT = {(0, 'topmast'): 'fore-topsail', (1, 'topmast'): 'main-topsail', (2, 'topmast'): 'mizzen-topsail',
       (0, 'topgallantMast'): 'fore-topgallant', (1, 'topgallantMast'): 'main-topgallant'}
YARD = {'topmast': 'topsail yard', 'topgallantMast': 'topgallant yard'}
CLASS = ("UNREAD, r324 (0y¹⁶⁶): each yard above the course is set atrip, at 0.88 of the section it hoists on, the class figure "
         "(Falconer 1769, ATRIP: 'The top-sails are said to be atrip, when they are hoisted up to the top-mast-heads'), and no plate of this "
         "hull's set sails has been read for it.")
n = r = 0
for vs in v['vessels']:
    for mi, mk in enumerate(vs['hull'].get('masts', [])):
        if mk.get('rig') != 'square' or isinstance(mk.get('yards'), list) or (mk.get('only') or 3) < 2: continue
        assert 'hoistRead' not in mk and 'hoistProvenance' not in mk, (vs['id'], mi)
        if vs['id'] not in ('east-indiaman', 'slave-ship'):
            mk['hoistProvenance'] = CLASS; n += 1; continue
        M = MAST[mi]; date = '1620' if vs['id'] == 'east-indiaman' else '1590'
        hr, parts = {}, []
        for key, head in M['heads'].items():
            f = RD[FIT[(mi, key)]]
            share = round((M['foot'] - f['row']) / (M['foot'] - head), 4)
            hr[key] = {"ofFootToHead": share, "rows": {"foot": M['foot'], "head": head, "yard": f['row']},
                       "fit": {"col": f['col'], "slope": f['slope'], "rmsPx": f['rms'], "n": f['n']}, "spanPx": M['foot'] - head}
            parts.append(f"the {M['name']} {YARD[key]} crosses the mast's axis at row {f['row']} (its line fitted on {f['n']} columns, rms {f['rms']} px), "
                         f"under the head of the {key.replace('topgallantMast', 'topgallant mast')} at row {head}, over the foot at row {M['foot']}: "
                         f"{share} of the height from the foot to that head")
        hr.update({"plate": PLATE, "boundPm": 0.01, "script": "build/staging/r324/r324_read.py, r324_record.py"})
        mk['hoistRead'] = hr
        mk['hoistProvenance'] = (f"PLATE READ, r324 (0y¹⁶⁶): read off {SRC}. " + "; ".join(parts).capitalize() + ". "
            "Each yard's row is where its fitted centre line crosses the mast's axis, itself fitted on the mast's centres above and below the yard; "
            "the main's yards are drawn cocked, and the model hangs them level at that height. The foot and head rows are r322's (mastHeightsRead). "
            "A 3 px reading error is under 0.007 of any of these spans, and the bound is 0.01. Until r324 each of these yards was set at the class "
            "0.88 of its section, higher than the plate draws it. This hull is dated " + date + "; the read is Vasa's, applied to it.")
        r += 1
        print(vs['id'], mi, {k: hr[k]['ofFootToHead'] for k in M['heads']})
assert (n, r) == (7, 6), (n, r)
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
