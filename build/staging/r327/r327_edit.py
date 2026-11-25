import json, sys, re
ROOT = '/Users/augustgweon/Ships/'
def rep(s, old, new, n=1):
    c = s.count(old)
    assert c == n, (c, old[:90])
    return s.replace(old, new)

# ── hull.js ─────────────────────────────────────────────────────────────────
p = ROOT + 'web/js/hull.js'
s = open(p, encoding='utf-8').read()
s = rep(s, "      if (FINE && mk.rig === 'square' && si === 0 && (S.year || 0) >= 1100) {\n        const topR = B * 0.20, headR = radii[0] * 0.7;",
"""      /* r327 (0y¹⁶⁹): THE GATE WAS A DATE, AND THE TOP IS A TRADITION'S FITTING. The year alone gave the
         sekibune of 1597 a walled European fighting top, her yard hung under its trestletrees. The Japanese
         mast carried none. A mast whose record says `top.form 'none'` draws no top here, and draws what its
         record names at the head instead (the semi, below). Every other square mast keeps the gate as it was. */
      const topNone = !!(mk.top && mk.top.form === 'none');
      if (FINE && mk.rig === 'square' && si === 0 && (S.year || 0) >= 1100 && !topNone) {
        const topR = B * 0.20, headR = radii[0] * 0.7;""")
anchor = "      /* ── THE JUNK MASTHEAD IS A SHEAVE THROUGH THE POLE ──────────────────────────────"
s = rep(s, anchor, """      /* ── THE SEMI: THE SHEAVE BLOCK AT THE HEAD OF A JAPANESE MAST (round 327, 0y¹⁶⁹) ──────────────
         The wasen mast carried no top. Its head carried the semi (蝉, "cicada"), a sheave block: the Minamichita
         wasen museum, "帆桁や伝馬船、碇に取り付けられた綱は帆柱上端の蝉（滑車）を通り" (the ropes on the yard,
         the boat and the anchor run through the semi, the sheave at the mast's upper end). The halyard runs from
         the yard's slings over this sheave and down to the deck; the rig's halyard already turns at the head
         (segHeads), so the block is drawn where the rope turns. The block's top face is the truck, as the
         karchesion's is. Its form and size are DERIVED from the pole: no Sengoku masthead survives, and the
         Busan scroll of 1593 draws the head in too few pixels to show a block. The semi is attested for the
         Edo wasen; on a ship drawn at 1597 it is inferred from the tradition, and the record says so. */
      if (FINE && si === 0 && topNone && mk.top.masthead === 'semi') {
        const hR = segR[0].b;                          // the pole at the head
        const sg3 = new THREE.Group();
        const blkH = hR * 3.6, blkD = hR * 2.8, blkW = hR * 2.3;
        /* the shell: two cheeks either side of the sheave, joined over and under it */
        const cheekW = (blkW - hR * 0.5) / 2;
        for (const zz of [1, -1]) {
          const ck = new THREE.Mesh(new THREE.BoxGeometry(blkD, blkH, cheekW), mastMat);
          ck.position.z = zz * (hR * 0.25 + cheekW / 2);
          sg3.add(ck);
        }
        for (const yy of [1, -1]) {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(blkD, hR * 0.55, hR * 0.5), mastMat);
          cap.position.y = yy * (blkH / 2 - hR * 0.275);
          sg3.add(cap);
        }
        /* the sheave in its slot, dark, fore and aft through the block, and the pin it turns on */
        const slotMat3 = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
          { color: 0x17120c, roughness: 0.95 }));
        const shv = new THREE.Mesh(new THREE.CylinderGeometry(blkH * 0.30, blkH * 0.30, hR * 0.46, 16), slotMat3);
        shv.rotation.x = Math.PI / 2;
        sg3.add(shv);
        const pin3 = new THREE.Mesh(new THREE.CylinderGeometry(hR * 0.22, hR * 0.22, blkW * 1.12, 8), slotMat3);
        pin3.rotation.x = Math.PI / 2;
        sg3.add(pin3);
        const hY = y + seg - blkH / 2;
        sg3.position.set(mxA(hY), hY, 0);
        sg3.rotation.z = -rakeRad;
        sg3.userData.mast = mi;
        sg3.userData.semi = { mast: mi, headY: +(y + seg).toFixed(3), blkH: +blkH.toFixed(3), poleR: +hR.toFixed(3),
                              from: 'derived from the pole (r327); the place is the record\\'s, the form the tradition\\'s' };
        group.add(tag(sg3, 'semi'));
      }

""" + anchor)
s = rep(s, "  deadeye:  { stage: 5, name: 'Deadeyes',",
"""  semi:     { stage: 4, name: 'Semi (masthead sheave block)',
              what: 'The sheave block at the head of a Japanese mast, called the semi, the cicada. '
                  + 'A Japanese mast carried no top. The halyard that hoists the yard runs up from '
                  + 'the yard, over the sheave in this block and down to the deck; on the Edo cargo '
                  + 'ships the lines that lifted the boat and the anchor ran through it too. No '
                  + 'Sengoku masthead survives, and the Busan scroll of 1593 draws this one too '
                  + 'small to show a block, so the block is drawn as the Edo ships carried it and '
                  + 'its form and size are derived from the pole.' },
  deadeye:  { stage: 5, name: 'Deadeyes',""")
open(p, 'w', encoding='utf-8').write(s)

# ── the record ──────────────────────────────────────────────────────────────
p = ROOT + 'web/data/vessels.json'
raw = open(p, encoding='utf-8').read()
d = json.loads(raw)
v = [x for x in d['vessels'] if x['id'] == 'sekibune'][0]
m = v['hull']['masts']
assert len(m) == 1 and 'top' not in m[0], m
m[0]['top'] = {
  'form': 'none',
  'masthead': 'semi',
  'provenance': (
    "RECORDED for the tradition, READ for the class. The wasen mast carried no top: the Minamichita wasen "
    "museum (minamichita-museum.com/wasen/ship.html) says the ropes on the yard, the boat and the anchor run "
    "through the semi, the sheave at the mast's upper end (帆柱上端の蝉（滑車）). The sekibune's own plate, the "
    "Busan boat-barrier scroll of 1593 (University of Tokyo; Commons File:Atakebune4.jpg, 2095 px across, about "
    "16 px/m at the ships), draws one rigged mast in the fleet, the atakebune's: the yard slung at the head, about "
    "17 px (about 1 m) of bare pole above it, stays running down from the head, and no platform. At that scale a "
    "block cannot be resolved. The semi is attested for the Edo wasen; on a sekibune of 1597 it is INFERRED "
    "from the tradition, and its form and size are derived from the pole (r327)."),
}
indent = 2 if raw.startswith('{\n  "') else None
out = json.dumps(d, indent=indent, ensure_ascii=False)
if raw.endswith('\n'): out += '\n'
open(p, 'w', encoding='utf-8').write(out)

# ── the audit ───────────────────────────────────────────────────────────────
p = ROOT + 'Research/audit-hulls.js'
a = open(p, encoding='utf-8').read()
a = rep(a, """    {
      const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
      const depYear = H.year || v.from || 0;
      let tops = 0;""",
"""    {
      /* r327 (0y¹⁶⁹): a mast whose record says it carries no top (`top.form 'none'`, the wasen mast) is not
         required to carry one; A-MASTHEAD-NONE below holds it to what its record names instead */
      const sq = (H.masts || []).filter(mm => mm.rig === 'square' && !(mm.top && mm.top.form === 'none')).length;
      const depYear = H.year || v.from || 0;
      let tops = 0;""")
anchor2 = "    /* ── THE ANCIENT MASTHEAD CARRIES ITS OWN GEAR (round 78) ──────────────────────────"
a = rep(a, anchor2, """    /* ── A-MASTHEAD-NONE (round 327, 0y¹⁶⁹): A MAST THAT CARRIES NO TOP CARRIES WHAT ITS RECORD NAMES ───────────
       The top was gated on the year alone, and the sekibune of 1597 drew a walled European fighting top with her
       yard hung under its trestletrees. The Japanese mast carried none: its head carried the semi, the sheave block
       the halyard runs over (Minamichita wasen museum). A mast's record may now say `top.form 'none'`. TESTS:
       a `top.form` the builder does not know convicts; a 'none' with no provenance convicts as silence; a top or
       crosstrees group on that mast (userData.mast, or topmastTop.mast) convicts; the fitting the record names at
       the head (`top.masthead`, 'semi') must be drawn on that mast, its top face within 5 cm of the mast's head,
       and a halyard must turn inside it (some halyard vertex inside the block's box, grown by 5 cm); a semi on a
       mast whose record does not name one convicts. */
    {
      const FORMS = ['none', 'basket'];
      const tops = [], semis = [], hals = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
        if (!o.isMesh && p.key === 'top') tops.push(o);
        if (!o.isMesh && p.key === 'semi') semis.push(o);
        if (o.isMesh && p.key === 'halyard') hals.push(o); });
      const Vh = new THREE.Vector3();
      (H.masts || []).forEach((mm, mi) => {
        const tp = mm.top;
        const mine = semis.filter(o => o.userData.mast === mi);
        if (tp && tp.form !== undefined && !FORMS.includes(tp.form))
          say(v.id, 'a top form the builder does not know', `masts[${mi}].top.form '${tp.form}'`);
        if (!(tp && tp.form === 'none')) {
          if (mine.length) say(v.id, 'a semi on a mast whose record names none', `masts[${mi}]: ${mine.length} semi groups`);
          return;
        }
        if (!(typeof tp.provenance === 'string' && tp.provenance.length > 40))
          say(v.id, 'a bare masthead with no source', `masts[${mi}].top.form 'none' carries no provenance`);
        const onIt = tops.filter(o => o.userData.mast === mi || (o.userData.topmastTop && o.userData.topmastTop.mast === mi));
        if (onIt.length)
          say(v.id, 'a top on a mast whose record says it carries none',
              `masts[${mi}]: ${onIt.map(o => o.userData.part.name).join(', ')}`);
        if (tp.masthead !== 'semi') {
          say(v.id, 'a bare masthead that names no fitting', `masts[${mi}].top.masthead is '${tp.masthead}'`);
          return;
        }
        if (mine.length !== 1) {
          say(v.id, 'a masthead fitting the record names and the drawing lacks', `masts[${mi}]: ${mine.length} semi groups, want 1`);
          return;
        }
        const sm = mine[0], bx = new THREE.Box3().setFromObject(sm), hd = sm.userData.semi;
        if (!hd || Math.abs(bx.max.y - hd.headY) > 0.05)
          say(v.id, 'a semi off the masthead',
              `masts[${mi}]: block top at ${bx.max.y.toFixed(2)} m, the head at ${hd ? hd.headY.toFixed(2) : '?'} m`);
        const grown = bx.clone().expandByScalar(0.05);
        let turns = false;
        for (const hm of hals) {
          const P = hm.geometry.attributes.position;
          for (let i = 0; i < P.count && !turns; i++) {
            Vh.fromBufferAttribute(P, i).applyMatrix4(hm.matrixWorld);
            if (grown.containsPoint(Vh)) turns = true;
          }
          if (turns) break;
        }
        if (!turns)
          say(v.id, 'a semi no halyard runs over',
              `masts[${mi}]: no halyard vertex inside the block (y ${bx.min.y.toFixed(2)}–${bx.max.y.toFixed(2)} m)`);
      });
    }

""" + anchor2)
open(p, 'w', encoding='utf-8').write(a)
print('edits applied')
