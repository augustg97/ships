import json, sys
p = sys.argv[1]
V = json.load(open(p))
vs = V if isinstance(V, list) else V['vessels']
FAL = ("Falconer, An Universal Dictionary of the Marine (1769), CROSS-JACK: 'a sail extended on the lower yard of the "
       "mizen-mast, which is hence called the cross-jack yard ... This sail, however, has generally been found of little "
       "service, and is therefore very seldom used.'")
TXT = {
 'ship-of-the-line': "PLATE READ, r315 (0y¹⁴⁹): the crossjack is crossed bare, with no sail set from it and none rolled on it. "
   "Plate: C. W. Eckersberg, 'The Russian Ship of the Line Asow and a Frigate at Anchor in the Roads of Elsinore', 1828 "
   "(Commons, Google Art Project copy, read off the 1920 px derivative, about 30 px/m at the mizzen, the eye near the water): "
   "the crossjack is a pale spar, rows 1430-1449, lit on its upper face, with no roll on it, while every other yard on the "
   "three masts carries its furled sail. Class source in agreement: " + FAL + " Contested: the plate shows her at anchor; "
   "it cannot show whether she ever set a crossjack at sea, and Falconer says it was very seldom done.",
}
for vid in ('east-indiaman', 'slave-ship'):
    TXT[vid] = ("CLASS, r315 (0y¹⁴⁹): the crossjack is crossed bare, with no sail set from it and none rolled on it. "
      "No plate of this hull's mizzen has been read. Class source: " + FAL + " The Asow plate (Eckersberg 1828) shows a "
      "74's crossjack bare at anchor; this hull takes the same rule unread.")
n = 0
for v in vs:
    if v['id'] in TXT:
        ms = v['hull']['masts']
        mx = max(m['at'] for m in ms)
        m = [m for m in ms if m['at'] == mx][0]
        assert m['rig'] == 'square' and 'yards' not in m, v['id']
        m['crossjackSail'] = False
        m['crossjackProvenance'] = TXT[v['id']]
        n += 1
assert n == 3, n
raw = open(p).read()
ind = 2 if '\n  "' in raw[:200] or '\n  {' in raw[:200] else None
json.dump(V, open(p, 'w'), ensure_ascii=False, indent=ind)
print('record: 3 mizzens', 'indent', ind)
