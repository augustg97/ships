"""r333 (0y175, 0y173): the fluyt's main at Hollar's share of the fore-to-mizzen span; her lateen yard read off Hollar.
usage: r333_edit.py <dir holding js/hull.js, data/vessels.json, audit-hulls.js>   (every replace asserted)"""
import json, sys, math
D = sys.argv[1]
fit = json.load(open('/Users/augustgweon/Ships/build/staging/r333/yardfit.json'))
s, i0 = fit['slope'], fit['icpt']
col = lambda r: s * r + i0
PEAK_R, HEEL_R = 486, 880
peak = [round(col(PEAK_R), 1), PEAK_R]; heel = [round(col(HEEL_R), 1), HEEL_R]
MAIN, MIZ, FORE = [1143, 933], [1501, 868], 724
sp = abs(MAIN[0] - MIZ[0])
yl = math.hypot(peak[0] - heel[0], peak[1] - heel[1])
ang = round(math.degrees(math.atan2(abs(heel[1] - peak[1]), abs(heel[0] - peak[0]))), 2)
yard = round(yl / sp, 3); heelAhead = round((heel[0] - MIZ[0]) / (MAIN[0] - MIZ[0]), 3)
share = (MAIN[0] - FORE) / (MIZ[0] - FORE)
print('peak', peak, 'heel', heel, 'yard', yard, 'heelAhead', heelAhead, 'angle', ang, 'mainShare', round(share, 4))

# ── record ──
p = f'{D}/data/vessels.json'; d = json.load(open(p))
v = [x for x in d['vessels'] if x['id'] == 'fluyt'][0]; ms = v['hull']['masts']
assert ms[1]['at'] == 0.556 and ms[2]['rig'] == 'lateen'
# the loft's deck line is x(u) = (u - 0.5) lwl + rake(u), and rake is 0 between forefoot 0.28 and 1 - run 0.72
L = v['hull']['lwl']; xF = (ms[0]['at'] - 0.5) * L; xM = -11.499 + 0   # xF checked against the probe below
xFore, xMiz = -11.499, 10.029       # probe-before.json: stX of the fore and the mizzen (the fore lies in the forefoot)
xMain = xFore + share * (xMiz - xFore)
newAt = round(0.5 + xMain / L, 4)
assert 0.28 < newAt < 0.72
ms[1]['at'] = newAt
ms[1]['atProvenance'] = (
  f"PLATE READ, r333 (0y¹⁷⁵): the main stands {share:.4f} of the way from the fore mast's foot to the mizzen's. Read off Wenceslaus Hollar, "
  "'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - A Flute (State 2).jpg, the 1920 px "
  "thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m at the masts): the fore's axis meets the deck at column 724, the main's at "
  "column 1143 and the mizzen's at column 1501, the same feet r329 read for the mast heights (mastHeightsRead.foot and feetPx). "
  f"(1143 - 724) / (1501 - 724) = {share:.4f}. The fore and the mizzen keep their stations, so the span the heights are shares of is unchanged "
  f"(21.53 m); the main's foot is placed {share:.4f} of it abaft the fore's, through the loft's deck line x(u) = (u - 0.5) lwl + rake(u), "
  f"which is flat at the main, so at = {newAt}. A 3 px read of a foot is 0.004 of the span. Until r333 the main stood at 0.556, the class "
  "station, which put it 0.606 of the span abaft the fore, 1.32 m aft of the plate's. Hollar draws the ship a little from forward of the beam; "
  "a nearer bow is drawn larger, which would make the plate's share too large, not too small, so the main may stand slightly further forward "
  "still. The fore's and the mizzen's stations along the hull are not read: they are class figures (0y¹⁷⁹).")
for m in ms:
  pv = m['mastHeightsProvenance']
  a = ("CONTESTED datum: the plate's own spacing of the main between the fore and the mizzen (0.539 of the span) differs from this hull's "
       "stations (0.606), and Hollar draws the ship a little from forward of the beam")
  assert pv.count(a) == 1, pv[-600:]
  m['mastHeightsProvenance'] = pv.replace(a, "CONTESTED datum: Hollar draws the ship a little from forward of the beam")
  m['mastHeightsProvenance'] += (" Until r333 the hull's stations put the main 0.606 of the way from the fore to the mizzen, where the plate "
                                 "draws it at 0.539; since r333 it stands at the plate's share (masts[1].atProvenance).")
mz = ms[2]
mz['lateenRead'] = {
  "angleDeg": ang, "topAtOfLower": 0.9, "boundPm": 0.03, "boundAngleDeg": 1.0,
  "rows": {"mizzenFoot": MIZ, "mainFoot": MAIN, "peak": peak, "heel": heel},
  "fit": {"slope": round(s, 5), "icpt": round(i0, 2), "rmsPx": round(fit['rms'], 2), "n": fit['n'], "rows": [500, 869]},
  "plate": "build/staging/r328/dl/hollar-flute.jpg (Hollar 1647, 1920 px Commons thumbnail, bow at the left)",
  "script": "build/staging/r333/r333_read.py (yardfit.json); crops heel.png, peak.png, aft.png",
  "yardOfMastSpacing": yard, "heelAheadOfMastSpacing": heelAhead, "mastSpacingPx": sp,
}
mz['lateenYardProvenance'] = (
  f"PLATE READ, r333 (0y¹⁷³): the mizzen lateen yard lies at {ang}° from the horizontal, is {yard} times the horizontal distance between "
  f"the main and mizzen masts' feet, and has its heel {heelAhead} of that distance before the mizzen. Read off this hull's own plate, Wenceslaus "
  "Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - A Flute (State 2).jpg, the "
  "1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m at the masts). The yard's line was traced on every third row from "
  f"500 to 869, the darkest run within 8 px of a first guess on each row, and fitted as a line on {fit['n']} rows (rms {fit['rms']:.2f} px). Its "
  f"peak is at row 486, where the spar ends over the poop in a forked tip, column {peak[0]}; its heel at row 880, where the sail's tack curls "
  f"round it just above the poop rail, column {heel[0]}. The main's axis meets the deck at column 1143 and the mizzen's at column 1501 (r329's "
  f"feet), {sp} px apart; the yard is {yl:.1f} px. A 5 px error at either end is 0.014 of the spacing; the bound on each share is 0.03 and "
  "on the angle 1°. The shares are of the main-to-mizzen spacing, which since r333 is the plate's own (the main's atProvenance), so the "
  "built yard is the plate's yard at the plate's scale. Until r333 this yard was Vasa's (Hocker 2023, p. 31: 42.1°, 1.576 of the spacing, the "
  "heel 0.531 before the mizzen), a 1628 warship's read applied to a fluyt; Hollar's fluyt peaks her yard 15.6° steeper and shorter, and its "
  "peak stands over the poop 2.8 m above the mizzen top on the plate and 3.5 m above it as built (the built heel stands 0.6 m higher than the plate's, on a deck without Hollar's rise of sheer aft, 0y¹⁷⁵), where Vasa's shares put it 1.5 m above the top. Hollar draws the ship a little from "
  "forward of the beam, which shortens fore-and-aft lengths against heights; at 15° off the beam the true angle would be 0.8° flatter. "
  "The clew is still the class 0.62 of the yard abaft the tack.")
open(p, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')

# ── audit ──
p = f'{D}/audit-hulls.js'; a = open(p).read()
def rep(old, new):
  global a; assert a.count(old) == 1, old[:120]; a = a.replace(old, new)
rep("""        const R = rd.rows, sp = R.mainFoot[0] - R.mizzenFoot[0];
        const yl = Math.hypot(R.heel[0] - R.peak[0], R.heel[1] - R.peak[1]);
        const ang = Math.atan2(R.heel[1] - R.peak[1], R.heel[0] - R.peak[0]) * 180 / Math.PI;""",
"""        /* r333: Hollar's plate has the bow at the left and Vasa's at the right, so the spacing is taken as a magnitude, the
           heel's share is signed toward the main, and the angle is read off the magnitudes of the two legs */
        const R = rd.rows, sp = Math.abs(R.mainFoot[0] - R.mizzenFoot[0]), spS = R.mainFoot[0] - R.mizzenFoot[0];
        const yl = Math.hypot(R.heel[0] - R.peak[0], R.heel[1] - R.peak[1]);
        const ang = Math.atan2(Math.abs(R.heel[1] - R.peak[1]), Math.abs(R.heel[0] - R.peak[0])) * 180 / Math.PI;""")
rep("""const dRows = [Math.abs(yl / sp - rd.yardOfMastSpacing), Math.abs((R.heel[0] - R.mizzenFoot[0]) / sp - rd.heelAheadOfMastSpacing)];""",
    """const dRows = [Math.abs(yl / sp - rd.yardOfMastSpacing), Math.abs((R.heel[0] - R.mizzenFoot[0]) / spS - rd.heelAheadOfMastSpacing)];""")
rep("""`${at}: rows give yard ${(yl / sp).toFixed(3)}, heel ${((R.heel[0] - R.mizzenFoot[0]) / sp).toFixed(3)} of the spacing""",
    """`${at}: rows give yard ${(yl / sp).toFixed(3)}, heel ${((R.heel[0] - R.mizzenFoot[0]) / spS).toFixed(3)} of the spacing""")
rep("""          for (const k of Object.keys(MH)) if (sh[k] === undefined)
            say(v.id, 'mast heights off their read', `${at}: ${k} ${MH[k]} m recorded with no share read for it`);
        });""",
"""          for (const k of Object.keys(MH)) if (sh[k] === undefined)
            say(v.id, 'mast heights off their read', `${at}: ${k} ${MH[k]} m recorded with no share read for it`);
          /* ── A-STATION-SHARE (round 333, 0y¹⁷⁵): A MAST WHOSE HEIGHTS ARE READ AS SHARES OF THE FORE-TO-MIZZEN SPAN STANDS
             WHERE THE SAME PLATE PUTS IT IN THAT SPAN. Every mastHeightsRead names the plate column of the mast's own foot
             (foot[0]) and of the fore's and the mizzen's (feetPx), so the read already says where the mast stands between the
             two. The fluyt's main stood at the class station 0.556, 0.606 of the span abaft the fore, while Hollar's plate,
             the same one its heights were read from, draws it at 0.539: 1.32 m aft. BUILT: the mast's station on the loft's
             deck line, as a share of the built fore-to-mizzen span, agrees with (foot[0] - feetPx[0]) / (feetPx[1] - feetPx[0])
             within rd.boundStation (default 0.01; a 3 px read on a 777 px span is 0.004): 'a mast station off its own plate'.
             A mast that answers otherwise must say so: an atProvenance opening CONTESTED excuses it, and the excuse is the
             record's, not the rule's. */
          {
            const shP = (rd.foot[0] - rd.feetPx[0]) / (rd.feetPx[1] - rd.feetPx[0]);
            const shB = (stX(mk.at) - stX(Math.min(...ats))) / spB, bS = rd.boundStation || 0.01;
            if (Math.abs(shB - shP) > bS && !/^CONTESTED/.test(mk.atProvenance || ''))
              say(v.id, 'a mast station off its own plate', `${at}: built ${shB.toFixed(4)} of the fore-to-mizzen span; the plate its heights were read off puts the foot at column ${rd.foot[0]}, ${shP.toFixed(4)} of the span (${((shB - shP) * spB).toFixed(2)} m off, ${bS} allowed)`);
          }
        });""")
open(p, 'w').write(a)

# ── builder: the comment only (the yard is keyed to the stations, and the fluyt's now carries her own plate's read) ──
p = f'{D}/js/hull.js'; h = open(p).read()
old = """         Since r322 the East Indiaman's and the slave ship's masts take Vasa's heights as well
         (mastHeightsM, keyed to the same stations), and the crossing comes out at 0.743 and 0.749. */"""
assert h.count(old) == 1
h = h.replace(old, """         Since r322 the East Indiaman's and the slave ship's masts take Vasa's heights as well
         (mastHeightsM, keyed to the same stations), and the crossing comes out at 0.743 and 0.749.
         Since r333 the fluyt's lateenRead is her own plate's (Hollar 1647: 57.7°, 1.30 of the
         spacing), and her main stands at that plate's station, so the spacing is the plate's too. */""")
open(p, 'w').write(h)
print('edited', D, 'main at', newAt)
