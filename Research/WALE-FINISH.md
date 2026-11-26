# Wale finish — plate reads (r340, 2026-11-26)

Every wale in the model is one material, `0x3d2f1f` (hull.js, `waleMat`), a brown about the
planking's tone. r339 queued `hull.wale.finish` as the record field that should replace it, with
one instruction: read each ship's plate before setting it. This file is those reads. No record
field and no builder change was made in r340. The round opened with 455 MB free on the Data
volume, under the 500 MB floor for browser work, so nothing could be rendered and checked.

## Values the field should take

- `'tarred'`: the wale is black against a lighter side.
- `'withHull'`: the wale is painted in the hull's own topside colour.
- `'bright'`: oiled or varnished timber, the planking's own tone.
- `'unknown'`: no plate read yet. The builder must label this as the class fallback, which is
  today's brown.

## Reads

### Ship of the line (the 74): BLACK, read

**Plate.** C. W. Eckersberg, *The Russian Ship of the Line Asow and a Frigate at Anchor in the
Roads of Elsinore* (1828, SMK). The plate is the Commons Google Art Project file at the 1920 px
thumb, `build/staging/r312/plates/asow.jpg`, which r313 measured at about 30 px/m at the mizzen.
The crop is `build/staging/r340/asow-side-3x.png`.

**What it shows.** Her side is painted in bands. There is an ochre band along each tier of ports,
a black band between the two tiers, and a broad black band from the lower tier down to the
water. The main wales run in that bottom band. The black is near-neutral: plate sRGB about
(43, 38, 34) in shade, against about (80, 55, 30) for the ochre. It is neither brown nor timber.

**Rows.** Each band's start and end, read up a single column. An ochre pixel is one where
R − B > 28.

| column | upper ochre | black between tiers | lower ochre | black, wale band | waterline |
|---|---|---|---|---|---|
| x 800–830 | 1920–1953 | 1954–1979 | 1980–2020 | 2021–2072 | ~2073 |
| x 880–910 | 1927–1959 | 1960–1983 | 1984–2021 | 2022–2069 | ~2070 |

Each band is also given as a fraction of the height from the waterline to the top of the upper
ochre band. A ratio taken up one column is independent of scale, and the painter's eye is near
the water (r313), so these ratios hold:

| band | plate | model (shader `uChequer`, the 74 at 5.4 m freeboard) |
|---|---|---|
| black, waterline up | 0–0.34 | 0–0.23 |
| lower ochre | 0.34–0.61 | 0.23–0.55 |
| black between tiers | 0.61–0.78 | 0.55–0.68 |
| upper ochre | 0.78–1.0 | 0.68–1.0 |

At about 30 px/m the wale band is 1.6–1.7 m deep and the top of the upper ochre band stands
4.8–5.1 m over the water. Those are metres, so they depend on the scale and carry about ±20%,
because the two columns stand at a different depth from the mizzen where r313 set the scale. The
ratios above do not carry that error.

**Where this leaves the model.**
1. `finish: 'tarred'`. The colour should be the shader's chequer grey, vec3(0.180, 0.178,
   0.172). That is the dark of the same bands, from Crick-Smith's survey of Victory, which the
   shader already cites. Asow is Russian, so her dark is the plate's black. A British 74's dark
   is the survey's grey.
2. The model's lower wale (v 0.640–0.670, 0.28–0.71 m over the water) sits inside its black
   band. The upper wale (v 0.747–0.773, 1.81–2.18 m) straddles the boundary between the lower
   ochre band and the black band between the tiers. If it is painted black at its present
   height, it eats the top of the ochre band.
3. **The structural fix is the paint following the timber.** On the plate, the black bands are
   where the wales are, and the ochre is painted on the planking between them. The chequer's
   band centres are fixed in the shader (`uWaterline + 0.10 + d·0.115`). They should come from
   the wale heights, so that one record sets both. The plate gives the proportions above. Its
   lower black band is half as deep again as the model's: 0.34 of the height against 0.23.

### Endurance: WITH THE HULL, read

**Plate.** Hurley, Commons *Endurance in Antarctica, 1915* a090007, a hand-coloured lantern
slide, 1500 × 1124 px, about 24 px/m at the stern (r273). The file is
`build/staging/r273/commons-a090007.jpg` and the crop is
`build/staging/r340/a090007-side-3x.png`.

**What it shows.** From the rail to the ice her side is one dark tone. No band reads in a
contrasting colour. Along the column at x 800–860 the tone steps from about 51 to about 38 at
row ~795. That reads as a seam or the wale's lower edge, not as a painted band. The slide's
colour is hand-applied, so it says nothing about hue. Only tone is evidence here.

**So:** `finish: 'withHull'`. Her topside colour is `#241c14`, and the wale should take it. On
her the r339 timber section should show as an edge only, never as the brown band it draws now.

### Fluyt: UNKNOWN from her plate

**Plate.** Hollar, *A Flute* (1647), the 1920 thumb `build/staging/r328/dl/hollar-flute.jpg`,
about 37 px/m. The crop is `build/staging/r340/hollar-side-2x.png`.

**What it shows.** Each wale is drawn as a raised moulding with a dark shadow line under it.
Between the wales the planking carries the same hatching. In an etching, tone is shading, not
paint, so this plate cannot tell a tarred wale from a bright one. The geometry r339 built, with
a top face, an outer face and an underside, is what this plate does attest.

**What would decide it.** A colour plate of a Dutch merchant ship of 1640–1680, such as a
Willem van de Velde painting or a Dutch museum model. It has not been read. The tarred
black wales of Dutch practice are a fact about the period. Until a plate shows them on a
fluyt, they are an inference.

### The other 17 timber hulls with wales: no plate on record

Searching the records turns up a Commons file for only four of them: the carrack (Master W, an
engraving, tone only), the sekibune (`Atakebune4.jpg`), and the East Indiaman and the slave
ship (the Vasa rig diagram, which shows no hull paint). All 17 stay `'unknown'` until each has a
read. The candidates to read first are those whose black topside makes today's brown band the
most visible, the clipper and Wyoming, plus the East Indiaman, the other ship that carries ports in tiers. Her bands
would need the same structural change as the 74's.
