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

~~⚠ Steel's mast rule is still applied to the clipper~~ — **resolved round 51**: `heightM` set
per mast (23.2 / 25.9 / 22.3), ratios kept, the scale anchored to RMG's attested 47 m main
truck; the drawn card prints 46.9 m deck to truck.

## Detail gaps against the reference bar

Ordered by how much each closes the gap per unit of work.

1. ~~Guns run out through the ports~~ — **done**, placed off the shader's own port formula.
2. ~~Stays, backstays and braces~~ — **done**, drawn from the spar positions actually placed.
   Still missing: sheets, tacks, halyards, lifts, and the topmast/topgallant shroud sets.
3. ~~Head and beakhead~~ — **done** (this entry sat stale for rounds after the work shipped:
   knee, headrails, timbers, platform and gammoning are all in `buildHead`, gated on the
   `head:` data field, r-"the head ships"). The r58 lesson: check the CODE before trusting
   this list.
4. ~~Stern — the stern furniture~~ — **done, r58.** The counter flare was in (`S.transom`, in
   `surfacePoint` itself) but the fitted plate was still sampled at u = 0.985 — and the skin
   runs to u = 1.0, so the plate, the five lights keyed to its bounding box and the gallery
   barrels all stood INSIDE the hull. From astern the 74 was a bare planked wall, and no
   baseline bearing ever looked. Rebuilt off `surfacePoint(u = 1)` directly (no plate — the
   hull's own shader-planked end cap IS the face): stern-light tiers per the new `sternLights`
   data field (74 and Indiaman 2, fluyt 1, and deliberately none on the cog, the 1501 nau,
   Wyoming or the clipper), mouldings banding each tier, quarter-gallery drums lofted round
   the corner line with cornice and panes, and a taffrail with balusters. Audit rule added
   ("stern furniture buried in the hull" + declared-but-not-drawn), proven by fault injection;
   standing baseline `shipwright-astern` watches the class. Original diagnosis kept below in
   git history; the useful part — the width was never the problem, the FORM was — became the
   counter flare that already shipped.
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


## The weathered sailcloth that was never in the artefact — 2026-08-02

⚠ **Commit `b71ecee` claimed the flax base was darkened 0.815 → 0.680 with a grime term. It was not.**
That commit touched only `hull.js` and `index.html`. The shader had been extracted to
`web/shaders/SAIL_FRAG.frag.glsl` one commit earlier (`d7ab57c`), so `hull.js` no longer held the
source — it reads `SHADERS['SAIL_FRAG.frag']`. The edit had nowhere to land. The live shader served
`0.815` and no grime for four subsequent deploys, and the commit message and the report to August
both asserted otherwise.

**How it survived verification.** I looked at a screenshot and wrote "the canvas is a buff rather
than white." That is a judgement about appearance, and 0.815 under ACES tone mapping and a warm
transmission term produces exactly that impression. **A visual check can confirm a change that did
not happen, whenever the old state and the new state fall on the same side of the adjective you
used.** The check that would have caught it in one second — `grep 0.680` against the deployed
bundle — is the check I did not run, and it is the one the standing rule asks for: verify the live
artefact, not the intention.

**The generated-file rule now has teeth.** `web/js/shaders.js` carries a "GENERATED — do not edit"
header, and the source of truth is `web/shaders/*.glsl`. Any shader change is: edit `.glsl` →
`glsl.py check` (a real compiler) → `glsl.py bundle` → frame ratchet → deploy → grep the live file.

## The frame ratchet has a cold-cache hole — 2026-08-02

`globe-default` reported **1.087% changed** on the first run after a rebuild and **0.000% on every
run after**, twice confirmed. The diff was entirely text labels, some crisp and some doubled: the
frame was captured before the webfont finished loading, so the label layer was laid out with
fallback metrics. `window.__FRAME_READY` gates on first paint plus the progressive terrain
upgrades — **not on fonts**.

Consequence: a cold first run can report a false CHANGED, and accepting that baseline would commit
a fallback-font frame as the reference. Re-run before classifying any label-only diff. The real fix
is for `__FRAME_READY` to await `document.fonts.ready`.


## ⚠ THE PROBE THAT BROKE THE THING IT WAS MEASURING — 2026-08-03

I reported "THE SHIP BOB DOES NOT RUN" as a confirmed bug, with supporting measurements: `SW.on`
true, stage 7, `clockS()` advancing 206→210, `FROZEN` false, `e.obj.position.y` pinned at
−0.2421, and a property-setter probe recording **zero writes in 400 ms**. Every one of those
readings was real. The conclusion was false.

**The bob works.** On a clean page, hidden tab: the loop ticks, `uTime` advances 6 s, and Great
Eastern heaves 1.76 m (−0.94 to +0.82).

What happened is the worst version of this session's recurring failure. To find out who was
writing `position.y`, I replaced it with an accessor via `Object.defineProperty`. That accessor
threw inside the frame callback, which skipped `armNext()`, **which killed the animation loop** —
the exact failure mode already documented in this file from an earlier round ("a bare return in
the frame loop skipped requestAnimationFrame and froze the whole app"). I then spent the rest of
the round measuring a dead loop and concluding the application was broken.

**The instrument did not merely fail to observe the phenomenon. It created the condition I then
diagnosed and reported.**

Two rules follow, and they are cheap:

1. **Never instrument inside the frame callback.** Anything that can throw in a rAF/timeout chain
   takes the chain with it. Sample state from outside the loop instead — read the value on a
   timer, do not intercept the write.
2. **Before concluding a subsystem is broken, verify the loop that drives it is alive.** One
   check: does any per-frame uniform advance? If nothing is ticking, nothing downstream can be
   judged, and every reading below that point is a reading of a stopped machine.

Related and still true: the tab was hidden throughout, and `nextFrame()`'s `setTimeout` fallback
handled that correctly. The hidden tab was not the fault; my probe was.
