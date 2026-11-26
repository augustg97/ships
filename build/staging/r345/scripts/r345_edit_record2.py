import sys, json, pathlib
p = pathlib.Path(sys.argv[1]) / 'data' / 'vessels.json'
s = p.read_text(); d = json.loads(s)
v = [v for v in d['vessels'] if v['id'] == 'ship-of-the-line'][0]
I = v['hull']['islands']
add = " ENDS (r345): each deck's end facing the waist is open below it, as on a two-decker of the 1760s: the half deck under the quarterdeck and the galley's space under the forecastle open on the waist. Bellona's model shows the jeer capstan's bars reaching in under the forecastle's edge. This is a CLASS reading; the plate does not show the space under the forecastle at a scale that settles it. The beam under each deck's end is not drawn."
assert add not in I['provenance']
I['provenance'] += add
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + ('\n' if s.endswith('\n') else ''))
print('ok')
