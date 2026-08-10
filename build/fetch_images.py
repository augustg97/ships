#!/usr/bin/env python3
"""── SHIP PHOTOGRAPHS, WITH THEIR PAPERWORK ────────────────────────────────────────────────

Every vessel card in the Shipwright gets a photograph of the real ship. This fetches them from
Wikimedia Commons, which is where historic ship photography actually lives — for most of this
fleet the best surviving image IS the Commons one, so sourcing for quality and sourcing with
provenance are not in tension here.

⚠ FETCH THE THUMBNAIL, NOT THE ORIGINAL. Commons originals run to 40 MB and 8000 px. The card
shows an image about 640 px wide on a 2x display, so `iiurlwidth` asks Commons' own thumbnailer
for a 1280 px JPEG and we store that. The first-paint budget in build_site.py is 8.6 MB and it
is already at 8.34 — these go in as a SEPARATE, lazily-loaded asset directory and must never be
pulled into the first paint.

⚠ AND THE LICENCE COMES BACK IN THE SAME CALL. `extmetadata` carries LicenseShortName, Artist
and Credit. Recording it at fetch time is the only moment the information is guaranteed to be
in hand; a file on disk with no record of where it came from is the thing that makes a later
publication decision an archaeology project. Written into web/data/assets/ASSETS.json alongside
the HDRIs, in the same shape.

Usage:
    python3 build/fetch_images.py            # fetch everything missing
    python3 build/fetch_images.py --force    # re-fetch all
    python3 build/fetch_images.py --check    # report only, fetch nothing
"""
import json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'web', 'data', 'assets', 'ships')
ASSETS = os.path.join(ROOT, 'web', 'data', 'assets', 'ASSETS.json')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'ShipsModel/1.0 (internal research model; contact augustgweon@gmail.com)'
WIDTH = 1280

# ── THE PLATES ────────────────────────────────────────────────────────────────────────────
# vessel id -> Commons file title. Chosen for what a photograph can show that the model cannot:
# the real proportions, the real surface, and the ship in her own weather. Where a vessel is a
# TYPE rather than a named ship (the cog, the dhow, the trireme) the plate is the best surviving
# example or the accepted full-scale reconstruction, and the caption says which.
PLATES = {
  'titanic':        ('File:RMS Titanic 3.jpg', 'Titanic leaving Southampton, 10 April 1912'),
  'great-eastern':  ('File:Great Eastern 1866-crop.jpg', 'Great Eastern moored, 1866'),
  'preussen':       ('File:Preussen ship c. 1910 SLNSW FL20702467.jpg', 'Preussen — the only five-masted full-rigged ship ever built'),
  'dreadnought':    ('File:HMS Dreadnought 1906 H61017.jpg', 'HMS Dreadnought, 1906 — she made every other battleship obsolete'),
  'yamato':         ('File:Yamato Trial 1941.jpg', 'Yamato on trials off Bungo Strait, 30 October 1941'),
  'wyoming':        ('File:Schooner Wyoming, 1917.JPG', 'Wyoming, 1917 — the largest wooden schooner ever built'),
  'steamer':        ('File:SS Great Britain (6726649319).jpg', 'SS Great Britain — iron hull and screw propeller, preserved at Bristol'),
  'clipper':        ('File:Cutty Sark (January 2024) 04.jpg', 'Cutty Sark, preserved at Greenwich'),
  'container':      ('File:Mærsk Mc-Kinney Møller, making its maiden call in Busan, Korea.jpg', 'Mærsk Mc-Kinney Møller on her maiden call at Busan'),
  'carrier':        ('File:USS Gerald R. Ford (CVN 78) shock ttrial 1.jpg', 'USS Gerald R. Ford under way'),
  'trireme':        ('File:Olympias.1.JPG', 'Olympias — the full-scale trireme reconstruction, under oar'),
  'voyaging-canoe': ('File:Hokulea Homecoming 2017 (35397403656).jpg', 'Hōkūleʻa, the Polynesian voyaging canoe, on her 2017 homecoming'),
  'carrack':        ('File:Nao Victoria.jpg', 'A replica of the nao Victoria, the first ship to circumnavigate'),
  'caravel':        ('File:Caravel Boa Esperanca Portugal.jpg', 'The caravel Boa Esperança — the hull that opened the African coast'),
  'junk':           ('File:Chinese Junk Keying.jpg', 'The junk Keying, which sailed from China to London in 1846–48'),
  'east-indiaman':  ('File:East Indiaman Gotheborg - Tall Ships Race Helsinki Sandviken 2013 - 01.jpg', 'Götheborg, the East Indiaman reconstruction, under sail'),
  'ship-of-the-line':('File:HMS Victory 2007.jpg', 'HMS Victory, preserved at Portsmouth'),
  'fluyt':          ('File:Johannes Beerstraaten - A Dutch Flagship and a Fluyt Running into a Mediterranean Harbour.jpg', 'A fluyt running into harbour, by Beerstraaten. No fluyt survives; the type is known from paintings'),
  'longship':       ('File:Osebergskipet 2016.jpg', 'The Oseberg ship, buried about 834 and raised in 1904'),
  'treasure-ship':  ('File:Zheng He Treasure Ship Model (15829289311).jpg', 'A reconstruction model of a treasure ship — her true size is contested'),
  'slave-ship':     ('File:Brookes slave ship, British Library.jpg', 'The Brookes stowage diagram, 1788, published by abolitionists as evidence'),
  'ever-given':     ('File:EVER GIVEN (49643352087).jpg', 'Ever Given under way — 20,124 TEU on 399.94 m'),
  'azzam':          ('File:Azzam bei Lürssen.JPG', 'Azzam, the longest private motor yacht built'),
  'endurance':      ('File:Endurance trapped in pack ice.jpg', "Endurance beset in the Weddell Sea pack, photographed by Frank Hurley"),
  'queen-mary-2':   ('File:Hamburg, Hafen, Kreuzfahrtschiff -Queen Mary 2- -- 2016 -- 3050.jpg', 'Queen Mary 2 — the only ocean liner in scheduled service'),
  'usv':            ('File:U.S. Navy Saildrone Explorer unmanned surface vessel sails in the Gulf of Aqaba on 6 February 2022 (220206-N-KZ419-1151).JPG', 'A Saildrone Explorer under way — no crew aboard'),
}


def api(params):
    q = urllib.parse.urlencode(dict(params, format='json'))
    req = urllib.request.Request(API + '?' + q, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def lookup(title):
    """URL of a WIDTH-wide thumbnail, plus the licence block, in one call."""
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
             'iiprop': 'url|extmetadata|size', 'iiurlwidth': WIDTH})
    pages = d.get('query', {}).get('pages', {})
    for pid, page in pages.items():
        if pid == '-1' or 'imageinfo' not in page:
            return None
        ii = page['imageinfo'][0]
        em = ii.get('extmetadata', {})
        g = lambda k: (em.get(k, {}) or {}).get('value', '') or ''
        import re
        strip = lambda s: re.sub(r'<[^>]+>', '', s).strip()
        # ⚠ Commons wraps "Unknown author" in TWO spans, and stripping the tags glues the
        #   copies together — "Unknown authorUnknown author" reached a live credit line.
        #   A string that is exactly its own first half twice is the double-span case.
        undouble = lambda s: s[:len(s)//2] if s and len(s) % 2 == 0 and s[:len(s)//2] == s[len(s)//2:] else s
        clean = lambda s: undouble(strip(s))
        return {
            'title': page['title'],
            'thumb': ii.get('thumburl') or ii.get('url'),
            'descurl': ii.get('descriptionurl', ''),
            'licence': clean(g('LicenseShortName')) or 'see source',
            'artist': clean(g('Artist')) or 'unknown',
            'credit': clean(g('Credit')),
        }
    return None


def main():
    force = '--force' in sys.argv
    check = '--check' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    recs, missing, kept = [], [], 0

    for vid, (title, caption) in sorted(PLATES.items()):
        dest = os.path.join(OUT, vid + '.jpg')
        if os.path.exists(dest) and not force:
            kept += 1
            continue
        info = lookup(title)
        if not info or not info['thumb']:
            missing.append((vid, title)); print(f'  MISSING  {vid:18s} {title}'); continue
        if check:
            print(f'  ok       {vid:18s} {info["licence"]:22s} {title}'); continue
        req = urllib.request.Request(info['thumb'], headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=90) as r:
            data = r.read()
        with open(dest, 'wb') as f:
            f.write(data)
        recs.append({'source': 'wikimedia-commons', 'slug': vid, 'type': 'ships',
                     'name': info['title'], 'caption': caption,
                     'licence': info['licence'], 'authors': {info['artist']: 'All'},
                     'credit': info['credit'], 'url': info['descurl'],
                     'files': [f'web/data/assets/ships/{vid}.jpg']})
        print(f'  fetched  {vid:18s} {len(data)/1024:7.0f} kB  {info["licence"]}')
        time.sleep(0.4)                      # be a good citizen of someone else's API

    # ── THE RUNTIME MANIFEST ──────────────────────────────────────────────────────────
    # ASSETS.json is the licence book: complete, verbose, and for humans deciding what may be
    # republished. The CARD needs three short strings. Parsing the book at runtime would couple
    # the view to the paperwork's shape, so emit a small manifest beside it — rebuilt from the
    # book every run, so the two cannot drift.
    if recs:
        book = json.load(open(ASSETS))
        book['assets'] = [a for a in book['assets']
                          if not (a.get('type') == 'ships' and
                                  a.get('slug') in {r['slug'] for r in recs})] + recs
        json.dump(book, open(ASSETS, 'w'), indent=1, ensure_ascii=False)
        print(f'\n  ASSETS.json: {len(recs)} records written')

    book = json.load(open(ASSETS))
    plates = {a['slug']: {'caption': a.get('caption', ''),
                          'credit': ', '.join(a.get('authors', {}).keys()),
                          'licence': a.get('licence', ''),
                          'url': a.get('url', '')}
              for a in book['assets'] if a.get('type') == 'ships'}
    man = os.path.join(ROOT, 'web', 'data', 'plates.json')
    json.dump(plates, open(man, 'w'), indent=1, ensure_ascii=False)
    print(f'  plates.json: {len(plates)} entries')

    total = sum(os.path.getsize(os.path.join(OUT, f))
                for f in os.listdir(OUT) if f.endswith('.jpg')) if os.path.isdir(OUT) else 0
    print(f'  {kept} already present, {len(recs)} fetched, {len(missing)} missing, '
          f'{total/1e6:.1f} MB on disk')
    if missing:
        print('  ⚠ missing plates need a different Commons title — the card falls back to no image')
    return 0


if __name__ == '__main__':
    sys.exit(main())
