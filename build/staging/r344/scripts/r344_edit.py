import sys, pathlib
web = pathlib.Path(sys.argv[1]); p = web / 'js' / 'hull.js'
s = p.read_text()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. the wall material: a timber island's barricade is the hull's own planking
rep("""  const wallMat = S.islands.finish
    ? (() => { const m = steel('#000000'); m.uniforms.uCol.value = waleFinish({ wale: { finish: S.islands.finish }, topside: S.topside }).color; return m; })()
    : steel(S.topside || '#3a3a3c');""",
"""  /* ⚠ A TIMBER BARRICADE IS PLANKED (round 344). r343 drew the 74's barricades in STEEL_FRAG,
     the flat paint a steel island's plating takes, so up close each read as a painted slab
     standing on a planked side. A wooden ship's barricade is the side's own planking carried
     up on the top timbers: the same strakes, butts and treenails. On a timber hull the wall is
     drawn in HULL_FRAG, sharing the hull material's own uniforms (sun, camera, strake count,
     plank length, frame spacing), so the seams continue across the sheer at the shell's own
     pitch. Its v carries on above the sheer at the freeboard's own scale (v = wl + (1 − wl)·y /
     sheer: linear in height, 1 at the sheer), so the first barricade strake is the next strake
     up. The paint is the recorded finish on plain planking: the chequer's bands and the
     record's glazing rows belong to the side under the sheer. A steel island is unchanged. */
  const timberWall = !(S.build === 'steel' || S.build === 'iron') && !S.iron && hullMat.fragmentShader === HULL_FRAG;
  const wallCol = S.islands.finish
    ? waleFinish({ wale: { finish: S.islands.finish }, topside: S.topside }).color
    : new THREE.Color(S.topside || '#3a3a3c');
  const wallMat = timberWall
    ? new THREE.ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: THREE.DoubleSide,
        uniforms: { ...hullMat.uniforms, uTopside: { value: wallCol.clone() }, uChequer: { value: 0 },
                    uHGrpN: { value: 0 }, uCopper: { value: 0 } } })
    : (() => { const m = steel('#000000'); m.uniforms.uCol.value = wallCol; return m; })();
  const wlV = hullMat.uniforms.uWaterline ? hullMat.uniforms.uWaterline.value : 0.62;
  /* the loft's (u, v) of a point on the wall at station u and height y (the freeboard's scale) */
  const wallUV = (u, y) => [u, wlV + (1 - wlV) * y / Math.max(0.5, H.sheer(Math.max(0, Math.min(1, u))))];""")

# 2. strip takes an optional uv list, one (u, v) per vertex
rep("""  const strip = (pts, mat, up) => {""", """  const strip = (pts, mat, up, uvs) => {""")
rep("""    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };
  for (const isl of S.islands.list) {""",
"""    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };
  for (const isl of S.islands.list) {""")

# 3. the wall and the end bulkheads carry the loft's uv
rep("""    for (const p of pathW) wall.push(p.x, H.sheer(p.u) - 0.02, p.z, p.x, p.hi, p.z);
    g.add(strip(wall, wallMat));""",
"""    const wallUv = [];
    for (const p of pathW) {
      wall.push(p.x, H.sheer(p.u) - 0.02, p.z, p.x, p.hi, p.z);
      wallUv.push(...wallUV(p.u, H.sheer(p.u) - 0.02), ...wallUV(p.u, p.hi));
    }
    g.add(strip(wall, wallMat, false, wallUv));""")
rep("""      g.add(strip([x, yd, h, x, ys, h, x, yd, -h, x, ys, -h], wallMat));""",
"""      /* the bulkhead's planks run athwartships, so its u runs across the beam (a plank's worth of
         u per half-breadth would repeat the butts; one u step of the station's own length keeps
         the grain from smearing) */
      const du = h / L;
      g.add(strip([x, yd, h, x, ys, h, x, yd, -h, x, ys, -h], wallMat, false,
        [...wallUV(ue, yd).map((c, i) => i ? c : ue - du), ...wallUV(ue, ys).map((c, i) => i ? c : ue - du),
         ...wallUV(ue, yd).map((c, i) => i ? c : ue + du), ...wallUV(ue, ys).map((c, i) => i ? c : ue + du)]));""")
p.write_text(s)
print('ok')
