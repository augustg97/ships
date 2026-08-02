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

## Batch 5 — 2026-08-02

| Ship | Checked | Finding |
|---|---|---|
| Voyaging canoe | rig, masts, dimensions, voyages | Card gave **no mast count**. It is **two masts**. Corrected Hōkūleʻa's length 19.0 → **18.7 m** LOA, added beam 4.72 m, draught 0.76 m, displacement 7.3 t empty / 12.2 t loaded, sail area 50.2 m² for the pair, 4–6 kn under full sail, and **steered by a long paddle, not a rudder**. Added the crab claw's actual geometry — an isosceles triangle on two spars along its long sides — and the fact that it **widens upwards**, putting area high where wind is stronger, which raises the heeling moment and is why the rig needs a multihull. Added Mālama Honua 2014–17: 47,000 nm, 85 ports, 26 countries. Tone: ⚠ the opening was **both** announcing significance and **meta commentary** — "which is the reason this model does not put Europe at the root of the tree" — the card discussing its own editorial position. Replaced with description. |
| Roman merchantman (corbita) | rig, masts, tonnage, passages | Card carried **no rig and no mast count**. Added: one mainmast with a broad square mainsail, larger ships with more than one mast and more than one sail per mast — the raked *artemon* forward, a triangular *supparum* above the main. ⚠ Added the handling fact the card lacked entirely: **a classical square sail has no reef points and the yard does not come down.** It is **brailed** — lines run up the face of the sail through rings of lead or bone sewn to the cloth and gather it to the yard like a curtain. *Isis* corrected 53 → **55 m**, with beam over a quarter of that and a 13 m hold. Added standard capacity 50,000 *modii* ≈ 350 t; round trip ~70 days; 2,000–3,000 voyages a year. Passage rows corrected to the sourced legs (Rome→Alexandria in ballast 10–14 days; laden home a month or more). |
| Sewn-plank dhow | rig, masts, types, crew | ⚠ **RIG WRONG.** Card carried `rig="lateen"`. The dhow's characteristic sail is the **settee** — a quadrilateral, in effect a lateen with its forward point cut off, so the luff is short while the yard still rakes steeply. Recorded as the primary rig with the lateen as the variant. Added mast count (one to three), the four named types (*baghlah*, *boum*, *sambuk*, *jalibut*) with what distinguishes each, and crew ~30 large / ~12 small. |

**Sources:** Wikipedia *Hōkūleʻa*, *Crab claw sail*, *Grain supply to the city of Rome*, *Square rig*, *Dhow* (all accessed 2026-08-02); Casson 1971; Lucian, *The Ship*.

⚠ **A note on source selection.** Three first-choice articles were the wrong page — *Polynesian navigation* covers wayfinding and not vessels, *Roman navy* covers warships and not merchantmen, and *Artemon (sail)* does not exist. The specialist pages carried everything. **A general article on the subject is not the same as the article on the object**, and taking the first for the second would have returned "not stated" for facts Wikipedia holds in full.

Remaining: Chinese junk, ship of the line, slave ship, clipper, ocean steamer, container ship, USV.
