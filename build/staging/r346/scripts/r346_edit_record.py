#!/usr/bin/env python3
"""r346: each class-station capstan's provenance names the station drawn and why.
usage: r346_edit_record.py <web dir>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'data' / 'vessels.json'
s = p.read_text()
OLD = "STATION: u 0.62, the class station (r345 names it); no plate of this hull has been read for where her capstan stood."
HEAD = ("STATION: no plate of this hull has been read for where her capstan stood. The builder starts at u 0.62, "
        "the class station, and draws the machine at the nearest station along the centreline where nothing stands "
        "in its drum or in the sweep of its bars, with a hatch's coaming 0.3 m clear of the drumhead's rim (r346). ")
NEW = {
    'caravel': "Drawn at u 0.225, between the fore and main masts, forward of the fore hatch. At u 0.62 the main mast stood about 1.1 m from the drum's axis, inside the 2.28 m sweep, and the lateen mainsail's foot crossed the bars' height.",
    'carrack': "No capstan is drawn. No station between u 0.20 and 0.85 is clear: the boat, the forecastle, the aftcastle's forward end, the main mast and the lateen mizzen's yard and sail each stand in the 2.9 m sweep somewhere along that run. A capstan under the aftcastle's deck needs that space drawn open first.",
    'galley': "No capstan is drawn. No station between u 0.20 and 0.85 is clear: the corsia, the gangway along her centreline, runs the whole length through the drum, and the oars' looms and the rowing benches cross the bars' height on both sides of it.",
    'galleass': "Drawn at u 0.38, forward of the main mast. At u 0.62 the ship's boat lay in the sweep of the bars.",
    'fluyt': "Drawn at u 0.62: the deck there is clear.",
    'east-indiaman': "Drawn at u 0.245, between the fore and main masts, forward of the fore hatch. From u 0.25 to 0.62 the fore hatch's grating, the boat or the main mast stands within the drum's clearance or the 3.27 m sweep, and from u 0.62 to 0.80 the lateen mizzen's yard and sail come down through the bars' height.",
    'slave-ship': "Drawn at u 0.24, between the fore and main masts, forward of the fore hatch. From u 0.245 to 0.62 the fore hatch's grating, the boat or the main mast stands within the drum's clearance or the sweep, and from u 0.62 to 0.80 the lateen mizzen's yard and sail come down through the bars' height.",
    'wyoming': "Drawn at u 0.625. At u 0.62 the fourth mast, stepped at u 0.58, stood 3.65 m from the drum's axis at the bars' height, just inside the 3.72 m sweep.",
    'clipper': "Drawn at u 0.745, abaft the after hatch and forward of the mizzen. From u 0.505 to 0.74 the boat, the main mast, the deckhouse or the after hatch's grating stands within the drum's clearance or the sweep.",
    'endurance': "No capstan is drawn. No station between u 0.20 and 0.85 is clear: the fore and main masts' fife rails, the gratings, the boat, the deckhouse, the funnel, its steam pipe and the boiler casing between them fill her deck along the centreline.",
}
import re
for vid, tail in NEW.items():
    i = s.find('"id": "%s"' % vid)
    assert i >= 0, vid
    j = s.find(OLD, i)
    k = s.find('"id": "', i + 10)
    assert j > 0 and (k < 0 or j < k), (vid, j, k)
    s = s[:j] + HEAD + tail + s[j + len(OLD):]
assert OLD not in s
p.write_text(s)
import json; json.loads(s)
print('ok', p)
