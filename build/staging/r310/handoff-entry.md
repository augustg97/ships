
## Round 310 — 2026-11-24 — The clipper's spanker stowage is read off a photograph of Cutty Sark at anchor in Sydney, which shows no gaff aloft on her mizzen. The record now says 'lowered' with that plate as its provenance, and the builder already draws it so. Every other gaff sail and spanker in the fleet (15 masts on five hulls) now carries a provenance that opens UNREAD, and the audit convicts a mast that has neither a read nor a named silence. The Shipwright's furled card now names the spanker on the three square-rigged ships that carry one; before this round it left it out

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³⁸) for the clipper, which r309 named first. `build/staging/r310` did not exist. The load was 1.7 at the start and no process was hot. r309's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT (0y¹³⁸) ASKED.** The 74, the clipper and Great Eastern lowered every gaff onto its boom in the furled build, with nothing in the record to say whether a plate had been read. r308 had added `furlStow: 'brailed'` for Endurance's mizzen, off her plates. Each hull needs its own plate before the record says which.

**THE PLATE.** The clipper is a class hull carrying Cutty Sark's dimensions (64.8 m, 1869), so a plate of Cutty Sark is the nearest read. Commons' `Category:Cutty Sark (ship, 1869)` holds five photographs of her in port. Three (SLV H91.250-161, -162, -165) were pulled at 1920 px; the originals returned HTTP 429. -161 and -162 show a row of ships at a quay with no means of telling which is she, and -165 is taken from her bow with the mizzen out of frame. The one that reads is:

- State Library of Queensland, John Oxley Library, negative 146359: *The 'Cutty Sark' waiting in Sydney Harbour for the new season's wool*, 1885–94 (Commons `StateLibQld 1 146359 Cutty Sark (ship).jpg`, 706 × 1000 px). She is at anchor, photographed from high on her port quarter.
- Scale at the mizzen: about 11 px/m (167 px from the poop to the mizzen top). A gaff 0.25 m thick and over 10 m long would show at 3 px by 110 px or more. Her 0.3 m yards show plainly at this scale.
- `crop-mizzen-3x.png` (3x about the mizzen): the lower mast is bare and white from the crossjack yard down to the poop. No gaff stands on it and no brailed bundle lies along its after side. The poop is covered by an awning whose ridge runs aft from the mast at the height a boom would stand.

So her gaff is down, either lowered onto the boom or struck. The builder's lowered stowage is the nearer of the two stowages it can draw.

**CONTESTED, and the provenance says so:** this is one plate of one ship, 16 to 25 years after her launch and after her 1880 re-rig. It does not show where the gaff lies. Other clippers may have kept a standing gaff.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r310_record.py`):
  - the clipper's mizzen: `furlStow: 'lowered'` and a `furlStowProvenance` naming the plate, its scale, what it shows and what it does not;
  - 15 other masts (the 74's mizzen, Wyoming's six, Preussen's jigger, Great Eastern's six, the steamer's mizzen): a `furlStowProvenance` that opens `UNREAD`. It says the builder lowers the gaff by default, and what a plate would have to show to read 'brailed' or 'lowered'.
- BUILDER (`hull.js`): comment only. 'lowered' is drawn by the same FURLED branch as a mast with no `furlStow`. No geometry changed.
- CARD (`shipwright.js`, `SW_FURLED_CARD`): the card counted only masts rigged 'gaff', so a square-rigged ship's spanker was never named. It now adds a clause for any square mast with a spanker: "the spanker's gaff is lowered and the sail is stowed along its boom", or "the spanker is brailed in to the mast under its gaff" where every spanker's `furlStow` is 'brailed'. This changes the card of the 74, the clipper and Preussen.

**AUDIT.** Three new rules in `gaffSailRead` and the furled-card check:

- **A-LOWERED**, furled build of a mast with `furlStow: 'lowered'`:
  - exactly one Boom on the mast;
  - its Gaff is in the lowered state, with its jaws within 1.5 m of the boom's foot;
  - exactly one furl roll lies along the boom;
  - no Brailed sail bundle names the mast.
  - In the record, 'lowered' must carry a provenance that does not open UNREAD.
- **A-STOW-SILENCE:** every gaff sail and spanker carries `furlStow`, `gaffStow: 'brailed'`, or a `furlStowProvenance` that opens UNREAD. The record check now accepts 'lowered' as well as 'brailed'.
- **A-CARD-SPANKER:** a furled card names the spanker when she carries one, says 'brailed' only when the record brails every spanker, and names none when she carries none.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.**

- The render did not change, because the builder already lowered the clipper's gaff.
- `wit-clipper-furled-b320.png` (`#v=ship&s=clipper&sail=furled&b=320&l=25&z=0.9`, high off her starboard bow, on :8150 carrying every after file). The port-quarter camera (`b=140`) puts her stern behind the card.
- `wit-clipper-stern-b320-4x.png` (2x about the mizzen): the boom runs aft from the mizzen over the poop with the furled spanker rolled along it, and the gaff lies lowered on the roll. No spar stands aft of the mizzen between the crossjack and the deck, which is what the Sydney plate shows.
- The card under it reads: "The sails are bent to their spars and stowed: the square sails are rolled up on their yards and tied with gaskets, the spanker's gaff is lowered and the sail is stowed along its boom and the headsails are hauled down onto their stays. This is how she lay in harbour and at anchor."

**Rule 0, on `wit-b320-small.png` read whole: a rendered three-masted ship on a rippled sea, seen from high off her starboard bow, not a chart. Three facts a viewer can read off it without a legend: each of her three masts crosses five yards with the sails rolled up on them; she has a white deckhouse amidships and a black hull under a pale deck; her bowsprit and jibboom reach well out ahead with the headsails hauled down along their stays.**

**THE FRAMES.**

- The full check ran on web/ carrying the new record and the old card, from 12:15. Prediction: no frame moves, because the record change is geometry-neutral.
- After it exited, the audit, the builder comment and the card went into web/. `shipwright-furled` (the 74 furled, with its card on screen) was re-checked alone. Prediction: it moves, by the card's new clause only.

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³⁸) is closed for the clipper.** It stays open for the 74, Great Eastern, Preussen, Wyoming and the steamer: each of their 15 masts now names its silence in the record.
  - The 74 has no photograph from her working years. A plate for her would be a dated drawing or model of a 74 at anchor with her spanker stowed. Victory in dock is a first rate in a museum's stowage, so she is not the plate.
  - Great Eastern needs a photograph of her at anchor that shows her after masts.
- **(0y¹⁴¹)**, store the r298 and r303 traces in the record and extend A-SHEER-TRACE to them, stands as r309 wrote it.
- **(0y¹⁴⁰), (0y¹³⁹), (0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r309 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r311 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r311` already exists before writing into it. Then (0y¹⁴¹). Else (0y¹³⁸) for the 74, if a plate of a working 74 at anchor is in reach.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
