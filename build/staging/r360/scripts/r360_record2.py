# r360: move the carriage record to the hull (it serves the upper tier and the quarterdeck)
import sys, json
p = sys.argv[1]; raw = open(p).read(); D = json.loads(raw)
v = [x for x in D['vessels'] if x.get('id') == 'ship-of-the-line'][0]; h = v['hull']
I = h['islands']; qd = {i['name']: i for i in I['list']}['Quarterdeck']
prov = qd['ports'].pop('carriageProvenance'); qd['ports'].pop('carriage')
prov = prov.replace("The model takes the gun's axis at the port's centre and builds the carriage down from it to the quarterdeck.",
  "The model takes the gun's axis at the port's centre and builds the carriage down from it to the deck it stands on. It is drawn for every gun whose axis stands over the weather deck: the quarterdeck's fourteen and the upper tier's, which stand 0.9 m over the upper deck and are seen inboard in the waist and under the islands' edges. The lower tier is under the upper deck and takes none.")
assert "builds the carriage down from it to the deck it stands on" in prov
qd['portsProvenance'] = qd['portsProvenance'].replace("on a truck carriage (carriageProvenance).", "on a truck carriage (hull.gunCarriage).")
dec = json.JSONDecoder(); i0 = raw.index('"id": "ship-of-the-line"')
k = raw.index('"islands": ', i0) + len('islands') + 4
_, end = dec.raw_decode(raw, k)
raw = raw[:k] + json.dumps(I, ensure_ascii=False) + raw[end:]
# the hull-level field, inserted before "islands"
gc = json.dumps({"paint": "red", "provenance": prov}, ensure_ascii=False)
k0 = raw.index('"islands": ', i0)
raw = raw[:k0] + '"gunCarriage": ' + gc + ',\n        ' + raw[k0:]
D2 = json.loads(raw); assert [x for x in D2['vessels'] if x['id'] == 'ship-of-the-line'][0]['hull']['gunCarriage']['paint'] == 'red'
open(p, 'w').write(raw); print('ok')
