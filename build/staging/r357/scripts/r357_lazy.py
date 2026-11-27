"""r357: record strings that no script and no audit reads move to the on-demand provenance file, by naming them provenance.
usage: r357_lazy.py <vessels.json> [<hull.js>]"""
import sys, json, os
p = sys.argv[1]; raw = open(p).read()
for k, n in [('belowSheerContest', 1), ('trucksContested', 1), ('beamStationsResolved', 1), ('beamStationsU', 1),
             ('plateSource', 1), ('recordSource', 1), ('mapping', 3), ('projectionFrom', 1)]:
    old = '"%s":' % k
    assert raw.count(old) == n, (k, raw.count(old))
    raw = raw.replace(old, '"%sProvenance":' % k)
json.loads(raw)
open(p + '.tmp', 'w').write(raw); os.replace(p + '.tmp', p)
if len(sys.argv) > 2:
    h = sys.argv[2]; s = open(h).read()
    old = "projectionM: P, projectionFrom: R.projectionFrom || 'class',"
    assert s.count(old) == 1
    s = s.replace(old, "projectionM: P, projectionFrom: R.projectionM ? 'class: quarterGallery.projectionFromProvenance' : 'class',")
    open(h + '.tmp', 'w').write(s); os.replace(h + '.tmp', h)
print('ok')
