import sys
P='/Users/augustgweon/Ships/web/js/hull.js'
s=open(P).read()
def rep(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(c,a[:80]); s=s.replace(a,b)

# 1. the form carries the stock's material and Cotsell's iron proportions
rep("""function anchorFormOf(S) {
  const L = S.lwl;""","""function anchorFormOf(S) {
  const L = S.lwl;
  const ironStock = !!S.iron;""")
rep("""  const k = f.armDeg * Math.PI / 180;
  f.sin = Math.sin(k); f.cos = Math.cos(k);""","""  /* ⚠ AN IRON SHIP'S BOWER HAS AN IRON STOCK (round 368). Cotsell (A Treatise on Ships' Anchors, 1856, pp. 114-117,
     pl. 31): "Stocks are either of wood or of iron; formerly they were almost all of wood — they are now mostly of
     iron". In the Royal Navy iron stocks went on anchors up to 15 cwt in 1807, 30 cwt in 1832, 56 cwt in 1847 and 60 cwt
     in 1852, "chiefly owing to the employment of war steamers ... In these vessels the wood stock has been found to be
     inconvenient". His rule: the stock, wood or iron, is as long as the shank; an iron stock is "half an inch to the foot
     in the middle, and about two-thirds of that size at the ends". Plate 31 fig. 3, the Admiralty iron stock: a round
     bar with a ball at each end, one end bent square, passed "through the shank up to the collar of the stock, and ...
     secured on the other side by means of a forelock". The ball, the bent leg's length (0.09 of the stock) and the
     collar's size are read off that engraving, which carries no scale: about 925 px over the stock's length, so they
     are good to a few percent of it. Which way the leg points in use the plate does not say; it is drawn toward the ring.
     The wood stock keeps its r366 class figures: Cotsell's wood rule (an inch to the foot in the middle, half an inch at
     the ends, so 1/12 and 1/24 of the length) is thicker than the 0.062 and 0.032 drawn, and is carried to the next round. */
  f.ironStock = ironStock;
  if (ironStock) {
    f.stockMid = s / 24;                                    // the middle's diameter: half an inch to the foot
    f.stockEndD = f.stockMid * 2 / 3;                       // the ends': two-thirds of it
    f.ballR = f.stockEndD * 0.8;                            // pl. 31 fig. 3: the ball is ~1.6 of the bar's end
    f.legL = s * 0.09;                                      // pl. 31 fig. 3: the bent end
    f.stockEnd = f.ballR;                                   // what the stow's clearance test must clear
  }
  const k = f.armDeg * Math.PI / 180;
  f.sin = Math.sin(k); f.cos = Math.cos(k);""")
# 2. the mesh
rep("""  /* the stock: oak, square, swelling to the middle, in two halves hooped with iron */
  const ys = f.s - f.stockMid * 0.9;
  for (const k of [1, -1]) {""","""  /* the stock: oak, square, swelling to the middle, in two halves hooped with iron; or, on an iron ship, Cotsell's
     round iron bar with its balls, its bent end, its collar and its forelock */
  const ys = f.s - f.stockMid * 0.9;
  if (f.ironStock) {
    const rM = f.stockMid / 2, rE = f.stockEndD / 2;
    for (const k of [1, -1]) {
      const half = put(new THREE.Mesh(new THREE.CylinderGeometry(rE, rM, f.stockL / 2, 12), iron), 'stock');
      half.rotation.x = k * Math.PI / 2;                       // along ±Z, the narrow end outboard
      half.position.set(0, ys, k * f.stockL / 4);
    }
    /* the straight end's ball; the bent end turns square toward the ring and carries the other */
    const b1 = put(new THREE.Mesh(new THREE.SphereGeometry(f.ballR, 12, 8), iron), 'stock-ball');
    b1.position.set(0, ys, -f.stockL / 2);
    const elbow = put(new THREE.Mesh(new THREE.SphereGeometry(rE, 10, 6), iron), 'stock-leg');
    elbow.position.set(0, ys, f.stockL / 2);
    const leg = put(new THREE.Mesh(new THREE.CylinderGeometry(rE, rE, f.legL, 10), iron), 'stock-leg');
    leg.position.set(0, ys + f.legL / 2, f.stockL / 2);
    const b2 = put(new THREE.Mesh(new THREE.SphereGeometry(f.ballR, 12, 8), iron), 'stock-ball');
    b2.position.set(0, ys + f.legL, f.stockL / 2);
    /* the collar on the bent end's side of the shank, flaring to the shank's face; the forelock through the bar on
       the other side */
    const collar = put(new THREE.Mesh(new THREE.CylinderGeometry(rM * 1.05, rM * 1.9, f.s * 0.03, 12), iron), 'stock-collar');
    collar.rotation.x = -Math.PI / 2;
    collar.position.set(0, ys, f.rEye + f.s * 0.015);
    const key = put(new THREE.Mesh(new THREE.BoxGeometry(rM * 0.6, f.stockMid * 2.4, f.s * 0.012), iron), 'stock-forelock');
    key.position.set(0, ys - f.stockMid * 0.5, -(f.rEye + f.s * 0.012));
  }
  else for (const k of [1, -1]) {""")
# 3. the stow tests the bent leg's ball too
rep("""    const ends = [sc.clone().addScaledVector(zA, f.stockL / 2), sc.clone().addScaledVector(zA, -f.stockL / 2)];""",
"""    const ends = [sc.clone().addScaledVector(zA, f.stockL / 2), sc.clone().addScaledVector(zA, -f.stockL / 2)];
    if (f.ironStock) ends.push(sc.clone().addScaledVector(zA, f.stockL / 2).addScaledVector(yA, f.legL));""")
# 4. the stow record says what the stock is
rep("""tiltDeg: st.tiltDeg, stockClear: st.stockClear, under: st.under, underChannel: st.underChannel, channel: st.channel,""",
"""tiltDeg: st.tiltDeg, stockClear: st.stockClear, under: st.under, underChannel: st.underChannel, channel: st.channel,
        stock: f.ironStock ? 'iron: Cotsell 1856, pl. 31 fig. 3, the Admiralty iron stock' : 'oak: Falconer 1769, in two halves hooped with iron',""")
# 5. the card
rep("""its upper face (Falconer, 1769). The stock is oak, in two halves hooped with iron. '""",
"""its upper face (Falconer, 1769). The stock is oak, in two halves hooped with iron. '
                  + 'On the iron steamer and Preussen it is iron: a round bar with a ball at each end and '
                  + 'one end bent square, keyed through the shank with a forelock so it could be drawn and '
                  + 'laid along the shank for stowage. Cotsell (1856) records the Royal Navy fitting iron '
                  + 'stocks to anchors of up to 15 cwt in 1807 and 60 cwt by 1852, because a wooden stock '
                  + 'got in the way aboard a steamer. '""")
open(P,'w').write(s)

A='/Users/augustgweon/Ships/Research/audit-hulls.js'
a=open(A).read()
old="""        if (m === shank || m.geometry.parameters.radialSegments < 8) continue;"""
assert a.count(old)==1
a=a.replace(old,"""        /* r368: an iron stock is a round bar; its pieces carry userData.ap 'stock*' and are not arms */
        if (m === shank || m.geometry.parameters.radialSegments < 8 || /^stock/.test(m.userData.ap || '')) continue;""")
open(A,'w').write(a)
print('ok')
