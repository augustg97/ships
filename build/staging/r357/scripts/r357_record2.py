import sys, json, os
p = sys.argv[1]; raw = open(p).read()
i0 = raw.index('"id": "ship-of-the-line"'); i1 = raw.index('"quarterGallery": {', i0); assert raw.index('"id":', i0 + 10) > i1
dec = json.JSONDecoder(); qg, end = dec.raw_decode(raw, i1 + len('"quarterGallery": '))
assert 'contested' not in qg
qg['contested'] = "Steel's stern is narrower and his quarterdeck lower than the model's."
qg['contestedProvenance'] = ("MEASURED, r357, on the built hull (build/staging/r357/scripts/r357_probe.js). (1) Steel gives the breadth of the stern "
  "at the height of the top timber line as 25 ft 0 in (7.62 m); the model's stern at the sheer is 8.50 m across (half-breadth 4.25 m at u 1). "
  "(2) Registered on the taffrail's top, Steel's taffrail stands 3.45 m over the upper deck; the model lays the quarterdeck 2.0 m over the upper "
  "deck (the class's height between decks, islands.provenance), which leaves 1.25 m under the roof's foot for the upper storey, so its lights "
  "(3 ft 2 in on the rake) stand 0.17 m over the quarterdeck where the class's sill is 0.45 m. Neither the stern's breadth nor the quarterdeck's "
  "height was changed this round.")
raw2 = raw[:i1] + '"quarterGallery": ' + json.dumps(qg, ensure_ascii=False) + raw[end:]
V = json.loads(raw2); assert [v for v in V['vessels'] if v['id'] == 'ship-of-the-line'][0]['hull']['quarterGallery'] == qg
open(p + '.tmp', 'w').write(raw2); os.replace(p + '.tmp', p); print('ok')
