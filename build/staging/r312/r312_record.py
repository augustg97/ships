"""r312 (0y138): the 74's spanker stowage read off Eckersberg's 1828 painting of the Russian 74 Asow at anchor."""
import json, sys
P = sys.argv[1]
d = json.load(open(P))
V = {v['id']: v for v in d['vessels']}
READ = ("READ, r312 (0y¹³⁸): BRAILED. This hull is a class 74 with no single ship behind it, so the plate is the nearest dated painting of a working 74 at anchor "
 "by a painter known for drawing rigging exactly: C. W. Eckersberg, 'The Russian Ship of the Line Asow and a Frigate at Anchor in the Roads of Elsinore', 1828, "
 "oil on canvas, Statens Museum for Kunst (Commons 'C.W. Eckersberg - The Russian Ship of the Line \"Asow\" and a Frigate at Anchor in the Roads of Elsinore - Google Art Project.jpg', "
 "4044 x 4939 px, read off the 1920 px derivative; build/staging/r312/plates/asow.jpg, the mizzen at 2x in asow-mizzen-2x.png and at 3x in asow-mizzen-3x.png). "
 "Asow (Azov) was a Russian 74 launched in 1826 (Commons 'Category:Azov (ship, 1826)'); the painting shows her at anchor with her yards crossed and every square sail furled, "
 "seen from high on her starboard quarter. At the mizzen it is about 20 px/m on the 1920 px derivative: about 410 px from the poop rail to the mizzen top. A gaff 0.25 m thick would show 5 px wide. "
 "WHAT IT SHOWS: a long buff bundle of canvas lies close along the after side of the mizzen lower mast, from just under the crossjack yard down to the poop, "
 "where the boom lies fore and aft over the taffrail; the St Andrew's ensign hangs from the peak of a gaff that stands aloft. "
 "That is the spanker brailed in to the mast under a standing gaff, with the boom left in place. "
 "CONTESTED: this is one painting of one ship, a Russian 74 forty-eight years after this hull's 1780, and a painting, not a photograph. "
 "The ensign hides the gaff's own line, so its angle is not read, and the gaff's length and the boom's height are not read either. "
 "The builder's 'lowered' default (a schooner's stowage) is not shown on any plate of a 74 that has been read.")
m = V['ship-of-the-line']['hull']['masts'][2]
assert m.get('spanker') and m.get('rig') == 'square' and m.get('furlStow') is None and m['furlStowProvenance'].startswith('UNREAD')
m['furlStow'] = 'brailed'; m['furlStowProvenance'] = READ
json.dump(d, open(P, 'w'), ensure_ascii=False, indent=2)
print('ok')
