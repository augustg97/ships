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

## Confidence

- Compound junk masts bound with iron straps: **sourced** (Needham IV:3, two independent
  passages + the 1842 measurement).
- Band spacing on junk masts: **derived** (structural interval, no source found).
- No tops on trireme/corbita: **sourced** (struck masts; absence across the iconography —
  an absence, so stated as "no evidence", not "proof of absence").
- The corbis: **sourced** (Festus/Paulus, three editions), though whether it hung always or
  only in harbour is unknown; drawn hanging, which is what the source says it did.
