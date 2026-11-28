import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""        if (band.length && !(Math.min(...band) <= xm && Math.max(...band) >= xm)) say(v.id, 'an anchor-lining off the bill\\'s curve', `the curve at y ${yM.toFixed(2)} is x ${xm.toFixed(2)}, the lining ${Math.min(...band).toFixed(2)}–${Math.max(...band).toFixed(2)}`);
""", """        /* r373: where the curve at mid-height falls inside a port of the uppermost tier, the lining stands on the pier
           forward of that port, its after edge within 0.10 m of the port's fore edge (the straddle, CONTESTED in the build) */
        const rowsS = SHIPS_HULL.tierPortRows(H), STs = SHIPS_HULL.tierPortStations(H)[rowsS.length - 1], HSs = SHIPS_HULL.hullSurface(H);
        const inPort = STs ? STs.ports.map(pp => [SHIPS_HULL.surfacePoint(H, HSs, pp.uLo, rowsS[rowsS.length - 1].port)[0], SHIPS_HULL.surfacePoint(H, HSs, pp.uHi, rowsS[rowsS.length - 1].port)[0]])
          .map(q => [Math.min(...q), Math.max(...q)]).find(q => q[0] < xm && q[1] > xm) : null;
        if (inPort && band.length) { if (!(Math.max(...band) <= inPort[0] && Math.max(...band) > inPort[0] - 0.10)) say(v.id, 'an anchor-lining off the pier before a port across the curve', `the curve at y ${yM.toFixed(2)} is x ${xm.toFixed(2)}, inside the port ${inPort[0].toFixed(2)}–${inPort[1].toFixed(2)}; the lining ${Math.min(...band).toFixed(2)}–${Math.max(...band).toFixed(2)}`); }
        else if (band.length && !(Math.min(...band) <= xm && Math.max(...band) >= xm)) say(v.id, 'an anchor-lining off the bill\\'s curve', `the curve at y ${yM.toFixed(2)} is x ${xm.toFixed(2)}, the lining ${Math.min(...band).toFixed(2)}–${Math.max(...band).toFixed(2)}`);
""")
open(p, 'w').write(s); print('ok')
