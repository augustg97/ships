"""r310 (0y138): the clipper's spanker stowage read off a plate; every other gaff/spanker mast's silence named."""
import json, sys
P = sys.argv[1]
d = json.load(open(P))
V = {v['id']: v for v in d['vessels']}
READ = ("READ, r310 (0y¹³⁸): LOWERED. The plate is the State Library of Queensland's John Oxley Library negative 146359, "
 "'The Cutty Sark waiting in Sydney Harbour for the new season's wool', 1885-94 (Commons 'StateLibQld 1 146359 Cutty Sark (ship).jpg', 706 x 1000 px), "
 "taken from high on her port quarter at anchor. At the mizzen it is about 11 px/m: 167 px from the poop to the mizzen top. "
 "A gaff 0.25 m thick and over 10 m long would show at 3 px by 110 px or more, as her 0.3 m yards do. "
 "No gaff stands on the mizzen: the lower mast is bare from the crossjack yard down to the poop, and no brailed bundle lies along its after side. "
 "The poop is covered by an awning whose ridge runs aft from the mast at the height a boom would stand. "
 "So the gaff is down, either lowered to the boom or struck, and the builder's lowered stowage is the nearer of the two it draws. "
 "CONTESTED: this is one plate of one ship, the Cutty Sark whose dimensions this class hull carries, at anchor in port 16 to 25 years after her launch and after her 1880 re-rig. "
 "It does not show where the gaff lies, and other clippers may have kept a standing gaff.")
UNREAD = ("UNREAD, r310: no plate of this hull furled has been read for how this sail is stowed. "
 "The builder lowers the gaff onto a roll along the boom, a schooner's stowage; that is the default named, not a read. "
 "A plate of her at anchor that shows this mast between the deck and the top settles it: a gaff standing at its working angle with the sail gathered against the mast is 'brailed'; no gaff aloft is 'lowered'.")
n = 0
for vid, v in V.items():
    for i, m in enumerate((v.get('hull') or {}).get('masts') or []):
        if not (m.get('rig') == 'gaff' or (m.get('rig') == 'square' and m.get('spanker'))): continue
        if m.get('furlStow') is not None or m.get('gaffStow') == 'brailed': continue
        if vid == 'clipper':
            assert i == 2 and m.get('spanker')
            m['furlStow'] = 'lowered'; m['furlStowProvenance'] = READ
        else:
            m['furlStowProvenance'] = UNREAD
        n += 1; print(vid, i)
assert n == 16, n
json.dump(d, open(P, 'w'), ensure_ascii=False, indent=2)
