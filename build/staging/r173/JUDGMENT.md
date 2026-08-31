# r173 — The cog's windlass: the machine the wreck attests, in the place the wreck attests

## The question

r172 removed the Georgian bar capstan from eight hulls whose records were silent, and named
residual (1): "the windlass — the eight hulls that lost the capstan attest OTHER gear (Bremen
cog's windlass physically recovered ...) and draw nothing; each needs its judgment and its
machine." This round opens the queue head for ONE hull — the cog — because its machine is the
best-attested in the whole residual: the type ship herself, reconstructed timber by timber in
a museum, carries it, and three 1:1 replicas built to the museum's own plans work it at sea.
The other seven hulls stay silent; each still needs its own judgment (see residuals).

## The sources, fetched this round

1. **Ellmers, Detlev — "The Hanseatic Cog of Bremen AD 1380"** (Drassana, Museu Marítim de
   Barcelona; saved as `ellmers-drassana.md`). Ellmers was the Deutsches Schiffahrtsmuseum's
   first director and led the cog research programme. Two sentences carry the judgment:
   - "The upper gallery allows to look from above onto the deck and the aftcastle **with a
     windlass in its middle and a capstan on its top**."
   - "when the man at the tiller had to stand **underneath the castle-deck** in between the
     long cabins at both sides and **behind the heavy windlass**, he could no longer look
     around the sea nor could he even see his own sail."
   So on the reconstructed ship (Lahn 1992 is the published documentation): the windlass lies
   ATHWARTSHIPS UNDER THE AFTCASTLE DECK, forward of the helmsman's station at the tiller, in
   the middle of the castle's run — and a capstan (a separate machine) stands on the castle
   top. TEXT reads, no plate scale applies.

2. **The Kiel replica build record** (Baykowski, *Die Kieler Hansekogge*, Kiel 1991, via the
   German Wikipedia article on the Bremer Kogge, saved as `dewiki-bremer-kogge.md`): the
   Hansekogge was built to the DSM's plans under Germanischer Lloyd survey, and by the end of
   1987 the yard had finished "das Ruder, die Malle aus Fichtenholz, den **Gangspill** sowie
   den **4,5 Meter langen und 60 Zentimeter starken Bratspill**" — the rudder, the moulds,
   the capstan, and the WINDLASS, 4.5 m long and 60 cm thick. That is the dimension pair this
   record promotes: barrel 4.5 × 0.60 m. A build-record number, not a plate read.

3. **Falconer 1769, WINDLASS** (from `../r172/falconer.txt`, Gutenberg #57705): the generic
   mechanism, used ONLY for class-default working geometry, named as such — "a large
   cylindrical piece of timber ... supported at the two ends by two frames of wood ... turned
   about ... by levers called handspecs, which are for this purpose thrust into **holes bored
   through the body** of the machine. ... The **lower part of the windlass is usually about a
   foot above the deck**." Falconer's position ("near the fore-mast") is 18th-century English
   merchant practice and does NOT transfer — the cog's own record (Ellmers) puts her windlass
   AFT, and the record beats the class default.

## The warrant

The cog's record now attests a windlass: type-ship reconstruction (Lahn 1992, per Ellmers),
dimensions from the replica build record (Baykowski 1991), position from Ellmers. The other
seven r172 hulls remain silent — no source fetched names their machines with numbers — so
they continue to draw nothing (rule 10).

## The numbers

| quantity | value | status |
|---|---|---|
| barrel length | 4.50 m | RECORD — Kiel replica build record (Baykowski 1991) |
| barrel diameter | 0.60 m | RECORD — same |
| station | u 0.82 | READ of Ellmers: under the castle deck, middle of the aftcastle's run, forward of the helm. The drawn sternpost stands at u 0.90–1.0; the castle span (not yet drawn — residual) is the aft quarter, u ≈ 0.75–1.0; its middle ≈ 0.85, eased forward to 0.82 to clear the helmsman who stands BEHIND the machine. TEXT read — no plate, so precision is ±0.04 u |
| barrel underside over deck | 0.30 m | CLASS DEFAULT — Falconer's "about a foot", named cross-tradition |
| axis height over deck | 0.30 + D/2 = 0.60 m | derived; clamped [0.45, 0.90] — a man levers a handspike at thigh-to-waist height, so the machine is sized to the men (the r172 stature principle, horizontal) |
| barrel form | eight-square (octagonal prism) | CLASS DEFAULT — a barrel worked from an oak baulk is left eight-square where the handspike holes are bored; flat-shaded 8-gon, stated as default, no plate read claims finer |
| supports | two timber standards, one each end | Falconer's "two frames of wood"; form is a plain standard, class default |
| handspikes | two, shipped in through-holes | Falconer: holes "bored through the body"; two spikes drawn shipped so the mechanism is legible (the Bellona precedent — bars shipped) |

## What is NOT drawn, and why — the named omissions

- **The pawls.** Falconer's pawls are the 18th-century machine's. No medieval source in hand
  puts a pawl on the 1380 windlass. Silence draws nothing.
- **The Gangspill** — the cog's own capstan, on the aftcastle top (Ellmers; the Kiel build
  record lists it beside the Bratspill). It is REAL and attested, and it is NOT the Georgian
  machine r172 deleted (right deletion, wrong-form machine amidships at u 0.62). Drawing it
  properly needs the medieval Spill's form and the castle top to stand on → residual.
- **The aftcastle itself.** The drawn cog has no castles at all, though the Stralsund-seal
  silhouette and the wreck both carry them. The windlass therefore stands visible on the
  open afterdeck this round — in its attested place; the deck above it is owed. → residual
  (large: fore + aft castles, the type's defining profile).
- **Whether the ORIGINAL barrel was among the >2,000 recovered pieces** — the sources fetched
  this round do not say. The provenance claims the reconstruction and the replicas, not the
  find inventory. If Lahn 1992's parts catalogue is ever fetched whole, this can be settled.

## The audit rule (r173), designed before the edit

Parts identified structurally (a long horizontal prism low over the deck, two standards, no
disc head), sim-proven in `sim.py` on the cog's real numbers before any web/ edit:

- **V-WARRANT** — a windlass assembly drawn on a hull whose record is silent convicts.
- **V-AXIS** — the barrel's long axis must be HORIZONTAL and ATHWARTSHIPS (|axis·ŷ| < 0.1,
  |axis·ẑ| > 0.95 in hull frame). A vertical barrel is a capstan wearing the wrong name.
- **V-SPAN** — barrel length within 12% of the record's barrelLenM, AND ≤ 0.95 of the local
  deck breadth at its station (a barrel through the planking convicts).
- **V-DIA** — barrel diameter within 15% of the record's barrelDiaM.
- **V-BREAST** (record-blind) — axis height over the deck under the machine in [0.45, 0.90] m:
  the handspike is levered by a standing man; no record value can push the work out of his
  reach. Convicts the faithful builder under a dragged record.

Injections, in-page, no file touched: (a) `inj-windlass-sever.js` — builder ignoring the
record draws the barrel VERTICAL on the cog and draws windlasses on three record-less hulls →
expected: cog convicts V-AXIS, the three convict V-WARRANT, all others silent;
(b) `inj-windlass-drag.js` — record's barrelDiaM dragged 0.60 → 1.60 under the FAITHFUL
builder → axis rises to 0.30 + 0.80 = 1.10 m → only record-blind V-BREAST convicts, exactly
the cog.
