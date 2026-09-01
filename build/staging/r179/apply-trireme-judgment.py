#!/usr/bin/env python3
# r179 — apply the trireme windlass judgment: one row + one provenance field.
# No hull.windlass, no builder edit. Run only AFTER the opening ratchet exits.
import json, sys

P = 'web/data/vessels.json'

ROW = [
    "Windlass, judged",
    "none is drawn, because her navy's own record answers — the Athenian "
    "dockyard inventories list each warship's entire gear down to her two iron "
    "anchors, weighed on the stone at under half a hundredweight, and eight "
    "cables, four for the bow anchors and four to moor her stern to the shore; "
    "no winding machine is among the equipment. The machines of her era stood "
    "ashore: Herodotus watched the Hellespont bridge cables tautened from the "
    "land with wooden windlasses in this hull's own year, and Delos charged "
    "ships dues for the use of the harbour windlass. Two hundred hands worked "
    "her light anchors by direct pull (inference)"
]

PROV = (
    "JUDGED SILENT, r179 — the windlass question for this hull, the last of the "
    "r172 line, closes with nothing drawn, and on a third shape of silence: not "
    "r176's inference stack over a later-era machine, not r178's tradition with "
    "nothing to extend, but a complete inventory that omits the machine. The "
    "Athenian navy kept stone-cut inventories of its dockyards — the fullest "
    "gear record of any ancient ship class — and the lists of entire equipment "
    "(entele skeue) supplied to three- and four-banked ships from 330/329 BC "
    "enumerate everything aboard: two iron anchors per warship (CIA II "
    "807/808/809/811, 'ankyras sideras dyo' in every case), eight cables in two "
    "recorded sizes, four for the bow anchors and four shore-cables (epigya) "
    "that moored her stern to the beach (Torr, Ancient Ships 1894, notes 161 "
    "and 166, the inscriptions quoted verbatim), the hypozomata among the "
    "hanging gear, oars, rudders, ladders, poles, masts, yards, sails, screens "
    "— and no windlass, winch or capstan anywhere. The inventory even weighs "
    "the anchors: CIA II 807 col. b (329 BC) records iron anchors at a stated "
    "weight of twenty-odd mnas — under half a hundredweight in Torr's reading "
    "of the damaged numeral, named as his. Torr's whole book, downloaded in "
    "r177 and grepped again this round, has one windlass sentence (p. 95), and "
    "it is the sail-tackle of the big Roman merchantmen — the corbita's own "
    "r177 evidence. The Greek word for the shipboard machine, stropheion, "
    "boards a ship exactly once in the record, on Lucian's Isis (Nav. 5, c. AD "
    "165, the corbita's r177 warrant, six centuries after this hull's drawn "
    "year); its classical-era epigraphic use is the Delian harbour accounts "
    "(IG XI(2).138 B 8, iv/iii BC; LSJ s.v.), where stropheia are dues ships "
    "paid for the USE of a windlass — the machine stood on the quay. And "
    "Herodotus' own word for it, onos, appears in this hull's own drawn year: "
    "the Hellespont bridge cables of 480 BC, laid over pontoon triremes, were "
    "made taut from the land — ek ges — with wooden windlasses, onoisi "
    "xylinoisi (Hdt. 7.36.3, fetched verbatim in Greek and English; LSJ's other "
    "windlass citations are a bone-setting frame and the Mechanics, none "
    "shipboard). Her world knew the machine; its place was the shore, and "
    "aboard her it had no work: anchors of under ~25 kg, some 200 hands, a "
    "47 t hull moored stern-to with her own listed shore-cables and hauled out "
    "on the ship-sheds' slipways — she was the thing the shore's machines and "
    "men hauled. r177 drew the corbita's windlass because her ship's own gear "
    "list names one; this hull's own gear lists, far fuller than Lucian's "
    "sentence, omit it — the same class of source, obeyed both ways. Stated: "
    "the entire-gear lists are the 4th-century navy's, some 150 years after "
    "the drawn year (-480); they are the class's fullest record at any date "
    "and the 5th-century evidence points the same way, but the gap is named. "
    "Scope: the judgment is for the classical trireme as her navy inventoried "
    "her; the giant polyremes of the Hellenistic age are different ships, and "
    "their gear (Moschion's forty carried twelve anchors) is not read backward "
    "here. That the crew worked anchors and hypozomata by direct pull is an "
    "inference, marked as one on the card. Named as not fetched: Morrison, "
    "Coates & Rankov's The Athenian Trireme and Rankov's Olympias Final Report "
    "(both gated; both already this card's cited hull sources), and the IG II2 "
    "stones beyond Torr's transcriptions (PHI search script-gated, Attic "
    "Inscriptions Online HTTP 500 for IG II2 1604) — any of them, fetched and "
    "attesting a shipboard winding machine on a trireme, reopens the question."
)

d = json.load(open(P, encoding='utf-8'))
vs = d['vessels']
t = next(v for v in vs if v['id'] == 'trireme')

assert t['rows'][-1][0] == 'Steering, as drawn', t['rows'][-1][0]
assert 'windlass' not in t['hull'], 'hull.windlass must stay absent'
assert '*' not in ROW[0] + ROW[1], 'no markdown in a Shipwright row (r178 class)'

if t['rows'][-1][0] == 'Windlass, judged':
    sys.exit('already applied')
t['rows'].append(ROW)
t['hull']['windlassProvenance'] = PROV

open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1))
print('applied: row + windlassProvenance on trireme; rows now', len(t['rows']))
