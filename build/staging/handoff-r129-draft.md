# Round 129 draft — filled in as the round closes. Final text goes to HANDOFF.md.

## Round 129 — 2026-08-19 — the record's loa owns the overhang, fleet-wide

**THE RAKE CLAMP IS IN, AND THE WHOLE CLASS IS CLOSED: 21 hulls drew past their own
cards by up to 6.15 m, and every one of them now draws its record LENGTH OVERALL to the
centimetre.** The class (r113/r115/r128): hull.js's loft granted stemRake·loa +
sternRake·loa of overhang ON TOP of the lwl, and nothing checked the sum against the
record. The fix is one scale in hullSurface() — min(1, (loa−lwl)/((stemRake+sternRake)·loa))
— applied to both branches of rake(), so the rakes become the SHAPE of the overhang and
the record's loa owns its SIZE. The authored stem:stern ratio survives; at scale 1 (the
ten at-or-under hulls, plus r128's two data-normalized ones) nothing moves, and the four
deep under-length hulls (wyoming −18.8) are untouched because the clamp only ever shrinks.
postLean (the rudder's lean down the sternpost) now reads H.rake(1.0) instead of
re-deriving sternRake·loa raw — one source of truth, or the rudder would lean past the
clamped post it hangs on.

**Measured, fleet-wide, before and after** (build/measure-fleet-loa-r129-{before,after}.txt,
one page load, planking x-span per hull): before — 21 of 33 over, yamato +6.15, clipper
+4.57, great-eastern +4.44, steamer +3.80, treasure-ship +2.60, dreadnought +2.43,
galleass +2.17, trireme +1.79, galley +1.70, cog +1.63, junk +1.12, dugout +0.95, dhow
+0.92, voyaging-canoe +0.90, ship-of-the-line +0.84, azzam +0.79, titanic +0.66, QM2
+0.60, carrack +0.56, endurance +0.31, caravel +0.20. After — 0 of 33 over; every clamped
hull at +0.00, every unmoved hull identical to the centimetre. Looked at (rule 1):
yamato and clipper profile_capture port broadsides — the bow still leans, the counter
still overhangs, both read as themselves; measure_ship on yamato (planking 263.00 exact,
extent +0.57 m of stem timber standing proud — the separate small class r128 named),
clipper (64.80 exact; extent past it is bowsprit and rig, which LOA rightly excludes),
great-eastern (extent 211.00, Δ 0.00 exactly), steamer (98.00, bowsprit past it).

**THE AUDIT ARM CAME WITH THE CLAMP, AS r128 ORDERED, AND IS PROVED BOTH WAYS.**
New rule 'drawn length beyond record loa': planking x-span > loa + max(0.25, 0.002·loa)
convicts. One-sided on purpose — the four under-length hulls are a research question the
rule must not prejudge. The round-70 lean rule now asks for the CLAMPED lean (the raw
product would convict the clamp itself — the audit-fights-the-app class, rule 8).
Clean run: 33/0 (build/staging/audit-r129-run1.txt). Injection
(Research/inject-loa-overrun.js, planking stretched 6% in x after build — the clamp
silently gone): 30 of 33 convict of exactly 'drawn length beyond record loa', and the
three spared are wyoming, preussen, slave-ship — the deep under-length hulls whose slack
exceeds 6%, exactly as the injection header predicts (build/staging/audit-r129-inject.txt).

**THE UNDER-LENGTH ARM IS ANSWERED FOR THE TWO SHIPS THAT MATTER — it is sparred length
wearing the hull's label.** Wyoming: 450 ft (137–140 m) is jibboom tip to spanker boom;
the hull is 350 ft (~107 m) on deck, 329.5 ft (100.4 m) between perpendiculars — so
hull.loa=140 is the sparred figure and the honest hull row is ~110/100.4 (en.wikipedia.org/
wiki/Wyoming_(schooner), bluejacketinc.com). Preussen: 147 m is overall WITH JIBBOOM; the
hull is 134.0 m (439.6 ft), 122 m between perpendiculars — the model's drawn 132.3 m is
within 1.7 m of the attested hull already (en.wikipedia.org/wiki/Preussen_(ship),
bruzelius.info). The data fix (next round, per-ship, with the card rows recut): loa
becomes the HULL's overall length, sparred length becomes its own labelled row.
Container/slave-ship are the other kind: their loa rows are honest hull LOA and the
authored rakes simply do not fill the record's allowance (container −4.9 on a class
whose LOA−LPP is ~17 m at the bow; slave-ship −2.5 against the Brookes plan's raked
stem and head). Those are geometry-authoring decisions needing their own sources.

**Frames: 34 of 61 moved, every one looked at or spot-classified, all 34 accepted with
per-frame reasons.** The big movers are the Shipwright frames of the clamped hulls — the
yard camera frames BY the hull, so a shorter hull reframes everything: ship-trireme
18.4%, ship-great-eastern 17.3%, ship-yamato 16.3%, ship-dreadnought 13.3%, ship-dugout
12.6%, ship-azzam 8.3%, shipwright-furled 8.2% — eleven diffs read (trireme,
great-eastern, dugout, yamato, furled, azzam, panokseon, map-floor, shipwright, action,
sea-dugout-floor) and every one is the same signature: the whole ship ghost-shifts, no
part missing, no BLANK. ship-trireme's CURRENT frame read in full: the card's 36.9 m and
the drawn hull finally agree on screen. Two subtleties worth keeping: ship-panokseon
(0.101%) moved although panokseon herself did not — the movement is the NEIGHBOURING
slip's clamped hull visible at frame edge; and the aboard/action/map movers are the same
class at sea — followed hulls, staged fleets and 1590 fleet tokens all draw the real
models, which shrank. The eight aboard-* frames of unmoved hulls (carrier, preussen,
wyoming...) and passage-sahul stayed green — the dugout at fz=70 moves less than the
0.05% limit where at fz=30 (sea-dugout-floor, 0.265%) it shows.

**Next, in order:** (1) Wyoming and Preussen data recut: hull loa 110/134, sparred
length as its own card row, lwl semantics checked per ship (sources above; rule —
the record beats a derivation, and the record now needs its own labels right).
(2) Container and slave-ship under-rake: author the missing overhang from the class
record / the Brookes plan. (3) The survey continues: panokseon boxPct 71 (towerx18),
galleass 70 (apostisx55, benchx52), galley 68. (4) Standing residuals: sekibune wasen
kaji (r121), gundeck normals (r118), Endurance forecastle (RMG J9266), Azzam crest
(r108), yakata curtain (r117), canoe floor frame; myeongnyang needs an Action baseline
(one-view blindness, r128).
