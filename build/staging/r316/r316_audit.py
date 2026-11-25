import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""          if (f.hoist === 'fixed' && Math.abs(o.position.y - (f.base + f.T * f.frac)) > 0.05)""",
    """          if (f.hoist === 'fixed' && f.from !== 'section' && Math.abs(o.position.y - (f.base + f.T * f.frac)) > 0.05)""")
anchor = """    /* ── A-YARD-LOWERED (round 314, 0y¹⁴⁶):"""
rule = """    /* ── A-YARD-SECTION (round 316, 0y¹⁵⁰): A DOUBLED RIG'S YARDS HANG FROM THE MAST'S OWN SECTIONS, AND NO SET
       HOISTING YARD STANDS INSIDE A DOUBLING. The plan's class fractions of the truck put the clipper's and the
       steamer's lower topsail yards 3.4 m under the lower cap they are fixed to, and their topgallants and
       Endurance's topsail and topgallant under the cap of the section below the one they ride. Read off the set
       build's meshes: the yard's height from its position, its radius from userData.slung, the caps from the
       mast's segment meshes (userData.seg). On a square mast with a `yards` list, two or more sections and no
       yard above the course read off a plate:
       (a) every yard above the course is hung from the sections ('section') — 'a doubled-rig yard hung at the
           plan's fraction';
       (b) a fixed yard (ltop, ltg) rests on the cap of section 0 or 1, its centre one radius plus 0.02 m over it
           (0.03) — 'a fixed yard off its cap';
       (c) the highest hoisting yard on each section stands at 0.88 of it, the segment rig's height (0.03) —
           'a set hoisting yard not atrip'.
       And on EVERY square mast, both rig paths: (d) a set hoisting yard that the record does not read off a
       plate stands at least 0.05 m clear over the cap of the section below the one it rides — 'a set hoisting
       yard inside the doubling'. */
    {
      const segBy = {}; g.traverse(o => { const sg = o.isMesh && o.userData.seg; if (sg) (segBy[sg.mi] = segBy[sg.mi] || [])[sg.si] = sg; });
      const yd = []; g.traverse(o => { if (o.isMesh && (o.userData.yardFrac || o.userData.lowered) && o.userData.slung) yd.push(o); });
      const HO = { utop: 1, top: 1, tg: 2, utg: 2, royal: 2 }, FX = { ltop: 0, ltg: 1 };
      (H.masts || []).forEach((mk, mi) => {
        if (mk.rig !== 'square') return;
        const sg = (segBy[mi] || []).filter(Boolean), last = sg.length - 1, at = `masts[${mi}] (station ${mk.at})`;
        const mine = yd.filter(o => (o.userData.yardFrac ? o.userData.yardFrac.mast : o.userData.lowered.mast) === mi);
        for (const o of mine) {
          const L = o.userData.lowered, f = o.userData.yardFrac;
          if (!L || L.lowered !== false || (f && f.from === 'record')) continue;
          const sc = Math.min(L.tie, last); if (sc < 1 || !sg[sc - 1]) continue;
          const R = o.userData.slung.yardR, clear = o.position.y - R - sg[sc - 1].headY;
          if (clear < 0.05)
            say(v.id, 'a set hoisting yard inside the doubling', `${at}, yard '${f ? f.name : 'tier ' + L.tie}': its spar's foot ${clear.toFixed(2)} m over the cap of section ${sc - 1} (${sg[sc - 1].headY.toFixed(2)}), under which a yard riding section ${sc} cannot travel`);
        }
        if (!Array.isArray(mk.yards) || last < 1) return;
        const rec = mk.yardFracs || {};
        if (Object.keys(rec).some(nm => nm !== 'course' && mk.yards.includes(nm))) return;
        const groups = {};
        for (const o of mine) {
          const f = o.userData.yardFrac; if (!f || f.name === 'course') continue;
          const tk = `${at}, yard '${f.name}'`, R = o.userData.slung.yardR, y = o.position.y;
          if (f.from !== 'section') { say(v.id, "a doubled-rig yard hung at the plan's fraction", `${tk}: drawn from '${f.from}' at ${f.frac} of the truck, y ${y.toFixed(2)}`); continue; }
          if (FX[f.name] !== undefined) { const k = FX[f.name]; if (k >= last) continue;
            const want = sg[k].headY + R + 0.02;
            if (Math.abs(y - want) > 0.03) say(v.id, 'a fixed yard off its cap', `${tk}: y ${y.toFixed(3)}, the cap of section ${k} at ${sg[k].headY.toFixed(3)} puts it at ${want.toFixed(3)}`);
          } else if (HO[f.name]) { const sc = Math.min(HO[f.name], last); (groups[sc] = groups[sc] || []).push(o); }
        }
        Object.keys(groups).forEach(k => { const sc = +k, top = groups[k].reduce((a, b) => b.position.y > a.position.y ? b : a);
          const want = sg[sc].headY - 0.12 * (sg[sc].headY - sg[sc].footY);
          if (Math.abs(top.position.y - want) > 0.03)
            say(v.id, 'a set hoisting yard not atrip', `${at}, yard '${top.userData.yardFrac.name}': y ${top.position.y.toFixed(3)}, 0.88 of section ${sc} is ${want.toFixed(3)}`); });
      });
    }
"""
rep(anchor, rule + anchor)
open(P, 'w').write(s); print('ok')
