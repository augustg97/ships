#!/usr/bin/env python3
"""Round 89: add the panokseon — the 32nd hull, Myeongnyang's ship.
Inserts the vessel record after the galleass, the plate entry, and the ASSETS entry.
Idempotent: refuses to run twice."""
import json, sys

VP = 'web/data/vessels.json'
PP = 'web/data/plates.json'
AP = 'web/data/assets/ASSETS.json'

vessels = json.load(open(VP))
if any(v['id'] == 'panokseon' for v in vessels['vessels']):
    sys.exit('panokseon already present')

rec = {
 "id": "panokseon",
 "name": "Panokseon",
 "sub": "board-roofed ship",
 "rig": "oar",
 "era": [1555, 1895],
 "from": 1555,
 "to": 1895,
 "region": "Korea",
 "rows": [
  ["Length on deck", "~32 m for a large ship; medium ships about 21 m"],
  ["Beam", "~9.4 m — length to beam about 3.4, against a Mediterranean galley's 8.1"],
  ["Draught", "~1.8 m on a dead-flat bottom (derived; no example survives)"],
  ["Freeboard", "about 2 m to the gunwale, 3.6 m to the fighting deck — a boarder must climb two storeys"],
  ["Decks", "three levels: the hold; a protected oar deck; and the raised fighting deck the ship is named for"],
  ["Oars", "8–10 a side, each a long sculling ro worked standing by 3–4 men"],
  ["Under oars", "about 3 kn (derived) — slow, but she pivots on her flat bottom nearly in her own length"],
  ["Guns", "a dozen and more bronze pieces in four calibres — cheonja, jija, hyeonja, hwangja ('heaven, earth, black, yellow') — firing iron shot and the daejanggunjeon heavy arrow"],
  ["Crew", "50–60 at the oars and about 125 marines and gunners"],
  ["Rig", "two masts, battened lug sails of woven matting, lowered before action"],
  ["At Myeongnyang", "thirteen of her held the strait against 133 Japanese warships, 26 October 1597"]
 ],
 "crew": 180,
 "attestation": "generated",
 "confidence": "moderate",
 "text": "The standard warship of the Joseon navy from 1555 until the nineteenth century, and the ship Yi Sun-sin fought every battle of the Imjin War with. The name means \"board-roofed ship\": above the oar deck the shipwrights built a second, higher deck on stanchions — the sangjang — walled with heavy plank, so that the whole fighting crew stands a full storey above the water behind timber, with the commander's roofed tower rising amidships. The first was launched in 1555, after the Eulmyo wako raid of that year showed the old single-decked ships could be boarded and taken.\n\nHer construction is the Korean coastal tradition scaled up to war burden. The bottom is dead flat, built of thick pine planks edge-fastened with oak pegs and locked by massive crossbeams whose ends pierce the hull sides — no iron nails, and no keel. A flat bottom suits a coast with some of the world's largest tides: she takes the ground upright when the water leaves, and she turns nearly in her own length, pivoting on it. The price is speed. Fifty to sixty rowers working eight to ten great sculling oars drove perhaps three knots, and both fleets' accounts agree the Japanese ships were faster through the water.\n\nThe two navies of the Imjin War (1592–1598) disagreed about what a warship is for. The Japanese fleet — atakebune and the lighter sekibune — carried arquebusiers and swordsmen, and fought by coming alongside and boarding; its lightly framed hulls mounted few heavy guns, because they could not bear the recoil. The panokseon is the opposite argument built in timber: heavy cannon — the cheonja, jija, hyeonja and hwangja chongtong, throwing iron shot and the great fletched daejanggunjeon to several hundred metres — worked from behind a high plank bulwark that boarders would have to climb. Joseon squadrons stood off, fired, and dismasted or holed the boarders before they could close. The geobukseon, the famous turtle ship, is this same hull with the fighting deck roofed over completely.\n\nHer hardest test came after her navy was nearly destroyed. At Chilcheollyang in August 1597 a Joseon fleet under Won Gyun was annihilated — and thirteen panokseon survived. With those thirteen, reinstated to command, Yi Sun-sin met the Japanese advance fleet of 133 warships in the Myeongnyang strait on 26 October 1597, where a tidal race runs to ten knots and reverses. Anchored across the narrows against the flood, his line fought until the tide turned, then drove the disordered Japanese van back through the strait onto their own supports. About thirty Japanese ships were destroyed; no panokseon was lost. The type, continued as the jeonseon of the late Joseon fleet, remained the kingdom's standard warship until the navy itself was reorganised out of existence in the 1890s.",
 "cite": "Hong Sun-jae, 'Understanding the Structure of the Panokseon' (*Military History* 135, 2025); Hawley, *The Imjin War* (RAS Korea, 2005); Underwood, *Korean Boats and Ships* (1934). No panokseon survives; every dimension here is a reconstruction from the documentary record and is labelled derived where it is inference.",
 "polar": {
  "beatLight": 62,
  "beatHard": 70,
  "curve": {"0": 1.2, "30": 1.9, "45": 2.6, "60": 3.2, "75": 3.6, "90": 4.0,
            "110": 4.3, "120": 4.4, "135": 4.2, "150": 3.7, "180": 3.0},
  "rigNote": "The figures are her SAILING speed in a moderate breeze, both battened lugs standing — the junk-family curve shape (the Korean sail is the same engineering: a balanced lug held flat by full-length battens), scaled down for a flat-bottomed hull of war burden that makes leeway freely. No Joseon log records a measured passage speed; the anchor is derived and labelled so. Under oars: about 3 kn, 50–60 rowers on eight to ten sculls — both fleets' battle accounts agree the Japanese ships were faster, which is the only speed attestation that exists. The router holds 2.5 kn as her oar floor.",
  "rig": "oars, with two battened-lug masts",
  "anchor": {
   "kn": 4.5,
   "kind": "passage",
   "source": "derived: the junk's battened-lug coastal passage figure (Worcester, 5 kn) scaled down for a flat-bottomed, high-sided hull of war burden; no measured Joseon passage exists"
  },
  "floor": {
   "kn": 2.5,
   "lossKnPerMs": 0.18,
   "source": "derived: set below the Mediterranean galley's 3.5 kn cruise — 50–60 rowers on ~500 t against her 150 on 200 t; the attestation is relative, both sides' Imjin accounts calling the Japanese ships faster. Headwind loss carried from Olympias's measured ratio, the galley's own method"
  }
 },
 "hull": {
  "wlPower": 2.3,
  "stemFineness": 0.34,
  "sternFineness": 0.42,
  "forefoot": 0.28,
  "run": 0.26,
  "riseF": 0.30,
  "riseA": 0.28,
  "sheerBow": 0.9,
  "sheerStern": 0.8,
  "tumblehome": 0.0,
  "stemRake": 0.10,
  "sternRake": 0.10,
  "strakes": 12,
  "copper": False,
  "copperAge": 0.55,
  "chequer": False,
  "gunDecks": 0,
  "iron": False,
  "topside": "#6b5233",
  "bowsprit": 0.0,
  "steeve": 0,
  "masts": [
   {"at": 0.44, "heightM": 15.0, "rig": "junk", "rake": 0, "shrouds": 0},
   {"at": 0.15, "heightM": 10.5, "rig": "junk", "rake": -4, "shrouds": 0}
  ],
  "build": "bulkhead",
  "year": 1597,
  "loa": 32.0,
  "lwl": 30.0,
  "beam": 9.4,
  "draught": 1.8,
  "freeboard": 2.0,
  "cm": 0.92,
  "oarBanks": 1,
  "oarsPerBank": [9],
  "oarLen": 7.5,
  "interscalmium": 2.4,
  "gunDeck": {"from": 0.16, "to": 0.86, "height": 1.6, "gunsPerSide": 6,
              "screenH": 1.2, "over": 0.5},
  "tower": {"at": 0.55, "w": 3.2, "h": 2.6}
 }
}

vs = vessels['vessels']
i = next(j for j, v in enumerate(vs) if v['id'] == 'galleass')
vs.insert(i + 1, rec)
json.dump(vessels, open(VP, 'w'), indent=1, ensure_ascii=False)

plates = json.load(open(PP))
plates['panokseon'] = {
 "caption": "A panokseon in an old Korean painting. No ship survives; the type is known from paintings and drawings like this one, from the dynastic records, and from the war diaries of the admirals who fought her",
 "credit": "Unknown Korean artist",
 "licence": "Public domain",
 "url": "https://commons.wikimedia.org/wiki/File:Panokseon.jpg"
}
json.dump(plates, open(PP, 'w'), indent=1, ensure_ascii=False)

assets = json.load(open(AP))
assets['assets'].append({
 "source": "wikimedia-commons",
 "slug": "panokseon",
 "type": "ships",
 "name": "File:Panokseon.jpg",
 "caption": "An old painting of a panokseon, the Joseon navy's standard warship",
 "licence": "Public domain",
 "url": "https://commons.wikimedia.org/wiki/File:Panokseon.jpg",
 "files": ["web/data/assets/ships/panokseon.jpg"]
})
json.dump(assets, open(AP, 'w'), indent=1, ensure_ascii=False)
print('panokseon added: vessel, plate, asset')
