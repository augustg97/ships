# Myeongnyang — the record behind the campaign data (round 158)

The third staged campaign, the second galley action, and the first battle in this model whose
deciding weapon is the WATER: a reversing tidal race in a strait the raster itself pinches to
a few hundred metres. Both hulls have been live since r92/r94 (panokseon, sekibune), both with
oar floors in their polars (2.5 kn / 3.5 kn, derivations on the vessel cards), so the fleet
sails here through route.js's own polarSpeed with no new speed model. What this round adds
structurally is the STREAM: a campaign day may now carry `cs`/`ck` (set and rate of the tidal
stream), every unanchored hull advects with it, and a day may state `anc` — the record's own
fact that a fleet lay to its anchors. Everything below ties the staged data to its source.

## Sources read this round

**Yi Sun-sin, *Nanjung Ilgi*, entry for the 16th day of the 9th month (26 October 1597
Gregorian), as quoted in the English literature** (the diary is the one eyewitness account on
either side; page references are to the standard Korean editions cited by the English
Wikipedia article's footnotes, read this round):

- The scouts' report at first light, and the count: *"countless enemy ships … 133 attacking."*
- The flagship alone: *"My flagship was alone facing the enemy formation. Only my ship fired
  cannons and arrows. None of the other ships advanced, so I could not assure our outcome.
  All other officers were seeking to run, as they knew this battle was against a massive
  force. Ship commanded by Kim Ŏkch'u, the Officer of Jeolla Right province, was 1–2 majang
  away"* (a majang ≈ 390 m).
- The relief: first An Wi's ship, called up by flag and threatened with military law, then
  Kim Ŭngham's squadron; then the rest of the line.
- The turn: the tide shifted, the Japanese ships *"began to drift backwards and collide with
  each other"*; 31 ships rammed open in the counterattack. The drowned could not swim clear
  of the race.
- The evening: *"the tides were too strong, the wind blew against him"* — Yi withdrew
  north-west to Dangsa-do at nightfall rather than hold the strait.
- The famous memorial, written before the battle when the court ordered the navy disbanded:
  *"this subject still has twelve warships"* — the thirteenth joined later, which is the
  whole of the 12-versus-13 discrepancy on the card.

**The Tōdō clan record (Japanese side), via the same article's footnotes:** the ships at the
front of the Japanese formation were the middle-class **sekibune** — the larger atakebune
could not work the shallow, narrow strait. That sentence is why the staged Japanese fleet is
sekibune and not a mixed line: the record's own composition for the water that fought.

**Hawley, *The Imjin War*** (already the card's source): 133 warships engaged of ~330 hulls
total (the "333 ships" of the popular account conflates warships with ~200 support vessels);
more than 30 ships destroyed; Kurushima Michifusa commanded the vanguard and was killed — his
body was recognised in the water by Junsa, a Japanese defector aboard Yi's flagship, hauled
up and beheaded at the masthead. Tōdō Takatora was wounded. Korean losses: no ships; two
killed and three wounded aboard the flagship, at least eight drowned from An Wi's ship.

## The water, and what is modeled

| Quantity | Value | Standing |
|---|---|---|
| Strait width at the neck (Uldolmok) | 293 m surveyed | modern survey, on the card |
| Peak stream at the neck | ~10 kn (Turnbull) / 11.5 kn at springs (card) | modern measurement; the race is real and still drives a tidal power station |
| Reversal period | about every 3 hours | modern tidal record |
| Stream during the fight | favourable to the Japanese in the morning, reversed about midday | the sequence is the diary's; clock times are modern reconstruction, CONTESTED in detail |
| Wind | NOT recorded for the day, except the evening note — *"the wind blew against him"* on a north-west withdrawal | staged as light NW (w=315, f=2–3), an INFERENCE stated here; both fleets fought under oar and the polars' oar floors make the drawn speeds nearly wind-blind |
| The iron chain across the strait | absent from the diary; rejected by historians | promoted at the modern site; NOT staged |

The staged `ck` values are the stream in the FLEETS' OWN WATER — the basin just north of the
neck, which Yi chose *because* it is calmer than the race — not the neck's headline figure:
flood 2–3.5 kn building through the morning, slack ~0.5 at the turn, ebb 3–4 kn through the
counterattack. The neck's own 10-plus-knot race appears in the prose, where it belongs; no
staged hull rides it because no fleet fought inside the neck itself. With the sekibune's oar
floor at 3.5 kn and the panokseon's at 2.5, the staged ebb makes the record's own picture
emerge without authoring it: a Japanese hull pulling for the Korean line makes no ground over
it, and the fleet drifts stern-first back into the strait — while the anchored Korean line
(`anc: [0]`, the diary's "dropped anchor") holds position through the morning flood that no
2.5-kn oar floor could hold by pulling.

## Geography, off the raster's own coastline

The DEM patch (`data/terrain/myeongnyang.png`, bake documented in ASSETS.json) resolves the
strait: a continuous water channel from the sound south-east of the neck through Uldolmok to
the Usuyeong basin north-west of it, pinching to ~120–260 m against the surveyed 293 — the
south-west Korean coast's great tidal flats read as land in the raster, and the coastline is
the raster's own. Every campaign-day anchor and every probe below was picked BY PROBE off the
decoded raster (build/staging/r158/, pick script in the round's staging), each with a 3×3-cell
water clearance, not guessed from a map:

- **The fight's water** (Korean anchor, battle phases): 126.296 E, 34.582 N — the basin just
  north of the neck, off Usuyeong.
- **The neck** : 126.3039 E, 34.5711 N mid-channel — a water witness in the audit: if the
  raster ever closes the strait, the audit convicts before the render lies.
- **Byeokpajin roadstead** (Yi's anchorage in the weeks before): 126.3501 E, 34.545 N.
- **Eoranjin road** (the Japanese assembly): 126.4891 E, 34.4699 N.
- **Dangsa-do withdrawal water** (north-west): 126.1762 E, 34.6485 N.
- Land witnesses: the Jindo bank west of the neck (48 m), the Haenam bank east of it (36 m),
  the Jindo massif (332 m), the Haenam hills (30 m).

The staged axis of the stream through the fight's water is the channel's own: the neck bears
about 140° from the basin, so the flood sets ~320° (through the neck toward the anchored
line) and the ebb ~140° (back through the neck), read off the raster's channel spine.

## Fleets as staged

- **Korean fleet: 13 panokseon** — the record's own countable number, drawn at true scale in
  a single line abreast (`ranks`, front 800, rows 1) across the fight's water, anchored
  through the flood phases, bows held to the stream — which is toward the neck, which is
  toward the enemy: the anchor and the tide point the line without an authored facing.
  Furled: the battened lugs were struck for action; she fights under oar (same staging
  convention as the trireme and the galley, stated on their records).
- **Japanese fleet: 31 sekibune** — the sekibune by the Tōdō record's own composition; 31 is
  the diary's count of ships rammed open, which is also about what the strait could feed
  through at once — the prose carries the 133 warships astern of them. A deep column
  (`ranks`, front 240, rows 8): the strait forces the fleet through in groups, which the
  formation states by its shape.

## What is deliberately not staged

- No iron chain (not in the record).
- No atakebune (the Tōdō record keeps them out of the strait).
- The 32 Korean scouting/support craft in the rear (Yi's report; they "likely did not
  participate" — the popular "fishing boats dressed as warships" reading is not in the
  diary).
- Clock-times for the tide phases: the published reconstructions disagree in detail; the
  phases carry the diary's SEQUENCE (flood through the morning, turn about midday, ebb
  through the counterattack) and no o'clock.
