# Mastheads and mast bindings outside the European square rig

Research pass, round 67 (2026-08-10). Two questions carried from round 64: how a great junk's
mast is bound, and whether the trireme and corbita should carry mast tops at all. Both answered
from sources before any code moved.

## 1. The Chinese made mast is bound with iron straps, not wooldings

**The question.** The treasure ship's masts draw 1.08 m through (beam 18 m × 0.06). Round 64's
European rule — a drawn diameter past 0.55 m is past what one tree gives, so the mast is MADE
and must be bound — plainly applies to the tree, not the nation. But the r64 binding (tarred
rope wooldings pinched between wooden hoops, iron hoops from ~1800) is documented EUROPEAN
practice, and copying it to a junk would be the r61 copy class.

**What the sources say.**

- Needham, *Science and Civilisation in China* IV:3, p. 414 n. a (read in full text this
  round): "Sometimes the heavy masts are compound, i.e. built up of several separate
  longitudinal spars **bound together with iron straps**. In 1842 British naval officers were
  astonished at the size of the main-masts of Shanghai junks. The circumference of one, taken
  a little above the deck, was **11 ft. 6 in.** [3.50 m ⇒ **1.12 m diameter**], its height
  141 ft., and its main yard 111 ft. long. Very strong spars were necessary for the enormous
  sail, and **there were no shrouds or stays**. See Bernard (1), vol. 2, p. 365." [Bernard,
  *Narrative of the Voyages and Services of the Nemesis*, 1844.]
- Needham IV:3, Fig. 938 caption (Swatow freighter, Waters Collection, NMM Greenwich): "One
  of **the usual iron bands and wedges** on the mast can also be seen" — bands were ordinary
  fittings on working junk masts, not an exception.
- Needham IV:3 on the mast itself: an 80-ft shan-mu (China fir) mast "is stepped in tall
  tabernacles", heel tenoned into a movable step timber bearing on the bulkheads; halyards
  run through "sheave pins passing through both masts and securing double halyard sheaves"
  (Fig. 927 key, item 34) — the masthead is a sheave through the pole, not a platform.

**What this fixes and what it settles.**

- The treasure ship's 1.08 m drawn diameter sits inside the ATTESTED envelope — the measured
  1842 Shanghai mainmast was 1.12 m through. The masts are compound and must be bound.
- The binding is **flat iron straps/bands**, dark iron, standing barely proud — NOT rope
  wooldings, NOT the paired pale wooden pinch-hoops of European practice. Those two features
  are the visual signature of the European method and would be false on a junk.
- **No shrouds, no stays, no hounds, no top, no doubling** — the junk mast is one unstayed
  pole with a sheave at its head. The existing model already draws the bare pole (r45); this
  round adds only the bands.
- Band SPACING is not given by any source found; the count is DERIVED from the same
  structural argument as the European interval (a binding about every 2.6 m of exposed pole)
  and the card says derived. Rattan lashing — suggested as a possibility in r64's note — was
  NOT substantiated for large seagoing junk masts in any source read; not modelled.
- Date: the junk is depicted at 1200 (Song — the record's own wrecks: Nanhai One c. 1160,
  Quanzhou c. 1272), the treasure ship at 1410. Song-and-later Chinese shipbuilding is
  iron-fastened (the Quanzhou wreck's iron nails; Needham passim), so iron straps are safe at
  both dates. When the Chinese transition to iron banding happened is UNKNOWN to this pass;
  no rule fires on earlier dates because no hull is depicted earlier.

## 2. The trireme and corbita carried no tops — and the corbita hung a basket

**The question.** `buildTop` drew a timber top platform at the head of every square-rigged
mast, including the trireme's two (era −700 to −200) and the corbita's two (−200 to +400) —
even the corbita's artemon, raked 48° over the bow. Round 64 flagged these as predating the
evidence.

**What the sources say.**

- *Warships of the Ancient World* (Osprey, accessed via academia.edu search this round):
  a "top or crow's nest [is] **rare in the ancient world when masts were struck or
  disembarked before battle**." The trireme struck its mast before action and left it ashore;
  every reconstruction drawing and *Olympias* itself carries a bare masthead with halyard
  sheaves.
- No Greek warship depiction (Lenormant relief, vase paintings) and no Roman merchantman
  depiction (Torlonia relief — this app's own corbita plate — Ostia mosaics) shows a masthead
  platform. Lookout duty in antiquity was at the BOW (the proreus), not aloft.
- Paulus Diaconus' epitome of Festus, *De verborum significatu* (verified in three
  independent editions this round: monumenta.ch, ALIM, Lindsay): "**Corbitae dicuntur naves
  onerariae, quod in malo earum summo pro signo corbes solerent suspendi**" — cargo ships
  are called *corbitae* because baskets (*corbes*) used to be hung at the top of their mast
  as their sign. The basket is what NAMED the ship type.
- Caveat that shapes the rule: masthead crow's nests DID exist in the Bronze Age
  Mediterranean — Medinet Habu's Sea Peoples relief (c. 1175 BC) shows them on both fleets —
  so "no tops before year X" is false as a universal. It is true of THIS fleet's span: no
  hull here carries a mast between Medinet Habu and the medieval seals. The earliest top
  among this fleet's types is the cog's (13th-century town seals: Ipswich c. 1200, Elbing
  1242); the cog (1150–1450) keeps its top.

**What this fixes.**

- The top platform becomes a DATED technology in the drawing, keyed to `S.year` (the
  depicted year) like the woolding/iron-hoop switch: no tops before the medieval period.
  Trireme (depicted −480) and corbita (depicted +200, the Torlonia relief's own century)
  lose theirs; every medieval-and-later square-rigger keeps its own.
- The corbita instead hangs the attested **corbis** at her mainmast head — a wicker basket
  on a lanyard, the type's sign, with the Festus story on its card. Data field `corbis` on
  the hull record, drawn-vs-declared both ways in the audit, like sternLights.
- Depicted years become DATA on every square-rigged hull (new: trireme −480, corbita 200,
  cog 1380 — the Bremen cog, the plate itself — fluyt 1620, slave-ship 1590, junk 1200,
  treasure-ship 1410). The audit now requires a year on any square- or junk-rigged hull,
  because three dated technologies (tops, wooldings/hoops, iron straps) hang off it.

## 3. The ancient masthead is the karchesion, and it is halyard gear (round 78)

**The question.** Round 67 stripped the trireme's and corbita's mastheads of their medieval
tops and left them bare. But the bare pole understates what was there: the yard HOISTED, so
the head carried the sheave the halyard ran over — r67's own survey noted "every
reconstruction drawing and *Olympias* itself carries a bare masthead with halyard sheaves"
and flagged the gear as implied, not drawn. The rig code confirmed the gap the hard way: the
single-yard halyard was drawn slings-to-rail direct, never touching the masthead — a rope
that could hoist nothing, on the trireme, the corbita and the cog alike.

**What the sources say.**

- Athenaeus, *Deipnosophistae* 11.49 (474e–475a), quoting Asclepiades of Myrlea (read this
  round, attalus.org text): "The lowest part of the mast is called the heel, which drops
  into the socket; the part approximately in the middle is the neck, and that at the top is
  the **karchesion**." Asclepiades derives the CUP called karchesion from the mast part —
  the masthead is the primary sense. His description continues: the karchesion carries the
  yard gear, and on the (large, Hellenistic-era) ships he describes, a *thorakion* stands
  on it.
- The thorakion caveat: Asclepiades attests a masthead structure on big ships of his own
  era, which is consistent with §2's Medinet Habu note — "no tops in antiquity" is false as
  a universal. It stays true of THIS fleet's two ancient hulls: the Torlonia relief (the
  corbita's own plate) shows no masthead platform, and the trireme struck her masts before
  action. The r67 gate stands.
- Form: no ancient masthead survives. The reconstruction *Olympias* carries halyard sheaves
  at a plain masthead (r67 survey, §2). The block drawn here — a squared head with a sheave
  slot and pin, slightly flared at the lip — is DERIVED from the pole's own diameter, and
  the part card says derived.
- Pollux, *Onomasticon* I.91 reportedly lists the karchesion among the mast's parts; the
  passage was NOT verifiable in an accessible edition this round and is not cited in the
  app.

**What this fixes, as classes.**

- Every single-tier square mast on a hull depicted before 1100 carries a karchesion at its
  head — the trireme's two (including the raked akateion at the bow) and the corbita's two
  (including the artemon). The gate is the mirror of the top's: the two fittings never
  share a pole, and a hull with no stated year gets neither.
- The single-yard halyard now leads slings → masthead → rail, over the sheave that is the
  karchesion's whole function (and the top's sheave on the cog). The multi-tier halyard
  lead (ties and jeers at the doubling) is a separate mechanism, unchanged this round.

## 4. The multi-tier lead: jeers for the lower yard, a tie through the topmast head (round 79)

**The question.** Round 78 fixed the single-yard halyard (slings → head sheave → rail) and
carried the multi-tier case: on every mast with more than one yard, the upper yards' falls
still ran slings-to-rail direct, touching no masthead — the same rope-that-hoists-nothing
fault one tier up. And the junk's halyard ran from the slings to a bare masthead and stopped:
no sheave drawn in the pole, no fall to haul on.

**What the sources say.**

- Falconer, *An Universal Dictionary of the Marine* (1780 ed., Project Gutenberg #57705,
  read verbatim this round), **JEARS**: "an assemblage of tackles, by which the lower yards
  of a ship are hoisted up along the mast to their usual station, or lowered from thence as
  occasion requires... In a ship of war, the jears are usually composed of two strong
  tackles, each of which has two blocks, viz. one fastened to the lower-mast-head, and the
  other to the middle of the yard... The two ropes, which communicate with these tackles,
  lead down to the deck." The lower yard does not ride a halyard to the rail: it hangs in a
  PAIR of tackles between the lower masthead and its own slings, with falls at the deck.
- Falconer, **TYE**: "a sort of runner or thick rope, used to transmit the effort of a
  tackle to any yard or gaff... The tye is either passed through a block fixed to the
  mast-head, and afterwards through another block moveable upon the yard or gaff intended
  to be hoisted; or the end of it is simply fastened to the said yard or gaff, after
  communicating with the block at the mast-head."
- Falconer, French glossary, **ENCORNAIL**: "the sheave-hole in a top-mast-head, through
  which the top-sail-tye is reeved, to hoist or lower the top-sail along the mast." The
  topsail yard's tie runs through the head of ITS OWN mast — the topmast — not the lower
  masthead and not the rail. Falconer's TOP-SAILS entry extends the mechanism up the rig:
  "The top-gallant sails are expanded above the topsail-yard, in the same manner as the
  latter are extended above the lower yard."
- The crossjack is the exception among lower yards: Falconer under CROSS-JACK calls it a
  yard whose sail is rarely set, and Steel's tables (already in the codebase, r70) rate it
  as a lighter spar; it hung in standing slings, not on jeers. Drawn accordingly: no jeers,
  no fall on the mizzen's lowest yard.
- The doubled rig (post-1850) changes which yards hoist at all: the lower topsail and lower
  topgallant yards are FIXED at the caps (the Howes arrangement already in the drawing —
  hull.js r48 comment: "a lower topsail yard fixed at the cap, an upper hoisting above
  it"), and by that date the lower yards sit on trusses, jeers having left the rig. So the
  jeers gate is the rig form itself: a mast with a `yards` list (the doubled rig) draws
  none; the classic fidded three-segment rig draws them on fore and main courses.
- Needham IV:3, Fig. 927 key, item 34 (already read in full, r67): junk halyards run
  through "sheave pins passing through both masts and securing double halyard sheaves" —
  the Chinese masthead is a sheave IN the pole, a slot cut through the masthead with the
  pin through both cheeks, no external block and no karchesion. The fall comes down to the
  deck abaft the mast, where the sail is worked.

**What this fixes, as classes.**

- Every HOISTING yard's fall now leads slings → the sheave at the head of its own mast
  section → down to the rail: the topsail over the topmast head (Falconer's encornail),
  the topgallant over the topgallant head, the upper topsail/topgallant and royal of a
  doubled rig over theirs. Fixed yards — the course of a doubled rig, the lower topsail,
  the lower topgallant, the crossjack — get NO fall, where before every yard above the
  course drew one.
- The course of a classic multi-tier rig gets its JEERS: two tackles from the lower
  masthead under the top down to the slings, falls to the deck beside the mast — Falconer's
  ship-of-war form, simplified to same-side falls.
- The junk masthead gets its through-pole sheave — two dark slots and a pin with proud
  ends, Needham's double sheave — and the junk halyard leads over it and falls to the deck.
- Rope ties are drawn on the doubled rigs too, where the 1902 reality is chain and wire;
  running rigging is rope everywhere in this model. A known simplification, applied to the
  whole class.

## 5. The Japanese mast carries no top; its head carries the semi (round 327)

From round 67 the top was gated on the depicted year alone: every square lower mast dated
1100 or later drew one. Every such hull in the fleet but one is European. The sekibune,
dated 1597, therefore drew a walled round fighting top of the European kind, with her one
yard hung under its trestletrees. That was reported in r326 as (0y¹⁶⁹), a yard inside the
trestletrees, and the top itself was the fault.

- **No top.** The sekibune's own plate, the Busan boat-barrier scroll of 1593 (University of
  Tokyo; Commons `File:Atakebune4.jpg`, 2095 px across, about 16 px/m at the ships), draws one
  rigged mast in the fleet, the atakebune's. Her yard is slung at the head, about 17 px (about
  1 m) of bare pole stands above it, stays run down from the head, and there is no platform
  (`build/staging/r327/plate-masthead-3x.png`). The scale cannot resolve a block.
- **The semi.** The Minamichita wasen museum (minamichita-museum.com/wasen/ship.html): the ropes
  on the yard, the boat and the anchor run through the semi, the sheave at the mast's upper end
  (帆柱上端の蝉（滑車）). The same statement appears on the Fleet Seven wasen page and in a
  Japanese dictionary entry for せみ (a small sheave used to haul things aloft; on a wasen the
  halyard is rove through it).

The record carries this as `masts[i].top = { form: 'none', masthead: 'semi', provenance }`.
The builder draws no top on such a mast and draws the block at the head, its top face the
truck. A-MASTHEAD-NONE in the audit holds the mast to its record; the r67 rule no longer
requires a top on it.

Confidence: no top, **sourced** for the tradition and **read** off the class's own plate at
the plate's resolution. The semi on a ship of 1597: **inferred** from the tradition, because
the sources attest it for the Edo wasen. Its form and size: **derived** from the pole.

## 6. A lateen mizzen on a square-rigged ship: bare pole, bare topmast, or topsail (round 328)

Three plates give three answers, and each hull now records which one it takes (`mizzenTopsail`,
`mizzenTopsailProvenance`).

- **Master W with the Key (Master W.A.), a three-masted ship, about 1475** (Commons
  `File:Master W with the Key ship.jpg`, 548 × 768 px, about 12 px/m). The mizzen is a single pole on the
  aftercastle carrying a lateen yard, with a pennant at its head. It has no top and no topmast. This is the
  carrack's answer (hull dated 1500). At about 12 px/m a top under about 1 m across would not show.
- **Wenceslaus Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, 1647** (Commons
  `File:Wenceslas Hollar - A Flute (State 2).jpg`, read at the 1920 px thumbnail, about 37 px/m). The mizzen
  carries the lateen, a small round top, and a topmast with shrouds to its head, a pennant staff over it, and
  no yard. This is the fluyt's answer (hull dated 1620). Rows: top 588, topmast head 424, staff end 349, deck
  hidden behind the poop rail at 868 ± 10. Recorded as `lateenTopmast`: the head stands 0.586 (0.556–0.620) of
  the top's height over the deck above the top, and the top is 0.143 of that height across.
- **Hocker's rig diagram of Vasa, 1628** (r320). The mizzen sets a square topsail over the lateen, from a
  crossjack under the top. The East Indiaman and the slave ship take this.

The builder draws the fluyt's top at 0.90 of the lower mast, which is the height the r321 lateen read keys the
yard to. The plate cannot set the top's height on its own, because the deck is hidden. The topmast's heel is
in the doubling at 0.88 of the lower mast. A-MIZZEN-TOPSAIL holds each lateen mizzen on a square-rigged hull
to its answer.

**Confidence.** The carrack's bare pole is **read**, from a plate 25 years before her date and at a scale that
cannot resolve a small top. The fluyt's top and bare topmast are **read**, from a plate 27 years after her
date; the height ratio is bound by the hidden deck. The fluyt's top form is the fleet's class top (round,
before 1710); Hollar draws it with a lower rim than the class top has.

## 7. The fluyt's three masts, read off Hollar's fluyt under sail (round 329)

Until r329 the fluyt's masts were Steel's 1794 proportions: a lower mast that is a share of Steel's main,
a topmast 0.60 of it and a topgallant half the topmast. Hollar's etching of a fluyt under sail (1647, *Navis
Mercatoria Hollandica, vulgo VLIET*, `build/staging/r328/dl/hollar-flute.jpg`, 1920 px, about 36 px/m at
the masts, bow at the left) draws short lower masts and long topmasts, as Hocker's Vasa diagram does.

| Row on the plate | foot (deck) | top | topmast head | pole head |
|---|---|---|---|---|
| fore, column 724 | 902 | 563 (r330; r329 read 600) | 285 | 161 |
| main, column 1143 | 933 | 528 | 192 | 47 |
| mizzen, column 1501 | 868 | 588 | 424 (r328) | 349 (staff, r328) |

Each height is a share of the distance between the fore and mizzen masts' feet, 777 px on the plate and
21.53 m on the built hull, as on the East Indiaman and the slave ship (r322). Built over each mast's foot:
fore top 9.39 m (8.37 m from r329 to r330), topmast head 17.10 m, pole head 20.53 m; main 11.22, 20.53, 24.55 m; mizzen top 7.76 m.
Before, the tops stood at 13.92, 15.65 and 13.41 m.

- **The deck is read differently at each mast.** At the fore it is the foot of the forecastle rail's lattice.
  At the main it is the waist rail, where the mast comes out from behind it. The waist deck is hidden, and
  the men in the waist show only their heads over the rail, so the deck may be up to 0.8 m lower. At the
  mizzen it is r328's 868 ± 10.
- **The pole above each topmast is built as the topgallant mast.** Under sail Hollar draws it bare, with a
  pennant on it and no yard crossed. His second plate of the same year (the fluyts at anchor, *vulgo VLIETEN*,
  `fleuten-1647.jpg`, 644 px wide) draws topgallant masts with yards crossed on the fore and the main. So the
  three tiers stand.
- **The main's pole head touches the plate's top border line** (row 43), so it may stand a few pixels higher.
- **The stations disagree.** The plate puts the main 0.539 of the way from the fore to the mizzen; the hull's
  stations put it at 0.606. Hollar draws the ship a little from forward of the beam, so the span is
  foreshortened and every height may be a few per cent high. Both are CONTESTED in the record.
- The lateen mizzen takes its lower pole from the recorded top over `lateenTopmast.topOfLower` (`mastLowerOf`),
  so the r328 topmast, keyed to the top's height, came down with it. The lateen yard is keyed to the stations
  (r321) and did not move. Its peak now stands just above the mizzen top, where Hollar draws it about level
  with the top; before r329 it stood well under the top.

**Confidence.** The tops and topmast heads are **read**, to about 5 px (0.006 of the span), on a plate 27 years
after the hull's date. The main's deck and the datum are **contested**.

**Round 330 (0y¹⁷⁴): the course yards, and the fore top re-read.** r329 put the fore top on row 600. That is
the row where the fore course yard crosses the mast's column 724: the yard, traced as a straight line from
column 660 to 772, gives 600.5 there. The top is the dark band on rows 563–572 at columns 740–758, aft of the
topsail's leech, with the topmast shrouds' deadeyes above it, drawn as the main top is drawn (band 528–540,
deadeyes above). The top's upper edge is the row on both masts, so the fore top is 563 and the main stays 528.
The fore top now stands 9.39 m over the mast's foot; from r329 to r330 it stood 1.02 m too low.

| Course yard (`r330_trace.py`) | traced columns | rms | axis column at the yard | crossing row | deck rows | share of deck-to-top |
|---|---|---|---|---|---|---|
| fore | 660–772 | 1.6 px | 708 | 604 | 902 | 0.879 |
| main | 1065–1205 | 1.4 px | 1159 | 576 | 933 and 963 (hidden deck) | 0.881 and 0.890, mean 0.886 |

The axis at the yard is taken on the line from each mast's foot to its topmast's cap (fore 693, 285; main
1176, 192). Both yards are drawn sloping, the after yardarm higher, because they are braced round and the ship
is seen from a little forward of the beam; the model hangs each level at its crossing. Built, the fore course
yard stands 8.25 m over the mast's foot where it stood 5.57 m, and the main 9.95 m where it stood 7.49 m.
A-COURSE-READ now holds a course read and a mast read off the same plate to the same top row, and convicts a
course read at 0.97 of the deck-to-top height or more: r329's fore top would have given the fore course 0.987.

**Round 331 (0y¹⁷⁶): the topsail yards.** Each topsail yard is the head edge of the set topsail, traced the same
way (`build/staging/r331/r331_trace.py`) and crossed with the same axis line. The share is the yard's height over
the mast's foot, over the topmast's head over the same foot, the measure r324 took off Vasa (`hoistRead`).

| Topsail yard | traced columns | points, rms | axis column | crossing row | foot row | topmast head row | share | built over the foot, before → after |
|---|---|---|---|---|---|---|---|---|
| fore | 674–734 | 21, 1.64 px | 695.7 | 339.6 | 902 | 285 | 0.9115 | 16.15 → 15.59 m |
| main | 1128–1206 | 27, 0.88 px | 1172.5 | 270.1 | 933 (963 gives 0.8987) | 192 | 0.8946 | 19.38 → 18.37 m |

Until r331 both yards were set at the class 0.88 of the topmast section, 0.944 of this height. Vasa's fore
topsail yard reads 0.901, so the fluyt's two reads lie either side of it. Each topsail is shallower by the same
amount, and the topgallant sail above it is deeper, because its foot sheets to the topsail yard.

**The plate crosses no yard on either topgallant mast**, so `hoistRead.topgallantMast` answers `unread` with that
reason, and the topgallant yard stays at the class figure. The plate at anchor draws topgallant yards, with the
sails furled, so it shows no set hoist. A-HOIST-READ now accepts a section answered `unread`, convicts a section
both read and unread, and holds a hoist read and a mast read off the same plate to the same foot and head rows.

**What the plate shows that the model does not:** Hollar's fluyt under sail sets two square sails on the fore and
the main, a course and a topsail, and nothing above the topsail. The model sets a topgallant sail on both.

**Round 332 (0y¹⁷⁷): no topgallant yard under sail.** Above each topmast's cap Hollar draws a bare pole with a
pennant: on the fore from row 285 to about row 85, on the main from row 192 to about row 55. No spar crosses
either pole and no cloth hangs from it; the lines that meet the pole are its stays and shrouds. His plate of
fluyts at anchor, from the same year, draws topgallant yards crossed on the same masts with the sails furled.
So the fluyt carried a topgallant yard and did not cross it at sea on the ship Hollar drew under sail.

The record now lists the section in `uncrossedAtSea` on the fore and the main, with
`uncrossedAtSeaProvenance` opening PLATE READ. The set build crosses no topgallant yard and sets no topgallant
sail on either mast. The topsail's lifts lead to the topmast's cap. The furled build is unchanged: the yard is
crossed, its sail furled on it, and it is lowered onto the topmast's cap by the r314 rule. The topgallant masts
and their stays are drawn in both builds. A-UNCROSSED-AT-SEA tests the record and both builds, and the
halyard-leg census and A-HOIST-READ count only the yards a set build crosses.

Not read: whether a fluyt crossed her topgallant yards at sea in light weather. One plate under sail is one
ship on one day, and the record says that it is one plate.

**Round 333 (0y¹⁷⁵, 0y¹⁷³): the main's station and the lateen yard.** r329 read the three masts' feet at
columns 724, 1143 and 1501, which puts the main 0.5393 of the way from the fore to the mizzen. The hull's class
stations put it at 0.606, 1.43 m further aft. The main now stands at the plate's share (`at` 0.504, through the
loft's deck line, which is flat at the main). The fore and the mizzen keep their stations, so the 21.53 m span
that every mast height is a share of is unchanged, and no height moved.

The mizzen's lateen yard was Vasa's (r321: 42.1°, 1.576 of the main-to-mizzen spacing, the heel 0.531 of it
before the mizzen). On Hollar's plate it is traced on every third row from 500 to 869 and fitted as a line on
123 rows (rms 1.84 px). Its peak is at row 486, column 1654.7, over the poop; its heel at row 880, column
1405.3, just above the poop rail. Against the 358 px between the main's and the mizzen's feet:

| | Vasa (r321) | Hollar's fluyt (r333) |
|---|---|---|
| angle from the horizontal | 42.1° | 57.67° |
| yard length, of the spacing | 1.576 | 1.303 |
| heel before the mizzen, of the spacing | 0.531 | 0.267 |
| built yard | 13.38 m | 12.93 m |
| built peak over the mizzen top | 1.5 m | 3.5 m (2.8 m on the plate) |

The built heel stands about 0.6 m higher than the plate's, because the model's deck lacks Hollar's rise of
sheer aft (still open in 0y¹⁷⁵). A-STATION-SHARE now holds every mast whose heights are read as shares of the
fore-to-mizzen span to the station the same plate draws, within 0.01 of the span. The East Indiaman's and the
slave ship's mains stand within 0.008 of Vasa's share. A-LATEEN-READ now reads its rows on a plate with the bow
at either side.

Not read: the fore's and the mizzen's stations along the hull (0y¹⁷⁹), and the sheer.

## Confidence

- Compound junk masts bound with iron straps: **sourced** (Needham IV:3, two independent
  passages + the 1842 measurement).
- Band spacing on junk masts: **derived** (structural interval, no source found).
- No tops on trireme/corbita: **sourced** (struck masts; absence across the iconography —
  an absence, so stated as "no evidence", not "proof of absence").
- The corbis: **sourced** (Festus/Paulus, three editions), though whether it hung always or
  only in harbour is unknown; drawn hanging, which is what the source says it did.
- The karchesion as the masthead's name and place: **sourced** (Asclepiades of Myrlea in
  Athenaeus 11.49, read this round). Its form and size: **derived** from the pole, stated
  as derived on the card. The halyard leading over the head: mechanical necessity — the
  yard cannot hoist otherwise.
- Jeers on the lower yards, ties through the mast sections' own heads: **sourced**
  (Falconer 1780: JEARS, TYE, ENCORNAIL, TOP-SAILS — all read verbatim, round 79). The
  same-side jeer falls: **simplification** (Falconer's ship-of-war falls cross to the
  opposite side of the mast). Fixed lower topsail/topgallant yards on the doubled rig:
  established in-project (r48, Howes rig). The junk's through-pole sheave: **sourced**
  (Needham IV:3 Fig. 927 key item 34, read r67); its drawn size: **derived** from the pole.
