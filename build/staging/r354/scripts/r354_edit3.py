import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:80], s.count(a)); s = s.replace(a, b)
rep("""  const y0 = c => Math.min(...c.st.map(q => q[2])) - 0.05;
  const reaches = bb => covers.some(c => bb.max.x > c.x0 && bb.min.x < c.x1 && bb.min.y < c.y - 0.02 && bb.max.y > y0(c) &&
                                         bb.max.z > -hwMax(c) && bb.min.z < hwMax(c));""",
"""  /* A PART STANDS UNDER THE COVER WHEN ITS CENTRE DOES: inside the span, above the deck at that station, under the
     cover, and inboard of the side at its own height (the cover's per-station record, st). The first draft took any
     part whose box reached under a cover, and its fragments were tested one by one: the quarter galleries, the
     transom and the inboard edge of the mizzen channel, which stand OUTSIDE the side, were blacked out as if they
     were 30 m in under the quarterdeck (r354/wit/crop-sotl-aftq2.png). A fitting on the deck has its centre inside
     the side; a frame, a channel, a gallery, an anchor or the rudder does not. */
  const ctr = new THREE.Vector3();
  const reaches = bb => { bb.getCenter(ctr); return covers.some(c => {
    if (ctr.x < c.x0 || ctr.x > c.x1 || ctr.y > c.y - 0.05) return false;
    const t = Math.min(6.999, (ctr.x - c.x0) / Math.max(c.x1 - c.x0, 1e-3) * 7), k = Math.floor(t), f = t - k;
    const q = [0, 1, 2].map(j => c.st[k][j] + (c.st[k + 1][j] - c.st[k][j]) * f);
    if (ctr.y < q[2] - 0.05) return false;
    return Math.abs(ctr.z) < q[0] + (q[1] - q[0]) * Math.max(0, Math.min(1, (ctr.y - q[2]) / Math.max(c.y - q[2], 0.1))) - 0.05; }); };""")
rep("  const hwMax = c => Math.max(...c.hw, ...c.st.map(q => Math.max(q[0], q[1])));\n", "")
open(p, 'w').write(s); print('ok')
