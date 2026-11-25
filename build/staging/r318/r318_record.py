#!/usr/bin/env python3
"""r318 (0y154): the clipper's masts carry Cutty Sark's tea-rig heights. Edits <dir>/data/vessels.json in place,
keeping its formatting style (indent 2 as the file has it is re-detected). Asserted."""
import sys, json
from pathlib import Path
p = Path(sys.argv[1]) / 'data' / 'vessels.json'
raw = p.read_text()
d = json.loads(raw)
L = d if isinstance(d, list) else d['vessels']
v = [x for x in L if x.get('id') == 'clipper']
assert len(v) == 1
masts = v[0]['hull']['masts']
assert [m.get('heightM') for m in masts] == [23.2, 25.9, 22.3], [m.get('heightM') for m in masts]

SRC = ("Lubbock, The Log of the Cutty Sark (1924), Appendix III, the spar plan of the tea rig, as tabulated in metres by "
       "J. Sankey, 'The Ship Cutty Sark' (johnsankey.ca/cuttysark.html, 'compared to the original lengths quoted in The Log "
       "of the Cutty Sark'; saved as build/staging/r318/dl/sankey.html) and by Wikipedia's 'Mast specifications' table, which "
       "cites the same appendix. The appendix itself is a fold-out that the archive.org OCR does not read "
       "(build/staging/r318/dl/bwb.txt), so the figures are Sankey's conversion of it. Lubbock's text checks the main: 'Her "
       "mainmast from load line to truck was 151 feet in length' (46.0 m; bwb.txt line 2196), which leaves 1.5 m from the "
       "load line to the deck under a 44.5 m truck.")
CONT = ("CONTESTED: the table names each height by a sail (top, topgallant, royal, skysail) and not by a fitting. The "
        "builder reads the first as the top's platform, the second as the topmast crosstrees and the last as the truck. "
        "If the first is the lower cap instead, every lower mast is 10% shorter than drawn.")
H = [
  ({'top': 18.8, 'crosstrees': 29.8, 'truck': 39.6}, 'fore: top 18.8, topgallant 29.8, royal 39.6 m over the deck.'),
  ({'top': 19.8, 'crosstrees': 31.9, 'truck': 44.5}, 'main: top 19.8, topgallant 31.9, skysail 44.5 m over the deck. '
     'The tea rig set a main skysail over the royal; this record names no skysail yard, so the royal sets atrip under '
     'the skysail masthead (open, 0y159).'),
  ({'top': 17.0, 'crosstrees': 25.7, 'truck': 33.2}, 'mizzen: top 17.0, topgallant 25.7, royal 33.2 m over the deck.'),
]
for m, (mh, what) in zip(masts, H):
    del m['heightM']
    m['mastHeightsM'] = mh
    m['mastHeightsProvenance'] = ('RECORD, r318 (0y154): Cutty Sark\'s tea rig, ' + what + ' ' + SRC + ' Until r318 the '
        'lower mast was a recorded ' + {18.8: '23.2', 19.8: '25.9', 17.0: '22.3'}[mh['top']] + ' m carried up by Steel\'s 1794 '
        'proportions, a topmast 0.60 of it and a topgallant mast half the topmast, which left two yards on a pole sized for one. ' + CONT)
# the course yards, Lubbock's tea rig (Sankey's yard table): fore and main interchangeable at 23.8 m, mizzen 18.3 m
for m, cy, nm in zip(masts, [23.8, 23.8, 18.3], ['fore', 'main', 'mizzen']):
    assert 'courseYardM' not in m
    m['courseYardM'] = cy
    m['mastHeightsProvenance'] += (' The ' + nm + ' course yard, ' + str(cy) + ' m, is from the same table; until r318 it was 0.875 of '
        'the lower mast. The yards above it keep the plan\'s shares of it.')
rows = v[0]['rows']
k = [i for i, r in enumerate(rows) if r[0] == '*Cutty Sark*, 1869']
assert len(k) == 1
rows.insert(k[0] + 1, ["*Cutty Sark*'s masts, deck to truck",
    "fore 39.6 m, main 44.5 m, mizzen 33.2 m, as rigged for the tea trade (Lubbock's spar table); the model's masts are drawn to these heights"])
assert 'Lubbock' not in v[0]['cite']
v[0]['cite'] = v[0]['cite'].rstrip('.') + "; Lubbock, *The Log of the Cutty Sark* (1924)."
indent = 2 if raw.startswith('{\n  ') or raw.startswith('[\n  ') else None
p.write_text(json.dumps(d, ensure_ascii=False, indent=indent) + ('\n' if raw.endswith('\n') else ''))
print('clipper masts recorded in', p)
