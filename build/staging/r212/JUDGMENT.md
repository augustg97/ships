# r212 — The cog's Gangspill: the recovered timber's own form, on the castle top Ellmers names

## The question

r173 drew the windlass and named the Gangspill as residual: "the cog's own capstan, on the
aftcastle top (Ellmers; the Kiel build record lists it beside the Bratspill). It is REAL and
attested ... Drawing it properly needs the medieval Spill's form and the castle top to stand
on." r205 drew the castle. This round supplies the form — and the form turned out to be the
best kind of record: the object itself.

## The sources

1. **DSM, museum-digital:bremen object 3, Inv. I/11066/14** (dsm-gangspill.md, fetched whole):
   "Als in den 1960er Jahren die Bremer Kogge aus der Weser geborgen wurde, fand man dieses
   Gangspill." Oak. **D 56 cm, H 176 cm.** "In die rechteckigen Löcher wurden Handspaken
   eingesteckt ... Das Windentau lief um den unteren Holzkegel." The original capstan came up
   WITH the wreck — the sentence r173 could not find for the windlass exists for this machine.
2. **The DSM photograph** (gangspill-dsm.jpg, CC BY-NC-SA): the head a squared eight-sided
   block a little over half the height, standing on a shoulder over a narrower neck; the cone
   below widening to the foot. Oblique plate, no scale: proportions only.
3. **Ellmers** (r173, Drassana): the aftcastle "with a windlass in its middle and a capstan on
   its top". Position, TEXT read.
4. **Baykowski 1991** (r173, via de.wiki): the Kiel replica's Gangspill finished beside the
   Bratspill in 1987 — the replicas work one.

## The judgment

The medieval Spill is the Georgian capstan the other way up. Falconer's machine (r172) has a
drum with whelps rising to a drumhead, bars in sockets in the head, pawls on deck. The Bremen
timber has its rope-drum as a CONE AT THE FOOT and its bars THROUGH the head above — no
whelps, no drumhead disc, no pawls. A record that says `form: 'spill'` is therefore judged
against its own timber, and never against Falconer.

## The numbers

| quantity | value | status |
|---|---|---|
| foot diameter | 0.56 m | RECORD — DSM measurement of the recovered timber |
| height | 1.76 m | RECORD — same |
| station | u 0.82, on the castle deck | TEXT read of Ellmers "on its top" of the aftcastle; the castle's middle; ±0.06 u |
| head/cone split | head 0.54 of the height | READ off the DSM photograph (no scale) |
| neck | 0.40 m under the shoulder | READ off the photograph |
| head breadth | 0.54 m across corners, eight flats | READ off the photograph |
| handspikes | 2, through the head, crossed, horizontal, 2.0 m | CLASS DEFAULT — the record does not give the count of holes; a horizontal hole lets a shipped spike lie no other way |
| step | 0.84 m square, 0.10 m, on the planking | CLASS DEFAULT — the foot needs a bearing |

## What is NOT drawn, and why

- **The rectangular holes as holes.** With the spikes shipped the holes are occupied; empty
  holes would need cut geometry on each flat. Not drawn; the spikes show where they are.
- **The rope on the cone.** No cable is rigged on this hull's machines (the windlass has none
  either); when a cable is drawn it belongs to the yard's halyard/brace, per the museum's
  stated use.
- **The Bratspill's recovery** stays open — the DSM series has 20 more objects.

## The audit rule (r212), proven by injection

Branch on `form === 'spill'`, every part read from VERTICES (a non-indexed head carries no
geometry parameters — the first draft keyed on class and convicted the faithful builder,
r173's lesson again, rule 8 applied: the audit was checked first and was wrong). Arms:
S-CONE (the lowest part is one body on the axis widening toward the deck), S-HEAD (a broader
head above it), S-BARS (every bar crosses the axis inside the head's height; count is the
record's), S-SIZE (foot dia ±15%, height ±12% of the record), S-STAND (foot on the castle deck
at its station, read off the castle's own plank vertices), S-STATURE (record-blind: bars
0.9–1.6 m over the foot, spindle 1.2–2.2 m).

- Clean: 33 hulls, 0 problems (audit.out).
- inject-a (sever the builder — Georgian machine drawn under a 'spill' record): cog alone,
  "a spill with no cone to take the rope" (inject-a.json). No other hull moves.
- inject-b (drag heightM 1.76 → 3.2 under the faithful builder): cog alone, three record-blind
  convictions — spikes at 2.20 and 2.65 m over the foot, spindle 3.20 m (inject-b.json).
  S-SIZE silent, as a faithful builder under a dragged record must be.

## Measured (measure_ship, before the head rotation was dropped)

spill-cone u 0.820–0.848, dia 0.56, y 4.13–4.94; spill-head y 4.94–5.89 (1.76 m foot to top);
spill-bar y 5.31 and 5.62 (1.18 and 1.49 m over the foot); spill-step 0.84 square on the
castle deck at 4.13. Castle deck at that station 4.13 (castle-deck range 4.01–4.38, rising
aft on the sheer).

## Witnessed (rule 1)

spill-quarter.png, spill-astern.png, spill-quarter2.png — read whole. From astern: the
eight-sided head on its cone standing on the square step in the castle planking, the two
pale handspikes crossed through the head at two heights, the breastrail forward of it, the
main deck's gratings and the mast beyond. From the starboard quarter: the same machine
against the water, the castle parapet round it.
