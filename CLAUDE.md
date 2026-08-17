# Ships — instructions for Claude sessions

How we learned to cross the ocean

**Read `README.md` first** — §1 (what this is trying to be), §2 (the working rules), §7 (traps),
§9 (known limits). Then `SCOPE.md` for the contract and `HANDOFF.md` for the live state.

The general protocol lives in `/Users/augustgweon/Modeling Studio`. Its skills apply here:
`/model-research`, `/model-build`, `/model-verify`, `/model-ship`.

---

## Standing rules — these override default behaviour

0. **The surface is the argument, and it must be a legible surface of the real world.** Three
   requirements, all of them: (a) the substrate is **composed per pixel** — relief, texture, light,
   material, weather — never dots and symbols on flat ground; (b) it is a rendered surface **of the
   actual place** the subject occupies, never of an abstract or semantic space, which may only ever
   be a secondary view; (c) it is **legible** — a viewer can name concrete things off it without a
   legend. Every round, screenshot the full frame and answer in writing: *does this read as a
   rendered world rather than a chart*, and *name three facts a viewer can read off it*. Rule 0
   because it is the one the work is judged on. See `Modeling Studio/references/WORKING-RULES.md`
   §13 and `ARCHITECTURE-PATTERNS.md` §0, and SCOPE §3 for this project's stated bar.

1. **Always visually verify.** An update is not done when the data contains the value. It is done
   when it has been **rendered and looked at**. Render the frame, `Read` the image, confirm the
   change is on screen and is correct. "The field has the value" is not confirmation.

2. **Fix the system, not the instance.** When correcting an error, make the change at the level
   that fixes the whole **class** across the whole timeline. A patched instance leaves the same
   bug at every other time and place.

3. **Prefer structural, model-based changes over cosmetic ones.** Ask what the real-world object
   or process is, and model that. Let the appearance fall out of it. Parameter tuning produces
   "modest improvements" and never closes a gap.

4. **Measure before tuning.** Histogram it, spectrum it, or A/B each term behind a debug flag
   before changing a constant.

5. **Track every request each round and address all of them.** If something genuinely cannot be
   done, say so explicitly and say why — do not omit it.

6. **Always deploy, and verify the live artefact.** Every round ends with a build, a commit, a
   push, and a check of the live data-version stamp.

7. **Never ship on an average.** Score every item individually, before and after, and classify
   every regression.

8. **When an audit disagrees with the app, check the audit first.**

9. **Say what is contested**, in the data, as a field.

10. **"Unknown" is a legitimate return**, and where a fallback is unavoidable the UI labels it as
    a fallback.

{{PROJECT_SPECIFIC_RULES}}

---

## The canonical frame

{{CANONICAL_FRAME}}

Every source is converted into it. The conversions are in {{CONVERSION_CODE}}. **Never combine
two sources without checking they are in the same frame** — this is the most expensive class of
bug in this kind of project.

## The evidence boundary

{{EVIDENCE_BOUNDARY}}

Past it, the model is inference and the UI says so.

---

## Commands

```bash
{{COMMANDS}}
```

## Traps that have each cost real time here

{{TRAPS}}

Plus the standing ones: a process backgrounded with `&` inside a tool call dies when that call
ends; a waiter on a `pgrep` pattern can match itself — wait on a **PID**; a static host can serve
stale JSON after a successful push, so stamp the data version before copying the app file and
verify the live value.

---

## Tooling — added 2026-08-02, read this before verifying anything

The Modeling Studio now has a toolchain at `~/Modeling Studio/tools/`, run with the Studio's own
interpreter. **`pip` is not a command on this machine** — use an explicit interpreter, always:

```bash
STUDIO="/Users/augustgweon/Modeling Studio"
"$STUDIO/.venv/bin/python" "$STUDIO/tools/<tool>.py" --help
```

### This app can now freeze, and that is what makes verification real

`?frozen` pins every clock — wave drift, cloud advection, the rotating terminator, the month
scrubber, camera flights, the splash fade — to one instant. Without it two captures of identical
code differed by **2.659% of pixels**. With it they differ by **0.000%**.

```
?frozen        freeze at t = 0 s
?frozen=12.5   freeze at t = 12.5 s
```

Everything time-varying reads `clockS()`. **Nothing may read `performance.now()` for appearance
again** — if you add an animated term, route it through `clockS()` or you silently break the
ratchet for everyone.

`window.__FRAME_READY` goes true after the first painted frame — and in frozen mode only after
the progressive terrain upgrades finish, because a capture at first paint differs from one a
second later by ~18% of pixels.

### The URL is now state

This app had none until 2026-08-02. `#e=<era>&t=<year>&v=<view>`, all live via `hashchange`:

```
#e=0&t=40000          era 0, 40,000 BP
#e=5&t=1870&v=ship    iron and steam, Shipwright open
v = sea | ship | action
```

⚠ **Order matters and has already caused a silent failure.** `selectEra()` rewrites the year
slider's min/max and resets `S.year`, so era must be applied before year. And `setView()` needs
the tabs wired and vessel/battle data loaded, so it runs from `boot().then()`, not inside
`applyHash()`. Applied too early it opened nothing and the "shipwright" baseline was a picture of
the globe — **a frame that captures the wrong view is worse than no frame, because it looks like
coverage.**

### The frame-baseline ratchet — run it every round

```bash
"$STUDIO/.venv/bin/python" "$STUDIO/tools/frame_baseline.py" check --project ~/Ships
```

Six committed baselines in `Research/baselines/`: four globe eras, the Shipwright, the Action.
Exits non-zero on any frame beyond `changed_frac 0.0005 / mean_abs 0.15`. Every frame is scored
individually (§7). A near-uniform frame is flagged **BLANK** regardless of its diff — that is the
black-canvas-with-working-panels failure. An amplified diff image lands in `_diff/`.

Accepting a moved baseline requires a written reason, which is appended to
`Research/baselines/FRAME-LOG.md`:

```bash
"$STUDIO/.venv/bin/python" "$STUDIO/tools/frame_baseline.py" accept --project ~/Ships \
    --frame shipwright --reason "new sail cloth material; verified better against the reference"
```

**The server must be running on :8149 first.** The harness opens a fresh page per frame — a
fragment-only navigation does not reload, so a shared page silently gives every frame the same
picture.

### Shaders live in files now

`web/shaders/*.glsl` is the source of truth. `web/js/shaders.js` is **generated** — never edit it.

```bash
"$STUDIO/.venv/bin/python" "$STUDIO/tools/glsl.py" check  --project ~/Ships   # real compiler
"$STUDIO/.venv/bin/python" "$STUDIO/tools/glsl.py" bundle --project ~/Ships --global
```

After editing any `.glsl`: **check, then bundle, then run the frame ratchet.** `shaders.js` is
loaded in `index.html` before every app script and exposes `SHADERS['HULL_FRAG.frag']` etc.

This kills the backtick class of bug by construction — the bundle JSON-escapes, so a backtick is
just a character. `#include "x.chunk.glsl"` works, for shared noise/colour code. The checker
injects three.js's built-in preamble (`position`, `uv`, matrices, and the precision qualifiers
first), so vertex shaders do not falsely fail.

### One thing deliberately not done

**Image-based lighting is fetched but not wired.** `web/data/assets/hdris/` holds a CC0 HDRI with
provenance in `ASSETS.json`, and the 19 `MeshStandardMaterial` uses in `hull.js` would benefit.
But this app vendors **three.js r160 with no addons**, and `RGBELoader` is an addon. Wiring it
needs either a vendored `RGBELoader`, or `PMREMGenerator.fromScene()` with a procedural sky (no
new dependency, less faithful). **That is a dependency decision, not a task** — decide it before
writing code, and A/B the result against the `shipwright` baseline rather than judging by eye.

### A lock check must be one atomic test whose EXIT STATUS is the answer

Round 71 collided with a running round because of this line:

```
ls -d build/.loop.lock >/dev/null 2>&1 && echo "lock held" || mkdir build/.loop.lock && echo "lock taken"
```

`&&` and `||` have EQUAL precedence and associate left to right, so it parses as
`((ls && echo) || mkdir) && echo "lock taken"` — the last echo is UNCONDITIONAL. It printed
"lock taken" while a round held the lock, and the tree was edited by two writers at once.
Three failures stacked: a status line that prints in both cases; "lock held" not saying by
WHOM; and the last line being read as the answer because it agreed with a prior belief.

`mkdir` is atomic, which is the whole reason the lock is a directory. Use its exit status and
nothing else:

```bash
if mkdir build/.loop.lock 2>/dev/null; then echo "GOT the lock"; else echo "someone else holds it"; fi
```

Never compose a lock check from `&&`/`||` chains, and never accept a check whose output looks
the same whether it passed or failed.

### A 34° lens is not a plate — measure the hull, do not judge the frame

Queen Mary 2 was reported wrong three times, adjusted three times and was still wrong, because
every judgement was made on a `spin_capture` frame. That harness uses the app's own **34° field**,
which magnifies the near half of a 345 m ship by about a third: a pixel measurement off it is out
by a quarter of the ship, so no correction taken from it can be right. Two tools exist now and a
hull is not "looked at" until both have been run:

```bash
"$STUDIO/.venv/bin/python" Research/profile_capture.py --ship queen-mary-2   # 3° near-ortho + u-ruler
"$STUDIO/.venv/bin/python" Research/measure_ship.py   --ship queen-mary-2   # every part, in metres
```

`profile_capture` paints its u-ruler ON the load waterline, so the frame carries its own datum and
scale. `measure_ship` walks the built scene graph part by part in hull space — that is what found
22 boats hanging 4.4 m outside a 41 m beam, and a mast 12 m taller than its own ship, after weeks
of arguing about them by eye.

**And segment the reference too.** Reading a scale profile's most-forward and most-aft standing
column at every metre of height turns "the front looks wrong" into eight numbers. Squinting at a
photograph is the same failure as squinting at a render.

### A photograph's resolution bounds everything derived from it, and the record must say so

Azzam's cluster was derived off the small delivery photograph on her card: mast at u 0.542, 47.2 m
over the water, a red band on her uptakes. A clean broadside at six times that scale reads u 0.638
and 36.2 m, and four plain steel pipes with no band. That is a sixth of her length and a quarter of
her air draught, and it drew a motor yacht with a radio tower amidships and a liner's funnel.

Both derivations were honest reads of what their plate could show. Neither the numbers nor the
provenance carried the bound. **A derivation's provenance now names the plate AND its scale in
px/m**, so the next reader knows what precision the source can actually support.

### A comment can be right while its arithmetic is the other sign

`const z = sgn * (recT ? half + boatB * 0.35 : …)` sat under a comment reading *"recessed boats
hang proud of the gallery's dark back wall, inside the hull side"*. The comment describes the
intent exactly; the `+` puts every boat OUTSIDE the wall. Nothing in the audit could see it — only
a measured breadth (45.4 m across a 41 m beam) could tell the comment and the code apart.
