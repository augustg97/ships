
## Round 338 — 2026-11-26 — Every one-sided part on the hulls now faces outward. Six builders wound their triangles the wrong way, so the renderer culled or inverted those faces: the port wales on every timber hull, the starboard frames on 31 hulls, one post on 28 hulls, every furled and brailed roll in the fleet, the cog's carlings and the USV's wing sail

**Queue check: August's second list stands worked in full (r57).** The round opened at 02:10 with 1,042 MB free on the Data volume and a load of 3.5. It took (0y¹⁸¹), the wale winding, as r337 asked. The disk stayed between 980 and 1,040 MB through the round. r335 and r336 stopped at 120–170 MB, where Bash itself failed. The floor for browser work this round was 500 MB.

**WHAT r337 GOT RIGHT AND WRONG.** An in-page probe (`r338_probe.py`) counted each wale triangle's face normal against the side it stands on. At HEAD, all 240 port triangles faced inboard and all 240 starboard triangles faced outboard. So r337 was right about the port side. It was wrong that the starboard beam showed no wale. Tinted red with FrontSide kept, the starboard wales show at the same place at HEAD and after the fix (`cr-red-stbd-before.png`, `cr-red-stbd-after.png`). They were drawn all along. r337 could not see them because the wale is the planking's colour.

**THE FIX, AND THE CLASS** (`r338_wale_winding.py` from r337, then `r338_edit_hull.py`, `r338_edit_hull2.py`, `r338_edit_hull3.py`, `r338_edit_hull4.py`; every replace asserted).

| builder | what was wrong | hulls | fix |
|---|---|---|---|
| `buildWaleGeometry` | one winding for both sides; the port strip faced inboard and was culled | every timber hull with wales (20 in the audit's build) | port side takes the reverse order |
| `buildFramesGeometry` (class ribbon) | the same, mirrored: the starboard ribbon faced inboard | 31 | starboard side takes the reverse order |
| `buildStemGeometry` | the ring order faces out only when the post is drawn downward; the class sternpost and a straight post's line run upward | 28 (one post each; the cog both) | each segment wound by the direction its rings run |
| `makeFurl` | (a, a+row, a+1) has the normal axis × tangent, which points at the axis: every roll was inside out | every furled or brailed roll | (a, a+1, a+row) |
| cog carlings | square tube walked aft with the inward ring order | cog (12) | reversed |
| USV wing | the +z and −z faces' orders swapped | usv | swapped back |

Titanic's well bulwark and its closed wash-port doors are drawn as two sheets, one facing out and one facing the deck, on purpose. The inboard sheet now carries `userData.facesInboard`.

**TWO AUDIT RULES.**
- **A-STRIP-FACES.** On each side of every FrontSide mesh, take the triangles whose normal is mostly athwartships (|nz| > 0.5 of its length) and whose centroid stands more than 0.05 m off the centreline. If at least 8 stand on a side and over 90% of them face the centreline, the part is convicted.
- **A-INSIDE-OUT.** The signed volume of a mesh about its own bounding-box centre is positive when it is wound outward. A FrontSide mesh of 24 triangles or more whose signed volume is below −0.6 of its unsigned sum is convicted. This rule found the furls on yards, the carlings and the wing, none of which has athwartships faces for the first rule.
- The first dry run, with only the wale fixed, gave 93 problems. That run found the frames, the posts, the Titanic sheets and Endurance's brailed roll. A-INSIDE-OUT then found the carlings and the wing.
- **Proof B** (the new audit on HEAD's builder, `proofB.out`): **131 problems**. They are: 20 port wales, 31 starboard frame sets, 28+28 posts by the strip rule and 14 by the volume rule, the brailed roll by both, the carlings, the wing, and Titanic's sheets (unflagged at HEAD).
- `audit-e.out`, :8150, the files as pushed: **0 problems on 33 hulls.**

**WHAT MOVED THAT THE CHANGE DID NOT MOVE.** Two frames showed differences that this change did not draw, and each was traced:
- In `shipwright`, the fluyt's rig at the left edge differs from the baseline. Every fluyt part has the same bounding box under the HEAD and r338 builders (`bb-old.json`, `bb-new.json`), and r337's capture of the frame differs from the baseline there by the same 2,000 px. The baseline was stale.
- In `ship-dhow`, two V-shaped lines cross the deck. Hiding each part in turn (`r338_hideall.py`) names them as the lateen sheets. Every dhow part has the same bounding box under both builders (`bbd-*.json`), and r337's capture already draws them, identical in both boxes. They post-date the r302 baseline and stayed under the gate alone.

**THE FRAMES.** The full ratchet launched at 02:33:32 on the built tree and died at 02:49 on `ship-panokseon`, a 150 s readiness timeout. It ran beside my bounding-box and hide probes, which was a mistake: one browser at a time. Its 16 frames are in `run1`, scored offline:
- **Accepted, each looked at** (`pair-*.png`): `shipwright` (the 74's two port wales), `ship-dhow`, `ship-junk`, `ship-trireme`, `ship-galley`, `ship-galleass` (each the port wale; the galleass also shows faint movement in the slave ship's rig behind the card, her berth neighbour), and `ship-usv`. Before, the USV's inside-out wing drew its far wall's inner face, with a dark band down the leading edge and a notched head. Now it draws a clean white foil.
- **Not accepted:** `ship-dugout` captured the globe (93%), the known capture fault; it is being recaptured alone.
- The rest of run1 was inside the gate: action, five globe frames, ship-canoe and ship-great-eastern.
- The remaining 50 frames are capturing one process per frame into `run2` (`run-each.sh`, predicted movers first). The receipt below scores them.

**Rule 0, read whole** (`rule0-shipwright.png`, the accepted `shipwright` frame). It is a rendered ship, not a chart: a 74-gun ship under sail on a rippled grey-blue sea, with a hazy coast behind and neighbouring ships in the berth line. Three facts a viewer can read off it:
1. She has two gun decks of black-and-ochre ports along her side.
2. She sets square sails on three masts, with a gaff spanker on the mizzen.
3. Her port wales are now drawn, but they read only as thin dark lines along the strakes.

**OPEN, FOR r339.**
- **A wale that cannot be seen.** The wales now render on both sides, but they are the planking's colour and are drawn as a ribbon 1.8% proud of the shell with no top or bottom face, so they cast no shadow line. Hollar's plate draws the fluyt's wales as heavy dark timbers. The structural fix is to build the wale as a timber: a section with top and bottom faces and its own thickness in metres, not a proportion. Its colour should come from a record field (tarred or painted), not a tuning constant.
- **Not witnessed this round:** the starboard frames in a skeleton stage (`r225/stage_capture.py`, after the capture run) and the furled rolls (`shipwright-furled`, first in the run2 list).
- After that, (0y¹⁷⁹), the fluyt's fore station. Every other open item from r334's list stands as written there.

**Live stamp VERIFIED: 1795689206 on https://augustg97.github.io/ships/index.html at 02:41 PST** (commit a1f0834). Part 1 of the frames (2674057) is pushed.

**THE FRAMES (receipt, 03:18).** 65 frames in the manifest. 44 were captured this round (`run1`: the opening run up to its death at 02:49; `run2`: one process per frame from 02:54 to 03:18, predicted movers first). Each was scored offline with frame_baseline's own compare() (`score-run2.out`).
- **Accepted, 18, each looked at** (`pair-*.png`, reasons in FRAME-LOG.md). Port wales now drawn on `shipwright`, `ship-dhow`, `ship-junk`, `ship-trireme`, `ship-galley`, `ship-galleass`, `ship-sekibune`, `ship-carrack`, `ship-slave-ship`, `ship-wyoming`, `ship-clipper`, `ship-endurance` and a neighbour in `shipwright-ahead`. The wing is no longer inside out on `ship-usv`. The rolls read as rolls on `shipwright-furled`, and Endurance's brailed roll in `ship-endurance`. The sternpost faces out on `shipwright-astern`.
- **Capture faults, not accepted:** `ship-panokseon` captured the globe in both runs (91%). `ship-dugout` captured the globe in run1 and is identical to its baseline alone in run2. `ship-dreadnought` failed its readiness wait in run2.
- **Inside the gate:** the other 24 captured frames, including every steel-hull ship frame captured (titanic, yamato, carrier, container, great-eastern, queen-mary-2, steamer, preussen), `ship-treasure`, `shipwright-corbis`, `shipwright-hounds`, the five globe frames, `action`, `descent*`, `aboard`, `aboard-off`, `aboard-coast`, `map-floor` and `sea-magnified`. Every prediction held: every MUST frame moved, and no CANNOT frame moved except by a capture fault.
- **Not captured this round (21), for r339's opening:** ship-dreadnought, aboard-carrier, aboard-cable, aboard-titanic, aboard-yamato, aboard-preussen, aboard-wyoming, aboard-treasure, aboard-clipper, ship-azzam, action-salamis, board-salamis, action-gravelines, action-lepanto, action-myeongnyang, wake-plan, ship-ever-given, sea-ever-given, passage-sahul, sea-dugout-floor, sea-canoe-floor. Add ship-panokseon, recaptured alone. The `aboard-*` and `action-*` frames show timber ships at a distance and may move by a pixel line where a port wale is in view. aboard-treasure and aboard-wyoming also carry r337's voyage-position fault.
- **Wale colour, for r339:** on the black-hulled Wyoming, clipper and Endurance, the wales draw as brown timber bands. That is the class wale material, which the starboard side already drew. Whether each ship's wales were painted with her hull is a record question, to be read off each plate before any colour changes. It belongs with the wale-as-a-timber item above.
