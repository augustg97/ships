# r360: the quarterdeck guns' carriages (Falconer 1769, CANNON)
import sys, json
p = sys.argv[1]; raw = open(p).read(); D = json.loads(raw)
v = [x for x in D['vessels'] if x.get('id') == 'ship-of-the-line'][0]; h = v['hull']
I = h['islands']; qd = {i['name']: i for i in I['list']}['Quarterdeck']
assert 'carriage' not in qd['ports']
qd['ports']['carriage'] = {"paint": "red"}
qd['ports']['carriageProvenance'] = ("FORM per Falconer 1769 (CANNON, pl. VII figs. 16-17; build/staging/r172/falconer.txt): two cheeks joined by a transom and two axletrees on four solid trucks. "
  "The transom is two shot diameters high and one broad, over the fore axletree at the middle of the cheeks' height. The trucks are as broad as the cheeks. "
  "The cheeks' height and the trucks' diameter are set by the port's height over the deck. The model takes the gun's axis at the port's centre and builds the carriage down from it to the quarterdeck. "
  "The shot's diameter is taken as the breech's outer radius over 1.75. CLASS figures: the cheeks' three steps, the trucks' diameters (0.22 of the axis's height over the deck, the hind trucks 0.9 of the fore) and the carriage's length (from 0.06 m inside the barricade to 0.05 of the barrel's length short of the breech). "
  "PAINT red, CLASS: the capstan's reading off Bellona's model (capstanProvenance, red-ochre like the inner works); the plate does not resolve the quarterdeck's carriages. "
  "NOT DRAWN: the breechings, the gun tackles and their ring-bolts, the cap-squares.")
old = "GUNS: one in each port, the tier guns' barrel at three quarters of their length and bore."
assert qd['portsProvenance'].count(old) == 1
qd['portsProvenance'] = qd['portsProvenance'].replace(old, old + " From r360 each stands a third of its length outboard of the barricade, on a truck carriage (carriageProvenance).")
dec = json.JSONDecoder(); i0 = raw.index('"id": "ship-of-the-line"')
k = raw.index('"islands": ', i0) + len('islands') + 4
_, end = dec.raw_decode(raw, k)
raw = raw[:k] + json.dumps(I, ensure_ascii=False) + raw[end:]
json.loads(raw)
open(p, 'w').write(raw)
print('ok')
