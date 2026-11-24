import json, sys
p = sys.argv[1]
V = json.load(open(p))
vs = V if isinstance(V, list) else V.get('vessels', V)
v = [x for x in vs if x.get('id') == 'endurance'][0]; h = v['hull']
M = h['masts']; assert M[1]['rig'] == 'gaff' and M[2]['rig'] == 'gaff'
assert M[1]['heightM'] == 33.5 and M[2]['heightM'] == 26.8
PLATE = ("Hurley's beset broadside (RMG P00018, build/hurley-broadside.png, 4800x3743), read in r304 by "
         "build/staging/r304/r304_steps.py: the darkness of each pole summed across it, row by row, which "
         "measures its width where the blur is wider than the spar. ")
def rec(m, name, cap, step, fade, thin, thick):
    capPx, truckPx = round(cap + 16.7 - step, 1), round(cap + 16.7 - fade, 1)
    frac = round(capPx / truckPx, 2)
    del m['heightM']
    m['topmast'] = True
    m['truckM'] = {'main': 33.5, 'mizzen': 26.8}[name]
    m['capFrac'] = frac
    m['capRead'] = {
        'plate': 'RMG P00018 (build/hurley-broadside.png)', 'capRailRow': cap, 'bulwarkPx': 16.7,
        'stepRow': step, 'truckFadeRow': fade, 'capOverDeckPx': capPx, 'truckOverDeckPx': truckPx,
        'scalePxPerM': 12.4, 'script': 'build/staging/r304/r304_steps.py',
        'provenance': PLATE + (
            f"The {name} pole sums to about {thin} over rows 425-490 and steps to about {thick} below row {step} "
            f"(the half-way crossing, +/- 3 rows): a thin topmast over a thick lower mast, with the gaff's throat "
            f"just under the step. The cap rail stands at row {cap} (r285) and the deck 16.7 px under it (the plan's "
            f"1.35 m bulwark, r272), so the cap is {capPx} px over the deck. The pole fades to half its plateau at "
            f"row {fade} (+/- 6), {truckPx} px over the deck, so the cap stands at {capPx}/{truckPx} = {frac} of the "
            f"truck. A thin pole may fade before its truck, which makes this share a bound from above. The same read "
            f"on the fore gives 0.55 for its top against the builder's 0.586 for the fore's stack, so the method "
            f"lands within 0.04 on a mast whose sections are known. The heeled plate (build/endurance-heeled.png, "
            f"Commons 4776 px copy in build/staging/r280) shows the mizzen's crosstrees with the topmast standing "
            f"beside the lower masthead. The plate gives no lengths: the truck stays the record's figure "
            f"(trucksContested), and only the cap's share of it is read here. Hurley's night plate (August 1915) "
            f"shows the main ending at a capped head level with the fore topsail yard, which may be a struck "
            f"topmast; it is not read here.")}
rec(M[1], 'main', 630, 500, 385, 260, 520)
rec(M[2], 'mizzen', 645, 507, 409, 200, 950)
h['trucksContested'] = h['trucksContested'].replace(
    "the record's mast heights (heightM 18.8 / 33.5 / 26.8;",
    "the record's mast heights (fore heightM 18.8, main and mizzen truckM 33.5 / 26.8 deck to truck since r304, which gave them topmasts at the plate's cap shares;", 1)
assert 'since r304' in h['trucksContested']
open(p, 'w').write(json.dumps(V, indent=2, ensure_ascii=False) + '\n')
print(M[1]['capFrac'], M[2]['capFrac'])
