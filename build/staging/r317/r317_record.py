import json, sys
p = sys.argv[1]
raw = open(p, encoding='utf8').read()
D = json.loads(raw)
W = ("Waters, D. W., The Art of Navigation in England in Elizabethan and Early Stuart Times (London, 1958), "
     "ch. I: 'The larger vessels were square-rigged only, or \"cross-sailed\" as it was termed, with three masts and a "
     "bowsprit. The fore and main masts each carried a course and a top-sail, the bow-sprit a sprit-sail; all these were "
     "\"cross-sails\"; the mizzen mast carried a lateen-sail. This rig remained typical of merchant ships well into the "
     "eighteenth' century (archive.org in.ernet.dli.2015.51856, full text). Falconer 1769, MIZEN, still describes the "
     "mizzen as 'extended sometimes by a gaff, and sometimes by a yard which crosses the mast obliquely'.")
TXT = {
 'east-indiaman': ("CLASS, r317 (0y¹⁵²): the mizzen sets a lateen under its topsail, from a yard slung "
   "to the lower mast. This hull is dated 1620; no plate of its mizzen has been read. Class source: " + W +
   " The yard's length (1.15 of the lower mast), its angle (56° from the horizontal) and its sling a third of its "
   "length from the heel are the builder's mixed-hull lateen mizzen, the same figures the carrack and the fluyt take, "
   "read from no plate of this hull."),
 'slave-ship': ("CLASS, r317 (0y¹⁵²): the mizzen sets a lateen under its topsail, from a yard slung "
   "to the lower mast. This hull is dated 1590; no plate of its mizzen has been read. Class source: " + W +
   " The yard's length (1.15 of the lower mast), its angle (56° from the horizontal) and its sling a third of its "
   "length from the heel are the builder's mixed-hull lateen mizzen, the same figures the carrack and the fluyt take, "
   "read from no plate of this hull."),
}
n = 0
for v in D['vessels']:
    if v['id'] in TXT:
        mk = v['hull']['masts'][-1]
        assert mk['rig'] == 'square' and mk['at'] == 0.85 and 'spanker' not in mk
        mk['lateenMizzen'] = True
        mk['mizzenSailProvenance'] = TXT[v['id']]
        n += 1
    elif v['id'] in ('ship-of-the-line', 'clipper', 'preussen'):
        mk = v['hull']['masts'][-1]
        assert mk.get('spanker') is True
assert n == 2
open(p, 'w', encoding='utf8').write(json.dumps(D, indent=2, ensure_ascii=False) + '\n')
print('ok', n)
