import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""  const mid = xm((yBot + yTop) / 2);
  for (const [a, c] of portX) {
    if (a >= mid && a - 0.05 < xAft) xAft = a - 0.05;                  // a port abaft the middle: the after side stops short of it
    if (c <= mid && c + 0.05 > xForeMin) xForeMin = c + 0.05;          // a port afore it: the fore edge stops short of it
  }
""", """  const mid = xm((yBot + yTop) / 2);
  /* ⚠ A PORT ACROSS THE BILL'S CURVE (round 373, CONTESTED). With the 74's cathead on her forecastle (Steel, Folio XLVI)
     the ring hangs 1.6 m higher and 1.3 m further aft than the class beam's, and the bill's curve crosses the whole port
     band inside her foremost upper-deck port (Steel's Folio XXXII station, 13 ft 1 in abaft the foremost perpendicular).
     Two records disagree here, and the port is the ship's opening: the lining is laid at its full breadth on the pier
     forward of the port, its after side 5 cm short of it, and the result records the straddle. */
  let straddle = null;
  for (const [a, c] of portX) if (a < mid && c > mid) { straddle = [a, c]; xAft = Math.min(xAft, a - 0.05); }
  for (const [a, c] of portX) {
    if (straddle && a === straddle[0]) continue;
    if (a >= mid && a - 0.05 < xAft) xAft = a - 0.05;                  // a port abaft the middle: the after side stops short of it
    if (c <= mid && c + 0.05 > xForeMin) xForeMin = c + 0.05;          // a port afore it: the fore edge stops short of it
  }
""")
rep("""  const foreOf = y => Math.max(xForeMin, Math.min(xAft - 0.2, xm(y) - W / 2));
""", """  const foreOf = y => straddle ? Math.max(xForeMin, xAft - W) : Math.max(xForeMin, Math.min(xAft - 0.2, xm(y) - W / 2));
""")
rep("""           ports: portX.map(p => p.map(q => +q.toFixed(3))) };
}""", """           ports: portX.map(p => p.map(q => +q.toFixed(3))), straddle: straddle && straddle.map(q => +q.toFixed(3)) };
}""")
rep("""        lm.userData.lining = { yBot: LN.yBot, yTop: LN.yTop, xAft: LN.xAft, mid: LN.mid, W: LN.W, R: LN.R, ports: LN.ports,
""", """        lm.userData.lining = { yBot: LN.yBot, yTop: LN.yTop, xAft: LN.xAft, mid: LN.mid, W: LN.W, R: LN.R, ports: LN.ports, straddle: LN.straddle,
          contested: LN.straddle ? 'the bill\\'s curve crosses the port band inside the foremost upper-deck port; the lining is laid on the pier forward of it' : null,
""")
open(p, 'w').write(s); print('ok')
