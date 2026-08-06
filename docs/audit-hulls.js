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

    /* ⚠ A WALL YOU CAN SEE THROUGH FROM ASTERN IS NOT A WALL. The deckhouse shell is lofted by
       hand — tapered sides, sole, roof, two end caps, one buffer — and a hand-wound shell has
       faces pointing the wrong way somewhere. Under FrontSide those are simply not drawn, so
       the house has holes and WHICH holes depends on where you stand: 46 of 72 bearings hit a
       wall and 26 saw straight through to the funnel bases. A picture-diff cannot catch that
       either, because the picture is taken from one place. Fire a ring of rays through the
       LOWEST tier, which spans the whole house, and every bearing must hit something. */
    if (H.decks && house) {
      const g2 = g; g2.updateMatrixWorld(true);
      const isHouse = o => { const p = tagOf(o); return !!(p && (p.key === 'superstructure' || p.key === 'island')); };
      const hb = new THREE.Box3(); hb.makeEmpty();
      g2.traverse(o => { if (o.isMesh && isHouse(o)) hb.expandByObject(o); });
      /* ⚠ AND THE RAYS MUST BE AIMED AT THE HOUSE, NOT AT THE SHIP. The first version fired
         through the hull's centreline at a nominal deck height — which is above a 0.5 m
         steamer deckhouse entirely, and misses a carrier's island because an island is short
         and a flight deck is long. It reported 106 of 108 and 66 of 108 for two ships that are
         fine. Aim at the house's own centre, at fractions of the house's OWN height. */
      /* ⚠ AND ONLY WITHIN THE LOWEST DECK. A deckhouse STEPS IN as it rises — that is what a
         deckhouse is — so a ray at the height of the third tier passes beside it through open
         air, correctly. Sampling the house's full height called that a hole and flagged four
         ships that are right: 36 of 108 is exactly one of three heights, the stepped one.
         The bottom deck always spans the whole footprint, so that is where the question "can
         you see through the walls" actually has a yes-or-no answer. */
      const cx = (hb.min.x + hb.max.x) / 2, cz = (hb.min.z + hb.max.z) / 2;
      const deck1 = Math.min(H.beam * 0.105, Math.max(0.4, hb.max.y - hb.min.y));
      const rc = new THREE.Raycaster(); let through = 0, shot = 0;
      for (const f of [0.25, 0.5, 0.75]) {
        const y = hb.min.y + deck1 * f;
        for (let b = 0; b < 36; b++) {
          const th = b * Math.PI / 18;
          rc.set(new THREE.Vector3(cx + Math.cos(th) * 500, y, cz + Math.sin(th) * 500),
                 new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)).normalize());
          rc.far = 1200; shot++;
          if (!rc.intersectObject(g2, true).some(h => isHouse(h.object))) through++;
        }
      }
      if (through) say(v.id, 'you can see through the deckhouse',
                       `${through} of ${shot} bearings pass through the lowest tier`);
    }

    /* ⚠ A PART THAT TOUCHES NOTHING IS ATTACHED TO NOTHING. Found the container ship's funnel
       hanging seventeen metres from the hull with its base forty-seven metres up, and the boat-
       deck rails of the Great Eastern and the steamer floating three to five metres from their
       own stanchions — the rails had been left at a constant half-breadth when the posts were
       moved onto the lofted deck edge. Neither is visible from a single viewpoint, which is
       what the frame ratchet is. */
    {
      const parts = [];
      g.traverse(o => { if (o.isMesh && tagOf(o)) parts.push(new THREE.Box3().setFromObject(o)); });
      const pad = Math.max(0.25, H.loa * 0.004);
      const adrift = [];
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i].clone().expandByScalar(pad);
        let touches = false;
        for (let j = 0; j < parts.length && !touches; j++)
          if (j !== i && a.intersectsBox(parts[j])) touches = true;
        if (!touches) adrift.push(i);
      }
      if (adrift.length) say(v.id, 'part attached to nothing',
                             `${adrift.length} of ${parts.length} meshes touch no other part`);
    }

    /* ⚠ A MOTOR SHIP'S RUDDER IS UNDER THE COUNTER, AND THE FITTINGS FOLLOW THE BUILD.
       Found on the carrier from her stern quarter: the timber-era barn door hung on the
       sternpost stood 17 m past a nuclear carrier's transom and 4 m out of the water, in
       timber brown. No baseline bearing looks at the stern, so the ratchet sat green for as
       long as the ship has existed. On a steel or iron build the rudder stays below the
       waterline and inside the ship's own length. */
    if ((H.build === 'steel' || H.build === 'iron') && part.rudder) {
      if (part.rudder.y[1] > 0.5)
        say(v.id, 'rudder out of the water',
            `top at ${part.rudder.y[1].toFixed(1)} m on a ${H.build} build`);
      if (part.planking && part.rudder.x[1] > part.planking.x[1] + H.loa * 0.01)
        say(v.id, 'rudder hung past the stern',
            `${(part.rudder.x[1] - part.planking.x[1]).toFixed(1)} m beyond the hull`);
    }

    /* declared screws must be drawn, and a screw lives under water */
    if (H.screws) {
      if (!part.screw) say(v.id, 'declared but not drawn', 'screws');
      else if (part.screw.y[1] > 0)
        say(v.id, 'screws out of the water', `top at ${part.screw.y[1].toFixed(1)} m`);
    }

    /* ⚠ A FLIGHT DECK STANDS ON A HANGAR, NOT ON AIR. The deck was a slab floating over the
       hull — from any low bearing you saw under it, across open air, to the sea on the far
       side. The casing must exist and must span the gap from the sheer to the slab. */
    if (H.flightDeck) {
      if (!part.hangar) say(v.id, 'flight deck stands on air', 'no hangar casing built');
      else if (part.flightdeck &&
               (part.hangar.y[1] < part.flightdeck.y[0] - 1.0 ||
                part.hangar.y[0] > deckY + 1.0))
        say(v.id, 'hangar does not span the gap',
            `casing ${part.hangar.y[0].toFixed(1)}–${part.hangar.y[1].toFixed(1)} m, ` +
            `deck slab from ${part.flightdeck.y[0].toFixed(1)}, sheer ${deckY.toFixed(1)}`);
    }

    /* ⚠ THE DECK PARK PARKS CLEAR OF THE LANDING AREA. Declared aircraft must be drawn, at
       the declared count; each must stand ON the flight deck rather than float over it or
       sink through it; none may leave the deck; and none may sit inside the angled landing
       area — the strip's geometry comes from the builder's own landingStrip(), one
       derivation for the marks, the wires and this rule, so they cannot disagree. */
    if (H.deckPark) {
      const acs = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aircraft')
                          acs.push(o); });
      if (!acs.length) say(v.id, 'declared but not drawn', 'deck park');
      else {
        if (acs.length !== H.deckPark)
          say(v.id, 'deck park miscounted', `${H.deckPark} declared, ${acs.length} drawn`);
        const LS = SHIPS_HULL.landingStrip(H);
        const slabTop = part.flightdeck ? part.flightdeck.y[1] : 0;
        for (const ac of acs) {
          const ab = new THREE.Box3().setFromObject(ac);
          const cxA = (ab.min.x + ab.max.x) / 2, czA = (ab.min.z + ab.max.z) / 2;
          if (ab.min.y > slabTop + 1.0 || ab.min.y < slabTop - 1.8)
            say(v.id, 'aircraft not on the deck',
                `wheels at ${ab.min.y.toFixed(1)} m, deck about ${slabTop.toFixed(1)}`);
          if (Math.max(-ab.min.z, ab.max.z) > H.flightDeck * 0.5 + 0.5 ||
              Math.max(-ab.min.x, ab.max.x) > H.lwl * 0.51 + 0.5)
            say(v.id, 'aircraft off the deck',
                `at x ${cxA.toFixed(0)} z ${czA.toFixed(0)}`);
          const dx = cxA - LS.cx, dz = czA - LS.cz;
          const xl = dx * Math.cos(LS.rot) - dz * Math.sin(LS.rot);
          const zl = dx * Math.sin(LS.rot) + dz * Math.cos(LS.rot);
          if (Math.abs(zl) < LS.halfW + 4 && Math.abs(xl) < LS.halfLen + 9)
            say(v.id, 'aircraft parked foul of the landing area',
                `${zl.toFixed(1)} m off the axis at x ${cxA.toFixed(0)}`);
        }
      }
    }

    /* ⚠ THE DECK NARROWS AND THE CARGO MUST NARROW WITH IT. Found by the spin survey from
       every bow bearing of the container ship: the hatch covers, the forecastle and the outer
       container columns stood at one constant width on a hull whose deck tapers to the stem —
       up to 9 m past the ship's side at their own station, over open water. The beam-limit
       rule above cannot see it: B*0.52 is generous amidships and wrong at the bow. So ask at
       each part's OWN station, against the hull's own half-breadth, from the same
       surfacePoint the builder lofts from — one derivation of the edge. */
    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);
      let over = 0, worst = 0;
      g.traverse(o => {
        if (!o.isMesh) return;
        const p = tagOf(o);
        if (!p || (p.key !== 'container' && p.key !== 'forecast')) return;
        const bb = new THREE.Box3().setFromObject(o);
        const u = Math.max(0.001, Math.min(0.999, 0.5 + ((bb.min.x + bb.max.x) / 2) / H.lwl));
        const allow = Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1.0)[2]) +
                      Math.max(1.5, H.beam * 0.033);
        const z = Math.max(-bb.min.z, bb.max.z);
        if (z > allow) { over++; worst = Math.max(worst, z - allow); }
      });
      if (over) say(v.id, 'cargo off the deck edge',
                    `${over} meshes reach up to ${worst.toFixed(1)} m past the hull side at their own station`);
    }

    /* ⚠ THE BRIDGE MUST SEE OVER THE STOW. The ship's own card says it — "the bridge has to
       see over a stack that may be twelve high" — and the model broke it: the stack amidships
       reached 21.3 m above deck and the top of the house 18.1, a ship that could not be
       conned. The wheelhouse roof stands clear above the tallest box, and this asserts the
       clearance rather than the styling. */
    if (H.containers && part.container && part.bridge &&
        part.container.y[1] > part.bridge.y[1] - 2.0)
      say(v.id, 'the bridge cannot see over the stow',
          `stack top ${(part.container.y[1] - deckY).toFixed(1)} m above deck, ` +
          `house top ${(part.bridge.y[1] - deckY).toFixed(1)} m`);

    rows.push({ id: v.id, loa: H.loa, airAboveDeck: +airM.toFixed(1),
                parts: Object.keys(part).length,
                funnelH: part.funnel ? +(part.funnel.y[1] - deckY).toFixed(1) : null });
  }
  return { problems, checked: rows.length, rows };
})()
