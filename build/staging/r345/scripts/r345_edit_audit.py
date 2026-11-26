# r345 audit: the bar-capstan rule runs once per machine; A-CAPSTAN-STATIONS and A-CAPSTAN-CLEAR
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)

rep("""      if (H.capstan && capm.length && H.capstan.form !== 'spill') {
        const vrange = o => {          // vertex extents in the mesh's own frame""",
"""      /* (r345) A RECORD MAY NAME MORE THAN ONE MACHINE. The 74 carries a jeer capstan in the
         waist and a main capstan under the quarterdeck, and every rule below was written for one:
         two machines read as one with twelve whelps and twenty-eight bars. The meshes are grouped
         by the tagged group that owns them, and each group is judged against the record's own
         station nearest it. */
      const capOwn = new Map();
      for (const o of capm) { let e = o; while (e && !(e.userData && e.userData.part)) e = e.parent;
        const k = e || o; if (!capOwn.has(k)) capOwn.set(k, []); capOwn.get(k).push(o); }
      const capRec = !H.capstan || H.capstan.form === 'spill' ? []
        : (H.capstan.stations && H.capstan.stations.length ? H.capstan.stations
           : [{ atU: H.capstan.atU != null ? H.capstan.atU : 0.62 }]);
      g.updateMatrixWorld(true);
      const invCap = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const capCentre = G => new THREE.Vector3().setFromMatrixPosition(G.matrixWorld).applyMatrix4(invCap);
      /* ── A-CAPSTAN-STATIONS (round 345): ONE MACHINE PER RECORDED STATION, AT ITS STATION.
         Until r345 every bar capstan stood at u 0.62, a number no record carried, and the 74's
         record described the jeer capstan in its waist while the builder drew one under her
         quarterdeck. MESH: the count of capstan groups against the record's stations, and each
         group's centre in hull space against (atU − 0.5)·L, within 0.3 m. */
      if (capRec.length && capm.length) {
        if (capOwn.size !== capRec.length)
          say(v.id, 'capstans off the record\\'s stations',
              `${capOwn.size} capstan(s) built, the record names ${capRec.length}`);
        else for (const G of capOwn.keys()) {
          const c = capCentre(G);
          const st = capRec.slice().sort((a, b) => Math.abs((a.atU - 0.5) * H.lwl - c.x) - Math.abs((b.atU - 0.5) * H.lwl - c.x))[0];
          if (Math.abs((st.atU - 0.5) * H.lwl - c.x) > 0.3)
            say(v.id, 'capstans off the record\\'s stations',
                `a capstan stands at x ${c.x.toFixed(2)}; the nearest recorded station, u ${st.atU}, is x ${((st.atU - 0.5) * H.lwl).toFixed(2)}`);
        }
      }
      /* ── A-CAPSTAN-CLEAR (round 345): NOTHING STANDS IN A CAPSTAN'S DRUM OR ITS BARS' SWEEP.
         The 74's jeer capstan, put at its read station, stood on the forward grating, under the
         ship's boat, and with its forward bars through the forecastle's end bulkhead. The men walk
         the bars round a full circle at breast height, so the circle has to be clear. MESH, in
         hull space: the drum is the cylinder of the drumhead's own radius from the deck to the
         drumhead's top; the sweep is the disc out to the farthest bar vertex, between the bars'
         lowest and highest vertex, 0.05 m each way. Any vertex of another part inside either
         convicts, except the deck and the shell under the foot, and rope: a rope is a line and
         can be led clear, and the falls are not this rule's question. */
      if (capRec.length && capm.length) {
        const SKIP = new Set(['capstan', 'deck', 'planking', 'frames', 'keel', 'waterway', 'wale', 'rail']);
        const ROPE = /stay|shroud|sheet|brace|halyard|lift|tack|bowline|clew|bunt|fall|rope|coil|ratline|lanyard|jeer|tye|rigging|line|vang|pendant|tackle|guy/i;
        const P = new THREE.Vector3();
        for (const [G, ms] of capOwn) {
          const c = capCentre(G);
          let rD = 0, yTop = -1e9, yFoot = 1e9, rB = 0, b0 = 1e9, b1 = -1e9;
          for (const o of ms) {
            const M = new THREE.Matrix4().multiplyMatrices(invCap, o.matrixWorld), A = o.geometry.attributes.position;
            const bar = Math.abs(o.rotation.z) > 0.1;
            for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(M);
              const r = Math.hypot(P.x - c.x, P.z - c.z);
              if (bar) { rB = Math.max(rB, r); b0 = Math.min(b0, P.y); b1 = Math.max(b1, P.y); }
              else { yTop = Math.max(yTop, P.y); yFoot = Math.min(yFoot, P.y);
                     if (o.name === 'cap-head') rD = Math.max(rD, r); } }
          }
          if (!rB || !rD) continue;
          const hits = new Map();
          g.traverse(o => {
            if (!o.isMesh || ms.includes(o)) return;
            const pt = tagOf(o); if (!pt || SKIP.has(pt.key) || ROPE.test(pt.key)) return;
            const M = new THREE.Matrix4().multiplyMatrices(invCap, o.matrixWorld), A = o.geometry.attributes.position;
            for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(M);
              const r = Math.hypot(P.x - c.x, P.z - c.z);
              const inDrum = r < rD && P.y > yFoot + 0.05 && P.y < yTop;
              const inSweep = r < rB && P.y > b0 - 0.05 && P.y < b1 + 0.05;
              if (inDrum || inSweep) { const k = `${pt.key}/${pt.name}`;
                if (!hits.has(k)) hits.set(k, `${inDrum ? 'in the drum' : 'in the bars\\' sweep'} at x ${P.x.toFixed(2)} y ${P.y.toFixed(2)} z ${P.z.toFixed(2)}`); break; } }
          });
          for (const [k, w] of hits)
            say(v.id, "a part in a capstan's sweep",
                `${k} ${w}; the capstan at x ${c.x.toFixed(2)}: drumhead radius ${rD.toFixed(2)} m, bars to ${rB.toFixed(2)} m at y ${b0.toFixed(2)}–${b1.toFixed(2)}`);
        }
      }
      if (H.capstan && capm.length && H.capstan.form !== 'spill') for (const [capG, capmG] of capOwn) {
        const capm = capmG;
        const recSt = capRec.slice().sort((a, b) => Math.abs((a.atU - 0.5) * H.lwl - capCentre(capG).x) - Math.abs((b.atU - 0.5) * H.lwl - capCentre(capG).x))[0] || {};
        const recBars = recSt.bars || H.capstan.bars;
        const vrange = o => {          // vertex extents in the mesh's own frame""")
rep("""          if (H.capstan.bars && bars !== H.capstan.bars)
            say(v.id, "the capstan off the record's count",
                `${bars} bars shipped, record says ${H.capstan.bars}`);""",
"""          if (recBars && bars !== recBars)
            say(v.id, "the capstan off the record's count",
                `${bars} bars shipped, record says ${recBars}`);""")
p.write_text(s); print('ok')

