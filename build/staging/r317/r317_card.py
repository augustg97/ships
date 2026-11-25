import sys
p = sys.argv[1]; s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]; s = s.replace(a, b)
rep("""    if (H.headsails) parts7.push(H.headsails === 1 ? 'a headsail on a stay forward'
                                                   : swNum(H.headsails) + ' headsails on the stays forward');
    let t = 'The sails are bent on: ' + swAnd(parts7) + '.';""",
"""    /* r317 (0y¹⁵²): a square mizzen's fore-and-aft sail, from the record. The card said "square
       sails on all three masts" on the 74, the clipper and Preussen, which set a spanker there, and
       on the East Indiaman and the slave ship, which now set a lateen under the mizzen topsail. */
    const aft = n === 3 ? 'the mizzen' : 'the aftermost mast';
    if ((H.masts || []).some(m => m.rig === 'square' && m.lateenMizzen)) parts7.push('a lateen sail on ' + aft + ' under its topsail');
    if ((H.masts || []).some(m => m.rig === 'square' && m.spanker)) parts7.push('a gaff spanker on ' + aft);
    if (H.headsails) parts7.push(H.headsails === 1 ? 'a headsail on a stay forward'
                                                   : swNum(H.headsails) + ' headsails on the stays forward');
    let t = 'The sails are bent on: ' + swAnd(parts7) + '.';""")
rep("""  if (rigs.has('lateen')) how.push('each lateen yard is lowered and its sail furled along it');""",
"""  /* r317: the builder keeps a lateen yard aloft and brails the cloth up to it (r260); the card had
     said the yard is lowered */
  if (rigs.has('lateen')) how.push('each lateen sail is brailed up and furled along its yard, which stays aloft');
  if (((spec.hull || {}).masts || []).some(m => m.rig === 'square' && m.lateenMizzen))
    how.push('the mizzen\\u2019s lateen sail is brailed up and furled along its yard, which stays aloft');""")
open(p, 'w', encoding='utf8').write(s); print('ok')
