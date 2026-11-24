"""r310: collect every score*.out, list each manifest frame's last score, and write the receipt section."""
import json, re, glob
names = [f['name'] for f in json.load(open('/Users/augustgweon/Ships/Research/baselines/frames.json'))['frames']]
last = {}
order = sorted(glob.glob('score[0-9]*.out'), key=lambda p: int(re.findall(r'\d+', p)[-1])) + ['score-recap.out']
for p in order:
    for line in open(p):
        m = re.match(r'\s+(\S+)\s+([\d.]+)%\s+([\d.]+)\s+(\S+)', line)
        if m and m.group(1) in names: last[m.group(1)] = (float(m.group(2)), float(m.group(3)), m.group(4), p)
miss = [n for n in names if n not in last]
out = [n for n, v in last.items() if v[2] != 'ok']
big = max(((v[0], n) for n, v in last.items() if v[2] == 'ok' and n != 'shipwright-furled'), default=(0, ''))
print(len(last), 'scored;', len(miss), 'unscored:', miss, '; beyond the gate at last score:', out, '; largest inside:', big)
json.dump({'scored': len(last), 'missing': miss, 'out': out, 'largest': big}, open('receipt.json', 'w'))
