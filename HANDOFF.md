# HANDOFF — Ships

*Written 2026-08-01, end of kickoff + round 1.*

## What this is

**The world ocean as a machine of wind, current and ice — and the ships built to cross it.**
Live: **https://augustg97.github.io/ships/** · repo `augustg97/ships`, Pages from `main:/docs`
· local `~/Ships`, dev server port **8149** (registered in `~/.claude/launch.json`).

Read `SCOPE.md` first — it is the contract, and §13 carries the decisions of record and §14 the
one amendment already forced by the sources.

## State

**v1 is live and the gate passes.** Data version 1785571065, verified live.

- **The substrate** is composed per pixel in one fragment shader: GEBCO 2026 bathymetry at
  2.44 km as a four-level tile pyramid, monthly SST / chlorophyll / cloud, NCEP 10 m wind, and a
  measured sea-ice margin. **There is no basemap image anywhere in the project.**
- **The spine** is a passage-making model — time-dependent Dijkstra over the wind field with a
  per-rig polar — rendered as a field of isochrones on the real ocean. 69,045 of 70,902
  navigable cells in ~340 ms.
- **423 ports, 17 vessel types with polars, 8 chapters, 8 battles.**

## The score, and it is the point

The engine computes an East Indiaman Lisbon→Batavia in **119 days** against a recorded
**237–253**. **It is fast by a factor of two**, and every missing term pushes that way: no
currents, no sea state, no port time (the VOC spent ~a month at the Cape), a vector-mean wind
with a floor, and a departure from Lisbon rather than Texel.

What comes out *right* is the ordering and the asymmetries: eastbound Atlantic beats westbound,
the galleon's return leg far exceeds its outbound, and a dhow leaving Calicut in January reaches
Aden while the same dhow in July cannot leave at all. That last one is the monsoon calendar
falling out of the wind field with nothing authored.

`Research/modeling/passages.py` holds the recorded corpus and is in the build gate.

## What the next session should do, in order

1. **A1 — currents.** The largest hole. Try OSCAR v2.0 at PO.DAAC first (CC-BY per its JSON-LD,
   anonymous fetch worked in testing), then the AOML drifter climatology. Both the set-and-drift
   term and the water-frame correction are already written and inert in `web/js/route.js`.
2. **A2 — the scalar-mean wind**, so the force-3 floor can be *deleted* rather than retuned.
3. **B1 — generated hulls.** The largest piece of August's original ask still outstanding, and
   the inputs are all located: HAER measured drawings (public domain, real lines plans), Scottish
   Maritime Museum half-hulls (CC0 on Zenodo), MAN Table 1.01 for block coefficients.
4. **B2 — animate the Armada** off Medina Sidonia's own journal, which gives the wind day by day.

## Traps specific to this subject

- **Calendars.** The Armada is English Old Style, ten days behind Spanish New Style. Russia was
  Julian until 1918, so Tsushima has two dates. Japan changed in 1873. Prehistoric dates are
  BP = before 1950 and are never silently mixed with BCE.
- **Jutland times:** British reports GMT, German CET. Mixing them creates ghost events an hour
  apart — *Lützow* is scuttled at 01:45 or 02:45 depending on whose account you are reading.
- **Tonnage is not one unit.** Burden, builder's old measurement, gross/net register,
  displacement, deadweight and TEU are different quantities and must never share an axis.
- **CLIWOC longitudes are not Greenwich.** Only 45% of its 287,114 positions are: 67,000 use
  Tenerife (Ferro), 10,000 Paris, plus Cádiz, London, the Lizard, St Helena — and 30,230 are
  Unknown. Plotting them naively misplaces a quarter of 18th-century shipping by ~17°.
- **Three famous numbers that are wrong**, all checked at kickoff: the Brouwer "12 months to 6"
  (SCOPE §14), Zheng He's 138 m treasure ship (from a 1597 *novel*; the dock is 41 m wide against
  a claimed 52 m beam), and "six points off the wind" (a heading, not progress — GPS-instrumented
  replicas make good 71–90° and lose ground above force 4).
- **SlaveVoyages is CC BY-NC.** Cite it; do not republish it. The published aggregates are fine.
- **NASA NEO is decommissioned 1 September 2026.** Everything wanted from it is mirrored in
  `data/ocean/`; the upstream will be gone.

## Commands

```bash
cd ~/Ships/build
python3 fetch_ocean.py     # NASA NEO mirror (already done; NEO dies 2026-09-01)
python3 build_fields.py    # GEBCO + surface fields -> data/master, web/fields
python3 build_tiles.py     # the pyramid -> web/fields/z0..z3
python3 build_data.py      # ports, vessels, chapters, battles, about
python3 build_site.py      # THE GATE, then web/ -> docs/. The only publication route.
```

`web/fields/` is gitignored and regenerable; `docs/` carries the published copy, levels 0–2 only.
