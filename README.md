# Ships

**How we learned to cross the ocean.**
Live: **https://augustg97.github.io/ships/**

---

## 1. What this is trying to be

The ocean is not the empty space between continents. It is a machine — a standing structure of
wind belts, currents, ice and distance that is very nearly the same today as it was in 1500 —
and the entire history of seafaring is the record of people learning to read that machine and
building hulls that could exploit it.

Every route ever sailed is the solution to a routing problem posed by that field and answered
with the technology of its day. The corollary is the thing to walk away with: **the shape of a
ship and the shape of the ocean are the same argument.**

That claim is falsifiable, and the model tests it. It computes passage times from first
principles and compares them with times that were actually recorded. **It currently loses by a
factor of two**, in a direction every missing term explains, and the number is on the front page.

### The four commitments, made concrete for this subject

- **Veracity first.** Every figure names its source, and where the sources disagree the card
  carries the range and names the parties. Three famous numbers were checked at kickoff and did
  not survive; all three corrections are in the app rather than quietly dropped.
- **Coherence.** Every layer derives from the same fields, so no two can disagree. The routing
  engine reads depth out of the same tiles the shader draws.
- **Detail that survives zoom.** Sub-grid texture is grown from the process that makes it —
  abyssal-hill fabric keyed to roughness, wave streaks keyed to the wind — not shipped as images.
- **What it does not know, it says.** The water is drawn far clearer than real water so the sea
  floor can be read; there are no currents; the wind is a monthly mean. All three are in About.

## 2. Working rules

The standing rules are `Modeling Studio/references/WORKING-RULES.md`, copied into `CLAUDE.md`.
Rule 0 governs: **the surface is the argument, and it must be a legible surface of the real
world.** Plus two the subject demands:

- **Tonnage is not one unit.** Burden, builder's old measurement, gross and net register tons,
  displacement, deadweight and TEU are different quantities. Every figure names its system and
  they never share an axis.
- **Both names, with the date attached.** A single modern name erases the world the ship sailed
  in; a single historical name adopts the coloniser's map as the truth.

## 3. The layer table

| layer | kind | mechanism or source |
|---|---|---|
| Sea floor and coastline | static | GEBCO 2026 (public domain) |
| Sea level through time | modelled | Spratt & Lisiecki 2016 stack thresholding the modern grid |
| Wind | interpolated | NCEP 10 m monthly climatology |
| Sea ice | authored→interpolated | NSIDC / NISE measured margin |
| Sea state, whitecapping | modelled | fetch-limited wave growth from the wind field |
| **Reachability / isochrones** | **modelled** | **the spine — Dijkstra over wind + ice with a per-rig polar** |
| Ports | authored | NGA World Port Index + authored historical ports |
| Vessels | authored + modelled | dimensions from the record; polars from measured sea trials |
| Battles | authored | fleet composition and **the wind at each phase** |
| Chapters | authored | eight, from the crossing to Sahul to the container |

## 4. Shape

```
build/      the offline pipeline; build_site.py is the ONLY publication route
web/        the app and its data — the working copy (web/fields is gitignored, regenerable)
docs/       the built static site; Pages serves main:/docs
data/       source datasets, gitignored (~8 GB)
Research/   the research programme; build/ never imports it
```

## 5. Known limits

In About, in the app, in the same voice as everything else: no currents in the routing engine;
the wind is a monthly *vector* mean and understates the wind; longitude was not solvable at sea
until the 1760s; Southern Ocean sea ice before 1978 was never measured; and the wreck record is
a map of where people have looked.

**SlaveVoyages is CC BY-NC** — it is cited here and not republished. The Middle Passage figures
in the app are the published aggregates.
