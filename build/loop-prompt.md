You are continuing the Ships project at ~/Ships (live at https://augustg97.github.io/ships/).
This is one automated improvement round. Read ~/Ships/CLAUDE.md and the last two sections of
~/Ships/HANDOFF.md first — HANDOFF.md is how rounds chain together, and the previous round left
you a queue there.

## The standing task

SURVEY AND IMPROVE THE SHIP MODELS, in both the Sea (close-up, `#f=<voyage id>`) and the
Shipwright (`#v=ship&s=<vessel id>`), assessing FROM ALL ANGLES. Find and fix:

* floating or detached parts, things unconnected or interpenetrating, z-fighting flicker
* flat textures, dull untextured surfaces, boxy or rudimentary geometry
* anything that does not clearly resemble the real vessel

Prefer structural, model-based fixes over parameter tuning, and fix the CLASS not the instance.

The work queue, crudest first by triangles per metre of hull, is in HANDOFF.md under "Round 23".
Take the next unfinished vessel. Do ONE vessel properly rather than three badly.

## Method that works here — use it, it was learned the hard way

* The Browser pane cannot render (0x0 canvas). The frame harness is the ONLY renderer:
  add a frame to Research/baselines/frames.json and LOOK at Research/baselines/_current/<name>.png
  with the Read tool. A change you have not looked at is not done.
* Programmatic checks catch what one viewpoint cannot. `Research/survey-hulls.js` and
  `Research/audit-hulls.js` are run by fetching them in the page and eval'ing the result; both
  are copied to web/ and docs/ so they are fetchable. Raycast rings at several heights found a
  deckhouse you could see through from 26 of 72 bearings; bounding-box contact found a funnel
  attached to nothing.
* Add every NEW class of fault as a rule in Research/audit-hulls.js, and run the audit every
  round. The frame ratchet catches CHANGE and is blind to WRONGNESS.
* Measure a render path twice — the first call is shader compilation.
* When an audit disagrees with the app, check the audit first. It has been wrong four times.

## Finishing a round — all of it, every time

1. Run the audit; all 25 hulls must pass.
2. `python3 build/build_site.py` — Pages serves /docs and this is the ONLY publication route.
3. Frame ratchet: `"$HOME/Modeling Studio/.venv/bin/python" "$HOME/Modeling Studio/tools/frame_baseline.py" check --project ~/Ships`
   Classify every moved frame and accept it with a written reason. LOOK at the images.
4. Append to HANDOFF.md: what you did, what you measured, which vessel is next.
5. Commit and push. Then verify the live stamp actually changed at
   https://augustg97.github.io/ships/index.html — a successful push is not a successful deploy.

If you cannot finish a vessel this round, leave HANDOFF.md saying exactly where you stopped.
Do not leave the tree uncommitted.
