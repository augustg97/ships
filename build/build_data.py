#!/usr/bin/env python3
"""build_data.py — the authored and derived layers the app draws on the ocean.

Emits into web/data/:
  ports.json      the modern World Port Index set, filtered, plus authored historical ports
  chapters.json   the narrative eras that drive the timeline and the readout
  vessels.json    the technology tree, with the POLAR DIAGRAM each hull is routed with
  battles.json    fleet actions, with the wind at each phase
  about.json      the About panel, including what this model does not know

EVERY NUMBER HERE IS SOURCED, and where the sources disagree the card carries the range and
names the parties. Three of these were checked at kickoff and did NOT survive:
  * "Brouwer cut Batavia from 12 months to 6" — the DAS voyage records say 323-338 days to
    252-260. The saving is ~2.5 months. See SCOPE §14.
  * Zheng He's 138 m treasure ship — the dimensions first appear in a NOVEL of 1597, and the
    Longjiang dock that supposedly built them is 41 m wide against a claimed 52 m beam.
  * "Six points off the wind" for a square rig is a HEADING, not course made good. GPS-measured
    replicas make good 71-90 deg, and above force 4 they make no ground to windward at all.

Run: python3 build_data.py
"""
from __future__ import annotations

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "..", "web", "data")


# ═══════════════════════════════════════════════════════════ POLARS ═══════
#
# A polar is boat speed THROUGH THE WATER as a function of true wind speed and true wind angle.
# It is the whole of a hull's character as far as the routing engine is concerned.
#
# We store, per rig: the best course MADE GOOD to true wind (already including leeway, because
# that is the quantity that decides whether a passage is possible), the speed at a set of wind
# angles in a reference 8 m/s breeze, and how the pointing degrades as it blows harder.
#
# ⚠ THE MOST IMPORTANT CORRECTION IN THIS FILE. The literature's "six points = 67.5 deg" for a
# square rig is a HEADING angle. Willis (Northern Mariner XIII.4, 2003) works it through from
# Royal Navy logs: six points close-hauled plus one point of leeway is 78.75 deg made good in
# the best case, and seven points plus one point is 90 deg — no windward progress whatever.
# GPS-instrumented replicas agree: Roar Ege 72 deg, Oselven 73-75.5 deg, Hanse Cog 74-76 deg
# in a gentle breeze and LOSING ground in 20 knots, Ma'agan Mikhael II 71 deg at force 2, 81 at
# force 3 and 90 at force 4. Palmer (IJNA 38.2, 2009) records the 80-gun Jean Bart unable to
# point closer than 110 deg above force 6.
#
# That degradation is the single most consequential fact in the whole model: it is why the
# Atlantic had to be crossed the long way round the trade winds.

def polar(beat_deg, beat_deg_hard, spd, name, note):
    """beat_deg = best course made good to true wind in a light-moderate breeze;
       beat_deg_hard = the same when it blows hard (force 5+);
       spd = dict of {true wind angle: knots at 8 m/s}, interpolated and scaled."""
    return {"beatLight": beat_deg, "beatHard": beat_deg_hard, "curve": spd,
            "rigNote": note, "rig": name}


RIGS = {
    # ── Oceanic: the crab claw on a double hull. The only pre-modern rig that settles a third
    # of the planet against the prevailing wind. Irwin (Archaeology in Oceania 58, 2023) built a
    # velocity prediction program on wind-tunnel tests and matched it to Hokule'a's real logs.
    "crabclaw": polar(75, 82, {0: 2.2, 30: 2.4, 45: 2.9, 60: 3.4, 75: 3.6, 90: 4.2,
                               110: 4.8, 120: 4.9, 135: 4.6, 150: 4.0, 180: 3.2},
                      "crab claw on a double hull",
                      "Poor by modern standards, positive by ancient ones — and positive is "
                      "the whole argument, because it is what lets a canoe beat back the way "
                      "she came. Fastest on a broad reach, not before the wind."),

    # ── Square rig. Willis's arithmetic, and the replicas agree with it.
    "square": polar(80, 95, {0: 1.0, 30: 1.4, 45: 2.2, 60: 3.0, 75: 3.9, 90: 4.8,
                             110: 5.6, 120: 5.8, 135: 5.5, 150: 4.9, 180: 4.2},
                    "square rig",
                    # ⚠ The panel prints beatLight and beatHard immediately above this line, so
                    # a note that restates them is not prose, it is a SECOND COPY of the number —
                    # and it had already drifted: this said 78–79°/90° while the polar says 80°/95°.
                    # The note's job is to say what the figures cannot.
                    "The famous \"six points\" is 67.5° — and it is a HEADING. What she makes "
                    "good is the figure above, and above force 4 she loses ground to leeward "
                    "faster than she gains it."),

    # ── Fore-and-aft: lateen and settee. Whitewright (IJNA 40.1, 2011) puts the lateen at
    # 55–65° — but those are HEADING angles, and Gal et al. (IJNA 2023) show the corrected
    # course made good is much worse. The lateen's advantage over square rig is real and
    # smaller than the textbooks say.
    "lateen": polar(72, 84, {0: 1.4, 30: 2.0, 45: 2.9, 60: 3.6, 75: 4.1, 90: 4.5,
                             110: 4.7, 120: 4.6, 135: 4.2, 150: 3.6, 180: 2.9},
                    "lateen / settee",
                    "Better than a square rig, and by less than the textbooks claim — their "
                    "55–65° is a heading. The cost is manpower: tacking means walking the whole "
                    "yard round the mast."),

    # ── Junk. Instrumented polars from the Junk Rig Association put a junk at 75–80% of a
    # modern Bermudan's windward VMG — the best pre-industrial rig for windward work, and
    # self-reefing, so it needs a fraction of the crew.
    # ── Gaff schooner. Points high, and far more importantly is worked entirely from the
    # DECK — nobody goes aloft to reef a gaff sail. Wyoming carried 3,730 tons on six masts
    # with a crew of THIRTEEN where a square-rigged ship of that tonnage wanted thirty or
    # more. That ratio, not speed, is what sent the American coal and lumber trades to
    # schooners, and it is why they got so long.
    "gaff": polar(55, 68, {0: 1.0, 30: 2.2, 45: 4.4, 60: 6.0, 75: 7.0, 90: 7.8,
                           110: 8.2, 120: 8.0, 135: 7.2, 150: 6.2, 180: 5.0},
                  "gaff schooner",
                  "Points high and is worked entirely from the deck — nobody goes aloft to "
                  "reef a gaff sail. That is the whole economic argument for the rig: the "
                  "crew, not the speed."),
    "junk": polar(62, 70, {0: 1.6, 30: 2.4, 45: 3.3, 60: 4.0, 75: 4.4, 90: 4.7,
                           110: 4.9, 120: 4.8, 135: 4.5, 150: 3.9, 180: 3.2},
                  "battened lug (junk)",
                  "The battens do it: they make the sail self-reefing and let it set flat, so "
                  "it beats a square rig to windward on a fraction of the crew — about 75–80% "
                  "of Bermudan performance."),

    # ── Oar. Not a sail at all, and that is the point: a galley's polar is nearly independent
    # of wind, which is exactly why galleys held the Mediterranean for two thousand years and
    # were useless in the Atlantic. Olympias's Final Report (Rankov 2012) puts the sprint at
    # 8.3 kn — NOT the 8.9 kn widely quoted, which was one momentary GPS reading — and the
    # sustainable cruise at about 5.4 kn, falling to 2.9 kn against a headwind and a metre of sea.
    "oar": polar(30, 45, {0: 3.4, 30: 3.6, 45: 3.9, 60: 4.2, 75: 4.4, 90: 4.6,
                          110: 4.8, 120: 4.9, 135: 4.8, 150: 4.6, 180: 4.4},
                 "oars, with a square sail for fair winds",
                 "A galley goes where it likes and not far, and the figure above is her SAILING "
                  "speed — the sail is for fair winds only. Under oar: "
                 "8.3 kn sprint, 5.4 kn cruise, and about 2.9 kn into a headwind with a metre "
                 "of sea — measured on the reconstruction Olympias, which fell short of what "
                 "the ancient sources imply and is thought to be ~10% too short in the hull."),

    # ── Steam and after. The wind stops mattering, and thirty years later the world map of
    # trade has been redrawn.
    "steam": polar(0, 0, {0: 9.0, 30: 9.0, 45: 9.2, 60: 9.4, 75: 9.5, 90: 9.6,
                          110: 9.6, 120: 9.6, 135: 9.5, 150: 9.3, 180: 9.0},
                   "compound steam",
                   "Does not care about the wind. Its constraint is coal: the bunker fraction, "
                   "not the weather, decides where it can go."),
    "motor": polar(0, 0, {a: 16.0 for a in (0, 30, 45, 60, 75, 90, 110, 120, 135, 150, 180)},
                   "diesel motorship",
                   "Weather is a delay, not a route."),
}


# ══════════════════════════════════════════════════════════ HULL FORM ═════
#
# What the procedural generator builds each ship from. These are the vessel's ATTESTED
# principal dimensions plus hull-form coefficients, and where a coefficient is derived rather
# than published the derivation is Cb = displacement / 1.025 / (L·B·T) and it is marked.
#
# Every card states which of its numbers are attested and which inferred. A generated hull that
# claimed more precision than its inputs have would be worse than no hull at all.
#
#   cm            midship section coefficient — solved into a superellipse exponent
#   wlPower       how full the waterline is toward the ends (2 = parabolic, higher = longer
#                 parallel midbody)
#   forefoot/run  how much of the length the rising floor occupies forward and aft
#   tumblehome    fraction of half-beam lost between waterline and deck. A ship of the line is
#                 severe (~0.22); a clipper is nearly nothing.
#   masts[].height  lower-mast length as a MULTIPLE OF BEAM — the rule shipwrights actually
#                 worked to (Steel, *Elements and Practice of Rigging and Seamanship*, 1794)

# ── THE THREE TRADITIONS ──────────────────────────────────────────────────────────────────
# `build` is how the hull is put together, and it is not a detail of process — it decides what
# the ship can become.
#
#   shell     The planking shell is built FIRST and holds the shape; light frames go in after,
#             into a hull whose form exists only in the shipwright's eye and hands. Mediterranean
#             mortise-and-tenon (trireme, corbita), northern clinker (cog), and the sewn hulls of
#             the Indian Ocean and the Pacific all work this way. Superb hulls — and they do not
#             scale, because the shell must carry the building loads.
#
#   frame     Frames are raised on the keel FIRST and the planking is fastened to them. The shape
#             is decided on a drawing floor before a plank is cut, which is what makes a 74
#             reproducible, contractable, and buildable by yards that have never seen one.
#
#   bulkhead  The Chinese way, and a third thing entirely: transverse BULKHEADS go up first and
#             the planking is fastened to them. They are structure and subdivision at once, so a
#             junk had watertight compartments centuries before Europe thought of them — hole one
#             compartment and the ship swims home.
#
# ⚠ The Shipwright previously told every visitor that every hull in the model was carvel, because
# the flag existed and was never set on anything.
def hull(**k):
    d = dict(wlPower=2.4, stemFineness=0.05, sternFineness=0.12,
             forefoot=0.30, run=0.32, riseF=0.55, riseA=0.45,
             sheerBow=0.9, sheerStern=0.55, tumblehome=0.06,
             stemRake=0.03, sternRake=0.02, strakes=24,
             copper=False, copperAge=0.55, chequer=False, gunDecks=0,
             iron=False, topside="#5b4a33", bowsprit=0.0, steeve=22, masts=[],
             build="frame")
    d.update(k)
    return d


# `transom` is the extra half-breadth the topsides FLARE OUT to at the taffrail, as a fraction
# of half-beam. It is the counter, and it is what makes a square stern square. Round-sterned and
# double-ended hulls — the trireme, the dhow, the canoe, the junk, the caravel — do not have one
# and get no value here. The cog is the interesting case: a flat transom stern on a clinker hull,
# which is exactly what let the Hanse hang a stern rudder on it.
HULLS = {
  # LOA 36.9, beam 5.5, draught 1.25, displacement 47 t (Olympias, as built).
  # Cb = 47/1.025/(36.9·5.5·1.25) = 0.18 — extraordinarily fine, and the reason a trireme
  # could be driven at 8 knots by muscle alone.
  "trireme": hull(build="shell", loa=36.9, lwl=35.0, beam=3.8, draught=1.25, freeboard=1.45, cm=0.52,
                  wlPower=3.0, stemFineness=0.02, sternFineness=0.03,
                  forefoot=0.22, run=0.24, riseF=0.70, riseA=0.62,
                  sheerBow=1.0, sheerStern=0.5, tumblehome=0.10,
                  stemRake=0.045, sternRake=0.055, strakes=18, topside="#6b5533",
                  # Olympias's mast is ~11 m and stows on deck; Steel's rule would give 20 m on this
                  # hull, which is what happens when an 18th-century warship formula meets L/B 9.7.
                  oarBanks=3, oarsPerBank=27,
                  masts=[dict(at=0.42, heightM=11.0, rig="square", rake=2, shrouds=3)]),

  # Skuldelev 2: 30 m × 3.8 m, draught ~1.0, sail 112 m². L/B 7.9 — a hull built to be rowed
  # and sailed, and shallow enough to be beached anywhere.
  "voyaging-canoe": hull(build="shell", loa=19.0, lwl=18.0, beam=1.05, draught=0.75, freeboard=0.75, cm=0.62,
                  wlPower=3.2, forefoot=0.28, run=0.30, riseF=0.55, riseA=0.50,
                  sheerBow=0.5, sheerStern=0.5, tumblehome=0.02, strakes=10,
                  stemRake=0.05, sternRake=0.05, topside="#6a4f34",
                  # ⚠ TWO HULLS. The card has always said "Austronesian double hull"; the model drew one, which
                  # is not a detail but the whole naval architecture — 1.05 m of beam on 19 m of length
                  # has no stability whatever on its own. Hōkūleʻa's hulls are ~5.4 m apart.
                  doubleHull=True, hullSep=5.4, sailAreaEach=25.0,
                  masts=[dict(at=0.46, height=0.95, rig="crabclaw", rake=6, shrouds=2)]),

  # Bremen cog, 1380: 23.3 × 7.6 × 2.25 m. Flat-bottomed so it could take the ground on a tidal
  # flat and be unloaded at low water — which is what the Hanse ports needed.
  "cog": hull(transom=0.30, build="shell", loa=23.3, lwl=20.5, beam=7.6, draught=2.25, freeboard=2.01, cm=0.80,
              wlPower=2.0, stemFineness=0.20, sternFineness=0.24,
              forefoot=0.34, run=0.34, riseF=0.30, riseA=0.28,
              sheerBow=1.2, sheerStern=0.6, tumblehome=0.04, strakes=14,
              stemRake=0.10, sternRake=0.09, topside="#5a4227",
              masts=[dict(at=0.46, height=0.72, rig="square", rake=0, shrouds=4)]),

  "corbita": hull(build="shell", loa=40.0, lwl=35.0, beam=9.0, draught=3.4, freeboard=2.4, cm=0.62,
              wlPower=2.4, forefoot=0.30, run=0.34, riseF=0.62, riseA=0.56,
              sheerBow=0.9, sheerStern=0.5, tumblehome=0.08, strakes=18,
              stemRake=0.05, sternRake=0.07, topside="#63492c",
              masts=[dict(at=0.44, height=0.62, rig="square", rake=0, shrouds=3),
                     # ── THE ARTEMON, and it is the diagnostic feature of the type ──────────
                     # A small square sail on a mast raked sharply forward over the bow. Every
                     # Roman relief of a merchantman shows it — Ostia, the Torlonia relief, the
                     # Sidon sarcophagus — and it is not auxiliary canvas. Set that far forward of
                     # the hull's centre of lateral resistance it acts as a LEVER: trim it and the
                     # bow falls off the wind without touching the steering oars. That is what let
                     # a corbita be handled at all, and it is the direct ancestor of the headsail
                     # every sailing vessel since has carried.
                     dict(at=0.10, height=0.30, rig="square", rake=-48, shrouds=0, only=1)],
              bowsprit=0.16, steeve=12),

  "dhow": hull(build="shell", loa=26.0, lwl=22.5, beam=6.4, draught=2.4, freeboard=2.0, cm=0.68,
              wlPower=2.6, stemFineness=0.03, sternFineness=0.18,
              forefoot=0.34, run=0.30, riseF=0.60, riseA=0.40,
              sheerBow=1.1, sheerStern=0.55, tumblehome=0.05, strakes=16,
              stemRake=0.13, sternRake=0.04, topside="#6d5333",
              masts=[dict(at=0.18, height=0.9, rig="lateen", rake=0, shrouds=3),
                     dict(at=0.64, height=0.52, rig="lateen", rake=0, shrouds=2)]),

  # Quanzhou ship, sank c.1272: surviving hull 24.2 × 9.15 × 1.98, reconstructed ~34 m LOA,
  # ~380 t displacement, 12 bulkheads and 13 watertight compartments.
  "junk": hull(build="bulkhead", loa=34.0, lwl=29.0, beam=9.8, draught=3.3, freeboard=3.0, cm=0.70,
              wlPower=2.2, stemFineness=0.24, sternFineness=0.30,
              forefoot=0.30, run=0.30, riseF=0.48, riseA=0.38,
              sheerBow=1.1, sheerStern=0.9, tumblehome=0.03, strakes=20,
              stemRake=0.08, sternRake=0.10, topside="#5e4326",
              masts=[dict(at=0.18, height=0.86, rig="junk", rake=0, shrouds=0),
                     dict(at=0.64, height=0.58, rig="junk", rake=0, shrouds=0)]),

  # Drawn at the DEFENSIBLE length (Church, Sleeswyk, Xin Yuan'ou: 50–76 m), not the 138 m
  # that first appears in a novel of 1597. The card carries both.
  "treasure-ship": hull(build="bulkhead", loa=70.0, lwl=60.0, beam=18.0, draught=5.2, freeboard=5.4, cm=0.80,
              wlPower=2.2, stemFineness=0.24, sternFineness=0.30,
              forefoot=0.30, run=0.30, riseF=0.32, riseA=0.24,
              sheerBow=1.6, sheerStern=1.3, tumblehome=0.03, strakes=26,
              stemRake=0.08, sternRake=0.10, topside="#5e4326",
              masts=[dict(at=0.15, height=0.62, rig="junk", rake=0, shrouds=0),
                     dict(at=0.52, height=0.88, rig="junk", rake=0, shrouds=0),
                     dict(at=0.83, height=0.66, rig="junk", rake=0, shrouds=0)]),

  "caravel": hull(loa=23.0, lwl=19.5, beam=6.2, draught=2.0, freeboard=2.1, cm=0.70,
              wlPower=2.5, forefoot=0.32, run=0.32, riseF=0.52, riseA=0.46,
              sheerBow=1.0, sheerStern=0.5, tumblehome=0.07, strakes=16,
              stemRake=0.09, sternRake=0.06, topside="#6a4f30",
              masts=[dict(at=0.115, height=0.82, rig="lateen", rake=0, shrouds=3),
                     dict(at=0.556, height=0.68, rig="lateen", rake=0, shrouds=3),
                     dict(at=0.85, height=0.46, rig="lateen", rake=0, shrouds=2)],
              bowsprit=0.14, steeve=20),

  "carrack": hull(transom=0.34, loa=42.0, lwl=35.0, beam=11.0, draught=4.6, freeboard=4.4, cm=0.76,
              wlPower=2.2, stemFineness=0.10, sternFineness=0.20,
              forefoot=0.32, run=0.30, riseF=0.42, riseA=0.34,
              sheerBow=2.0, sheerStern=1.6, tumblehome=0.17, strakes=22,
              stemRake=0.11, sternRake=0.07, topside="#5b4327",
              masts=[dict(at=0.115, height=0.836, rig="square", rake=-3, shrouds=4),
                     dict(at=0.556, height=0.94, rig="square", rake=1, shrouds=6),
                     dict(at=0.85, height=0.806, rig="lateen", rake=4, shrouds=3)],
              bowsprit=0.26, steeve=26),

  "fluyt": hull(transom=0.46, loa=32.0, lwl=27.5, beam=6.6, draught=3.1, freeboard=3.0, cm=0.82,
              wlPower=3.0, stemFineness=0.14, sternFineness=0.22,
              forefoot=0.28, run=0.28, riseF=0.32, riseA=0.28,
              sheerBow=1.2, sheerStern=0.9, tumblehome=0.284, strakes=20,
              stemRake=0.07, sternRake=0.05, topside="#5d452a",
              masts=[dict(at=0.115, height=0.907, rig="square", rake=-2, shrouds=4),
                     dict(at=0.556, height=1.02, rig="square", rake=1, shrouds=5),
                     dict(at=0.85, height=0.874, rig="lateen", rake=4, shrouds=3)],
              bowsprit=0.22, steeve=24),

  "east-indiaman": hull(transom=0.40, loa=50.0, lwl=43.0, beam=12.4, draught=5.6, freeboard=4.6, cm=0.8,
              wlPower=2.6, stemFineness=0.12, sternFineness=0.20,
              forefoot=0.28, run=0.30, riseF=0.36, riseA=0.30,
              sheerBow=1.6, sheerStern=0.9, tumblehome=0.15, strakes=26,
              stemRake=0.08, sternRake=0.05, copper=True, copperAge=0.5,
              chequer=True, gunDecks=1, topside="#4a3a26",
              masts=[dict(at=0.115, height=0.853, rig="square", rake=-2, shrouds=6),
                     dict(at=0.556, height=0.96, rig="square", rake=1, shrouds=8),
                     dict(at=0.85, height=0.823, rig="square", rake=4, shrouds=5)],
              bowsprit=0.24, steeve=22),

  # 74-gun third rate: gundeck 168–176 ft, beam 47–48 ft, 1,600–1,750 tons BOM.
  # Cb ≈ 0.51 derived from Victory's dimensions and displacement — exactly where the
  # literature expects a ship of the line to sit.
  "ship-of-the-line": hull(transom=0.42, loa=57.0, lwl=51.0, beam=14.6, draught=6.6, freeboard=5.4, cm=0.8,
              wlPower=2.6, stemFineness=0.12, sternFineness=0.18,
              forefoot=0.26, run=0.28, riseF=0.34, riseA=0.28,
              sheerBow=1.8, sheerStern=0.9, tumblehome=0.139, strakes=30,
              stemRake=0.08, sternRake=0.04, copper=True, copperAge=0.45,
              chequer=True, gunDecks=2, topside="#3f3222",
              masts=[dict(at=0.115, height=0.889, rig="square", rake=-2, shrouds=7),
                     dict(at=0.556, height=1.0, rig="square", rake=1, shrouds=9),
                     dict(at=0.85, height=0.857, rig="square", rake=5, shrouds=6)],
              bowsprit=0.26, steeve=22),

  "slave-ship": hull(transom=0.38, loa=30.0, lwl=26.0, beam=8.0, draught=3.6, freeboard=3.0, cm=0.80,
              wlPower=2.6, forefoot=0.28, run=0.30, riseF=0.38, riseA=0.32,
              sheerBow=1.2, sheerStern=0.6, tumblehome=0.13, strakes=22,
              copper=True, copperAge=0.6, topside="#4c3b28",
              masts=[dict(at=0.115, height=0.871, rig="square", rake=-2, shrouds=5),
                     dict(at=0.556, height=0.98, rig="square", rake=1, shrouds=6),
                     dict(at=0.85, height=0.84, rig="square", rake=4, shrouds=4)],
              bowsprit=0.22, steeve=22),

  # Cutty Sark, 1869: 64.8 × 10.97 × 6.10, 963 gross register tons. Cb ≈ 0.48 derived, L/B 5.9
  # — a long, fine, hard-driven hull with almost no tumblehome.
  "clipper": hull(transom=0.30, loa=64.8, lwl=59.0, beam=10.97, draught=6.10, freeboard=3.4, cm=0.764,
              wlPower=3.0, stemFineness=0.03, sternFineness=0.08,
              forefoot=0.30, run=0.36, riseF=0.50, riseA=0.44,
              sheerBow=0.95, sheerStern=0.48, tumblehome=0.024, strakes=28,
              stemRake=0.10, sternRake=0.06, copper=True, copperAge=0.25,
              topside="#22201d",
              # ⚠ heightM: at L/B 5.9 Steel's rule gives Cutty Sark a 38 m lower mast against a
                 # real ~29 m. Outside its domain it is dominated by length.
                 masts=[dict(at=0.115, heightM=26.0, rig="square", rake=-1, shrouds=7),
                     dict(at=0.556, heightM=29.0, rig="square", rake=2, shrouds=9),
                     dict(at=0.85, heightM=25.0, rig="square", rake=5, shrouds=6)],
              bowsprit=0.22, steeve=14),

  # SS Great Britain, 1843: 98 × 15.4 m, 1,930 GRT — the first iron-hulled screw Atlantic liner,
  # and the moment the wind stops setting the route.
  "steamer": hull(build="iron", funnels=1, loa=98.0, lwl=92.0, beam=15.4, draught=4.9, freeboard=6.0, cm=0.88,
              wlPower=3.4, stemFineness=0.05, sternFineness=0.10,
              forefoot=0.24, run=0.30, riseF=0.36, riseA=0.34,
              sheerBow=1.4, sheerStern=0.7, tumblehome=0.05, strakes=22,
              stemRake=0.06, sternRake=0.04, iron=True, topside="#25282b",
              masts=[dict(at=0.13, height=0.4, rig="square", rake=2, shrouds=4, only=2),
                     dict(at=0.38, height=0.46, rig="square", rake=2, shrouds=4, only=2),
                     dict(at=0.61, height=0.42, rig="square", rake=2, shrouds=4, only=2),
                     dict(at=0.845, height=0.36, rig="lateen", rake=3, shrouds=3)],
              bowsprit=0.10, steeve=10),

  # MSC Irina class, 2023: 399.9 × 61.3 m, 24,346 TEU. Cb 0.62–0.72 for a container liner
  # (MAN, *Basic Principles of Ship Propulsion*, Table 1.01).
  # Wyoming, 1909 — the LONGEST WOODEN SHIP EVER BUILT, and the proof of why that stopped.
  # 350 ft on deck / 450 ft overall, beam 50.1 ft, depth of hold 33 ft, draught 30.4 ft,
  # 3,730.54 GRT, six masts, 22 sails. She flexed so badly at that length that her planks
  # twisted and worked open, and she ran her pumps continuously to stay afloat. Foundered off
  # Cape Cod, 11 March 1924, all hands. Wood has a maximum length and this is what it looks like.
  "wyoming": hull(build="frame", loa=140.0, lwl=110.0, beam=15.3, draught=9.3, freeboard=4.2,
                  cm=0.92, wlPower=3.2, stemFineness=0.10, sternFineness=0.22, transom=0.34,
                  forefoot=0.22, run=0.26, riseF=0.30, riseA=0.26, sheerBow=1.4, sheerStern=0.9,
                  tumblehome=0.03, stemRake=0.05, sternRake=0.03, strakes=30, topside="#3b3a36",
                  masts=[dict(at=0.14, heightM=42.0, rig="gaff", shrouds=3),
                         dict(at=0.29, heightM=42.0, rig="gaff", shrouds=3),
                         dict(at=0.44, heightM=42.0, rig="gaff", shrouds=3),
                         dict(at=0.58, heightM=42.0, rig="gaff", shrouds=3),
                         dict(at=0.72, heightM=42.0, rig="gaff", shrouds=3),
                         dict(at=0.86, heightM=42.0, rig="gaff", shrouds=3)]),

  # Preussen, 1902 — the largest sailing ship ever built and the only five-masted FULL-RIGGER.
  # LOA 147 m, LBP 122 m, beam 16.4 m, draught 8.26 m, 5,081 GRT, 47 sails (30 square, 17
  # fore-and-aft), 6,806 m2 of canvas, steel. Best day's run 426 nm; 20.5 kn at her fastest.
  # Rammed by a cross-Channel steamer off Dover in 1910 and lost: sail's high-water mark, ended
  # by a ferry that misjudged her speed.
  "preussen": hull(build="steel", loa=147.0, lwl=122.0, beam=16.4, draught=8.26, freeboard=5.0,
                   cm=0.90, wlPower=3.4, stemFineness=0.07, sternFineness=0.16, transom=0.30,
                   forefoot=0.20, run=0.28, riseF=0.26, riseA=0.22, sheerBow=1.1, sheerStern=0.7,
                   tumblehome=0.02, stemRake=0.04, sternRake=0.03, strakes=34, iron=True,
                   topside="#2b2b2c", bowsprit=0.10, steeve=12,
                   # ⚠ heightM, not height: Steel's rule assumes L/B near 3.9 and Preussen is 7.4, so the rule
                   # runs away with her length and gives 64 m lower masts. Her mainmast stands
                   # about 68 m over the deck ALL TOLD — lower mast, topmast, topgallant and
                   # royal together — so the lower mast is about 30 m.
                   masts=[dict(at=0.16, heightM=27.0, rig="square", shrouds=6),
                          dict(at=0.34, heightM=30.0, rig="square", shrouds=7),
                          dict(at=0.52, heightM=30.0, rig="square", shrouds=7),
                          dict(at=0.70, heightM=29.0, rig="square", shrouds=6),
                          dict(at=0.86, heightM=25.0, rig="square", shrouds=5)]),

  # Great Eastern, 1858 — six times the tonnage of any ship afloat, and forty years too early.
  # 211 m, 25.3 m beam, 32,160 GRT. Paddles AND screw AND six masts, built to steam to Australia
  # without coaling. There was no trade that needed her; she ended laying transatlantic cable,
  # which is the one job only she could do.
  # Great Eastern, 1858 — six times the tonnage of any ship afloat, and forty years too early.
  # Wikipedia (SS Great Eastern), checked: 692 ft / 211 m, beam 82 ft / 25 m, 18,915 GRT,
  # draught 6.1 m light and 9.1 m laden, crew 418, 4,000 passengers, 18 lifeboats (20 after 1860).
  # SIX masts — said to be named for the days of the week, Monday forward to Saturday aft — and
  # FIVE funnels, later reduced to four. Rigged "similar to a topsail schooner with a main gaff
  # sail on each mast", NOT square. Paddle wheels 17 m across AND a 7.3 m screw.
  "great-eastern": hull(build="iron", loa=211.0, lwl=207.0, beam=25.3, draught=9.1, freeboard=8.5,
                        cm=0.94, wlPower=3.6, stemFineness=0.10, sternFineness=0.22, transom=0.26,
                        forefoot=0.16, run=0.26, riseF=0.20, riseA=0.18, sheerBow=0.8,
                        sheerStern=0.5, tumblehome=0.02, stemRake=0.02, sternRake=0.02,
                        strakes=40, iron=True, topside="#232427", funnels=5, decks=2,
                        paddleDia=17.0, paddleAt=0.50,
                        masts=[dict(at=0.13, heightM=34.0, rig="gaff", shrouds=4),
                               dict(at=0.26, heightM=38.0, rig="gaff", shrouds=4),
                               dict(at=0.40, heightM=40.0, rig="gaff", shrouds=5),
                               dict(at=0.60, heightM=40.0, rig="gaff", shrouds=5),
                               dict(at=0.74, heightM=38.0, rig="gaff", shrouds=4),
                               dict(at=0.87, heightM=32.0, rig="gaff", shrouds=4)]),

  # Titanic, 1912 — 269.1 m, 28.2 m beam, 46,328 GRT. Not the fastest and never meant to be:
  # built for size and comfort against Cunard's speed. Sixteen watertight compartments — and the
  # bulkheads stopped at E deck, which is why flooding five of them was enough to sink her.
  "titanic": hull(build="steel", loa=269.1, lwl=259.0, beam=28.2, draught=10.5, freeboard=18.5,
                  cm=0.95, wlPower=3.8, stemFineness=0.10, sternFineness=0.20, transom=0.22,
                  forefoot=0.14, run=0.24, riseF=0.18, riseA=0.15, sheerBow=0.7, sheerStern=0.4,
                  tumblehome=0.01, stemRake=0.02, sternRake=0.02, strakes=44, iron=True,
                  topside="#1a1a1c", funnels=4, decks=5, masts=[]),

  # And the end of a story about people crossing oceans: a hull with NO PEOPLE ON IT.
  # Wind and solar, months at sea, no crew to feed, water, berth or lose.
  "usv": hull(build="steel", loa=22.0, lwl=20.5, beam=6.1, draught=2.4, freeboard=1.4, cm=0.72,
              wlPower=3.4, stemFineness=0.06, sternFineness=0.30, transom=0.30, forefoot=0.24,
              run=0.30, riseF=0.34, riseA=0.20, sheerBow=0.4, sheerStern=0.3, tumblehome=0.0,
              stemRake=0.03, sternRake=0.01, strakes=12, iron=True, topside="#8d9498", masts=[]),

  "container": hull(build="steel", containers=True, loa=399.9, lwl=383.0, beam=61.3, draught=16.0, freeboard=30.0, cm=0.98,
              wlPower=4.6, stemFineness=0.06, sternFineness=0.30,
              forefoot=0.18, run=0.22, riseF=0.20, riseA=0.14,
              sheerBow=2.2, sheerStern=0.0, tumblehome=0.0, strakes=16,
              stemRake=0.03, sternRake=0.0, iron=True, topside="#2b3f52", masts=[]),
}


# ═══════════════════════════════════════════════════════════ VESSELS ══════
# dims are metres. "tonnage" ALWAYS names its system — SCOPE §7: burden, builder's old
# measurement, gross register, displacement, deadweight and TEU are different quantities and
# are never plotted on one axis.

V = []
def vessel(**kw): V.append(kw)

vessel(id="dugout", name="Dugout canoe", sub="the first sea craft", rig="oar", era=[-68000, -3000],
       region="worldwide", from_=-68000, to=2026,
       rows=[["Oldest surviving", "Pesse canoe, 8040–7510 BC, 2.98 × 0.44 m"],
             ["Sunda→Sahul crossing", "~65,000 BP; minimum open-water leg 70–90 km"],
             ["Measured performance", "Sugime, 7.6 m cedar: Taiwan→Yonaguni, 225 km in 45 h ≈ 2.5–3 kn"],
             ["Construction", "single trunk, fire and adze"]],
       attestation="inferred", confidence="contested",
       text="No watercraft survives from the crossing to Sahul. That people arrived is certain; "
            "what they arrived in is not, and this model does not draw the vessel.\n\n"
            "What the record does support is a negative: **bamboo rafts do not work.** Kaifu's "
            "experimental crossings (National Museum of Nature and Science, Tokyo, 2016–19) "
            "found rafts made under a knot against the 1–2 knot Kuroshio and failed outright, "
            "while a 7.6 m cedar dugout crossed 225 km of open water in 45 hours. If the "
            "Pleistocene sea craft was anything, it was more like a dugout than a raft.\n\n"
            "The date is itself contested: Madjedbebe's optically stimulated luminescence gives "
            "65 ± 6 ka (Clarkson et al., *Nature*, 2017); Allen and O'Connell argue for ~50 ka.",
       cite="Clarkson et al. 2017; Kealy, Louys & O'Connor 2018; Kaifu experimental crossings 2016–19.")

vessel(id="voyaging-canoe", name="Voyaging canoe", sub="Austronesian double hull", rig="crabclaw",
       era=[-3000, 1500], from_=-3000, to=2026, region="Pacific and Indian Oceans",
       rows=[["Length", "18–20 m (Hōkūleʻa 19.0 m)"], ["Displacement", "~11.5 t laden"],
             ["Sail area", "~50 m², two crab claws"], ["Crew", "12–16"],
             ["Measured passage", "Hawaiʻi→Tahiti 1976, ~2,400 nm in 30 days at sea ≈ 3.3 kn"],
             ["Construction", "lashed-lug planking, no metal at all"]],
       crew=14, attestation="attested", confidence="good",
       text="The technology that settled a third of the surface of the planet, and it did it "
            "**against the prevailing wind** — which is the reason this model does not put "
            "Europe at the root of the tree.\n\n"
            "The crab claw generates lift rather than merely catching wind, and a double hull "
            "carries enough sail to use it. That combination makes good about 75° to the true "
            "wind. By modern standards that is poor. Against a square rig, which in ordinary "
            "conditions makes good 90° and in a blow goes backwards, it is the difference "
            "between being able to explore upwind and not.\n\n"
            "Lashed-lug construction uses planks carved with integral internal lugs and lashed "
            "to ribs with fibre — no nails, no iron, nothing that corrodes.",
       cite="Irwin, *Archaeology in Oceania* 58 (2023); Finney, *Science* (1977); Polynesian Voyaging Society logs.")

vessel(id="trireme", name="Trireme", sub="τριήρης", rig="oar", era=[-700, -200],
       from_=-700, to=-100, region="Mediterranean",
       rows=[["Length overall", "36.9 m (reconstruction *Olympias*)"],
             ["Beam of the HULL, at the waterline", "3.8 ± 0.1 m"],
             ["Beam over the outriggers", "5.4–5.5 m"],
             ["Length : beam", "9.7 — as slender as a modern frigate"],
             ["Draught", "1.25 m"], ["Displacement", "47 t"],
             ["Oars", "170 — 62 thranite, 54 zygian, 54 thalamite"],
             ["Sprint, measured", "8.3 kn (not the 8.9 kn usually quoted)"],
             ["Cruise, measured", "~5.4 kn; 2.9 kn into a headwind and 1 m sea"],
             ["Turning circle", "1.9 ship-lengths; 360° in 128 s"]],
       crew=200, attestation="generated", confidence="contested",
       text="A hull built to carry a bronze ram at speed and to turn inside its own length. It "
            "is also the best-measured ancient ship in existence, because one was built.\n\n"
            "*Olympias* (1987) **fell short of what the ancient sources imply**, and the "
            "shortfall is the interesting part. Xenophon implies 7–8 knots sustained for "
            "sixteen hours; the reconstruction managed 8.3 knots for a sprint and about 5.4 "
            "sustained. Coates concluded the hull is roughly 10% overweight and too short — "
            "Vitruvius's two-cubit oar spacing at the longer Ionic cubit gives a hull over "
            "40 m, and a Mark II on those lines was calculated to reach 9.7 kn sprint and 7.5 "
            "sustained. It has never been built.\n\n"
            "The widely repeated 8.9 knots was a single momentary GPS reading; the Final Report "
            "says 8.3 kn is the honest figure, 'achieved only momentarily (if at all)'.",
       cite="Rankov (ed.), *Trireme Olympias: The Final Report* (Oxbow, 2012); Morrison, Coates & Rankov, *The Athenian Trireme*.")

vessel(id="corbita", name="Roman merchantman", sub="corbita", rig="square", era=[-200, 400],
       from_=-300, to=500, region="Mediterranean",
       rows=[["Typical length", "20–30 m; Madrague de Giens 40 × 9 m"],
             ["Burden", "150–350 tons typical; the largest ~400 t"],
             ["The grain ship *Isis*", "~53 m; 1,200–1,300 t of grain (Casson) — contested, some read 1,900 t"],
             ["Construction", "shell-first, pegged mortise-and-tenon, double planking"],
             ["Passage, downwind", "Puteoli→Alexandria 9 days ≈ 5–6 kn (Pliny)"],
             ["Passage, upwind", "Alexandria→Rome 40–70 days ≈ 1–2 kn made good"]],
       crew=20, attestation="generated", confidence="moderate",
       text="The asymmetry on this card is the whole argument of this model in two rows. The "
            "same ship, on the same route, took nine days one way and forty to seventy the "
            "other. Nothing about the hull changed. The wind did.\n\n"
            "Rome fed itself on that asymmetry: the grain fleet ran downwind to Italy and beat "
            "its way back, and the sailing season closed entirely in winter.",
       cite="Casson, *Ships and Seamanship in the Ancient World* (1971); Pliny, *Natural History*.")

vessel(id="dhow", name="Sewn-plank dhow", sub="the Indian Ocean trader", rig="lateen",
       era=[500, 1900], from_=300, to=2026, region="Indian Ocean",
       rows=[["Belitung wreck (c. AD 830)", "~18 × 6.4 m; ~60,000 Changsha wares"],
             ["Baghlah / ghanjah", "30–40 m, 150–400 t, crew 40–150"],
             ["Construction", "coir stitching through drilled holes; no iron"],
             ["Sailing season", "out on the SW monsoon Apr–Sep, home on the NE Nov–Mar"]],
       crew=20, attestation="attested", confidence="good",
       text="In the Indian Ocean the departure **date** is not a free variable. The monsoon "
            "reverses twice a year, and it is the only wind system on Earth that does, so the "
            "calendar of the whole ocean is fixed by it: Egypt to India leaving in July on the "
            "south-west monsoon, home from November on the north-east.\n\n"
            "The *Periplus of the Erythraean Sea* states the month outright — 'about the month "
            "of July, that is Epiphi' — four separate times, for four separate routes.\n\n"
            "Sewn construction with no iron at all was not primitive. It flexed on a reef "
            "instead of splitting, and it could be repaired anywhere there was coir.",
       cite="*Periplus Maris Erythraei* §§14, 24, 39, 49, 56; Flecker on the Belitung wreck.")

vessel(id="junk", name="Chinese junk", sub="海船", rig="junk", era=[800, 1900],
       from_=200, to=2026, region="China and the eastern seas",
       rows=[["Quanzhou ship (sank c. 1272)", "surviving hull 24.2 × 9.15 m; reconstructed ~34 m"],
             ["Compartments", "12 bulkheads, 13 watertight compartments"],
             ["Cargo", "200–250 t"],
             ["Sternpost rudder", "attested 1st c. AD — about a millennium before Europe"],
             ["Compass at sea", "Zhu Yu, *Pingzhou Ketan*, 1119"]],
       crew=30, attestation="attested", confidence="good",
       text="Four genuine firsts in one hull: watertight transverse bulkheads, the balanced "
            "battened lug sail, the axial sternpost rudder, and the magnetic compass used at "
            "sea. Each of them reached Europe centuries later or was invented there "
            "independently and later.\n\n"
            "The battened sail is the underrated one. Battens make it self-reefing and let it "
            "set flat, so a junk works to windward far better than a square rig **and needs a "
            "fraction of the crew to do it**. Measured against modern rigs, a junk reaches "
            "75–80% of a Bermudan's windward performance.",
       cite="Needham, *Science and Civilisation in China* IV.3; Quanzhou ship excavation 1974; Junk Rig Association instrumented polars.")

vessel(id="treasure-ship", name="Treasure ship", sub="寶船 — and how big it really was", rig="junk",
       era=[1405, 1433], from_=1405, to=1435, region="Indian Ocean",
       rows=[["Claimed length", "44 zhang 4 chi ≈ 138 m"],
             ["Scholarly range", "50–76 m"],
             ["Fleet, first voyage", "~317 ships, 27,800 men"],
             ["Voyages", "seven, 1405–1433"]],
       crew=250, attestation="generated", confidence="contested",
       text="**The famous dimensions come from a novel.** The 44-zhang figure appears first in "
            "Luo Maodeng's *Xiyang Ji* of 1597 — a work of fiction written 164 years after the "
            "last voyage, in which ships are built with divine assistance — and was carried "
            "into the *Ming Shi* when that was compiled in 1739.\n\n"
            "Two physical arguments cut against it. A length-to-beam ratio of 2.5 is a barge, "
            "not a seagoing hull; and unreinforced wooden hulls hog beyond about 90 m, which is "
            "why the longest wooden ship ever built needed iron strapping and still leaked "
            "continuously. Then the decisive one: the Longjiang shipyard was excavated in "
            "2003–04 and its largest building basin is **421 m long and 41 m wide** — narrower "
            "than the 52 m beam the ships are supposed to have had.\n\n"
            "The hull drawn here is at the defensible length. The claimed length is shown as an "
            "outline beside it, because the claim is part of the history even though it is "
            "almost certainly wrong.",
       cite="Church, *Monumenta Serica* 53 (2005); Sleeswyk, *Nautical Research Journal* (1996); Xin Yuan'ou; Longjiang shipyard excavation 2003–04.")

vessel(id="cog", name="Cog", sub="the northern workhorse", rig="square", era=[1150, 1450],
       from_=1100, to=1500, region="North Sea and Baltic",
       rows=[["Bremen cog, 1380", "23.3 × 7.6 m, draught 2.25 m"],
             ["Displacement", "~84 t; cargo ~87 t"], ["Crew", "15–20"],
             ["Sail", "one square sail, ~200 m²"],
             ["Windward, measured", "74–76° made good in a gentle breeze; LOSES ground in 20 kn"],
             ["Fastenings", "double-clenched iron nails — not treenails; the nail is what let a\n              clinker shell be built without a frame to fasten to"],
             ["Construction", "clinker sides on a FLUSH-LAID bottom, built shell-first"]],
       crew=20, attestation="attested", confidence="good",
       text="Flat-bottomed so it could take the ground on a tidal flat and be unloaded at low "
            "water, which is what the Hanse ports needed. It also carries the **pintle-and-"
            "gudgeon stern rudder**, first depicted on the Winchester font about 1180 — the "
            "single most important European ship fitting of the Middle Ages.\n\n"
            "A replica was instrumented and the result is sobering: in a gentle breeze it made "
            "good 74–76° to the true wind with a velocity made good of 0.15 knots. In twenty "
            "knots of wind it lost ground.",
       cite="Bremen cog, Deutsches Schiffahrtsmuseum; Brandt & Hochkirch 1995 replica trials.")

vessel(id="caravel", name="Caravel", sub="caravela latina", rig="lateen", era=[1440, 1550],
       from_=1430, to=1600, region="Atlantic",
       rows=[["Length", "20–25 m"], ["Beam", "~6 m"], ["Burden", "50–60 tons"],
             ["Crew", "20–25"], ["Draught", "~2 m"], ["Rig", "2–3 lateen masts"]],
       crew=25, attestation="generated", confidence="moderate",
       text="Small, shallow and weatherly — and the weatherliness is the point. The cog could "
            "run down to Guinea on the north-east trades and then could not get home. The "
            "caravel could work back.\n\n"
            "What it made possible has a name: the ***volta do mar***, the turn of the sea. "
            "To come home from West Africa you do not beat up the coast against the trades. "
            "You stand out **west** into the middle of the Atlantic, as far as the Azores, "
            "pick up the westerlies at 35–40°N and run home on them. Sailing away from your "
            "destination in order to reach it is the first great piece of applied knowledge "
            "about the wind field, and in 1500 Cabral's southern version of it swung so far "
            "west that it reached Brazil.",
       cite="Portuguese *Regimento* c. 1509; Barros, *Décadas da Ásia*.")

vessel(id="carrack", name="Carrack", sub="nau", rig="square", era=[1450, 1600],
       from_=1440, to=1650, region="Atlantic and Indian Ocean",
       rows=[["Portuguese India naus", "~400 t (1500) → 1,000–2,000 t (1600)"],
             ["*Madre de Deus*, 1592", "1,600 t burden, 7 decks, 47 m, 900 crew"],
             ["Rig", "square fore and main, lateen mizzen"],
             ["Tonnage system", "tons burden — not comparable with register or displacement tons"]],
       crew=80, attestation="generated", confidence="moderate",
       text="The hull that carried the Portuguese and Spanish empires, and the first ship type "
            "designed from the start to cross oceans with cargo and guns at the same time. The "
            "mixed rig is the compromise that made it work: square sails forward for driving "
            "power downwind, a lateen mizzen aft to help it steer and lie closer.",
       cite="Rodrigues & Loureiro on the *carreira da Índia*.")

vessel(id="fluyt", name="Fluyt", sub="the freight machine", rig="square", era=[1595, 1700],
       from_=1595, to=1750, region="Baltic and Atlantic",
       rows=[["Length", "24–40 m"], ["Length : beam", "4:1 to 6:1"],
             ["Burden", "200–500 t"],
             ["Crew", "12–15 — against ~30 for the English equivalent"]],
       crew=12, attestation="generated", confidence="good",
       text="Not a better sailer. A cheaper one — and that turned out to matter more.\n\n"
            "Built of softwood cut by wind-powered sawmills, rigged so that a dozen men could "
            "work it where an English ship of the same burden needed thirty, and shaped with a "
            "deliberately narrow deck because the **Danish Sound Toll was charged on deck "
            "area**. A ship designed around a tax. It roughly halved the cost of moving freight "
            "and is a large part of why the Dutch carried everyone else's cargo for a century.",
       cite="Unger, *Dutch Shipbuilding before 1800*; Sound Toll Registers Online.")

vessel(id="east-indiaman", name="East Indiaman", sub="retourschip", rig="square", era=[1600, 1830],
       from_=1595, to=1840, region="Europe to Asia",
       rows=[["VOC retourschip", "45–55 m, 700–1,150 t, crew 200–350"],
             ["Passage Netherlands→Batavia", "mean 253 days (1770–75), 238 days (1783–92)"],
             ["English EIC to Batavia", "mean 173 days over the same years"],
             ["Mortality", "VOC-wide ~9–10% per voyage across the whole record"]],
       crew=120, attestation="generated", confidence="good",
       text="The best-documented long passage in the age of sail, because the Dutch counted "
            "everything. Solar and de Zwart worked the Dutch-Asiatic Shipping database and "
            "found something the model has to reproduce and mostly cannot flatter: **VOC ships "
            "were slow, and they did not get faster.** Mean passage to Batavia was 253 days in "
            "1770–75 and 238 in 1783–92, and there is 'no significant trend' across the "
            "seventeenth and eighteenth centuries at all.\n\n"
            "English East Indiamen did the same passage in 173 days. The gap is 60–80 days "
            "between two fleets sailing the same ocean in the same years, and it is a fact "
            "about the hulls and the standing orders, not about the wind: Dutch hull form was "
            "constrained by shallow inland waterways, copper sheathing was adopted late, and "
            "the sailing instructions were conservative.",
       cite="Solar & de Zwart, *International Journal of Maritime History* 29(4) (2017); Bruijn, Gaastra & Schöffer, *Dutch-Asiatic Shipping*.")

vessel(id="ship-of-the-line", name="Ship of the line", sub="third rate, 74 guns", rig="square",
       era=[1650, 1850], from_=1640, to=1870, region="worldwide",
       rows=[["Gundeck length", "168–176 ft (51–54 m)"], ["Beam", "47–48 ft (14.3–14.6 m)"],
             ["Tonnage", "1,600–1,750 tons builder's old measurement"],
             ["Crew", "600–650"], ["Speed", "8–9 kn maximum; fleet speed ~5 kn"],
             ["Timber", "~2,000 mature oaks — a 19th-c. estimate, not a dockyard account"],
             ["*Victory*, 1765", "2,142 tons BOM, 104 guns, 821 men — 1 man per 2.6 tons"]],
       crew=640, attestation="generated", confidence="moderate",
       text="Roughly half of all line-of-battle ships by 1800 were 74s: the point on the curve "
            "where enough guns met enough speed.\n\n"
            "The manning ratio is the fact worth stopping on. A merchantman of the same period "
            "carried one man per 20–30 tons. *Victory* carried one per 2.6. Guns need hands, "
            "and the Royal Navy went from 16,000 men in 1739 to 145,000 in 1813, roughly half "
            "the wartime lower deck pressed. Of about 103,000 deaths between 1793 and 1815, "
            "**81% were disease and accident, 13% shipwreck and fire, and 6% enemy action.**",
       cite="Lavery, *The Ship of the Line*; Rodger, *The Command of the Ocean*; Albion, *Forests and Sea Power* (1926).")

vessel(id="slave-ship", name="Slave ship", sub="the Middle Passage", rig="square",
       era=[1500, 1866], from_=1501, to=1867, region="the Atlantic",
       rows=[["Embarked, 1501–1866", "~12.5 million people"],
             ["Disembarked", "~10.7 million"],
             ["Died at sea", "~1.8 million — about 14.5%"],
             ["Passage length", "~60 days (17th c.) → ~40 days (19th c.)"],
             ["Mortality by era", "22–30% (16th c.) → ~5% (final decade)"],
             ["Crew mortality", "~20% per voyage on British slavers"]],
       crew=35, pax=300, attestation="attested", confidence="good",
       text="For three centuries the principal cargo of the Atlantic was people, and because "
            "this is a model about **technology**, that belongs on a vessel card rather than in "
            "a note.\n\n"
            "The slave ship's between-decks was a design. It was drawn by naval architects and "
            "optimised for a quantity of human beings per ton, and the optimisation is legible "
            "in the numbers: mortality fell across three centuries not because conditions "
            "became humane but because passages got shorter and the loss of cargo was "
            "expensive.\n\n"
            "The crew figure is the one that moved Parliament. Thomas Clarkson's evidence was "
            "drawn from muster rolls showing that about a fifth of the **crews** died too — a "
            "trade that killed the people who ran it at a rate comparable to the people it "
            "carried.\n\n"
            "*The voyage database that records all of this is licensed for non-commercial use "
            "only, so this model cites it and does not republish it. The figures here are the "
            "published aggregates.*",
       cite="Eltis & Richardson, *Atlas of the Transatlantic Slave Trade*; SlaveVoyages.org (cited, not redistributed — CC BY-NC).")

vessel(id="wyoming", name="Wyoming", sub="the longest wooden ship ever built", rig="gaff",
       era=[1890, 1930], from_=1909, to=1924, region="North Atlantic",
       rows=[["Length", "110 m on deck, 140 m overall — beam 15.3 m, depth of hold 10 m"],
             ["Tonnage", "3,730.54 gross register tons"],
             ["Rig", "six-masted schooner, 22 sails"],
             ["Crew", "13"],
             ["Fate", "foundered off Cape Cod, 11 March 1924, all hands"]],
       crew=13, attestation="generated", confidence="good",
       text="Wood has a maximum length, and this is what reaching it looks like.\n\n"
            "At 110 m on deck she was too long to hold herself straight. A wooden hull resists "
            "bending only through the friction and fastenings between thousands of separate "
            "timbers, and past a certain length the sea simply works them: her planks twisted "
            "and opened, and **she ran her pumps continuously to stay afloat**. Not in heavy "
            "weather — always.\n\n"
            "She foundered in a gale off Cape Cod in 1924 with everyone aboard. Iron and steel "
            "did not replace wood because they were cheaper; they replaced it because a metal "
            "hull is one continuous member and a wooden one is a negotiation.\n\n"
            "And the rig is the other half of the story. Six masts of gaff sail are worked "
            "entirely from the deck — nobody goes aloft to reef — so she carried 3,730 tons "
            "with **thirteen people**. A square-rigged ship of that tonnage wanted thirty.",
       cite="Wikipedia, *Wyoming (schooner)*, citing the Percy & Small yard records."),

vessel(id="preussen", name="Preussen", sub="the largest sailing ship ever built", rig="square",
       era=[1890, 1920], from_=1902, to=1910, region="Cape Horn nitrate route",
       rows=[["Length", "147 m overall, 122 m between perpendiculars — beam 16.4 m"],
             ["Tonnage", "5,081 gross register tons"],
             ["Rig", "five-masted full-rigger — the only one ever built"],
             ["Canvas", "47 sails, 6,806 m²"],
             ["Best day's run", "426 nautical miles (1904); 20.5 kn at her fastest"]],
       crew=48, attestation="generated", confidence="good",
       text="The high-water mark of sail, and she was sunk by a ferry.\n\n"
            "Five masts, all square-rigged — the only ship ever built that way. 6,806 m² of "
            "canvas driving 5,081 tons round Cape Horn with nitrate, on a route where steam "
            "still could not compete because there was nowhere to coal.\n\n"
            "In November 1910 the cross-Channel steamer *Brighton* misjudged her speed and tried "
            "to cross her bows. Preussen was making 16 knots. She broke her keel going ashore "
            "near Dover and was never salvaged.\n\n"
            "That is the ending sail actually got: not obsolescence, but a steamer in a hurry.",
       cite="Wikipedia, *Preussen (ship)*; Laeisz Flying-P line records."),

vessel(id="great-eastern", name="Great Eastern", sub="forty years too early", rig="gaff",
       era=[1850, 1890], from_=1858, to=1889, region="worldwide",
       rows=[["Length", "211 m — beam 25.3 m, 18,915 gross register tons"],
             ["Scale", "six times the tonnage of any ship then afloat; unsurpassed for 40 years"],
             ["Propulsion", "17 m paddle wheels AND a 7.3 m screw AND six masts of sail"],
             ["Rig", "topsail schooner — a gaff sail on each of six masts"],
             ["The masts", "named for the days of the week: Monday forward to Saturday aft"],
             ["Boats", "18 lifeboats, 20 after 1860"],
             ["Design purpose", "steam to Australia and back without coaling"],
             ["What she actually did", "laid the transatlantic telegraph cable, 1866"]],
       crew=418, pax=4000, attestation="generated", confidence="good",
       text="Brunel built a ship six times bigger than anything afloat, and there was no trade "
            "for her.\n\n"
            "The engineering was sound and the reasoning was sound: coal is the constraint on "
            "steam, and a bigger hull carries proportionally more of it, so a big enough ship "
            "could reach Australia without refuelling. She could. Nobody wanted to go to "
            "Australia in those numbers.\n\n"
            "She spent her career unprofitable and ended doing the one job that needed a hull "
            "that size: **laying the Atlantic telegraph cable**, 4,200 km of it in one bottom. "
            "No other ship on earth could hold it.\n\n"
            "No ship exceeded her tonnage for forty years.",
       cite="Wikipedia, *SS Great Eastern*; Brunel's own calculations on the coal fraction."),

vessel(id="titanic", name="Titanic", sub="size instead of speed", rig="steam",
       era=[1900, 1930], from_=1912, to=1912, region="North Atlantic",
       rows=[["Length", "269.1 m — beam 28.2 m, draught 10.5 m"],
             ["Tonnage", "46,329 gross register tons"],
             ["Watertight compartments", "16, with 15 bulkheads — which stopped at D deck"],
             ["Speed", "21 kn service, 23 kn maximum — deliberately not a record-breaker"],
             ["Funnels", "four, but only THREE drew smoke; the aftermost was a dummy"],
             ["Lifeboats", "20, for 1,178 people, against about 2,208 aboard"]],
       crew=866, pax=1342, speedKn=21.0, attestation="generated", confidence="good",
       text="She was not built to be fast. Cunard had the speed record and White Star chose not "
            "to compete for it — Titanic was built for **size and comfort**, on the theory that "
            "passengers would rather cross well than quickly.\n\n"
            "Her sixteen watertight compartments were real, and they were not enough for a "
            "reason of geometry rather than engineering: **the bulkheads stopped at D deck**. "
            "Water filling one compartment past that level simply flowed over the top into the "
            "next. She could float with four flooded. The iceberg opened five.\n\n"
            "The lifeboat number was legal. The regulation scaled boats to a ship's TONNAGE and "
            "had last been written when the largest ship afloat was 10,000 tons.",
       cite="Wikipedia, *RMS Titanic*; British Wreck Commissioner's Inquiry, 1912."),

vessel(id="usv", name="Unmanned surface vessel", sub="nobody aboard", rig="motor",
       era=[2010, 2026], from_=2015, to=2026, region="worldwide",
       rows=[["Length", "~22 m — beam 6.1 m, draught 2.4 m"],
             ["Propulsion", "wind and solar; diesel-electric on some hulls"],
             ["Endurance", "months, limited by fouling and machinery, not by stores"],
             ["Crew", "none"],
             ["What it is for", "survey, hydrography, ocean monitoring, naval picket"]],
       crew=0, pax=0, attestation="generated", confidence="fair",
       text="Every other hull in this model exists to carry people across water. This one does "
            "not carry anyone at all.\n\n"
            "That changes the constraint completely. A crewed ship's endurance is set by food, "
            "water and human tolerance; take the crew off and the limits become fouling, "
            "machinery and power. A wind-and-solar hull can stay out for **months**, and the "
            "sea state that would be dangerous for a manned vessel is merely slow for one that "
            "cannot drown.\n\n"
            "It is a strange place for this story to arrive. The whole history above is people "
            "solving the problem of getting themselves across an ocean — and the current answer, "
            "for a growing share of the work, is not to go.",
       cite="Wikipedia, *Unmanned surface vehicle*; Saildrone and NOAA survey programmes."),

vessel(id="clipper", name="Clipper", sub="the last argument for sail", rig="square",
       era=[1845, 1890], from_=1843, to=1900, region="worldwide",
       rows=[["*Cutty Sark*, 1869", "hull 64.8 m, beam 10.97 m, 963 gross register tons"],
             ["Sail area", "~2,970 m²; crew 28–35"],
             ["Best day's run", "363 nm — a 15.1 kn average sustained for 24 hours"],
             ["NY→San Francisco record", "*Flying Cloud*, 89 days 8 hours (1854)"],
             ["Construction", "composite — iron frames, teak and rock elm planking"]],
       crew=30, attestation="generated", confidence="good",
       text="The fastest commercial sailing ships ever built, and they were obsolete almost "
            "immediately.\n\n"
            "The Suez Canal opened in 1869, the year *Cutty Sark* was launched. It cut "
            "London–Bombay from about 10,600 nautical miles to 6,200 — and **sail could not use "
            "it**, because there is no wind in a cut and towage was charged. So the clippers "
            "were driven onto the routes the canal did not help: Australian wool, and Chilean "
            "nitrate round the Horn. They were the best answer to a question that had just "
            "stopped being asked.\n\n"
            "The rival record is worth the argument it causes. *Andrew Jackson*'s 89 days "
            "4 hours in 1860 was measured pilot-to-pilot at the Farallones, after which she lay "
            "all night waiting for a pilot; Cutler put her anchor-to-anchor time at possibly "
            "89 days 20 hours. The two figures are not commensurable.",
       cite="Cutler, *Greyhounds of the Sea*; Royal Museums Greenwich.")

vessel(id="steamer", name="Ocean steamer", sub="iron hull, screw propeller", rig="steam",
       era=[1838, 1910], from_=1838, to=1930, region="worldwide",
       rows=[["*Great Britain*, 1843", "98 × 15.4 m, 1,930 GRT, 1,000 ihp, 12.25 kn"],
             ["*Great Western*, 1838", "Bristol→New York 15 d 5 h ≈ 8.2 kn"],
             ["Coal, simple engine 1850s", "4.0–5.0 lb per indicated horsepower-hour"],
             ["Compound, 1870s", "~2.0–2.5 lb/ihp-hr"],
             ["Triple expansion, 1890", "~1.5 lb/ihp-hr"]],
       crew=90, pax=600, attestation="generated", confidence="good",
       text="The number that changed the world is not horsepower. It is **pounds of coal per "
            "horsepower-hour**, and it fell about threefold between 1855 and 1890.\n\n"
            "That is what made steam viable on long routes. At 1850s efficiency a ship crossing "
            "an ocean had to give up roughly half its deadweight to its own fuel; by 1890 it "
            "was 15–20%. Nothing about the engine's power mattered as much as how little coal "
            "it burned to make it.\n\n"
            "Compound expansion (1854), triple expansion (A. C. Kirk, 1881), then the turbine "
            "and oil firing. Steam overtook sail on the British register around 1883.",
       cite="Griffiths, *Steam at Sea*; Kirk on triple expansion, 1881.")

vessel(id="container", name="Container ship", sub="from Ideal X to 24,000 TEU", rig="motor",
       era=[1956, 2026], from_=1956, to=2026, region="worldwide",
       rows=[["*Ideal X*, 26 April 1956", "converted T2 tanker; 58 trailer bodies"],
             ["*Emma Mærsk*, 2006", "397 × 56 m, 15,550 TEU"],
             ["MSC Irina class, 2023", "399.9 × 61.3 m, 24,346 TEU"],
             ["Panamax (1914 locks)", "LOA 294.13 m, beam 32.31 m, draught 12.04 m"],
             ["Neo-Panamax (2016)", "LOA 366 m, beam 51.25 m, draught 15.2 m"],
             ["Malaccamax", "draught 25 m"]],
       crew=22, pax=0, attestation="generated", confidence="good",
       text="The last chapter of this story is not about the sea at all. A modern container "
            "ship's route is set by **lock chambers and dredged channels** — numbers written "
            "down by engineers — rather than by anything the ocean does.\n\n"
            "Panamax is not a ship. It is the inside dimension of a lock built in 1914, and for "
            "a century the world's fleet was designed around it: 294.13 m long, 32.31 m in the "
            "beam, because that is what fits. The 2016 expansion moved the number and the fleet "
            "moved with it.\n\n"
            "Growth has now stopped, and it stopped on port depth and canal width rather than "
            "on anything to do with naval architecture.",
       cite="Levinson, *The Box* (2006); Panama Canal Authority vessel requirements; Suez Canal Authority.")


# ═══════════════════════════════════════════════════════════ CHAPTERS ═════

CH = [
  dict(short="Crossing", title="The first crossings", years="70,000 – 8,000 BP",
       from_=-68000, to=-8000, seek=-60000,
       stat="Sea level <b>120 m lower</b> at the glacial maximum",
       text="People reached Sahul — Australia and New Guinea, then one landmass — around "
            "65,000 years ago. Even at the lowest sea level of the last glacial cycle, that "
            "required crossing at least 70–90 km of open water, out of sight of land, with a "
            "target that could not be seen from the departure point.\n\n"
            "No boat survives. The evidence is the arrival.",
       view=[124, -8, 300], lede="Sea level 70 m lower. People cross 70–90 km of open water to a land they cannot see.",
       cite="Clarkson et al., *Nature* (2017); Kealy, Louys & O'Connor (2018); Spratt & Lisiecki sea-level stack (2016)."),
  dict(short="Reed & plank", title="Reed, plank and the first sea trades", years="8000 – 1000 BC",
       from_=-8000, to=-1000, seek=-2000,
       stat="Uluburun carried <b>10 tonnes of copper</b>",
       text="The Bronze Age Mediterranean ran on sea-borne metal. The Uluburun wreck, about "
            "1320 BC, was 15 m long and carried 354 oxhide copper ingots — ten tonnes — plus a "
            "tonne of tin, in exactly the ratio bronze needs.\n\n"
            "Egypt was building 43 m hulls by 2566 BC. The Khufu ship has no keel and no frames: "
            "it is 1,224 pieces of cedar held with unpegged mortise-and-tenon joints and grass "
            "lashing, and it works.",
       view=[30, 30, 300], lede="The Bronze Age Mediterranean runs on sea-borne metal, in hulls held together with mortise-and-tenon and grass.",
       cite="Bass & Pulak, Institute of Nautical Archaeology; Khufu ship, Grand Egyptian Museum."),
  dict(short="Oar & monsoon", title="The oared sea and the monsoon ocean", years="1000 BC – AD 500",
       from_=-1000, to=500, seek=-300,
       stat="Puteoli→Alexandria <b>9 days</b>; the return <b>40–70</b>",
       text="Two oceans running on two different principles at the same time.\n\n"
            "In the Mediterranean, oars — because a galley goes where it likes regardless of "
            "the wind, and the sea is small enough that it never has to go far. In the Indian "
            "Ocean, the monsoon, which reverses twice a year and fixes the sailing calendar of "
            "half the world.",
       view=[55, 20, 330], lede="Two oceans on two principles at once: oars in the Mediterranean, and a wind that reverses twice a year in the Indian.",
       cite="Casson, *Ships and Seamanship in the Ancient World*; *Periplus Maris Erythraei*."),
  dict(short="Longships & junks", title="Longships, junks and the sewn ocean", years="AD 500 – 1400",
       from_=500, to=1400, seek=1000,
       stat="Skuldelev 2: <b>30 m</b>, 60 oars, built in Dublin in 1042",
       text="The Norse reach North America; Chinese ships carry bulkheads, a sternpost rudder "
            "and a compass; the Indian Ocean is worked by sewn hulls with no iron in them at "
            "all; and Austronesian navigators have already settled the Pacific.\n\n"
            "There is no single centre in this period, and any version of this story that puts "
            "one in Europe is wrong on the dates.",
       view=[60, 30, 380], lede="No single centre. The Norse reach America, Chinese hulls carry bulkheads and a compass, and the Pacific is already settled.",
       cite="Viking Ship Museum Roskilde; Needham IV.3; Belitung wreck."),
  dict(short="Ocean crossing", title="The ocean crossed, and taken", years="1400 – 1800",
       from_=1400, to=1800, seek=1590,
       stat="<b>12.5 million</b> people embarked on the Middle Passage",
       text="In four centuries every ocean is crossed, charted and fought over. The instruments "
            "that made it possible — the *volta do mar*, the caravel, the carrack, latitude "
            "sailing, and eventually the chronometer — arrive alongside the uses they were put "
            "to.\n\n"
            "The Atlantic's principal cargo in this period was human beings. That is not an "
            "aside from the technology; the ships were designed for it.",
       view=[-30, 5, 380], lede="Every ocean crossed, charted and fought over in four centuries — and the Atlantic’s principal cargo is people.",
       cite="Eltis & Richardson; Solar & de Zwart (2017); Portuguese *Regimento*."),
  dict(short="Iron & steam", title="Iron, steam, and the end of the wind", years="1800 – 1900",
       from_=1800, to=1900, seek=1869,
       stat="Suez, 1869: London→Bombay <b>10,600 → 6,200 nm</b>",
       text="Within a single lifetime the ocean stops being a wind field and becomes a "
            "distance. Iron hulls, screw propellers, and above all engines that burn a third as "
            "much coal for the same power.\n\n"
            "The Suez Canal opens in 1869 and sail cannot use it. The fastest sailing ships "
            "ever built are launched in the same decade they are made obsolete.",
       view=[35, 25, 330], lede="Within one lifetime the ocean stops being a wind field and becomes a distance.",
       cite="Griffiths, *Steam at Sea*; Suez Canal Authority."),
  dict(short="Steel & war", title="Steel, and two wars at sea", years="1900 – 1950",
       from_=1900, to=1950, seek=1943,
       stat="Battle of the Atlantic: <b>~14.7 M tons</b> sunk by U-boats",
       text="The dreadnought, the turbine, oil firing and the diesel motorship — and then two "
            "wars in which the decisive question is whether merchant ships can cross the "
            "Atlantic at all.\n\n"
            "They could, from May 1943, when the mid-ocean air gap closed. Of about 40,000 men "
            "who served in U-boats, some 30,000 died: the highest loss rate of any arm of the "
            "German military.",
       view=[-35, 48, 300], lede="Two wars in which the question is whether merchant ships can cross the Atlantic at all.",
       cite="Runyan & Copes, *To Die Gallantly*; uboat.net."),
  dict(short="The box", title="The box, and the sea as a cost line", years="1950 – 2026",
       from_=1950, to=2026, seek=2000,
       stat="<b>~24,000 TEU</b> in one hull; ~80% of world trade by volume",
       text="A steel box of standard dimensions, first carried on 26 April 1956, removes most "
            "of the cost of moving anything anywhere — and with it most of the reason for a "
            "port to be where it is.\n\n"
            "The route of a modern ship is set by lock chambers and dredged channels rather "
            "than by wind. The ocean is still there; it has simply stopped being the thing that "
            "decides.",
       view=[70, 15, 380], lede="A steel box of standard size removes most of the cost of moving anything anywhere — and most of the reason a port is where it is.",
       cite="Levinson, *The Box* (2006); UNCTAD Review of Maritime Transport."),
]


# ═══════════════════════════════════════════════════════════ BATTLES ══════

B = [
  dict(id="armada", name="The Spanish Armada", lon=1.85, lat=50.97,
       date="Gravelines, 8 August 1588 (New Style) / 29 July (Old Style)",
       year=1588, tags=["Contested"],
       # ── THE CAMPAIGN, DAY BY DAY ──────────────────────────────────────────────────────
       # A battle card is a still, and a still cannot make the argument this project makes:
       # that the campaign IS a wind field with a fleet in it. So the Armada is not a dot on
       # a date — it is fourteen days of positions and winds off Medina Sidonia's own journal
       # (the Diario, printed in Fernández Duro, *La Armada Invencible*, 1884–85, II) and the
       # English side in Laughton, *State Papers Relating to the Defeat of the Spanish Armada*
       # (Navy Records Society, 1894).
       #
       # `w` is the direction the wind blows FROM, in degrees, which is the seaman's convention
       # and the one the sources use. `e` is the English fleet, and the reason it is here rather
       # than decorative: on all but one day it lies to WINDWARD of the Armada. Holding the
       # weather gauge for a fortnight is the whole military story, and it is visible in the
       # geometry without a word of commentary — which is the point of animating it at all.
       campaign=[
       # `rng` is the RANGE BETWEEN THE FLEETS that day, in metres, and it is the tactical story
       # of the whole campaign in one column. The English out-ranged the Armada and knew that
       # closing meant being boarded by a ship carrying three times their soldiers, so for eight
       # days they fought at 400-900 m and did almost no damage -- Wynter wrote afterwards that
       # he saw no ship sunk by gunfire in the Channel. At Gravelines they finally came in to
       # about a hundred metres, "half a musket shot", and in nine hours wrecked the fleet they
       # had failed to touch in a week. The globe's lon/lat separations are drawn for legibility
       # at ocean scale; at sea level they would put the enemy 30 km over the horizon.
         dict(rng=7000, d="30 July",  lon=-5.20, lat=49.95, elon=-5.05, elat=50.25, w=247, f=6,
              t="The Armada is sighted off the Lizard and forms its crescent. Howard and Drake "
                "warp out of Plymouth overnight and work to windward of it — the manoeuvre that "
                "decides the next fortnight."),
         dict(rng=900, d="31 July",  lon=-4.25, lat=50.18, elon=-4.35, elat=50.35, w=270, f=5,
              t="Action off Plymouth. The English hold the weather gauge and open at long range; "
                "neither fleet closes. Nuestra Señora del Rosario is disabled in a collision and "
                "taken by Drake that night."),
         dict(rng=4000, d="1 Aug",    lon=-3.20, lat=50.32, elon=-3.40, elat=50.44, w=270, f=4,
              t="Both fleets run east up the Channel. San Salvador blows up — a powder accident, "
                "not gunfire."),
         # ⚠ On this one day the ENGLISH are to leeward. The computed weather gauge caught the
         # error: the track had them north-east of the Armada under a north-east wind, which
         # would have handed them the gauge on the very day every account says they lost it.
         dict(rng=450, d="2 Aug",    lon=-2.45, lat=50.48, elon=-2.72, elat=50.36, w=45,  f=4,
              t="Portland. The wind backs to the NORTH-EAST before dawn and for a few hours the "
                "Armada holds the weather gauge — the one day it does. The hardest fighting of "
                "the campaign, and the wind goes back into the south-west by evening."),
         dict(rng=3000, d="3 Aug",    lon=-1.60, lat=50.55, elon=-1.85, elat=50.68, w=180, f=3,
              t="Light southerly airs. The Armada is now to leeward of a fleet it cannot catch "
                "and cannot escape."),
         dict(rng=550, d="4 Aug",    lon=-1.10, lat=50.60, elon=-1.32, elat=50.74, w=202, f=4,
              t="The Isle of Wight. The last chance to seize an anchorage — and the English "
                "shepherd the Armada east of the Owers shoal and past it. From here there is no "
                "harbour before Calais."),
         dict(rng=3500, d="5 Aug",    lon=0.30,  lat=50.78, elon=0.05,  elat=50.90, w=225, f=5,
              t="A day of no action. Medina Sidonia sends his fourth message to Parma and gets "
                "no answer: the army in Flanders is not embarked, and cannot be."),
         dict(rng=2600, d="6 Aug",    lon=1.85,  lat=50.97, elon=1.60,  elat=51.05, w=225, f=5,
              t="The Armada anchors in Calais Roads in good order — 'the most beautiful sight' "
                "an English officer had seen. It is also a lee shore with a foul tide, and no "
                "port to enter."),
         dict(rng=1400, d="7 Aug",    lon=1.90,  lat=50.98, elon=1.68,  elat=51.06, w=225, f=6,
              t="Just after midnight, eight fireships come down on the wind and the tide "
                "together. Not one Spanish ship burns. Almost every one cuts its cable — and a "
                "fleet without anchors on a lee shore is already beaten."),
         dict(rng=110, d="8 Aug",    lon=2.12,  lat=51.02, elon=1.95,  elat=51.08, w=315, f=6,
              t="GRAVELINES. Nine hours at musket range, the only close action of the campaign. "
                "⚠ The wind is CONTESTED: Medina Sidonia's journal says north-west, Wynter's "
                "report says south-south-west. Both men were there. The model shows Medina "
                "Sidonia's."),
         dict(rng=2200, d="9 Aug",    lon=2.90,  lat=51.42, elon=2.55,  elat=51.30, w=225, f=7,
              t="The Armada is driven onto the Zeeland banks and sounds SIX AND A HALF FATHOMS — "
                "about twelve metres, under ships drawing eight. It is the wind, not seamanship, "
                "that saves them: it veers into the south-west and carries the fleet clear into "
                "the North Sea."),
         dict(rng=5000, d="10 Aug",   lon=2.50,  lat=52.60, elon=2.20,  elat=52.40, w=225, f=6,
              t="North into the North Sea, because there is now no other way home. The return is "
                "north about Scotland and Ireland."),
         dict(rng=9000, d="12 Aug",   lon=-1.00, lat=56.00, elon=-0.70, elat=55.80, w=225, f=5,
              t="Off the Firth of Forth the English break off — out of powder and out of food. "
                "The campaign was decided by weather, victualling and an army that never "
                "embarked. The battle killed comparatively few; the passage home killed thousands."),
       ],
       rows=[["Armada, at the Lisbon muster", "130 ships · 57,868 tons · 2,431 guns"],
             ["Men", "19,295 soldiers · 8,050 mariners · 2,088 rowers = 29,453"],
             ["English fleet", "197 ships · 15,925 men"],
             ["Wind at Gravelines", "NW per Medina Sidonia; SSW per Wynter — unresolved"],
             ["Depth off Zeeland", "six and a half fathoms"],
             ["Ships lost", "35 (Casado Soto) – 63 (Fernández Duro)"],
             ["Men lost", "9,000 – 20,000; paymasters recorded 25,696 out, 13,399 back"]],
       text="The campaign is a wind field with a fleet in it, and the record says so in the "
            "commander's own hand.\n\n"
            "Medina Sidonia's journal, sent to Philip II, gives the weather day by day: a "
            "south-west wind out of Corunna on 22 July; 'the wind was West' when the Lizard was "
            "sighted; at dawn off Plymouth 'the wind had shifted to the WNW' and eighty English "
            "ships were **already to windward**. On the one day the Spanish held the weather "
            "gauge, off Portland, Howard's despatch records the wind at north-east.\n\n"
            "Then the fireships at Calais at midnight — eight of them, though Howard's own "
            "abstract says he prepared seven and Wynter believed there were six — and the "
            "anchors cut. The next morning the fleet was embayed on a lee shore in **six and a "
            "half fathoms**, and Medina Sidonia wrote that the pilots told him 'it was not "
            "possible to save a single ship… that God alone could prevent it. Being in this "
            "peril, without any sort of remedy, and in six and a half fathoms of water, God was "
            "pleased to change the wind to WSW.'\n\n"
            "More ships and men were lost to weather on the way home than to the English. "
            "Having cut their anchors at Calais, they could not hold off a lee shore in Ireland.",
       cite="Laughton (ed.), *State Papers Relating to the Defeat of the Spanish Armada* (Navy Records Society, 1894), Appendices E and G."),
  dict(id="trafalgar", name="Trafalgar", lon=-6.27, lat=36.18,
       date="21 October 1805", year=1805, tags=["Contested"],
       rows=[["British", "27 ships of the line, 2,148 guns, ~17,000 men"],
             ["Combined Fleet", "33 of the line (18 French, 15 Spanish), ~30,000 men"],
             ["Wind", "light air from the north-west; heavy westerly swell"],
             ["Closing speed", "about 1.5 knots"],
             ["Position, dawn", "Cape Trafalgar bearing E by S, seven leagues"],
             ["British losses", "449 killed, 1,217 wounded (three competing sets exist)"],
             ["Franco-Spanish", "~4,400 killed, ~2,500 wounded, 7,000–8,000 taken"],
             ["Prizes reaching Gibraltar", "four, of eighteen taken"]],
       text="Almost no wind, and a heavy swell running across what there was. *Victory* closed "
            "the enemy line at about a knot and a half, under fire, for the better part of an "
            "hour — which is why the approach was as dangerous as the battle.\n\n"
            "The storm afterwards did more damage than the action. Of the eighteen ships taken "
            "or destroyed on the day, **only four prizes ever reached Gibraltar**; nine were "
            "scuttled or wrecked within the week.\n\n"
            "The position here is reduced from Collingwood's despatch — 'Cape Trafalgar bore "
            "E. by S. about seven leagues' — which is the strongest primary attestation "
            "available. Published coordinates for the action differ by several miles and none "
            "is authoritative.",
       cite="Collingwood's despatch, *London Gazette Extraordinary* 15858, 6 November 1805; Royal Museums Greenwich."),
  dict(id="salamis", name="Salamis", lon=23.567, lat=37.951,
       date="late September 480 BC", year=-480, tags=["Contested"],
       rows=[["Greek fleet", "310 (Aeschylus, an eyewitness) – 378 (Herodotus)"],
             ["Persian fleet, as claimed", "1,207"],
             ["Persian fleet, modern estimate", "400–800"],
             ["Strait width", "~1,370–1,600 m at the narrows"],
             ["Greek losses", "~40 ships"], ["Persian losses", "~200–300 ships"]],
       text="A battle won by choosing water too narrow for numbers to matter.\n\n"
            "The Persian figure of 1,207 is the strongest candidate for a legendary number in "
            "this whole model. It is early — Aeschylus, who fought there, gives it in 472 BC, "
            "so the Greeks believed it — but it may be a deliberate echo of the Iliad's "
            "Catalogue of Ships. Herodotus's own account of attrition brings the fleet down to "
            "about 600–670 by his own arithmetic, and modern estimates run 400–800.\n\n"
            "Even the date is unsettled: proposals span 20 to 29 September, all back-calculated "
            "through the Attic calendar.",
       cite="Herodotus VII–VIII; Aeschylus, *Persians*; Lazenby, *The Defence of Greece*."),
  dict(id="lepanto", name="Lepanto", lon=21.25, lat=38.25,
       date="7 October 1571 (Julian) = 17 October (proleptic Gregorian)", year=1571,
       tags=["Contested"],
       rows=[["Holy League", "206 galleys, 6 galleasses, 76 galliots, 24 galleons"],
             ["Guns", "1,815 against 750"],
             ["Ottoman", "222 galleys, 56 galliots; ~88,000 men"],
             ["Wind", "against the Christians, then shifted in their favour near noon"],
             ["Ottoman losses", "~200 galleys; 20,000–40,000 killed"],
             ["Galley slaves freed", "~15,000"]],
       text="The last great battle of oared warfare, and a 2.4-to-1 advantage in guns decided "
            "it. The six Venetian galleasses — floating gun platforms towed into position ahead "
            "of the line — broke the Ottoman formation before the galleys ever closed.\n\n"
            "The date needs care. The Gregorian reform was three years away, so 7 October 1571 "
            "is necessarily Julian; the proleptic Gregorian equivalent is 17 October. Most "
            "popular accounts give the date bare, which is a silent error.\n\n"
            "Strategically it settled less than the celebrations claimed: the Ottomans rebuilt "
            "the fleet within a year and kept Cyprus.",
       cite="Guilmartin, *Gunpowder and Galleys*; Capponi, *Victory of the West*."),
  dict(id="tsushima", name="Tsushima", lon=130.15, lat=34.45,
       date="27–28 May 1905 (Gregorian) = 14–15 May (Julian, Russian style)", year=1905,
       rows=[["Russian voyage", "~18,000 nautical miles, ~7 months, ~500,000 tons of coal"],
             ["Russian fleet", "8 battleships, 3 coastal defence, 9 cruisers, 9 destroyers"],
             ["Japanese battle line", "4 battleships + 2 armoured cruisers"],
             ["Fleet speeds", "Japanese 15 kn; Russian 9 kn"],
             ["Rangefinders", "Barr & Stroud 1.5 m (~5,500 m) vs Lugeol (~4,000 m)"],
             ["Russian losses", "6 battleships sunk; 4,380–5,045 killed; ~6,000 captured"],
             ["Japanese losses", "117 killed, 3 torpedo boats"]],
       text="A fleet sailed two-thirds of the way round the world and was destroyed in an "
            "afternoon by one that was six knots faster and could see further.\n\n"
            "The Baltic Fleet had no base along the route: 30 to 40 coaling evolutions from "
            "sixty German colliers, a two-month wait at Madagascar, and a squadron tied to the "
            "speed of its slowest transports. Its second-in-command died the day before the "
            "battle and his death was concealed, so when Rozhestvensky was disabled, Nebogatov "
            "did not know he was in command.\n\n"
            "The dates are doubled because Russia stayed on the Julian calendar until 1918.",
       cite="Corbett, *Maritime Operations in the Russo-Japanese War*; Naval Historical Society of Australia."),
  dict(id="jutland", name="Jutland", lon=5.90, lat=56.70,
       date="31 May – 1 June 1916", year=1916, tags=["Contested"],
       rows=[["Grand Fleet", "151 ships; 28 dreadnoughts, 9 battlecruisers"],
             ["High Seas Fleet", "99 ships; 16 dreadnoughts, 5 battlecruisers"],
             ["British losses", "14 ships, 113,300 tons, 6,094 killed"],
             ["German losses", "11 ships, 62,300 tons, 2,551 killed"],
             ["*Queen Mary*", "1,266 dead, 20 survivors"],
             ["Armour penetration", "1 of 17 British shells burst inside German armour"]],
       text="Three British battlecruisers blew up. The modern verdict is that the cause was "
            "**practice, not design**: after Dogger Bank the fleet chased rate of fire, most "
            "anti-flash doors were removed, charge cases were opened early and cordite was "
            "stacked in the handling rooms. British cordite was also far more flash-sensitive "
            "than German propellant.\n\n"
            "*Lion* survived because one gunner had reimposed the magazine regulations and a "
            "dying Royal Marine officer ordered a magazine flooded.\n\n"
            "⚠ British reports are in GMT and German reports in CET. Mixing them creates ghost "
            "events an hour apart — *Lützow* is scuttled at 01:45 or 02:45 depending on which "
            "account you are reading.",
       cite="Campbell, *Jutland: An Analysis of the Fighting* (1986); Gordon, *The Rules of the Game* (1996)."),
  dict(id="midway", name="Midway", lon=-179.0, lat=30.5,
       date="4–7 June 1942", year=1942, tags=["Contested"],
       rows=[["United States", "3 carriers, 233 carrier aircraft, 127 land-based"],
             ["Japan", "4 fleet carriers, 248 carrier aircraft"],
             ["Japanese losses", "4 carriers, 1 heavy cruiser, 248 aircraft, 3,057 killed"],
             ["US losses", "1 carrier, 1 destroyer, ~150 aircraft, ~307 killed"],
             ["Torpedo Squadron 8", "15 aircraft attacked; 15 lost; 1 survivor"]],
       text="The famous 'five minutes' — Japanese decks supposedly crowded with armed and "
            "fuelled aircraft about to launch — comes from Mitsuo Fuchida's 1955 memoir and "
            "was demolished by Parshall and Tully working from Japanese primary sources in "
            "2005. Japanese doctrine spotted a strike on deck only shortly before launch; the "
            "decks were not loaded the way the story requires.\n\n"
            "The wreck positions found in 2019 put all four Japanese carriers in a tight "
            "cluster near 30°30′N, 179°W.",
       cite="Parshall & Tully, *Shattered Sword* (2005); RV *Petrel* survey, 2019."),
  dict(id="myeongnyang", name="Myeongnyang", lon=126.307, lat=34.568,
       date="26 October 1597 (Gregorian)", year=1597, tags=["Contested"],
       rows=[["Korean fleet", "13 panokseon"],
             ["Japanese warships engaged", "120–133 (of up to 330 vessels available)"],
             ["Strait width", "293 m at the narrowest"],
             ["Current", "11.5 knots at high tide, reversing about every 3 hours"],
             ["Japanese losses", "31 ships"],
             ["Korean losses", "no ships; 2 killed, 3 wounded, 8 drowned"]],
       text="Thirteen ships against a fleet, in a strait 293 metres wide with an 11.5-knot tide "
            "running through it that reverses every three hours. The water did most of the work.\n\n"
            "Two corrections the popular account needs. The famous **'333 ships'** conflates "
            "133 warships with about 200 support vessels; combat strength was ~133. And the "
            "**iron chain across the channel is not in the record** — it is absent from Yi "
            "Sun-sin's own war diary, and historians reject it, though it is promoted at the "
            "modern tourist site and dramatised in film.\n\n"
            "The 12-versus-13 ships discrepancy is a timing artefact: Yi's letter saying 'this "
            "subject still has twelve warships' was written before the thirteenth joined.",
       cite="Yi Sun-sin, *Nanjung Ilgi*; Hawley, *The Imjin War*."),
]


# ══════════════════════════════════════════════════════════ VOYAGES ══════
# Each voyage is a sequence of dated waypoints. The app densifies them along GREAT CIRCLES,
# which is the path a ship actually sails, and draws the track as a wake with a generated hull
# at its head — not a dot on a line.
#
# Where a leg's route is inferred rather than recorded, the card says so.

def leg(lon, lat, name, date=""): return dict(lon=lon, lat=lat, name=name, date=date)

VOY = [
 dict(id="sahul", name="The crossing to Sahul", dates="c. 65,000 BP", year=-63000,
      vessel="dugout", view=[124, -6, 250], tags=["Inferred"],
      legs=[leg(122.5, -8.6, "Timor"), leg(125.5, -9.6, "the last land in sight"),
            leg(128.5, -11.0, "open water"), leg(130.4, -12.4, "Sahul landfall")],
      rows=[["Minimum open-water leg", "70–90 km, out of sight of land"],
            ["Sea level then", "about 70 m lower than today"],
            ["Craft", "unknown — none survives"]],
      text="The first crossing anyone made that could not be seen across. Even at the lowest "
           "sea level of the glacial cycle there were 70–90 km of open water between Timor and "
           "Sahul, and the target could not be seen from the departure point.\n\n"
           "**No boat survives.** The evidence is the arrival. What the record does support is "
           "a negative: experimental crossings found bamboo rafts made under a knot against the "
           "Kuroshio and failed outright, while a 7.6 m cedar dugout crossed 225 km of open "
           "water in 45 hours. If the craft was anything, it was more like a dugout than a raft.",
      cite="Clarkson et al., *Nature* (2017); Kaifu experimental crossings, 2016–19."),

 dict(id="lapita", name="The Austronesian expansion", dates="c. 3300 BP – 1300 CE", year=-1000,
      vessel="voyaging-canoe", view=[-170, -15, 400], tags=["Attested"],
      legs=[leg(152.0, -4.0, "the Bismarcks", "c. 3300 BP"), leg(168.0, -16.0, "Vanuatu"),
            leg(178.0, -18.0, "Fiji", "c. 3000 BP"), leg(-175.2, -21.1, "Tonga"),
            leg(-172.0, -13.8, "Samoa", "c. 2800 BP"),
            leg(-149.5, -17.5, "the Society Islands", "c. 1000 CE"),
            leg(-139.0, -9.8, "the Marquesas"),
            leg(-155.5, 19.6, "Hawaiʻi", "c. 1000–1200 CE"),
            leg(-109.4, -27.1, "Rapa Nui", "c. 1200 CE"),
            leg(174.8, -41.0, "Aotearoa", "c. 1280 CE")],
      rows=[["Distance covered", "a third of the surface of the planet"],
            ["Direction", "largely INTO the prevailing trade winds"],
            ["Craft", "double hull, crab-claw sail, lashed-lug planking, no metal"],
            ["Windward capability", "about 75° made good — poor, and positive"]],
      text="The largest maritime expansion in human history, and it went **the wrong way for "
           "the wind**. The trades in the tropical Pacific blow from the east; the settlement "
           "runs west to east.\n\n"
           "That is only possible with a rig that generates lift rather than merely catching "
           "wind. A crab claw on a double hull makes good about 75° to the true wind — poor by "
           "modern standards, and the crucial thing is that it is *positive*, where a square "
           "rig in the same conditions makes none at all. Sailing upwind also means you can "
           "always run home if you find nothing, which is how you explore an ocean and survive.\n\n"
           "The East Polynesian dates are far younger than once thought: the short chronology "
           "moved Hawaiʻi, Rapa Nui and New Zealand several centuries later.",
      cite="Irwin, *Archaeology in Oceania* 58 (2023); Wilmshurst et al. (2011)."),

 dict(id="periplus", name="The monsoon crossing", dates="1st century AD", year=50,
      vessel="dhow", view=[60, 15, 250],
      legs=[leg(35.5, 23.9, "Berenike", "leave in July"), leg(43.5, 12.6, "Bab-el-Mandeb"),
            leg(53.0, 12.5, "the Arabian coast"), leg(65.0, 15.0, "the open crossing"),
            leg(75.78, 11.25, "Muziris, about 40 days out")],
      rows=[["Departure month", "July — 'that is Epiphi'"], ["Passage", "about 40 days"],
            ["Return", "November to January, on the north-east monsoon"]],
      text="The only wind system on Earth that reverses, and it fixes the sailing calendar of "
           "half the world. The *Periplus of the Erythraean Sea* names the month outright — "
           "'about the month of July, that is Epiphi' — four separate times for four separate "
           "routes.\n\n"
           "In this ocean the departure **date** is not a free variable. Miss the monsoon and "
           "you wait six months.",
      cite="*Periplus Maris Erythraei* §§14, 39, 49, 56."),

 dict(id="norse", name="The Norse Atlantic", dates="c. 870 – 1021", year=980,
      vessel="voyaging-canoe", view=[-35, 62, 280], tags=["Attested"],
      legs=[leg(5.3, 60.4, "Bergen"), leg(-6.8, 62.0, "the Faroes"),
            leg(-21.9, 64.1, "Iceland", "c. 870"),
            leg(-45.4, 61.0, "the Eastern Settlement, Greenland", "985"),
            leg(-63.0, 67.0, "Helluland"), leg(-55.5, 51.6, "L'Anse aux Meadows", "1021")],
      rows=[["Vinland, dated", "1021 CE exactly — from a cosmic-ray spike in the wood"],
            ["Craft", "clinker-built, one square sail, shallow draught"],
            ["Navigation", "latitude sailing along a parallel; no instruments"]],
      text="Crossing an ocean without being able to fix a position, in an open boat, by holding "
           "a latitude and running west.\n\n"
           "The Vinland date is one of the most precise in archaeology: a cosmic-ray event in "
           "993 CE left a spike in tree rings worldwide, and wood cut at L'Anse aux Meadows "
           "shows exactly 28 rings after it. **1021 CE**, to the year.",
      cite="Kuitems et al., *Nature* (2021); Viking Ship Museum, Roskilde."),

 dict(id="zhenghe", name="Zheng He's treasure fleets", dates="1405 – 1433", year=1415,
      vessel="treasure-ship", view=[75, 12, 330], tags=["Contested"],
      legs=[leg(118.8, 32.0, "Nanjing"), leg(109.2, 13.8, "Champa"),
            leg(112.7, -6.9, "Java"), leg(102.25, 2.2, "Malacca"), leg(97.1, 5.2, "Semudera"),
            leg(79.9, 6.9, "Ceylon"), leg(75.78, 11.25, "Calicut"), leg(56.4, 27.1, "Hormuz"),
            leg(45.03, 12.8, "Aden"), leg(45.34, 2.04, "Mogadishu"), leg(40.1, -3.2, "Malindi")],
      rows=[["Voyages", "seven, 1405–1433"],
            ["First fleet", "62 treasure ships, 27,800 men (*Ming Shi*)"],
            ["First reached East Africa", "the fifth voyage, 1417–19"],
            ["Claimed ship length", "138 m — from a novel of 1597"],
            ["Scholarly range", "50–76 m"]],
      text="Seven voyages across the Indian Ocean, sixty years before a Portuguese ship reached "
           "it — and then the archives were destroyed and the fleets were never rebuilt.\n\n"
           "**The famous dimensions come from fiction.** The 44-*zhang* figure first appears in "
           "Luo Maodeng's *Xiyang Ji* of 1597, a novel in which ships are built with divine "
           "help, and was carried into the official history in 1739. The Longjiang shipyard was "
           "excavated in 2003–04 and its largest building basin is 41 m wide, against a claimed "
           "52 m beam. The hull drawn here is at the defensible length.",
      cite="Church, *Monumenta Serica* 53 (2005); Longjiang shipyard excavation, 2003–04."),

 dict(id="dagama", name="Da Gama to India", dates="1497 – 1499", year=1498,
      vessel="carrack", view=[10, -10, 340], tags=["Attested"],
      legs=[leg(-9.14, 38.71, "Lisbon", "8 July 1497"), leg(-15.4, 28.1, "the Canaries"),
            leg(-23.6, 15.1, "Cape Verde"), leg(-29.0, -3.0, "out into the Atlantic"),
            leg(-25.0, -22.0, "the great arc — reconstructed; no longitude was ever logged"),
            leg(-5.0, -33.0, "standing east on the westerlies"),
            leg(18.0, -32.7, "St Helena Bay", "7 Nov 1497"),
            leg(18.5, -34.4, "the Cape of Good Hope", "22 Nov 1497"),
            leg(36.9, -17.9, "Quelimane"), leg(39.7, -4.05, "Mombasa"),
            leg(40.1, -3.2, "Malindi — and a pilot"),
            leg(75.78, 11.25, "Calicut", "20 May 1498")],
      rows=[["Out of sight of land", "93 days — 1,533 leagues, 5,180 nautical miles"],
            ["Crew", "~170 out (Barros); ~55 returned"],
            ["Return crossing", "89 days — 'three months less three days'"],
            ["Died of scurvy", "30 on the return crossing; as many again before"]],
      text="The *volta do mar*, at full scale. Rather than creep down the African coast against "
           "the wind and current, da Gama stood **west and south into the empty Atlantic**, "
           "swung round the South Atlantic high, and came in on the westerlies below the Cape: "
           "**93 days and 5,180 nautical miles** from Cape Verde to a landfall at about 30°S.\n\n"
           "It is the longest open-ocean passage anyone had deliberately made, and it was a "
           "wind-field calculation. Sailing away from your destination in order to reach it is "
           "the first great piece of applied knowledge about the ocean.\n\n"
           "**The arc drawn here is a reconstruction.** The journal records a heading and a "
           "date and never once a longitude, so where the fleet actually turned is not known — "
           "only that it was somewhere in the western South Atlantic.\n\n"
           "**The pilot taken on at Malindi was not Ibn Majid.** The journal calls him only 'a "
           "Christian pilot' — the Portuguese routinely mistook Hindus for Christians — and the "
           "chroniclers call him a Gujarati whose supposed name, *Malemo Cana*, is not a name "
           "at all but two titles: *mu'allim*, master, and *kanaka*, his caste. Tibbetts, "
           "Subrahmanyam and Khoury all reject the identification; Ibn Majid thought himself "
           "too old to navigate by 1498.",
      cite="Ravenstein (ed.), *A Journal of the First Voyage of Vasco da Gama* (Hakluyt, 1898); Tibbetts; Subrahmanyam."),

 dict(id="magellan", name="Magellan and Elcano", dates="1519 – 1522", year=1521,
      vessel="carrack", view=[-120, -15, 400], tags=["Attested"],
      legs=[leg(-6.35, 36.78, "Sanlúcar de Barrameda", "20 Sept 1519"),
            leg(-15.4, 28.1, "the Canaries"), leg(-25.0, 2.0, "the doldrums"),
            leg(-43.2, -22.9, "Rio de Janeiro", "13 Dec 1519"),
            leg(-56.0, -35.0, "Río de la Plata"),
            leg(-67.7, -49.3, "Puerto San Julián — the winter, and the mutiny", "31 Mar 1520"),
            leg(-68.5, -50.1, "Río Santa Cruz — the *Santiago* wrecked", "22 May 1520"),
            leg(-68.36, -52.33, "Cabo Vírgenes — a strait, entered", "21 Oct 1520"),
            leg(-71.31, -53.90, "Cabo Froward — All Saints, and the name", "1 Nov 1520"),
            leg(-74.73, -52.73, "Cabo Deseado — and cleared, 38 days", "28 Nov 1520"),
            leg(-100.0, -30.0, "into the Pacific"), leg(-140.0, -15.0, "98 days, no land"),
            leg(144.8, 13.4, "Guam", "6 Mar 1521"),
            leg(123.9, 10.3, "Cebu"), leg(124.0, 10.3, "Mactan — Magellan killed", "27 Apr 1521"),
            leg(127.4, 0.7, "Tidore, the Moluccas", "Nov 1521"),
            leg(105.0, -12.0, "Elcano turns west"), leg(75.0, -30.0, "the Indian Ocean"),
            leg(18.5, -34.4, "the Cape of Good Hope", "May 1522"),
            leg(-23.6, 15.1, "Cape Verde"),
            leg(-6.35, 36.78, "Sanlúcar", "6 Sept 1522")],
      rows=[["Ships", "five out; one home"],
            ["Men out", "237 on the payroll; ~239–245 actually sailed"],
            ["Circumnavigated", "~35 — 18 in *Victoria*, 12 held at Cape Verde, 3–5 from *Trinidad*"],
            ["Returned to Spain by any route", "~90, counting *San Antonio*'s 55 deserters"],
            ["Pacific crossing", "98 days; 21 died — 19 crew, a Patagonian, a Brazilian"],
            ["In the strait", "38 days; 570 km; the narrows are 3.7 km wide"],
            ["Magellan", "killed at Mactan, 27 April 1521, with a year still to run"]],
      text="The voyage that measured the planet, and it did so by nearly killing everyone on "
           "it. Five ships and about 270 men left; one ship and eighteen men came back.\n\n"
           "The Pacific crossing is the part that could not be planned for, because nobody knew "
           "how wide it was. **Ninety-eight days without fresh food.** They ate the leather off "
           "the yards. That the ocean was that big was the single most important thing the "
           "voyage found out.\n\n"
           "Magellan himself never completed it — he was killed at Mactan on 27 April 1521, "
           "with more than a year still to run. The circumnavigation is Elcano's.\n\n"
           "**The mutiny was not an Easter mutiny.** It broke out on the night of 1 April 1520 "
           "at Puerto San Julián — which was **Palm Sunday**, not Easter. Julian Easter that year "
           "fell on 8 April, which means Quesada was beheaded and quartered on Holy Saturday, "
           "the eve of it. The popular framing gets the liturgy exactly one week wrong.\n\n"
           "**And they came home a day early.** At Cape Verde the shore party asked what day it "
           "was and were told Thursday; the ship's log said Wednesday. Two men had kept "
           "independent logs — Pigafetta and the pilot Albo — and neither had missed a day. "
           "Sailing west with the sun, they had counted 1,023 days where a man standing still "
           "counted 1,024. It is the first empirical proof that the world needs a date line, "
           "and nobody had anticipated it.\n\n"
           "*The famous 18 is the number aboard* Victoria. *About 35 people actually went round; "
           "about 90 got back to Spain, most of them deserters who had turned for home in the "
           "strait two years earlier.*",
      cite="Pigafetta and Albo's log-book, in Stanley (ed.), Hakluyt Society, 1874; Navarrete's armada accounts."),

 dict(id="galleon", name="The Manila galleon's return", dates="1565 – 1815", year=1600,
      vessel="carrack", view=[-170, 30, 380],
      legs=[leg(120.98, 14.6, "Manila — leave in July"), leg(124.2, 12.5, "San Bernardino Strait"),
            leg(135.0, 25.0, "north into the Kuroshio"), leg(145.0, 35.0, "and further north"),
            leg(175.0, 40.0, "the westerlies, at 40°N"), leg(-160.0, 42.0, "the long empty leg"),
            leg(-135.0, 41.0, "still running east"),
            leg(-124.4, 40.4, "Cape Mendocino — landfall"),
            leg(-99.9, 16.85, "Acapulco, four to six months out")],
      rows=[["Westbound, Acapulco→Manila", "2–3 months"],
            ["Eastbound, Manila→Acapulco", "4–6 months, sometimes 8"],
            ["Urdaneta, 1565", "Cebu 1 June → Acapulco 8 October = 130 days"]],
      text="The same two ports, opposite directions, and half the time or less one way. There "
           "is no argument in this whole model that makes the point more cleanly.\n\n"
           "Westbound you run down the north-east trades at 13°N and it is easy. Eastbound there "
           "is no wind at that latitude that will take you, so you must climb to 40°N, pick up "
           "the Kuroshio and the westerlies, cross the widest part of the Pacific, and come down "
           "the American coast. Thousands of extra miles, and men arrived dead of scurvy.",
      cite="Schurz, *The Manila Galleon*; Urdaneta's *tornaviaje*, 1565."),

 dict(id="cook", name="Cook's first voyage", dates="1768 – 1771", year=1770,
      vessel="east-indiaman", view=[170, -25, 400], tags=["Attested"],
      legs=[leg(-4.14, 50.37, "Plymouth", "26 Aug 1768"), leg(-16.9, 32.6, "Madeira"),
            leg(-43.2, -22.9, "Rio de Janeiro"),
            leg(-67.28, -55.98, "Cape Horn", "Jan 1769"),
            leg(-149.5, -17.5, "Tahiti — the transit of Venus", "3 June 1769"),
            leg(174.8, -41.0, "New Zealand, circumnavigated", "Oct 1769"),
            leg(151.2, -34.0, "Botany Bay", "Apr 1770"),
            leg(145.4, -15.7, "the Barrier Reef — aground", "11 June 1770"),
            leg(106.83, -6.13, "Batavia — and the dying begins", "Oct 1770"),
            leg(18.4, -33.9, "Cape Town"), leg(-4.14, 50.37, "home", "July 1771")],
      rows=[["Purpose", "observe the transit of Venus, then look for a southern continent"],
            ["Deaths at sea, first two years", "very few — Cook's diet worked"],
            ["Deaths after Batavia", "about a third of the ship's company, of dysentery and malaria"]],
      text="A voyage that solved scurvy and was then wrecked by dysentery. Cook lost almost "
           "nobody to scurvy in two years at sea — an astonishing result for the period — and "
           "then buried about a third of his company after a few weeks refitting at Batavia.\n\n"
           "The Barrier Reef grounding on 11 June 1770 nearly ended it: *Endeavour* was held off "
           "the bottom by a piece of coral wedged in her own hull.",
      cite="Cook, *Journals*, ed. Beaglehole; Royal Museums Greenwich."),

 dict(id="greatwestern", name="Steam crosses the Atlantic", dates="April 1838", year=1838,
      vessel="steamer", view=[-45, 45, 280],
      legs=[leg(-2.6, 51.45, "Bristol", "8 April 1838"), leg(-12.0, 50.0, "the western approaches"),
            leg(-35.0, 45.0, "mid-ocean"), leg(-55.0, 42.0, "the Grand Banks"),
            leg(-74.0, 40.6, "New York", "23 April 1838")],
      rows=[["Passage", "15 days 5 hours, about 8.2 knots"],
            ["Coal remaining on arrival", "200 tons"],
            ["Best sailing packet, same route", "about 40 days westbound"]],
      text="The moment the wind stopped mattering. *Great Western* crossed westbound — the hard "
           "direction, against the prevailing wind that made a sailing packet take forty days — "
           "in fifteen days and five hours, and arrived with 200 tons of coal still in her "
           "bunkers.\n\n"
           "*Sirius* beat her there by hours, having left four days earlier, and the story that "
           "her crew burned the furniture is a newspaper invention: they burned four barrels of "
           "resin and still had fifteen tons of coal.",
      cite="Fox, *The Ocean Railway*; Griffiths, *Steam at Sea*."),

 dict(id="woolrun", name="The wool clipper's run home", dates="1885 – 1895", year=1887,
      vessel="clipper", view=[100, -42, 400],
      legs=[leg(151.2, -33.9, "Sydney"), leg(175.0, -45.0, "into the Forties"),
            leg(-160.0, -50.0, "running the westerlies"), leg(-110.0, -53.0, "the Pacific leg"),
            leg(-67.28, -55.98, "Cape Horn"), leg(-40.0, -35.0, "north into the Atlantic"),
            leg(-30.0, -5.0, "across the doldrums"), leg(-25.0, 25.0, "the north-east trades"),
            leg(-10.0, 45.0, "the western approaches"), leg(0.5, 51.5, "London")],
      rows=[["Cutty Sark's best", "73 days Sydney → London"],
            ["Best day's run", "363 nautical miles — 15.1 knots averaged for 24 hours"],
            ["Why this route", "the westerlies blow round the world unbroken below 40°S"]],
      text="The last thing sail was still best at. The Suez Canal killed the tea trade for "
           "sailing ships in 1869 — there is no wind in a cut — so the clippers were driven onto "
           "the routes the canal did not help, and the Australian wool run was the best of them.\n\n"
           "It is a route that only makes sense if you read the wind: you do not sail back the "
           "way you came. You run east, all the way round the bottom of the world, on the only "
           "belt of wind on Earth that has no land in its way.",
      cite="Royal Museums Greenwich; Lubbock, *The Colonial Clippers*."),

 dict(id="baltic", name="The Baltic Fleet's last voyage", dates="1904 – 1905", year=1905,
      vessel="steamer", view=[60, 10, 420], tags=["Attested"],
      legs=[leg(21.0, 56.5, "Libau", "15 Oct 1904"),
            leg(2.8, 54.7, "Dogger Bank — they fire on trawlers", "22 Oct 1904"),
            leg(-9.5, 43.0, "Cape Finisterre"), leg(-5.8, 35.8, "Tangier — the fleet divides"),
            leg(-17.4, 14.7, "Dakar"), leg(9.0, -10.0, "the Gulf of Guinea"),
            leg(18.5, -34.4, "the Cape of Good Hope"),
            leg(48.3, -13.4, "Nosy Be — two months at anchor", "Jan 1905"),
            leg(95.0, 5.0, "the Malacca approaches"),
            leg(109.2, 11.9, "Cam Ranh Bay", "Apr 1905"),
            leg(130.15, 34.45, "Tsushima", "27 May 1905")],
      rows=[["Distance", "about 18,000 nautical miles, seven months"],
            ["Coal", "~500,000 tons, 30–40 coaling evolutions, 60 German colliers"],
            ["Result", "six battleships sunk in an afternoon"]],
      text="A fleet sailed two-thirds of the way round the world because it had no bases along "
           "the route, and was destroyed in an afternoon by one that was six knots faster and "
           "could see further.\n\n"
           "Coal is the whole story. Without a friendly port anywhere on the way, every ton had "
           "to come from chartered German colliers, and the squadron was tied to the speed of "
           "its slowest transports. This is what the age of steam did: it freed ships from the "
           "wind and chained them to fuel.",
      cite="Corbett, *Maritime Operations in the Russo-Japanese War*."),

 dict(id="boxroute", name="Asia to Europe, today", dates="the standing route", year=2020,
      vessel="container", view=[70, 15, 400],
      legs=[leg(121.5, 31.2, "Shanghai"), leg(114.2, 22.3, "Hong Kong"),
            leg(103.8, 1.26, "Singapore"), leg(100.0, 5.5, "the Strait of Malacca"),
            leg(79.9, 6.9, "Colombo"), leg(60.0, 12.0, "the Arabian Sea"),
            leg(43.5, 12.6, "Bab-el-Mandeb"), leg(32.6, 30.0, "Suez"),
            leg(14.0, 36.0, "the Mediterranean"), leg(-5.4, 36.0, "Gibraltar"),
            leg(-9.0, 43.0, "Finisterre"), leg(4.1, 51.95, "Rotterdam")],
      rows=[["Suez, since 1869", "London–Bombay 10,600 → 6,200 nautical miles"],
            ["Malacca, narrowest", "2.8 km at the Phillips Channel"],
            ["Largest hull, 2023", "399.9 × 61.3 m, 24,346 TEU"],
            ["What sets the route", "lock chambers and dredged channels, not wind"]],
      text="The last chapter is not about the sea at all. A modern container ship's route is set "
           "by **numbers written down by engineers** — the inside dimension of a lock, the depth "
           "of a dredged channel — rather than by anything the ocean does.\n\n"
           "Panamax is not a ship. It is the inside of a lock built in 1914, and for a century "
           "the world's fleet was designed around it. The ocean is still there. It has simply "
           "stopped being the thing that decides.",
      cite="UNCTAD *Review of Maritime Transport*; Suez Canal Authority; EIA chokepoint data."),
]


# ═══════════════════════════════════════════════════════════ PORTS ════════

def build_ports():
    """The modern World Port Index, thinned to what a globe can carry, plus authored
    historical ports with era prose.

    WPI is a US Government work (17 U.S.C. §105) — the licence is inferred from that statute
    rather than quoted from NGA's own pages, which carry no licence statement. Recorded as
    such in the attribution ledger."""
    src = os.path.join(DATA, "ports", "wpi.json")
    out = []
    if os.path.exists(src):
        with open(src) as f:
            raw = json.load(f)
        rows = raw["ports"] if isinstance(raw, dict) and "ports" in raw else raw
        for p in rows:
            try:
                lon, lat = float(p["xcoord"]), float(p["ycoord"])
            except (KeyError, TypeError, ValueError):
                continue
            size = (p.get("harborSize") or "").upper()
            if size not in ("L", "M"):      # a globe cannot carry 2,951 dots legibly
                continue
            depth = p.get("chDepth")
            rows_ = [["Country", p.get("countryName") or "—"],
                     ["Harbour size", {"L": "Large", "M": "Medium"}.get(size, size)]]
            if depth not in (None, "", 0):
                rows_.append(["Channel depth", f"{depth} m"])
            if p.get("drydock"):
                rows_.append(["Dry dock", {"L": "Large", "M": "Medium", "S": "Small"}
                              .get(str(p["drydock"]).upper(), str(p["drydock"]))])
            flags = [k for k, lab in [("loContainer", "container"), ("loOilTerm", "oil"),
                                      ("loSolidBulk", "dry bulk"), ("loLiquidBulk", "liquid bulk"),
                                      ("loRoro", "ro-ro")] if p.get(k)]
            if flags:
                rows_.append(["Handles", ", ".join(flags)])
            out.append(dict(name=(p.get("portName") or "").title(), lon=lon, lat=lat,
                            eyebrow="Port", kind="modern", rows=rows_,
                            text="", cite="NGA World Port Index (Pub. 150)."))
    return out


HISTORIC_PORTS = [
  dict(name="Lisboa", modern="Lisbon", lon=-9.14, lat=38.71, eyebrow="Port · the Atlantic gate",
       kind="historic", from_=-1000, to=2026, tags=["Attested"],
       rows=[["Armada sailed", "29–30 May 1588 (New Style)"],
             ["Muster taken", "9 May 1588 — 130 ships, 29,453 men"],
             ["Carreira da Índia", "from 1497"]],
       text="The port at the corner of Europe, where the Atlantic wind system can be used "
            "rather than fought. Every Portuguese voyage down the African coast and round to "
            "India began here, and the *volta do mar* is what let them come back.\n\n"
            "The Armada's muster was taken here on 9 May 1588 — a date often misread as the "
            "sailing date. The fleet actually cleared the Tagus on 29–30 May and did not leave "
            "Corunna until 22 July.",
       cite="Laughton (1894), Appendix G."),
  dict(name="Calicut", modern="Kozhikode", lon=75.78, lat=11.25, eyebrow="Port · the pepper coast",
       kind="historic", from_=-100, to=2026,
       rows=[["Da Gama arrived", "20 May 1498"], ["Monsoon window, inbound", "arrive Sept, on the SW monsoon"],
             ["Monsoon window, outbound", "depart Nov–Jan, on the NE monsoon"]],
       text="The far end of the monsoon system, and a working port for fifteen hundred years "
            "before any European reached it. The *Periplus* names this coast in the first "
            "century AD and gives the month to leave Egypt: July.\n\n"
            "Da Gama's arrival in 1498 did not open the route. It connected an Atlantic system "
            "to an Indian Ocean one that had been running on schedule for a very long time.",
       cite="*Periplus Maris Erythraei* §56; Subrahmanyam, *The Career and Legend of Vasco da Gama*."),
  dict(name="Batavia", modern="Jakarta", lon=106.83, lat=-6.13, eyebrow="Port · taken by force, 1619",
       kind="historic", from_=1400, to=2026, tags=["Attested"],
       rows=[["VOC headquarters", "from 1619, on the sacked city of Jayakarta"],
             ["Passage from the Netherlands", "mean 253 days (1770–75)"],
             ["English EIC, same route", "mean 173 days"]],
       text="Jayakarta was taken and destroyed in 1619 and rebuilt as the administrative centre "
            "of the Dutch East India Company. The port is the reason the passage times on this "
            "model are as well known as they are: the VOC counted every voyage, and 8,000 of "
            "them survive with dates.\n\n"
            "Those records are also why the model can be scored, and why one of its own "
            "founding claims had to be corrected — see About.",
       cite="Bruijn, Gaastra & Schöffer, *Dutch-Asiatic Shipping*."),
  dict(name="Elmina", modern="Edina, Ghana", lon=-1.35, lat=5.08,
       eyebrow="Port · São Jorge da Mina, 1482", kind="historic", from_=1471, to=2026,
       tags=["Attested"],
       rows=[["Castle built", "1482, by Portugal"], ["Taken by the Dutch", "1637"],
             ["Function", "gold, then people"]],
       text="The oldest European building south of the Sahara, and for three centuries a "
            "holding point on the Middle Passage. It is on this map because the *volta do mar* "
            "— the piece of wind-field knowledge that makes the whole Atlantic system work — "
            "was worked out on the voyages to and from this coast.",
       cite="Vogt, *Portuguese Rule on the Gold Coast*; Eltis & Richardson."),
  dict(name="Malacca", modern="Melaka", lon=102.25, lat=2.19, eyebrow="Port · the chokepoint",
       kind="historic", from_=1400, to=2026,
       rows=[["Taken by Portugal", "1511"], ["Phillips Channel, narrowest", "2.8 km"],
             ["Modern oil flow", "22.5 million barrels a day (2024)"]],
       text="The narrowest point on the sea route between the Indian Ocean and the Pacific, and "
            "therefore continuously fought over for six hundred years. It is still the busiest "
            "chokepoint on Earth.\n\n"
            "Ships wait here for the monsoon to turn. That has been true since before the port "
            "had a name in any European language.",
       cite="Pires, *Suma Oriental*; US Energy Information Administration, 2024."),
  dict(name="Roskilde", modern="Roskilde, Denmark", lon=12.08, lat=55.65,
       eyebrow="Port · where the ships were found", kind="historic", from_=800, to=2026,
       rows=[["Skuldelev ships", "five, scuttled c. 1070 to block the fjord"],
             ["Skuldelev 2", "30 m, 60 oars, built in Dublin in 1042 (dendrochronology)"],
             ["Replica measured max", "11 kn; the widely quoted 17 kn is an estimate"]],
       text="Five ships were sunk here about 1070 to block a channel, and being sunk is why "
            "they survive. Skuldelev 2 was built of Irish oak in Dublin in 1042 — the date and "
            "the place both come from tree rings, not from a saga.\n\n"
            "Its replica sailed 2,482 nautical miles to Dublin and back. Highest speed actually "
            "logged: 13.4 knots over the ground, downwind, in a tidal race. The '17 knots' in "
            "circulation is the museum's estimate of a maximum, not a measurement.",
       cite="Viking Ship Museum, Roskilde, *Thoroughbred of the Sea* (2008)."),
]


def main():
    os.makedirs(OUT, exist_ok=True)

    ports = build_ports()
    for h in HISTORIC_PORTS:
        h = dict(h)
        h["from"] = h.pop("from_", -70000)
        h["to"] = h.pop("to", 2026)
        ports.append(h)
    write("ports.json", {"ports": ports,
                         "note": "Modern set from the NGA World Port Index (US Government work); "
                                 "historical ports authored with citations."})

    vessels = []
    for v in V:
        v = dict(v)
        v["from"] = v.pop("from_")
        v["polar"] = RIGS[v["rig"]]
        if v["id"] in HULLS:
            h = dict(HULLS[v["id"]])
            # ── HOW MANY SAILS A MAST CARRIES IS A FUNCTION OF ITS DATE ────────────────
            # A mast built up in fidded sections is a late invention, and each section is one
            # more tier of sail. Before about 1400 a mast is a single spar carrying a single
            # square sail: that is the trireme, the cog, the longship, the Roman corbita.
            # TOPSAILS come in during the 15th century, on ships big enough that one course
            # was more canvas than a crew could handle in one piece — a topsail can be reefed
            # and handed separately, which is the whole point.
            # TOPGALLANTS follow around 1580, once topmasts could be sent down.
            #
            # ⚠ Without this the generator gave every square mast three tiers, so the TRIREME
            # carried a topgallant and stood 38.4 m of rig over a 36.9 m hull. A trireme has
            # one low mast and one sail, and she strikes it and leaves it ashore before battle.
            # A patch per ship would have left the same bug waiting for the next hull added.
            # ⚠ Use the MIDPOINT of the type's span, not `from`. `from` is when the type first
            # appears, and for something like the Middle Passage slaver that is 1501 — which
            # would rig an eighteenth-century ship as a caravel-era one. The vessel drawn should
            # be typical of the type, not its earliest possible example.
            yr = (v["from"] + v.get("to", v["from"])) / 2
            tiers = 1 if yr < 1400 else (2 if yr < 1580 else 3)
            h["masts"] = [dict(m) for m in h["masts"]]
            for m in h["masts"]:
                if m.get("rig") == "square" and "only" not in m:
                    m["only"] = tiers
            v["hull"] = h
        vessels.append(v)
    missing = [v["id"] for v in vessels if "hull" not in v]
    if missing:
        print(f"  (no hull yet: {', '.join(missing)})")
    write("vessels.json", {"vessels": vessels, "rigs": RIGS})

    voy = []
    for v in VOY:
        v = dict(v); voy.append(v)
    write("voyages.json", {"voyages": voy})

    chapters = []
    for c in CH:
        c = dict(c); c["from"] = c.pop("from_"); chapters.append(c)
    write("chapters.json", {"chapters": chapters})

    write("battles.json", {"battles": B})
    write("about.json", {"html": ABOUT_HTML})
    print("\nok")


def write(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {name:16s} {os.path.getsize(p)/1024:8.1f} KB")


ABOUT_HTML = """
<h2>Ships</h2>
<p class="lede">The ocean is not the empty space between continents. It is a machine — a standing
structure of wind belts, currents, ice and distance that is very nearly the same today as it was
in 1500 — and the history of seafaring is the record of people learning to read that machine and
building hulls that could exploit it.</p>

<p>Everything on the globe is computed per pixel from measured fields. There is no basemap image
anywhere in this project. The sea floor is GEBCO 2026 at about 2.4 km; the colour of the water
comes from monthly satellite chlorophyll and sea-surface temperature; the state of the surface
comes from a monthly wind climatology; the ice margin is measured, not a latitude threshold.</p>

<h3>What this model does not know</h3>
<ul>
<li><b>It cannot tell you about a particular day.</b> The wind field is a modern monthly
climatology used as standing structure. That is defensible for the general circulation over
centuries and not defensible for a named voyage. Every passage this model computes is a
<i>typical</i> passage.</li>
<li><b>The water is drawn far clearer than real water.</b> Real sea water is opaque below about
200 m; an exact rendering makes 92% of the ocean a flat black plane and hides the largest
landform on the planet. So the <i>colour</i> of the water is physical and the <i>relief</i> of
the floor is carried through the whole column at reduced contrast. That is a cartographic
choice, and this is it being disclosed.</li>
<li><b>Longitude was not solvable at sea until the 1760s.</b> Any position from a logbook before
then carries an error of hundreds of kilometres.</li>
<li><b>Southern Ocean sea ice before 1978 was never measured.</b></li>
<li><b>Deep-water wrecks are a map of where people have looked</b>, not of where ships sank.</li>
<li><b>There are no ocean currents in the routing engine.</b> No global surface-current
climatology could be found at kickoff that was both redistributable and downloadable without a
login. The set-and-drift term and the water-frame wind correction are both written and both
inert. This is the top item in the gap register.</li>
<li><b>The wind field is a monthly <i>vector</i> mean, and that understates the wind.</b>
Where the direction varies through a month the vector mean is much smaller than the wind a ship
actually feels — two weeks of westerly gale and two weeks of easterly average to a flat calm.
Measured on the shipped field, 35% of the world ocean shows a vector mean under 2 m/s, which is
not remotely true of the storm tracks. A documented floor of force 3 stands in until a
scalar-mean field is shipped.</li>
</ul>

<h3>How the model scores, right now</h3>
<p>The claim in the first paragraph is falsifiable, so here is it being tested. The engine
computes an East Indiaman leaving Lisbon in April and reaching Batavia in <b>119 days</b>. The
recorded figure, from 156 voyages in the Dutch-Asiatic Shipping database, is <b>237–253
days</b>.</p>
<p><b>The model is fast by about a factor of two</b>, and every missing term pushes it that
way: no currents, so no adverse set anywhere; no sea state, so no speed loss punching into a
head sea; no time in port, and the VOC spent about a month at the Cape on nearly every voyage;
a vector-mean wind with a floor, which flatters a hull in variable conditions; and a departure
from Lisbon rather than Texel, which removes the North Sea and Biscay.</p>
<p>The <i>ordering</i> and the <i>asymmetries</i> come out right — the eastbound Atlantic is
faster than the westbound, the Manila galleon's return leg is far longer than its outbound, and
a dhow leaving Calicut in January reaches Aden while the same dhow in July cannot leave at all.
The magnitude is optimistic and the reasons are enumerable. That is a result rather than a
failure, and it is the number the next round has to move.</p>

<h3>Where this model was wrong, and how we found out</h3>
<p>The project's own scoring target did not survive contact with the sources, and the correction
is on the record rather than quietly removed.</p>
<p>The famous story is that the <b>Brouwer Route</b> of 1611 cut the passage from the Netherlands
to Java from about twelve months to about six. Going to the underlying voyage records in the
Dutch-Asiatic Shipping database gives something different: the old route via Madagascar ran
<b>323–338 days</b> and the immediate post-Brouwer route <b>252–260 days</b>. The saving is about
two and a half months, not six.</p>
<p>Worse for the original framing, Solar and de Zwart (2017), working the same database, find
<i>“no significant trend over the late seventeenth and eighteenth centuries in the duration of
Dutch voyages to Batavia.”</i> Mean passages stayed at 238–253 days into the 1790s. The Cape leg
got slightly shorter while the Cape-to-Batavia leg got slightly longer, and the two cancelled.</p>
<p>So the model now has a <i>harder</i> test than the one it was given: it must reproduce roughly
330 days falling to roughly 255, and it must <b>not</b> reproduce a continuing improvement across
the eighteenth century, because there wasn't one.</p>

<h3>Three things the popular account gets wrong</h3>
<table>
<tr><th>The claim</th><th>What the record says</th></tr>
<tr><td>A square rig points “six points”, 67.5°, off the wind</td>
<td>That is a <b>heading</b>. With leeway the best case is 78–79° made good and the ordinary case
is 90° — no windward progress at all. GPS-instrumented replicas make good 71–76° in a light
breeze and <i>lose ground</i> in twenty knots.</td></tr>
<tr><td>Zheng He's treasure ships were about 138 m long</td>
<td>The dimensions first appear in a <b>novel of 1597</b>, 164 years after the last voyage. The
Longjiang shipyard basin that supposedly built them is 41 m wide against a claimed 52 m beam.
Scholarly estimates run 50–76 m.</td></tr>
<tr><td>Olympias, the trireme reconstruction, made 8.9 knots</td>
<td>A single momentary GPS reading. The Final Report says 8.3 knots is the honest figure,
“achieved only momentarily (if at all)”, with a cruise near 5.4.</td></tr>
</table>

<h3>Calendars and names</h3>
<p>Dates are stored as proleptic Gregorian and shown with the original style named. This is not
pedantry: the Armada is recorded in English Old Style, ten days behind the Spanish New Style;
Russia stayed Julian until 1918, so Tsushima has two dates; Japan changed in 1873. Places carry
the name in use at the displayed date with the modern name beside it, because on a map of empire
whose names are used is itself a claim.</p>
<p><b>Tonnage is not one unit.</b> Tons burden, builder's old measurement, gross and net register
tons, displacement, deadweight and TEU are different quantities. Every figure here names its
system, and they are never plotted on one axis.</p>

<h3>Sources</h3>
<p><b>Sea floor</b> GEBCO 2026 Grid (public domain; not to be used for navigation).
<b>Ocean surface</b> NASA Earth Observations — AVHRR sea-surface-temperature climatology, MODIS
chlorophyll and cloud fraction, NISE ice and snow extent (public domain; NEO is decommissioned on
1 September 2026 and these were mirrored before that).
<b>Wind</b> NCEP/NCAR Reanalysis 10 m monthly long-term means (public domain).
<b>Sea level</b> Spratt &amp; Lisiecki (2016) Late Pleistocene stack.
<b>Historical sea ice</b> NSIDC G10010 SIBT1850.
<b>Ports</b> NGA World Port Index (Pub. 150).
<b>Voyages</b> CLIWOC 2.1 (CC0) and Dutch-Asiatic Shipping as RDF (CC0).
<b>Coastlines</b> Natural Earth (public domain).</p>
<p>The Trans-Atlantic Slave Trade Database is licensed CC BY-NC. It is <b>cited and not
republished here</b>; the figures on the Middle Passage card are the published aggregates.</p>
"""


if __name__ == "__main__":
    sys.exit(main())
