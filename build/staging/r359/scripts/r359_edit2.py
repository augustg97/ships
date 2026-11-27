import sys
W = sys.argv[1]; p = W + '/js/hull.js'; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, ('anchor', a[:80], s.count(a))
    s = s.replace(a, b, 1)
rep("if (FINE && S.islands) buildIslands(S, group, hullMat);", "if (FINE && S.islands) buildIslands(S, group, hullMat, mats.iron || mats.woodDark);")
rep("function buildIslands(S, group, hullMat) {", "function buildIslands(S, group, hullMat, gunMat) {")
rep("      const gunMat = S.__gunMat || new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.55, metalness: 0.35 });\n", "")
open(p, 'w').write(s); print('ok')
