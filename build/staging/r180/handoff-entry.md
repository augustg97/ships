## Round 180 — 2026-08-31 — the panels spend their own markdown: the r178 raw-asterisk class closes

**Residual 2 (r178) taken as the queue head and closed at the class level, per rule 2:
the Shipwright's rows and cite printed their markdown as punctuation —
*Nature* as five characters — because shipwright.js concatenated r[0]/r[1] raw
and set the cite with textContent, while app.js cRows already spent r[1]
through inlineMD. The fix is every render site of the class, not the named
line: swRows now runs inlineMD on BOTH cells (they were raw AND unescaped —
the fix also closes an escaping hole), swCite renders inlineMD as innerHTML
(inlineMD escapes before emphasising, so innerHTML carries no more trust than
textContent did); app.js cRows spends the KEY as well (ten vessels title their
keys — "The grain ship *Isis*"); cCite same as swCite; metricRow's provenance
cite goes through inlineMD (metric cites carry no star today — the guard for
the copy written next, measured before wiring). pc-rows (the passage slip) and
btText (the action day narrative) were checked and are NOT members: generated
literals and starless day texts respectively.**

**Measured before the fix: cite carries markdown on 28 of 33 vessels, rows on 17,
row KEYS on 10; voyages 61 cites, battles 8, chapters 6, ports 5. One member
deliberately NOT fixed, named per rule 5: the Santa Cruz voyage's NAME carries
markdown ("the *Santiago* wrecked") and name is a title slot (textContent in
the hover and slip, raw innerHTML in the voyage list) — the fix is the datum,
but the phase is a hash of v.name (app.js:2825, the r54 identity-keying), so
the rename moves her frozen position along her route: staged, seen, REVERTED.
Owed its own round with a frame check on her era's committed frames.**

**New audit rule, per the method: 'an asterisk the renderer cannot spend' —
sweeps rows/cite/text of all five card collections (vessels, voyages, chapters,
battles, ports) for stars the bold-then-italic pass cannot consume; a star that
survives the pass prints as itself, which is the r178 kalba fault as data.
0 convictions on today's data (measured in python first, then live).**
