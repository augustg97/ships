
## Round 306 — 2026-11-24 — Endurance's two gaffs are built to the length and height Hurley's beset broadside draws them, and her main sail is brailed to the mast with no boom, as both plates of her that show the main draw it. The main gaff had been 3.1 m because the class cut it to 0.72 of a boom that the funnel had cut short. It is now 10.3 m, 0.55 of the lower mast as the plate reads it, the same share as the mizzen's

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³²), which r305 named next. `build/staging/r306` did not exist. The load was 1.4 at the start and no process was hot. r305's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** The class gaff is `min(0.42 × lower, 0.72 × boom)`, and the boom is cut to 0.78 of the room to the next obstruction aft. On Endurance's main that obstruction is the funnel, 5.5 m abaft the mast, so the boom came out 4.32 m and the gaff 3.11 m, about a sixth of the lower mast. The funnel stands 8.8 m over the waterline, and the gaff swings at 18 m, so the funnel did not limit the gaff at all. It limited it only through the boom. The throats of both gaffs stood at the class 0.86 of the lower mast.

**THE READ (`r306_gaffread.py`, `gaffread.json`, crop `plate-gaffs-4x.png`).** The plate is the beset broadside, RMG P00018 (`build/hurley-broadside.png`). Each gaff is a faint line rising aft from the mast under the cap. For each column of its visible run, the darkest row in a 13-px band was taken, and a line was fitted, weighted by how dark each row is against the sky. The gaff runs from the mast's axis along that line to its last visible column. The lengths are taken as shares of the lower mast's 146.7 / 154.7 px from deck to cap (r304's read of the same plate), so they do not depend on the plate's contested scale.

| Gaff | Length (px) | Angle | Fit residual (px) | Throat over deck (px) | Gaff ÷ lower | Throat ÷ lower |
|---|---|---|---|---|---|---|
| Main | 80.8 | 36.4° | 1.48 | 105.2 | **0.55** | **0.72** |
| Mizzen | 85.9 | 37.7° | 1.15 | 113.6 | **0.56** | **0.73** |

- Each end is good to about 3 px, so each share is good to about 0.03.
- The builder's peak angle is 35.5°, inside the read. The angle did not change.
- Check: on the plate both peaks stand over the cap, the main's by 6 px and the mizzen's by 11. The built main peak stands 0.74 m over its cap (about 6 px at the 7.8 px/m that the record's truck gives this mast), and the mizzen's about 1.0 m (8 px).

**THE MAIN SAIL IS BRAILED (`plate-main-foot-4x.png`, `build/hurley-fullsail.jpg`).**

- On the beset plate the main gaff stands at its working angle while the sail is stowed. The stowed cloth is a dark wedge along the after side of the mast that widens down to the rail.
- The sky between the main mast and the funnel is clear at every height over the rail. A 4.3 m boom would be 34 to 54 px long at the plate's two contested scales and would cross that gap as a dark bar. No bar is there.
- On Hurley's plate of her under sail from ahead, the square sails are set and no fore-and-aft canvas shows abaft the main mast.
- The record's reason for not drawing a set main: with a 10.3 m gaff, any boom short enough to clear the funnel puts the sail's leech through the funnel's top. The SETMAIN proof below shows that.
- Where the sheet was led when the main was set is not read.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r306_record.py`):
  - main and mizzen gain `gaffFrac` (0.55, 0.56), `throatFrac` (0.72, 0.73) and `gaffRead` (columns, rows, px, angle, residual, script, provenance);
  - the main gains `gaffStow: 'brailed'` and `gaffStowProvenance`.
- BUILDER (`hull.js`, `r306_edits.py`):
  - `gaffL = lower × gaffFrac` and the throat at `lower × throatFrac` where the record has them. The class figures stand on every other hull: the probe shows every other gaff and boom in the fleet unchanged (`probe-before.json`, `probe-after.json`).
  - `gaffStow: 'brailed'` draws no boom and no topping lift. The gaff stands aloft at its working angle in both states and hangs from its halyards. The cloth is one bundle along the mast's after side, from the tack to the jaws, named 'Brailed sail'. Its girth is the cloth of a sail with that luff and head, at the furl's stowed thickness.
  - `makeFurl` takes a `card` option, so the bundle's card says what a brailed sail is.

| Endurance | Before | After |
|---|---|---|
| Main gaff | 3.11 m, jaws at y 18.13 | **10.32 m**, jaws at y 15.51 |
| Main boom | 4.32 m | **none** |
| Main sail | set, quadrilateral | **brailed**: bundle from (2.05, 4.06) to (2.41, 15.51), r 0.29 m |
| Mizzen gaff | 6.87 m, jaws at y 16.22 | **9.16 m**, jaws at y 14.10 |
| Mizzen boom | 10.14 m | 10.14 m |

**AUDIT (`r306_audit.py`).** Three new rules, each run on the set build and the furled build:

- **A-GAFF-READ.** A record with `gaffFrac` or `throatFrac` must carry both and a `gaffRead` whose pixels give each share within 0.01, with a provenance. The built gaff must be `gaffFrac` of the built lower mast within 0.05 m. Its jaws must stand at `throatFrac` within 0.10 m. The jaws are not checked on a furled boomed sail, because its gaff is lowered onto the roll.
- **A-BRAILED.** A brailed mast has a provenance, no boom, and no set cloth naming that mast. It has one 'Brailed sail' bundle within 1 m of the mast's axis, on its after side, between the deck and the jaws. Its gaff stands over 20° in both builds.
- **A-CLOTH-FUNNEL** (the class). No vertex of any sail, set or stowed, and none of any yard, gaff or boom, may stand inside a drawn funnel stack. The stack is read as its own vertices, slice by slice. No earlier rule could see canvas through a funnel.
- Two exemptions follow from the brailed sail. The boom census counts only the masts with a boomed sail. 'A set ship carrying stowed canvas' does not count a brailed bundle.
- **Audit fault found on the first run:** the throat rule convicted the mizzen's furled build, where the gaff is lowered onto the boom by design. The fix is the exemption above.

__PROOFS__

**WITNESSED** at `#v=ship&s=endurance&b=90&l=6&z=1.3` (the port beam), the before on the :8150 copy carrying the pre-round `hull.js` and record. `pair-main-crop.png` (before | after): the main's short gaff and its set sail on a boom are gone. The long gaff now stands aloft from under the crosstrees, its peak over the cap and over the funnel, with the brailed bundle along the mast's after side below it. The mizzen gaff is longer, and the throat sits lower, so the sail's head is longer and its peak lower against the topmast.

**Rule 0, on `wit-after-beam.png` read whole: a rendered barquentine on a rippled sea, not a chart. Three facts a viewer can read off it without a legend: her foremast crosses square sails in three tiers over a jib-boom with four headsails; her main sets no sail, with a long gaff standing aloft over the black funnel and the sail brailed to the mast; her mizzen sets a gaff sail over a boom that runs out over the stern.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³²) is closed** for Endurance.
- **(0y¹³⁴), NEW: the mizzen's stowage.** The beset plate shows the mizzen gaff aloft with its sail stowed, as it shows the main. The model's furled build lowers a boomed sail's gaff onto the roll on the boom. Her mizzen has a recorded boom (a090007), so this may be a sail brailed to the gaff over a boom, or a gaff left aloft while the sail is furled on the boom. Neither has been read.
- **(0y¹³⁵), NEW: the class gaff follows a funnel-cut boom.** Great Eastern's masts 0, 1 and 4 still take 0.72 of a boom cut by the funnel abaft them. Her funnel tops stand at about 40 m, level with her gaffs, so there the funnel does limit the gaff. No plate of her has been read for the gaffs.
- **(0y¹³⁰), (0y¹³¹), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r305 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r307 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r307` already exists before writing into it. Then (0y¹³⁰). Else (0y¹³⁴).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
