# r214 judgment — the cog's castle takes its fetched plan

## Sources, in the order they were read
1. Westphal, DAS LOGBUCH 27/1991 H.4 p.128 (r213/akhs-1991-4-kiel.txt), citing Lahn 1979: the
   castle's PLAN — after part trapezoidal, 4.75 m long, 7.20 m broad forward, 6.50 aft; two
   side parts 3.45 × 1.65 m; cross-planked deck over fore-and-aft beams on athwartship beams on
   posts; the castle overhangs the main deck aft and at both sides, so the after posts stand on
   two Heckbalken; starboard side wall: three stringer-like timbers and a plank below, 17
   vertical boards above (nail traces; three boards found). Before 1978 an open platform was
   assumed; the wall fragments overturned that.
2. Lahn Blatt 9 elevation at 60 px/m (r213/archaeonautica-img-1.jpg; the stern crop): the
   castle deck is level and runs 8.3 m (500 px) from its after edge — Westphal's 8.2 m; the
   after edge stands ~0.5 m abaft the sternpost's after face at deck height; the deck sits
   ~0.45 m above the top strake on short posts; the Gangspill is drawn ~1 m abaft the castle's
   FORWARD end. Castle deck ~5.4 m over the keel's underside; the DSM booklet says 7.02 m to
   the winch on the castle deck.
3. Roland von Bremen from the starboard quarter (r213/roland-ubena.jpg): a walled box of
   vertical boards on beam ends, overhanging the stern by ~1 m and the sides by ~0.5; two
   narrow decked wings forward along the sides with lower walls; the main deck open between.
   The Kiel Hansekogge 1991 plate (r213/hansekogge-kiel.jpg) agrees: the wing wall about 0.6
   of the after part's.

## Decisions
| item | value | provenance |
|---|---|---|
| plan (5 numbers) | 4.75 / 7.20 / 6.50 / 3.45 / 1.65 | RECORD, Westphal 1991 |
| overhang abaft the post's head at the strake | 0.70 m | PLATE READ, Lahn at 60 px/m, ±0.2 (0.5 at deck height + 0.4 m/m of the post's rake over 0.45 m) |
| the wings are decked at the castle deck's level, middle open | — | PLATE READ (one deck line, Lahn) + PHOTOGRAPH (Roland) |
| wall boards a side | 17 | RECORD |
| lower wall | 4 horizontal courses, 0.6 m | RECORD count (3 + 1), depth CLASS DEFAULT |
| wing wall height | 0.6 × railHM | PHOTOGRAPH READ, no scale |
| after end walled | — | PHOTOGRAPH (Roland, Ubena) |
| open rails on the wings' inner edges/forward ends, breastrail | — | CLASS DEFAULT (nothing recorded there) |
| castle deck level at afterdeck + 1.95 at the helm station | — | CLASS DEFAULT (r205's headroom), keyed to Ellmers's man |
| windlass / capstan station | u 0.875 | Ellmers's 'in its middle' applied to the recorded run (x 4.18–12.38 → middle 8.28) |
| tiller hand end | u 0.90 | TEXT read, behind the windlass |
| transom | 0 | Lahn Blatt 9: sharp stern on a straight raked post |

## What the first draft got wrong, and how it was caught
- The overhang was anchored on the post's line CONTINUED up to the castle deck (the r213 postPt
  extrapolation). This model's castle deck stands ~1.7 m over the sheer at the post (the main
  deck is laid at the sheer where the real deck is a bulwark lower), so the extrapolation
  carried the castle 1.4 m further aft than Lahn draws it and left the windlass in the open
  between the wings. Caught by measure_ship (castle-deck u 0.766 where 0.70 was expected).
  Fixed by anchoring on the post's after face at the top strake, where the stern beams lie.
- The after end's lower wall was built with a spurious 90° rotation: two 6.5 m boxes lay
  fore-and-aft through the stern (castle-wall-lower 11.45 m long, model extent +4.18 m).
  Caught by measure_ship and the astern capture.
- The after end's lower wall ran across the tiller. Opened a 0.7 m port; the audit's
  C-TILLER-PORT arm now reads every castle box against the tiller's box.

## Gates
- Audit: clean tree 33/0 with the new rule (r214/audit.out).
- inject-a (sever): cog alone — "a castle with no stern beams", "a castle off the record's
  overhang", "a castle hanging past its stern", "the castle wall off the record's board count
  (9 / 8, record 17)"; no other hull.
- inject-b (record dragged, railHM 0.3, overhangAftM 3.0): cog alone, record-blind arms —
  "a castle wall nobody could stand behind (0.30 m)", "a castle board that is not a board
  (0.30 m tall)", "a castle hanging past its stern"; the record-gated arms silent.
- Residual 0 (r213): both frames 0.000% at the clean HEAD. A one-off capture flap.

## Named for later
- The cog's main deck lies at the sheer; the real deck is ~1.2 m below the top strake with
  the through-beams at that level. Everything on her — castle deck, Gangspill top (model
  8.1 m over the keel against the DSM's 7.02) — rides about a metre high as a result.
- The Gangspill's station: Lahn's elevation draws it ~1 m abaft the castle's forward end,
  the text says 'on its top' (the middle was assumed). The plan cannot say which side of the
  centreline; a plan view of Lahn's castle sheet would settle it.
- The wings' inner edge and forward end: rails are a class default; no source seen.
