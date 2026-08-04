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
