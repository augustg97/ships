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

## Batch 6 — 2026-08-02

| Ship | Checked | Finding |
|---|---|---|
| Clipper | rig, records, construction | ⚠ **A clipper is not a sailplan.** Wikipedia: "Clipper does not refer to a specific sailplan; clippers may be schooners, brigs, brigantines, etc., as well as full-rigged ships." The card treated it as a rig type. It names a **hull** — fine lines built for speed. Recorded as the first row. Added: composite construction dated (after 1863, iron framework with wooden planking); the era's real day-run record, *Champion of the Seas* 465 nm in 1854, unbeaten until 1984 — distinguished from *Cutty Sark*'s own best of 363 nm, which the card had been presenting alone; *Sovereign of the Seas* 22 kn (1854); *Flying Cloud*'s NY→San Francisco record held until 1989; and the era's bounds, boom from 1843, ended by the Panama Railroad (1855) and Suez (1869). |
| Ship of the line | rates, rig, dimensions | Added the rating system (first 100+ guns, second 90–98, third 64–90, fourth 50), that the 74 was developed in France in the 1730s and became the most common size, that it is a two-decker with two complete gun decks, and Slade's British 74s at 167–171 ft gundeck. Existing dimensions confirmed against source. |
| Slave ship | capacity, the *Brookes* | Added the *Brookes*: 267 tons burden, **454 people permitted by the 1788 Act, reportedly as many as 609 carried before it** — 2.3 people per ton, the ratio the Act was written to reduce. Added *Henrietta Marie* at about 200 per passage. Kept our embarked/landed figures (12.5 m / 10.7 m, Trans-Atlantic Slave Trade Database) over Wikipedia's looser "as many as 20 million". |

**Model change, not just a card.** The dhow now sets **settee** sails — a quadrilateral — where the code had always built a lateen triangle. The comment on that line had read "a settee foot" since it was written while the code below it built a lateen; the distinction was known and never modelled.

⚠ **The settee took two attempts, and the first failed in a way no check but looking could catch.** The first version put the throat on the line from tack to peak — but that line *is the yard*, because a lateen's luff is its yard. Tack, throat and peak were collinear: the forward triangle had zero area and the after one was the original lateen exactly. The data was right, the code was present in the served file, and the render was correctly unchanged. Truncating a corner needs **two** new points, one along each edge meeting at it. Confirmed afterwards by counting: 4 sail meshes with settee against 2 as a lateen.

## Two harness faults found and fixed — 2026-08-02

⚠ **The Shipwright's selection was not addressable.** The URL carried the view but not the ship, so no baseline could target a hull and verifying one meant stepping the arrow keys a counted number of times and trusting the count. `#v=ship&s=<id>` now names a hull, and `writeHash` emits it. Two frames added: `ship-dhow` and `ship-junk`.

⚠ **Frozen did not freeze the Shipwright camera.** The globe's flight is pinned by `fly.t0 = -1e9`; the Shipwright pans and zooms by a per-frame ease toward a target, which is the same class of animation and was never pinned. Two consecutive captures of the junk differed by **26.1% of pixels**. A baseline taken from either would have failed against the next for no reason. `EASE = 1.0` under `FROZEN` — the camera arrives immediately. Both ship frames are now byte-stable across runs.

Remaining: Chinese junk, ocean steamer, container ship, USV.

## Batch 7 — 2026-08-02 — THE AUDIT IS COMPLETE (21 of 21)

| Ship | Checked | Finding |
|---|---|---|
| Chinese junk | rig, bulkheads, rudder, sizes | ⚠ **The battened lug is not a Chinese first, and the card counted it as one.** "Four genuine firsts in one hull" listed it beside the bulkheads, the axial rudder and the sea compass. Junks carried **square sails until about the 12th century** and then adopted the *tanja* sail and the fully battened rig **from the southern seas**. The other three stand; this one was adopted, not invented, and late. ⚠ Second correction, against the romantic claim: full-length battens hold the sail **flatter than ideal in every wind and REDUCE windward performance** against other fore-and-aft rigs — the card's 110° polar was right, the reputation is not. Added: pre-1500 trading junks 20–30 m; *Nanhai One* 30.4 m; Song claims of 71 m discounted as exaggeration "usually to twice or more of the actual lengths" (the same scepticism the treasure ship card already applies); bulkheads first documented by Zhu Yu by 1119; the rudder's oldest depiction on a pottery model from **before** the 1st c. AD, needing up to 20 hands in a blow; Ibn Battuta's 1,000 men (600 sailors, 400 men-at-arms) and "from twelve down to three sails"; the *Keying*'s 1846–48 voyage round the Cape to America and England. |
| Ocean steamer | propulsion, speeds | Added the propulsion sequence in order — paddles abandoned as impractical in a seaway, then the screw, turbines from *Lusitania* and *Mauretania*, diesel and oil firing from the early 1930s — and the crossing-speed ladder: under 10 kn and twelve days in the early 1840s, ~15 kn and seven days by the 1870s, 27 kn for the turbine pair, and **SS *United States* at 34.5 kn in 1952, 3 days 12 hours, a record that still stands**. Tone: opening announced significance ("The number that changed the world"); now states what the ship is first. |
| Container ship | first ship, limits | ⚠ **The first container ship was *Autocarrier*, February 1931, with 21 container slots** — a quarter-century before *Ideal X*. Both now shown; *Ideal X* keeps its place as the start of the intermodal box, which is the different claim. Added 40-ft units at ~90% of container shipping, ~90% of non-bulk cargo and >80% of world freight, and 16–25 kn with slow steaming at ~21 kn. ⚠ Two figures recorded as **contested** rather than overwritten, per rule 8: Neo-Panamax beam (49 m as built, raised to 51.25 m by the Canal Authority in 2018 — our 51.25 was current, Wikipedia's 49 is the original) and Malaccamax draught (25 m commonly, ~21 m in the article; binds no container ship either way). |
| USV | examples, history | Card was generic and its opening was ⚠ **meta commentary** — "Every other hull in this model exists to carry people" — the card describing the model rather than the vessel. Replaced. Added wave propulsion alongside wind and solar, and the named record: Saildrone SD 1021's fastest uncrewed Atlantic crossing (Bermuda–UK, Aug 2019), the 12,500-mile Antarctic circumnavigation over seven months, SD 1045 into Hurricane Sam (Sept 2021), *Soleil*'s first fully autonomous voyage (240 km in 7 hours, 17 Jan 2022), MV *Yara Birkeland* as the first autonomous cargo ship (Nov 2021, all-electric), and the origins — German remote-controlled FL-boats in the First World War, US Navy target and minesweeping craft in the Second. |

---

# The audit's finding, over seven batches and 21 ships

**Dimensions were mostly right. Rig was mostly wrong or absent.** That held from the first batch to the last and never weakened. The corrections: two masts on the trireme, five on the treasure ship, six on Great Eastern with a gaff rig where the model had square, two rig forms on the caravel, no mast count at all on the fluyt, the East Indiaman, the corbita or the carrack, a settee rather than a lateen on the dhow, two masts on the voyaging canoe, a brailed sail with no reef points on the corbita, a clipper that is a hull and not a sailplan at all, and a battened lug on the junk that arrived a millennium after the hull it is famous for.

Hulls are measured and published; rigs are drawn, and a drawing is easy to copy wrongly.
