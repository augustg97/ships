# r359: the 74's quarterdeck ports (Steel Folio XLII) and the quarterdeck plank (Folios XLI, XLIII)
import sys, json
p = sys.argv[1]; raw = open(p).read(); D = json.loads(raw)
v = [x for x in D['vessels'] if x.get('id') == 'ship-of-the-line'][0]; h = v['hull']
I = h['islands']; Lst = {i['name']: i for i in I['list']}
qd = Lst['Quarterdeck']
assert 'ports' not in qd
IN = 0.0254
qd['ports'] = {"n": 7, "wM": round(33 * IN, 3), "hM": round(30 * IN, 3), "sillM": round(22 * IN, 3), "u": [0.458, 0.914], "capM": 0.05,
  "contested": "Steel's port head stands 1.32 m over the quarterdeck; the model's barricade is 1.30-1.34 m."}
qd['portsProvenance'] = ("RECORDED, r359. Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), "
  "Folio XLII, Quarter Deck continued, 74-gun column, read off the page scan (leaf 570, build/staging/r359/steel/leaf0570.jpg): gun ports, seven on each side, "
  "2 ft 9 in fore and aft and 2 ft 6 in deep (rows C-E); the height from the upper side of the plank to the port sills, 1 ft 10 in (row A). "
  "The same column gives no carronade ports on the quarterdeck of a 74 (row F). STATIONS: Steel gives the number and the size, not where the ports stand. "
  "The model spaces the seven centres evenly from u 0.458 to u 0.914: the first port's fore edge 1.0 m abaft the breast (u 0.43), the last port's after edge "
  "0.6 m before the quarter gallery's lower storey (x 23.13 m). This is a CLASS spacing; Bellona's model (SLR0338) shows open rails at this height and Asow's "
  "plate does not resolve the barricade's ports. HEAD (contested): the sill plus the depth puts the head 1.32 m over the quarterdeck; the barricade's top is "
  "Asow's reading (overSheerM), which leaves it 1.30-1.34 m over the deck at the ports. Each port is cut no higher than 0.05 m under the top (capM), the "
  "capping's depth, so the head stands 0.03-0.08 m lower than Steel's figure; the build reports the cut per port (clipM). GUNS: one in each port, the "
  "tier guns' barrel at three quarters of their length and bore. Steel's table does not name the quarterdeck's guns.")
old = "Each deck is that height plus its plank, 3 in, which is the upper deck's plank in the same table (row A): the quarterdeck's own plank was not found in Folios XXXII-XL, so the 3 in is ASSUMED."
assert I['provenance'].count(old) == 1
I['provenance'] = I['provenance'].replace(old, "Each deck is that height plus its plank, 3 in, which is the upper deck's plank in the same table (row A). For the quarterdeck the 3 in is RECORDED (r359): "
  "Folio XLI row L gives its plank 3 in thick under the beams' round-up (8 1/2 in), and Folio XLIII row Y gives the flat of the quarterdeck, of Prussian deal, 3 in thick "
  "(leaves 568 and 572, build/staging/r359/steel/). The forecastle's plank is still the upper deck's 3 in, ASSUMED. "
  "Folio XLII also gives a 74 a roundhouse (a poop): its beam 6 ft 6 in afore and 6 ft 8 in abaft over the quarterdeck's plank. r358 read Folio XXXII's blank roundhouse rows as 'no roundhouse'; they are blank because the roundhouse is measured from the quarterdeck, not from the upper deck.")
old2 = "NOT DRAWN: the gangways along each side of the waist joining the two decks (both plates show them), the poop over the after part of the quarterdeck (Bellona shows one from about u 0.63; Asow hides it), and the quarterdeck's and forecastle's guns."
assert I['provenance'].count(old2) == 1, I['provenance'][-900:]
I['provenance'] = I['provenance'].replace(old2, "NOT DRAWN: the gangways along each side of the waist joining the two decks (both plates show them), the poop over the after part of the quarterdeck (Bellona shows one from about u 0.63; Asow hides it; Steel gives its height, Folio XLII), and the forecastle's guns. The quarterdeck's ports and guns are drawn from r359 (Quarterdeck.ports).")
dec = json.JSONDecoder(); i0 = raw.index('"id": "ship-of-the-line"')
k = raw.index('"islands": ', i0) + len('islands') + 4
_, end = dec.raw_decode(raw, k)
raw = raw[:k] + json.dumps(I, ensure_ascii=False) + raw[end:]
json.loads(raw)
open(p, 'w').write(raw)
print('ok', qd['ports'])
