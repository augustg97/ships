/* ── THE HULL AUDIT ───────────────────────────────────────────────────────────────────────
 * Paste into the console on any page of the app, or run it from a capture harness.
 *
 * WHY THIS EXISTS. The frame ratchet compares each view against its own last picture, so it
 * catches CHANGE and is blind to WRONGNESS: `ship-titanic` sat green for rounds while showing a
 * liner with no superstructure, four funnels stacked into two positions in her after half, and
 * 47 m of stack against a real 19. `ship-container` sat green while photographing the ship of
 * the line. A baseline says "the same as last time"; it never says "right".
 *
 * So this asks questions of the MODEL rather than of the picture, and every one of them is a
 * fact about ships rather than a threshold someone liked the look of:
 *
 *   AIR DRAUGHT. Nothing above a hull's deck is taller than the hull is long. Masts and funnels
 *     have real proportions and a 263 m battleship does not carry a 126 m mast.
 *   THE SILHOUETTE IS BUILT. A ship that declares funnels or turrets or boxes must draw them,
 *     and a steam vessel that declares decks must have a deckhouse with geometry in it — the
 *     Titanic's superstructure was tagged and EMPTY, which no picture-diff can see.
 *   FUNNELS DO NOT SHARE A FRAME. Two uptakes at the same station is two boiler casings in one
 *     place. Checked against the drawn positions, not the intended ones.
 *   NOTHING HANGS OVER THE SIDE. A deckhouse wider than the beam is the jutting fault of round
 *     4, and it is cheap to assert against forever.
 *   FUNNEL AND MAST PROPORTIONS. Against the vessel's own stated dimensions, with the bounds
 *     wide enough that only an absurdity trips them.
 *
 * Add a rule whenever a fault gets past the ratchet. That is the whole discipline: the picture
 * ratchet defends against regression, this defends against being wrong in the first place.
 */
(function auditHulls() {
  /* ⚠ NOT window.APP. Classic scripts share one global SCOPE, but a top-level `const` creates
     a lexical binding rather than a property of window — so `window.APP` is undefined while
     bare `APP` resolves. This project has been caught by that twice; the audit was caught by it
     on its first run and reported a clean sweep of zero ships. */
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const problems = [];
  const rows = [];
  const say = (id, rule, detail) => problems.push({ id, rule, detail });

  for (const v of list) {
    if (!v.hull) continue;
    const H = v.hull;
    let g = null;
    try { g = SHIPS_HULL.buildShip(H, { fine: true }); }
    catch (e) { say(v.id, 'BUILD THREW', e.message); continue; }

    /* what actually got built, by part and by mesh */
    /* ⚠ AND A TAG SITS ON THE GROUP, NOT ON EVERY MESH IN IT. First run, this asked for
       `o.isMesh && userData.part` and reported that the Titanic had no superstructure and the
       container ship no containers — both of which are groups carrying one tag over untagged
       children. The audit was wrong about two of the three things it was built to catch. A part
       is the nearest tagged ANCESTOR of a mesh. */
    const tagOf = o => { for (let e = o; e; e = e.parent)
                           if (e.userData && e.userData.part) return e.userData.part;
                         return null; };
    const part = {};
    g.traverse(o => {
      if (!o.isMesh) return;
      const p = tagOf(o);
      if (!p) return;
      const bb = new THREE.Box3().setFromObject(o);
      const e = part[p.key] || (part[p.key] = { n: 0, x: [1e9, -1e9], y: [1e9, -1e9], z: [1e9, -1e9], xs: [] });
      e.n++; e.xs.push((bb.min.x + bb.max.x) / 2);
      e.x[0] = Math.min(e.x[0], bb.min.x); e.x[1] = Math.max(e.x[1], bb.max.x);
      e.y[0] = Math.min(e.y[0], bb.min.y); e.y[1] = Math.max(e.y[1], bb.max.y);
      e.z[0] = Math.min(e.z[0], bb.min.z); e.z[1] = Math.max(e.z[1], bb.max.z);
    });
    const deckY = part.deck ? part.deck.y[1] : 0;
    const bb = new THREE.Box3().setFromObject(g);
    const airM = bb.max.y - deckY;

    /* ── the rules ─────────────────────────────────────────────────────────────────── */
    /* ⚠ AND A SQUARE-RIGGER'S MAST TRUCK GENUINELY APPROACHES HER OWN LENGTH — a 57 m ship of
       the line carries 58 m of rig, which is correct and which this rule called a fault on its
       first run. The limit belongs to the KIND of ship: sail is tall by construction, and a
       motor vessel with nothing but a funnel and a mast is not. */
    /* a rigid wing is sail: the USV's 14.8 m wing on a 22 m hull is her whole propulsion */
    const carriesSail = !!H.wingSail ||
      (H.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole');
    const airLimit = carriesSail ? H.loa * 1.15 : H.loa * 0.35;
    if (airM > airLimit)
      say(v.id, 'air draught', `${airM.toFixed(0)} m above deck on a ${H.loa} m hull` +
                               (carriesSail ? ' (square rig)' : ' (no sail)'));

    for (const [flag, key, label] of [['funnels', 'funnel', 'funnels'],
                                      ['turrets', 'turret', 'turrets'],
                                      ['boats', 'boat', 'boats'],
                                      ['containers', 'container', 'containers'],
                                      ['flightDeck', 'flightdeck', 'a flight deck']])
      if (H[flag] && !part[key]) say(v.id, 'declared but not drawn', label);

    /* ⚠ a carrier's superstructure IS her island, and hull.js says so explicitly — the generic
       deckhouse builder is skipped for her on purpose. The rule asks for a superstructure, not
       for one particular shape of it. */
    const house = part.superstructure || part.island;
    if (H.decks && !house)
      say(v.id, 'no superstructure', `decks: ${H.decks} and nothing built`);
    if (H.decks && house && house.n < H.decks)
      say(v.id, 'thin superstructure', `${house.n} meshes for ${H.decks} decks`);
    /* ⚠ AND IT HAS TO BE ABOVE THE DECK. The Titanic's deckhouse walls were built about their
       own centre and never positioned, so they sat at y = 0 — below her waterline — while the
       railings alone stood correctly. The house existed, was tagged, had 256 meshes, and was
       inside the hull. Ask where it IS, not merely whether it is there. */
    if (H.decks && house && house.y[1] < deckY)
      say(v.id, 'superstructure below deck',
          `house top ${house.y[1].toFixed(1)} m, deck ${deckY.toFixed(1)} m`);

    if (part.funnel && H.funnels > 1) {
      /* funnel centres, deduplicated: two uptakes in one frame is two casings in one place */
      const c = part.funnel.xs.slice().sort((a, b) => a - b);
      const distinct = c.filter((x, i) => i === 0 || Math.abs(x - c[i - 1]) > H.loa * 0.02);
      if (distinct.length < H.funnels)
        say(v.id, 'funnels share a station',
            `${H.funnels} declared, ${distinct.length} distinct positions`);
      const fh = part.funnel.y[1] - deckY;
      if (fh > H.beam * 1.35)
        say(v.id, 'funnel height', `${fh.toFixed(0)} m above deck on a ${H.beam} m beam`);
    }

    /* ⚠ and on a carrier the reference is the FLIGHT DECK, which overhangs the hull by design —
       that is the whole point of an angled deck. Comparing her island to the hull beam called a
       correct 35 m a fault. */
    const halfWide = (H.flightDeck ? H.flightDeck : H.beam) * 0.52;
    for (const k of ['superstructure', 'island', 'container', 'turret'])
      if (part[k] && Math.max(-part[k].z[0], part[k].z[1]) > halfWide)
        say(v.id, 'overhangs the side',
            `${k} reaches ${Math.max(-part[k].z[0], part[k].z[1]).toFixed(1)} m off centre, limit ${halfWide.toFixed(1)}`);

    rows.push({ id: v.id, loa: H.loa, airAboveDeck: +airM.toFixed(1),
                parts: Object.keys(part).length,
                funnelH: part.funnel ? +(part.funnel.y[1] - deckY).toFixed(1) : null });
  }
  return { problems, checked: rows.length, rows };
})()
