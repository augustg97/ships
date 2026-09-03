## Round 213 — 2026-09-03 — the cog's rudder hangs on the post the irons clasp: the wreck's own gudgeon and Lahn's elevation, and the whole timber class built with it

**Queue check first: August's second list stands WORKED IN FULL (r57). r212's residual 2 was
the head task — r173's cog rudder slab — and it is DONE at the class level: every stern-hung
timber rudder in the fleet (thirteen hulls) is now BUILT down its sternpost's own line, and
the cog carries her own record (build/staging/r213/JUDGMENT.md).**

**What the first capture showed (rule 1 before anything else; r213/sw-cog-before-pq.png,
r173's z-cog-starboard-crop.png re-read).** One tan rectangle standing past the stern: no
irons, no seams, no tiller. Measured (measure_ship): its leading edge at u 1.000 — the after
end of the WATERLINE — while the Sternpost runs u 0.895–1.070. The plate was sampled at
`surfacePoint(1.0, 0)`; the post is lofted from u 0.90 at the keel to 1.0 at the sheer. Two
metres of open water between the blade and the post's heel on the cog, on every hull with a
raked stern, hidden under the sea in every frame the ratchet owns.**

**The record, and it is the wreck's own iron.** r212 left the DSM series "Bremer Kogge" (21
objects) as one fetch; object 22 is a RUDERÖSE, Inv. I/10393/08 (r213/ruderoese-dsm.jpg,
CC BY-NC-SA): iron, L×B×H 35 × 30 × 13 cm, a short tube with a massive clamp forged to it
whose rectangular plates clasp the sternpost; "um das Ruder zu fixieren wurden 4 Ösen
benötigt"; the blade must have carried downward pintles. Ellmers (r173): the two upper ones
were never nailed on — she sank with the rudder not yet hung, so the BLADE is not a find.
Its form is Lahn's Blatt 9 elevation at 1:20, reproduced as Tanner & Belasus 2021 fig. 1
(Archaeonautica 21, CC BY; r213/archaeonautica-img-1.jpg, 2 m bars → 60 px/m, stern crop
r213/crop-lahn-stern.png): a narrow blade parallel to the raked post from heel to the
castle's after beam, four hangings ticked along it, the head past the top strake, the tiller
level forward under the castle deck. Chords READ at 60 px/m: 0.60 m foot, 0.45 m head,
±0.15. The replicas agree in proportion (Roland von Bremen, r213/crop-roland-stern.png).
The Bratspill is NOT in the DSM series — r173's question closes the other way: the windlass
stays the reconstruction's, not the find inventory's.**

**The change (web/js/hull.js `buildTimberRudder`, called for `steer === 'stern'` ahead of
the plate; before-copy r213/hull.before.js). Record on the cog: `rudder: {chordFootM 0.60,
chordHeadM 0.45, hangings 4, tillerAtU 0.85}` + rudderProvenance (web/data/vessels.json)
naming which numbers are the museum's, which are plate reads at 60 px/m, which are text
reads, which are class defaults. Built, in hull space, from the post's OWN samples one
moulding abaft its after face: the stock (¾ of the post's siding) and back pieces with 12 mm
seams, the after edge parallel to the post and the foot cut level; iron straps across both
faces at each hanging (full chord before 1500, two thirds after), a pintle knuckle at the
leading edge, the gudgeon's two clamp plates on the post beside it (35 cm — the recovered
iron's own length); on the cog the stock rises to the tiller 0.55 m under the castle deck
and a tapered tiller runs level forward to u 0.85, the man Ellmers puts behind the windlass.
Class defaults for the other twelve: the old plate's own chord (5.5% lwl, head 55% of it),
hangings by century (4 / 5 / 6), spaced by height, one per 0.55 m of blade at most. Steel
foils and the junk's median rudder untouched. PARTS.rudder card rewritten round the gudgeon.**

**Measured (measure_ship, cog): rudder-stock u 0.907–1.140, y −1.87..3.98; rudder-gudgeon
u 0.893–1.042 (on the post's run), y −1.80..1.96; rudder-tiller 5.37 m, y 3.76–3.89, hand
end u 0.870; Sternpost u 0.895–1.070 for comparison. Model extent grows +1.65 m over the
record LOA: the head continues the post's rake above the sheer, as Lahn draws it — the
record's 23.3 is stem to sternpost.**

**The audit rule (Research/audit-hulls.js, THE TIMBER RUDDER HANGS ON THE POST, synced to
web/ and docs/), every part read from vertices in hull space: R-STOCK (the stock's leading
edge against the Sternpost's after face, the post interpolated at the stock's own
centimetre of height — a 0.3 m band convicted eleven faithful raked posts in the first
draft, rule 8 again); R-IRONS (the record's count where given, else ≥ 3; one pintle and two
clamp plates per strap; each on the blade; record-blind: none closer than 0.5 m); R-TILLER,
record-gated on the castle (exists, level, head end at the stock's top, hand end under the
castle's run and at the record's station ±0.12 u, record-blind stature off the castle-deck
planks: 0.8–1.7 m over the afterdeck, ≥ 0.2 m under the deck); R-CHORD (the foot chord
within 30% of the record's). Two builder drafts convicted by the audit before this one: the
perpendicular chord that put the galley's after corner 1.3 m under her keel, and irons
spaced in the post's parameter that bunched four into 1.2 m on the caravel.**

**Proven to fire (r213/inject-a.json, inject-b.json).** inject-a severs the builder after the
build — irons and tiller stripped, blade shoved 1.0 m aft: 13 hulls × ("a rudder hung off its
post" + "a rudder with no irons"), the cog alone a third time ("a castle with no tiller under
it"); no steel, junk, quarter or paddled hull moved. inject-b drags the cog's record to
hangings 12 and tillerAtU 0.60 under the faithful builder: the cog alone, "irons closer than a
hand span" ×11 and "a tiller whose hand end is not under the castle" ×1, the count and
station arms silent as they must be. Clean tree 33/0 (r213/audit.out).

**Witnessed (rule 1): r213/rudder-pq2.png (Shipwright, port quarter, bare) — the blade lying
on the raked post with the strap at the sheer-level hanging, the head rising past the top
strake to the castle's after corner; r213/rudder-astern.png — the narrow blade down the
centreline with its strap, where the before-capture showed a pole-wide slab.**
