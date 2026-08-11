# Yard diameters — the spar-maker's own rates

*Round 70, 2026-08-10. The class surfaced by IRON-MASTS.md §7 item 1: the drawn yards were
"several times too thin" on iron ships. The primary source shows the fault was fleet-wide —
every yard drew off the ship's beam, one girth per ship — and the fix is the same shape as
r68's mast law: a spar is as thick as its own length asks, at the rate its maker cut to.*

---

## 1. Steel 1794 — the wooden rates, read in the primary source

Source: maritime.org full text of *The Elements and Practice of Rigging and Seamanship*,
part 1 ("Proportional Diameters of Yards", adjacent to the mast tables r68 read). Read
2026-08-10.

> "Main and fore yard, at the slings, 7/10 of an inch to every yard in the length.
> Mizen-yard, 2/3 of the diameter of the main-yard.
> Topsail-yard, 5/8 of an inch to every yard in the length.
> Topgallant-yard, 6/10 of an inch to every yard in the length.
> Spritsail-yard, the same diameter as the fore-topsail-yard. …
> Studdingsail-yards, one inch in diameter to every 5 feet in the length.
> Cross-jack-yard, the same diameter as the fore-topsail-yard."

In L/D terms: course yards L/51.4, topsail yards L/57.6, topgallant yards L/60. The royal
has **no diameter row** — a royal was a flying kite in 1794 — so the model derives it at the
topgallant rate, labelled derived. Steel's taper quarters for "yards in general" are 30/31,
7/8, 7/10, **3/7** at the arm — which is Murray 1754's sector division (1.000, 0.964, 0.900,
0.700, 0.400) within a fortieth, so the drawn Murray profile stands for wood.

## 2. The steel rate — already attested twice in IRON-MASTS.md §2

Peking's 2017–2019 re-masting delivery list (Stabikon) cuts **every steel yard to length/50
at the slings and length/100 at the arms** — six spar classes, exact — and Great Eastern's
1858 iron lower yard sits at 50.4 on the same measure. One constant across two materials and
53 years, and it is within 3% of Steel's wooden course rate: the yard's law barely moved in
a century of material change. Applied to `iron: true` hulls at length/50 for every tier,
tube parallel through the middle half, coned to half the slings diameter at the arms
(= length/100 exactly).

## 3. What was actually drawn, measured before the change (probe-yards.js)

Every crossed yard on a hull drew the SAME diameter — `beam × 0.0063` — and L/D ran 100 to
500: the 74's main course 28.8 m × 0.092 m (L/D 313), Preussen's course 26.3 m × 0.103
(L/D 255, record rolls 0.53), the trireme's main yard L/D 403, Endurance's course L/D 503.

**And the Murray taper was dead code.** `CylinderGeometry` defaults to ONE height segment,
so its only ring vertices sit at the two ends: the per-vertex taper evaluated at t = 1
everywhere, the whole profile collapsed to its arm value (0.4 × k-renormalisation = the
uniform 0.9 factor), and each yard drew as a parallel stick at what the code believed was
the arm diameter. The card text "octagonal amidships, tapers to two fifths at the arms"
described geometry that had never existed. The fix gives the cylinder 8 height segments, so
the profile has vertices to land on — a class worth remembering: **a per-vertex profile is
only as real as the vertices under it.**

## 4. The law as applied

- Wood, by tier at the spar's own length: course 7/10 in per yard of length, topsail 5/8,
  topgallant 6/10, royal at the topgallant rate (derived, no 1794 row).
- The wooden mizzen's lowest yard is the **crossjack**, at the fore-topsail rate — a 74
  crossed no mizzen course (`isMizzen` reuses r68's aftermost-station test).
- The **mixed-rig lateen mizzen yard** (carrack) takes "Mizen-yard, 2/3 of the diameter of
  the main-yard" — the one lateen spar Steel's table laws. Drawn heel = 2/3 of the main
  yard's rate diameter; on the carrack this lands within 2% of the old B-based guess.
- Iron/steel hulls: length/50 at the slings, length/100 at the arms, all tiers; card says
  the rate is attested and the figure derived from it.
- Applying 1794 rates outside Steel's domain (trireme −480 to Endurance 1912) is inference,
  recorded in the code comment, like the r68 mast law.
- Audit rule **"a yard cut from the ship's beam"**: measures every drawn athwartships
  'Yard' mesh (junk/crab-claw head spars rake along the ship and are excluded by
  orientation; lateen yards carry their own name), ranks by height per mast station, and
  fires past 35% off the rate. Injection-proven: reverting to `beam × 0.0063` fires 103
  problems on all 12 square-yard ships — every yard individually.

## 5. Candidates NOT done this round

1. **Gaff and boom diameters** — Steel's quarter table has a Gaff row (40/41, 11/12, 4/5,
   5/9), so a gaff diameter rate exists in his tables; not retrieved this round. Great
   Eastern's six gaffs and every schooner boom still draw B-based.
2. **The pure lateen yard** (dhow, caravel) — a composite spar of two or three trees; no
   rate in Steel (his mizen-yard row is the square-rigger's crossed mizzen). Pâris is the
   place to look.
3. **Bowsprit diameter** — Peking's is attested (631 mm over 18.8 m, L/D 29.8, §2 table);
   the drawn bowsprit is its own B-based rule, and iron hulls draw no bowsprit at all
   (IRON-MASTS.md §7 item 3).
4. Studdingsail yards at 1 inch per 5 ft if B10 stunsails are ever built.
