# Model gaps register — Ships

Every open item, tied to the subsystem it would change. **This is the handover surface between
research and the build.** Seeded 2026-08-01 from the kickoff, the source survey, and round 1's
own measurements.

**P1** = the model makes a claim it cannot support, or an instrument is missing ·
**P2** = a layer is authored that ought to be modelled · **P3** = thinner than the evidence allows

---

## P1 — open

### A1. There are no ocean currents, anywhere
**The largest hole in the spine.** The set-and-drift term and the water-frame wind correction
(`TW_water = TW_ground − V_current`) are both written and both inert, because no global surface
current climatology was found at kickoff that was simultaneously redistributable, fetchable
without a login, and a climatology rather than a daily series.

Quantified: a 2 kn current on a 10 kn wind is a **±20% swing in true wind speed and up to 11.3°
in direction** — more than a windshift, and about one and a half columns of a polar table. The
Gulf Stream, Kuroshio and Agulhas run at 1.5–4 kn and each is load-bearing for a real route.

**Candidates in order:** OSCAR v2.0 at PO.DAAC (its dataset page's JSON-LD declares CC-BY-4.0
and an anonymous fetch succeeded in testing — verify before ingest); NOAA/AOML Global Drifter
Program climatology via AOML ERDDAP (a ready-made monthly climatology, US-Gov public domain);
Copernicus Marine, whose licence is fine and whose registration is the blocker for a scripted
build.
**Gate:** the passage score in `Research/modeling/passages.py` moves off 2.0× fast, and the
Manila galleon's eastbound leg lengthens against its westbound.

### A2. The wind field is a monthly VECTOR mean, and it understates the wind
Measured on the shipped field: **35% of the world ocean shows a vector mean under 2 m/s.** Not
true of the storm tracks — it is what happens when two weeks of westerly gale and two weeks of
easterly average as vectors. |vector mean| ≤ scalar mean, always.
A documented force-3 floor stands in, disclosed in About. **Fix:** ship the scalar-mean speed
alongside the vector components — direction from the vector mean, speed from the scalar mean.
NCEP/NCAR carries both.
**Gate:** ocean below 2 m/s effective wind falls under 10%, and the floor constant is DELETED
rather than retuned.

### A3. No sea state in the routing engine
Waves are rendered and slow nothing down. Palmer (IJNA 38.2, 2009) puts the penalty at **25–50%
of close-hauled resistance** plus ~10% efficiency — and it is asymmetric, punishing exactly the
upwind legs the model is most optimistic about.
**Fix:** fetch-limited wave growth (already computed in the shader for whitecaps) fed back into
the polar as a multiplier keyed to wave height and relative direction.
**Gate:** the westbound/eastbound Atlantic ratio moves toward the recorded 1.7×.

### A4. Fouling and copper sheathing are on the cards, not in the model
Solar & Rönnbäck (*Econ. Hist. Review* 68.3, 2015) measure copper at **+16–17% speed** on a
large voyage sample — one of the few quantified technology effects in the whole subject.
Schultz (2007): heavy calcareous fouling costs ~10.7% speed at constant power.
**Fix:** a `daysSinceCareening` term and a `coppered` flag with a date.
**Gate:** a coppered and an uncoppered East Indiaman differ by ~16% on the same route.

### A5. The attribution ledger is prose, not a module
Sources are listed in About and nowhere else. A ledger that is not regenerated and compared
byte-for-byte in the gate drifts silently.
**Fix:** `Research/modeling/attribution.py`, one row per source, licence read at its source, and
a gate that refuses to publish an unverified row.

### A6. The Middle Passage layer is aggregates, not routes
SCOPE §10 makes it first-class; it is currently one vessel card. **The voyage database is
CC BY-NC and may not be republished — that is settled and is not the gap.** The gap is that the
routes and regional volumes are documented in scholarship that can be cited and authored
independently, and have not been.
**Fix:** author principal embarkation/disembarkation regions with volumes and dates from Eltis
& Richardson, drawn as arcs the routing engine can also compute.

---

## P2 — authored where it ought to be modelled

### B1. Vessel hulls are not drawn at all — the largest piece of the original ask outstanding
SCOPE D3 commits to **generated hulls** from attested dimensions plus published form
coefficients, with the inference shown. Vessels are currently cards.
Inputs exist: MAN's *Basic Principles of Ship Propulsion* Table 1.01 for modern block
coefficients; derived historical values in the survey (Victory Cb ≈ 0.51, Cutty Sark ≈ 0.48,
both where the literature expects); **HAER measured drawings are public domain and carry real
lines plans** (*Wapama*'s sheets are titled "Corrected Lines: Body Plan, Stations"); the Scottish
Maritime Museum's seven half-hull models are **CC0 on Zenodo**.

### B2. Battles are cards, not animations
The material is unusually good — Medina Sidonia's own journal gives the Armada's wind day by day
with the six-and-a-half-fathom sounding off Zeeland — and nothing moves.
⚠ Two traps already identified: British Jutland reports are GMT and German ones CET, so mixing
them creates ghost events an hour apart; the Armada's Old Style/New Style gap is ten days.

### B3. Sea level moves the coastline but the app does not state the defensibility ladder
Thresholding a modern grid ignores glacial isostatic adjustment: Sunda/Sahul comes out well,
Doggerland, Hudson Bay and Beringia are wrong by tens of metres. **The app must say which is
which, where it is being looked at.**

### B4. Only pyramid levels 0–2 are published
Level 3 (2.44 km, 262 MB) is built and not shipped because the renderer never asks for it.
SCOPE §2 promises 2.44 km. **Fix:** a detail-patch loader fetching only the z3 tiles covering
the current view into a second texture with its own uv rect.

---

## P3 — thin

- **B5.** 423 ports carry two or three fact rows and no prose; only the six historical ones are
  written. The modern set is a gazetteer.
- **B6.** No wreck layer. Ireland's Wreck Inventory and the Australian state registers are
  CC-BY and were located; the Oxford/Parker Mediterranean catalogue is **blocked** — no licence,
  and its copyright page is behind an Oxford login.
- **B7.** Lighthouses: Wikidata has **6,495 with both an inception date and coordinates**, CC0.
  A century-by-century lighting of the world's coasts is one SPARQL query away.
- **B8.** Modern shipping density: the World Bank/IMF AIS raster is **CC-BY 4.0** and would let
  the last chapter show where ships actually go now against where the wind would have sent them.

---

## Closed in round 1 — each cost real map correctness

- **The globe was mirrored.** `lonLatToVec` and the shader's `sphereUV` were self-consistent and
  both wrong-handed, so east drew to the left. Caught by projecting Cape Town and Perth to screen
  coordinates — *not* by looking, because a mirrored Earth looks entirely normal until you name
  something on it.
- **Every field was sampled upside down.** three.js sets `texture.flipY = true` by default; our
  uv comes from latitude, so v=0 is the image's first row. The Southern Ocean was reading
  northern-hemisphere data. Caught by pointing the camera at 42°S and seeing the Caspian.
- **Dijkstra's cost array was Float32 while its keys were float64.** The stale-entry guard
  `key > cost[k]` then fired on nearly every node; the search expanded 4,500 cells of 70,000,
  silently, with no error, looking merely conservative.
- **The specular lobe was so broad it washed the windy ocean grey**, and it read as land.
- **Whitecaps were calibrated for instantaneous wind on a monthly-mean field**, so they appeared
  precisely nowhere. The field's global peak is 9–10 m/s, not 25.
- **Sub-grid noise ran at 2,600 cycles across the globe** — several per pixel — and aliased into
  television static.
- **The budget gate caught 2048×1024 monthly sea fields** putting first paint at 10.9 MB against
  an 8 MB budget. Halved; nothing visible changed.
