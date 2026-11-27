# r369: the oak anchor stock to Cotsell's wood rule (1856, p. 114, pl. 31 fig. 1); hoops at the plate's stations, sized to the stock
import sys
ROOT = '/Users/augustgweon/Ships/'
def sub(path, pairs):
    t = open(ROOT + path).read()
    for a, b in pairs:
        n = t.count(a)
        assert n == 1, (path, n, a[:80])
        t = t.replace(a, b)
    open(ROOT + path, 'w').write(t)

sub('web/js/hull.js', [
("""     The wood stock keeps its r366 class figures: Cotsell's wood rule (an inch to the foot in the middle, half an inch at
     the ends, so 1/12 and 1/24 of the length) is thicker than the 0.062 and 0.032 drawn, and is carried to the next round. */""",
"""     ⚠ THE WOOD STOCK IS COTSELL'S TOO (round 369). Same page: "The size of the stocks at the middle, when of wood, is one
     inch to the foot in length, at the ends half an inch", so a square section 1/12 of the length in the middle and 1/24
     at the ends. Until r369 it was drawn at r366's class figures, 0.062 and 0.032, three-quarters of the rule. Plate 31
     fig. 1, the Admiralty wood stock: two pieces of timber, set up on the shank by six iron hoops, three a side, which
     "can always be kept set up taut upon the square ... by simply driving the hoops up a little" (p. 117). The hoops'
     stations are read off the engraving, about 1170 px over the stock's length, at 0.26, 0.55 and 0.84 of the half-length
     from the middle (both halves agree within 0.03). Each hoop is drawn at the stock's own size where it sits: until
     r369 every hoop was 1.5 times the MIDDLE's size, so the outer pair stood 2.4 times the stock they bound, loose boxes
     round its ends. */""" ),
("""              palmB: s * 0.13, palmT: s * 0.009, stockL: s, stockMid: s * 0.062, stockEnd: s * 0.032,""",
 """              palmB: s * 0.13, palmT: s * 0.009, stockL: s, stockMid: s / 12, stockEnd: s / 24,
              hoopAt: [0.26, 0.55, 0.84], hoopT: s * 0.004, hoopW: s * 0.012,"""),
("""  /* the stock: oak, square, swelling to the middle, in two halves hooped with iron; or, on an iron ship, Cotsell's""",
 """  /* the stock: oak, square, swelling to the middle, in two halves set up by six iron hoops; or, on an iron ship, Cotsell's"""),
("""    for (const t of [0.18, 0.40]) {
      const hoop = put(new THREE.Mesh(new THREE.BoxGeometry(f.stockMid * 1.5, f.stockMid * 1.5, f.s * 0.012), iron), 'hoop');
      hoop.position.set(0, ys, k * f.stockL * t);
    }""",
 """    for (const h of f.hoopAt) {                                 // fraction of the half-length from the middle
      const side = f.stockMid + (f.stockEnd - f.stockMid) * h + 2 * f.hoopT;   // the stock's own size there, and the iron round it
      const hoop = put(new THREE.Mesh(new THREE.BoxGeometry(side, side, f.hoopW), iron), 'hoop');
      hoop.position.set(0, ys, k * f.stockL / 2 * h);
    }"""),
("""        stock: f.ironStock ? 'iron: Cotsell 1856, pl. 31 fig. 3, the Admiralty iron stock' : 'oak: Falconer 1769, in two halves hooped with iron',""",
 """        stock: f.ironStock ? 'iron: Cotsell 1856, pl. 31 fig. 3, the Admiralty iron stock' : 'oak: Falconer 1769, in two halves; Cotsell 1856 p. 114 and pl. 31 fig. 1, 1/12 of its length square in the middle, 1/24 at the ends, six hoops',"""),
("""its upper face (Falconer, 1769). The stock is oak, in two halves hooped with iron. '""",
 """its upper face (Falconer, 1769). The stock is oak, two pieces of timber set up on the '
                  + 'shank by six iron hoops, and it is heavy: Cotsell (1856) makes it as long as the shank, '
                  + 'an inch thick for every foot of that length in the middle and half that at the ends, so '
                  + 'an 18-foot stock is 18 inches square where it crosses the shank. '"""),
])

sub('Research/audit-hulls.js', [
("""    /* ── A-ANCHOR-CLEAR (round 366): A CATTED BOWER STANDS OUTSIDE THE SHIP AND CLEAR OF THE SHROUDS.""",
 """    /* ── A-ANCHOR-STOCK (round 369): THE STOCK IS COTSELL'S SIZE, AND ITS HOOPS BIND IT. Cotsell (1856, p. 114): the stock
       is as long as the shank; a wood stock is an inch to the foot of its length square in the middle and half an inch
       at the ends (1/12 and 1/24), an iron one half an inch to the foot in the middle. Plate 31 fig. 1: six hoops on the
       wood stock, three a side. Until r369 the oak stock was 0.062 and 0.032 of its length with four hoops, each 1.5 times
       the middle's size, so the outer hoops stood 2.4 times the stock they bound. Read off the anchor's own frame (every
       stock piece and hoop is a direct child of the anchor): the shank's height is the length the rule keys to; a square
       stock half (4 sides) gives its middle and end sizes from its radii; each hoop's breadth is judged against the
       stock's size at the hoop's own station, and must lie within 1.0 to 1.25 times it. */
    g.traverse(o => {
      if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'anchor') return;
      const ms = []; o.traverse(m => { if (m.isMesh && m.geometry && m.userData.ap) ms.push(m); });
      const shank = ms.find(m => m.userData.ap === 'shank');
      const halves = ms.filter(m => m.userData.ap === 'stock');
      if (!shank || !halves.length) return;
      const s = shank.geometry.parameters.height, P = halves[0].geometry.parameters;
      const sq = P.radialSegments === 4, k = sq ? Math.SQRT2 : 2;
      const mid = P.radiusBottom * k, end = P.radiusTop * k, len = halves.reduce((a, m) => a + m.geometry.parameters.height, 0);
      const off = (a, b) => Math.abs(a / b - 1) > 0.05;
      if (off(len, s)) say(v.id, 'anchor stock not as long as the shank', `stock ${len.toFixed(2)} m, shank ${s.toFixed(2)} m; Cotsell: equal`);
      if (sq && (off(mid, s / 12) || off(end, s / 24)))
        say(v.id, 'wood anchor stock not Cotsell\\'s size', `middle ${(mid / s).toFixed(3)}, ends ${(end / s).toFixed(3)} of the length; Cotsell: 1/12 (0.083) and 1/24 (0.042)`);
      if (!sq && off(mid, s / 24)) say(v.id, 'iron anchor stock not Cotsell\\'s size', `middle ${(mid / s).toFixed(3)} of the length; Cotsell: 1/24 (0.042)`);
      if (sq) {
        const hoops = ms.filter(m => m.userData.ap === 'hoop');
        if (hoops.length !== 6) say(v.id, 'wood anchor stock without six hoops', `${hoops.length} hoops; Cotsell pl. 31 fig. 1 shows six, three a side`);
        for (const h of hoops) {
          const t = Math.min(1, Math.abs(h.position.z) / (len / 2)), here = mid + (end - mid) * t, w = h.geometry.parameters.width;
          if (w < here || w > here * 1.25) { say(v.id, 'anchor stock hoop does not bind the stock', `hoop ${w.toFixed(3)} m across where the stock is ${here.toFixed(3)} m (${(w / here).toFixed(2)}x)`); break; }
        }
      }
    });

    /* ── A-ANCHOR-CLEAR (round 366): A CATTED BOWER STANDS OUTSIDE THE SHIP AND CLEAR OF THE SHROUDS."""),
])
print('ok')
