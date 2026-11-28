import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""          if (BB[1][0] > cTop + 0.02 || BB[1][1] < bill[1]) say(v.id, 'a bill-board short of the bill', `board y ${BB[1][0].toFixed(2)}–${BB[1][1].toFixed(2)}, channel top ${cTop.toFixed(2)}, bill ${bill[1].toFixed(2)}`);
          if (Math.abs(bill[2]) < Math.max(Math.abs(BB[2][0]), Math.abs(BB[2][1]))) say(v.id, 'a bill inside its bill-board', `bill |z| ${Math.abs(bill[2]).toFixed(2)}`);
""", """          /* r373: where the bill rests on the gunwale (st.gunwale), the board runs to the top of the side and the bill lies
             over its head; otherwise it lies against the board's face, as r370 laid it */
          if (st.gunwale) {
            if (BB[1][0] > cTop + 0.02 || BB[1][1] < st.gunwale.top - 0.02) say(v.id, 'a bill-board short of the top of the side', `board y ${BB[1][0].toFixed(2)}–${BB[1][1].toFixed(2)}, channel top ${cTop.toFixed(2)}, top of the side ${st.gunwale.top.toFixed(2)}`);
            if (!(bill[1] > BB[1][1])) say(v.id, 'a bill on the gunwale below its bill-board\\'s head', `bill y ${bill[1].toFixed(2)}, board head ${BB[1][1].toFixed(2)}`);
          } else {
          if (BB[1][0] > cTop + 0.02 || BB[1][1] < bill[1]) say(v.id, 'a bill-board short of the bill', `board y ${BB[1][0].toFixed(2)}–${BB[1][1].toFixed(2)}, channel top ${cTop.toFixed(2)}, bill ${bill[1].toFixed(2)}`);
          if (Math.abs(bill[2]) < Math.max(Math.abs(BB[2][0]), Math.abs(BB[2][1]))) say(v.id, 'a bill inside its bill-board', `bill |z| ${Math.abs(bill[2]).toFixed(2)}`);
          }
""")
anchor = """    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99), RETIRED IN ROUND 366."""
rep(anchor, """    /* ── A-CATHEAD-SEAT (round 373): A CATHEAD UNDER A FORECASTLE STANDS ON ITS DECK, AND A RECORDED ONE IS ITS RECORD.
       Steel (1822, Book II, the sheer draught): the cathead "to stive upwards ... observing that the lower part comes on
       the plank of the deck at the side"; his glossary has the catheads "at the fore part of the forecastle". Folio XLVI
       gives each rate's beam. Until r373 the 74's cathead was the class beam with its underside under her sheer, 0.73 m
       under her forecastle deck, stived 3.4° where Steel gives 6 in a foot. On every timber hull, the cathead's beam (the
       longest box in the cathead) is read off its own geometry: (a) where its underside crosses the side at the sheer
       half-breadth of its own station, and an island stands there, the underside is within 5 cm of the island's deck;
       (b) where hull.cathead is recorded, the beam's section is the record's within 1 cm, its axis rises at the record's
       stive within 10%, and its outer end stands the record's length without board beyond that crossing, within 0.15 m. */
    if (part.cathead && !H.iron) {
      const HSc = SHIPS_HULL.hullSurface(H), invC = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const uAtC = x => { let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSc, m, 1)[0] < x) a = m; else b = m; } return (a + b) / 2; };
      const R = H.cathead && H.cathead.outM ? H.cathead : null;
      g.traverse(o => {
        if (!(o.isGroup && o.userData.part && o.userData.part.key === 'cathead')) return;
        let bm = null; o.traverse(m => { const P = m.isMesh && m.geometry && m.geometry.parameters; if (P && P.depth && (!bm || P.depth > bm.geometry.parameters.depth)) bm = m; });
        if (!bm) return;
        bm.updateMatrixWorld(true);
        const P = bm.geometry.parameters, T = new THREE.Matrix4().multiplyMatrices(invC, bm.matrixWorld);
        const at = (y, z) => new THREE.Vector3(0, y, z).applyMatrix4(T);
        let cross = null, prev = null;
        for (let i = 0; i <= 200; i++) {
          const z = -P.depth / 2 + P.depth * i / 200, q = at(-P.height / 2, z), u = uAtC(q.x), half = Math.abs(SHIPS_HULL.surfacePoint(H, HSc, u, 1)[2]);
          const d = Math.abs(q.z) - half;
          if (prev && prev.d < 0 && d >= 0) { cross = { q, u, z }; break; }
          prev = { d };
        }
        if (!cross) { say(v.id, 'a cathead that never crosses the side', `its underside stays ${prev && prev.d < 0 ? 'inside' : 'outside'} the sheer's half-breadth`); return; }
        const dk = HSc.islandDeck ? HSc.islandDeck(cross.u) : null;
        if (dk !== null && Math.abs(cross.q.y - dk) > 0.05) say(v.id, 'a cathead off its forecastle deck', `underside ${cross.q.y.toFixed(2)} where it crosses the side at x ${cross.q.x.toFixed(2)}, the island's deck ${dk.toFixed(2)}; Steel: the lower part comes on the plank of the deck at the side`);
        if (R) {
          if (Math.abs(P.width - R.sidedM) > 0.01 || Math.abs(P.height - R.deepM) > 0.01) say(v.id, 'a cathead off its recorded section', `${P.width.toFixed(3)} x ${P.height.toFixed(3)} m, recorded ${R.sidedM} x ${R.deepM}`);
          const a0 = at(0, -P.depth / 2), a1 = at(0, P.depth / 2), dl = a1.clone().sub(a0), rise = dl.y / Math.hypot(dl.x, dl.z);
          if (Math.abs(rise - R.stivePerFt) > 0.1 * R.stivePerFt) say(v.id, 'a cathead off its recorded stive', `rises ${(rise * 12).toFixed(2)} in a foot, recorded ${(R.stivePerFt * 12).toFixed(2)}`);
          const outb = P.depth / 2 - cross.z;
          if (Math.abs(outb - R.outM) > 0.15) say(v.id, 'a cathead off its recorded length without board', `${outb.toFixed(2)} m beyond the side, recorded ${R.outM}`);
        }
      });
    }

""" + anchor)
open(p, 'w').write(s); print('ok')
