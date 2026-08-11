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
