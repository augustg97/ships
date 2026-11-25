"""r332 (0y177): the fluyt's fore and main topgallant masts cross no yard under sail (Hollar 1647).
Edits the :8150 copies in webb/; every replace asserted. Re-runnable from the .before copies."""
import json, sys
W = 'webb/'
def rep(s, a, b, n=1):
    assert s.count(a) == n, (a[:80], s.count(a)); return s.replace(a, b)

# ── builder ──
h = open('hull.before.js').read()
h = rep(h, "    let lastYardTop = -Infinity;\n",
"""    let lastYardTop = -Infinity;
    /* r332 (0y¹⁷⁷): set when the record leaves a section above the last crossed yard without a yard at sea */
    let uncrossedAbove = false;
""")
h = rep(h, "        const hL = above ? above.yy : Math.min(capY, yd.yy + yd.half * 0.9);\n",
"""        /* r332: under a section the record leaves uncrossed at sea, the lift leads to the head of the yard's own section */
        const hL = above ? above.yy
          : (uncrossedAbove && yd.hoist && typeof yd.hoist === 'object' && segHeads[yd.hoist.tie] !== undefined) ? segHeads[yd.hoist.tie]
          : Math.min(capY, yd.yy + yd.half * 0.9);
""")
h = rep(h, "        crossYard(si === 0 ? y + seg * courseAt : hoistY, yardLen,\n",
"""        /* ── r332 (0y¹⁷⁷): A SECTION THE RECORD LEAVES WITHOUT A YARD AT SEA ─────────────────────────────
           Hollar's etching of a fluyt under sail (1647) draws the fore and main topgallant masts as bare poles
           above the topmasts' caps, each with a pennant, and crosses no yard on either. His plate of fluyts at
           anchor (the same year) draws topgallant yards crossed on the same masts, with the sails furled. The
           record lists such a section in `uncrossedAtSea` ('topmast' or 'topgallantMast'). The set build, which
           is the ship under sail, crosses no yard and sets no sail on it; the furled build crosses the yard and
           furls its sail, as every other furled yard. The pole and its stays are drawn in both. The segment's
           mesh records the omission (userData.uncrossed) so the audit can tell an omission from a missing yard.
           Without the field, byte-identical. */
        const secKey = si === 1 ? 'topmast' : si === 2 ? 'topgallantMast' : null;
        if (secKey && !FURLED && Array.isArray(mk.uncrossedAtSea) && mk.uncrossedAtSea.includes(secKey)) {
          uncrossedAbove = true;
          m.userData.uncrossed = { mast: mi, section: secKey, si, from: 'record' };
        } else
        crossYard(si === 0 ? y + seg * courseAt : hoistY, yardLen,
""")
open(W + 'js/hull.js', 'w').write(h)

# ── record ──
d = json.load(open('vessels.before.json'))
v = [x for x in d['vessels'] if x['id'] == 'fluyt'][0]
OLD_TAIL = "The yard stays at the class 0.88 of its section."
NEW_TAIL = ("Since r332 the yard is not crossed under sail (uncrossedAtSea). In the furled build it is crossed and "
            "its sail furled, as the plate at anchor draws it, and it is lowered onto the topmast's cap by the class rule of r314.")
PLATE = ("Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas "
         "Hollar - A Flute (State 2).jpg, read at the 1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m "
         "at the masts, bow at the left)")
PROV = {
 0: ("PLATE READ, r332 (0y¹⁷⁷): under sail the fore topgallant mast crosses no yard and sets no sail. Read off " + PLATE + ". "
     "Above the topmast's cap (row 285, column 693) the plate draws a bare pole up to row about 85, with a pennant flying from "
     "it between rows 90 and 350. No spar crosses the pole and no cloth hangs from it; the only lines that meet it are its stays "
     "and shrouds. The topsail below is set, and its head is the topsail yard at row 339.6. The crop is build/staging/r331/fore-upper.png. "
     "Hollar's plate of fluyts at anchor (1647, build/staging/r328/dl/fleuten-1647.jpg) draws topgallant yards crossed with the "
     "sails furled, so the yard belongs to the rig and was not crossed at sea on the ship Hollar drew under sail. The set build "
     "therefore crosses no topgallant yard on this mast, and the furled build crosses it with its sail furled. Until r332 the set "
     "build crossed the yard at the class 0.88 of the topgallant mast and set a topgallant sail on it, which no plate of this ship draws. "
     "Hollar's plate is dated 1647 and the hull 1620."),
 1: ("PLATE READ, r332 (0y¹⁷⁷): under sail the main topgallant mast crosses no yard and sets no sail. Read off " + PLATE + ". "
     "Above the topmast's cap (row 192, column 1176) the plate draws a bare pole up to row about 55, with a pennant flying from "
     "it between rows 60 and 400. No spar crosses the pole and no cloth hangs from it; the only lines that meet it are its stays "
     "and shrouds. The topsail below is set, and its head is the topsail yard at row 270.1. The crop is build/staging/r331/main-upper.png. "
     "Hollar's plate of fluyts at anchor (1647, build/staging/r328/dl/fleuten-1647.jpg) draws topgallant yards crossed with the "
     "sails furled, so the yard belongs to the rig and was not crossed at sea on the ship Hollar drew under sail. The set build "
     "therefore crosses no topgallant yard on this mast, and the furled build crosses it with its sail furled. Until r332 the set "
     "build crossed the yard at the class 0.88 of the topgallant mast and set a topgallant sail on it, which no plate of this ship draws. "
     "Hollar's plate is dated 1647 and the hull 1620."),
}
for mi in (0, 1):
    mk = v['hull']['masts'][mi]
    e = mk['hoistRead']['topgallantMast']
    assert e['unread'].endswith(OLD_TAIL); e['unread'] = e['unread'][:-len(OLD_TAIL)] + NEW_TAIL
    assert mk['hoistProvenance'].endswith(OLD_TAIL); mk['hoistProvenance'] = mk['hoistProvenance'][:-len(OLD_TAIL)] + NEW_TAIL
    assert 'uncrossedAtSea' not in mk
    mk['uncrossedAtSea'] = ['topgallantMast']
    mk['uncrossedAtSeaProvenance'] = PROV[mi]
raw = open('vessels.before.json').read()
open(W + 'data/vessels.json', 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')

# ── audit ──
a = open('audit-hulls.before.js').read()
a = rep(a, """        const mine = hoistM.filter(o => o.userData.hoistAt.mast === mi);
        if (mine.length !== keys.length) { say(v.id, 'a hoisting yard that does not say where it is set', `${at}: ${mine.length} hoisting yards record where they are set, ${keys.length} expected`); return; }
""", """        const mine = hoistM.filter(o => o.userData.hoistAt.mast === mi);
        /* r332: the set build crosses no yard on a section the record leaves uncrossed at sea (A-UNCROSSED-AT-SEA tests that) */
        const want = keys.filter(k => !(Array.isArray(mk.uncrossedAtSea) && mk.uncrossedAtSea.includes(k))).length;
        if (mine.length !== want) { say(v.id, 'a hoisting yard that does not say where it is set', `${at}: ${mine.length} hoisting yards record where they are set, ${want} expected`); return; }
""")
ANCH = "    /* ── A-TOPMAST-TOP (round 325, 0y¹⁶⁷)"
a = rep(a, ANCH, """    /* ── A-UNCROSSED-AT-SEA (round 332, 0y¹⁷⁷): A SECTION THE RECORD LEAVES WITHOUT A YARD AT SEA IS DRAWN SO, AND ONLY AT SEA.
       Hollar's fluyt under sail (1647) draws her fore and main topgallant masts as bare poles with pennants, and his
       fluyts at anchor cross topgallant yards with the sails furled. The record lists such a section in `uncrossedAtSea`.
       RECORD (on the set build): the list names sections the mast has ('topmast', and 'topgallantMast' on a three-piece
       square mast with no `yards` list), `uncrossedAtSeaProvenance` opens PLATE READ and says what the plate draws, and a
       listed section carries no set-height read (hoistRead.<section>.ofFootToHead), because a plate that shows no yard
       cannot read where one is set. BUILT: in the set build a listed section crosses no yard (no hoistAt for it) and its
       segment records the omission (userData.uncrossed); in the furled build it crosses its yard. A segment that records
       an omission the record does not list convicts in either build. */
    const uncrossedRead = (G, STATE) => {
      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const segM = [], yardM = [];
      G.traverse(o => { if (!o.isMesh) return; if (o.userData.seg) segM.push(o); if (o.userData.hoistAt) yardM.push(o); });
      (H.masts || []).forEach((mk, mi) => {
        const at = `masts[${mi}] (station ${mk.at})`, L = mk.uncrossedAtSea;
        const marks = segM.filter(o => o.userData.seg.mi === mi && o.userData.uncrossed);
        const listed = Array.isArray(L) ? L : [];
        marks.forEach(o => { if (!listed.includes(o.userData.uncrossed.section))
          say(v.id, 'a section left uncrossed with no record', `${at}${SB}: segment ${o.userData.seg.si} records ${o.userData.uncrossed.section} uncrossed and the record does not list it`); });
        if (L === undefined) return;
        if (STATE === 'set') {
          const tiers = mk.only || 3;
          const keys = mk.rig === 'square' && !Array.isArray(mk.yards) ? (tiers >= 3 ? ['topmast', 'topgallantMast'] : tiers >= 2 ? ['topmast'] : []) : [];
          if (!Array.isArray(L) || !L.length) say(v.id, 'an uncrossed list that names nothing', `${at}: uncrossedAtSea is ${JSON.stringify(L)}`);
          listed.forEach(k => { if (!keys.includes(k)) say(v.id, 'an uncrossed section the mast does not have', `${at}: uncrossedAtSea names '${k}'; the mast's hoisting sections are ${JSON.stringify(keys)}`); });
          const P = mk.uncrossedAtSeaProvenance || '';
          if (!/^PLATE READ/.test(P) || P.length < 120)
            say(v.id, 'an uncrossed section with no plate read', `${at}: uncrossedAtSeaProvenance opens '${P.slice(0, 30)}'; a section is left without a yard at sea only on a plate that draws it so`);
          listed.forEach(k => { const e = mk.hoistRead && mk.hoistRead[k];
            if (e && typeof e.ofFootToHead === 'number')
              say(v.id, 'a section read set and listed uncrossed', `${at} ${k}: hoistRead.${k} reads a set yard at ${e.ofFootToHead} and uncrossedAtSea says no yard is crossed at sea`); });
        }
        listed.forEach(k => {
          const yard = yardM.find(o => o.userData.hoistAt.mast === mi && o.userData.hoistAt.section === k);
          const mark = marks.find(o => o.userData.uncrossed.section === k);
          if (STATE === 'set') {
            if (yard) say(v.id, 'a section uncrossed at sea drawn crossed', `${at} ${k}: the record crosses no yard on it at sea and the set build crosses one at y ${yard.position.y.toFixed(2)}`);
            else if (!mark) say(v.id, 'an uncrossed section that does not say so', `${at} ${k}: no yard is crossed and no segment records the omission`);
          } else if (!yard) say(v.id, 'a section crossed at anchor drawn uncrossed', `${at} ${k}${SB}: the furled build crosses no yard on it; the record leaves it uncrossed at sea only`);
        });
      });
    };
    uncrossedRead(g, 'set');
""" + ANCH)
a = rep(a, "            crossjackRead(gf, 'furled');   // r315 (0y¹⁴⁹)\n",
        "            crossjackRead(gf, 'furled');   // r315 (0y¹⁴⁹)\n            uncrossedRead(gf, 'furled');   // r332 (0y¹⁷⁷)\n")
a = rep(a, """          const nh = m.yards ? m.yards.filter(nm => HOISTY[nm]).length
                   : Math.max(1, tiers - 1);
""", """          /* r332: a section the record leaves uncrossed at sea has no yard in the set build, and no tie */
          const nh = m.yards ? m.yards.filter(nm => HOISTY[nm]).length
                   : Math.max(1, tiers - 1) - (Array.isArray(m.uncrossedAtSea) ? m.uncrossedAtSea.length : 0);
""")
open(W + 'audit-hulls.js', 'w').write(a)
print('EDIT OK')
