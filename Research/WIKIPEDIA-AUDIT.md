# Wikipedia audit — every ship against source

One row per vessel. "Checked" means the article was fetched and every figure in `build_data.py`
compared against it, not that the article was glanced at.

| Ship | Checked | Corrections made |
|---|---|---|
| Wyoming | ✅ | dimensions confirmed 110 m on deck / 140 m overall; the continuous-pumping detail came from here |
| Preussen | ✅ | LOA 147, LBP 122, 5,081 GRT, 47 sails, 6,806 m² confirmed; mast heights corrected off Steel's rule |
| Great Eastern | ✅ | **six** masts not three, **five** funnels not two, **gaff** rig not square, 18,915 GRT not 32,160, 17 m paddle wheels added |
| Titanic | ✅ | **bulkheads reached D deck, not E** — I had it wrong in her prose; crew 892→866, pax 1,317→1,342; 46,329 GRT; only **three** of four funnels drew smoke; service speed 21 kn added because the card was showing a sail polar's 9.6 kn |
| Cog | ✅ | dimensions, shell-first construction and single square sail all confirmed; added double-clenched iron nails and the flush-laid bottom |
| trireme | ✅ | **two masts, not one** — main *histos megas* and a small foremast *histos akateios*; oar banks are **unequal**, 62 thranitai to 54 and 54, because the top bank rows through the outrigger; added crew composition and Olympias's 180° turn inside 2.5 ship-lengths |
| treasure ship | ✅ | **five masts, not three** — contemporary accounts give 4 on a 2,000-liao ship and 6–7 on a 5,000-liao; added the full scholarly range (Xin Yuan-ou 61–76 m, Barker 70, Sleeswyk 52.5, Church 50.6), the Longjiang dock evidence (421 m long but only **41 m wide**), and the crew contradiction (200–300 documented against 8,000 implied) |
| voyaging canoe | ☐ | |
| Roman merchantman | ☐ | |
| sewn-plank dhow | ☐ | |
| Chinese junk | ☐ | |
| treasure ship | ☐ | |
| caravel | ✅ | **too long at 23 m** — typical hulls are 12–18 m and Niña/Pinta 15–20 m, at a length-to-beam ratio of about 3.5:1. Now 20.0 × 5.8 m, L/B 3.45. Added the two rig forms (*latina* all-lateen vs *redonda* with a square foremast), Niña and Pinta's figures, and the derivation of "carvel" |
| carrack | ☐ | |
| fluyt | ☐ | |
| East Indiaman | ☐ | |
| ship of the line | ☐ | |
| slave ship | ☐ | |
| clipper | ☐ | |
| ocean steamer | ☐ | |
| container ship | ☐ | |
| USV | ☐ | |

## What the audit keeps finding

Not dimensions — those were mostly right. It finds **claims in the prose** that no one checked
because they read well: E deck for D deck, three funnels for five, square rig for gaff. A figure
in a table gets verified; a sentence does not.

And one systemic thing: **the card's "best speed" comes from the rig polar**, which is
meaningless on a ship with no rig. `speedKn` now overrides it where an attested speed exists.

## Batch 4 — 2026-08-02

| Ship | Checked | Finding |
|---|---|---|
| Carrack | rig, masts, hull, tonnage | Rig row said "square fore and main, lateen mizzen" — correct, but the card never gave the MAST COUNT. Three **or four**. Added the six-sail inventory of a typical three-master (spritsail, foresail, mainsail, mizzen, two topsails), carvel construction, forecastle + high rounded stern with aftcastle, and the Portuguese India naus at over 1,000 tons. Tone: opening announced significance ("the hull that carried the Portuguese and Spanish empires") — replaced with description. |
| Fluyt | rig, masts, hull, tolls | ⚠ **FACTUAL ERROR CORRECTED.** The card asserted the narrow deck was shaped to evade the Danish Sound Toll, "charged on deck area" — a ship designed around a tax. Wikipedia states outright that this is **a persistent myth**: Sound Toll officers assessed dues from the bills of lading a master presented, not from any measurement of the ship. The claim is now shown as the myth it is, with the actual reason for the section (hold volume below, minimum weight and rigging above). Also added: **two or three masts** (the card gave none), square fore and main with lateen mizzen, pear-shaped section, shallow draught, minimal armament, Hoorn origin. Tone: cut "Not a better sailer. A cheaper one." |
| East Indiaman | rig, masts, tonnage, named ships | Card carried **no rig or mast count at all** for a square-rigged vessel. Added three masts and the sail plan. Added British EIC burden 1,100–1,400 tons and two named examples with dimensions: *Earl of Mansfield* 1795 (1,426 t bm, 175 ft × 43 ft × 17 ft) and VOC *Amsterdam* 1749 (1,100 t bm, 42.5 m). Added the armament point. Tone: ⚠ removed **meta commentary** — "something the model has to reproduce and mostly cannot flatter" discusses the model's own editorial position, the worst class in CARD-TONE.md. |

**Running finding, now four batches deep: dimensions are mostly right and RIG IS MOSTLY WRONG OR ABSENT.** Two of these three cards did not state a mast count at all. The audit has now found a missing or incorrect rig on the trireme, treasure ship, Great Eastern, caravel, fluyt and East Indiaman.

Remaining: voyaging canoe, Roman merchantman/corbita, sewn-plank dhow, Chinese junk, ship of the line, slave ship, clipper, ocean steamer, container ship, USV.
