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
| voyaging canoe | ☐ | |
| trireme | ☐ | |
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
