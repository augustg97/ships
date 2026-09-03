# r213 — The cog's rudder: hung on the post the irons clasp, from the wreck's own gudgeon and Lahn's elevation

## The question

r173 saw it and did not open it: "the cog's rudder reads as a pale untextured slab below the
sternpost in profile." r212 named it the head task. The first capture of this round (the
Shipwright from the port quarter, sw-cog-before-pq.png) showed the slab whole: one tan
rectangle standing past the stern, no irons, no seams, no tiller, and — measured — its
leading edge at the after end of the WATERLINE (u 1.00) while the sternpost it hangs on runs
from u 0.90 at the keel to u 1.07 at the sheer. Two metres of water between the blade and the
post's heel, hidden under the sea in every frame.

## The sources

1. **DSM, museum-digital:bremen object 22, Inv. I/10393/08 — "Ruderöse"** (the series
   "Bremer Kogge", 21 objects, fetched whole; r212's own residual). One of two rudder
   gudgeons found with the wreck: iron, **L×B×H 35 × 30 × 13 cm**, "ein kurzes Rohr, an das
   eine massive Klammer angeschmiedet ist. Die rechteckigen Eisenplatten der Klammern
   umfassten den Achtersteven. Am Ruderblatt müssen abwärts gerichtete Zapfen vorhanden
   gewesen sein ... Um das Ruder zu fixieren wurden 4 Ösen benötigt." Photograph
   ruderoese-dsm.jpg (CC BY-NC-SA): the tube with two plates at a right angle, nail holes.
   RECORD: four hangings; gudgeon on the post, pintle on the blade; plate 35 cm.
2. **Ellmers** (r173/ellmers-drassana.md): the two upper gudgeons were never nailed on — she
   sank unfinished, the rudder not yet hung. So the BLADE is not among the finds.
3. **Lahn, Blatt 9 (elevation, 1:20) as Tanner & Belasus 2021 fig. 1**, Archaeonautica 21,
   CC BY (archaeonautica-img-1.jpg; 2 m scale bars → 60 px/m): the rudder drawn as a
   narrow blade parallel to the raked sternpost from the post's heel to the castle's after
   beam, four hangings ticked along it, the head past the top strake, the tiller level
   forward under the castle deck. READS at 60 px/m: foot chord 0.60 m, head chord 0.45 m,
   ±0.15 m.
4. **The replicas** (Roland von Bremen at the Schlachte, roland-ubena.jpg, crop; Ubena von
   Bremen at Kiel 2007): the head rising to just under the castle's stern beam, the blade
   on the raked post. Proportions only; no scale.
5. **Westphal, DAS LOGBUCH 27/1991 H.4 (the Kiel replica's build)**: the castle's plan
   dimensions — an after trapezoid 4.75 m long, 7.20 m forward and 6.50 m aft, two side
   parts 3.45 × 1.65 m; NOT applied this round, written to castleProvenance for the next.

## The judgment

A stern-hung timber rudder is a built thing on the post's own line, not a cut plate at the
waterline's end. The builder (`buildTimberRudder`) lofts it down the post's own
`surfacePoint` samples one thickness abaft the after face: a stock plus back pieces with
seams, iron straps across the blade at each hanging with a pintle knuckle at the leading
edge, the gudgeon's clamp plates on the post, and — where the record gives a castle — the
head to the castle's after beam and the level tiller forward to the helmsman. The class
(every 'stern' rudder on a timber build, thirteen hulls) takes the structure; the cog takes
her own numbers. The steel foil and the junk's median rudder are untouched.

## The numbers

| quantity | value | status |
|---|---|---|
| hangings | 4 | RECORD — the DSM's "4 Ösen benötigt" |
| gudgeon: tube + two clamp plates, 35 cm on the post | — | RECORD — the recovered iron |
| pintle down from the blade into the eye | — | RECORD — the museum's inference from the eye |
| blade on the post's after face, heel to castle beam | — | Lahn Blatt 9, read |
| foot chord / head chord | 0.60 / 0.45 m | READ off Lahn at 60 px/m, ±0.15 |
| tiller station | u 0.85 | TEXT read of Ellmers (behind the windlass at 0.82), ±0.04 |
| tiller height | castle deck underside − 0.55 m | CLASS DEFAULT (a standing man's hands) |
| stock siding ¾ of the post's; back pieces; strap breadth; knuckle | — | CLASS DEFAULTS, named in code |
| other hulls' chord 5.5% lwl, head 55% of it; hangings by century | — | CLASS DEFAULTS (the old plate's own numbers kept) |

## Two drafts convicted by the audit (rule 8)

- The back pieces' chord ran PERPENDICULAR to the post; on the galley's raked stern the
  after corner dropped 1.3 m below her keel ("hangs below the keel"). Lahn's after edge is
  parallel to the post with a level foot: the chord is horizontal now.
- The irons were spaced in the post's parameter f, which runs nearly level round the heel:
  four irons bunched into 1.2 m on the caravel. Spaced by height now, and a short blade
  carries fewer (one per 0.55 m, never under two).
- And the audit's own first draft compared post and stock inside a 0.3 m height band — on
  a raked post that is two different heights and it read gaps of −0.13..−0.50 m on eleven
  faithful hulls. It interpolates the post's after face at the stock's own heights now.

## Proof by injection

- inject-a (builder severed: irons and tiller stripped, blade shoved 1 m aft): 13 hulls ×
  ("a rudder hung off its post" + "a rudder with no irons") + the cog alone "a castle with
  no tiller under it". No steel, junk, quarter or paddled hull moved.
- inject-b (record dragged: hangings 12, tillerAtU 0.60 under the faithful builder): the
  cog alone, the record-blind arms only — see inject-b.json.
- Clean tree: 33 hulls, 0 problems.
