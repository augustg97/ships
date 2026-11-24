#!/usr/bin/env python3
"""r308: the furled card's gaff clause follows each gaff mast's stowage; the audit checks it.
Usage: r308_card.py <shipwright.js> <audit-hulls.js>"""
import sys
sw, au = sys.argv[1], sys.argv[2]

def edit(p, pairs):
    s = open(p).read()
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f'{p}: anchor found {c} times: {old[:80]!r}'
        s = s.replace(old, new)
    open(p, 'w').write(s)
    print('ok', p)

edit(sw, [(
"""  if (rigs.has('gaff')) how.push('the gaff sails are lowered onto their booms');""",
"""  /* r308: a gaff sail stowed by its brails keeps its gaff aloft (gaffStow or furlStow
     'brailed'); only the others are lowered onto their booms */
  const gm = ((spec.hull || {}).masts || []).filter(m => m.rig === 'gaff');
  const gBr = gm.filter(m => m.gaffStow === 'brailed' || m.furlStow === 'brailed').length;
  if (gm.length && gBr === gm.length) how.push('the gaff sails are brailed in to their masts under gaffs left aloft');
  else if (gBr) how.push(`the gaff sails on ${gBr === 1 ? 'one mast are' : gBr + ' masts are'} brailed in to the mast with the gaff left aloft, and the others are lowered onto their booms`);
  else if (gm.length) how.push('the gaff sails are lowered onto their booms');""")])

edit(au, [(
"""              say(v.id, 'a furled card that misnames her rig', `the ${rig} rig is ${rigs.has(rig) ? 'carried and not named' : 'named and not carried'}: "${txt.slice(0, 140)}"`);""",
"""              say(v.id, 'a furled card that misnames her rig', `the ${rig} rig is ${rigs.has(rig) ? 'carried and not named' : 'named and not carried'}: "${txt.slice(0, 140)}"`);
            /* r308: the gaff clause says how each gaff mast's sail is stowed */
            const gmF = (H.masts || []).filter(m => m.rig === 'gaff');
            const nBr = gmF.filter(m => m.gaffStow === 'brailed' || m.furlStow === 'brailed').length;
            if (nBr && !/brailed/i.test(txt)) say(v.id, 'a furled card that lowers a brailed gaff', `${nBr} gaff mast(s) stow by brails and the card does not say so: "${txt.slice(0, 160)}"`);
            if (gmF.length > nBr && !/lowered onto their booms/i.test(txt)) say(v.id, 'a furled card that leaves a lowered gaff unsaid', `${gmF.length - nBr} gaff mast(s) lower the gaff onto the boom and the card does not say so: "${txt.slice(0, 160)}"`);
            if (gmF.length === nBr && /lowered onto their booms/i.test(txt)) say(v.id, 'a furled card that lowers a brailed gaff', `every gaff mast stows by brails and the card says the gaffs are lowered: "${txt.slice(0, 160)}"`);""")])
