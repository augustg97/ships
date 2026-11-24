# r306: Endurance's main and mizzen gaffs, read off Hurley's beset broadside (gaffread.json from
# r306_gaffread.py), and the main sail's stowage, read off the beset and the full-sail plates.
import json, sys
p, rp = sys.argv[1], sys.argv[2]
V = json.load(open(p)); R = json.load(open(rp))
v = [x for x in V['vessels'] if x.get('id') == 'endurance'][0]; h = v['hull']
M = h['masts']; assert M[1]['rig'] == 'gaff' and M[2]['rig'] == 'gaff'
assert 'gaffFrac' not in M[1] and 'gaffFrac' not in M[2]
PLATE = ("Hurley's beset broadside (RMG P00018, build/hurley-broadside.png, 4800x3743), read in r306 by "
         "build/staging/r306/r306_gaffread.py (crops plate-gaffs-4x.png): the gaff is a faint line rising aft "
         "from the mast, under the cap, with the sail stowed. For every column of its visible run the darkest row "
         "in a 13-px band is taken, a line is fitted (weighted by the dip under the sky), and the gaff is read from "
         "the mast's axis along that line to its last visible column. ")
def rec(m, name):
    r = R[name]
    m['gaffFrac'] = round(r['gaffFrac'], 2)
    m['throatFrac'] = round(r['throatFrac'], 2)
    m['gaffRead'] = {
        'plate': 'RMG P00018 (build/hurley-broadside.png)', 'mastAxisCol': r['mastAxisCol'],
        'throat': r['throat'], 'peak': r['peak'], 'lengthPx': r['lengthPx'], 'angleDeg': r['angleDeg'],
        'throatOverDeckPx': r['throatOverDeckPx'], 'capOverDeckPx': r['capOverDeckPx'],
        'fitResidualPx': r['fitResidualPx'], 'script': 'build/staging/r306/r306_gaffread.py',
        'provenance': PLATE + (
            f"The {name} gaff runs {r['lengthPx']} px from the mast's axis (column {r['mastAxisCol']}) to its peak at "
            f"column {r['peak'][0]}, row {r['peak'][1]}, at {r['angleDeg']} degrees over the horizontal (the line fits "
            f"its rows to {r['fitResidualPx']} px). The throat meets the axis at row {r['throat'][1]}, {r['throatOverDeckPx']} "
            f"px over the deck (the cap rail row of r285 plus the plan's 1.35 m bulwark, 16.7 px, r272). Against the "
            f"lower mast's {r['capOverDeckPx']} px from deck to cap (r304's read of the same plate), the gaff is "
            f"{m['gaffFrac']} of the lower mast and the throat stands at {m['throatFrac']} of it. Each end is good to "
            f"about 3 px, so each share to about {r['fracBound']}. The shares do not depend on the plate's scale, which "
            f"is contested (trucksContested): the built gaff is this share of the built lower mast. The peak stands "
            f"a few px over the cap on the plate, as a long gaff's does.")}
rec(M[1], 'main'); rec(M[2], 'mizzen')
M[1]['gaffStow'] = 'brailed'
M[1]['gaffStowProvenance'] = (
    "PLATE READ, r306: the main is a loose-footed sail, brailed in to the mast under a gaff that stays aloft, and "
    "she carries no main boom. On the beset broadside (RMG P00018, crop build/staging/r306/plate-main-foot-4x.png) "
    "the gaff stands at its working angle while the sail is stowed, the stowed cloth is a dark wedge along the "
    "after side of the mast that widens down to the rail, and the sky between the mast and the funnel is clear "
    "at every height over the rail: a boom of the length the class rule drew (4.3 m, about 34 to 54 px at this "
    "plate's two contested scales) would cross that gap as a dark bar, and none is there. On Hurley's plate of "
    "her under sail from ahead (build/hurley-fullsail.jpg) the square sails are set and no fore-and-aft canvas "
    "shows abaft the main mast. The funnel stands 5.5 m abaft the mast (stationProvenance), under the gaff's "
    "reach: a sail of this head set on a boom short enough to clear the stack would put its leech through the "
    "funnel's top. Where the sheet led when the sail was set is not read; the model draws the sail as both "
    "plates show it, brailed.")
open(p, 'w').write(json.dumps(V, indent=2, ensure_ascii=False) + '\n')
print({k: M[1][k] for k in ('gaffFrac', 'throatFrac')}, {k: M[2][k] for k in ('gaffFrac', 'throatFrac')})
