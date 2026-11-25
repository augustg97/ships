#!/usr/bin/env python3
"""r318: the rig-height provenance rule knows mastHeightsM; A-MAST-HEIGHTS (3) compares a shared pole's sails with the
upper (hoisting) topsail. Asserted, on <dir>/audit-hulls.js."""
import sys
from pathlib import Path
p = Path(sys.argv[1]) / 'audit-hulls.js'; t = p.read_text()
def sub(old, new):
    global t
    assert t.count(old) == 1, (t.count(old), old[:70]); t = t.replace(old, new)
sub("const wantRecord = (mk.truckM !== undefined && (mk.rig === 'square'",
    "const wantRecord = (mk.rig === 'square' && !!mk.mastHeightsM) || (mk.truckM !== undefined && (mk.rig === 'square'")
sub("""       (3) on EVERY square mast, a set sail whose yard shares its section with another hoisting yard is at
           least half as deep as the deepest topsail on that mast, each depth taken from the yard to the yard
           under it — 'two yards on a pole too short for them'. The half is CLASS: Cutty Sark's tea rig, the
           rig the record now carries, gives 0.56 on her fore (royal 4.2 m against an upper topsail 7.5 m). */""",
"""       (3) on EVERY square mast, a set sail whose yard shares its section with another hoisting yard is at
           least half as deep as the deepest HOISTING topsail on that mast (the upper or single topsail, which
           rides the section below), each depth taken from the yard to the yard under it — 'two yards on a pole
           too short for them'. The lower topsail is left out: it sheets to the course yard, and the course
           hangs at the plan's class fraction of the truck, so its depth says nothing about the stack. The half
           is CLASS: Cutty Sark's tea rig, the rig the record now carries, gives 0.57-0.66 (fore royal 4.2 m
           against an upper topsail 7.4 m). */""")
sub("const tops = mine.filter(o => /top/.test(o.userData.yardFrac.name) && depth.has(o));",
    "const tops = mine.filter(o => /top/.test(o.userData.yardFrac.name) && o.userData.yardFrac.hoist === 'tie' && depth.has(o));")
sub("against the deepest topsail's ${deep.toFixed(2)} m`); } });",
    "against the deepest hoisting topsail's ${deep.toFixed(2)} m`); } });")
p.write_text(t); print('audit amended', p)
