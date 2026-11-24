import json, sys, re
root = sys.argv[1]          # the web dir to edit (web/ or a copy)
aud = sys.argv[2]           # Research/audit-hulls.js
def sub(s, a, b, n=1):
    assert s.count(a) == n, (a[:80], s.count(a)); return s.replace(a, b)

# ── BUILDER ──────────────────────────────────────────────────────────────────────────────
p = root + '/js/hull.js'; s = open(p).read()
s = sub(s, """function mastLowerOf(mk, steelMain, footY) {
  if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))""",
"""/* ── r304: A GAFF MAST WITH A TOPMAST MAY BE RECORDED BY ITS TRUCK AND THE CAP'S SHARE OF IT ──
   Endurance's main and mizzen were drawn as single poles 33.5 and 26.8 m tall with the gaff
   hoisted to 0.86 of them. Hurley's beset broadside shows each as a thick lower mast stepping
   to a thin topmast about halfway up, level with the fore's top. A plate of this kind gives no
   lengths, only where along the mast the step stands, so the record states the truck over the
   deck (`truckM`) and the cap's height as a share of it (`capFrac`), and the stack is solved:
   the lower mast is truckM * capFrac, and the topmast, whose heel stands at 0.88 of the lower
   (the doubling, as on every fidded mast here), runs from there to the truck. Without capFrac a
   gaff topmast keeps the class 0.52 of the lower. */
function gaffTopmastOf(mk, lower) {
  return (mk.rig === 'gaff' && mk.topmast && mk.truckM !== undefined && mk.capFrac !== undefined)
    ? mk.truckM - 0.88 * lower : lower * 0.52;
}
function mastLowerOf(mk, steelMain, footY) {
  if (mk.rig === 'gaff' && mk.topmast && mk.truckM !== undefined && mk.capFrac !== undefined)
    return mk.truckM * mk.capFrac;
  if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))""")
s = sub(s, ": mk.rig === 'gaff' ? (mk.topmast ? [lower, lower * 0.52] : [lower])",
           ": mk.rig === 'gaff' ? (mk.topmast ? [lower, gaffTopmastOf(mk, lower)] : [lower])")
s = sub(s, """                     : (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM ' + mk.truckM + ' m deck to flag-button, the stack solved for it'""",
"""                     : (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM ' + mk.truckM + ' m deck to flag-button, the stack solved for it'
                     : (mk.truckM !== undefined && mk.rig === 'gaff' && mk.capFrac !== undefined) ? 'record: truckM ' + mk.truckM + ' m deck to truck, the cap at the plate-read ' + mk.capFrac + ' of it'""")
s = sub(s, "lower: (mk.heightM !== undefined || mk.truckWLM !== undefined) ? 'record' : 'beam', truckM: mk.truckM,",
           "lower: (mk.heightM !== undefined || mk.truckWLM !== undefined || mk.truckM !== undefined) ? 'record' : 'beam', truckM: mk.truckM,")
open(p, 'w').write(s)

# ── AUDIT ────────────────────────────────────────────────────────────────────────────────
s = open(aud).read()
s = sub(s, """    const lowerOf = mk => {
      if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))""",
"""    const lowerOf = mk => {
      if (mk.rig === 'gaff' && mk.topmast && mk.truckM !== undefined && mk.capFrac !== undefined)
        return mk.truckM * mk.capFrac;                       // r304, hull.js mastLowerOf
      if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))""")
s = sub(s, "const wantRecord = (mk.truckM !== undefined && mk.rig === 'square') ||",
           "const wantRecord = (mk.truckM !== undefined && (mk.rig === 'square' || (mk.rig === 'gaff' && mk.capFrac !== undefined))) ||")
s = sub(s, """    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99) ─────────────────────────────""",
"""    /* ── A-GAFF-TOPMAST (round 304, Endurance): A GAFF MAST RECORDED WITH A TOPMAST IS BUILT AS ONE ──
       Endurance's main and mizzen stood as single poles while the beset broadside shows each as a
       thick lower mast stepping to a thin topmast about halfway up. The record now gives the truck
       over the deck (truckM) and the cap's share of it (capFrac), read off the plate. (1) RECORD: a
       gaff mast with capFrac carries topmast, truckM, capFrac in 0.3..0.9, and a capRead whose
       over-deck pixel heights give capFrac within 0.02, with a provenance. (2) BUILT: the mast's
       segment meshes (userData.seg) number two; segment 0's head stands at truckM*capFrac over its
       foot within 0.1 m; the last segment's head at truckM within 0.1 m; the topmast's heel inside
       the lower mast's head (a doubling, not a gap); and the gaff's throat (the mast top marked
       gaff in __mastTops is the truck; the throat is read from the gaff spar's lowest vertex) under
       the cap. SILENCE: a gaff mast with truckM and no capFrac, which the builder cannot solve. */
    (H.masts || []).forEach((mk, i) => {
      if (mk.rig !== 'gaff') return;
      if (mk.truckM !== undefined && mk.capFrac === undefined)
        { say(v.id, 'a gaff truck with no cap share', `mast ${i}: truckM ${mk.truckM} and no capFrac`); return; }
      if (mk.capFrac === undefined) return;
      if (!mk.topmast || !(mk.capFrac >= 0.3 && mk.capFrac <= 0.9))
        say(v.id, 'a gaff cap share out of its domain', `mast ${i}: topmast ${mk.topmast}, capFrac ${mk.capFrac}`);
      const CR = mk.capRead;
      if (!CR || !(CR.provenance && CR.provenance.length > 20) || !(CR.capOverDeckPx > 0 && CR.truckOverDeckPx > 0))
        say(v.id, 'a gaff cap share with no plate read', `mast ${i}: capRead absent or incomplete`);
      else if (Math.abs(CR.capOverDeckPx / CR.truckOverDeckPx - mk.capFrac) > 0.02)
        say(v.id, "a gaff cap share off its plate read", `mast ${i}: read ${(CR.capOverDeckPx / CR.truckOverDeckPx).toFixed(3)}, record ${mk.capFrac}`);
      const segsB = [];
      g.traverse(o => { const sg = o.isMesh && o.userData.seg; if (sg && sg.mi === i) segsB[sg.si] = sg; });
      if (segsB.length !== 2 || !segsB[0] || !segsB[1])
        { say(v.id, 'a recorded gaff topmast not built', `mast ${i}: ${segsB.filter(Boolean).length} segment(s) built, want lower + topmast`); return; }
      const foot = segsB[0].footY, cap = segsB[0].headY, truck = segsB[1].headY;
      if (Math.abs((cap - foot) - mk.truckM * mk.capFrac) > 0.1)
        say(v.id, 'a gaff lower mast off its cap share', `mast ${i}: cap ${(cap - foot).toFixed(2)} m over its foot, record ${(mk.truckM * mk.capFrac).toFixed(2)}`);
      if (Math.abs((truck - foot) - mk.truckM) > 0.1)
        say(v.id, 'a gaff topmast off its recorded truck', `mast ${i}: truck ${(truck - foot).toFixed(2)} m over its foot, record ${mk.truckM}`);
      if (!(segsB[1].footY < cap - 0.3 && segsB[1].footY > foot + (cap - foot) * 0.7))
        say(v.id, 'a gaff topmast heel outside the doubling', `mast ${i}: heel ${(segsB[1].footY - foot).toFixed(2)} m, cap ${(cap - foot).toFixed(2)} m`);
      let throat = Infinity;
      g.traverse(o => { const t = o.isMesh && tagOf(o); if (!t || t.key !== 'yard' || t.name !== 'Gaff') return;
        const b2 = new THREE.Box3().setFromObject(o);
        if (Math.abs(b2.min.x - segsB[0].headX) < (H.beam || 8) * 0.6 && b2.min.y > foot) throat = Math.min(throat, b2.min.y); });
      if (throat < Infinity && throat > cap)
        say(v.id, 'a gaff hoisted above its lower masthead', `mast ${i}: gaff's lowest point ${(throat - foot).toFixed(2)} m over the foot, cap ${(cap - foot).toFixed(2)} m`);
    });

    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99) ─────────────────────────────""")
open(aud, 'w').write(s)
print('builder and audit edited')
