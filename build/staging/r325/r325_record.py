"""r325 (0y167): the topmast tops on the East Indiaman's and the slave ship's fore and main, read off Vasa's rig diagram;
the fluyt's fore and main say UNREAD."""
import json, sys
P = sys.argv[1]; RD = json.load(open(sys.argv[2]))
v = json.load(open(P))
PLATE = "build/staging/r320/dl/vasa-rig.jpg (1920 px thumbnail of Commons File:Vasa_rig_diagram.jpg, Hocker 2023 p. 31)"
SRC = ("Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), p. 31, "
       "the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg, about 24 px/m on Vasa's hull)")
MAST = {0: dict(name='fore', foot=1005, head=330, tm='fore-topmast-top', lo='fore-lower-top'),
        1: dict(name='main', foot=1012, head=298, tm='main-topmast-top', lo='main-lower-top')}
UNREAD = ("UNREAD, r325 (0y¹⁶⁷): the topmast carries crosstrees at its head, the class fitting, and no plate of this hull's "
          "topmasts has been read for a top. Before about 1700 a topmast commonly carried a small round top under its cap "
          "(Vasa's rig diagram draws one on the fore and the main); whether this hull's did is not read.")
n = r = 0
for vs in v['vessels']:
    yr = vs['hull'].get('year') or 0
    for mi, mk in enumerate(vs['hull'].get('masts', [])):
        if mk.get('rig') != 'square' or isinstance(mk.get('yards'), list) or (mk.get('only') or 3) < 3 or yr >= 1710: continue
        assert 'topmastTop' not in mk and 'topmastTopProvenance' not in mk, (vs['id'], mi)
        if vs['id'] not in ('east-indiaman', 'slave-ship'):
            mk['topmastTopProvenance'] = UNREAD; n += 1; continue
        M = MAST[mi]; t, lo = RD[M['tm']], RD[M['lo']]
        share = round((M['foot'] - t['row']) / (M['foot'] - M['head']), 4)
        ratio = round(t['widthPx'] / lo['widthPx'], 3)
        mk['topmastTop'] = {"ofFootToHead": share, "ofLowerTop": ratio,
            "rows": {"foot": M['foot'], "head": M['head'], "top": t['row'], "topFrom": t['rowTop'], "topTo": t['rowBottom']},
            "widthPx": {"top": t['widthPx'], "lowerTop": lo['widthPx'], "lowerTopRow": lo['row']},
            "plate": PLATE, "boundPm": 0.01, "ratioBound": 0.06, "script": "build/staging/r325/r325_read.py, r325_record.py"}
        date = '1620' if vs['id'] == 'east-indiaman' else '1590'
        mk['topmastTopProvenance'] = (f"PLATE READ, r325 (0y¹⁶⁷): read off {SRC}. The {M['name']} topmast carries a small round top: "
            f"its widest rows are {t['rowTop']}-{t['rowBottom']} (centre {t['row']}), under the topmast's head at row {M['head']}, over the "
            f"mast's foot at row {M['foot']}: {share} of the height from the foot to the topmast's head. Its widest run across the mast is "
            f"{t['widthPx']} px, and the {M['name']} lower top's on the same plate, by the same test, is {lo['widthPx']} px (rows "
            f"{lo['rowTop']}-{lo['rowBottom']}): {ratio} of the lower top's width. Each run is read through the mast's axis, fitted on the "
            f"spar's centres in rows clear of the top. A 2 px reading error is 0.003 of the height and 0.05 of the width ratio; the bounds "
            f"are 0.01 and 0.06. This hull is dated {date}; the read is Vasa's, applied to it.")
        r += 1
        print(vs['id'], mi, share, ratio)
assert (n, r) == (2, 4), (n, r)
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
