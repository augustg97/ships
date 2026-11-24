# r306 builder edits to web/js/hull.js: the gaff's length and throat from the record, and a brailed
# loose-footed gaff sail (no boom, gaff aloft, cloth stowed along the mast) where the record says so.
import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)

rep("""      const gaffL = Math.min(lower * 0.42, boomL * 0.72);
      const peak = 0.62;                                 // the gaff's angle above horizontal""",
"""      /* ── THE GAFF AND ITS THROAT FROM THE RECORD (round 306, 0y¹³²) ─────────────────────
         The class gaff is 0.72 of the boom, and the boom is cut to the room abaft the mast, so a
         funnel standing in that room shortened the GAFF as well, though the gaff swings far over
         the stack. Endurance's main gaff came out 3.1 m where Hurley's beset broadside draws it
         at 0.55 of the lower mast, as long as her mizzen's. A record that has read the gaff
         gives it as shares of the lower mast (gaffFrac, throatFrac, with gaffRead holding the
         plate's rows); the class figures stand everywhere else. Shares, not metres, because the
         plate's scale is contested and the lower mast is what the builder already has. */
      const gaffL = mk.gaffFrac != null ? lower * mk.gaffFrac : Math.min(lower * 0.42, boomL * 0.72);
      const gaffFrom = mk.gaffFrac != null ? 'record: gaffFrac' : 'class: the lesser of 0.42 of the lower mast and 0.72 of the boom';
      /* ── A BRAILED SAIL HAS NO BOOM (round 306) ────────────────────────────────────────
         gaffStow: 'brailed' is a loose-footed sail stowed by its brails: the leech and foot
         are hauled in to the mast, the head stays laced to the gaff, and the gaff stays aloft.
         There is no boom and so no topping lift. Endurance's main is drawn this way because
         both plates of her that show the main show it so (the record's gaffStowProvenance). */
      const BRAILED = mk.gaffStow === 'brailed';
      const peak = 0.62;                                 // the gaff's angle above horizontal""")

rep("""      group.add(tag(bm2, 'yard', 'Boom',""", """      if (!BRAILED) group.add(tag(bm2, 'yard', 'Boom',""")
rep("""      if (liftMesh) group.add(tag(liftMesh, 'toppingLift'));
      /* the SET geometry decides the cloth's area whichever state it is shown in — furling
         does not change how much canvas she owns */
      const gy = base + lower * (mk.rig === 'square' ? 0.55 : 0.86);""",
"""      if (liftMesh && !BRAILED) group.add(tag(liftMesh, 'toppingLift'));
      /* the SET geometry decides the cloth's area whichever state it is shown in — furling
         does not change how much canvas she owns */
      const gy = base + lower * (mk.throatFrac != null ? mk.throatFrac : (mk.rig === 'square' ? 0.55 : 0.86));""")

rep("""      if (FURLED) {
        /* a gaff sail is handled entirely from the deck, and it stows the same way: halyards""",
"""      if (BRAILED) {
        /* the gaff stands at its working angle in both states, and the cloth lies in a bundle
           along the mast's after side from the tack to the throat. Its girth is the cloth of a
           sail with this luff and head (a quadrilateral whose foot is as long as its head, about
           0.75 of head times luff), at the furl's own 3.5 cm of stowed thickness per square metre
           of canvas spread along the bundle. */
        const gm = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
        gm.rotation.z = -(Math.PI / 2 - peak);
        gm.position.set(mastX(gy) + Math.cos(peak) * gaffL / 2, gy + Math.sin(peak) * gaffL / 2, 0);
        gm.userData.gaff = { at: mk.at, mast: mi, origin: [+mastX(gy).toFixed(3), +gy.toFixed(3)], deg: +(peak * 180 / Math.PI).toFixed(2),
          lengthM: +gaffL.toFixed(3), state: 'brailed', gaffFrom, throatFrac: mk.throatFrac != null ? mk.throatFrac : null };
        group.add(tag(gm, 'yard', 'Gaff'));
        hoistGaff([mastX(gy), gy], peak);
        const luff = gy - footY, area = 0.75 * gaffL * luff;
        const rb = Math.max(0.05, Math.sqrt((area * 0.035) / (Math.PI * Math.max(luff, 0.1))));
        const bA = new THREE.Vector3(mastX(footY) + mastR(footY) + rb, footY, 0);
        const bB = new THREE.Vector3(mastX(gy) + mastR(gy) + rb, gy, 0);
        const br = makeFurl(bA, bB, area, furlMat(mats), group, { radius: rb });
        if (br) { br.userData.brailed = { mast: mi, at: mk.at, foot: [+bA.x.toFixed(3), +bA.y.toFixed(3)], head: [+bB.x.toFixed(3), +bB.y.toFixed(3)], r: +rb.toFixed(3) }; }
        sails.push(br);
      } else if (FURLED) {
        /* a gaff sail is handled entirely from the deck, and it stows the same way: halyards""")

rep("""        gm.userData.gaff = { at: mk.at, mast: mi, origin: [+mastX(gy).toFixed(3), +gy.toFixed(3)], deg: +(peak * 180 / Math.PI).toFixed(2), lengthM: +gaffL.toFixed(3), state: 'set' };""",
"""        gm.userData.gaff = { at: mk.at, mast: mi, origin: [+mastX(gy).toFixed(3), +gy.toFixed(3)], deg: +(peak * 180 / Math.PI).toFixed(2), lengthM: +gaffL.toFixed(3), state: 'set',
          gaffFrom, throatFrac: mk.throatFrac != null ? mk.throatFrac : null };""")
open(p, 'w').write(s); print('ok')
# second pass (applied after the first): name the bundle and give it its card line
s = open(p).read()
a = "const br = makeFurl(bA, bB, area, furlMat(mats), group, { radius: rb });"
if a in s:
    s = s.replace(a, """const br = makeFurl(bA, bB, area, furlMat(mats), group, { radius: rb, name: 'Brailed sail',
          seat: { card: 'This sail is loose-footed and is stowed by its brails, lines that haul the leech and foot in to the mast while the gaff stays aloft. She carries no boom on this mast. Hurley\\u2019s plates show it this way.' } });""")
    open(p, 'w').write(s)
