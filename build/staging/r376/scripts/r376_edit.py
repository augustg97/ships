#!/usr/bin/env python3
"""r376: hawse-hole centres from Steel's half-breadth procedure (half the APRON, knight-head, hawse pieces),
the 74's centres corrected, the East Indiaman's holes recorded from Steel's 1257-ton column (era-extended).
Usage: r376_edit.py <webdir> <researchdir>   — every replacement asserted."""
import sys, re
W, R = sys.argv[1], sys.argv[2]

def sub(path, old, new, count=1):
    s = open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == count, f'{path}: anchor found {n} times, want {count}: {old[:80]!r}'
    s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

# ── hull.js ────────────────────────────────────────────────────────────────────────────
HJ = W + '/js/hull.js'
sub(HJ, """function hawseHoles(S, H) {
  const HW = S.hawse;
  if (!HW || !(HW.diaM > 0) || !Array.isArray(HW.centresM)) return { holes: [], aftU: 0 };""",
"""/* r376: the centres by Steel's own procedure (Book II, the half-breadth plan, djvu line 16513). The knight-head's
   fore edge stands half the APRON's siding off the middle line; the knight-head and the four hawse pieces are set
   off aft of it, each its tabled siding; the foremost hole is centred on the joint of the first and second piece,
   the other on the joint of the third and fourth. hull.hawse.sidingsM records the tabled sidings, so the record is
   the table and this is the derivation. r375 recorded finished centres from half the STEM, 2 in too far inboard on
   the 74; centresM is still read where no sidings are recorded. */
function hawseCentres(HW) {
  const s = HW && HW.sidingsM;
  if (s && s.apron > 0 && s.knightHead > 0 && Array.isArray(s.pieces) && s.pieces.length === 4) {
    const c1 = s.apron / 2 + s.knightHead + s.pieces[0];
    return [c1, c1 + s.pieces[1] + s.pieces[2]];
  }
  return Array.isArray(HW && HW.centresM) ? HW.centresM : [];
}
function hawseHoles(S, H) {
  const HW = S.hawse, CS = hawseCentres(HW);
  if (!HW || !(HW.diaM > 0) || !CS.length) return { holes: [], aftU: 0 };""")
sub(HJ, "  for (const c of HW.centresM) {\n    let u = 0.03,", "  for (const c of CS) {\n    let u = 0.03,")
sub(HJ, "  if (S.hawse && S.hawse.diaM > 0 && Array.isArray(S.hawse.centresM)) {",
        "  if (S.hawse && S.hawse.diaM > 0 && hawseCentres(S.hawse).length) {")
sub(HJ, """                  + 'anchors and the holes were closed from inside with plugs and blind bucklers.' },""",
"""                  + 'anchors and the holes were closed from inside with plugs and blind bucklers. The East '
                  + 'Indiaman\\'s holes are Steel\\'s for an East India ship of 1,257 tons: 15 inches across in a '
                  + 'pipe 1.25 inches thick. His table is of about 1805 and her hull is of 1620, so the size is '
                  + 'his and not a record of a ship of her own century.' },""")
sub(HJ, "window.SHIPS_HULL = { sideBands,", "window.SHIPS_HULL = { hawseCentres, sideBands,")

# ── vessels.json (inserted as text: a re-dump reformats other records) ─────────────────
VJ = W + '/data/vessels.json'
sub(VJ, '"centresM": [1.1557, 2.0447], "height": "lowerTierPort", "provenance": "RECORDED, r375.',
        '"sidingsM": {"apron": 0.7112, "knightHead": 0.3937, "pieces": [0.4572, 0.4445, 0.4445, 0.4572]}, "sourceYear": 1805, "height": "lowerTierPort", "provenance": "RECORDED, r375; the centres corrected in r376.')
sub(VJ, "So the hole centres stand 1 ft 0 in + 1 ft 3 1/2 in + 1 ft 6 in = 3 ft 9 1/2 in (1.156 m) and 3 ft 9 1/2 in + 2 ft 11 in = 6 ft 8 1/2 in (2.045 m) off the middle line.",
        "Book II sets off the knight-head from the APRON, not the stem (djvu line 16513): 'Take the siding of the apron, from the dimensions ... set off one-half of it parallel from the middle line ... which will represent the foremost edge of the knight head; from that set off the siding of the knight head ... the hawse pieces, which are four in number, may then be drawn, by setting off their sidings'. Folio II gives the 74's apron 'broad as the Stem, if the Rabbet is in the middle; otherwise' 2 ft 4 in (leaf 489, row Z). So the hole centres stand 1 ft 2 in + 1 ft 3 1/2 in + 1 ft 6 in = 3 ft 11 1/2 in (1.207 m) and 3 ft 11 1/2 in + 2 ft 11 in = 6 ft 10 1/2 in (2.096 m) off the middle line. r375 set off half the stem's 2 ft 0 in and stood both holes 2 in (5 cm) inboard of these. sidingsM records the tabled sidings; the model derives the centres from them (hawseCentres).")

IND = ('"hawse": {"diaM": 0.381, "pipeThickM": 0.03175, "clearM": 0.4318, '
       '"sidingsM": {"apron": 0.4064, "knightHead": 0.381, "pieces": [0.4318, 0.4318, 0.4318, 0.4318]}, '
       '"sourceYear": 1805, "height": "lowerTierPort", '
       '"era": "EXTENDED: Steel\'s table is of about 1805 and this hull is of 1620. Hawse-holes are attested on ships of her century (Vasa, 1628, has them), but their size on a 1620 Indiaman is not recorded here; these are Steel\'s figures carried back about 185 years.", '
       '"contested": "Steel\'s joint rule and his table disagree by 2 in for this column. The holes centred on the joints stand 2 ft 10 in apart, which leaves 1 ft 7 in between them; the table\'s distance from each other on a square is 1 ft 5 in (clearM). The model follows the joint rule, which is the method Book II gives; on the 74 the two agree exactly.", '
       '"provenance": "RECORDED from Steel, r376, ERA-EXTENDED (see era). Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), the East India Ships column of 1257 tons, the largest East India ship he tables (this vessel\'s card gives the British EIC ships 1,100 to 1,400 tons burden). Folio III (BookReader leaf 492, build/staging/r375/dl/leaf492.jpg; crops build/staging/r376/dl/l492-AD-ei.png and l492-EH-ei.png, about 40 px to an inch of type): hawse pieces sided 1 ft 5 in, 1 ft 5 in, 1 ft 5 in, 1 ft 5 in (rows A-D); holes in diameter, on a square, after the pipes are let in, 1 ft 3 in (E); to be in distance from each other on a square 1 ft 5 in (F); hawse pipes thick at the bottom 1 1/4 in (G); each to weigh about 4 cwt 2 qrs (H). Folio II (leaf 490, build/staging/r376/dl/leaf490.jpg): the stem sided at the head 1 ft 4 in (row P); the apron broad 1 ft 4 in (row Z); the knight-head timbers square at the head 1 ft 3 in (second row B); hawse pieces four on each side (second row F). By Book II\'s half-breadth procedure (djvu line 16513) the centres stand 8 in + 1 ft 3 in + 1 ft 5 in = 3 ft 4 in (1.016 m) and 3 ft 4 in + 2 ft 10 in = 6 ft 2 in (1.880 m) off the middle line. The HEIGHT is CLASS, the lower tier\'s port line at the hole\'s own station, as on the 74."}, ')
s = open(VJ, encoding='utf-8').read()
i0 = s.index('"id": "east-indiaman"'); i1 = s.index('"id": "ship-of-the-line"')
k = s.index('"steering": "stern",', i0)
assert i0 < k < i1, 'Indiaman steering anchor outside her record'
s = s[:k] + IND + s[k:]
open(VJ, 'w', encoding='utf-8').write(s)

# ── audit-hulls.js: A-HAWSE reads the derivation, and convicts an unstated disagreement or era gap ─
AJ = R + '/audit-hulls.js'
sub(AJ, """      const want = 2 * H.hawse.centresM.length;""",
"""      /* r376: the audit derives the centres from the tabled sidings itself (half the apron, the knight-head,
         the hawse pieces), so a builder that reads the sidings wrongly cannot agree with it. */
      const SD = H.hawse.sidingsM;
      const cents = SD ? [SD.apron / 2 + SD.knightHead + SD.pieces[0], SD.apron / 2 + SD.knightHead + SD.pieces[0] + SD.pieces[1] + SD.pieces[2]]
                       : (H.hawse.centresM || []);
      /* (e) r376: where the joint rule and the table's 'distance from each other' disagree by more than 1 cm, the record
         must say so in a contested field; (f) where the table is more than 50 years from the hull's year, the record
         must say so in an era field. The audit convicts silence, not the answer (r108). */
      if (SD && H.hawse.clearM > 0) {
        const clear = cents[1] - cents[0] - H.hawse.diaM;
        if (Math.abs(clear - H.hawse.clearM) > 0.01 && !H.hawse.contested)
          say(v.id, 'a hawse record whose joint rule and table disagree, unstated', `the joints leave ${clear.toFixed(3)} m between the holes, the table ${H.hawse.clearM} m, and the record has no contested field`);
      }
      if (H.hawse.sourceYear > 0 && H.year > 0 && Math.abs(H.hawse.sourceYear - H.year) > 50 && !H.hawse.era)
        say(v.id, 'a hawse record carried across an era, unstated', `source of ${H.hawse.sourceYear} on a hull of ${H.year}, and the record has no era field`);
      if (!(H.hawse.sourceYear > 0)) say(v.id, 'a hawse record with no source year', 'sourceYear is not recorded');
      const want = 2 * cents.length;""")
sub(AJ, """        if (!H.hawse.centresM.some(cm => Math.abs(cm - z) < 0.04)) say(v.id, 'a hawse-hole off its recorded half-breadth', `centre ${z.toFixed(3)} m off the middle line, recorded ${H.hawse.centresM.join(' and ')}`);""",
"""        if (!cents.some(cm => Math.abs(cm - z) < 0.02)) say(v.id, 'a hawse-hole off its recorded half-breadth', `centre ${z.toFixed(3)} m off the middle line, derived from the record ${cents.map(c => c.toFixed(3)).join(' and ')}`);""")
print('r376_edit: all replacements made')
