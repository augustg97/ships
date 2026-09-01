# r185 — The treasure-ship's stern pair: the poop top asked, then the anchors laid on it

## The question

The r184 queue head: the stern pair (梢用二枝 — "the stern works two"), stations
RECORDED in the same 舟車 sentence as the bow-worked three drawn r184, NOT drawn
because the stow surface was unresolved: does the drawn two-tier poop
(u 0.66–0.985) carry a walkable deck at its own height? r184's budget could not
pay for that measurement; this round pays it first.

## What the app already holds

- The record (r174/r184, local): one grain-ship carries five or six iron anchors
  (五、六錨); 其餘頭用兩枝，梢用二枝 — of the rest, the head works two, the
  stern works two. The 器具皆同 join carries the set to the zheyang sea carrier;
  fleet-class extension to this hull, the ~200-year gap named (r174, r184).
- The stern pair's WEIGHT is not recorded (其餘 — "the rest"): the r184 class
  default stands, 300 catties at the 錘鍛 text's own anvil threshold,
  scale 0.84 → shank 2.0 m — the same standing as the head pair, INFERENCE.
- The stern BELAY is not recorded. The 將軍柱 sentence names the bow posts; no
  text names a stern belay. The fleet has one precedent for exactly this
  standing: the Belitung grapnel (r182) — cable bent to the head, THE REST
  FLAKED IN A COIL BESIDE IT (hull.js:4347). A stow, not an invented lead.
- The drawn poop (buildJunkCastle): two tiers, walls lofted off the hull's own
  surface, tier 0 u 0.66–0.985 inset 0.54 m, tier 1 u 0.69–0.973 inset 1.53 m,
  each tier dh = B·0.115 = 2.07 m of headroom, each roof a lofted surface
  carried B·0.045 = 0.81 m out past its walls.
- The app's OWN precedent for what counts as the aft working deck: the junk
  after-sheets land ON the castle top — hull.js:2556 "the crowfoot lands on the
  castle roof where there is one — the after sheets of a junk really were
  worked from the poop deck, not led down through it." The top tier roof is
  already the drawn ship's aft working surface.

## The measurement (poop_map.py — numbers below filled from the run)

Ray grid straight down over u 0.64–1.00 × z −9..+9 m, first hit and its part
key at each station; plus the mizzen sheet/yard boxes for clearance.

RESULT (poop_map.json, run on the unedited tree after the opening 64 passed):

- The TOP TIER ROOF is a continuous surface from u 0.68 to 1.00 with no holes:
  first hit at every station, 9.67 m (u 0.68) → 10.52 m (u 1.00) above WL,
  rising with the sheer. That is sheer(u) + B·0.115·(tiers + 0.02) =
  sheer + 4.18 m — the drawn formula, confirmed by ray.
- Width at the stern stations: z −5..+5 at u 0.90–0.98 (~11 m). The tier-0
  roof reads one step down (7.58–8.46 m, dh = 2.07 m lower) as a ~1 m
  outboard gallery each side — too narrow for a 2 m anchor's splayed claws.
- Clearance at the candidate stow (u 0.91–0.95, z ±2.4): nothing between the
  roof and 12 m. The set sails' sheets live starboard of z 3.61 (the TRIM
  swing) and 6+ m above the roof; yards 16+ m up. Port side wholly clean.
- The walls are lofted off the hull's own half-breadth (tier-1 wall at
  z ≈ ±5.4 at u 0.92), so a stow at z ±2.4 rests its whole footprint
  (±~0.9 m athwart) over structure, not over the eave overhang.

## Judgment

DRAWN — the stern pair (梢用二枝) stowed on the poop's TOP TIER ROOF at
u 0.91, z ±2.4, the r182/r183/r184 stow (spun 45°, pitched to the surface's
own measured gradient — 0.054 here — settled by measured box).

Why this surface and not another:
1. It is the drawn ship's own aft working deck ALREADY: the junk after-sheets
   land on it (hull.js:2556 — "the after sheets of a junk really were worked
   from the poop deck, not led down through it"). The stern anchors join gear
   that is already worked there.
2. The measurement above: continuous, wide, clear, and the only aft surface
   that can carry a 2 m anchor (the tier-0 gallery is ~1 m; the weather deck
   aft of the castle is 0.9 m of planking at u > 0.985).
3. The record attests the STATION (the stern works two), not a surface; the
   drawn ship's aft surface is the poop top, so that is where its stern
   anchors are worked from. PLACEMENT INFERENCE, named in the provenance.

The stern BELAY is in no text (the 將軍柱 sentence names the bow posts). Each
cable is drawn bent to its ring and FLAKED IN A COIL beside it — the r182
grapnel standing: a stow, not an invented lead. The coil is built from
ropeMesh segments, not a torus, so V-COUNT's ring-torus signature stays
unique to head rings.

Weight/dimensions: NOT RECORDED for the stern pair (其餘 — "the rest").
The r184 head-pair standing carries over unchanged: 300 catties at the 錘鍛
text's own anvil threshold, scale 0.84 → shank 2.0 m, INFERENCE, named. A
measured surviving 四爪錨 replaces it and the provenance says so.

## The class, not the instance

- `stow()` gains a surface argument; the stern block passes the poop-top
  function. Any junk-castled hull whose record stows a stern pair draws it
  from its own record; silence draws nothing (opt-in via sternAtU).
- V-REST rewritten to ASK THE SURFACE ITSELF: ray straight down from over
  each assembly, first non-anchor hit is the surface it must rest on —
  sheer-only V-REST would convict any poop-stowed anchor as floating, and
  could never see a missing roof. V-COUNT/V-CLAWS/V-SHANK/V-CABLE extended
  to the stern members (want 3 → 5 when the record stows them).
- Proofs before trust: inj-ia-float.js (aftmost assembly +0.60 m → exactly
  one conviction, surface-asked V-REST); inj-ia-missing.js (one stern
  assembly removed → exactly two, V-COUNT 4≠5 and V-CLAWS 16≠20).

## The look, and what occluded it

Dark iron on a dark roof needed its occluders NAMED before a frame showed it:
a camera raycast (the r183 method) found the mizzen's furled bundle between
camera and both anchors from the elevated abeam bearings, and from low
bearings the roof's own near edge hides everything on it. A 16-column ray
test over the starboard anchor's footprint proved the bundle passes 2.3 m
ABOVE the stow (crossers at 13.2–13.9 m against the anchor top at 10.87) and
the r184 halyard AABB clash was the fat-box artifact of a masthead-to-deck
rope. The settled b/z/l/y camera (z applies AFTER the open — probing at
400 ms photographs a different camera than 2000 ms) shows the port member
whole at b=180 z=0.35 l=6 y=10 furled: z-stern-final-crop.png — the four-claw
X on the roof, two claws up catching the light, beside the mizzen. The card
broadside and the aboard-treasure frame both show the pair on the castle top.
