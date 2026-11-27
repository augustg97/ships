P = '/Users/augustgweon/Ships/web/js/hull.js'
s = open(P).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:90]
    s = s.replace(old, new)
rep("""     is contested in the record's terms: her plates show her at anchor or at sea in halftone, and a ship of 1902 may
     have housed stockless bowers in hawse pipes. */
  if (S.build === 'frame' || S.iron) {""", """     is contested in the record's terms: her plates show her at anchor or at sea in halftone, and a ship of 1902 may
     have housed stockless bowers in hawse pipes.
     ⚠ AND SO DID AN ANCIENT ONE. Torr (Ancient Ships, 1894, pp. 69–74) has the anchors "suspended from the catheads a
     little way abaft of these hawse-holes", the bow's eyes "turned to account as hawse-holes for the anchor-cables".
     So the shell-built corbita is catted too, in timber, and every hull with a bowsprit now cats her bowers. */
  {""")
rep("""    const catMat = S.iron ? (mats.iron || mats.woodDark) : mats.woodDark;""",
    """    const catMat = S.iron ? (mats.iron || mats.woodDark) : mats.woodDark;
    /* the tierPortStations walk below asks a frame hull's ports; a shell or iron hull has none recorded */""")
rep("""    /* no cathead drawn (the shell-built corbita): stowed against the bow, centred as before. ⚠ It stands about
       0.5 m inside the bow; carried in HANDOFF.md (r367). */""",
"""    /* no cathead drawn: since r367 every hull with a bowsprit has one, so this is reached only when the stow cannot
       be solved (anchorStowOf returns null). The audit's A-ANCHOR-CLEAR judges whatever lands here. */""")
open(P, 'w').write(s)
A = '/Users/augustgweon/Ships/Research/audit-hulls.js'
a = open(A).read()
def repa(old, new):
    global a
    assert a.count(old) == 1, old[:80]
    a = a.replace(old, new)
repa("""       skin and below the sheer. Since r367 the iron steamer and Preussen are catted and judged here; the corbita, with
       no cathead, is not, and its anchor's stow is carried in HANDOFF.md. A forecastle island's shell is the side""",
"""       skin and below the sheer. Since r367 the rule judges EVERY anchored hull, catted or not: until r367 it judged only
       hulls with a cathead, so the three uncatted bowers (the corbita, Preussen, the steamer), which stood 0.4–0.7 m
       inside the bow, were outside it. A forecastle island's shell is the side""")
repa("""    if (part.cathead) {
      const HSa""", """    if (part.cathead || part.anchor) {
      const HSa""")
repa("""        if (inside) say(v.id, 'a catted anchor inside the bow',""", """        if (inside) say(v.id, 'an anchor inside the bow',""")
open(A, 'w').write(a)
print('ok')
