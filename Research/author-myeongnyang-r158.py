#!/usr/bin/env python3
"""Round 158: Myeongnyang is staged — the third campaign, and the first whose weapon is water.

Adds to battles.json, on the myeongnyang record:
  - `fleets`: 13 panokseon (the record's own countable number, line abreast, anchored
    through the flood) against 31 sekibune (the Todo record's own vanguard composition;
    31 is the diary's count of ships rammed open) in a deep column;
  - an eight-phase `campaign` from Research/MYEONGNYANG.md, `powder: true`, board `cam`;
  - the STREAM as data: `cs` (set, degrees toward) and `ck` (rate, knots) per phase, and
    `anc` (the sides lying to anchors — the diary's "dropped anchor") on the flood phases;
  - `shore`: the Uldolmok DEM patch with eight named probes, every anchor and probe
    picked off the decoded raster with 3x3-cell clearance (build/staging/r158/).

Asserts, before writing anything:
  - the weather-gauge sign is stable (-1, Koreans upwind) on every phase, so the enemy
    never teleports across the compass between phases;
  - every stream set lies on the channel's own axis (320 flood / 140 ebb, +-25 deg);
  - every flood phase whose rate beats the panokseon's 2.5-kn oar floor carries the
    anchor fact, and the peak ebb beats the sekibune's 3.5-kn floor — the sweep-back
    the record describes is emergent, not authored;
  - every probe tests against the PNG through btShoreElev's own bilinear read;
  - every campaign day anchors in water, and every STATION of both fleets, laid by
    formStation and pulled back by btPlace's own shore rule, floats.
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / 'web/data/battles.json'
d = json.load(open(PATH))
B = {b['id']: b for b in d['battles']}
my = B['myeongnyang']

V = json.load(open(ROOT / 'web/data/vessels.json'))['vessels']
VES = {v['id']: v for v in V}

# ── the record, as staged ──────────────────────────────────────────────────────
my['powder'] = True                       # Korean cannon, Japanese arquebus fire
my['cam'] = [126.31, 34.52, 450]          # the strait and the Eoranjin approach, r80 altitude rule

my['fleets'] = [
    {"id": "panokseon", "n": 13, "name": "Korean fleet", "color": "86c7d8", "chip": "blue",
     "furled": True,
     "form": {"shape": "ranks", "front": 800, "jx": 8, "back": 0, "rows": 1, "gap": 0}},
    {"id": "sekibune", "n": 31, "name": "Japanese vanguard", "color": "d9a441", "chip": "gold",
     "furled": True, "face": 180,
     "form": {"shape": "ranks", "front": 240, "jx": 14, "back": 60, "rows": 8, "gap": 60}},
]

# Positions are probe-picked water cells off the raster (Research/MYEONGNYANG.md):
FIGHT   = (126.296, 34.582)     # the basin north of the neck, off Usuyeong
USUYEONG= (126.2879, 34.586)
NECK    = (126.3039, 34.5711)
SMOUTH  = (126.308, 34.5579)
CHSE    = (126.32, 34.55)
BYEOKPA = (126.3501, 34.545)
SOUND   = (126.4101, 34.5151)
EORAN   = (126.4891, 34.4699)
DANGSA  = (126.1762, 34.6485)

def day(rng, dd, pos, epos, w, f, *rest, **kw):
    e = {"rng": rng, "d": dd, "lon": pos[0], "lat": pos[1], "elon": epos[0], "elat": epos[1],
         "w": w, "f": f}
    if rest: e["t"] = rest[0]
    e.update(kw)
    return e

my['campaign'] = [
 day(9000, "The month before", BYEOKPA, EORAN, 315, 3,
     "Five weeks earlier, at Chilcheollyang, the Korean fleet under Won Gyun was destroyed "
     "— the one naval disaster of the war. Yi Sun-sin, freshly out of prison and reduced to "
     "the ranks, is reinstated and finds twelve ships. The court orders the navy disbanded; "
     "he answers that 'this subject still has twelve warships' — a thirteenth joins later. "
     "Through October he falls back west ahead of the Japanese fleet, anchoring at "
     "Byeokpajin on Jindo, and studies the strait behind him: Uldolmok, 293 metres at the "
     "neck, with a tidal race through it that reverses about every three hours."),
 day(9000, "25 October", USUYEONG, EORAN, 315, 3,
     "The Japanese fleet masses at Eoranjin — around 330 hulls, 133 of them warships. Yi "
     "withdraws through the strait and anchors at Usuyeong on its north side. He does not "
     "mean to fight in the neck, where the race runs ten knots and more, but in the basin "
     "just north of it, where the stream is weaker — with the strait feeding the enemy to "
     "him a few ships at a time."),
 day(1200, "Dawn, 26 October", FIGHT, CHSE, 315, 2, hd=140, cs=320, ck=2, anc=[0],
     t="Scouts at first light: countless ships. The Japanese come up the channel on the "
     "young flood — sekibune leading, by their own record, because the atakebune cannot "
     "work water this narrow and shallow. Yi's thirteen stand out from Usuyeong and anchor "
     "in a single line across the basin north of the neck, bows held to the stream — which "
     "is to say, toward the enemy."),
 day(350, "Mid-morning", FIGHT, SMOUTH, 315, 2, a=True, hd=140, cs=320, ck=3.5, anc=[0],
     t="The vanguard, under Kurushima Michifusa, pours out of the neck on a flood no oar "
     "could pull against — and finds the flagship alone. 'Only my ship fired cannons and "
     "arrows. None of the other ships advanced.' Kim Okchu's ship lies one to two majang "
     "back — the better part of a kilometre. For a time the flagship fights like 'a castle "
     "built in the middle of the sea'."),
 day(300, "Toward noon", FIGHT, SMOUTH, 315, 2, a=True, hd=140, cs=320, ck=2, anc=[0],
     t="Yi flies the signal flags. An Wi's ship comes up first — 'do you want to die by "
     "military law?' — then Kim Ungham's, then the line. The strait keeps doing its work: "
     "the Japanese can only feed through the neck in groups, into cannon fire, on water "
     "too fast to manoeuvre in."),
 day(300, "The turn", FIGHT, SMOUTH, 315, 2, a=True, hd=140, cs=140, ck=1,
     t="About midday the flood slackens and turns. In the slack, Junsa — a Japanese defector "
     "aboard the flagship — recognises a body in the water: Kurushima Michifusa. The head "
     "goes to the masthead. The Korean line weighs anchor as the new ebb begins to carry "
     "the crowded vanguard stern-first back into the ships behind it."),
 day(400, "The ebb", FIGHT, SMOUTH, 315, 3, a=True, hd=140, cs=140, ck=4,
     t="The ebb runs to full strength — against the Japanese now, and with the Korean "
     "attack. Ships that cannot make three and a half knots over water making four "
     "against them drift back through their own fleet; thirty-one are rammed open, "
     "burned or wrecked in the crush. Todo Takatora is wounded. The drowned cannot swim "
     "clear of the race. Korean losses for the day: no ships; two killed and three "
     "wounded on the flagship, eight drowned from An Wi's."),
 day(9000, "Nightfall, and after", DANGSA, EORAN, 315, 4,
     "The Japanese fall back toward Eoranjin. Yi does not hold the strait — the tides are "
     "too strong and the wind is against him — and withdraws north-west to Dangsa-do at "
     "nightfall. The result holds anyway: the western sea route to the Yellow Sea stays "
     "shut, the army that expected seaborne supply turns back south, and the navy Hideyoshi "
     "was told no longer existed is rebuilding around thirteen hulls that will meet him "
     "again at Noryang."),
]

my['shore'] = {
    "src": "data/terrain/myeongnyang.png",
    "veg": "mudflat",
    "lon0": 126.10, "lat0": 34.38, "lon1": 126.60, "lat1": 34.72,
    "probes": [
        {"n": "the neck of Uldolmok, mid-channel", "lon": NECK[0],   "lat": NECK[1],   "land": False},
        {"n": "the fight's water, north of the neck", "lon": FIGHT[0], "lat": FIGHT[1], "land": False},
        {"n": "Byeokpajin roadstead",             "lon": BYEOKPA[0], "lat": BYEOKPA[1], "land": False},
        {"n": "the sound toward Eoranjin",        "lon": SOUND[0],  "lat": SOUND[1],  "land": False},
        {"n": "the Jindo bank west of the neck",  "lon": 126.2949,  "lat": 34.566,    "land": True},
        {"n": "the Haenam bank east of the neck", "lon": 126.3119,  "lat": 34.573,    "land": True},
        {"n": "the Jindo massif",                 "lon": 126.32,    "lat": 34.48,     "land": True},
        {"n": "the Haenam hills",                 "lon": 126.4001,  "lat": 34.6,      "land": True},
    ],
    "cite": "Terrain Tiles on AWS (Mapzen terrarium, zoom 13, ~16 m/px source, resampled to "
            "20 m/px; land from SRTM, offshore from ETOPO1). Water cells floored to -8 m; "
            "sub-2 m offshore specks despeckled. The south-west coast's tidal flats read as "
            "land in the raster and pinch the drawn neck to ~120-260 m against the surveyed "
            "293 m; the coastline (the 0-crossing) is the raster's own.",
}

# ── assertions: the geometry the Action will derive from this ─────────────────
def upwind(day):  # battle.js lonLatUpwind, exactly
    tw = math.radians(day['w'])
    dx = (day['elon'] - day['lon']) * math.cos(math.radians(day['lat']))
    dz = day['elat'] - day['lat']
    return 1 if (dx * math.sin(tw) + dz * math.cos(tw)) > 0 else -1

C = my['campaign']
signs = [upwind(dd) for dd in C]
assert all(s == -1 for s in signs), signs   # Koreans upwind of a SE enemy on a NW wind, every phase

# the stream lies on the channel's own axis, and the mechanism's arithmetic holds
PAN_FLOOR = VES['panokseon']['polar']['floor']['kn']
SEK_FLOOR = VES['sekibune']['polar']['floor']['kn']
assert PAN_FLOOR == 2.5 and SEK_FLOOR == 3.5, (PAN_FLOOR, SEK_FLOOR)
ebb_peak = 0
for i, dd in enumerate(C):
    if 'ck' in dd:
        assert 0 <= dd['cs'] <= 360 and dd['ck'] >= 0, (i, dd['d'])
        axis = min(abs(dd['cs'] - 320), abs(dd['cs'] - 140))
        assert axis <= 25, (i, dd['d'], dd['cs'])
        if abs(dd['cs'] - 320) <= 25 and dd['ck'] > PAN_FLOOR:
            assert dd.get('anc') == [0], \
                (i, dd['d'], 'a flood the oar floor cannot hold needs the anchor fact')
        if abs(dd['cs'] - 140) <= 25:
            ebb_peak = max(ebb_peak, dd['ck'])
    if 'anc' in dd:
        assert isinstance(dd['anc'], list) and all(a in (0, 1) for a in dd['anc']), (i, dd['d'])
assert ebb_peak > SEK_FLOOR, (ebb_peak, 'the ebb must beat the sekibune floor or the sweep-back is a caption')

for dd in C:
    for k in ('rng', 'd', 'lon', 'lat', 'elon', 'elat', 'w', 'f', 't'):
        assert k in dd, (dd.get('d'), k)
    assert dd['rng'] > 0 and 0 <= dd['w'] <= 360 and 0 <= dd['f'] <= 12

# ── the raster testifies before the audit does ────────────────────────────────
import struct, zlib

def read_png_rgb(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, w, h, raw = 8, 0, 0, b''
    bitdepth = colortype = None
    idat = b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        chunk = data[pos+8:pos+8+ln]
        if typ == b'IHDR':
            w, h, bitdepth, colortype = struct.unpack('>IIBB', chunk[:10])
            assert bitdepth == 8 and colortype == 2, (bitdepth, colortype)
        elif typ == b'IDAT':
            idat += chunk
        pos += 12 + ln
    raw = zlib.decompress(idat)
    stride = w * 3
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(3, stride): line[i] = (line[i] + line[i-3]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-3] if i >= 3 else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-3] if i >= 3 else 0
                b = prev[i]
                c = prev[i-3] if i >= 3 else 0
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, out

sh = my['shore']
W, H, px = read_png_rgb(ROOT / 'web' / sh['src'])

def elev_at(lon, lat):  # battle.js btShoreElev, exactly
    u = (lon - sh['lon0']) / (sh['lon1'] - sh['lon0'])
    v = (lat - sh['lat0']) / (sh['lat1'] - sh['lat0'])
    if u <= 0 or u >= 1 or v <= 0 or v >= 1: return -30.0
    x = min(W - 1.001, max(0, u * W - 0.5))
    y = min(H - 1.001, max(0, (1 - v) * H - 0.5))
    xi, yi, fx, fy = int(x), int(y), x - int(x), y - int(y)
    def g(yy, xx): return (px[(yy*W+xx)*3] * 256 + px[(yy*W+xx)*3+1]) / 65535 * 20000 - 11000
    a = g(yi, xi) * (1-fx) + g(yi, xi+1) * fx
    b = g(yi+1, xi) * (1-fx) + g(yi+1, xi+1) * fx
    return a * (1-fy) + b * fy

for p in sh['probes']:
    el = elev_at(p['lon'], p['lat'])
    assert p['land'] == (el > 0), (p['n'], el)
for i, dd in enumerate(C):
    el = elev_at(dd['lon'], dd['lat'])
    assert el <= -2.0, (i, dd['d'], el, 'a campaign day anchored on dry land')

# ── every STATION floats: formStation + btPlace's shore pull-back, exactly ────
R = 6371000.0
def stations_afloat(dayi):
    dd = C[dayi]
    tw = math.radians(dd['w'])
    sep = (-math.sin(tw) * dd['rng'] * upwind(dd), math.cos(tw) * dd['rng'] * upwind(dd))
    h = math.radians(dd.get('hd', 140))
    lonR, latR = math.radians(dd['lon']), math.radians(dd['lat'])
    def elev_local(x, z):
        lat = latR + z / R
        lon = lonR - x / (R * max(0.05, math.cos(lat)))
        return elev_at(math.degrees(lon), math.degrees(lat))
    bad = []
    for F in my['fleets']:
        side = F.get('side', my['fleets'].index(F))
        fm = F['form']
        ox, oz = (0, 0) if side == 0 else sep
        for i in range(F['n']):
            t = (i - (F['n'] - 1) / 2) / ((F['n'] - 1) / 2)
            sx = t * fm['front'] / 2 + ((i % 3) - 1) * fm.get('jx', 0)
            sz = -fm.get('back', 0) - (i % fm['rows']) * fm['gap']
            tx = ox - (sx * math.cos(h) + sz * math.sin(h))
            tz = oz - sx * math.sin(h) + sz * math.cos(h)
            if elev_local(tx, tz) > -2.0:                  # btPlace's pull-back
                vx, vz = ox - tx, oz - tz
                ln = math.hypot(vx, vz); n = max(1, math.ceil(ln / 25))
                for k in range(1, n + 1):
                    if elev_local(tx + vx*k/n, tz + vz*k/n) <= -2.0:
                        tx, tz = tx + vx*k/n, tz + vz*k/n
                        break
                else:
                    bad.append((F['id'], i))
            if elev_local(tx, tz) > -2.0:
                bad.append((F['id'], i, 'still aground after pull-back'))
    return bad

for i in range(len(C)):
    bad = stations_afloat(i)
    assert not bad, (i, C[i]['d'], bad)

json.dump(d, open(PATH, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f"ok: myeongnyang staged — {len(C)} phases, {len(my['fleets'])} fleets, "
      f"{len(sh['probes'])} probes, every station afloat on every phase")
