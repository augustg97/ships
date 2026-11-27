import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
a = """  const atH = zH => surfacePoint(S, H, 1.0, 0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
  const halfAt = zH => atH(zH)[2];
  const faceX = zH => atH(zH)[0];"""
b = """  /* r355: the face's point AT height zH, by bisecting v; the old map v = 0.62 + 0.38·zH/fb is linear in a skin that
     is not, and returned a corner from another height, 4 gallery vertices inside the stern */
  const atH = zH => {
    let lo = 0.62, hi = 1.0;
    if (surfacePoint(S, H, 1.0, hi)[1] <= zH) return surfacePoint(S, H, 1.0, hi);
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (surfacePoint(S, H, 1.0, m)[1] < zH) lo = m; else hi = m; }
    return surfacePoint(S, H, 1.0, (lo + hi) / 2);
  };
  const halfAt = zH => atH(zH)[2];
  const faceX = zH => atH(zH)[0];"""
assert s.count(a) == 1; s = s.replace(a, b); open(p, 'w').write(s); print('ok')
