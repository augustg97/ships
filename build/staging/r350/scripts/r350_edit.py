#!/usr/bin/env python3
"""r350: the 74's three topmast heads read off Eckersberg's Asow, in the record, the build and the card.
usage: r350_edit.py <web dir>   (run once, on r349's tree)"""
import sys, pathlib, json, re
W = pathlib.Path(sys.argv[1])
def rep(p, old, new):
    s = p.read_text(); assert s.count(old) == 1, (p, old[:90]); p.write_text(s.replace(old, new))

# ── the plate reads (1920 px thumb rows) and the model as built in r349 (probe-after.txt) ──
PLATE = "build/staging/r312/plates/asow.jpg (Commons Google Art Project file, 1920 px thumb, about 26-30 px/m aloft)"
reads = {
  # mast: (lowerCap, cap, crosstrees, model: lowerTopY, lowerHeadM, tmHeadM, crossY, tmCapY, tmLen, steel in/yd)
  'fore':   (1340, 978, 1040, 22.025, 4.050, 1.944, 36.767, 38.71, 17.51, 4),
  'main':   (1213, 776,  848, 24.296, 4.556, 2.187, 40.879, 43.07, 19.68, 4),
  'mizzen': (1283, 898,  962, 21.368, 3.123, 1.640, 35.969, 37.61, 16.93, 3.5),
}
how = {
  'fore': "the fore topgallant yard lies lowered on the topmast cap, its lower edge at row 978, and the topmast crosstrees stand at row 1040, under the dark mass of the men and gear on them; the lower cap is at row 1340, under the lowered topsail yard (r313)",
  'main': "the main topgallant yard lies lowered on the topmast cap, its lower edge at row 776 (r349), and the topmast crosstrees stand at row 848, with a man on them (r347); the lower cap is at row 1213 (r348)",
  'mizzen': "the mizzen topgallant yard lies lowered on the topmast cap, its lower edge at row 898, and the topmast crosstrees stand at row 962, with a man on them; the lower cap is at row 1283 (r313)",
}
recs = {}
for m, (lc, cap, ct, topY, lh, h, crossY, tmCap, L, steel) in reads.items():
    span = lc - ct; head = ct - cap; share = head / span
    bound = (6 + share * 8) / span                     # +/-6 px on the head, +/-8 px on the span
    drawnSpan = crossY - (topY + lh); drawn = h / drawnSpan
    T = tmCap - (topY + lh)                            # lower cap to topmast cap: fixed by the lower head, not by the topmast head
    hP = share * T / (1 + share); ipy = hP / L * 36
    ipyB = bound * T / (1 + share) ** 2 / L * 36
    verdict = 'agrees' if abs(drawn - share) <= bound else 'contested'
    prov = ("PLATE READ, r350" + (", CONTESTED" if verdict == 'contested' else "") + ". On Eckersberg's Asow (1828) " + how[m] + ". "
            f"The head, from the cap to the crosstrees, is {head} px +/- 6, which is {share:.3f} +/- {bound:.3f} of the span from the lower cap to the crosstrees. "
            f"The model draws Steel's {'3 1/2' if steel == 3.5 else '4'} inches to every yard of the topmast, a head of {h:.2f} m, which is {drawn:.3f} of the same span. "
            f"At the model's span the plate's head is {hP:.2f} m, or {ipy:.1f} +/- {ipyB:.1f} inches to every yard of the topmast. ")
    if verdict == 'agrees':
        prov += "That agrees with Steel's rule to within the plate's precision."
    else:
        prov += (f"The plate draws this head at the same share of its topmast as the fore and main heads, so it differs from Steel's figure by {hP - h:.2f} m. "
                 "The model keeps Steel's rule, which was written for the British 74 this hull is. Asow was a Russian ship of 1826, painted in 1828, and a painter may draw three heads alike. The figure is contested.")
    recs[m] = {"mast": m, "plate": PLATE, "plateName": "Eckersberg's *Asow* (1828)", "rows": {"lowerCap": lc, "cap": cap, "crosstrees": ct},
               "share": round(share, 3), "bound": round(bound, 3), "inPerYd": round(ipy, 1), "inPerYdBound": round(ipyB, 1),
               "verdict": verdict, "provenance": prov}
    print(m, f"plate {share:.3f}+/-{bound:.3f}  drawn {drawn:.3f}  head {hP:.2f} m = {ipy:.2f}+/-{ipyB:.2f} in/yd  -> {verdict}")

# ── the record: topmastHeadRead on each of the 74's masts, before its hoistProvenance ──
p = W / 'data' / 'vessels.json'
s = p.read_text()
i0 = s.index('"id": "ship-of-the-line"'); i1 = s.index('"id": ', i0 + 10)
seg = s[i0:i1]
ms = list(re.finditer(r'\n(\s*)"hoistProvenance"', seg)); assert len(ms) == 3, len(ms)
out = seg
for m, mt in reversed(list(zip(['fore', 'main', 'mizzen'], ms))):
    ind = mt.group(1)
    out = out[:mt.start()] + '\n' + ind + '"topmastHeadRead": ' + json.dumps(recs[m], ensure_ascii=False) + ',' + out[mt.start():]
p.write_text(s[:i0] + out + s[i1:])
V = json.loads(p.read_text())
v = [x for x in V['vessels'] if x['id'] == 'ship-of-the-line'][0]
assert [mk['topmastHeadRead']['mast'] for mk in v['hull']['masts']] == ['fore', 'main', 'mizzen']
assert [mk['at'] for mk in v['hull']['masts']] == [0.115, 0.556, 0.85]

# ── the builder: upperHeadsOf carries the read; the topmast's head record carries it; the loft lists them ──
H = W / 'js' / 'hull.js'
rep(H, """function upperHeadsOf(S, mk, top, tg) {
  const stepM = mastStepOf(S, mk);
  if (!(stepM > 0) || mk.rig !== 'square' || !(top > 0))
    return { tm: { cross: 0.97, heel: 0.88, headM: top * 0.12, inPerYd: null, from: 'class' },""",
"""function upperHeadsOf(S, mk, top, tg) {
  const stepM = mastStepOf(S, mk);
  /* r350: a plate read of this topmast's head, carried to the build so the audit and the card read the same thing.
     It does not move anything: where it disagrees with the rule beyond its bound, the record says 'contested'. */
  const R = mk.topmastHeadRead;
  const read = R ? { mast: R.mast, plateName: R.plateName, share: R.share, bound: R.bound, inPerYd: R.inPerYd,
                     inPerYdBound: R.inPerYdBound, verdict: R.verdict } : null;
  if (!(stepM > 0) || mk.rig !== 'square' || !(top > 0))
    return { tm: { cross: 0.97, heel: 0.88, headM: top * 0.12, inPerYd: null, from: 'class', read },""")
rep(H, """  return { tm: { cross: 1 - tmHead / top, heel: 1 - 1.2 * tmHead / top, headM: tmHead, inPerYd: tmRate, from: 'steel' },""",
       """  return { tm: { cross: 1 - tmHead / top, heel: 1 - 1.2 * tmHead / top, headM: tmHead, inPerYd: tmRate, from: 'steel', read },""")
rep(H, """                              : 'class: the crosstrees at 0.97 and the topgallant heel at 0.88 of the topmast' };""",
       """                              : 'class: the crosstrees at 0.97 and the topgallant heel at 0.88 of the topmast',
                            read: UH.tm.read };   // r350: a plate read of this head, where the record carries one (A-TOPMAST-HEAD-READ)""")
rep(H, """                        stepM: mastStepOf(S, mk) };   // r347""",
       """                        stepM: mastStepOf(S, mk),   // r347
                        /* r350: every plate read of a topmast head, mast by mast, as the build carries it, so the card
                           says what the plate agrees with and what it contests */
                        headReads: (() => { const byMi = {};
                          group.traverse(o => { const ud = o.isMesh && o.userData;
                            if (ud && ud.seg && ud.seg.si === 1 && ud.head && ud.head.read)
                              byMi[ud.seg.mi] = Object.assign({ mi: ud.seg.mi, ruleInPerYd: ud.head.inPerYd }, ud.head.read); });
                          return Object.keys(byMi).map(Number).sort((a, b) => a - b).map(k => byMi[k]); })() };""")

# ── the card: one sentence for what agrees, one for each contested head ──
SW = W / 'js' / 'shipwright.js'
rep(SW, """Each mast\\'s heel stands 1.2 of those heads under the cap of the mast below it, ' + H.n + ' segments in all'""",
        """Each mast\\'s heel stands 1.2 of those heads under the cap of the mast below it, ' + H.n + ' segments in all.' + swHeadReads(H.headReads)""")
rep(SW, """  const H = SW.ship && SW.ship.userData && SW.ship.userData.rigTruckHow;
  const rigRow =""",
"""  const H = SW.ship && SW.ship.userData && SW.ship.userData.rigTruckHow;
  /* r350: what a plate read of the topmast heads says against the rule, from the build's own head records */
  const inch = x => x === 3.5 ? '3 1/2' : String(x);
  const andList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const swHeadReads = R => {
    if (!R || !R.length) return '';
    const ok = R.filter(r => r.verdict === 'agrees').map(r => r.mast), bad = R.filter(r => r.verdict === 'contested');
    return (ok.length ? ' On ' + R[0].plateName + ', the ' + andList(ok) + ' topmast head' + (ok.length > 1 ? 's agree' : ' agrees')
                        + ' with Steel\\'s rule to within the plate\\'s precision.' : '')
      + bad.map(r => ' The ' + r.mast + ' topmast\\'s head there reads ' + r.inPerYd + ' ± ' + r.inPerYdBound
                     + ' inches to every yard, against Steel\\'s ' + inch(r.ruleInPerYd) + ', so the model\\'s ' + r.mast + ' topmast head is contested.').join('');
  };
  const rigRow =""")
print('r350_edit: ok')
