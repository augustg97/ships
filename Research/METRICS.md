# Running metrics for the readout — sources and derivations

Written round 56, for queue item 9: the top-left card carries metrics that run across time,
each labelled **sourced** or **derived** (rule 10: a number with no provenance is worse than no
number, and "unknown" is a legitimate return). This file is the provenance record; the
machine-readable series live in `web/data/metrics.json`. Every figure below was verified
against the named source on 2026-08-07, not quoted from memory — the fetch trail is in the
round's log.

## The honest boundary

**There is no aggregate figure for world seaborne trade before 1840.** The first usable global
series is Stopford's (Table 1.2, *Maritime Economics*), which opens at 20 million tons in 1840.
Before that the record is single cargoes, single companies, single flows — the readout
therefore shows a standing line, *"Seaborne trade: no aggregate record survives"*, whenever no
trade-volume series is live at the current year. That line is not filler; it is the finding.

**Value is thinner than volume.** The only defensible figure found is the ICS statement that
world seaborne trade exceeded US $14 trillion in 2019. No pre-modern value series exists in a
common unit; none is shown.

## The series

### 1. World seaborne trade volume — SOURCED
| year | value | source |
|---|---|---|
| 1840 | 20 Mt | Stopford, *Maritime Economics* 3rd ed., Table 1.2 (20,000 kt) |
| 1887 | 137 Mt | same (137,300 kt) |
| 1950 | 550 Mt | same (550,000 kt) |
| 1960 | 1.11 Gt | same (1,110,000 kt) |
| 1970 | 2.6 Gt | UNCTAD, *Review of Maritime Transport* 1995, table: 2,605 Mt loaded |
| 1975 | 3.07 Gt | both series carry this point (RMT 1995: 3,072 Mt; Stopford 3,072,000 kt) — the splice is consistent |
| 2005 | 7.1 Gt | Stopford Table 1.2 (7,122,000 kt) |
| 2023 | 12.3 Gt | UNCTAD RMT 2024: "grew by 2.4% to 12.3 billion tons" |
| 2024 | 12.1 Gt | UNCTADstat Data Insights (17 Mar 2026 update): 12.1 Gt loaded, +3.9% on 2023 |

⚠ 2023 (12.3) vs 2024 (12.1): UNCTAD revised the 2023 base downward in the 2026 data update —
the two RMT statements are not directly comparable and the json carries only 1970, 2005 and
2024 from this side of the splice, so the displayed series never moves backwards.

### 2. World seaborne trade value — SOURCED, one point
- 2019: > US $14 trillion. International Chamber of Shipping, "Shipping and world trade:
  driving prosperity": "As of 2019, the total value of the annual world shipping trade had
  reached more than 14 trillion US Dollars." Shown only from 2019.

### 3. World merchant fleet — mixed, per-point label
- 1945: **≈ 60 M GT, DERIVED.** GI Roundtable 25 (AHA, 1946, a primary source): US fleet
  Dec 1945 = 39,063,000 GT, "perhaps two-thirds of the world's total tonnage" → world ≈ 59 M GT.
  Rounded to ≈ 60 M GT and labelled derived because the two-thirds share is the source's own
  estimate.
- 2025: **112,500 ships / 2.44 bn DWT, SOURCED.** UNCTAD RMT 2025: "By January 2025, the world
  fleet counted 112,500 vessels with 2.44 billion dead weight tons."
- The early-modern European fleet series (Unger 1992, "The Tonnage of Europe's Merchant Fleets
  1300–1800", *American Neptune* 52) was NOT included: the paper itself is paywalled and the
  secondary quotations found disagree with each other by more than 2×. Adding it needs the
  actual paper, not a citation of a citation.

### 4. Grain shipped to Rome — DERIVED
- ≈ 200,000 t a year, imperial period. Ancient testimony (Josephus BJ 2.383, 386; *Epitome de
  Caesaribus* 1.6 — 20 M modii from Egypt) implies up to 60 M modii ≈ 400 kt combined, which
  Rickman criticises as too high; Rickman 1980 (*The Corn Supply of Ancient Rome*) puts the
  city's need at 40 M modii ≈ 272 kt; Garnsey 1988 at ≥ 150 kt; Mattingly & Aldrete at 237 kt.
  ≈ 200 kt is the centre of the modern range and is labelled derived. Window −100 to 420.

### 5. Passage times — SOURCED (attested in a named text)
- Puteoli → Alexandria **9 days**, the return against the etesians 40–70: Pliny, *Natural
  History* XIX.1 (already the era-2 stat, carried over with its cite). Window −30 to 420.
- Stad (Norway) → Horn (Iceland) **7 days' sail**: Landnámabók ch. 2 — the text's own sailing
  directions. Window 870–1100.
- Bristol → New York **15 days** under steam: *Great Western*'s maiden crossing, 8–23 April
  1838. Window 1838–1900.

### 6. Voyages per year — SOURCED
- VOC: **> 4,700 outward sailings, 1595–1795** (≈ 24 a year for two centuries): *Dutch-Asiatic
  Shipping* (Bruijn, Gaastra & Schöffer), via the Huygens Institute DAS database. Window
  1595–1795.
- Middle Passage: **12.5 M people embarked on 36,000+ voyages, 1514–1866**: SlaveVoyages
  Trans-Atlantic Slave Trade Database (12,520,000 estimated departures; 36,002 documented
  voyages in the 2018 set). Window 1514–1866.

### 7. Single attested cargo, Late Bronze Age — SOURCED
- Uluburun wreck, c. 1320 BC: 10 t of Cypriot copper and 1 t of tin in one hull (INA
  excavation, Pulak). Already the era-1 stat; carried as the era's only honest quantity.
  Window −1400 to −1000.

### 8. Sea level — DERIVED
- The running "Sea level N m lower" line was already computed from the Spratt & Lisiecki 2016
  stack, linearly interpolated (app.js `SEA_LEVEL`); it now carries that label on the card.

## Display rules (implemented in `updateReadout`)

1. A row shows only when the current year is inside its window AND at or past its earliest
   point; the value shown is the latest point at or before the year, with the point's own year
   printed beside it. A 2019 number can never appear under 1955.
2. Each row carries a second line: `sourced — <short cite>` or `derived — <short cite>`.
3. At most 3 metric rows show, by priority; the standing "no aggregate record survives" line
   shows whenever no trade-volume/value series is live.
4. If no metric row at all is live, the era's audited `stat` line (chapters.json) shows
   instead, unlabelled — era flavour, not a metric.

## trade-value, extended 2026-08-07

Was a single 2019 point. The ask was volume AND value across time, so the series now runs
1950–2022 on the WTO's own merchandise-trade series (world merchandise exports: US $62 bn in
1950, $6.4 tn in 2000, $24.9 tn in 2022), with the International Chamber of Shipping's 2019
seaborne figure kept alongside because it measures the sea leg specifically rather than all
merchandise trade. **Those two are not the same quantity and must not be read as one series** —
merchandise exports include everything moved by air, road, rail and pipeline. `trade-share`
(UNCTAD: about 80% of world merchandise trade by volume goes by sea) is what connects them.

⚠ AND NOTHING IS OFFERED BEFORE 1950 FOR VALUE, DELIBERATELY. Pre-modern aggregate trade values
are reconstructions with error bars wider than the numbers, and putting one in a readout beside
a measured figure would make both look equally solid. Rule 10: the era falls through to
"no aggregate record survives", which is the honest return.
