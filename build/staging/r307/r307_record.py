# r307: Titanic's wash ports and capping depth into the record
import json
P = '/Users/augustgweon/Ships/web/data/vessels.json'
D = json.load(open(P)); t = [x for x in D['vessels'] if x['id'] == 'titanic'][0]; h = t['hull']
ports = json.load(open('ports.json'))
PX = 13.0268
for w, pw in zip(h['islands']['wells'], ports):
    assert w['name'] == pw['name']
    fwd = w['name'].startswith('Forward')
    lst = []
    for p in sorted(pw['ports'], key=lambda p: p['u'][0]):
        q = {'u': p['u'], 'topM': p['openTopM'], 'bottomM': p['openBottomM'],
             'read': {'cols': p['cols'], 'lineUnderRow': p['lineUnderRow'], 'bottomRow': p['bottomRow'],
                      'datumRow': p['datumRow'], 'datumM': 0.0, 'pxPerM': PX,
                      'script': 'build/staging/r307/r307_read.py, r307_rows.py'}}
        if fwd: q['doors'] = 'removed'; q['bars'] = [0.33, 0.67]
        else: q['doors'] = 'closed'
        lst.append(q)
    w['ports'] = lst
    w['inboardCol'] = '#e4e2dc'
h['islands']['portsProvenance'] = (
    "READ, r307. Position and size off the 1911 side plan (Engineering vol. 91, 26 May 1911, "
    "build/staging/r295/plates/side-plan-1911.png, 13.03 px/m): each well's bulwark line has two rectangles "
    "hanging under it, found as the columns where a dark edge runs down through rows 4 to 9 under the line "
    "(forward well 2963-3010 and 3049.5-3099, 3.6 and 3.8 m; after well 572.5-614.5 and 658-705.5, 3.2 and 3.65 m). "
    "Each port's top is the underside of the bulwark line and its bottom the centre of its lower edge, read over the "
    "tilted waterline at the port's middle column. In the forward well the bottoms stand 0.05 to 0.07 m under the deck, "
    "inside one pixel (0.08 m), so those ports open to the deck. In the after well they stand 0.66 and 0.76 m over the "
    "recorded deck, which r303 found about 1 m lower there than in the forward well while the bulwark line is only "
    "0.1 to 0.5 m lower; the model cuts them where the plan draws them and leaves the sill. "
    "Columns map to u linearly between each well's two loft-mapped ends (r303). "
    "WHAT THEY ARE, off Bob Read, 'Open Wash Ports of Titanic's Forward Well Deck' (rms-titanic.fr/otb/glossaire/"
    "titanic_open_wash_ports.pdf): wash ports to drain a sea off the well; Olympic was built with doors hinged to open "
    "outboard in both wells; Titanic's forward doors were removed during fitting out (her Southampton photographs show "
    "the white of the well through them) and each open port has two horizontal safety bars; the after well kept its doors. "
    "The plan shows the starboard side; the port side is taken as its mirror. The bars' heights (a third and two thirds "
    "of the opening) are not read off any plate. The inboard white is Read's 'white painted areas of the well deck', "
    "a colour taken from his description, not measured off a photograph.")
h['capM'] = 0.31
h['capProvenance'] = (
    "BOUNDED, r307. The capping is the heavy line the 1911 side plan draws along each well's bulwark top: 4 px thick "
    "at 13.03 px/m, 0.31 m (build/staging/r307/ports.json, lineThickM). The plan draws each wash port's top edge "
    "against that line's underside, so the capping is no deeper than the line; before this round the class section "
    "B x 0.0256 made it 0.72 m and it would have hung over the top 0.4 m of every port. The capping's own profile "
    "is not read.")
open(P, 'w').write(json.dumps(D, indent=2, ensure_ascii=False) + '\n')
print('record ok')
# the r303 provenance's last sentence is answered now
D = json.load(open(P)); h = [x for x in D['vessels'] if x['id'] == 'titanic'][0]['hull']
old = "The plan also draws rectangles hanging under the line in both wells, which may be freeing ports or openings in the bulwark; the model does not draw them."
s = h['islands']['wellsProvenance']; assert s.count(old) == 1
h['islands']['wellsProvenance'] = s.replace(old, "The rectangles the plan draws under the line in both wells are the wash ports (portsProvenance, r307).")
open(P, 'w').write(json.dumps(D, indent=2, ensure_ascii=False) + '\n')
print('provenance ok')
