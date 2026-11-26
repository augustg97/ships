# r345 record: the 74's two capstans with their stations; every class-default capstan names its station
import sys, json, pathlib, re
p = pathlib.Path(sys.argv[1]) / 'data' / 'vessels.json'
s = p.read_text()
d = json.loads(s)
n = 0
for v in d['vessels']:
    h = v.get('hull') or {}
    c = h.get('capstan')
    if not c or c.get('form') == 'spill': continue
    if v['id'] == 'ship-of-the-line':
        c['stations'] = [
            {"name": "Jeer capstan", "atU": 0.30,
             "what": "The jeer capstan, in the waist between the fore and main masts. Its men hoisted the heavy lower yards with it, and it helped the main capstan weigh the anchor. Bellona's model (1760) shows it here with its bars shipped."},
            {"name": "Main capstan", "atU": 0.70,
             "what": "The main capstan's upper drumhead, on the upper deck under the quarterdeck, between the main and mizzen masts. Its barrel runs down to a second drumhead on the lower gun deck, which is not drawn."},
        ]
        old = "A 74 carried main (double) and jeer capstans; the weather-deck machine drawn is the upper barrel of the main."
        assert old in h['capstanProvenance']
        h['capstanProvenance'] = h['capstanProvenance'].replace(old,
            "A 74 carried two capstans, and the record draws both (stations, r345). The JEER capstan stands at u 0.30, a READ off the same plate: its drumhead's centre at plate (480, 217), set between the centreline crossings of the forecastle's breastwork (436, 193) and the quarterdeck's breast rail (609, 226), measured along the ship's axis on the plate and corrected for the drumhead standing about 1.7 m lower than the rails, is 0.24 of the way from the one to the other. With the islands' read ends at u 0.26 and 0.43 that gives u 0.30, contested by about 0.02 (1 m) as those ends are. The bars and drumhead above are read off this machine. The MAIN capstan stands at u 0.70, midway between the main mast (u 0.556) and the mizzen (u 0.85), a CLASS station; the plate hides it under the quarterdeck. At u 0.62, the station every bar capstan had until r345, its bars swept through the main mast (A-CAPSTAN-CLEAR). It is drawn with the jeer capstan's dimensions, a CLASS DEFAULT: a 74's main capstan was the larger machine, and no plate of its drumhead has been read. Its lower drumhead, on the lower gun deck, is not drawn.")
    else:
        h['capstanProvenance'] = h['capstanProvenance'].rstrip() + " STATION: u 0.62, the class station (r345 names it); no plate of this hull has been read for where her capstan stood."
    n += 1
out = json.dumps(d, ensure_ascii=False, indent=2)
# keep the file's own layout: compare the first lines
orig_head = s[:200]
p.write_text(out + ('\n' if s.endswith('\n') else ''))
print('records edited', n)
