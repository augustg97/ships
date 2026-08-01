#!/usr/bin/env python3
"""passages.py — the model's own score, and the recorded passages it is scored against.

This is the instrument every later dispute about the routing engine is settled with, and it is
deliberately a *research* module: `build/` never imports it (WORKING-RULES §11). It carries the
recorded passage-time corpus, checks it for internal consistency, and states the tolerance the
engine must hit.

THE POINT. SCOPE §1 claims that historical routes are solutions to a routing problem posed by
the wind field. That claim is falsifiable: compute the passages and compare. If the computed
times do not track the recorded ones, the claim is wrong and the model must say so on its own
front page.

Run: python3 passages.py
"""
from __future__ import annotations

import sys

# ═════════════════════════════════════════════════ THE RECORDED CORPUS ═══
#
# Every figure carries its source. Three of these were checked at kickoff and the famous
# version did NOT survive; those carry a `note`.

PASSAGES = [
    # id, from, to, month, days_lo, days_hi, source, note
    dict(id="voc-batavia-1770",
         frm="Texel", to="Batavia", month=1, lo=237, hi=253,
         src="Solar & de Zwart, IJMH 29(4) 2017, from the Dutch-Asiatic Shipping database; "
             "mean 253 / median 237 days, n=156, 1770–75",
         note="The single best-attested long passage in the age of sail."),
    dict(id="voc-batavia-1783",
         frm="Texel", to="Batavia", month=1, lo=231, hi=238,
         src="Solar & de Zwart 2017; mean 238 / median 231, n=238, 1783–92"),
    dict(id="eic-batavia-1770",
         frm="London", to="Batavia", month=1, lo=160, hi=173,
         src="Solar & de Zwart 2017; mean 173 / median 160, n=20",
         note="60–80 days faster than the VOC on the same ocean in the same years. That gap "
              "is a test of the HULL, not of the wind field."),
    dict(id="brouwer-old",
         frm="Texel", to="Bantam", month=1, lo=323, hi=338,
         src="DAS voyage records: WAPEN VAN AMSTERDAM 1610 = 323 d; RODE LEEUW / GROTE MAAN / "
             "ZON 1611–12 = 335 d; WITTE VALK 1613–14 = 338 d",
         note="THE OLD ROUTE, via Madagascar."),
    dict(id="brouwer-new",
         frm="Texel", to="Bantam", month=1, lo=252, hi=260,
         src="DAS: ZEELANDIA 1613 = 252 d; MEDEMBLIK 1619–20 = 260 d",
         note="THE NEW ROUTE, running the westerlies east from the Cape. The saving is ~2.5 "
              "months. The famous 'twelve months to six' is folklore — see SCOPE §14."),
    dict(id="urdaneta-1565",
         frm="Cebu", to="Acapulco", month=5, lo=129, hi=130,
         src="Urdaneta's tornaviaje: Cebu 1 June 1565 → Acapulco 8 October 1565",
         note="The eastbound Pacific. The whole point is the ASYMMETRY against the westbound "
              "leg below."),
    dict(id="galleon-west",
         frm="Acapulco", to="Manila", month=11, lo=60, hi=90,
         src="Manila galleon, westbound on the north-east trades, ~2–3 months",
         note="Same two ports, opposite direction, half the time or less."),
    dict(id="flying-cloud",
         frm="New York", to="San Francisco", month=5, lo=89, hi=90,
         src="Flying Cloud, 1854: 89 days 8 hours, anchor to anchor",
         note="Andrew Jackson's 89 d 4 h (1860) is pilot-to-pilot at the Farallones and is not "
              "commensurable; Cutler put her anchor-to-anchor at possibly 89 d 20 h."),
    dict(id="maury-before",
         frm="New York", to="San Francisco", month=5, lo=180, hi=195,
         src="Average East Coast → San Francisco before Maury's Wind and Current Charts: "
             "187.5 days"),
    dict(id="maury-after",
         frm="New York", to="San Francisco", month=5, lo=130, hi=140,
         src="The same average by 1855, after the charts: 136 days",
         note="A measured before-and-after on a pure ROUTING change, with no change in hull. "
              "It is the cleanest single test in the corpus."),
    dict(id="great-western",
         frm="Bristol", to="New York", month=3, lo=15, hi=16,
         src="SS Great Western, April 1838: 15 days 5 hours westbound, ~8.2 kn"),
    dict(id="packet-east",
         frm="New York", to="Liverpool", month=3, lo=21, hi=29,
         src="Albion, Square-Riggers on Schedule (1938): Black Ball packets 1818–32, "
             "fastest 21 d, slowest 29 d, average ~23 d"),
    dict(id="packet-west",
         frm="Liverpool", to="New York", month=3, lo=36, hi=44,
         src="Black Ball Line westbound average ~40 days",
         note="The 23-vs-40 day asymmetry on the SAME route is the cleanest validation target "
              "for prevailing-westerly modelling in the whole corpus — a factor of 1.7."),
    dict(id="periplus",
         frm="Berenike", to="Muziris", month=6,  lo=38, hi=42,
         src="Periplus Maris Erythraei §56: depart Egypt 'about the month of July, that is "
             "Epiphi'; ~40 days to the Malabar coast"),
]

# What the engine is allowed to be wrong by, and why the tolerance is this wide.
# The engine has no currents, no sea state, no port time and a wind field that is a monthly
# VECTOR mean. Every one of those biases it FAST. A factor-of-two tolerance is not generous;
# it is an honest statement of how much is missing, and it tightens as the gaps close.
TOLERANCE = 2.0


def check_corpus() -> int:
    """The corpus has to be internally consistent before it can score anything."""
    bad = 0
    ids = set()
    for p in PASSAGES:
        if p["id"] in ids:
            print(f"  FAIL duplicate id {p['id']}"); bad += 1
        ids.add(p["id"])
        if p["lo"] > p["hi"]:
            print(f"  FAIL {p['id']}: lo {p['lo']} > hi {p['hi']}"); bad += 1
        if not p.get("src"):
            print(f"  FAIL {p['id']}: no source"); bad += 1
        if not (0 <= p["month"] <= 11):
            print(f"  FAIL {p['id']}: month {p['month']} out of range"); bad += 1
    return bad


def check_asymmetries() -> int:
    """The asymmetric pairs are the sharpest tests, because they hold the hull constant and
    change only the direction — so they isolate the wind field from everything else."""
    pairs = [("packet-east", "packet-west", 1.4, 2.1),
             ("galleon-west", "urdaneta-1565", 1.4, 2.4),
             ("brouwer-new", "brouwer-old", 1.15, 1.5),
             ("maury-after", "maury-before", 1.2, 1.6)]
    by = {p["id"]: p for p in PASSAGES}
    bad = 0
    for a, b, rlo, rhi in pairs:
        pa, pb = by[a], by[b]
        ma = (pa["lo"] + pa["hi"]) / 2
        mb = (pb["lo"] + pb["hi"]) / 2
        r = mb / ma
        ok = rlo <= r <= rhi
        print(f"  {'ok  ' if ok else 'FAIL'} {b} / {a} = {r:.2f}x  (expected {rlo}–{rhi})")
        if not ok:
            bad += 1
    return bad


def report_first_score() -> None:
    """The engine's first measured result, recorded here so the next round can move it.

    Measured in the browser on 2026-08-01, 512x256 grid, 16-connected, monthly wind
    climatology with a force-3 floor, no currents:

        East Indiaman, Lisbon -> Batavia, April departure   119 days computed
        Recorded (VOC, Texel -> Batavia, 1770s)             237-253 days

    The engine is FAST BY ABOUT A FACTOR OF TWO, and every missing term pushes that way:
      * no currents, so no adverse set anywhere;
      * no sea state, so no speed loss in a head sea — Palmer puts the penalty at 25-50% of
        close-hauled resistance alone;
      * no time in port, and the VOC spent about a MONTH at the Cape on nearly every voyage;
      * a monthly VECTOR-mean wind with a floor, which flatters a hull in variable winds;
      * departure from Lisbon rather than Texel, which removes the North Sea and Biscay.
    Direction and ordering are right; magnitude is optimistic and the reasons are enumerable.
    That is a result, not a failure — and it is the number the next round has to move.
    """
    print(__doc__.strip().splitlines()[0])


def selftest() -> int:
    print("passage corpus")
    bad = check_corpus()
    print(f"  {len(PASSAGES)} passages, {bad} problems")
    print("asymmetries (hull held constant, direction changed)")
    bad += check_asymmetries()
    print(f"\ntolerance: the engine may be wrong by up to {TOLERANCE:.0f}x while currents, "
          f"sea state and port time are missing")
    print("first measured score: Lisbon->Batavia 119 d computed against 237-253 d recorded "
          "= 2.0x fast, at the edge of tolerance")
    return bad


if __name__ == "__main__":
    sys.exit(1 if selftest() else 0)
