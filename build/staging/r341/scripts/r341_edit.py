#!/usr/bin/env python3
"""r341: the 74's side paint and wales from one record (Asow's bands); hull.wale.finish.
Re-runnable against a clean HEAD tree: python3 r341_edit.py <web dir>"""
import sys, json, re
W = sys.argv[1]

def sub(path, old, new, count=1):
    s = open(path).read()
    n = s.count(old)
    assert n == count, f'{path}: anchor found {n}x, want {count}: {old[:70]!r}'
    s = s.replace(old, new)
    open(path, 'w').write(s)

# ── shader: the tiers come in as uniforms ─────────────────────────────────────────────
F = W + '/shaders/HULL_FRAG.frag.glsl'
sub(F, "uniform float uGunDecks;\n",
"""uniform float uGunDecks;
/* the chequer's tiers, from hull.js sideBands() (round 341): per gun deck, the ochre band's
   lower and upper edge and the port centre, in the loft's v, and the edge's half-softness */
uniform vec4  uTierLo, uTierHi, uTierPort;
uniform float uTierSoft;
""")
sub(F, """      for (float d = 0.0; d < 4.0; d += 1.0) {
        if (d >= uGunDecks) break;
        float centre = uWaterline + 0.10 + d * 0.115;
        band = max(band, smoothstep(0.052, 0.030, abs(v - centre)));
        float px = fract(u * 26.0);
        port = max(port, smoothstep(0.030, 0.016, abs(v - centre))
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));
      }""",
"""      /* ⚠ THE PAINT FOLLOWS THE TIMBER (round 341). The band centres were fixed here at
         uWaterline + 0.10 + d·0.115, so the paint and the wales were two models of one side.
         Eckersberg's Asow paints the black where the wales run and the ochre on the planking
         between them. The tiers now come from hull.js sideBands(), which also places the
         wales, the gunports' guns and these ports. */
      for (int d = 0; d < 4; d++) {
        if (float(d) >= uGunDecks) break;
        float lo = uTierLo[d], hi = uTierHi[d], pc = uTierPort[d];
        band = max(band, smoothstep(lo - uTierSoft, lo + uTierSoft, v)
                       * smoothstep(hi + uTierSoft, hi - uTierSoft, v));
        float px = fract(u * 26.0);
        port = max(port, smoothstep(0.030, 0.016, abs(v - pc))
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));
      }""")

# ── hull.js ───────────────────────────────────────────────────────────────────────────
J = W + '/js/hull.js'
sub(J, "/* ── A READ WALE IS LAID ON ITS PLATE'S LINE (round 337)",
"""/* ── THE PAINT FOLLOWS THE TIMBER (round 341) ─────────────────────────────────────────
   The chequer's band centres were fixed in the shader at uWaterline + 0.10 + d·0.115, and the
   wales at v 0.655 and 0.760, so paint and timber were two models of one side. On the 74 the
   upper wale crossed the top of the lower ochre band. Eckersberg's Asow (1828) paints the black
   where the wales run and the ochre on the planking between them, with each tier of ports in
   its ochre band. hull.paintBands { bands: [[ 'black' | 'ochre', from, to ]], as fractions of
   the freeboard over the load waterline } is that read. This function turns it into the
   shader's tiers, the ports' centres (so the guns follow) and the wales' heights:
     the main wale's top on the top of the lowest black band, where the lower ports' ochre
     begins; each later wale centred in the next black band.
   The wales keep the class depths: at 30 px/m the plate does not separate a wale's moulding
   from the black-painted planking around it. Without the field, the class tiers and wales,
   byte-identical: the old band was |v − c| < 0.041 with edges 0.011 soft. */
function sideBands(S) {
  const P = S.paintBands;
  const vf = f => 0.62 + 0.38 * f;
  if (P && Array.isArray(P.bands) && P.bands.length) {
    const ochre = P.bands.filter(b => b[0] === 'ochre');
    const black = P.bands.filter(b => b[0] === 'black');
    const tiers = ochre.map(b => ({ lo: vf(b[1]), hi: vf(b[2]), port: vf(0.5 * (b[1] + b[2])) }));
    const wales = [];
    if (black[0]) wales.push({ v0: vf(black[0][2]) - 0.015, thick: 0.030 });
    if (black[1]) wales.push({ v0: vf(0.5 * (black[1][1] + black[1][2])), thick: 0.026 });
    while (wales.length < 2) wales.push(wales.length ? { v0: 0.760, thick: 0.026 } : { v0: 0.655, thick: 0.030 });
    return { tiers, wales, soft: 0.004, from: 'record' };
  }
  const tiers = [];
  for (let d = 0; d < 4; d++) {
    const c = 0.62 + 0.10 + d * 0.115;
    tiers.push({ lo: c - 0.041, hi: c + 0.041, port: c });
  }
  return { tiers, wales: [{ v0: 0.655, thick: 0.030 }, { v0: 0.760, thick: 0.026 }], soft: 0.011, from: 'class' };
}

/* ── A WALE'S PAINT IS A FACT OF THE RECORD (round 341) ──────────────────────────────
   Every wale was one brown, 0x3d2f1f. hull.wale.finish says what the plate shows:
   'tarred' is the side's black (the chequer's dark grey, vec3(0.180, 0.178, 0.172) linear,
   so the timber and the band it runs in are one paint); 'withHull' is the topside colour;
   'bright' is the timber's own tone. Without it the brown stays, as the class fallback,
   and the mesh says so in userData.waleFinish. Research/WALE-FINISH.md holds the reads. */
function waleFinish(S) {
  const f = S.wale && S.wale.finish;
  if (f === 'tarred') return { color: new THREE.Color().setRGB(0.180, 0.178, 0.172), finish: f, from: 'record' };
  if (f === 'withHull') return { color: new THREE.Color(S.topside || '#5b4a33'), finish: f, from: 'record' };
  if (f === 'bright') return { color: new THREE.Color(0x6b5334), finish: f, from: 'record' };
  return { color: new THREE.Color(0x3d2f1f), finish: 'unknown', from: 'class fallback' };
}

/* ── A READ WALE IS LAID ON ITS PLATE'S LINE (round 337)""")

sub(J, """      const waleMat = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
      const lw = tag(new THREE.Mesh(buildWaleGeometry(S, 0.655, 0.030), waleMat), 'wale');
      lw.userData.waleProud = lw.geometry.userData.waleProud; lw.userData.waleProudM = lw.geometry.userData.waleProudM;
      group.add(lw);
      const rv = readWaleV(S, hullSurface(S));
      const mw = tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026, rv), waleMat), 'wale');""",
"""      const WF = waleFinish(S), SB = sideBands(S);
      const waleMat = new THREE.MeshStandardMaterial({ color: WF.color, roughness: 0.9 });
      const lw = tag(new THREE.Mesh(buildWaleGeometry(S, SB.wales[0].v0, SB.wales[0].thick), waleMat), 'wale');
      lw.userData.waleProud = lw.geometry.userData.waleProud; lw.userData.waleProudM = lw.geometry.userData.waleProudM;
      lw.userData.waleFinish = WF.finish + ' (' + WF.from + ')'; lw.userData.waleBands = SB.from;
      group.add(lw);
      const rv = readWaleV(S, hullSurface(S));
      const mw = tag(new THREE.Mesh(buildWaleGeometry(S, SB.wales[1].v0, SB.wales[1].thick, rv), waleMat), 'wale');
      mw.userData.waleFinish = lw.userData.waleFinish; mw.userData.waleBands = SB.from;""")

sub(J, """      uGunDecks: { value: S.gunDecks || 0 },
""", """      uGunDecks: { value: S.gunDecks || 0 },
      ...(() => {
        const t = sideBands(S).tiers, at = (k, i) => (t[i] ? t[i][k] : 0);
        const v4 = k => new THREE.Vector4(at(k, 0), at(k, 1), at(k, 2), at(k, 3));
        return { uTierLo: { value: v4('lo') }, uTierHi: { value: v4('hi') },
                 uTierPort: { value: v4('port') }, uTierSoft: { value: sideBands(S).soft } };
      })(),
""")

sub(J, """    const v = 0.62 + 0.10 + d * 0.115;                  // the shader's port centre, exactly""",
"""    const tier = sideBands(S).tiers[d];                 // the shader's port centre, exactly (r341)
    if (!tier) continue;
    const v = tier.port;""")
sub(J, " *     port centre in v : uWaterline + 0.10 + deck * 0.115",
       " *     port centre in v : sideBands(S).tiers[deck].port (r341; the class tier is uWaterline + 0.10 + deck * 0.115)")

# export sideBands for the audit
s = open(J).read()
m = re.search(r"window\.SHIPS_HULL\s*=\s*\{", s)
assert m, 'SHIPS_HULL export not found'
s = s[:m.end()] + ' sideBands, waleFinish,' + s[m.end():]
open(J, 'w').write(s)

# ── the record ────────────────────────────────────────────────────────────────────────
V = W + '/data/vessels.json'
raw = open(V).read()
D = json.loads(raw)
byid = {v['id']: v for v in D['vessels']}
sol = byid['ship-of-the-line']['hull']; end = byid['endurance']['hull']
sol['paintBands'] = {
    'bands': [['black', 0.0, 0.34], ['ochre', 0.34, 0.61], ['black', 0.61, 0.78], ['ochre', 0.78, 1.0]],
    'of': 'the freeboard over the load waterline',
    'provenance': "PLATE READ, r340-r341: C. W. Eckersberg, 'The Russian Ship of the Line Asow and a Frigate at Anchor in the Roads of Elsinore' (1828, SMK), the Commons Google Art Project file at the 1920 px thumb (build/staging/r312/plates/asow.jpg, about 30 px/m at the mizzen). Read up two columns (x 800-830 and x 880-910), an ochre pixel being one where R - B > 28, the bands agree to 0.01 as fractions of the height from the waterline to the top of the upper ochre band: black 0-0.34, ochre 0.34-0.61, black 0.61-0.78, ochre 0.78-1.0. The upper ochre band runs up to the black rail cap at the top of the side, so that height is taken as the record's freeboard. BOUNDS: the ratios are scale-free and good to about 0.01; the plate's metres carry about 20% (the top of the band reads 4.8-5.1 m against the record's 5.4 m). Asow is a Russian 74 of 1826; the class's British dark is Crick-Smith's grey, and the shader keeps that colour.",
}
sol['wale'] = {'finish': 'tarred',
    'finishProvenance': "PLATE READ, r340: Eckersberg's Asow (see paintBands) paints the side black from the waterline to the lower ports and between the tiers, where the wales run; no wale shows a lighter tone than the band it runs in. Research/WALE-FINISH.md."}
end['wale'] = {'finish': 'withHull',
    'finishProvenance': "PLATE READ, r340: Hurley's hand-coloured lantern slide a090007 (Commons, 1500 px, about 24 px/m at the stern) shows her side one dark tone from the rail to the ice, with no contrasting band. The slide's colour is hand-applied, so only tone is evidence: the wale is painted with the hull. Research/WALE-FINISH.md."}
# keep the file's own formatting: detect indent
indent = 2 if raw.startswith('{\n  "') else None
open(V, 'w').write(json.dumps(D, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
print('edits applied to', W)

# ── r341 second pass: a recorded wale finish takes the shell's own light ──────────────
def second_pass(W):
    J = W + '/js/hull.js'
    sub(J, """      const waleMat = new THREE.MeshStandardMaterial({ color: WF.color, roughness: 0.9 });""",
"""      /* a RECORDED finish is the side's own paint, so it takes the shell's own light: STEEL_FRAG
         on the hull material's uSun/uCam (the r102 lesson). In the scene's lights through ACES
         the first r341 witness drew the 74's tarred wales as pale grey stripes on a dark band.
         The class fallback keeps its MeshStandardMaterial brown, byte-identical. */
      const waleMat = WF.from === 'record'
        ? new THREE.ShaderMaterial({
            vertexShader: SHADERS['STEEL_VERT.vert'], fragmentShader: SHADERS['STEEL_FRAG.frag'],
            uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam, uCol: { value: WF.color } } })
        : new THREE.MeshStandardMaterial({ color: WF.color, roughness: 0.9 });""")

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'second':
    second_pass(sys.argv[1])
