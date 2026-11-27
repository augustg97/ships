import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
FN = r'''
/* ── A PART UNDER A COVER IS LIT AS THE DECK UNDER IT IS (round 354) ─────────────────────────
   r352 and r353 shade the main deck under a deck built over it (DECK_FRAG's cover term), and every
   fitting standing on that deck kept the scene's full light: the Shipwright has no shadow map, so a
   MeshStandardMaterial part is lit by the key light and the whole hemisphere wherever it stands. On
   the 74 the main capstan under the quarterdeck, the jeer capstan under the forecastle's edge, the
   gratings and the upper-deck guns under both islands stood in full sun in the shade (r353's
   under.txt); on the carrack her capstan and gratings under the half deck. A real fitting under a
   deck is lit as the planks under it are: the sun only through the opening, the sky in the share
   h / (h + 2d). So every scene-lit part whose box reaches under a cover takes the SAME term: the
   text of COVER.chunk.glsl sliced out of the bundled DECK_FRAG between its two markers, reading
   the deck material's own uniform objects, so the deck and the part cannot drift apart. Direct
   light (the key and the fills) takes the sun's visibility, and the hemisphere and environment
   take the sky's, floored at 0.08 as the deck's sky is. The material is cloned per hull, so a
   material shared across the fleet is not changed on any other ship. */
let COVER_GLSL = null;
function coverGlsl() {
  if (COVER_GLSL !== null) return COVER_GLSL;
  const s = (typeof SHADERS !== 'undefined' && SHADERS['DECK_FRAG.frag']) || '';
  const a = s.indexOf('#define COVER_TERM_BEGIN'), b = s.indexOf('#define COVER_TERM_END');
  COVER_GLSL = a >= 0 && b > a ? s.slice(s.indexOf('\n', a) + 1, b) : '';
  return COVER_GLSL;
}
function lightUnderCovers(group, deckMat) {
  const U = deckMat && deckMat.uniforms, covers = deckMat && deckMat.userData.covers;
  if (!U || !covers || !covers.length || !coverGlsl()) return 0;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), M = new THREE.Matrix4(), I = new THREE.Matrix4();
  const hullInv = { value: new THREE.Matrix4() }, clones = new Map(), box = new THREE.Box3(), b = new THREE.Box3();
  const hwMax = c => Math.max(...c.hw);
  const reaches = bb => covers.some(c => bb.max.x > c.x0 && bb.min.x < c.x1 && bb.min.y < c.y - 0.02 &&
                                         bb.max.z > -hwMax(c) && bb.min.z < hwMax(c));
  let n = 0;
  group.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material) || !o.material || !o.material.isMeshStandardMaterial) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    M.multiplyMatrices(inv, o.matrixWorld);
    if (o.isInstancedMesh) {
      box.makeEmpty();
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, I); box.union(b.copy(o.geometry.boundingBox).applyMatrix4(I.premultiply(M))); }
    } else box.copy(o.geometry.boundingBox).applyMatrix4(M);
    if (!reaches(box)) return;
    let m = clones.get(o.material);
    if (!m) {
      m = o.material.clone();
      m.userData = Object.assign({}, o.material.userData, { coverLit: true, coverUniforms: U.uCover });
      m.onBeforeCompile = sh => {
        sh.uniforms.uCover = U.uCover; sh.uniforms.uCoverN = U.uCoverN; sh.uniforms.uCoverHW = U.uCoverHW;
        sh.uniforms.uSun = U.uSun; sh.uniforms.uHullInv = hullInv;
        sh.vertexShader = 'uniform mat4 uHullInv;\nuniform vec3 uSun;\nvarying vec3 vCovO;\nvarying vec3 vCovLo;\n' +
          sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 cp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cp = instanceMatrix * cp;
  #endif
    vCovO = (uHullInv * modelMatrix * cp).xyz;
    /* uSun is a view-space direction: the transpose of the view rotation takes it to world, then to hull */
    vec3 ws = vec3(dot(viewMatrix[0].xyz, uSun), dot(viewMatrix[1].xyz, uSun), dot(viewMatrix[2].xyz, uSun));
    vCovLo = normalize(mat3(uHullInv) * ws); }`);
        sh.fragmentShader = coverGlsl() + 'varying vec3 vCovO;\nvarying vec3 vCovLo;\n' +
          sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
  { vec2 cvis = coverVis(vCovO, vCovLo);
    reflectedLight.directDiffuse *= cvis.x; reflectedLight.directSpecular *= cvis.x;
    float skv = max(cvis.y, 0.08);
    reflectedLight.indirectDiffuse *= skv; reflectedLight.indirectSpecular *= skv; }`);
      };
      m.customProgramCacheKey = () => 'cover-lit-r354';
      clones.set(o.material, m);
    }
    o.material = m;
    const prev = o.onBeforeRender;
    o.onBeforeRender = function (...a) { hullInv.value.copy(group.matrixWorld).invert(); return prev.apply(this, a); };
    n++;
  });
  return n;
}
'''
anchor = '\n/* The highest walled tier covering station u, or null:'
assert s.count(anchor) == 1; s = s.replace(anchor, FN + anchor)
call_anchor = '  const capstanUnseated = group.userData.capstanUnseated;   // r346, set by seatClassCapstans\n'
assert s.count(call_anchor) == 1
s = s.replace(call_anchor, '  const coverLitN = FINE ? lightUnderCovers(group, deckMat) : 0;   // r354\n' + call_anchor)
ud = '  group.userData = { hullMat, sails, spec: S, furled: FURLED, capstanUnseated,'
assert s.count(ud) == 1; s = s.replace(ud, '  group.userData = { hullMat, sails, spec: S, furled: FURLED, capstanUnseated, coverLitN,')
open(p, 'w').write(s); print('ok')
