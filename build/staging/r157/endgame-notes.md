# r157 endgame — drafted while the opening run captured

## Accept reasons (fill numbers from the run's own output)

ship-junk accept reason:
"r157: stale-baseline residue NAMED and absorbed — the baseline predated r136's
grating-hole law (last committed r129, 08-19 07:32); the whole 0.0485%/2512 px diff is
the deck hatches alone (x-runs 1136-1668 in a 36 px band at the deck line), dark slat
plates in the old baseline vs the r136 woven grating over a dark hold in the current
render (crops build/staging/r157/junk-hatch-{base,cur}.png). Deterministic, not shimmer:
ship-galleass, re-baselined r156, reads 0.0000% today. No code changed this round."

ship-treasure accept reason (VERIFY the diff band first — same mechanism expected):
"r157: same stale-baseline class as ship-junk this round — baseline last committed r129
(08-19 07:32), predating r136's grating-hole law; diff read and confined to <FILL>.
Deterministic sub-gate residue, absorbed by re-capture. No code changed this round."

ship-endurance: check the run's score first; if ~0.04x, diff-read, same treatment.

## New frame (fill T after probe)

frames.json entry, insert after sea-dugout-floor:
{
 "name": "sea-canoe-floor",
 "path": "/?frozen=<T>#e=3&f=aotearoa&fb=160&fd=80&fz=25",
 "note": "THE DOUBLE HULL'S FLOOR, WATCHED - added r157. 80 deg down at 25 m over the followed Aotearoa canoe: the one angle that sees into the open lower hull past the rim - the r127 stowed gear (3.40 m steering paddle, bailer, coil on a -0.70 floor). Closes the r127 residual: the canoe's floor gear had no committed watching frame. e=3 stated because the app derives the era from the voyage's own year (1280) - the r127 diagnosis frag said e=4 and was silently overridden. Frozen t=<T> puts local noon on her longitude (subsolar lon = 0.006t rad); candidates spaced 1047 s all hold noon at 170 W, the pick is the one with HER near 170 W, mid-leg Rarotonga-Kermadecs, no land in sight."
}

FRAME-LOG manual entry for the new frame (capture --frame writes the baseline directly):
"sea-canoe-floor — NEW baseline, r157: the canoe's floor gear watched at last (r127
residual). 80 deg down at 25 m over the followed Aotearoa canoe at frozen t=<T> (noon on
her longitude, mid-passage Rarotonga->Kermadecs). Read before committing: <WHAT THE
IMAGE SHOWS>."

## Order
1. copy _current keepers to staging  2. accepts (junk, treasure[, endurance])
3. probe -> pick T  4. frames.json edit  5. capture --frame sea-canoe-floor + LOOK
6. check --frame ship-junk / ship-treasure[, endurance] / sea-canoe-floor -> all 0.000
7. run_audit (33/0)  8. build_site.py  9. HANDOFF  10. commit+push+live verify
