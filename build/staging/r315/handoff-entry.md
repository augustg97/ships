

## Round 315 — 2026-11-24 — The crossjack is a bare spar on the 74, the East Indiaman and the slave ship. Eckersberg's 1828 painting of the Russian 74 Asow shows the crossjack with no sail on it, and Falconer's 1769 dictionary says that sail was "very seldom used". Before this round the builder drew a course on the crossjack in the set build and a furled roll on it in the furled build, with the sheets, tacks, clew garnets and buntlines of a course. The 74 carries 394.5 m² less square canvas, the East Indiaman 192.4 m² less and the slave ship 75.3 m² less. The furled card now says the crossjack carries no sail

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁴⁹), which r314 named first. `build/staging/r315` did not exist. The load was 1.9 at the start and no process was hot. r314's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT (0y¹⁴⁹) ASKED.** The Asow plate (`build/staging/r312/plates/asow.jpg`) shows the crossjack as a clean pale spar at rows 1430–1449 with nothing rolled on it. Every other yard on her three masts carries its furled sail. The model bent a sail to the 74's crossjack: in the set build it drew a course from the crossjack down to the rail, and in the furled build it drew a roll on the yard. The builder's own comment already said "a 74 crossed no mizzen course".

**THE SOURCES.**

- **Plate:** Eckersberg 1828, as read in r313. At about 30 px/m the crossjack is 19 rows deep, lit on its upper face, and nothing lies on it.
- **Class:** Falconer, *An Universal Dictionary of the Marine* (1769), CROSS-JACK (`build/staging/r172/falconer.txt`, line 5660): "a sail extended on the lower yard of the mizen-mast, which is hence called the cross-jack yard … This sail, however, has generally been found of little service, and is therefore very seldom used." The sail existed and was rarely set. The yard itself was crossed, because it spread the foot of the mizzen topsail.

**WHAT CHANGED.**

- **BUILDER** (`hull.js`, `r315_builder.py`): this rule covers a square mast that is the aftermost of three or more, has no `yards` list, and has more than one tier. On such a mast the lowest yard is crossed with no sail and no roll, unless the record sets `crossjackSail: true`.
  - The bare yard gets no sheets, no tacks, and no clew garnets or buntlines.
  - It keeps its lifts and braces, and the mizzen topsail still sheets to its arms.
  - Its mesh records `userData.bare` (mast, height, the source).
  - With no roll on it, the lowered mizzen topsail yard rests on the cap as before. No yard on any hull moved (`r315_probe.py`: every yard's height compared before and after, set and furled).
  - A doubled rig's mizzen course is not this yard and is unchanged. The clipper and Preussen draw it from their own `yards` lists.
- **RECORD** (`vessels.json`, `r315_record.py`): each of the three mizzens carries `crossjackSail: false` and a `crossjackProvenance`.
  - The 74's opens PLATE READ: the Asow rows, with Falconer as the class source that agrees. It is CONTESTED because a plate of a ship at anchor cannot show whether she set the sail at sea.
  - The East Indiaman's and the slave ship's open CLASS: Falconer, with no plate of either hull read.
- **CARD** (`shipwright.js`): when the built ship has a bare crossjack, the furled card adds "the crossjack (the mizzen’s lowest yard) carries no sail". The set card's "square sails on all three masts" stays true, because the mizzen topsail and topgallant are set.

| Hull | Square cloths, set | Square canvas, set (m²) | Tack meshes | Furled rolls |
|---|---|---|---|---|
| ship-of-the-line | 9 → 8 | 2572.3 → 2177.8 | 3 → 2 | 16 → 15 |
| east-indiaman | 9 → 8 | 1669.7 → 1477.3 | 3 → 2 | 9 → 8 |
| slave-ship | 9 → 8 | 654.2 → 578.9 | 3 → 2 | 9 → 8 |
| every other square-rigged hull | unchanged | unchanged | unchanged | unchanged |

(`probe-before.txt`, `probe-after.txt`; the before run swapped r314's builder and record onto :8150.)

**AUDIT.** New rule A-CROSSJACK-BARE (`crossjackRead`), run on the set build and on the furled build. It covers every mizzen that is the aftermost of three or more masts, square-rigged with no `yards` list and more than one tier:

1. The record answers: `crossjackSail` is a boolean and `crossjackProvenance` opens PLATE READ or CLASS. Otherwise: 'a crossjack with no answer'.
2. Where the record says no sail, exactly one Yard mesh on that mast is recorded bare. Otherwise: 'a crossjack not crossed bare'.
3. No square cloth hangs from it: 'a sail set from a bare crossjack'.
4. In the furled build no roll lies within 1.5 m of its centre: 'a roll on a bare crossjack'.
5. No clewline or buntline tier is recorded on it: 'gear for a sail the crossjack does not carry'.
6. A bare yard on any other mast: 'a bare yard the record does not name'.
7. The furled card names the bare crossjack exactly when the furled build has one: 'a furled card that misstates the crossjack'.

Two older rules learned the exception, and both key on the record and the mesh:

- the r59 yard-gear census now expects one fewer tack mesh for each segment-rig crossjack without a sail;
- r259's 'a furled square yard with no roll on it' skips a yard recorded bare, which A-CROSSJACK-BARE reads instead.

__PROOFS__

**WITNESSED.** `#v=ship&s=ship-of-the-line&b=110&z=1.1&l=6` set and `&sail=furled`, and `#v=ship&s=slave-ship&b=110&z=1.1&l=6`. Before on :8149 carrying r314's tree; after on :8150 carrying this round's.

- `pair-set-b110.png` (before left, after right, the 74's mizzen): before, a course hangs from the crossjack under the mizzen top down to the poop rail, in front of the spanker. After, the mizzen's lower mast stands bare, with its shrouds and the spanker visible behind it.
- `pair-furled-b110.png`: before, a roll lies on the crossjack just under the mizzen top. After, the yard's end is a thin bare spar at the same height. The card is one line taller.
- `pair-slave-b110.png`: before, the slave ship's mizzen course hangs under her mizzen top. After, it has gone. Nothing now hangs on her mizzen under the topsail, because her record carries no driver: see (0y¹⁵²).
- `card-after-furled.png`: the furled card reads "… the topsail and topgallant yards are lowered onto the caps below them, the crossjack (the mizzen’s lowest yard) carries no sail, the spanker is brailed in to the mast under its gaff …".

**Rule 0, on `wit-after-set.png` read whole: a rendered three-masted two-decker under sail on a rippled sea, with a low coast behind; it is not a chart. Three facts a viewer can read off it without a legend:**

1. **She carries two rows of gunports.**
2. **The fore and main masts each carry three square sails.**
3. **The aftermost mast carries square sails only above its top, with a fore-and-aft sail on a gaff and boom beneath them.**

**THE FRAMES.** Predicted movers:

- `shipwright` (the set 74 broadside), `shipwright-astern`, `shipwright-furled`, `shipwright-hounds` and `shipwright-ahead`: the 74's crossjack loses its sail or roll, and the furled card gains a clause.
- `ship-slave-ship`: her mizzen course goes.
- Frames of hulls up to three berths from the 74, the East Indiaman or the slave ship may move where those mizzens reach their edges.

The Action frames build none of these hulls. Every after file was in web/ by 18:45:07, when `run-resume.sh` started, except the card's rewording (18:59:26). Every frame captured before then that shows a furled card was recaptured after it.

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹⁴⁹) is closed** for every segment-rig crossjack.
- **(0y¹⁵²), NEW: the East Indiaman and the slave ship carry no driver on the mizzen.** Their records give the mizzen no `spanker`. With the crossjack now bare, the slave ship's mizzen carries no sail below its topsail (`pair-slave-b110.png`). A ship-rigged merchantman of the late 18th century set a driver or a lateen mizzen there. This needs a plate or a source for each hull before the record gains one, and the rule should be checked for every three-masted square rig.
- **(0y¹⁵⁰)**, the doubled rigs' fixed yards against their caps; **(0y¹⁵¹)**, furled yards left braced; **(0y¹⁴⁵)**, the 74's spanker gaff jaws below the crossjack; **(0y¹⁴⁷)**, the 74's fore and main course heights; **(0y¹⁴⁸)**, the Asow provenance's eye height and scale.
- **(0y¹⁴²), (0y¹⁴⁰), (0y¹³⁹), (0y¹³⁸)** for Great Eastern, Preussen, Wyoming and the steamer, **(0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r314 list them.

**r316 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r316` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵⁰), the doubled rigs' fixed yards. Else (0y¹⁵²).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
