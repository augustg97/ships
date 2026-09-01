# r180 draft — the Shipwright rows spend their markdown (residual 2, r178)

Fix sites (the whole render-path class, rule 2):
- shipwright.js swRows: r[0] and r[1] now inlineMD (were raw string concat, unescaped)
- shipwright.js swCite: textContent → innerHTML = inlineMD
- app.js cRows: KEY r[0] now inlineMD (r[1] already was; ten vessels title their keys)
- app.js cCite: textContent → innerHTML = inlineMD
- app.js metricRow: pt.cite through inlineMD (metric cites carry no * today; the guard
  for the copy written next)

Data measured before the fix: cite with * on 28 of 33 vessels, rows with * on 17;
voyages 61 cites, battles 8, ports 5, chapters 6; row KEYS with * on 10 vessels,
2 voyages, 1 battle. pc-rows (passage slip) builds from generated literals — not a member.

NOT done, named: the Santa Cruz voyage NAME carries markdown ("the *Santiago* wrecked");
name is a title slot (textContent/raw in list button app.js:1464, hover, slip) so the fix
is the datum — but the phase is a hash of v.name (app.js:2825), so the rename moves her
frozen position along her route. Reverted after staging; owed its own examination.
New audit rule: 'an asterisk the renderer cannot spend' — sweeps rows/cite/text of all
five card collections (vessels, voyages, chapters, battles, ports) for stars the
bold-then-italic pass cannot consume. 0 convictions on today's data (checked in python
before wiring, then live in the audit: 33/0).

Solo pre-check: ship-junk 0.000% — swRows/swCite sit BELOW the panel fold in the
committed ship frames (the r179 trireme-row lesson generalises: the fold hides the
change from every ship-* baseline).

Timing: audit #1 33/0 at ~23:19. build_site stamp 1788243202. Full close 64-check
launched 23:14:49 (log build/staging/r180/ratchet-close.log), nothing ran beside it.

Baseline reads taken DURING the close check's run (local PNG reads, no chromium):
- globe-era-card baseline: the era card's visible rows (Uluburun cargo, Khufu ship,
  Construction, Principal trades) are plain text; the cite sits below the card's fold.
- action-salamis baseline: the day panel is narrative prose + generated labels — showCard
  is not open, no cite line in frame.
So the expected mover count is ZERO: every changed pixel lives below a panel fold or in
a panel no committed frame opens. The r179 note "as it has in every committed frame"
overstated visibility — the raw asterisks were visible in scrolled SHOTS, not in frames.

TODO after ratchet exit:
- classify every mover individually off _diff/ images; expected class: cite/row text
  re-rendered (asterisks spent as em/strong) on card-bearing frames only
  (globe-era-card, action-*, board-salamis candidates); any mover outside the class
  gets the stash test before any acceptance
- rule-1 look: scrolled panel shot of a shipwright card with markdown rows+cite
  (corbita: key "The grain ship *Isis*" + cite) AFTER ratchet exit
- audit #2 on final code
- FRAME-LOG acceptances, HANDOFF, commit, push, live stamp verify (expect 1788243202)
