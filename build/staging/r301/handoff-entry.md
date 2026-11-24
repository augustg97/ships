
## Round 301 — 2026-11-24 — The Shipwright's build-stage cards no longer tell a steamship about canvas: a hull that sets no sail gets cards that list what each stage adds to her, and her last card gives her recorded machinery

**Queue check: August's second list stands worked in full (r57). This round took (0y¹²⁶), which r300 found in passing, ahead of (0y¹¹⁹)'s rail: the rail is a trace on one hull, while (0y¹²⁶) is a wrong statement shown on nine hulls. `build/staging/r301` did not exist, the load was 6.2 at the start, and the hottest processes were Spotlight's indexers (corespotlightd 83%). r300's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG. Two faults, both on every powered hull.**

1. The Shipwright decided a hull was powered when she had no masts at all. Titanic and Queen Mary 2 carry steel pole masts, and Dreadnought and Yamato carry masts rigged `none`, so all four got the sailing cards: "Lower mast, topmast, topgallant — each fidded through the doubling", "ratlines make them a ladder aloft", "The spars the square sails hang from", and "Canvas. She can now be driven by the wind rather than carried by it."
2. The five hulls with no masts (the carrier, the container ship, Ever Given, Azzam and the unmanned surface vessel) got four fixed paragraphs written for a container ship. They described the wrong stages: the probe of every powered hull's parts (`stages.json`) shows the house, bridge, funnels and boats all go on at stage 3 with the deck, masts and weapons at stage 4, and nothing at stages 5 and 6. The cards said "Machinery in" at 4, "Accommodation" at 5 and "Funnel and uptakes" at 6. They also gave facts that were wrong for most of these ships: the carrier, which has two reactors, was told about "a modern low-speed diesel"; the Saildrone, which has no engine, was told the same; and every one was told about "about 80 megawatts" of exhaust.

**WHAT CHANGED.**

- **Builder (`shipwright.js`).** "Powered" now means "sets no sail": no mast rigged other than `pole` or `none`, and no headsails. The furled card already used this test. One function, `swStageCard(spec, stage, parts)`, decides every card from stage 3 to 7. The page calls it, and the audit calls it through `window.SW_STAGE_CARD`. For a hull that sets no sail the cards are built from the parts the built hull adds at that stage, read from each mesh's `userData.part` tag, which is the same tag the click labels use. Stage 3: "The weather deck closes the hull. Added at this stage: …". Stages 4 to 6: "Fitted out" with the list, or "Nothing added" with "On a sailing ship this is when the rigging and yards go up; she sets no sail." Stage 7, "Afloat": anything added there (Yamato's floatplanes, the carrier's deck park, Ever Given's livery), then the recorded machinery. A hull without a machinery record says "Her machinery is not recorded in this model." The container ships' box paragraph moved to stage 3, where the boxes appear, rewritten as two plain statements about hatch covers and ISO corner castings. The old "the standard, not the ship, is the invention" sentence is gone. Sailing hulls' cards are byte-identical.
- **Record (`vessels.json`).** The nine hulls that set no sail each carry `hull.machinery` (one to three sentences) and `machineryProvenance`. The facts for Titanic, Dreadnought, Yamato, Queen Mary 2, the Ford-class carrier and Ever Given were read today from each ship's Wikipedia article, and the provenance quotes the figures. The container-ship type record states the type's usual plant and cites the Ever Given article's sentence for it. Azzam's and the USV's come from their own cards in this record, and their provenance says they were not checked against a builder's specification. Titanic's provenance also notes that the article gives her engines and outputs, while the turbine running on the engines' exhaust steam is the standard description of the Olympic class's machinery and is not in the quoted passage.
- **Layout (`index.html`, `styles.css`).** The ←/→/Furl row sat at a fixed `bottom: 272px`, and the card grows upward with its text, so a four-line card covered the arrows. The furled-canvas card, five lines long, already did this before this round. The nav is now a child of the card, at `bottom: calc(100% + 29px)`. Measured in the page (`nav-before.json`, then the same probe after): on Preussen the nav lands on the same pixels as before (597–628). On Titanic it moves up with her taller card to 559–590, 28 px above the card's top edge.

**AUDIT AND PROOFS.** New rule, A-STAGE-CARD. It decides "sets no sail" for itself, excludes the dugout (she is paddled, and her tradition writes her stage 3 to 7 cards), asks `SW_STAGE_CARD` for stages 3 to 7 with the parts the built hull adds at each stage, and flags any of these:
- a sailing word on the card;
- a card that lists additions at a stage that adds none, or lists none where the stage adds some;
- a last card without the recorded machinery;
- a hull that sets no sail with no machinery record;
- a machinery record with no provenance.

Final tree: 33 hulls, 0 problems. Five proofs ran on the :8150 copy (`proofs.log`):

| Proof | What was broken | Problems found |
|---|---|---|
| OLDPRED | the old "no masts" test | 29: Titanic, Queen Mary 2, Dreadnought and Yamato, each with 4 sailing cards, 2–3 stages misdescribed and a last card without machinery |
| FIXEDTEXT | a fixed "Machinery in" card at stage 4 | 8, one per hull that adds parts at stage 4 |
| OLDFILE | the whole pre-round `shipwright.js` | 9, "a stage card the audit cannot ask" |
| NOMACH | Titanic's machinery record removed | 1 |
| NOPROV | Titanic's machinery provenance removed | 1 |

The restored copy scored 0.

**READ ON THE PAGE.** `cards-after.json` holds every hull's eight cards, read off the page. For example, Titanic: stage 3 "Added at this stage: rudder, four funnels, superstructure, bridge, forecastle, poop deck and boats"; stage 4 "masts and cowl ventilators"; stages 5 and 6 "Nothing added"; stage 7 her three engines, 29 boilers and 159 furnaces. `cards-after-titanic-s7.png` and `cards-after-ever-given-s3.png` show the cards in the frame. Those two shots were taken before the nav fix, and they are what showed the arrows covered.

**Rule 0, on `cards-after-titanic-s7.png` read whole:** a rendered liner on a lit sea with a coast behind her, not a chart. Three facts a viewer can read off it without a legend:
- she has four buff funnels with black tops on a white superstructure;
- her two masts rake aft from the forecastle and from abaft the house;
- the card under her says what drove her: two triple-expansion engines and a turbine, fed by 29 coal-fired boilers.

**WHAT IS STILL WRONG IN THE SAILING CARDS: (0y¹²⁷), NEW.** The eight sailing cards are one list shown on every hull that sets sail, and three of them make claims that are false for many of those hulls:
- stage 3 says the deck "carries the guns", on the Great Eastern, the clipper, the junk and every merchantman;
- stage 3 says "Rudder hung aft", on the trireme and the other hulls steered by quarter oars (`quarterRudder` parts);
- stage 4 says "Lower mast, topmast, topgallant — each fidded through the doubling", on lateen, gaff, crab-claw and junk rigs whose masts are single poles.

Stage 7's "driven by the wind rather than carried by it" is the kind of sentence August has rejected. The fix is the same as this round's: compose each card from the parts the stage adds (`gun`, `rudder` or `quarterRudder`, the mast's own segments). Stages 3 to 6 appear in no baseline frame. A stage 7 rewrite moves every sailing `ship-*` frame (about 22).

**Named residuals.** (0y¹¹⁹) the rail, (0y¹²³) the stays, (0y¹²⁵) Preussen's sheer, and (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r300 list them.

**r302 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r302` already exists before writing into it. Then (0y¹¹⁹)'s rail: trace the plan's heavy shell-top line from stem to stern. Else (0y¹²⁷), the sailing cards. Else (0y¹²³).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check and the frame results are in the receipt that follows.**
