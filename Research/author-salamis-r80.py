#!/usr/bin/env python3
"""Round 80: the campaign stops being the Armada's private property.

Adds to battles.json:
  - armada: `fleets` (the exact composition battle.js hardcoded), `powder: true`,
    and `a: true` on exactly the days the old gunfire regex matched — asserted.
  - salamis: `fleets` and a nine-phase `campaign` from Research/SALAMIS.md,
    `powder: false`.

Asserts, before writing anything:
  - the armada a-days are the regex days MINUS its false positive: the old regex
    fired gunfire on 5 Aug, "A day of no action", because "no action" contains
    "Action";
  - the salamis weather-gauge sign is stable (+1, second fleet upwind) on every
    phase, so the enemy never teleports across the compass between phases;
  - on the approach/fight phases the fleet heading lies within 35 deg of the
    enemy bearing, so the line meets the column square-on;
  - every campaign day of both battles carries every field the Action reads.
"""
import json, math, re, sys

PATH = 'web/data/battles.json'
d = json.load(open(PATH))
B = {b['id']: b for b in d['battles']}

# ── armada: composition out of the code, verbatim ──────────────────────────────
arm = B['armada']
arm['powder'] = True
# the board camera the code hardcoded, as [lon, lat, altitude km]: R + 1147/63.71
# reproduces the old flyTo(0.4, 50.9, 118) to within 200 m of altitude
arm['cam'] = [0.4, 50.9, 1147]
arm['fleets'] = [
    {"id": "carrack", "n": 22, "name": "Armada", "color": "d9a441", "chip": "gold",
     "form": {"shape": "crescent", "front": 520, "depth": 230, "lead": 90}},
    {"id": "fluyt", "n": 18, "name": "English fleet", "color": "86c7d8", "chip": "blue",
     "form": {"shape": "ranks", "front": 420, "jx": 40, "back": 430, "rows": 4, "gap": 70}},
]
# The old gunfire test was a regex over the day's prose, and it FIRED ON "A day
# of no action" — 5 Aug, the empty day off Beachy Head, has been drawing
# broadside smoke since the Action was built because "no action" contains
# "Action". The flag records the five days the account actually has gunfire.
RX = re.compile(r'Action|GRAVELINES|Portland|Isle of Wight|fireships', re.I)
ACTION_DAYS = ['31 July', '2 Aug', '4 Aug', '7 Aug', '8 Aug']
for day in arm['campaign']:
    if day['d'] in ACTION_DAYS:
        day['a'] = True
    else:
        day.pop('a', None)
adays = [day['d'] for day in arm['campaign'] if day.get('a')]
rxdays = [day['d'] for day in arm['campaign'] if RX.search(day['t'])]
assert adays == ACTION_DAYS, adays
assert set(rxdays) - set(adays) == {'5 Aug'}, rxdays  # the regex's false positive

# ── salamis: the record, per Research/SALAMIS.md ───────────────────────────────
sal = B['salamis']
sal['powder'] = False
# ~20 km theatre: 450 km up is where the globe's terrain still reads as coastline;
# below that the substrate is mush and the board cannot be a legible surface (r80 finding)
sal['cam'] = [23.60, 37.90, 450]
sal['fleets'] = [
    {"id": "trireme", "n": 26, "name": "Greek fleet", "color": "86c7d8", "chip": "blue",
     "furled": True,
     "form": {"shape": "ranks", "front": 1040, "jx": 12, "back": 0, "rows": 2, "gap": 95}},
    {"id": "trireme", "n": 30, "name": "Persian fleet", "color": "d9a441", "chip": "gold",
     "furled": True, "face": 180,
     "form": {"shape": "ranks", "front": 720, "jx": 35, "back": 60, "rows": 3, "gap": 110}},
]

# Greek positions crawl SSE toward the strait mouth phase by phase (the drift sets
# the fleet-frame heading, which must face the coming column); Persian positions
# run Phalerum -> Psyttaleia -> the narrows -> back out. Board convention as the
# Armada: `rng` is the truth, positions are the chessboard.
sal['campaign'] = [
    {"rng": 9000, "d": "The week before", "lon": 23.500, "lat": 37.9760,
     "elon": 23.700, "elat": 37.9300, "w": 170, "f": 2,
     "t": "Athens is empty and the Acropolis burns. The allied fleet — 378 triremes by "
          "Herodotus' count, 310 by Aeschylus', who rowed in it — lies in the bays of "
          "Salamis town with the city's people behind it on the island. The Persian fleet "
          "beaches at Phalerum, nine kilometres east. Between them is a strait about "
          "fifteen hundred metres wide."},
    {"rng": 9000, "d": "The council, at night", "lon": 23.5035, "lat": 37.9700,
     "elon": 23.6980, "elat": 37.9310, "w": 165, "f": 1,
     "t": "The Peloponnesian commanders vote to fall back on the Isthmus wall. "
          "Themistocles tells Eurybiades the one thing that decides the campaign: 'to "
          "fight in a narrow space is favourable to us — in an open sea, to them.' The "
          "fleet stays, for now. If it scatters to defend home coasts, there is no fleet."},
    {"rng": 8500, "d": "Dusk: Sicinnus", "lon": 23.5070, "lat": 37.9640,
     "elon": 23.6900, "elat": 37.9320, "w": 165, "f": 1,
     "t": "Themistocles sends his children's tutor, the slave Sicinnus, across by boat with "
          "a private message for the Persian commanders: the Greeks are at each other's "
          "throats and mean to slip out at dawn. Xerxes believes it, and orders every exit "
          "from the strait closed that night."},
    {"rng": 3500, "d": "Night: the encirclement", "lon": 23.5105, "lat": 37.9580,
     "elon": 23.6200, "elat": 37.9380, "w": 160, "f": 2,
     "t": "The Persian fleet puts to sea in darkness: the western wing advances toward "
          "Salamis to enclose the Greeks, soldiers are landed on the islet of Psyttaleia "
          "in the strait's mouth, and — Diodorus says, though Herodotus does not — the "
          "Egyptian squadron rows round the island to seal the far channel. The crews are "
          "kept at the oar all night. Aeschylus rowed against them the next morning."},
    {"rng": 1400, "d": "Dawn", "lon": 23.5140, "lat": 37.9520,
     "elon": 23.5900, "elat": 37.9440, "w": 160, "f": 3,
     "t": "Aristides — Themistocles' exiled rival — threads the blockade from Aegina to "
          "tell the council they are surrounded: the debate is over. The Greeks man their "
          "ships and the battle-song goes up, echoing off the island rocks. The Persian "
          "column, tired from a night's rowing, comes on into the narrows where number "
          "cannot deploy."},
    {"rng": 130, "d": "Mid-morning", "lon": 23.5175, "lat": 37.9460,
     "elon": 23.5600, "elat": 37.9500, "w": 160, "f": 4, "a": True,
     "t": "Themistocles holds the line back until the regular breeze comes in from the "
          "open sea, rolling a swell up the channel that catches the high-sterned, "
          "high-decked Persian ships and swings them broadside-on. Ameinias of Pallene "
          "rams first. The leading Persian line, backing water, is fouled by its own "
          "second and third pressing up from astern; the narrows have stripped their "
          "numbers exactly as Themistocles said they would."},
    {"rng": 350, "d": "Afternoon", "lon": 23.5210, "lat": 37.9430,
     "elon": 23.5750, "elat": 37.9450, "w": 165, "f": 4, "a": True,
     "t": "The Persian van breaks onto its own rear and the rout runs east. The sea, "
          "Aeschylus wrote, could no longer be seen for wrecks and dead men; most of the "
          "crews, Herodotus adds, drowned because they could not swim. Ariabignes, "
          "Xerxes' brother, is killed. Artemisia of Halicarnassus escapes the melee by "
          "ramming a ship of her own side, and Aristides lands hoplites on Psyttaleia "
          "and kills the garrison to a man."},
    {"rng": 6000, "d": "Evening", "lon": 23.5218, "lat": 37.9390,
     "elon": 23.6600, "elat": 37.9350, "w": 170, "f": 3,
     "t": "The survivors run for Phalerum and the shelter of the army. Xerxes has watched "
          "the whole day from a throne at the foot of Mount Aigaleos, secretaries beside "
          "him writing down captains' names. Diodorus — Herodotus gives no totals — puts "
          "the cost at some two hundred Persian ships against forty Greek."},
    {"rng": 9500, "d": "The days after", "lon": 23.5250, "lat": 37.9360,
     "elon": 23.7200, "elat": 37.9250, "w": 170, "f": 3,
     "t": "Within days the king orders the fleet to the Hellespont to guard the bridges, "
          "and marches for home with most of the army. Mardonius winters in Thessaly with "
          "the rest, for Plataea next summer. The invasion still has an army; it no "
          "longer has a navy, and an army on a foreign shore without one has a supply "
          "line made of weather."},
]

# ── assertions: the geometry the Action will derive from this ─────────────────
def upwind(day):  # battle.js lonLatUpwind, exactly
    tw = math.radians(day['w'])
    dx = (day['elon'] - day['lon']) * math.cos(math.radians(day['lat']))
    dz = day['elat'] - day['lat']
    return 1 if (dx * math.sin(tw) + dz * math.cos(tw)) > 0 else -1

def heading(c, i):  # battle.js btSetDay fleet heading, with the r80 last-day rule
    j, k = (i, i + 1) if i < len(c) - 1 else (i - 1, i)
    a, b = c[j], c[k]
    mlat, mlon = 111132, 111320 * math.cos(math.radians(a['lat']))
    return math.degrees(math.atan2((b['lon'] - a['lon']) * mlon,
                                   (b['lat'] - a['lat']) * mlat)) % 360

C = sal['campaign']
signs = [upwind(day) for day in C]
assert all(s == 1 for s in signs), signs

for i in (3, 4, 5, 6):
    day = C[i]
    hd = heading(C, i)
    # bearing of the enemy from the fleet: the sep axis is the wind axis, upwind side
    enemy = day['w'] % 360
    diff = min(abs(hd - enemy), 360 - abs(hd - enemy))
    assert diff < 35, (i, day['d'], round(hd, 1), enemy, round(diff, 1))

for b in (arm, sal):
    for day in b['campaign']:
        for k in ('rng', 'd', 'lon', 'lat', 'elon', 'elat', 'w', 'f', 't'):
            assert k in day, (b['id'], day.get('d'), k)
        assert day['rng'] > 0 and 0 <= day['w'] <= 360 and 0 <= day['f'] <= 12
    assert 'powder' in b and 'fleets' in b and 'year' in b and 'cam' in b

json.dump(d, open(PATH, 'w'), ensure_ascii=False, separators=(',', ':'))
print('written; armada action days:', adays)
print('salamis phases:', [c['d'] for c in C])
print('salamis headings:', [round(heading(C, i)) for i in range(len(C))])
