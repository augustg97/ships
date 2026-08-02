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
| caravel | ☐ | |
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
