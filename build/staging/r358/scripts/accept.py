# usage: accept.py <frame> <pct> <reason>  — copies run2/<frame>.png into the baselines and appends FRAME-LOG.md
import sys, shutil, datetime
f, pct, why = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copy(f'build/staging/r358/run2/{f}.png', f'Research/baselines/frames/{f}.png')
open('Research/baselines/FRAME-LOG.md', 'a').write(f"- **{datetime.datetime.now():%Y-%m-%d %H:%M}** · `{f}` — r358, predicted: {why}; {pct}, captured one process each after the full check died at `shipwright` (readiness timeout); wit/mv-{f}.png\n")
print('accepted', f)
