# usage: accept.py <frame> <pct> <reason>  — copies r2a/<frame>.png into the baselines and appends FRAME-LOG.md
import sys, shutil, datetime
f, pct, why = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copy(f'build/staging/r365/r2a/{f}.png', f'Research/baselines/frames/{f}.png')
open('Research/baselines/FRAME-LOG.md', 'a').write(f"- **{datetime.datetime.now():%Y-%m-%d %H:%M}** · `{f}` — r365, predicted: {why}; {pct}, captured one process each (run-each.sh) and scored with r277's offline scorer; build/staging/r365/mv-{f}.png\n")
print('accepted', f)
