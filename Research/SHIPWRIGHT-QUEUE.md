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
voyaging canoe, carrack, ship of the line, treasure ship.
**Still to look at:** trireme · Roman merchantman · dhow · cog · caravel · fluyt · east indiaman ·
slave ship · clipper · steamer · container ship.

## Detail gaps against the reference bar

Ordered by how much each closes the gap per unit of work.

1. ~~Guns run out through the ports~~ — **done**, placed off the shader's own port formula.
2. ~~Stays, backstays and braces~~ — **done**, drawn from the spar positions actually placed.
   Still missing: sheets, tacks, halyards, lifts, and the topmast/topgallant shroud sets.
3. **Head and beakhead** — headrails, gammoning, the beakhead platform. The bow currently ends
   in a bare stem with a bowsprit stuck through it.
4. **Stern** — transom, quarter galleries, stern lights. Currently the hull simply stops.
5. **Ratlines as ladders.** They are `THREE.Line` segments; at close range they read as wire.
   Thin geometry instead.
6. **Plank seams and fastenings on the hull surface** — the shader draws strakes but no butts,
   no treenails, no caulking line.
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
