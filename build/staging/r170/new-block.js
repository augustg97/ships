function TESTWRAP(GD, B, gdY, N, sx, railY, halfW, THREE, group, tag, L) {
    if (GD.maku) {
      const clothMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
                                                        side: THREE.DoubleSide });
      const valMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.94,
                                                      side: THREE.DoubleSide });
      const lipIn = B * 0.010;      // hung just inside the deck lip
      const tuck = 0.10;            // the hem swings a hand's-breadth inboard
      const clear = 0.15;           // and rides clear of the rail cap, over the ro
      const headYc = gdY - B * 0.016;
      /* the cloth is one parametric surface both pieces share: f along the band,
         s down it — 0 the head under the clamp, 1 the hem over the rail */
      const atCloth = (f, s, sgn) => {
        const t = Math.min(1, Math.max(0, f)) * N;
        const i = Math.min(N - 1, Math.floor(t)), w = t - i;
        const xx = sx[i] + (sx[i + 1] - sx[i]) * w;
        const ry = railY[i] + (railY[i + 1] - railY[i]) * w;
        const hw = halfW[i] + (halfW[i + 1] - halfW[i]) * w;
        return [xx, headYc + (ry + clear - headYc) * s, sgn * (hw - lipIn - tuck * s)];
      };
      const depCloth = f => {
        const t = Math.min(1, Math.max(0, f)) * N;
        const i = Math.min(N - 1, Math.floor(t)), w = t - i;
        return headYc - (railY[i] + (railY[i + 1] - railY[i]) * w + clear);
      };
      const bayM = GD.makuBayM !== undefined ? GD.makuBayM : 0.7;
      const bandLen = Math.abs(sx[N] - sx[0]);
      const nSc = Math.max(4, Math.round(bandLen / bayM));
      const pitchF = 1 / nSc, rM = bandLen / nSc / 2;
      const SEG = Math.max(12, Math.ceil(Math.PI * rM / 0.07));
      const lay = 0.008;
      for (const sgn of [-1, 1]) {
        const cpos = [], cidx = [];
        for (let i = 0; i <= N; i++) {
          cpos.push(sx[i], headYc,           sgn * (halfW[i] - lipIn),
                    sx[i], railY[i] + clear, sgn * (halfW[i] - lipIn - tuck));
          if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
        cg.setIndex(cidx); cg.computeVertexNormals();
        group.add(tag(new THREE.Mesh(cg, clothMat), 'maku', 'Maku',
          'The cloth band the Busan scroll hangs along the yagura band on hull after '
          + 'hull of the anchored fleet — white, under a dark scalloped hem. Dress and '
          + 'concealment both: an arquebusier behind it cannot be counted.'));
        /* the valance: one strip of cloth a side — tangent semicircles hanging from
           the head line, radius half the recorded bay, on the band's own surface */
        const vpos = [], vidx = [];
        for (let j = 0; j < nSc; j++) {
          const fc = (j + 0.5) * pitchF;
          const base = vpos.length / 3;
          const ap = atCloth(fc, 0, sgn);
          vpos.push(ap[0], ap[1], ap[2] + sgn * lay);
          for (let k = 0; k <= SEG; k++) {
            const th = Math.PI + Math.PI * k / SEG;
            const f = fc + Math.cos(th) * pitchF / 2;
            const d = -Math.sin(th) * rM;
            const p = atCloth(f, Math.min(1, d / Math.max(depCloth(f), 1e-6)), sgn);
            vpos.push(p[0], p[1], p[2] + sgn * lay);
            if (k) vidx.push(base, base + k, base + k + 1);
          }
        }
        const vg = new THREE.BufferGeometry();
        vg.setAttribute('position', new THREE.Float32BufferAttribute(vpos, 3));
        vg.setIndex(vidx); vg.computeVertexNormals();
        group.add(tag(new THREE.Mesh(vg, valMat), 'maku', 'Maku valance',
          'The dark scalloped border at the cloth band\'s head — tangent semicircles '
          + 'cut from one strip, hanging from the line the cloth itself hangs from, as '
          + 'the scroll draws them on hull after hull. Until round 170 the scallops '
          + 'were drawn spaced apart and off the band\'s foot; the plate hangs them '
          + 'touching, at the head.'));
      }
    }
}
