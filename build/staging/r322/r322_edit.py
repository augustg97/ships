import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
rep("""   The record keeps the source's three heights, not the solved lengths, for the reason the truckM note
   above gives. */
function squareStackOf(mk, lower) {
  const MH = mk.mastHeightsM;
  if (mk.rig === 'square' && MH && MH.top > 0 && MH.crosstrees > MH.top && MH.truck > MH.crosstrees) {
    const top = MH.crosstrees - 0.88 * lower;
    return { top, tg: MH.truck - 0.88 * (lower + top), from: 'mastHeightsM' };
  }""", """   The record keeps the source's three heights, not the solved lengths, for the reason the truckM note
   above gives.
   r322 (0y¹⁶⁴): a mast built in two pieces (`only` 2: Vasa's mizzen, and the 1590-1620 hulls' mizzens that take
   its heights) records a top and crosstrees and no truck, because no topgallant mast is built on it; its topmast
   is solved the same way and the third piece, which is never drawn, keeps Steel's half. */
function squareStackOf(mk, lower) {
  const MH = mk.mastHeightsM;
  const twoPiece = mk.only === 2 && MH && MH.truck === undefined;
  if (mk.rig === 'square' && MH && MH.top > 0 && MH.crosstrees > MH.top && (MH.truck > MH.crosstrees || twoPiece)) {
    const top = MH.crosstrees - 0.88 * lower;
    return { top, tg: twoPiece ? top * 0.50 : MH.truck - 0.88 * (lower + top), from: 'mastHeightsM' };
  }""")
rep("""'record: mastHeightsM, top ' + mk.mastHeightsM.top + ', crosstrees ' + mk.mastHeightsM.crosstrees + ', truck ' + mk.mastHeightsM.truck + ' m over the deck, the stack solved for them'""",
    """'record: mastHeightsM, top ' + mk.mastHeightsM.top + ', crosstrees ' + mk.mastHeightsM.crosstrees + (mk.mastHeightsM.truck !== undefined ? ', truck ' + mk.mastHeightsM.truck : '') + ' m over the deck, the stack solved for them'""")
open(P, 'w').write(s); print('ok')
