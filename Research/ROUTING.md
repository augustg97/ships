# Keeping ships off the land

Rewritten 2026-08-04, after a hull was found parked on Brittany.

## Why the old check could not have worked

The fleet placed ships by interpolating a great circle between waypoints and nudging any sample
that failed `isNavigable` sideways until it found water. Three faults compounded:

1. **The grid was 0.7°** — 78 km at the equator. Brittany is narrower than that in places.
2. **`isNavigable` defaults to 60 m of water.** Right for keeping a deep hull off soundings and
   completely wrong as a shoreline test: the English Channel averages 63 m and is 30–50 m over
   most of its area, so the Channel, the North Sea, the Yellow Sea and the Sunda Shelf all read
   as land.
3. **An unroutable sample was DROPPED.** Dropping a point does not remove the track, it removes
   the corner — and the ship then runs straight from the last surviving point to the next.

So the check declared most of Europe's shelf to be land, could not route around it, gave up, and
the giving-up drew the shortcut. **The failure was not a permissive test. It was a test so strict
it had no answer, and a fallback that drew a plausible wrong one.**

## What replaces it

- **Mask**: level-0 elevation at native 2048 × 1024 (~19.5 km), thresholded at 5 m of water,
  then reduced to the ONE connected ocean by a flood fill from mid-Pacific. That last step is not
  cosmetic: Nanjing is on the Yangtze and Bristol on the Severn, and the nearest water to each is
  river water that goes nowhere. Snapping a port to unreachable water fails in a way that looks
  exactly like an impossible voyage.
- **Search**: A* over that ocean, 8-connected, with a cost penalty within three cells of a coast.
  Without the penalty the cheapest path hugs every shoreline, because coast-following is
  geometrically shorter than standing off. With it, straits stay open — a penalty raises the
  price of a passage without closing it.
- **String-pulling**: keep only the corners a ship would turn at, by walking ahead as far as the
  GREAT CIRCLE between two points stays in open water. The test is the curve that gets drawn.

## The declared carves

A 19.5 km raster cannot hold a 3 km channel. Two are cut back in explicitly, by name, in
`CARVED` in `route.js`:

| passage | why |
|---|---|
| Strait of Magellan | 2 km at the First Narrows; Magellan's voyage is *about* this strait |
| Bosphorus and Dardanelles | 700 m at the narrowest |

Nothing else. Suez and Panama are absent, which is correct for every voyage predating them and,
for the box route, means the search finds the Cape — the answer a closed canal gives a real fleet.

## Faults found, each now a rule

- **`maskCell` and `cellLonLat` must be exact inverses.** With `Math.round`, feeding a cell
  centre back through gave x+1 and y+1: every point was tested one cell south-east of where it
  was drawn. Invisible in mid-ocean, the entire error on a coast. Check conversions as a ROUND
  TRIP, never read them as obviously right.
- **Eight-connected movement cuts corners.** A diagonal step between two land cells that meet at
  a corner passes every point test and slips a ship through a headland. Both shared orthogonal
  cells must be water too — the same rule a hull obeys: you cannot pass through a point.
- **A pulled great circle grazes cell corners.** Point sampling at any finite rate steps over a
  2 km clip eventually. Test the SEQUENCE of cells, and apply the same no-corner rule to it.
- **Endpoints are landfalls.** Restoring the caller's own coordinates put every track's first and
  last hull ashore — Tahiti, Savai'i, Viti Levu, Bristol — because at 19.5 km an island of that
  size IS a land cell. A track ends in the water off a landfall. So does a chart.

## Verified

72,768 samples along every drawn track in all eight eras, at ~4.6 km spacing — finer than the
builder's own clearance test. **Zero on land, zero routing failures, 114/114 voyage legs routed.**

---

# The mask and the picture were two different coastlines  (2026-08-04, round 18)

August: *"ships still traverse land — see the screenshot. Do not stop until this is completely
fixed."* My previous verification said 0 of 5,600. Both were true, and that is the story.

## The mask was level 0; the picture is level 2

The routing mask was built from the level-0 elevation at **19.5 km a cell**. The globe has been
drawing from level 2 at **4.9 km** ever since the progressive upgrade landed. Two models of one
coastline, and the router was planning against a world four times coarser than the one on screen.

⚠ I had actually compared them, and drawn the wrong conclusion: over the Philippines the land
FRACTION is 24.1 % at level 0 and 25.4 % at level 2, and I read that as agreement. **Aggregate
agreement is not pointwise agreement.** In an archipelago the two disagree constantly while the
totals match.

## And my first measurement of the fix was wrong too

I tested "is the hull drawn over land" by reading the rendered pixel and calling anything not
blue land. Shallow shelf water renders **pale**, so the test called the Yellow Sea land and
reported 37 % failures that were not failures. The honest test is the shader's own criterion —
`elev - uSeaLevel > 0`, read from the same canvas the shader samples.

## Four attempts, and what each one taught

| | change | result |
|---|---|---|
| 1 | build the mask at level 2 | **worse** — A* on 33.5 M cells needs 400 MB of scratch, the search failed, and the fallback drew raw waypoints, which are inland ports |
| 2 | coarse search grid, cell water only if ALL fine cells are water | **closed the ocean** — Gibraltar, Bab el Mandeb, the Sicilian Channel and both Danish straits became unroutable; 3 legs failed |
| 3 | majority rule + refine the polyline corners | corners are not the path; ships are drawn *between* them — 26 ashore |
| 4 | densify before refining — **in lon/lat** | put a track straight across inland Queensland: string-pulling verified the GREAT CIRCLE, and I densified along a different curve. 0.46 % → 5.7 % |

**The same curve has to be verified, densified and drawn.** Densifying on the great circle took
it to 2 in 8,400, and checking the flagship's drawn position each frame — walking her along her
own course, never sideways, until she is afloat — took it to zero.

## Where it stands

- **fine array** at the drawn resolution answers "is this at sea"
- **coarse grid** (majority rule) answers "may a route be planned here"
- the finished track is densified along the great circle and refined against the fine coastline
- the flagship and every consort are checked again at draw time

**0 of 14,000 hulls drawn as land, across all eight eras, 500 phases each. 0 route misses.**

## And the declared passages are carved into the ELEVATION now

The Strait of Magellan was carved into the mask only, so the route ran through water the renderer
drew as Patagonia — 4 of the last 7 failures were Magellan inside his own strait. The carve now
cuts the tile canvas itself to 40 m, so the strait exists for the router, the renderer and the
eye. If the model asserts a passage, the picture has to show it.
