# The Shipwright — quality queue

Working list for the `/loop` raising the Shipwright to the reference bar. Each item gets
**verified by rendering and looking**, not by checking the code says the right thing.

## Errors found by looking (round 1)

| # | Ship | Error | State |
|---|------|-------|-------|
| 1 | Chinese junk | battened lug swung athwartships → sail passed through the hull | **fixed** |
| 2 | all fore-and-aft | `makeSail` applied the square-sail quarter-turn unconditionally | **fixed** |
| 3 | Chinese junk | canvas positioned by its centre at deck level → half below the waterline | **fixed** |
| 4 | voyaging canoe | crab-claw spars converged at the top — an inverted V | **fixed** |
| 5 | carrack | dhow's hull-length-yard rule applied to a lateen **mizzen** → mizzen bigger than the mainsail | **fixed** |
| 6 | every square rig | yards slung at 0.94 of their own segment → two-storey hole between deck and lowest sail | **fixed** |
| 7 | voyaging canoe | card says **double hull**; only one hull is drawn, and no crossbeams or platform | **fixed** |
| 8 | voyaging canoe | crab claw 4x too large — Pâris's kalia rule applied to Hōkūleʻa, whose 50 m² for the pair is on her own card. Spar now **solved from the attested area** (10.8 m) | **fixed** |
| 9 | all fore-and-aft | crab-claw leech drawn straight; it is cut deeply **hollow**, which is what lets hull-length spars carry a small area | **fixed** |
| 10 | Shipwright camera | fitted on the X extent alone — a 5.4 m-wide double canoe ran off screen | **fixed** |
| 22 | corbita | missing the **artemon**, the diagnostic feature of a Roman merchantman and the ancestor of the headsail | **fixed** |
| 19 | container ship | wooden gratings, a hand-spike capstan, **wales** and a ship's boat on a 400 m steel hull, labelled carvel. Fittings now gated on construction tradition | **fixed** |
| 20 | container ship | nothing above deck — no boxes, no accommodation, no bridge. The one hull whose cargo IS her architecture | **fixed** |
| 21 | engine-powered ships | build stages ran "masts → rigging → yards → **bent on**", congratulating a container ship on being able to sail | **fixed** |
| 15 | **every hull in the model** | the assembly slider told every visitor the ship was CARVEL, because `shellFirst` was wired and never set on anything. A feature that is wired but unset is worse than one that is missing — it asserts a default with the confidence of a fact | **fixed** |
| 16 | trireme, corbita, cog, dhow, canoe | shell-first, not frame-first | **fixed** |
| 17 | junk, treasure ship | neither — Chinese hulls are **bulkhead-first**, structure and watertight subdivision at once | **fixed** |
| 18 | steamer | an ocean steamer with **no funnel**, and its iron hull labelled "carvel" | **fixed** |
| 12 | trireme, corbita, cog, carrack | every square mast got THREE fidded tiers regardless of date — the trireme carried a **topgallant** and stood 38.4 m of rig over a 36.9 m hull. Tiers now derive from the type's date: 1 before 1400, 2 to 1580, 3 after | **fixed** |
| 13 | trireme | Steel's mast rule applied at L/B 9.7 gave a 20 m mast against Olympias's measured 11 m. `heightM` lets an attested mast override the rule | **fixed** |
| 14 | single-tier rigs | the lone yard was slung at 0.60 of the mast — the position of a course under two more sails — leaving the top 40% of the pole bare | **fixed** |
| 11 | junk, treasure ship | junk rigs fell through to the SQUARE-rig mast case and got three fidded segments. A junk steps ONE unstayed pole. The treasure ship carried a 64 m mast with a sail stopping halfway up it; now 39.7 m with the sail head at the truck | **fixed** |

## Verification

**An automated screen now covers the whole class** rather than relying on catching each one by
eye. It builds every vessel and asserts, per ship:

- no sail dips below `freeboard * 0.35` — the junk's half-submerged canvas would have tripped this
- no sail projects past `±0.72 × LOA` — catches canvas flying clear of the hull
- `rigTop / LOA` inside 0.30–1.35, and total span under 1.55 × LOA
- **sail orientation matches rig type** — square athwartships, junk/lateen/crab-claw fore-and-aft.
  This is the check that would have caught the junk directly.
- for junk rigs, sail head within a metre of the masthead

All 16 pass. The only flag is the container ship's `rigTop/LOA = 0.09`, which is correct — she
has no rig, only a superstructure.

Numbers cannot judge proportion, so ships still get looked at. **Rendered and checked:** junk,
voyaging canoe, carrack, ship of the line, treasure ship, trireme, cog, caravel, steamer,
container ship, Roman merchantman.
**Still to look at:** dhow · fluyt · east indiaman · slave ship · clipper. (East Indiaman now checked.) All remaining are standard
three-masted square-riggers on the same code path as the verified 74, so they are the lowest-risk
remaining — the detail gaps below are now worth more than further verification.

⚠ **Steel's mast rule is still applied to the clipper**, whose L/B of 5.9 is also outside its
domain — it gives Cutty Sark a ~38 m lower mast against a real ~29 m. `heightM` now exists to
fix that; it needs a sourced clipper figure.

## Detail gaps against the reference bar

Ordered by how much each closes the gap per unit of work.

1. ~~Guns run out through the ports~~ — **done**, placed off the shader's own port formula.
2. ~~Stays, backstays and braces~~ — **done**, drawn from the spar positions actually placed.
   Still missing: sheets, tacks, halyards, lifts, and the topmast/topgallant shroud sets.
3. **Head and beakhead** — headrails, gammoning, the beakhead platform. The bow currently ends
   in a bare stem with a bowsprit stuck through it.
4. **Stern — the COUNTER is in; the stern furniture wants another pass.** ~~Blocked on a hull-form change.~~ Resolved: the flare belongs entirely ABOVE the waterline, so Cw/Cp/Cb/Cm are untouched and no coefficient needed re-checking. Original diagnosis below, kept because the reasoning was the useful part. `buildStern` is written
   and its parts are right, but it is an appliqué on a hull whose planking tapers to a near-point
   at the sternpost, so the transom reads as a slab glued to the back however it is sized. Three
   widths were tried — an unbounded flare, an absolute 0.6 of beam, and the ship's own after-body
   half-breadth — and all three fail identically, because **the width was never the problem**.
   A square-sterned ship's hull FORM ends in a transom: `wl(u)` must not run to zero at u = 1.
   That means changing `hullSurface` and re-checking every vessel's `sternFineness` against its
   published coefficients, since a squarer stern changes Cw and therefore Cb. Own round.
   The code stays in the file, disabled at the call site, with the reason at the call site.
5. ~~Ratlines as ladders~~ — **done**. All standing rigging is merged prism geometry with a real diameter; 496 line objects became 6 meshes, so it is cheaper AND lit. LineBasicMaterial is unlit, which is why the old rigging never changed value in shadow.
6. ~~Plank seams and fastenings~~ — **done**. Staggered butts to the shift-of-butts rule, and treenails as grain disturbance rather than dots, since they are the same wood as the plank. Both frequencies are lengths turned into counts (7 m oak, 0.78 m room-and-space), so they scale with the ship. Verified at close range and at distance for aliasing.
7. **Furled sails** as a state, so a ship can be shown under bare poles or with courses handed —
   the references mostly show furled canvas on the yards.
8. **Anchors** catted at the bow, with cable.
9. **Mast bands, wooldings and the cheeks** at the hounds.
10. **Deck camber and a visible waterway** where the deck meets the frames.

## Rules this view is held to

- Every part carries its own `userData.part` — name, function, build stage. **No second list of
  labels**; the geometry is the source.
- Detail is generated from the same vessel spec and the same `surfacePoint()` as the globe token
  and the Yard silhouette. More members and finer tessellation is **detail**; a second set of
  dimensions would be **drift**.
- Capability figures in the panel come off the polar diagram the routing engine uses. If the
  panel is wrong about a ship's sailing, the ocean crossing is wrong too.

---

# NEW DIRECTION (August, 2026-08-02) — the Shipyard, and a much larger fleet

Two things, both larger than anything above. They change what this view IS.

## A. THE SHIPYARD: one line, true relative scale, camera pans along it

> "ALL ships in the shipyard essentially in a long line with all ships with real life proportions
> relative to each other — as users select different ships, the camera should pan across this line
> to show ships of increasing size/complexity, roughly on a time axis."

The bottom strip already carries the scale argument as bars. This makes it the **actual view**:
every hull built once, laid out along a single axis in date order, at true relative size, with the
camera flying along the line rather than cutting between isolated ships.

Why it is worth the work: **scale is the argument this project keeps failing to land.** A canoe
that reached Hawaii beside a 400 m box boat says more than any card. Right now you can only see
one ship at a time, so the comparison lives in a number nobody feels.

Design notes:
- Lay out on **x = date**, not on index — otherwise the 2,700-year gap between the trireme and
  the cog reads the same as the 40 years between the fluyt and the Indiaman.
- Ships are **many thousands of triangles each**; 16 fine builds at once will not run. Build fine
  only for the selected ship and its immediate neighbours; the rest get the coarse `buildShip`.
- The Shipwright's part-picking and assembly slider stay bound to the SELECTED ship.
- Keep a true-scale ruler along the line, because at true scale the small hulls are slivers and a
  viewer needs to know that is the point rather than a bug.

## B. MANY MORE SHIPS, AND NAMED ONES

> "Our ships should include general classes/types of ships across time, but also notable specific
> vessels like Titanic and others."

Sources to work from — review these and find comparable ones, including their graphics and
measured drawings for modelling:

- https://en.wikipedia.org/wiki/List_of_longest_ships
- https://en.wikipedia.org/wiki/List_of_longest_wooden_ships
- https://en.wikipedia.org/wiki/List_of_large_sailing_vessels
- https://en.wikipedia.org/wiki/Trireme
- https://en.wikipedia.org/wiki/Unmanned_surface_vehicle

⚠ The generator takes attested principal dimensions plus hull-form coefficients, so a NAMED ship
is no harder than a class — it is easier, because a named ship has real numbers. `Wyoming` (the
longest wooden ship, and she hogged so badly she leaked and sank, which is the whole argument for
iron); `Great Eastern`; `Titanic`; `Preussen`; `Cutty Sark`. And the modern end is missing
entirely: an unmanned surface vessel is the first hull in the model with **no crew at all**,
which is a genuine end-point for a story about people crossing oceans.

Rules that still apply: attested dimensions only, `heightM` where a mast is measured, and the
`build` tradition set per hull — a wooden ship that big is a different structural argument from
an iron one.
