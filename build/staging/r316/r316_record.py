import json, sys
P = sys.argv[1]; d = json.load(open(P)); IND = int(sys.argv[2]); L = d['vessels'] if isinstance(d, dict) else d
OLD = "every yard is crossed at the plan's class fraction of the truck (course 0.36, ltop 0.50, utop 0.62, top 0.55, ltg 0.73, utg 0.83, tg 0.76, royal 0.92), which is the silence named, not a read."
NEW = ("the course is crossed at the plan's class 0.36 of the truck, which is the silence named, not a read. Above it the yards "
       "hang from the mast's own sections (r316, 0y150): the lower topsail yard is fixed on the lower cap, as Howes' rig fixes it, and "
       "each hoisting yard is set atrip, at 0.88 of the section it rides (Falconer 1769, ATRIP: 'hoisted up to the mast-head, or to "
       "their utmost extent'); a topgallant and a royal on one pole divide its run over the cap below in two equal parts. Until r316 "
       "the plan's fractions (ltop 0.50, utop 0.62, tg 0.76, royal 0.92) hung the lower topsail yard 3.1-3.8 m under its cap and the "
       "topgallant inside the topmast's doubling. CLASS: no plate read.")
END_OLD = "The topsail's and the topgallant's yards were LOWERED on the beset ship (sails furled), so their set fractions do not read on this plate and stand at the plan's (top 0.55, tg 0.76)."
END_NEW = ("The topsail's and the topgallant's yards were LOWERED on the beset ship (sails furled), so their set fractions do not read on this plate. "
           "From r316 (0y150) they are set atrip, at 0.88 of the section each rides (Falconer 1769, ATRIP), where the plan's 0.55 and 0.76 "
           "had hung both inside the doublings, under the cap of the section below. Hurley's full-sail plate from ahead (build/hurley-fullsail.jpg) "
           "puts the topsail yard at about 0.57 and the topgallant yard at about 0.93 of the height from the course yard to the truck; the "
           "model's are 0.73 and 0.97 (0.31 and 0.63 before r316). That plate is not read into the record: it is taken from low on the ice "
           "ahead of her, and its perspective is not solved.")
n = 0
for v in L:
    for m in (v.get('hull') or {}).get('masts', []):
        p = m.get('yardFracsProvenance') or ''
        if v['id'] in ('clipper', 'steamer') and OLD in p: m['yardFracsProvenance'] = p.replace(OLD, NEW); n += 1
        if v['id'] == 'endurance' and END_OLD in p: m['yardFracsProvenance'] = p.replace(END_OLD, END_NEW); n += 1
print('replaced', n); assert n == 7, n
json.dump(d, open(P, 'w'), ensure_ascii=False, indent=IND)
