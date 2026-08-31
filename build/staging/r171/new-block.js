/* r171 replacement for the sternlight window loop in buildStern — staged copy.
   The tier becomes ONE pierced sash-wall (ExtrudeGeometry, a hole per pane) plus
   ONE glass sheet behind the bars. See JUDGMENT.md. */
  const [plC, plR] = S.sternLightPanes || [3, 3];
  const pierF = S.sternLightPierFrac !== undefined ? S.sternLightPierFrac : 0.26;
  const pitchT = S.sternLightPitchM || 1.25;
  const barW = 0.045, sashT = B * 0.012;
  for (const zc of rowZ) {
    const hw = halfAt(zc) * 0.84;
    const N = Math.max(3, Math.min(7, Math.round((2 * hw) / pitchT)));
    const pitch = (2 * hw) / N, lw = pitch * (1 - pierF), gh = wh * 0.80;
    const pw = (lw - (plC - 1) * barW) / plC, ph = (gh - (plR - 1) * barW) / plR;
    const sash = new THREE.Shape();
    sash.moveTo(-hw, zc - wh / 2); sash.lineTo(hw, zc - wh / 2);
    sash.lineTo(hw, zc + wh / 2); sash.lineTo(-hw, zc + wh / 2); sash.closePath();
    for (let i = 0; i < N; i++) {
      const zi = -hw + pitch * (i + 0.5);
      for (let cx = 0; cx < plC; cx++) for (let cy = 0; cy < plR; cy++) {
        const h0 = zi - lw / 2 + cx * (pw + barW), v0 = zc - gh / 2 + cy * (ph + barW);
        const hole = new THREE.Path();
        hole.moveTo(h0, v0); hole.lineTo(h0 + pw, v0);
        hole.lineTo(h0 + pw, v0 + ph); hole.lineTo(h0, v0 + ph); hole.closePath();
        sash.holes.push(hole);
      }
    }
    const fr = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sash, { depth: sashT, bevelEnabled: false }),
      mats.woodPale);
    fr.rotation.y = Math.PI / 2;                 // shape (breadth, height) → ship (z, y)
    fr.position.set(xF + B * 0.002, 0, 0);
    g.add(tag(fr, 'sternlight'));
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, gh, 2 * hw), glass);
    gl.position.set(xF + B * 0.004, zc, 0);
    g.add(tag(gl, 'sternlight'));
