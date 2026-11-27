# usage: accept.py <srcdir> <frame> <pct> <reason> — copies <srcdir>/<frame>.png into the baselines and appends FRAME-LOG.md
import sys, shutil, datetime
src, f, pct, why = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
R = '/Users/augustgweon/Ships/'
shutil.copy(f'{R}build/staging/r366/{src}/{f}.png', f'{R}Research/baselines/frames/{f}.png')
open(f'{R}Research/baselines/FRAME-LOG.md', 'a').write(f"- **{datetime.datetime.now():%Y-%m-%d %H:%M}** · `{f}` — r366, predicted: {why}; {pct}, captured one process each (run-each.sh) and scored with r277's offline scorer; build/staging/r366/mv-{f}.png\n")
print('accepted', f)
