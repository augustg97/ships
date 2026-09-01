## Round 181 — 2026-09-01 — the star in the waypoint: a title slot convicted as data, and the residual's own premise corrected

**The r180 queue head (residual 1, the Santa Cruz name) opened, and the first
thing found was that the residual's premise is wrong — checked in code before
any edit, the rule-8 habit applied to the handoff itself. The asterisked
string is NOT the voyage's name: it is voyages/magellan legs[6].name, a
WAYPOINT of Magellan's own route ("Río Santa Cruz — the *Santiago* wrecked",
22 May 1520). The phase hash the residual feared (app.js:2825) reads v.name —
"Magellan and Elcano", starless, untouched by the fix — so her frozen
position never was at risk. And the leg name feeds NOTHING else: the router
reads lon/lat only, the track cache keys v.id + raster sig (app.js:2671), and
a sweep of every web/js file found zero readers of leg name or date. The
era-4 frame checks the residual demanded therefore became a confirmation
rather than an acceptance.**

**The fix, at both levels. The datum: legs[6].name is now "Río Santa Cruz —
the Santiago wrecked", plain. The class: the r180 audit rule gains a second
clause, 'an asterisk in a title slot' — names and titles are plain-text
slots (cTitle/cSub and the hover tag go out through textContent, the voyage
list interpolates v.name into raw HTML, no title path runs inlineMD), so in
a title slot even a well-formed pair of stars prints as punctuation: ONE
star convicts, spent or not. Swept: vessels name/sub; voyages name/dates and
every legs[].name; chapters title/short/years/stat/lede; battles
name/date/campaign; ports name/modern/eyebrow/kind. Leg names are in scope
precisely BECAUSE nothing renders them today — a slot with no renderer is
where a star lies latent until someone wires the field into a label, which
is how this one survived r180's five-collection sweep. Python first: exactly
one member in the whole dataset. Then live, BEFORE the datum fix: 1
conviction, the right member, zero false positives across all collections.
After: 33/0.**

**Checked and named while scoping the rule: eraSm (app.js:1353) renders
ch.lede as raw innerHTML with a fallback to the first paragraph of ch.text.
All 8 chapters set a lede and none carries a star, so no live member — and
lede now sits in the title sweep, which makes it contracted plain-text: if a
future lede needs italics, the fix is to spend markdown at eraSm and move
lede out of the sweep, not to let the star through. ch.stat (readout rows,
raw innerHTML with its own authored <b> tags) is guarded the same way.**

**Frames, with timing stated: no opening 64-check ran; the attribution chain
per r180's precedent — r180's close check PASSED WHOLE 23:14:49–23:52:14 on
this HEAD's code (6aee578), and only build/loop.log changed between that exit
and this round's edits. The residual's demanded era-4 checks ran SOLO on the
fixed data against the committed baselines: map-floor 0.000%, descent-coast
0.003%, aboard-treasure 0.008% — all ok, capture-flap scale, an order under
the 0.05% gate — and the era-4 voyage list in the aboard-treasure capture
prints Magellan's frozen position ("9°N 23°W · FAR SIDE") exactly where the
baseline has it. Close 64-check on final code: CHECKRESULT. All web/ edits
landed before the check launched (the close discipline, r180); no chromium
ran beside it — the card shot and both pre/post audits ran before launch,
the final audits after exit.**

**Rule 1, the change looked at: the Magellan voyage card opened live on the
fixed data (build/staging/r181/z-magellan-card.png, read) — *Victoria*,
*Trinidad* and *San Antonio* all set as italic type in the rows, the DOM
probe returns starInCard:False, and the live datum reads "Río Santa Cruz —
the Santiago wrecked". Rule 0, answered in writing on the aboard-treasure
capture: the frame reads as a rendered sea, not a chart. Three facts a
viewer can read off it: the treasure ship's masts carry battened sails
fanned to the breeze with her wake spreading astern; a junk consort stands
off her port side under her own battened rig; the era strip reads Ocean
Crossing 1400–1800 at the year 1590, July on the water, with the voyage
list placing each era-4 passage at its own position and bearing.**

**Audit: AUDITRESULT. Deployed: data-version STAMPVALUE. Live verify below.**

**Named residuals, in order:** (1) r179: the windlass line's precedent set
stands ready for the anchors line — the Belitung composite grapnel heads it
with a DIRECT warrant (r178). (2) r177: Lucian's second machine. (3) r173:
the cog's Gangspill on the aftcastle top. (4) r173: the cog's castles, fore
and aft. (5) r173: the cog's pale rudder slab. (6) r174: the junk's and
treasure-ship's attested anchors, the panokseon's drawn-plate anchor, the
wasen yotsume-ikari — behind item 1's grapnel. (7) r176: the sekibune's
class-size question (kiwari read owed). (8) The sweep-derived boxy classes:
top (18), channel/cheek/cathead. (9) Preussen mast livery (r155).
(10) Endurance forecastle (RMG J9266). (11) Azzam crest span. (12) r164
risen black unpierced. (13) r165 fantail gallery wing walls. (14) r166
screen glass sun-bright. (15) r171 quarter-gallery sashes. (16) r171
authored tier fractions. (17) r172 the 74's lower capstan barrel. (18) NEW
r181, small: eraSm's fallback branch (app.js:1353) would render a first
paragraph's markdown raw if a chapter ever lost its lede — dead code today
(all 8 ledes set), one line to retire when touched.
