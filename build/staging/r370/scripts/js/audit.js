
    /* ── A-ANCHOR-BILLBOARD (round 370): THE STOWED BILL IS ON STEEL'S BILL-BOARD, OVER A LINING THAT CLEARS THE PORTS.
       Steel (1822, Book II, the sheer draught): the fore channel takes "the anchor-lining and bill-board for stowing the
       anchor"; the lining's middle lies on the bill's curve swept from the cathead, it runs from the bolster (the
       channel-wale's upper side) to the channel, and "the bill-board may then be carried upwards from the upperside of the
       channel to the top of the side". His glossary has the lining there for "when fishing the anchor". Falconer (1769, FISH)
       draws the flukes "towards the top of the bow in order to stow it". Until r370 the 74's stowed bill lay under her
       recorded channel, on the lining, and no lining or bill-board was drawn. Where a bower's bill stands within a
       recorded channel's run: (a) the bill stands over the channel's upper side, read off the channel's own vertices at
       the bill's station; (b) a Bill-board on that side covers the bill's station, from the channel's top to at least the
       bill's height, and the bill stands outboard of its face; (c) an Anchor-lining on that side runs from a Bolster's top
       to the channel's underside, within 5 cm at each end, and its breadth at mid-height holds the bill's curve about the
       ring; (d) the lining covers no port of the uppermost tier; (e) no anchor vertex stands inside the channel's solid. */
    if (part.anchor && H.channels && Array.isArray(H.channels.masts)) {
      const invB = new THREE.Matrix4().copy(g.matrixWorld).invert(), w = new THREE.Vector3();
      const vertsOf = o => { const P = []; o.updateMatrixWorld(true); o.traverse(m => { if (!m.isMesh || !m.geometry) return; const a = m.geometry.attributes.position;
        for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld).applyMatrix4(invB); P.push([w.x, w.y, w.z]); } }); return P; };
      const chans = [], plank = { 'Anchor-lining': [], 'Bolster': [], 'Bill-board': [] }, anchors = [];
      g.traverse(o => {
        if (o.isMesh && o.userData.channel && o.userData.channel.rec) chans.push(vertsOf(o));
        if (o.isMesh && o.userData.part && o.userData.part.key === 'anchorLining' && plank[o.userData.part.name]) plank[o.userData.part.name].push(vertsOf(o));
        if (o.isGroup && o.userData.part && o.userData.part.key === 'anchor' && o.userData.anchorStow) anchors.push([o.userData.anchorStow, vertsOf(o)]);
      });
      const box = P => [0, 1, 2].map(i => [Math.min(...P.map(p => p[i])), Math.max(...P.map(p => p[i]))]);
      for (const [st, AV] of anchors) {
        const bill = st.bill, sg = Math.sign(bill[2]) || 1;
        const mine = chans.filter(C => Math.sign(C.reduce((s2, p) => s2 + p[2], 0)) === sg);
        const at = mine.map(C => C.filter(p => Math.abs(p[0] - bill[0]) < 0.25)).find(Q => Q.length);
        if (!at) continue;
        const cTop = Math.max(...at.map(p => p[1])), cBot = Math.min(...at.map(p => p[1]));
        const cIn = Math.min(...at.map(p => Math.abs(p[2]))), cOut = Math.max(...at.map(p => Math.abs(p[2])));
        if (!(bill[1] > cTop)) say(v.id, 'a stowed bill under the fore channel', `bill at y ${bill[1].toFixed(2)}, the channel's upper side at ${cTop.toFixed(2)}; Steel stows it on the bill-board above the channel`);
        const side = L => L.filter(P => Math.sign(P.reduce((s2, p) => s2 + p[2], 0)) === sg).map(box);
        const BB = side(plank['Bill-board']).find(b => b[0][0] <= bill[0] && b[0][1] >= bill[0]);
        if (!BB) say(v.id, 'no bill-board under the stowed bill', `no Bill-board covers x ${bill[0].toFixed(2)}`);
        else {
          if (BB[1][0] > cTop + 0.02 || BB[1][1] < bill[1]) say(v.id, 'a bill-board short of the bill', `board y ${BB[1][0].toFixed(2)}–${BB[1][1].toFixed(2)}, channel top ${cTop.toFixed(2)}, bill ${bill[1].toFixed(2)}`);
          if (Math.abs(bill[2]) < BB[2][1] * (sg > 0 ? 1 : -1) * sg && Math.abs(bill[2]) < Math.max(Math.abs(BB[2][0]), Math.abs(BB[2][1]))) say(v.id, 'a bill inside its bill-board', `bill |z| ${Math.abs(bill[2]).toFixed(2)}`);
        }
        const LN = side(plank['Anchor-lining']), BO = side(plank['Bolster']);
        const ln = LN.find(b => b[0][0] <= bill[0] + 1 && b[0][1] >= bill[0] - 1);
        if (!ln) { say(v.id, 'no anchor-lining under the fore channel', `no Anchor-lining within 1 m of the bill's station x ${bill[0].toFixed(2)}`); continue; }
        if (Math.abs(ln[1][1] - cBot) > 0.05) say(v.id, 'an anchor-lining off the channel', `lining top ${ln[1][1].toFixed(2)}, channel underside ${cBot.toFixed(2)}`);
        const bo = BO.find(b => b[0][0] <= ln[0][1] && b[0][1] >= ln[0][0]);
        if (!bo || Math.abs(bo[1][1] - ln[1][0]) > 0.05) say(v.id, 'an anchor-lining with no bolster', bo ? `bolster top ${bo[1][1].toFixed(2)}, lining foot ${ln[1][0].toFixed(2)}` : 'no Bolster under the lining');
        const ring = st.ring, R = Math.hypot(bill[0] - ring[0], bill[1] - ring[1], bill[2] - ring[2]), yM = (ln[1][0] + ln[1][1]) / 2;
        const xm = ring[0] + Math.sqrt(Math.max(0, R * R - (yM - ring[1]) ** 2));
        const LP = plank['Anchor-lining'].find(P => Math.sign(P[0][2]) === sg) || [];
        const band = LP.filter(p => Math.abs(p[1] - yM) < 0.12).map(p => p[0]);
        if (band.length && !(Math.min(...band) <= xm && Math.max(...band) >= xm)) say(v.id, 'an anchor-lining off the bill\'s curve', `the curve at y ${yM.toFixed(2)} is x ${xm.toFixed(2)}, the lining ${Math.min(...band).toFixed(2)}–${Math.max(...band).toFixed(2)}`);
        const rows = SHIPS_HULL.tierPortRows(H), ST = SHIPS_HULL.tierPortStations(H)[rows.length - 1];
        if (ST) { const HSb = SHIPS_HULL.hullSurface(H), top = rows[rows.length - 1];
          for (const p of ST.ports) { const x0 = SHIPS_HULL.surfacePoint(H, HSb, p.uLo, top.port)[0], x1 = SHIPS_HULL.surfacePoint(H, HSb, p.uHi, top.port)[0];
            const y0 = SHIPS_HULL.surfacePoint(H, HSb, p.u, top.lo)[1], y1 = SHIPS_HULL.surfacePoint(H, HSb, p.u, top.hi)[1];
            const n = LP.filter(q => q[0] > Math.min(x0, x1) + 0.01 && q[0] < Math.max(x0, x1) - 0.01 && q[1] > y0 && q[1] < y1).length;
            if (n) say(v.id, 'an anchor-lining over a port', `${n} lining vertices over the port at x ${Math.min(x0, x1).toFixed(2)}–${Math.max(x0, x1).toFixed(2)}`); } }
        let inC = 0;
        for (const C of mine) { const xs = box(C)[0];
          for (const p of AV) { if (p[0] < xs[0] || p[0] > xs[1]) continue;
            const near = C.filter(q => Math.abs(q[0] - p[0]) < 0.3); if (!near.length) continue;
            const t = Math.max(...near.map(q => q[1])), b0 = Math.min(...near.map(q => q[1])), zi = Math.min(...near.map(q => Math.abs(q[2]))), zo = Math.max(...near.map(q => Math.abs(q[2])));
            if (p[1] > b0 + 0.005 && p[1] < t - 0.005 && Math.abs(p[2]) > zi + 0.005 && Math.abs(p[2]) < zo - 0.005) inC++; } }
        if (inC) say(v.id, 'an anchor through the fore channel', `${inC} anchor vertices inside the channel's solid`);
      }
    }
