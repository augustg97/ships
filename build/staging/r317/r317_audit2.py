import sys
p = sys.argv[1]; s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]; s = s.replace(a, b)
rep("""          const rigs = new Set((H.masts || []).map(m => m.rig));
          const card = {};""",
"""          const rigs = new Set((H.masts || []).map(m => m.rig));
          /* r317 (0y¹⁵²): the sails bent on at stage 7 include a square mizzen's fore-and-aft sail,
             a lateen (lateenMizzen) or a gaff spanker (spanker); A-MIZZEN-SAIL checks each is built */
          const rigs7 = new Set(rigs), rigsF = new Set(rigs);
          if ((H.masts || []).some(m => m.rig === 'square' && m.lateenMizzen)) { rigs7.add('lateen'); rigsF.add('lateen'); }
          if ((H.masts || []).some(m => m.rig === 'square' && m.spanker)) rigs7.add('gaff');
          const card = {};""")
rep("""              for (const [rig, re] of Object.entries(RIGW)) claim(`the ${rig} rig`, re.test(card[st]), rigs.has(rig));""",
"""              for (const [rig, re] of Object.entries(RIGW)) claim(`the ${rig} rig`, re.test(card[st]), (st === 7 ? rigs7 : rigs).has(rig));""")
rep("""            for (const [rig, re] of Object.entries(RIGF)) if (re.test(txt) !== rigs.has(rig))
              say(v.id, 'a furled card that misnames her rig', `the ${rig} rig is ${rigs.has(rig) ? 'carried and not named' : 'named and not carried'}: "${txt.slice(0, 140)}"`);""",
"""            for (const [rig, re] of Object.entries(RIGF)) if (re.test(txt) !== rigsF.has(rig))
              say(v.id, 'a furled card that misnames her rig', `the ${rig} rig is ${rigsF.has(rig) ? 'carried and not named' : 'named and not carried'}: "${txt.slice(0, 140)}"`);""")
open(p, 'w', encoding='utf8').write(s); print('ok')
