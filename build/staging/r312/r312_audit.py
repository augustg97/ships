import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)
rep("""            if (!mk.furlStowProvenance) say(v.id, 'a furl stowage with no provenance', `${at}: furlStow '${mk.furlStow}', furlStowProvenance absent`);""",
"""            if (!mk.furlStowProvenance) say(v.id, 'a furl stowage with no provenance', `${at}: furlStow '${mk.furlStow}', furlStowProvenance absent`);
            /* r312: A-STOW-READ. r310 convicted a 'lowered' stowage over an UNREAD provenance and let a
               'brailed' one through; either value is a claim that a plate was read. */
            else if (mk.furlStow === 'brailed' && /^UNREAD/.test(mk.furlStowProvenance)) say(v.id, 'a brailed stowage with no read', `${at}: furlStow 'brailed', furlStowProvenance opens UNREAD`);""")
rep("""       Preussen and the steamer lowered their gaffs with nothing in the record to say whether a
       plate had been read for it. */""",
"""       Preussen and the steamer lowered their gaffs with nothing in the record to say whether a
       plate had been read for it.
       r312 (0y¹³⁸), A-STOW-READ: 'brailed' over a furlStowProvenance that opens UNREAD is convicted, as
       'lowered' was in r310. The 74's spanker is the first square mast to carry 'brailed', so the
       r308 rules (one boom, no roll on it, one bundle on the mast's after side between the deck
       and the jaws, the gaff above 20°) now run on a square mast as well as on Endurance's mizzen. */""")
open(P, 'w').write(s)
print('ok')
