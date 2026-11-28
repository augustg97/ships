import sys
from pathlib import Path
W = Path('/Users/augustgweon/Ships/web/js')
def rep(path, old, new, count=1):
    p = W / path; s = p.read_text()
    n = s.count(old)
    assert n == count, (path, n, old[:70])
    p.write_text(s.replace(old, new))
HELPER = r'''/* ── ⚠ ONE DROPPED CONNECTION MUST NOT MOVE A SHIP (round 374) ──────────────────────
 * Level 1 of the terrain is 8 tile fetches and level 2 is 32, and loadLevel awaited them with
 * Promise.all, so a single ERR_CONNECTION_RESET failed the whole level. upgradeTerrain then
 * stopped at the coarser level, and every route in the era was planned on that coastline. A
 * route on a different coastline has a different length, so at the same frozen instant the
 * voyage stands at a different point on it. r373 captured the Syracuse trireme at 36°26′
 * against the baseline's 36°25′ (aboard-coast 17.996%) and the Sahul dugouts at 8°48′ against
 * 8°51′ (passage-sahul 24.618%), with a connection reset in each capture's console. The same
 * figures recurred in r322, r352 and r373, because the fault always leaves the same state. A
 * visitor on a poor connection got the same result: the coarse coastline, with no message.
 *
 * Every fetch the app makes goes through here, and the body is read inside the retry, because
 * a reset can also land mid-body. A network error or a 5xx is retried four times with a
 * growing pause. A 4xx is the server's answer and is thrown at once: plates.json and
 * provenance.json are legitimately absent from some builds. Under ?frozen a fetch that still
 * fails is recorded in fetchFaults, and markReady refuses. The capture then times out rather
 * than photographing a world built from part of its data. */
const fetchFaults = [];
APP.fetchFaults = fetchFaults;
async function fetchRetry(url, kind) {
  let err = null;
  for (let k = 0; k < 5; k++) {
    if (k) await new Promise(res => setTimeout(res, 200 * k * k));
    try {
      const r = await fetch(url);
      if (!r.ok) {
        err = new Error(url + ' → HTTP ' + r.status);
        if (r.status < 500) { err.status = r.status; throw err; }
        continue;
      }
      return kind === 'json' ? await r.json() : await r.blob();
    } catch (e) {
      if (e.status) throw e;                  /* a 4xx: the server answered, do not retry */
      err = e;
      if (k < 4) console.info('fetch retry', k + 1, url, String(e && e.message || e));
    }
  }
  fetchFaults.push(url);
  throw err;
}
window.fetchRetry = fetchRetry;

/* ── tile assembly ──────────────────────────────────────────────────────── */'''
rep('app.js', "/* ── tile assembly ──────────────────────────────────────────────────────── */", HELPER)
rep('app.js', """        const r = await fetch(`fields/z${level}/${tx}_${ty}.png`);
        const blob = await r.blob();
""", """        const blob = await fetchRetry(`fields/z${level}/${tx}_${ty}.png`, 'blob');
""")
rep('app.js', """  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  const bmp = await createImageBitmap(await r.blob(),""", """  const bmp = await createImageBitmap(await fetchRetry(url, 'blob'),""")
rep('app.js', "const manifest = await (await fetch('fields/tiles.json')).json();",
    "const manifest = await fetchRetry('fields/tiles.json', 'json');")
rep('app.js', "try { return await (await fetch(u + '?v=' + DV)).json(); } catch (e) { return null; }",
    "try { return await fetchRetry(u + '?v=' + DV, 'json'); } catch (e) { return null; }")
rep('app.js', """    let r = null;
    try { r = await fetch('data/provenance.json?v=' + DV); } catch (e) { r = null; }
    if (!r || !r.ok) return out;
    const P = await r.json();
""", """    let P = null;
    try { P = await fetchRetry('data/provenance.json?v=' + DV, 'json'); } catch (e) { P = null; }
    if (!P) return out;
""")
rep('app.js', "} catch (e) { console.warn('level', lv, 'failed', e); break; }",
    "} catch (e) {\n        console.warn('level', lv, 'failed', e);\n        if (FROZEN) fetchFaults.push('level ' + lv);   /* markReady refuses: see fetchRetry */\n        break;\n      }")
rep('app.js', "  if (FROZEN && !upgradesDone) return;\n",
    "  if (FROZEN && !upgradesDone) return;\n  /* and not on a world built from part of its data (fetchRetry, r374) */\n  if (FROZEN && fetchFaults.length) return;\n")
rep('route.js', "const blob = await (await fetch(name)).blob();", "const blob = await window.fetchRetry(name, 'blob');")
rep('battle.js', "fetch(sh.src).then(r => r.blob())", "window.fetchRetry(sh.src, 'blob')")
print('ok')
