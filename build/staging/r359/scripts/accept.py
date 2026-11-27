# usage: accept.py <frame> <pct> <reason>  — copies run2/<frame>.png into the baselines and appends FRAME-LOG.md
import sys, shutil, datetime
f, pct, why = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copy(f'build/staging/r359/run2/{f}.png', f'Research/baselines/frames/{f}.png')
open('Research/baselines/FRAME-LOG.md', 'a').write(f"- **{datetime.datetime.now():%Y-%m-%d %H:%M}** · `{f}` — r359, predicted: {why}; {pct}, captured one process each after the full check died at `aboard-off` (readiness timeout); wit/mv-{f}.png\n")
print('accepted', f)
