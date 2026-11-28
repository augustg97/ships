import pathlib
p = pathlib.Path.home() / 'Ships/Research/audit-hulls.js'
s = p.read_text()
anchor = "    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99), RETIRED IN ROUND 366."
assert s.count(anchor) == 1
rule = r"""    /* ── A-HAWSE (round 375): A RECORDED HAWSE-HOLE IS ITS RECORD, ON THE BOW, AND CLEAR OF EVERY PORT.
       Steel (1822) Folio III gives the 74's hawse-holes 1 ft 5 in across, 1 ft 6 in apart, two a side, each on the
       joint between two of the four hawse pieces. Until r375 no hull drew one. Where hull.hawse is recorded: (a) there
       are two holes a side for the record's two centres, each tagged 'hawse'; (b) each hole's face is the record's
       diameter within 1 cm, its centre the record's half-breadth within 2 cm; (c) the face stands on the bow: the
       audit bisects its own station where the skin's half-breadth at the face's height is the face's, and the face
       must lie within 6 cm of that skin point; (d) no class port of the lower tier is cut within 0.10 m of a hole:
       the shader cuts a port in every 1/26 of u whose fore edge stands abaft uHawseU, so the first such port's fore
       edge must stand abaft every hole's after edge plus 0.10 m. */
    if (H.hawse && H.hawse.diaM > 0) {
      const HSh = SHIPS_HULL.hullSurface(H), invH = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const vAtYh = (u, y) => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSh, u, m)[1] < y) a = m; else b = m; } return (a + b) / 2; };
      const holes = [];
      g.traverse(o => {
        if (!(o.isGroup && o.userData.part && o.userData.part.key === 'hawse')) return;
        let face = null; o.traverse(m => { if (m.isMesh && m.userData.hawseFace) face = m; });
        if (!face) { say(v.id, 'a hawse-hole with no face', 'the group carries no closed face'); return; }
        face.updateMatrixWorld(true);
        const c = new THREE.Vector3().applyMatrix4(new THREE.Matrix4().multiplyMatrices(invH, face.matrixWorld));
        holes.push({ c, r: face.geometry.parameters.radius });
      });
      const want = 2 * H.hawse.centresM.length;
      if (holes.length !== want) say(v.id, 'hawse-holes off their recorded number', `${holes.length} drawn, ${want} recorded (two a side)`);
      let uniform = null;
      g.traverse(o => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uGunDecks && uniform === null) uniform = o.material.uniforms.uHawseU ? o.material.uniforms.uHawseU.value : 0; });
      const gd = H.gunDecks || 0, recT0 = Array.isArray(H.tierPorts) && H.tierPorts[0] && H.tierPorts[0].hM > 0;
      for (const h of holes) {
        if (Math.abs(h.r - H.hawse.diaM / 2) > 0.01) say(v.id, 'a hawse-hole off its recorded diameter', `${(2 * h.r).toFixed(3)} m across, recorded ${H.hawse.diaM}`);
        const z = Math.abs(h.c.z);
        if (!H.hawse.centresM.some(cm => Math.abs(cm - z) < 0.04)) say(v.id, 'a hawse-hole off its recorded half-breadth', `centre ${z.toFixed(3)} m off the middle line, recorded ${H.hawse.centresM.join(' and ')}`);
        let a = 0.0005, b = 0.4;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (Math.abs(SHIPS_HULL.surfacePoint(H, HSh, m, vAtYh(m, h.c.y))[2]) < z) a = m; else b = m; }
        const uS = (a + b) / 2, sp = SHIPS_HULL.surfacePoint(H, HSh, uS, vAtYh(uS, h.c.y));
        const off = Math.hypot(sp[0] - h.c.x, sp[1] - h.c.y, Math.abs(sp[2]) - z);
        if (off > 0.06) say(v.id, 'a hawse-hole off the bow', `its face stands ${off.toFixed(3)} m from the skin at its own height and half-breadth`);
        h.u = uS; h.dxdu = Math.abs(SHIPS_HULL.surfacePoint(H, HSh, uS + 0.002, vAtYh(uS + 0.002, h.c.y))[0] - sp[0]) / 0.002;
      }
      if (gd >= 1 && !recT0 && holes.length) {
        const uH = uniform || 0;
        let k = 0; while ((k + 0.2) / 26 < uH) k++;
        const fore = (k + 0.2) / 26;
        for (const h of holes) {
          const aft = h.u + (h.r + (H.hawse.pipeThickM || 0.03) + 0.10) / h.dxdu;
          if (fore < aft) say(v.id, 'a lower-tier port across a hawse-hole', `the first class port's fore edge is at u ${fore.toFixed(4)}, the hole's after edge plus 0.10 m at u ${aft.toFixed(4)} (uHawseU ${uH.toFixed(4)})`);
        }
      }
    }

"""
s = s.replace(anchor, rule + anchor)
p.write_text(s)
print('ok')
