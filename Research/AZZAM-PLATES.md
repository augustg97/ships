# Azzam — the plates, pinned (round 159)

The r143 standing residual "Azzam crest + boundary plate" has two halves, and both wait on
photographs. This note pins the photographs, states what each can and cannot resolve, and
records the one read that closes the crest half. Written 2026-08-25.

## The rule this note obeys

A derivation's provenance names the plate AND its scale in px/m (the r96 Azzam lesson: two
honest reads off two plates differed by a sixth of her length because neither carried its
own bound). An oblique aerial has no single px/m — where one is used below, the scale is
stated locally, at the surface being read, and only claims that scale can support are made.

## Plate 1 — the Cádiz broadside (the boundary-plate half's plate, found)

**File:** Wikimedia Commons `File:AzzamCadiz.jpg`, 3777 × 2464 px, Javier Virués Ortega,
CC BY-SA 4.0, taken 2020-08-24, Cádiz harbour. Direct:
https://upload.wikimedia.org/wikipedia/commons/3/3c/AzzamCadiz.jpg
Working copy: `build/staging/r159/AzzamCadiz.jpg` (committable, CC licence).

**What it is:** a clean in-service starboard broadside from near water level, the whole
ship in frame. Hull span ≈ 3060 px over her recorded 180.6 m LOA ≈ **17.0 px/m** —
nearly twice the 8.96 px/m of the r97 broadside every current house span is measured off.

**What it is for:** the hull-to-tier boundary. The r132 residue states her freeboard /
deck-count pair needs a plate resolving where the hull ends and the tiers begin, and her
forward superstructure is drawn stepped where the ship is one swept form. At 17 px/m a
metre of height is 17 px — enough to segment the most-forward and most-aft standing
column at every metre of height (the r76 method) and settle the boundary. **That
derivation is a round of its own and is NOT done in this note.** Anchors for whoever does
it: stem tip, transom corner, waterline; re-anchor exactly, do not inherit my ≈3060 px.

**Corroborating:** Commons `File:1343_Azzam.jpg`, 4745 × 2501 px, Gerd Fahrenhorst,
CC BY 3.0 / GFDL, 2013-07-26, Lürssen Bremen — port side, slightly elevated, ≈ 16.7 px/m.
Caution: fitting-out state, scaffolding amidships, five months before delivery. Working
copy `build/staging/r159/1343_Azzam.jpg`.

**Rejected:** Commons `File:El buque Azzam atracado en el Puerto de Vigo.jpg` — the quay
wall hides the hull to above the boundary in question; refit scaffolding on the house.

## Plate 2 — the delivery-trials aerial (the crest half's plate, found and read)

**File:** "Impressive 180m mega yacht AZZAM by Lurssen", © Klaus Jordan (Lürssen press,
2013 North Sea trials), served by CharterWorld at
https://www.charterworld.com/news/wp-content/uploads/2013/09/Impressive-180m-mega-yacht-AZZAM-by-Lurssen.jpg
(hotlink-blocked; retrieved 2026-08-25 via the Wayback Machine, `web/2016im_/` prefix, as
a 960 × 640 copy). **Not committed to this repository — press copyright.** Crops read and
then discarded; re-retrieve via the Wayback URL if the read is ever contested.

**What it is:** the only elevated view of her top decks found in two searches (Commons has
none; the charterworld "upview" original did not survive hotlink protection or the
archive). Oblique bow-quarter from a helicopter, whole ship in frame. Local scale at the
crest: the crest roof (~25 m of it) spans ~110 px ≈ **4.4 px/m**. That resolves a colour
FIELD metres wide; it does not resolve pedestal base-plate detail, and none is claimed.

**The read (closes the r108 crest question):**

1. **The crest top — the roof the radome cluster and mast stand on — is WHITE coated
   plate, not teak.** The white field runs unbroken around all the dome pedestals, the
   mast foot and the uptake casings. The r108 residual ("radome pedestals and cluster
   base plates sit on teak now — check the real ship's mast deck covering") is answered:
   the model's teak crest top is wrong.
2. **The teak is one level down and below:** the tier-roof terraces ringing the crest
   read tan (teak) with white margins, as the current `deck.roofs` extension draws them —
   the 2,200 m² builder figure lives on the terraces and the weather deck, and the plate
   confirms that inference everywhere EXCEPT the crest top.
3. **The foredeck is teak with the touch-and-go circle painted directly on it** (white
   ring, yellow-edged H), and the recessed mooring well forward of it is teak-floored.
   Consistent with the current weather-deck covering; no change needed.
4. **The uptakes are brushed steel, no band** — re-confirms the r97 broadside read
   against the old small-plate red-band derivation.

**The change this read requires** (staged r159, applied when the frame ratchet allows):
`deck.roofs` learns a third answer — `"terraces"`: the covering reaches the exposed tier
terraces but not the top tier's roof, which stays coated plate. Azzam's record moves from
`roofs: true` to `roofs: "terraces"` with this plate in the provenance. `true` (all
roofs; titanic, yamato, great-eastern) and `false` (weather deck only; queen-mary-2)
keep their exact meanings — the new word changes one mesh on one ship.

## What still waits

- The **boundary-plate derivation** itself (freeboard/deck-count, the swept bow form) off
  the Cádiz 17 px/m broadside — a measuring round: segment both extremes at every metre
  of height, then re-derive `houseAt`/`tierAftU`/`freeboard` where the plate disagrees.
- A **true overhead** of the crest would upgrade read #1 from a colour field to geometry;
  none exists in any archive searched. The claim stands on the field read at its stated
  scale.
