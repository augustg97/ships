#!/usr/bin/env python3
"""r347: A-MAST-HEEL. usage: r347_edit_audit.py <audit-hulls.js>"""
import sys
p = sys.argv[1]
s = open(p).read()
OLD = """    yardRead(g, 'set');
    /* ── D-MAST-STEP (round 248)"""
assert s.count(OLD) == 1
NEW = """    yardRead(g, 'set');
    /* ── A-MAST-HEEL (round 347): A STEEL LENGTH IS HEEL TO HEAD. Steel's rule gives a mast's whole length,
       and the heel steps on the keelson, below the deck the mast is drawn on. Until r347 the builder stood
       the whole length on the deck, and the 74's main top stood 29.5 m over her upper deck against 22.0 m
       on Eckersberg's Asow. Every lower mast whose length comes from Steel's rule (no heightM, mastHeightsM,
       truckM or truckWLM in the record) must carry userData.step. Where the hull records mastStep, the
       lower's built span must be the Steel length less belowDeckM; where it does not, the step must say
       it is the class fallback, and the span is the whole Steel length. */
    {
      const steelLen = mk => !(mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0)
        && !(mk.rig === 'lateen' && mk.lateenTopmast && mk.lateenTopmast.topOfLower > 0 && mk.mastHeightsM && mk.mastHeightsM.top > 0)
        && !(mk.rig === 'gaff' && mk.topmast && mk.truckM !== undefined && mk.capFrac !== undefined)
        && !(mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))
        && !(mk.truckM !== undefined && mk.rig === 'square')
        && mk.heightM === undefined;
      const rec = H.mastStep && H.mastStep.belowDeckM > 0 ? H.mastStep.belowDeckM : 0;
      const seg0 = {};
      g.traverse(o => { if (o.isMesh && o.userData.seg && o.userData.seg.si === 0) seg0[o.userData.seg.mi] = o.userData; });
      (H.masts || []).forEach((mk, mi) => {
        const u = seg0[mi];
        if (!u || !steelLen(mk)) return;
        const whole = (mk.height || 0) * (H.lwl + H.beam) / 2, span = u.seg.headY - u.seg.footY;
        if (!u.step) { say(v.id, 'a Steel-length mast with no heel record', `mast ${mi}: its length comes from Steel's rule and its lower carries no userData.step`); return; }
        if (rec > 0) {
          if (Math.abs(u.step.belowDeckM - rec) > 0.005)
            say(v.id, 'a mast heel off the record', `mast ${mi}: step ${u.step.belowDeckM} m against the record's ${rec} m`);
          if (Math.abs(span - (whole - rec)) > 0.02)
            say(v.id, 'a Steel-length mast standing its whole length on the deck', `mast ${mi}: the lower stands ${span.toFixed(2)} m over the deck; Steel's ${whole.toFixed(2)} m less the ${rec} m step is ${(whole - rec).toFixed(2)} m`);
        } else {
          if (!/unknown \\(class fallback\\)/.test(u.step.from || ''))
            say(v.id, 'a mast heel with no record not labelled as the fallback', `mast ${mi}: step.from is '${u.step.from}'`);
          if (Math.abs(span - whole) > 0.02)
            say(v.id, 'a Steel-length mast cut short with no step record', `mast ${mi}: the lower stands ${span.toFixed(2)} m against Steel's ${whole.toFixed(2)} m`);
        }
      });
    }
    /* ── D-MAST-STEP (round 248)"""
s = s.replace(OLD, NEW)
open(p, 'w').write(s)
print('ok')
