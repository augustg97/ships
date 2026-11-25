import json, sys
P = sys.argv[1]
v = json.load(open(P))
PLATE = "build/staging/r320/dl/vasa-rig.jpg (1920 px thumbnail of Commons File:Vasa_rig_diagram.jpg, Hocker 2023 p. 31)"
READ = {
  0: dict(name='fore', foot=1005, top=683, yard=742.5, yrows='737-747', cols=[[1100, 1200]], plat='675-690',
          note="The fore course yard is drawn level."),
  1: dict(name='main', foot=1012, top=682, yard=752, yrows='747-757', cols=[[600, 700]], plat='672-690',
          note="The main course yard is drawn cocked, its fore yardarm higher than its after one; the row is where its centre line crosses the mast's raked axis, and the model hangs the yard level at that height."),
}
SRC = "Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), p. 31, the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg, about 23.7 px/m)"
n = 0
for vs in v['vessels']:
    if vs['id'] not in ('east-indiaman', 'slave-ship'): continue
    date = '1620' if vs['id'] == 'east-indiaman' else '1590'
    for mi, r in READ.items():
        mk = vs['hull']['masts'][mi]
        assert mk['courseAtProvenance'].startswith('UNREAD'), (vs['id'], mi)
        span = r['foot'] - r['top']
        share = round((r['foot'] - r['yard']) / span, 3)
        mk['courseRead'] = {"ofDeckToTop": share, "boundPm": 0.03,
            "rows": {"deckRail": r['foot'], "deckHidden": r['foot'], "top": r['top'], "yard": r['yard']},
            "plate": PLATE, "cols": r['cols'], "topAtOfLower": 0.9, "spanPx": span}
        mk['courseAtProvenance'] = (
            f"PLATE READ, r323 (0y¹⁶⁵): the {r['name']} course yard hangs at {share} of the height from the deck to the {r['name']} top, "
            f"read off {SRC}, on the {r['name']} mast's own column: the mast meets the hull at row {r['foot']}, the top is centred on row {r['top']} "
            f"(its platform {r['plat']}) and the course yard crosses the mast at rows {r['yrows']}, centre {r['yard']}. {r['note']} "
            f"The deck-to-top span is {span} px, so a 3 px reading error is {3/span:.3f} of it. The drawing gives the hull as a silhouette and draws no deck at the mast, "
            f"so both deck datums are the row where the mast meets the hull, and the bound is 0.03. Until r323 this course hung at the class 0.60 of the lower mast, "
            f"0.667 of the deck-to-top height, which no plate set. This hull is dated {date}; the read is Vasa's, applied to it.")
        n += 1
        print(vs['id'], r['name'], share)
assert n == 4
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
