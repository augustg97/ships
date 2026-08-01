# SCOPE — Ships

*How we learned to cross the ocean.*

**This file is the contract.** Every later "was that in scope?" is settled by reading it. Written
at kickoff on 2026-08-01 from the scoping interview and the source survey
(`Research/SOURCE-SURVEY.md`). Amended only deliberately, with the amendment recorded in §13.

---

## 1. The claim

**The ocean is not the empty space between continents. It is a machine — a standing structure of
wind belts, currents, ice and distance that is very nearly the same today as it was in 1500 — and
the entire history of seafaring is the record of people learning to read that machine and building
hulls that could exploit it.**

Every route ever sailed is the solution to a routing problem posed by that field and answered with
the technology of its day. The Austronesian expansion across a third of the planet, the monsoon's
enforced sailing calendar in the Indian Ocean, the Portuguese *volta do mar* that sails **west** in
order to go south, the Manila galleon whose two legs take wildly different paths, the Brouwer Route
that cut the passage to Java (§14 — by less than the famous figure claims, and the real number is
the better test), the clipper track down the Roaring Forties, the Suez Canal that killed sail on
the Eastern run, the great-circle container route across the North Pacific — none of these is a line somebody drew. **Each is what the wind
field permits, given a particular hull.** Change the hull and the map of the possible changes with
it.

The corollary is what a viewer should walk away understanding: **the shape of a ship and the shape
of the ocean are the same argument.** A square rig cannot point closer than about six points off
the wind and makes heavy leeway, giving an effective tacking angle near 150° — so beating gains
barely a quarter of a mile made good per mile sailed, and the Atlantic had to be crossed the long
way round the trade winds. A crab-claw sail on a double hull does better, so Polynesia was settled
against the prevailing wind centuries before Europeans could cross an ocean at all. Steam does not
care about the wind, and the moment it stopped caring the map of world trade was redrawn in thirty
years.

**What would falsify it.** The model computes passage times from first principles and compares them
with passage times that were actually recorded. If the computed passages do not track the recorded
ones, the claim that routes are wind-field solutions is wrong, and the model must say so on its own
front page. That is a real risk and it is the point: **the spine is scoreable and it can lose.**

## 2. Extent

| | |
|---|---|
| **Time** | ~70,000 BP → 2026 CE. Storage is per-event and per-vessel with explicit windows; the *field* substrate is a modern climatology treated as standing structure (§5, with the honesty rule attached). |
| **Stored step** | events and vessels carry `{from, to}` windows; fields are 12 monthly keyframes; sea level is a 1 kyr table; northern sea ice is monthly 1850–2017. |
| **Shown step** | continuous, on a **piecewise-linear (chaptered) scrubber**. The density of the record is roughly exponential in recency; a linear axis would spend 97% of its length on prehistory. Breakpoints at 70 ka, 10 ka, 3000 BCE, 500 CE, 1400, 1800, 1900, 1950, 2026. |
| **Space** | the whole planet. **The globe is the primary view** — this is a subject about crossing oceans, and any 2:1 rectangular projection must cut either the Pacific or the Atlantic in half, which is a lie about the thing being modelled. An equal-area flat map is the second view. |
| **Finest legible thing** | one named seafloor feature and one harbour approach: the Mariana Trench axis, the Mid-Atlantic Ridge offset by its transform faults, the Grand Banks, the Bahama Banks, the navigable channel through the Strait of Malacca. |
| **Field resolution** | 16384 × 8192 master (2.44 km at the equator) for bathymetry and sea-floor material, as a four-level tile pyramid. Ocean-surface fields are smooth and ship at ≤2048 × 1024 × 12 months. |

## 3. The substrate

**The real place this model renders is the world ocean**, composed per pixel in a fragment shader
from measured fields. There is no basemap image anywhere in this project.

| field | resolution | encoding | source or mechanism | confidence channel? |
|---|---|---|---|---|
| depth / elevation | 16384×8192 | 16-bit, companded about the shelf break | GEBCO 2026 (public domain) | no — but the **TID** source-type grid is available and is the honest confidence layer (see MODEL-GAPS) |
| sea-floor material | derived | 8-bit class + slope | depth + gradient: shelf, slope, abyssal plain, ridge fabric, trench, seamount | no |
| chlorophyll | 2048×1024×12 | log-scaled 8-bit | MODIS monthly (NEO, public domain) | yes — polar night is genuinely missing, not zero |
| sea-surface temperature | 2048×1024×12 | 8-bit, −2…32 °C | AVHRR monthly climatology (NEO) | yes |
| wind | 512×256×12 | u, v in R,G; speed in B | NCEP 10 m monthly climatology (public domain) | no |
| surface current | 512×256×12 | u, v in R,G | drifter / OSCAR climatology | yes — the drifter record is sparse in the Southern Ocean |
| sea ice | 1024×512×12×era | concentration 0–100 | NSIDC SIBT1850 monthly 1850–2017 (N); CDR (S, 1978→) | yes — and it is load-bearing, see §6 |
| cloud fraction | 1024×512×12 | 8-bit | MODIS monthly (NEO) | no |
| land | 16384×8192 | shares the elevation field | GEBCO topography, Natural Earth for the coast vector | no |

**The visual bar, as a testable sentence:**

> At any zoom the water reads as water — lit, moving, and coloured by what is dissolved and
> suspended in it — with the sea floor visible through it where it is shallow and lost to depth
> where it is deep; the trade-wind belts, the doldrums, the Roaring Forties and the ice edge are
> distinguishable **by the state of the surface itself**, with no arrows, no isobars and no legend;
> and a ship on it sits at its real draught, heeled to the real wind, in a sea state that matches
> the wind that is blowing.

**Three concrete facts a viewer must be able to read off a full-frame screenshot with no legend:**

1. **Where the wind blows hard and where it does not** — the Southern Ocean white with breaking
   sea; the horse latitudes and the doldrums glassy.
2. **Where the sea floor comes up** — the continental shelves, the Grand Banks, the Mid-Atlantic
   Ridge and the trenches legible as terrain, not as a colour key.
3. **Which way the water is going** — the Gulf Stream and the Kuroshio leaving their coasts and
   turning east; the Circumpolar Current running unbroken all the way round.

**Secondary views**, reached from the real one and never the substrate: **the Yard** (a single
vessel rendered in 3D, which is a real object, not an abstract space) and **the Lineage** (the
technology tree). Every leaf of the Lineage flies the globe back to the water the vessel sailed on.

**The two named failure modes are checked for by name every round.** *The chart wearing a basemap*:
if the model's argument is being carried by lines and dots drawn over a blue field, it has failed.
*The beautiful abstraction*: not a risk here — the substrate is the actual Earth.

## 4. The layer table

| layer | kind | mechanism (if modelled) or source (if authored) | engine |
|---|---|---|---|
| Sea floor and coastline | **static** | GEBCO 2026, public domain | field |
| Sea level through time | **modelled** | Spratt & Lisiecki 2016 stack (0–798 ka) thresholding the modern grid — **defensibility ladder stated in-app** | field |
| Wind | **interpolated** | NCEP 10 m monthly climatology, interpolated in month | field |
| Surface current | **interpolated** | drifter climatology, interpolated in month | field |
| Sea ice | **authored→interpolated** | SIBT1850 monthly 1850–2017; a climatological cycle before 1850, **labelled as such** | field |
| Sea state / whitecapping | **modelled** | fetch-limited wave growth from the wind field — not a shipped wave dataset | field, in shader |
| **Reachability / isochrones** | **modelled** | **the spine.** §5 | field, computed in-app |
| Routes | **modelled** | routes are *drawn by the routing engine*, not traced by hand. Where a route is attested and the engine disagrees, the disagreement is shown | feature over field |
| Voyages | **authored** | DAS (VOC), Sound Toll, slavevoyages, CLIWOC | feature |
| Ports | **authored** | World Port Index (public domain) modern; historical ports authored with dates | feature |
| Vessels (the technology tree) | **authored + modelled** | principal dimensions authored from the record; **hull geometry generated** from those dimensions plus published form coefficients | feature → 3D |
| Rig and sail plan | **modelled** | generated from mast/yard proportions and sail areas | 3D |
| Materials | **modelled** | oak/teak/pine planking, tar, copper sheathing, canvas, hemp, iron, steel — shader materials, not photographs | 3D |
| Battles | **authored** | fleet composition, positions, times and **the wind at each phase** | feature, animated |
| Wrecks | **authored** | archaeological catalogues; each carries excavation status | feature |
| Canals and chokepoints | **authored** | dimensions and opening dates as numbers; a vessel either fits or does not, and the model computes which | feature + constraint |
| Navigation instruments | **authored** | with the *error* each one leaves — §5 | card layer |
| The Middle Passage | **authored** | slavevoyages: voyages, ports, numbers embarked and disembarked, mortality. **First-class layer, never an appendix** | feature |

## 5. The mechanism — what the spine computes

Given a **vessel** (a polar diagram: through-water speed as a function of true wind speed and true
wind angle, plus leeway and fouling), a **month**, and a **departure point**:

1. Wind and current are sampled at each node. **True wind is taken relative to the water**
   (`TW_water = TW_ground − V_current`) — the polar is a through-water speed, and a 4 kt Gulf
   Stream changes the apparent wind by more than a knot.
2. `V_ground = polar(TWS, TWA)·unit(heading + leeway) + V_current`.
3. A front is expanded in fixed time steps with land, ice and draught as hard constraints.
4. The result is a **time-to-reach field** over the whole ocean and a minimum-time track to any
   chosen destination.

**Algorithm decision, taken now:** A\* on a **~1° equal-area geodesic grid, ≥16-connected**, with
time-dependent edge weights and a wind-aware admissible heuristic — **not** naive isochrones.
Three measured reasons: (a) an 8-connected lat-lon grid overestimates path length by **8.24%** at
22.5° and lets a router fake upwind progress by zig-zagging inside one cell diagonal; (b) a 1°
lat-lon cell is 60 nm at the equator and **10.4 nm at 80°**, which is exactly where the Southern
Ocean and ice routes run; (c) isochrone pruning by distance-to-go **deletes the Brouwer Route by
construction**, because that route's whole idea is to temporarily increase distance-to-go in order
to reach the westerlies. Isochrones are kept as a fast first pass and a sanity check.

One mechanism produces the routes, the reachability field, the passage times, the seasonal sailing
calendar, and the answer to "could this ship have got there at all." **Invent a new hull and the
map redraws itself with no new authoring** — ARCHITECTURE-PATTERNS §0's test for a model.

**Honesty rules attached to it, decided now rather than retrofitted:**

- The wind field is a **modern climatology** used as standing structure. Defensible for the general
  circulation over centuries; **not** defensible for a particular day. The model computes *typical*
  passages and says so; it never reconstructs the weather of a named voyage; the Little Ice Age
  caveat is stated where it bites.
- A route the engine produces is a **claim about what was possible**, not evidence anybody sailed
  it. Attested and computed routes are drawn differently and never merged.
- **Longitude was not solvable at sea until the 1760s.** Positions from logbooks before then carry
  errors of hundreds of kilometres, and the model draws that error rather than a confident line.
- **CLIWOC wind is Beaufort descriptors, not speeds** (Beaufort tied to knots only in 1855). Any
  use of it carries the conversion's uncertainty into the score.

## 6. The evidence boundary

Where the record stops and inference begins: **watercraft do not survive.** The boundary is not one
date but a ladder, and the UI changes behaviour at each rung.

| where the record stops | what the UI does there |
|---|---|
| **~70,000 BP** — no watercraft survives; the crossing to Sahul is inferred *entirely* from the fact that people arrived | the vessel is **not drawn**. The crossing is, over a sea level from the Spratt stack, with the card saying the craft is unknown and why we are nonetheless certain a crossing happened |
| **Before ~4000 BCE** | vessel cards carry `completeness`. A dugout known from one fragment is not rendered whole without the render saying so |
| **Before ~1750** — no systematic logbook coverage | voyage tracks fade to origin–destination arcs, the intermediate path drawn as the *engine's* route and labelled computed |
| **Longitude before ~1765** | drawn as an east–west error bar, not a point |
| **Southern Ocean sea ice before 1978** | no measurement exists; a climatological cycle, labelled as one |
| **Deep-water wrecks** | the wreck record is a map of *where people have looked* — shallow, warm, archaeologically active seas. A search-effort caveat rides on the layer permanently, so absence never reads as absence |

**Where the sources disagree:**

| disagreement | shape | how the model handles it |
|---|---|---|
| Zheng He's treasure-ship length (claimed 400+ ft) | **amount**, and it is a naval-architecture argument about whether a wooden hull that long can work | both positions on the card; the generated hull is drawn at the defensible length with the claimed length shown as an outline |
| Trireme performance (*Olympias* fell short of the literary figures) | **amount** | the polar uses the measured trial, and the card states the shortfall and the proposed reason |
| Trafalgar casualties (three competing British sets: 449/1217, 458/1208, 447/1214) | **amount**, small | range on the card, parties named |
| Tsushima Russian dead (4,380–5,045) | **amount** | range on the card |
| Armada losses on the Irish coast | **existence** — which wrecks are which ship | only identified wrecks are placed; the rest are a count |
| Trireme/Salamis ship counts (Herodotus) | **amount**, large | range, with the ancient source named as a source rather than a measurement |
| Clipper records (Andrew Jackson's 89 d 4 h vs Flying Cloud's 89 d 8 h) | **amount** — the dispute is over where the passage starts and ends | Flying Cloud is canonical; the dispute is on the card |

## 7. The canonical frame

**The highest-value section in the kickoff.** Two sources silently in different frames produce a
model that is wrong everywhere and looks right nowhere in particular.

| dimension | canonical choice | sources that differ, and the conversion |
|---|---|---|
| coordinates | **WGS84 decimal degrees, lon −180…+180**, `_wrap180(+180) = −180`. Rasters plate carrée, row 0 = +90 | **NCEP wind is a T62 Gaussian grid — latitudes are NOT evenly spaced** (1.889° at the pole, 1.905° at the equator) and longitude runs **0…358.125**. Reproduced exactly by `degrees(arcsin(leggauss(94)))`, verified against the file's own metadata. **NSIDC ice is polar stereographic** and must be reprojected. **Logbook longitudes use local prime meridians** — Ferro, Paris, Cádiz, Lisbon — applied by table, per record |
| dates / calendar | **proleptic Gregorian**, with the original carried as a display string naming its style | **The Armada is recorded in English Old Style, ten days behind** Spanish New Style — mixing them makes the campaign internally inconsistent. **Russia was Julian until 1918**, so Tsushima is 27–28 May (NS) = 14–15 May (OS). **Japan adopted Gregorian in 1873.** Prehistoric dates are **BP = before 1950** and are never silently mixed with BCE |
| names | **the name in use at the displayed date leads; the modern name follows in the same row** | Constantinople/Istanbul, Batavia/Jakarta, Calicut/Kozhikode, Malacca/Melaka, Bombay/Mumbai, Elmina/Edina. On a map of empire, whose names are used is itself a claim; the answer is *both, with the date attached* |
| **tonnage** | **there is no canonical tonnage.** Every figure carries its system | burden, builder's old measurement, gross register, net register, displacement, deadweight and TEU are different quantities and are **never plotted on one axis**. This is the easiest way to publish a wrong chart about ships |
| units | metres and knots canonical | fathoms, cables and nautical miles shown where they are the working unit of the period |

Conversions live in `Research/modeling/frames.py` with selftests. **Never combine two sources
without checking they are in the same frame.**

## 8. The card contract

```
eyebrow      what kind of thing this is
title        the name in use at the displayed date
subtitle     the modern name, where it differs
rows         2–6 label/value facts, each with its unit system named
prose        the text FOR THE CURRENT TIME — eras: [{from, to, text}]
span         the era span, shown to the reader
confidence   good | moderate | contested        — a field, not a footnote
attestation  attested | inferred | generated    — for anything with geometry
citations    named sources, always
```

**Vessel** cards additionally: principal dimensions with **which are attested and which inferred**,
the tonnage system, rig, construction method, the polar diagram as drawn, crew, and the ships known
to have been built to the type. A generated hull always says it is generated.

**Battle** cards additionally: fleet composition per side, the wind, casualties per side, and what
is disputed with the parties named.

Fallback tiers and their headings:

1. curated exception → **"This vessel"** / **"This port"**
2. model-derived → **"Computed for this hull and this month"**
3. generic → **"Typical of this type and period"** — *the heading must say it is generic.*

Approximate card counts: ~120 vessel types, ~200 ports, ~40 battles, ~60 voyages, ~30 instruments
and materials, ~25 chapters.

## 9. The standard for done

**Named reference artefacts, at a stated scale:**

- **The passage-time distributions**, which are the primary score. Neither number may be used as a
  fit target:
  - **VOC → Batavia, from Solar & de Zwart (2017), computed off the DAS database** (open access,
    *IJMH* 29(4)): mean/median **253/237 days (n=156)** for 1770–75 and **238/231 (n=238)** for
    1783–92; English East India Company to Batavia over the same years is **173/160 (n=20)** —
    a 60–80 day gap between two fleets sailing the same ocean, which is a test of the *polar*,
    not of the field.
  - **Brouwer, 1611** — kept as a target but with its real numbers (see the amendment in §14): DAS
    voyage records give the old Madagascar route **323–338 days** and the immediate post-Brouwer
    route **252–260 days**. The saving is about **2.5 months, not six.**
  - **Maury's Wind and Current Charts**: US East Coast→San Francisco average **187.5 days → 136
    days** by 1855.
- **The asymmetries**, which test the polar rather than the field: Acapulco→Manila (~3 months) vs
  Manila→Acapulco (4–8 months); Cape Horn westbound vs eastbound; the Atlantic packets' ~23-day
  eastbound vs ~40-day westbound.
- **Point targets**: *Flying Cloud* New York→San Francisco **89 d 8 h**; *Great Western* 1838
  Bristol→New York **15 d 5 h**; Urdaneta 1565 Cebu→Acapulco **130 days**.
- **Reference imagery** for the vessel renderer: photographs of surviving or reconstructed hulls at
  a known angle — *Vasa*, *Cutty Sark*, *Victory*, the Roskilde ships, *Hōkūleʻa*, *Great Britain*.
- **Registration**: named seafloor features re-read from the **shipped** raster — Challenger Deep,
  Puerto Rico Trench, Grand Banks — to 8 decimal places.

**The independent witness:** the recorded passage-time corpora — **Dutch-Asiatic Shipping**
(~4,700 outbound VOC voyages with dates) and **slavevoyages** (per-voyage departure and arrival
dates). Neither was derived from the wind climatology the model runs on, so they are genuinely
independent. This is the instrument every later dispute is settled with, and it is a **P1** item.

**Visual:** §3's testable sentence plus the three readable facts, assessed on a full-frame
screenshot every round, in writing.

## 10. Sensitivities

**Substance distributed through the layers, never a disclaimer.**

- **The Middle Passage is a layer, not a note.** For three centuries the Atlantic's principal cargo
  was people: roughly 12.5 million embarked, roughly 10.7 million disembarked, and the difference
  died at sea. Carried by the route layer, the port cards, the mortality figures — and, because
  this is a project about *technology*, by the vessel cards, because the slave ship's between-decks
  was a design, drawn by naval architects, optimised for a quantity of human beings per ton.
- **Not a march of progress.** Austronesian navigators settled a third of the planet's surface
  before the Mediterranean could reliably leave sight of land. The technology tree is **not rooted
  in Europe** and does not converge on it; the ordering principle is capability against the wind
  field, and by that measure the Pacific leads for most of the span. Carried by the Lineage's
  topology, not by a caption.
- **Conquest.** The caravel, the carrack and the ship of the line were instruments of conquest, and
  the ports they connected — Elmina, Goa, Malacca, Batavia, Manila — were mostly taken by force.
  Carried by port-card era prose, at the date it happened.
- **The people aboard.** Scurvy, impressment, mortality on long passages; modern seafarer
  abandonment and shipbreaking at Alang and Chattogram. Carried by crew numbers on every vessel
  card and by the modern chapters.
- **War dead.** Casualties per side on every battle card, as a range where disputed.
- **Extraction.** Whaling, fisheries collapse, shipping emissions — as measured quantities in the
  modern chapters.

**Naming convention and why:** both names, with the date attached (§7). A single modern name erases
the world the ship sailed in; a single historical name adopts the coloniser's map as the truth.

## 11. Non-goals

- **Not a wargame.** No counterfactual fleet actions.
- **Not a wreck gazetteer.** Wrecks appear where they carry technological or route information.
- **Not a weather reconstruction.** Typical passages only, never the weather of a named day.
- **Not a ship-spotter's database.** Individual hulls appear as type specimens, headline vessels,
  or carriers of a specific voyage.
- **No naval architecture beyond what the sources support.** Generated hulls come from published
  dimensions and coefficients and say so.
- **No interior or deck-plan modelling** in v1.
- **No real-time AIS.** The modern shipping layer is a climatological density, not live traffic.

## 12. Budget and delivery

| | |
|---|---|
| delivery | static site, GitHub Pages from `main:/docs`, `.nojekyll`, relative paths, data-version stamp |
| total bytes over the wire | ≤6 MB for first usable frame; ≤400 MB for the full tile pyramid, streamed by zoom |
| time to first usable frame | **< 2 s** on a warm cache — level-0 tiles plus the two bracketing month keyframes only |
| offline / `file://` required? | **no** — it would rule out streaming the field tiles, which trades away the visual bar |
| pipeline? | **yes.** `build/` → `web/` → `docs/`; `build_site.py` is the only publication route and runs the validator gate |

## 13. Decisions of record

Taken at kickoff so a later session does not quietly revise them. **Each is a one-commit revert if
August disagrees.**

- **D1 — The spine is the passage-making model, and the project is judged on whether it scores.**
  The alternative (an illustrated timeline of ship types) was rejected: no mechanism, and
  ARCHITECTURE-PATTERNS §0's test fails for it.
- **D2 — The globe is the primary view.** A rectangular projection that halves the Pacific is not an
  acceptable substrate for a subject about crossing it.
- **D3 — Ships are generated, not photographed.** Procedural hulls from attested dimensions plus
  published form coefficients, with the inference shown. Same pattern the studio arrived at for
  fossil hominins, for the same reason: the good geometry is not redistributable, and *generating
  and disclosing* beats *copying and hoping*.
- **D4 — The wind climatology is modern and is used as standing structure**, with §5's limits in the
  app rather than in a footnote.
- **D5 — Time is chaptered and nonlinear.**
- **D6 — Sea ice ships from SIBT1850 for the north**, labelled climatological before 1850 and in the
  south before 1978.
- **D7 — ShareAlike is permitted** for data and images (inherited from Mother Tongues D3);
  **NonCommercial and NoDerivatives remain excluded.** Every SA source needs a row in the
  attribution ledger before ingest.
- **D8 — NASA NEO is decommissioned on 1 September 2026.** Everything wanted from it was mirrored on
  day one; the ledger records that the upstream will be gone. *Found at kickoff, and the reason the
  ocean fields were fetched before anything else was done.*
- **D9 — GEBCO 2026 is the bathymetry, ETOPO1 is the witness.** GEBCO's terms place the grid in the
  public domain and explicitly permit copying, adaptation and commercial exploitation; its
  "not for navigation" clause is a fitness disclaimer, not a redistribution restriction, and is
  quoted in the About panel. Two bathymetries are never composited — that is the "two consumers of
  the terrain" bug by construction.

## 14. Amendments

**2026-08-01 — §1 and §9: the Brouwer figure was folklore, and the claim is narrowed.**
The kickoff draft of §1 said the Brouwer Route "cut the passage to Java from about twelve months to
about six," and §9 made that before/after the model's primary score. The source survey then went to
the underlying voyage records and the number did not survive:

- **Dutch-Asiatic Shipping voyage records**, read directly: the old Madagascar route ran **323–338
  days** (WAPEN VAN AMSTERDAM 1610: 323; RODE LEEUW / GROTE MAAN / ZON 1611–12: 335 each; WITTE
  VALK 1613–14: 338). The immediate post-Brouwer passages ran **252–260 days** (ZEELANDIA 1613:
  252; MEDEMBLIK 1619–20: 260). **The saving is ~2.5 months, not six.**
- Worse for the original framing, **Solar & de Zwart (2017)** find *"no significant trend over the
  late seventeenth and eighteenth centuries in the duration of Dutch voyages to Batavia"* — the
  Cape leg shortened slightly while the Cape→Batavia leg lengthened slightly, and the two netted
  to flat. VOC means stayed at **238–253 days** into the 1790s.
- **Brouwer's own 1610–11 voyage was about eight months**, not the "5 months 24 days" that
  circulates; that figure is unverifiable and is inconsistent with his own December departure and
  June Cape rounding.

*What changed:* §1 now says the Brouwer Route "cut" the passage without a number; §9 carries the
real distributions and names Solar & de Zwart as the source. *What did not change:* the claim
itself. A 2.5-month saving on a 11-month passage is still a routing decision with a measured
before and after, and it is still the right test. **The model must reproduce ~330 days → ~255
days, and must NOT reproduce a continuing improvement across the 18th century, because there was
none.** The second half of that is the sharper test and it only exists because the number was
checked.

*Standing lesson, and it is the reason this section exists:* the famous version of a figure is
the one that has been copied most, not the one that was measured. Every headline number in this
project gets traced to a voyage record or a published table before it is allowed to be a target.
