import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:70]; s = s.replace(old, new)
rep("""              what: 'Cantilevered out at the after corners, where the hull has narrowed to nothing '
                  + 'and there is no side left to put a window in. Light and air for the officers '
                  + '— and the ship\\'s only private necessary house.' },""",
"""              what: 'A bay built out on the side at each after corner of the stern, with its own windows. '
                  + 'It carried the cabins across the stern round the corner, and it held the officers\\' privies.' },""")
rep("""  for (const sh of shells) g.add(tag(loft(sh.rows, sh.caps, body), 'gallery'));""",
"""  const txt = `Two storeys of lights built out ${P.toFixed(2)} m from the side (the class's figure; Steel's table does not give it). `
    + `The lower storey's rim runs ${storeys[0].rimM.toFixed(2)} m forward from the corner of the stern`
    + (storeys[1] ? `, the upper's ${storeys[1].rimM.toFixed(2)} m` : '') + `, and its lights are `
    + storeys.map(st => `${st.lightH.toFixed(2)} by ${st.lightW.toFixed(2)} m`).join(' and ')
    + ` (Steel, 1805, Folio LI). A carved drop hangs under the lower storey to the upper counter.`;
  for (const sh of shells) { const m = loft(sh.rows, sh.caps, body); m.userData.galleryStorey = sh.storey;
    g.add(tag(m, 'gallery', 'Quarter gallery', txt)); }""")
open(p, 'w').write(s); print('ok')
