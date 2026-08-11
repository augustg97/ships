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
                                      ['flightDeck', 'flightdeck', 'a flight deck'],
                                      ['aaLight', 'aaLight', 'the light AA battery'],
                                      ['searchlights', 'searchlight', 'searchlights'],
                                      ['floatplanes', 'floatplane', 'floatplanes'],
                                      ['deckHatches', 'hatch', 'stowage hatches']])
      if (H[flag] && (!Array.isArray(H[flag]) || H[flag].length) && !part[key]
          /* a boatsInboard record EXPLAINS the absence: the tenders live in a garage
             inside the shell, so a declared count rightly draws nothing topside */
          && !(flag === 'boats' && H.boatsInboard))
        say(v.id, 'declared but not drawn', label);

    /* ── THE DRESS IS A DATE (round 32). The plating shader keys fastening and bottom colour
       off the year the hull is depicted at; a steel hull with no year silently falls back to
       the Victorian scheme, which is exactly the fleet-wide anachronism the era key was built
       to end. And a cove line on a post-1950 hull is that anachronism declared in the data:
       the gilt cove is Victorian/Edwardian liner dress, gone from the record by the welded
       era. Geometry cannot show either fault, so the DATA is audited. */
    if (H.iron && !H.year)
      say(v.id, 'no dress era', 'iron hull without year — shader falls back to Victorian dress');
    if (H.iron && H.year >= 1950 && H.cove)
      say(v.id, 'anachronistic dress', `cove line declared on a ${H.year} welded hull`);

    /* ── THE HOUSE STANDS AT THE RECORD'S HEIGHT (round 34). Titanic's freeboard carried her
       BOAT-DECK height (18.5 m) where the fleet convention is waterline-to-shell-deck, so the
       drawn boat deck stood 30.3 m over the water against the record's 19 — the whole profile
       1.6× too tall, and her masts level with her funnels instead of 20 m over them. Where
       the record supplies the datum (boatDeckM), the derivation the house, boats and funnels
       all stand on — freeboard + decks·(deckM, or beam·0.105 where no tween-deck is
       recorded) — must land on it. Recessed boats (boatsRecessed) stow at the FOOT of the
       house, on the first tier above the shell, so their datum is that sole, not the roof
       — Queen Mary 2's Deck 8 gallery, not a boat deck she does not have. */
    if (H.boatDeckM && H.decks) {
      const dh = H.deckM || H.beam * 0.105;
      const top = H.freeboard + (H.boatsRecessed ? (H.shellTiers || 0) : H.decks) * dh;
      if (Math.abs(top - H.boatDeckM) > 0.5)
        say(v.id, 'house off the record',
            `boat deck derives to ${top.toFixed(1)} m over water, record says ${H.boatDeckM}`);
    }
    /* and the MAST TOPS likewise (mastTopM, above the load line — the aerial height the
       record states). Measured off the built geometry, so rake and stepping are included. */
    if (H.mastTopM && part.mast) {
      if (Math.abs(part.mast.y[1] - H.mastTopM) > 1.5)
        say(v.id, 'mast tops off the record',
            `tallest mast ${part.mast.y[1].toFixed(1)} m over water, record says ${H.mastTopM}`);
    }

    /* ── THE CLUSTER HONOURS ITS DERIVED RECORD (round 73). A `cluster` record is
       plate-derived — every number in it was measured off the vessel's own photograph and
       the card says so — and Azzam shipped three rounds as a bare white wedge because
       nothing asked for the cluster she needed. So: it must be DRAWN; it must STAND ON
       the house roof it claims (the linerHouse derivation — freeboard + decks·deckM),
       neither floating above it nor reaching down inside the house; and its tallest
       fixed structure must top out at the derived pipe height (the upper radome pair
       derives to the same height on the plate, hence the tolerance). The MAST is tagged
       'mast' and the existing mastTopM rule measures it. */
    if (H.cluster) {
      const cl = part.cluster;
      if (!cl) say(v.id, 'cluster declared but not drawn', 'cluster record with no geometry');
      else {
        const dh2 = H.deckM || H.beam * 0.105;
        const roofY = H.freeboard + (H.decks || 0) * dh2;
        /* ── THE FLOOR IS THE LOWEST DECLARED FOOTING (round 77). A dome's onTier and
           the fairing's fairFootTier land on that tier's roof — freeboard + (tier+1)·deck
           — a full module below the house top the rest of the cluster stands on. Azzam's
           aft domes and fairing foot the tier-3 terrace at 19.4 m; against a 22 m house
           top alone that healthy geometry would read as 'reaches into the house'. */
        const tierRoofY = ti => H.freeboard + (ti + 1) * dh2;
        let floorY = roofY;
        for (const d of H.cluster.domes || [])
          if (!d.upper && d.onTier !== undefined) floorY = Math.min(floorY, tierRoofY(d.onTier));
        if (H.cluster.fairFootTier !== undefined)
          floorY = Math.min(floorY, tierRoofY(H.cluster.fairFootTier));
        if (cl.y[0] < floorY - 1.5)
          say(v.id, 'cluster reaches into the house',
              `lowest cluster vertex ${cl.y[0].toFixed(1)} m over water, lowest declared footing ${floorY.toFixed(1)}`);
        if (cl.y[0] > floorY + 0.6)
          say(v.id, 'cluster floats above its roof',
              `lowest cluster vertex ${cl.y[0].toFixed(1)} m over water, lowest declared footing ${floorY.toFixed(1)}`);
        if (H.cluster.stack && Math.abs(cl.y[1] - H.cluster.stack.topFwdM) > 1.5)
          say(v.id, 'cluster off its derived height',
              `tallest cluster vertex ${cl.y[1].toFixed(1)} m over water, derived record says ${H.cluster.stack.topFwdM}`);
      }
      /* ── AND EACH FOOT HAS ITS OWN TIER UNDER IT (round 74, tier-footed round 77).
         houseCrest narrows the top tier and tierAftU pins a measured terrace edge, and
         every cluster element stands on SOME tier's roof — the block ends and undeclared
         domes on the crest, a dome with onTier or the fairing foot with fairFootTier on
         that tier's terrace. Each foot must land inside its own tier's u-span, or its
         pedestal stands at deck height with air below (the height rules above cannot see
         this: the lowest cluster vertex stays on a deck while one dome hangs past an
         edge). Both derivations are the record's, so this fires on the mismatch, not on
         a healthy build. */
      if (H.decks && SHIPS_HULL.linerHouse) {
        const T2 = SHIPS_HULL.linerHouse(H);
        const top = T2.n - 1;
        const feet = [];
        if (H.cluster.blockU)
          feet.push(['block fwd', H.cluster.blockU[0], top], ['block aft', H.cluster.blockU[1], top]);
        for (const d of H.cluster.domes || [])
          if (!d.upper) feet.push(['dome', d.u, d.onTier !== undefined ? d.onTier : top]);
        if (H.cluster.fairAftU !== undefined)
          feet.push(['fairing foot', H.cluster.fairAftU,
                     H.cluster.fairFootTier !== undefined ? H.cluster.fairFootTier : top]);
        for (const [what, u, ti] of feet) {
          const t = T2.tiers[ti];
          if (!t) {
            say(v.id, 'cluster foot on a tier the house does not have',
                `${what} declares tier ${ti}, the house has tiers 0–${top}`);
            continue;
          }
          if (u < t.uA - 0.005 || u > t.uB + 0.005)
            say(v.id, 'cluster foot off its tier',
                `${what} at u ${u.toFixed(3)}, tier ${ti}${ti === top ? ' (crest)' : ''} spans ${t.uA.toFixed(3)}–${t.uB.toFixed(3)}`);
        }
      }
    }

    /* ── A DECLARED BAND IS WORN (round 75). tierBands/shellBands are photograph-derived —
       Queen Mary 2's balcony rows and strake colonnade, Azzam's tinted glazing runs — and
       both ships shipped for rounds wearing the Edwardian small-lights default because
       nothing asked the walls what colour they actually carry. So ask the vertices: in every
       banded tier's own y-span, a floor fraction of the superstructure wall vertices must
       carry band glass. ⚠ VERTEX COLOURS READ BACK LINEAR, not sRGB — three.js converts on
       set — so the thresholds live in linear space: band glass is under 0.07 luminance there,
       the liner's small-light glass is 0.185, white faces 0.75. Dark means < 0.10, which a
       builder that skips the band branch cannot reach. The recess tier never bands. */
    if ((H.tierBands || H.shellBands) && H.decks && SHIPS_HULL.linerHouse) {
      const T3 = SHIPS_HULL.linerHouse(H);
      const walls = [];
      g.traverse(o => { if (o.isMesh && tagOf(o) && tagOf(o).key === 'superstructure'
                        && o.geometry.attributes && o.geometry.attributes.color) walls.push(o); });
      const scan = (y0, y1) => {
        let dark = 0, light = 0, all = 0;
        for (const m of walls) {
          const P = m.geometry.attributes.position, C = m.geometry.attributes.color;
          for (let i = 0; i < P.count; i++) {
            const y = P.getY(i);
            if (y < y0 + 0.05 || y > y1 - 0.05) continue;
            all++;
            const l = 0.2126 * C.getX(i) + 0.7152 * C.getY(i) + 0.0722 * C.getZ(i);
            if (l < 0.10) dark++; else if (l > 0.4) light++;
          }
        }
        return { dark, light, all };
      };
      for (let i = 0; i < T3.n; i++) {
        const t = T3.tiers[i];
        const TBr = H.tierBands, SBr = H.shellBands;
        const b = (TBr && !t.recess && i >= TBr.from && i <= TBr.to) ? TBr
                : ((SBr && t.shell && !t.recess) ? SBr : null);
        if (!b) continue;
        const r = scan(t.y0, t.y1);
        if (!r.all || r.dark / Math.max(1, r.all) < 0.08)
          say(v.id, 'band declared but not worn',
              `tier ${i}: ${r.dark} of ${r.all} wall vertices carry band glass`);
        /* and a shell strake wears its RECORDED paint — shellTopside declared white and a
           builder that ignores it paints the strake the hull's black, which the band rule
           cannot see (the glass is dark either way) */
        if (t.shell && H.shellTopside && r.all && r.light / r.all < 0.3)
          say(v.id, 'strake off its recorded paint',
              `tier ${i}: ${r.light} of ${r.all} wall vertices carry the shellTopside livery`);
      }
    }

    /* ── AND THE BOATS STAND ON THEIR RECORDED DECK (round 75). The boatDeckM datum rule
       above checks the DATA is self-consistent; this one asks the BUILT boats. Queen Mary 2
       hung her gallery two decks low for five rounds — record 17.0, first-tier default,
       both wrong together, so the datum rule agreed with the fault. The photograph put the
       gallery at 23.4 m; now the lowest drawn boat must sit on the recorded deck. */
    if (H.boatDeckM && H.boats && part.boat)
      if (Math.abs(part.boat.y[0] - H.boatDeckM) > 1.5)
        say(v.id, 'boats off their recorded deck',
            `lowest boat at ${part.boat.y[0].toFixed(1)} m over water, record says ${H.boatDeckM}`);

    /* ── AND AN INBOARD RECORD KEEPS THE TOPSIDE BARE (round 76). Azzam's four builder-
       default boats rode her crest for six rounds while the published accounts stow her
       tenders in a garage inside the hull — the design grew 35 m partly to fit them — and
       her own delivery photograph shows no boat on any deck. Where the record says
       boatsInboard, a drawn boat is the builder contradicting the ship's photograph. The
       declared-but-not-drawn rule above skips boats for the same record, so a ship with a
       published count AND a garage cannot deadlock the two rules. */
    if (H.boatsInboard && part.boat)
      say(v.id, 'boats drawn against an inboard record',
          `${part.boat.n} boat meshes topside; the record stows the tenders inside the shell`);

    /* ── A RECORDED RAKE IS A LEAN (round 70). stemRake·loa is the overhang of the stem
       head PAST the waterline ending — Queen Mary 2 declared 0.085 and drew a blunt
       vertical bow for three rounds, because the offset was applied uniformly at every
       height: a vertical stem pushed bodily forward, which no picture-diff and no
       record-match can see. So the lean is measured off the planking's own vertices —
       foremost point at the waterline against foremost at the sheer, and the same aft.
       Skipped where the recorded overhang is under 1.5 m: at that size the lean is inside
       the mesh's own discretization. */
    {
      let pk = null;
      g.traverse(o => { if (!pk && o.isMesh && tagOf(o) && tagOf(o).key === 'planking') pk = o; });
      if (pk && pk.geometry && pk.geometry.attributes.position) {
        const P = pk.geometry.attributes.position;
        const wlBand = Math.min(0.6, 0.25 * H.draught + 0.1);
        /* ⚠ each end's deck band is measured from that END's own sheer height — one global
           top-y band lands only where the sheer is highest, and on a bow-sheer-only hull
           (Queen Mary 2) the stern band was empty and the rule read -287 m of lean */
        let topB = -1e9, topS = -1e9;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i);
          if (x < 0) topB = Math.max(topB, y); else topS = Math.max(topS, y);
        }
        let foreWL = 1e9, foreDk = 1e9, aftWL = -1e9, aftDk = -1e9;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i);
          if (Math.abs(y) < wlBand) { foreWL = Math.min(foreWL, x); aftWL = Math.max(aftWL, x); }
          if (x < 0 && y > topB - 1.2) foreDk = Math.min(foreDk, x);
          if (x > 0 && y > topS - 1.2) aftDk = Math.max(aftDk, x);
        }
        for (const [name, want, got] of [
            ['stem', H.stemRake * H.loa, foreWL - foreDk],
            ['sternpost', H.sternRake * H.loa, aftDk - aftWL]]) {
          if (want > 1.5 && Math.abs(got - want) > Math.max(1.2, want * 0.4))
            say(v.id, 'a recorded rake drawn vertical',
                `${name}: record asks a ${want.toFixed(1)} m lean, drawn ${got.toFixed(1)} m`);
        }
      }
    }

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

    /* ── THE RAKE IS WORN (round 37; measurement rebuilt round 72). funnelRake is the
       record's inclination in degrees aft — Yamato's trunked uptake leaned 25°, the
       Olympic class 9.46°, Dreadnought's stacks stood plumb (0) — and a lean that
       silently stops being applied is invisible to every rule above: the funnel is
       present, at its station, at its height, and WRONG. The lean is measured off the
       stack's own VERTICES — the centroid of its bottom height band against the centroid
       of its top band, both taken to world space — because round 72 bakes the rake into
       the geometry as a horizontal-cut incline, and a matrix-axis reading of a sheared
       mesh is 0° forever. Vertices are what the viewer sees; a tilt, a shear, or any
       future mechanism measures the same. +x is aft. Every stack is measured and the
       worst one answers, so one plumb funnel among raked sisters is caught too. */
    if (H.funnels && part.funnel) {
      const want = H.funnelRake !== undefined ? H.funnelRake : 4.87;
      let worst = null;
      g.updateMatrixWorld(true);
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Funnel') return;
        const pos = o.geometry.attributes.position;
        o.geometry.computeBoundingBox();
        const bbL = o.geometry.boundingBox, span = bbL.max.y - bbL.min.y;
        if (!pos || span < 1e-6) return;
        const lo = bbL.min.y + span * 0.15, hi = bbL.max.y - span * 0.15;
        const a = new THREE.Vector3(), b = new THREE.Vector3(), v = new THREE.Vector3();
        let na = 0, nb = 0;
        for (let j = 0; j < pos.count; j++) {
          v.fromBufferAttribute(pos, j);
          if (v.y <= lo) { a.add(v); na++; }
          else if (v.y >= hi) { b.add(v); nb++; }
        }
        if (!na || !nb) return;
        a.divideScalar(na).applyMatrix4(o.matrixWorld);
        b.divideScalar(nb).applyMatrix4(o.matrixWorld);
        const d = b.sub(a);
        const got = Math.atan2(d.x, d.y) * 180 / Math.PI;
        if (worst === null || Math.abs(got - want) > Math.abs(worst - want)) worst = got;
      });
      if (worst === null)
        say(v.id, 'funnel rake unmeasurable', 'no stack mesh tagged Funnel');
      else if (Math.abs(worst - want) > 1.5)
        say(v.id, 'funnel rake not worn',
            `drawn ${worst.toFixed(1)}° aft, record says ${want}°`);
    }

    /* ── THE TRIPOD IS WORN (round 38). `tripod` on a mast record is structure, not
       decoration: two struts leaning to the pole and a spotting top at their join. The
       round-37 class again — a declared build feature that silently stops producing
       geometry, or produces it standing straight up, is invisible to every picture and
       to 'declared but not drawn', because the MAST is drawn. Count the legs, count the
       tops, and measure the lean of every leg the way the rake rule measures the stack:
       the world direction of the strut's own +y axis. */
    const tripods = (H.masts || []).filter(mk => mk.tripod).length;
    if (tripods) {
      let legs = 0, tops = 0, uprightLegs = 0;
      g.updateMatrixWorld(true);
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part) return;
        if (o.userData.part.name === 'Tripod leg') {
          legs++;
          const d = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
          if (Math.acos(Math.min(1, Math.abs(d.y))) * 180 / Math.PI < 6) uprightLegs++;
        }
        if (o.userData.part.name === 'Spotting top') tops++;
      });
      if (legs !== tripods * 2)
        say(v.id, 'tripod not worn',
            `${tripods * 2} struts in the record, ${legs} drawn`);
      if (tops !== tripods)
        say(v.id, 'tripod not worn',
            `${tripods} spotting tops in the record, ${tops} drawn`);
      if (uprightLegs)
        say(v.id, 'tripod not worn',
            `${uprightLegs} strut(s) standing vertical — a tripod's legs LEAN`);
    }

    /* ── THE WING BATTERY IS ON THE WING (round 38). `turretSide` stands a main mount at
       the deck edge; ignore it silently and five declared turrets still draw five groups —
       two of them coincident on the centreline, which no count can see. The drawn battery's
       sides must match the record's, sign for sign. */
    if (H.turrets && H.turretAt && H.turretSide) {
      const wantSides = H.turretAt.slice(0, H.turrets)
        .map((u, i) => H.turretSide[i] || 0).sort();
      const mains = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part &&
                            o.userData.part.key === 'turret' &&
                            o.userData.part.name === 'Main battery')
                          mains.push(o); });
      const gotSides = mains.map(o => {
        const bbx = new THREE.Box3().setFromObject(o);
        const zc = (bbx.min.z + bbx.max.z) / 2;
        return zc > H.beam * 0.12 ? 1 : zc < -H.beam * 0.12 ? -1 : 0;
      }).sort();
      if (wantSides.join() !== gotSides.join())
        say(v.id, 'wing turret not on the wing',
            `record sides [${wantSides.join()}], drawn [${gotSides.join()}]`);
    }

    /* ── THE NET DEFENCE IS WORN (round 39). `netDefence` hangs the anti-torpedo outfit
       on the hull side: the shelf, the rolled net, and the record's 40 ft booms stowed in
       the row of down-aft diagonals that is the most conspicuous thing in photograph
       H61017. The round-37 class again — a declared fitting that silently stops producing
       geometry, or produces it floating, level, or off the plating, is invisible to the
       one baseline bearing. One derivation — SHIPS_HULL.netDefenceGeom — for the builder
       and this rule. Each boom must lie ALONG the hull (fore-aft), DROOP (stowed spars
       trail down toward the tip), ride ON the plating at its own station, stay out of the
       water and under the deck edge; the shelf must span the declared run. */
    if (H.netDefence) {
      const G = SHIPS_HULL.netDefenceGeom(H);
      const HSn = SHIPS_HULL.hullSurface(H);
      const booms = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.name === 'Net boom') booms.push(o); });
      if (booms.length !== G.heels.length * 2)
        say(v.id, 'net defence not worn',
            `${G.heels.length * 2} booms derived from the record, ${booms.length} drawn`);
      for (const o of booms) {
        const d = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
        if (Math.abs(d.x) < 0.85 || Math.abs(d.y) < 0.10 || Math.abs(d.y) > 0.50)
          say(v.id, 'net boom not stowed',
              `a boom points (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${d.z.toFixed(2)}) — ` +
              'stowed spars lie fore-and-aft against the hull, drooping to the tip');
        const bbx = new THREE.Box3().setFromObject(o);
        const u = Math.max(0.001, Math.min(0.999, 0.5 + ((bbx.min.x + bbx.max.x) / 2) / H.lwl));
        if (bbx.min.y < 0.3)
          say(v.id, 'net boom in the water', `bottom at ${bbx.min.y.toFixed(2)} m`);
        if (bbx.max.y > HSn.sheer(u) + 0.3)
          say(v.id, 'net boom above the deck edge',
              `top ${bbx.max.y.toFixed(1)} m, sheer there ${HSn.sheer(u).toFixed(1)} m`);
        const zc = (Math.abs(bbx.min.z) + Math.abs(bbx.max.z)) / 2;
        const k = Math.max(0, Math.min(1, (G.shelfY - G.drop / 2) / HSn.sheer(u)));
        const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSn, u, 0.62 + 0.38 * k)[2]);
        if (zc < half - 0.7 || zc > half + 1.4)
          say(v.id, 'net boom off the plating',
              `boom centre ${zc.toFixed(1)} m off the centreline, hull side there ${half.toFixed(1)} m`);
      }
      if (!part.net) say(v.id, 'declared but not drawn', 'net defence');
      else {
        const span = part.net.x[1] - part.net.x[0];
        const want = (G.u1 - G.u0) * H.lwl;
        if (span < want * 0.85)
          say(v.id, 'net shelf short',
              `${span.toFixed(0)} m drawn against ${want.toFixed(0)} m in the record`);
      }
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

    /* ── THE PADDLE BOX MUST BE THERE FROM OUTSIDE (round 40). The box was a hand-wound
       strip whose every face pointed INWARD at the wheel. computeVertexNormals derives
       normals from the winding, so the round-35 winding rule saw agreement; the ratchet saw
       no change because a box that was never drawn never changes; and under FrontSide the
       largest object on the ship's side was culled from every bearing — the ship wore a
       naked wheel with eleven ribs floating beside it. Which way a surface faces is a
       RENDER fact, so ask it the way the renderer does: rays from far abeam, aimed at the
       box's own face, must strike the box FIRST — a ray that reaches the wheel arms, the
       hull, or nothing has passed through the housing. Raycaster honours material.side,
       which is exactly why this catches what a bounding-box test cannot. */
    if (H.paddleDia) {
      const pb = part.paddlebox;
      if (!pb) say(v.id, 'paddle box not built', 'a paddle steamer with an open wheel');
      else {
        const D = H.paddleDia;
        if (pb.x[1] - pb.x[0] < D * 0.9)
          say(v.id, 'paddle box does not span its wheel',
              `box ${(pb.x[1] - pb.x[0]).toFixed(1)} m fore-and-aft on a ${D} m wheel`);
        if (!(pb.z[0] < 0 && pb.z[1] > 0))
          say(v.id, 'paddle box on one side only',
              `z ${pb.z[0].toFixed(1)}..${pb.z[1].toFixed(1)} m`);
        g.updateMatrixWorld(true);
        const isPB = o => { const p = tagOf(o); return !!(p && p.key === 'paddlebox'); };
        const rc = new THREE.Raycaster();
        const cx = (pb.x[0] + pb.x[1]) / 2, W = pb.x[1] - pb.x[0], Hh = pb.y[1] - pb.y[0];
        let miss = 0, shot = 0, sample = '';
        for (const sgn of [1, -1])
          for (const fx of [-0.30, -0.15, 0, 0.15, 0.30])
            for (const fy of [0.20, 0.40, 0.60]) {
              rc.set(new THREE.Vector3(cx + fx * W, pb.y[0] + fy * Hh, sgn * 500),
                     new THREE.Vector3(0, 0, -sgn));
              rc.far = 1000; shot++;
              const h = rc.intersectObject(g, true);
              if (!h.length || !isPB(h[0].object)) {
                miss++;
                if (!sample) sample = h.length
                  ? `first hit at (${fx}, ${fy}) is ${(tagOf(h[0].object) || { key: 'untagged' }).key}`
                  : `the ray at (${fx}, ${fy}) hits nothing at all`;
              }
            }
        if (miss) say(v.id, 'you can see through the paddle box',
                      `${miss} of ${shot} rays from abeam do not strike the box first — ${sample}`);
      }
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

    /* ⚠ A BATTLESHIP'S TURRETS ARE HER SILHOUETTE, AND FOR FOUR ROUNDS THEY WERE INSIDE THE
       DECKHOUSE. The liner superstructure ran 80% of Yamato's length and the three main
       turrets stood buried in it — declared, drawn, tagged, and invisible from all twelve
       bearings. 'Declared but not drawn' cannot see it because they WERE drawn. Ask whether
       any turret's flesh is inside the house's flesh, mesh box by mesh box.
       ⚠ The BARBETTE is exempt: an armoured tube running down THROUGH the structure to the
       magazine is not buried, it is doing its job. The fault is a GUNHOUSE or GUN inside. */
    if (H.turrets && part.turret && (part.superstructure || part.island)) {
      /* ⚠ A BOX OVER A WAISTED LOFT COVERS THE WAIST (round 38). The citadel pinches
         between the wing barbettes, and its bounding box does not — the box called both
         wing houses buried in walls that had been drawn two metres clear of them. For the
         lofted tier meshes the test reads the loft's OWN stations: the point is inside
         only if it is inboard of the drawn half-breadth at its own x. Boxes stay exact
         for box geometry. */
      const houseBoxes = [], lofts = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { const p = tagOf(o);
        if (!o.isMesh || !p || (p.key !== 'superstructure' && p.key !== 'island')) return;
        if (p.name === 'Citadel deck' || p.name === 'Shelter deck') lofts.push(o);
        else houseBoxes.push(new THREE.Box3().setFromObject(o)); });
      const inLoft = (mesh, c) => {
        const pos = mesh.geometry.attributes.position;
        const lc = mesh.worldToLocal(c.clone());
        let best = -1, bd = Infinity;
        for (let k = 0; k * 4 < pos.count; k++) {
          const d = Math.abs(pos.getX(k * 4) - lc.x);
          if (d < bd) { bd = d; best = k; }
        }
        if (best < 0) return false;
        const half = Math.abs(pos.getZ(best * 4 + 1));
        const y0 = pos.getY(best * 4), y1 = pos.getY(best * 4 + 2);
        return bd < 2.5 && Math.abs(lc.z) < half + 0.05 &&
               lc.y > Math.min(y0, y1) - 0.05 && lc.y < Math.max(y0, y1) + 0.05;
      };
      let buried = 0;
      g.traverse(o => { const p = tagOf(o);
        if (!o.isMesh || !p || p.key !== 'turret' || p.name === 'Barbette') return;
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        if (houseBoxes.some(hbx => hbx.containsPoint(c)) ||
            lofts.some(m => inLoft(m, c))) buried++; });
      if (buried) say(v.id, 'turret buried in the superstructure',
                      `${buried} gunhouse/gun meshes centred inside deckhouse geometry`);
    }

    /* ⚠ THE GUNS POINT PAST THE SHIP'S END, AND FOR AS LONG AS THE TURRETS HAVE EXISTED THE
       FORWARD ONES POINTED AT THE STERN. One sign error, invisible from the baseline bearing.
       For every turret group: the barrels must reach beyond the gunhouse toward the end of
       the ship the mount faces — bow end for a mount forward of amidships, stern end aft.
       (A mount trained fore-and-aft the OTHER way exists at sea, but at rest — which is what
       the model shows — a battery points past its own end of the ship.) */
    if (H.turrets) {
      g.updateMatrixWorld(true);
      const turretGroups = [];
      g.traverse(o => { if (o.userData.part && o.userData.part.key === 'turret' && o.isGroup)
                          turretGroups.push(o); });
      for (const tgp of turretGroups) {
        let guns = null, house = null;
        tgp.traverse(o => { if (!o.isMesh || !o.userData.part) return;
          const bbx = new THREE.Box3().setFromObject(o);
          if (o.userData.part.name === 'Main gun') guns = guns ? guns.union(bbx) : bbx;
          if (o.userData.part.name === 'Turret') house = house ? house.union(bbx) : bbx; });
        if (!guns || !house) continue;
        const u = 0.5 + ((house.min.x + house.max.x) / 2) / H.lwl;
        const fwd = u < 0.5;
        if (fwd ? guns.min.x > house.min.x - 0.5 : guns.max.x < house.max.x + 0.5)
          say(v.id, 'guns point the wrong way',
              `mount at u=${u.toFixed(2)} faces ${fwd ? 'the bow' : 'the stern'} but its barrels do not clear the gunhouse that way`);
      }
    }

    /* ⚠ THE RECORD'S BATTERY IS THE DRAWN BATTERY, MOUNT FOR MOUNT. Yamato declared her
       secondaries for two rounds while the builder drew one of four — 'declared but not
       drawn' could not see it because SOME secondary was drawn. Count them: mains plus one
       per centreline secondary plus two per wing pair, no fewer, no more. */
    if (H.turrets) {
      const expect = H.turrets +
        (H.secondaries || []).reduce((a, s) => a + (s.wing ? 2 : 1), 0);
      const drawn = [];
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'turret')
                          drawn.push(o); });
      if (drawn.length !== expect)
        say(v.id, 'battery miscounted',
            `${expect} mounts in the record (${H.turrets} main), ${drawn.length} drawn`);
    }

    /* the high-angle battery: declared pairs are drawn BOTH sides, inside the beam, and
       stand on the superstructure rather than in it or over it */
    if (H.aa && H.aa.length) {
      const mounts = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aa')
                          mounts.push(new THREE.Box3().setFromObject(o)); });
      if (mounts.length !== H.aa.length * 2)
        say(v.id, 'high-angle battery miscounted',
            `${H.aa.length * 2} mounts in the record, ${mounts.length} drawn`);
      for (const mb of mounts) {
        if (Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)) > H.beam / 2 + 0.5)
          say(v.id, 'high-angle mount outside the beam',
              `z reaches ${Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)).toFixed(1)} m on ${(H.beam / 2).toFixed(1)} m of half-beam`);
      }
      if (part.superstructure && mounts.length &&
          mounts.some(mb => mb.min.y < part.superstructure.y[0] ||
                            mb.min.y > part.superstructure.y[1] + 1.4))
        say(v.id, 'high-angle mount stands on nothing',
            'a mount bottom is below the citadel or floats above its roofline');
    }

    /* ── EVERY RECORD-DRIVEN FITTING IS DRAWN AT THE RECORD'S COUNT, ON ITS SUPPORT
       (round 36). The class behind the round-35 queue items: a record field that silently
       stops producing geometry — or produces it adrift — is invisible to every picture,
       and 'declared but not drawn' only sees total absence. So each new fitting field
       answers the heavy battery's three questions: right count, inside the ship, standing
       on something. */
    if (H.aaLight && H.aaLight.length) {
      const mounts = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aaLight')
                          mounts.push(new THREE.Box3().setFromObject(o)); });
      if (mounts.length !== H.aaLight.length * 2)
        say(v.id, 'light battery miscounted',
            `${H.aaLight.length * 2} mounts in the record, ${mounts.length} drawn`);
      for (const mb of mounts) {
        if (Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)) > H.beam / 2 + 0.5)
          say(v.id, 'light AA mount outside the beam',
              `z reaches ${Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)).toFixed(1)} m`);
        if (part.superstructure && (mb.min.y < part.superstructure.y[0] ||
                                    mb.min.y > part.superstructure.y[1] + 1.4))
          say(v.id, 'light AA mount stands on nothing',
              'a bandstand bottom is below the citadel or floats above its roofline');
      }
    }
    if (H.searchlights) {
      let drums = 0;
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.name === 'Searchlight') drums++; });
      if (drums !== H.searchlights)
        say(v.id, 'searchlights miscounted',
            `${H.searchlights} in the record, ${drums} drawn`);
    }
    if (H.floatplanes) {
      const HSf = SHIPS_HULL.hullSurface(H);
      const planes = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'floatplane')
                          planes.push(new THREE.Box3().setFromObject(o)); });
      if (planes.length !== H.floatplanes)
        say(v.id, 'floatplanes miscounted',
            `${H.floatplanes} in the record, ${planes.length} drawn`);
      for (const pb of planes) {
        const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((pb.min.x + pb.max.x) / 2) / H.lwl));
        const d = pb.min.y - HSf.sheer(uu);
        /* on the deck (plus its camber) or riding a catapult beam — never higher, never
           sunk through the planking */
        if (d < -0.6 || d > 3.6)
          say(v.id, 'floatplane stands on nothing',
              `float bottom ${d.toFixed(1)} m off the sheer at its station`);
        if (Math.max(Math.abs(pb.min.z), Math.abs(pb.max.z)) > H.beam / 2 + 0.5)
          say(v.id, 'floatplane off the ship',
              `z reaches ${Math.max(Math.abs(pb.min.z), Math.abs(pb.max.z)).toFixed(1)} m`);
      }
    }
    if (H.deckHatches && H.deckHatches.length) {
      const HSh = SHIPS_HULL.hullSurface(H);
      const hs = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'hatch')
                          hs.push(new THREE.Box3().setFromObject(o)); });
      if (hs.length !== H.deckHatches.length)
        say(v.id, 'stowage hatches miscounted',
            `${H.deckHatches.length} in the record, ${hs.length} drawn`);
      for (const hb of hs) {
        const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hb.min.x + hb.max.x) / 2) / H.lwl));
        const zc = (hb.min.z + hb.max.z) / 2;
        const bB = Math.abs(SHIPS_HULL.surfacePoint(H, HSh, uu, 1.0)[2]);
        const camber = Math.cos((zc / bB) * Math.PI / 2) * bB * 0.035;
        const d = hb.min.y - (HSh.sheer(uu) + camber);
        if (d < -0.6 || d > 0.6)
          say(v.id, 'hatch off the deck',
              `coaming bottom ${d.toFixed(2)} m from the cambered deck at its station`);
      }
    }

    /* ⚠ THE QUARTERDECK AVIATION DECK STANDS ON THE DECK. Declared catapults are drawn as a
       PAIR, mirrored, each turntable resting on the sheer at its station — the class of
       fault the funnel-attached-to-nothing audit exists for, asserted before it happens. */
    if (H.catapults) {
      const HS3 = SHIPS_HULL.hullSurface(H);
      const cats = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'catapult')
                          cats.push(new THREE.Box3().setFromObject(o)); });
      const wanted = 2 + (H.sternCrane ? 1 : 0);
      if (cats.length !== wanted)
        say(v.id, 'aviation deck miscounted',
            `${wanted} structures in the record (2 catapults${H.sternCrane ? ' + crane' : ''}), ${cats.length} drawn`);
      for (const cb of cats) {
        const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((cb.min.x + cb.max.x) / 2) / H.lwl));
        if (Math.abs(cb.min.y - HS3.sheer(uu)) > 1.5)
          say(v.id, 'catapult stands on nothing',
              `bottom at ${cb.min.y.toFixed(1)} m, sheer there ${HS3.sheer(uu).toFixed(1)} m`);
      }
    }

    /* ⚠ A SUPERFIRING TURRET'S BARBETTE RUNS TO THE DECK. The raised mount was lifted by
       moving its group up, so the barbette bottom floated exactly the raise above the
       planking — and the contact audit could not see it, because the barbette touches the
       gunhouse above it. Each turret group's bottom must rest on ITS OWN support: the sheer
       at its station, or a superstructure surface directly beneath it. */
    if (H.turrets) {
      const HS2 = SHIPS_HULL.hullSurface(H);
      const houseBoxes2 = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && (p.key === 'superstructure' || p.key === 'island'))
          houseBoxes2.push(new THREE.Box3().setFromObject(o)); });
      const turretGroups2 = [];
      g.traverse(o => { if (o.userData.part && o.userData.part.key === 'turret' && o.isGroup)
                          turretGroups2.push(o); });
      for (const tgp of turretGroups2) {
        const tb = new THREE.Box3().setFromObject(tgp);
        const u = Math.max(0.001, Math.min(0.999, 0.5 + ((tb.min.x + tb.max.x) / 2) / H.lwl));
        const onSheer = Math.abs(tb.min.y - HS2.sheer(u)) < 1.4;
        const onHouse = houseBoxes2.some(hbx =>
          Math.abs(tb.min.y - hbx.max.y) < 1.4 &&
          tb.max.x > hbx.min.x && tb.min.x < hbx.max.x &&
          tb.max.z > hbx.min.z && tb.min.z < hbx.max.z);
        if (!onSheer && !onHouse)
          say(v.id, 'turret stands on nothing',
              `bottom at ${tb.min.y.toFixed(1)} m, sheer there ${HS2.sheer(u).toFixed(1)} m, no deck beneath`);
      }
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

    /* ⚠ AND THE STERN QUARTER FOLLOWS THE BUILD — round 31, the read HANDOFF carried from
       round 27. A steel ship's transom is her own shell plating: the hull mesh closes its
       stern with a cap the hull shader paints. The fitted transom plate is a TIMBER
       structure — it has lights and galleries in it — and drawn on a steel ship it stood in
       scene light, full-lit pale grey against the shader-lit hull, corners past the skin.
       And nothing stands proud of a WELDED stern: stem bar and stern frame are castings the
       plating closes over, so on a steel build the posts must sit inside the shell. */
    if (H.build === 'steel' || H.build === 'iron') {
      if (part.transom)
        say(v.id, 'timber transom on a welded ship',
            'a fitted transom plate is timber-era; a steel stern closes with the hull cap');
      if (part.stempost && part.planking) {
        const past = Math.max(part.planking.x[0] - part.stempost.x[0],
                              part.stempost.x[1] - part.planking.x[1]);
        if (past > 0.01)
          say(v.id, 'post proud of a welded hull',
              `stem or sternpost stands ${past.toFixed(2)} m outside the shell`);
      }
    }

    /* ── THE STERN FURNITURE STANDS ON THE STERN (round 58). The fitted plate was sampled
       at u = 0.985, and when the counter flare carried the skin to u = 1.0 every light and
       gallery keyed to the plate's bounding box ended up INSIDE the ship — the 74 showed a
       bare stern wall from astern, and no baseline bearing looked. Whether a ship carries
       stern lights is data (`sternLights`); what is declared must be drawn, and what is
       drawn must stand at or abaft the planking's own aft face, because a window buried
       behind the skin is invisible from every bearing while counting as coverage. */
    if (H.sternLights) {
      if (!part.sternlight) say(v.id, 'declared but not drawn', 'stern lights');
      else if (part.planking && part.sternlight.x[1] < part.planking.x[1])
        say(v.id, 'stern furniture buried in the hull',
            `lights end ${(part.planking.x[1] - part.sternlight.x[1]).toFixed(2)} m inboard ` +
            'of the aft face');
    }
    if (H.gunDecks && H.transom && H.build !== 'steel' && H.build !== 'iron') {
      if (!part.gallery) say(v.id, 'declared but not drawn', 'quarter galleries');
      else if (part.planking && part.gallery.x[1] < part.planking.x[1])
        say(v.id, 'stern furniture buried in the hull',
            `galleries end ${(part.planking.x[1] - part.gallery.x[1]).toFixed(2)} m inboard ` +
            'of the aft face');
    }

    /* declared screws must be drawn, and a screw lives under water */
    if (H.screws) {
      if (!part.screw) say(v.id, 'declared but not drawn', 'screws');
      else if (part.screw.y[1] > 0)
        say(v.id, 'screws out of the water', `top at ${part.screw.y[1].toFixed(1)} m`);
    }

    /* ── THE SCHOONER'S RIG IS THE RECORD'S RIG (round 42, Wyoming). Four rules from one
       survey. (1) THE SPANKER IS NOT THE SHORTEST SPAR ON THE SHIP: the aftermost boom's
       obstruction fallback was a station just abaft midships, so gapAft went negative and
       the boom collapsed to its floor — Wyoming's spanker drew 6.7 m against 12.9 for her
       sisters, on the one mast whose boom the photographs show as the LONGEST, standing out
       over the counter. Skipped when funnels are declared: a stack abaft the aftermost mast
       legitimately clamps that boom. */
    const gaffMasts = (H.masts || []).filter(mk => mk.rig === 'gaff');
    if (!H.funnels && gaffMasts.length >= 2 &&
        gaffMasts.length === (H.masts || []).length) {
      const booms = [];
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.name === 'Boom') {
        const bbx = new THREE.Box3().setFromObject(o);
        booms.push({ cx: (bbx.min.x + bbx.max.x) / 2, len: bbx.max.x - bbx.min.x });
      } });
      if (booms.length >= 2) {
        booms.sort((a, b) => a.cx - b.cx);
        const aft = booms[booms.length - 1];
        const longestFwd = Math.max(...booms.slice(0, -1).map(b => b.len));
        if (aft.len < longestFwd * 0.9)
          say(v.id, 'spanker boom collapsed',
              `aftermost boom ${aft.len.toFixed(1)} m against ${longestFwd.toFixed(1)} m ` +
              'forward of it — the one boom with nothing abaft it to hit');
      }
    }

    /* (2) DECLARED HEADSAILS ARE DRAWN, FORWARD OF THE FOREMAST. `headsails: n` is the
       record's suit on the bowsprit stays; a jib that silently stops being built leaves a
       bare spar and a schooner with no front to her silhouette, and 'declared but not
       drawn' cannot see it because SOME sail is drawn. Every sail wholly forward of the
       foremast station is a headsail; the count must match the record.
       ⚠ THE SEVENTH STRIKE OF THE STATION-GATE CLASS (round 51, clipper): her foremast
       rakes FORWARD (−1°), so the fore royal — a small square high on the raked spar —
       stood wholly forward of the bare station and was counted into the jib suit. Same
       fix as rule 6's fifth strike: a headsail is a TRI cloth, square canvas cannot
       masquerade, and the gate scales with the hull. */
    if (H.headsails && (H.masts || []).length) {
      const fmx = (H.masts[0].at - 0.5) * H.lwl;
      let jibs = 0;
      g.traverse(o => { if (o.isMesh && o.userData.kind === 'tri' &&
                            o.userData.part && o.userData.part.key === 'sail') {
        const bbx = new THREE.Box3().setFromObject(o);
        if (bbx.max.x < fmx + H.lwl * 0.03) jibs++;
      } });
      if (jibs !== H.headsails)
        say(v.id, 'headsail suit miscounted',
            `${H.headsails} in the record, ${jibs} drawn forward of the foremast`);
    }

    /* (3) A DECLARED TOPSAIL FLIES ABOVE ITS OWN GAFF. `topsail` on a gaff mast is the
       record saying the topmast carries canvas — Wyoming's 22 sails include six of these,
       while Great Eastern's reference model shows bare topmasts and declares none. The
       lower gaff sail's foot starts at a tenth of the mast, so canvas whose BOTTOM stands
       above three quarters of the lower mast, at that mast's own station, can only be the
       topsail. */
    for (const mk of (H.masts || [])) {
      if (mk.rig !== 'gaff' || !mk.topsail) continue;
      const mx = (mk.at - 0.5) * H.lwl;
      const HSt = SHIPS_HULL.hullSurface(H);
      const lower = mk.heightM !== undefined ? mk.heightM
                  : mk.height * (H.lwl + H.beam) / 2;
      const floorY = HSt.sheer(mk.at) + lower * 0.75;
      let found = 0;
      g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key === 'sail') {
        const bbx = new THREE.Box3().setFromObject(o);
        if (bbx.min.y > floorY && bbx.min.x < mx + 1.0 && bbx.max.x > mx - 1.0) found++;
      } });
      if (!found)
        say(v.id, 'topsail not set',
            `mast at u=${mk.at} declares a topsail and no canvas stands above ` +
            `${floorY.toFixed(0)} m at its station`);
    }

    /* (4) DECLARED DECKHOUSES STAND ON THE DECK, INSIDE THE RAIL — and the wheel likewise.
       The class of every fitting rule since round 36: right count, on its support, inside
       the ship. A house is walls sunk into a SHEERED deck, so its bottom sits below the
       sheer and its roof well above it. */
    if (H.deckhouses && H.deckhouses.length) {
      const HSd = SHIPS_HULL.hullSurface(H);
      const houses = [];
      g.updateMatrixWorld(true);
      g.traverse(o => { if (o.isGroup && o.userData.part &&
                            o.userData.part.key === 'deckhouse')
                          houses.push(new THREE.Box3().setFromObject(o)); });
      if (houses.length !== H.deckhouses.length)
        say(v.id, 'deckhouses miscounted',
            `${H.deckhouses.length} in the record, ${houses.length} drawn`);
      for (const hbx of houses) {
        const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hbx.min.x + hbx.max.x) / 2) / H.lwl));
        const d = HSd.sheer(uu);
        if (hbx.min.y > d + 0.3 || hbx.max.y < d + 1.0)
          say(v.id, 'deckhouse off the deck',
              `house spans ${hbx.min.y.toFixed(1)}–${hbx.max.y.toFixed(1)} m, sheer there ${d.toFixed(1)} m`);
        const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSd, uu, 1.0)[2]);
        if (Math.max(-hbx.min.z, hbx.max.z) > half + 0.4)
          say(v.id, 'deckhouse over the side',
              `reaches ${Math.max(-hbx.min.z, hbx.max.z).toFixed(1)} m off centre, hull side ${half.toFixed(1)} m`);
      }
    }
    if (H.helmAt !== undefined) {
      if (!part.helm) say(v.id, 'declared but not drawn', 'the wheel');
      else {
        const HSw = SHIPS_HULL.hullSurface(H);
        if (Math.abs(part.helm.y[0] - HSw.sheer(H.helmAt)) > 1.2)
          say(v.id, 'wheel stands on nothing',
              `base at ${part.helm.y[0].toFixed(1)} m, sheer there ${HSw.sheer(H.helmAt).toFixed(1)} m`);
      }
    }

    /* ── THE FULL-RIGGER'S RIG IS THE RECORD'S RIG (round 44, Preussen). Three rules from
       one survey, the same class as Wyoming's: right count, in the right place, gated on
       the record. */
    /* (5) THE YARD LIST IS CROSSED IN FULL. `yards` on a mast is the record's own tier
       list — Preussen's thirty square sails are six to a mast, and the segment rig drew
       three. A misnamed yard silently drops out of the plan (the builder filters unknown
       names), so the drawn count is audited against the declared count, per mast.
       ⚠ THE SIXTH STRIKE OF THE STATION-GATE CLASS (round 51, clipper). A fixed radius
       around (at−0.5)·lwl missed the builder's own hull-rake shift AND the mast's rake
       carrying its upper yards aft — a 5°-raked mizzen's royal stands 3.4 m abaft the
       mast foot, outside any gate that still excludes the neighbouring mast. Same class
       as rule 6's five strikes. So no gate at all: every square cloth belongs to exactly
       one mast, so each is assigned to its NEAREST square-mast station and the per-mast
       census is exact whatever the shared station bias. Inter-mast spacing is metres of
       tens; the biases are single metres. */
    {
      const stations = (H.masts || [])
        .map(mk => ({ mk, x: (mk.at - 0.5) * H.lwl }))
        .filter(s => s.mk.rig === 'square');
      if (stations.some(s => s.mk.yards)) {
        const count = new Map(stations.map(s => [s.mk, 0]));
        g.traverse(o => {
          if (!o.isMesh || o.userData.kind !== 'square') return;
          let best = null, bd = Infinity;
          for (const s of stations) {
            const d = Math.abs(o.position.x - s.x);
            if (d < bd) { bd = d; best = s; }
          }
          if (best) count.set(best.mk, count.get(best.mk) + 1);
        });
        for (const s of stations) {
          if (!s.mk.yards) continue;
          const tiers = count.get(s.mk);
          if (tiers !== s.mk.yards.length)
            say(v.id, 'square tiers miscounted',
                `${s.mk.yards.length} yards in the record at u=${s.mk.at}, ${tiers} sails crossed`);
        }
      }
    }
    /* (6) DECLARED STAYSAILS FLY IN THEIR OWN GAP, ALOFT. `staysails: n` on the after
       mast is the suit on the stays to the mast ahead. A staysail lives wholly BETWEEN
       the two stations — square canvas straddles its own mast, jibs stand before the
       foremast, a spanker runs past the after station — and well above the deck, so the
       gap's aloft census is the staysail count and nothing else can inflate it. */
    (H.masts || []).forEach((mk, mi) => {
      if (!mk.staysails || !mi) return;
      const xF = (H.masts[mi - 1].at - 0.5) * H.lwl, xA = (mk.at - 0.5) * H.lwl;
      /* ⚠ THE BUILDER RAKES THE MAST OFF ITS STATION AND THIS RULE DID NOT (wrong for the
         fifth time, round 45). A drawn mast stands at (at−0.5)·lwl PLUS the hull's own rake
         shift, so on the steamer the fore staysail's tack sat 6 cm outside a fixed 0.8 m
         gate and two drawn, correct sails were reported missing. The gate scales with the
         hull instead — and once it is wide enough for rake it is wide enough for a raked
         mast's own narrow upper squares to drift in, so the census also asks the sail's
         KIND: a staysail is a `tri` cloth, and square canvas cannot masquerade. */
      const tol = H.lwl * 0.03;
      let n = 0;
      g.traverse(o => { if (o.isMesh && o.userData.kind === 'tri' &&
                            o.userData.part && o.userData.part.key === 'sail') {
        const bbx = new THREE.Box3().setFromObject(o);
        if (bbx.min.x > xF - tol && bbx.max.x < xA + tol && bbx.min.y > deckY + 4) n++;
      } });
      if (n !== mk.staysails)
        say(v.id, 'staysails miscounted',
            `${mk.staysails} in the record between u=${H.masts[mi - 1].at} and u=${mk.at}, ${n} drawn`);
    });
    /* (7) A DECLARED SPANKER STANDS ABAFT ITS OWN MAST. `spanker` on a square mast is the
       full-rigger's one fore-and-aft sail; it is drawn by the gaff block, so losing it
       leaves a complete-looking square rig — 'declared but not drawn' cannot see a sail
       that is one of thirty-one. It is the only QUAD cloth (gaff-and-boom four-corner,
       `kind: 'quad'`) at that station — the mast's own royal and upper topgallant drift
       into a bare aft-of-station census through rake and belly, measured 2 of 3 hits on
       the clean build, so the kind is the discriminant, not the box alone. */
    for (const mk of (H.masts || [])) {
      if (mk.rig !== 'square' || !mk.spanker) continue;
      const mx = (mk.at - 0.5) * H.lwl;
      let found = 0;
      g.traverse(o => { if (o.isMesh && o.userData.kind === 'quad') {
        const bbx = new THREE.Box3().setFromObject(o);
        if (bbx.min.x > mx - 1.5 && bbx.max.x > mx + 4) found++;
      } });
      if (!found)
        say(v.id, 'spanker not set',
            `mast at u=${mk.at} declares a spanker and no quad cloth runs aft of its station`);
    }
    /* ── THE CROSSED YARD IS WORKED, AND THE UPPER MASTS ARE STAYED (round 59). Item 2's
       standing remainder: a yard without lifts is held up by nothing, a sail without sheets
       is trimmed by nothing, and every topmast in the fleet stood as an unstayed pole —
       none of it visible to a ratchet that only sees change, because gear that never
       existed never changes. The builder merges each category into ONE mesh per square
       mast, so the census is exact: lifts, sheets, tacks and a halyard fall per square
       mast (a junk mast adds its own crowfoot sheet and halyard), and above one drawn tier
       the topmast shroud set with its futtocks, above two the topgallant set. Counted on
       the fine build, where the gear is drawn. */
    {
      const sq = (H.masts || []).filter(mk => mk.rig === 'square');
      if (sq.length) {
        const jm = (H.masts || []).filter(mk => mk.rig === 'junk').length;
        for (const [key, label] of [['lift', 'lift'], ['sheet', 'sheet'],
                                    ['tack', 'tack'], ['halyard', 'halyard']]) {
          const want = sq.length + ((key === 'sheet' || key === 'halyard') ? jm : 0);
          const got = part[key] ? part[key].n : 0;
          if (got !== want)
            say(v.id, 'yard gear missing',
                `${want} ${label} mesh(es) for ${sq.length} square mast(s), ${got} drawn`);
        }
        const tiers = mk => mk.only ? Math.min(mk.only, 3) : 3;
        const wantTop = sq.filter(mk => mk.shrouds && tiers(mk) >= 2).length;
        const wantTg = sq.filter(mk => mk.shrouds && tiers(mk) >= 3).length;
        let gotTop = 0, gotFut = 0, gotTg = 0;
        g.traverse(o => { if (!o.isMesh || !o.userData.part) return;
          const nm = o.userData.part.name;
          if (nm === 'Topmast shrouds') gotTop++;
          if (nm === 'Futtock shrouds') gotFut++;
          if (nm === 'Topgallant shrouds') gotTg++; });
        if (gotTop !== wantTop || gotFut !== wantTop)
          say(v.id, 'topmast unstayed',
              `${wantTop} topmast shroud set(s) wanted with futtocks, ` +
              `${gotTop} drawn (${gotFut} futtock)`);
        if (gotTg !== wantTg)
          say(v.id, 'topgallant unstayed',
              `${wantTg} topgallant set(s) wanted, ${gotTg} drawn`);
      }
    }
    /* ── THE ANCHOR IS FORGE-SIZED (round 45, steamer). The bower's shank scaled at L/8
       for every hull, which is right at a 74's size and hung a 10.6 m anchor across the
       92 m steamer's forecastle and a 17 m one on Preussen. Anchors stopped growing when
       hulls did not: the largest ever hand-forged, Titanic's centre anchor, is 5.7 m over
       all. So the drawn extent of a catted anchor is bounded by the forge, not the hull —
       the bound is generous so only the linear-scaling absurdity trips it. */
    {
      const ancs = [];
      g.traverse(o => { if (o.userData && o.userData.part && o.userData.part.key === 'anchor')
                          ancs.push(new THREE.Box3().setFromObject(o)); });
      for (const bb of ancs) {
        const worst = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        if (worst > 8.5)
          say(v.id, 'anchor out of scale',
              `catted anchor spans ${worst.toFixed(1)} m; the largest ever forged is 5.7 m over all`);
      }
    }

    /* ── A BULKHEAD HULL ENDS IN BULKHEADS (round 46, treasure ship). The junk's own
       stage card teaches bulkhead-first construction, while the drawn hull wore a European
       stem and sternpost and ran out past them to open, uncapped shell ends — the bow read
       as a yacht's. The outermost bulkheads ARE the ends, planked across: both caps must
       exist, and the backbone members must not. */
    if (H.build === 'bulkhead') {
      if (!part.bowtransom) say(v.id, 'bulkhead ends', 'no bow transom drawn');
      if (!part.sterntransom) say(v.id, 'bulkhead ends', 'no stern transom drawn');
      if (part.stempost) say(v.id, 'bulkhead ends', 'a stem/sternpost on a bulkhead-built hull');
      /* and the median rudder is ENORMOUS — the Longjiang yard's own ground gave an
         11.07 m rudder post. Chord near a tenth of the waterline, and the foot BELOW the
         bottom, because lowered it is the leeway board of a hull with no deep keel. */
      if (!part.rudder) say(v.id, 'junk rudder', 'no rudder drawn');
      else {
        const c = part.rudder.x[1] - part.rudder.x[0];
        if (c < H.lwl * 0.055)
          say(v.id, 'junk rudder', `chord ${c.toFixed(1)} m on ${H.lwl} m of waterline`);
        if (part.rudder.y[0] > -H.draught * 1.02)
          say(v.id, 'junk rudder',
              `foot at ${part.rudder.y[0].toFixed(1)} m never reaches below the bottom (draught ${H.draught} m)`);
      }
    }

    /* ── THE JUNK RIG IS A FAN, AND ITS SPARS ARE A CENSUS (round 46). Reddish's average
       is five battens between boom and yard — seven spars per mast — and for eleven rounds
       the numbers were drawn as parallel battens under a level head, which read as square
       sails. The count pins the structure; the ratchet frames pin the fan. Applies where
       every mast is junk-rigged, so a square ship's crossed yards cannot leak in. */
    {
      const jm = (H.masts || []).filter(m => m.rig === 'junk').length;
      if (jm && jm === (H.masts || []).length) {
        const got = part.yard ? part.yard.n : 0;
        if (got !== jm * 7)
          say(v.id, 'junk spar census',
              `${got} spars across ${jm} junk masts (boom + five battens + yard = ${jm * 7})`);
      }
    }

    /* ── THE SHIP FLOATS AT HER MARKS — round 33. Both views float every hull on the
       construction fact that surfacePoint puts the load waterline at local y = 0 and bottoms
       the skin at exactly -draught (measured 0.000 on all 25, r33). This guards the fact: if
       the parametrisation ever moves the skin floor off -draught, the waterlineY datum in
       hull.js userData becomes a lie and the whole fleet floats wrong while every frame still
       looks like a ship on water — the wrongness no picture ratchet can see. */
    if (part.planking && H.draught &&
        Math.abs(part.planking.y[0] + H.draught) > Math.max(0.02, H.draught * 0.01))
      say(v.id, 'skin off her marks',
          `skin bottoms at ${part.planking.y[0].toFixed(2)} m against a stated draught of ${H.draught} m`);

    /* ── THE KEEL IS THE DEEPEST THING ON THE SHIP. She dry-docks on blocks that take her
       weight on the keel, so nothing hangs below it — the container's bulb rode 0.97 m under
       the baseline for as long as it existed (r33), and no ratchet bearing looks under a
       hull. */
    if (part.keel) {
      let floorY = 1e9, floorPart = null;
      for (const k in part) if (part[k].y[0] < floorY) { floorY = part[k].y[0]; floorPart = k; }
      /* ⚠ ONE DOCUMENTED EXCEPTION: the junk's median rudder is drawn LOWERED, below the
         bottom, because under way that is where it worked — it is the leeway board of a
         keel-less hull. She dry-docks with it raised in its trunk, which is the whole
         point of slinging a rudder on tackles instead of pintles. */
      const lowered = H.build === 'bulkhead' && floorPart === 'rudder';
      if (floorPart !== 'keel' && !lowered && floorY < part.keel.y[0] - 0.02)
        say(v.id, 'hangs below the keel',
            `${floorPart} reaches ${floorY.toFixed(2)} m, keel bottom ${part.keel.y[0].toFixed(2)} m`);
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

    /* ⚠ THE BOATS STOW ON THE BOAT DECK, WHICH IS THE TOP OF THE HOUSE. buildBoats put every
       boat at the hull SHEER — on a liner that is the well of the promenade, four decks below
       the deck the boats are named for, and the row of white hulls read as blisters riveted
       to the ship's side. The card said "on the boat deck" the whole time; no picture-diff
       could disagree with it. One derivation — SHIPS_HULL.linerHouse — for the builder and
       for this rule. */
    if (H.boats && H.decks && !H.turrets && !H.flightDeck && part.boat) {
      const T = SHIPS_HULL.linerHouse(H);
      /* recessed boats (round 70) stow at the SOLE of the gallery tier, not on the roof —
         the datum moves with the class, or Queen Mary 2's Deck 8 boats read as 32 m adrift */
      const rec = T.tiers.find(t => t.recess);
      const datum = rec ? rec.y0 : T.top;
      let off = 0, worst = 0;
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Ship\'s boat') return;
        const bb2 = new THREE.Box3().setFromObject(o);
        const d = bb2.min.y - datum;
        if (d < -0.6 || d > 2.2) { off++; if (Math.abs(d) > Math.abs(worst)) worst = d; }
      });
      if (off) say(v.id, 'boats off the boat deck',
                   `${off} boats, worst ${worst.toFixed(1)} m from the boat deck datum`);
    }

    /* ⚠ A POWERED, DECKED SHIP IS CONNED FROM A BRIDGE. "Stepped plates, no fronts" was the
       Titanic for twenty-seven rounds: tier ends closed with blank caps and nowhere to con
       the ship from. The wheelhouse stands ON the boat deck, at the FORWARD end of the house
       — a bridge amidships-aft is a different ship. */
    if (H.decks && H.funnels && !H.turrets && !H.flightDeck) {
      if (!part.bridge) say(v.id, 'no bridge', 'a decked steamer with no wheelhouse');
      else {
        const T = SHIPS_HULL.linerHouse(H);
        if (Math.abs(part.bridge.y[0] - T.top) > 1.5)
          say(v.id, 'bridge not on the boat deck',
              `bridge base ${part.bridge.y[0].toFixed(1)} m, boat deck ${T.top.toFixed(1)} m`);
        const frontX = (T.tiers[T.n - 1].uA - 0.5) * H.lwl;
        if (part.bridge.x[0] > frontX + 0.12 * H.lwl)
          say(v.id, 'bridge not at the front',
              `bridge starts ${(part.bridge.x[0] - frontX).toFixed(1)} m abaft the house front`);
      }
    }

    /* ⚠ THE FUNNEL STANDS ON ITS OWN DECK. funnelH is the record's number and the record
       measures a stack above the deck it stands on; rising from the sheer, Titanic's 19 m
       funnels spent 12 m hidden inside the house and showed 7, with the black top half the
       visible stack instead of a fifth. Each casing must sit on the highest tier covering
       its station — where the RECORD located the house (linerHouse().recorded). Where the
       house is the default abstraction, the recorded height keeps the sheer as its datum:
       raising Great Eastern's 30 m stacks onto an inferred house made them out-tower her
       own foremast, and the funnel-height rule caught it (right, 2 for 6 lifetime). */
    if (H.funnels && H.decks && !H.turrets && !H.flightDeck && part.funnel) {
      const T = SHIPS_HULL.linerHouse(H);
      const HS3 = SHIPS_HULL.hullSurface(H);
      g.updateMatrixWorld(true);
      let bad = 0, msg = '';
      g.traverse(o => {
        if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'funnel') return;
        const bb2 = new THREE.Box3().setFromObject(o);
        const u = Math.max(0.001, Math.min(0.999, 0.5 + ((bb2.min.x + bb2.max.x) / 2) / H.lwl));
        let deck = HS3.sheer(u);
        if (T.recorded)
          for (const t of T.tiers) if (u >= t.uA && u <= t.uB) deck = Math.max(deck, t.y1);
        const d = bb2.min.y - deck;
        if (d < -2.0 || d > 1.5) { bad++; msg = `casing bottom ${d.toFixed(1)} m from its deck`; }
      });
      if (bad) say(v.id, 'funnel does not stand on its deck', `${bad} of ${H.funnels}: ${msg}`);
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
        /* ⚠ sampled across the mesh's SPAN, not at its centre (round 34): the forecastle
           wall is ONE mesh lofted along a tapering bow, so its widest point is at its aft
           end while its bb centre sits where the hull is narrow — the centre-station test
           flagged geometry that is lofted from surfacePoint and cannot overhang. A box at
           constant width over the bow still fires: the hull is narrow across its whole span. */
        let allow = 0;
        for (let s = 0; s <= 4; s++) {
          const u = Math.max(0.001, Math.min(0.999,
            0.5 + (bb.min.x + (s / 4) * (bb.max.x - bb.min.x)) / H.lwl));
          allow = Math.max(allow, Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1.0)[2]));
        }
        allow += Math.max(1.5, H.beam * 0.033);
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

    /* ── THE WINDING MUST AGREE WITH THE DECLARED NORMALS (round 35). ─────────────────
       buildDeckGeometry declared every deck normal (0,1,0) and wound its triangles the other
       way, so three.js's double-sided lighting flip — which trusts the winding — inverted
       correct normals into wrong ones, and every weather deck in the fleet was lit as if it
       faced the sea floor: the "dark olive deck" of rounds 34–35 was the GROUND half of the
       hemisphere light on a sunlit deck. No picture ratchet can see it, because a
       consistently wrong deck never changes. Checked only on materials whose lighting does
       the flip (MeshStandardMaterial); the hull shader has no flip logic, and its mirrored
       port half disagrees with its winding on purpose. */
    {
      const bad = {};
      g.traverse(o => {
        if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
        const ge = o.geometry;
        if (!ge || !ge.index || !ge.attributes.normal) return;
        const ix = ge.index.array, nr = ge.attributes.normal.array, ps = ge.attributes.position.array;
        const faces = ix.length / 3, step = Math.max(1, Math.floor(faces / 40));
        let dis = 0, tot = 0;
        for (let f = 0; f < faces; f += step) {
          const A = ix[f * 3], B = ix[f * 3 + 1], C = ix[f * 3 + 2];
          const ax = ps[A * 3], ay = ps[A * 3 + 1], az = ps[A * 3 + 2];
          const e1 = [ps[B * 3] - ax, ps[B * 3 + 1] - ay, ps[B * 3 + 2] - az];
          const e2 = [ps[C * 3] - ax, ps[C * 3 + 1] - ay, ps[C * 3 + 2] - az];
          const gx = e1[1] * e2[2] - e1[2] * e2[1],
                gy = e1[2] * e2[0] - e1[0] * e2[2],
                gz = e1[0] * e2[1] - e1[1] * e2[0];
          const gl = Math.hypot(gx, gy, gz); if (gl < 1e-9) continue;
          const sx = (nr[A * 3] + nr[B * 3] + nr[C * 3]) / 3,
                sy = (nr[A * 3 + 1] + nr[B * 3 + 1] + nr[C * 3 + 1]) / 3,
                sz = (nr[A * 3 + 2] + nr[B * 3 + 2] + nr[C * 3 + 2]) / 3;
          const sl = Math.hypot(sx, sy, sz); if (sl < 1e-6) continue;
          tot++;
          if ((gx * sx + gy * sy + gz * sz) / (gl * sl) < -0.2) dis++;
        }
        if (tot >= 8 && dis / tot > 0.5) {
          const p = tagOf(o); const k = p ? p.key : '(untagged)';
          bad[k] = (bad[k] || 0) + 1;
        }
      });
      const keys = Object.keys(bad);
      if (keys.length)
        say(v.id, 'winding contradicts declared normals',
            keys.map(k => `${bad[k]} ${k} mesh(es)`).join(', ') +
            ' — double-sided lighting flips these the wrong way');
    }

    /* ── THE POLAR IS THE VESSEL'S OWN (round 47). ─────────────────────────────────────
       25 vessels shared 8 curves: the card printed Preussen's 20.5 kn over the corbita's
       5.8-kn curve, Yamato's 27 over a shared 9.6, and the audit could not see it because
       no rule asked. The polar's SHAPE belongs to the rig; its SCALE must be anchored to a
       figure from the vessel's own record, named in polar.anchor — and the arithmetic that
       ties record to curve is route.js's own: a sail curve saturates at 1.55× reference,
       so a logged burst must sit at the ceiling, a day's run must fit under it, and an
       engine's curve IS its at-sea speed. */
    {
      const P = v.polar || {};
      const anch = P.anchor;
      const cmax = P.curve ? Math.max.apply(null, Object.keys(P.curve).map(k => P.curve[k])) : 0;
      if (!anch || !(anch.kn > 0) || !anch.source)
        say(v.id, 'polar without an anchor', 'no polar.anchor {kn, kind, source} names the record');
      else if (P.beatLight === 0 && P.beatHard === 0) {
        if (Math.abs(cmax - anch.kn) > 0.11)
          say(v.id, 'engine curve off its anchor',
              `routes at ${cmax} kn against an anchored ${anch.kn}`);
        if (v.speedKn !== undefined && (cmax < 0.7 * v.speedKn || cmax > 1.05 * v.speedKn))
          say(v.id, 'engine curve contradicts the card',
              `routes at ${cmax} kn against a stated ${v.speedKn} — the steamer fault`);
      } else if (anch.kind === 'burst') {
        if (Math.abs(1.55 * cmax - anch.kn) > 0.15 * anch.kn)
          say(v.id, 'burst anchor off the 1.55× ceiling',
              `1.55 × ${cmax} = ${(1.55 * cmax).toFixed(1)} kn vs the record's ${anch.kn}`);
      } else {
        if (anch.kn > 1.55 * cmax)
          say(v.id, "day's run above the hull's own ceiling",
              `${anch.kn} kn recorded, curve ceiling ${(1.55 * cmax).toFixed(1)}`);
        if (cmax > 2 * anch.kn)
          say(v.id, 'polar claims twice its own record',
              `curve max ${cmax} kn against a day's-run anchor of ${anch.kn}`);
      }

      /* And the card's PROSE is held to the same ceiling as its curve. The dugout carried
         the trireme's whole rigNote — "8.3 kn sprint", Olympias's own measurement — for as
         long as the two shared a paddling curve, and the shared-curve rule above cannot see
         it because text is not a curve. A speed the note states is a claim about THIS hull;
         it must fit under this hull's own 1.55× ceiling (engines: the curve itself). Notes
         shared within a rig class state no figures, so they pass untouched. */
      {
        const eng = P.beatLight === 0 && P.beatHard === 0;
        const ceil = (eng ? cmax : 1.55 * cmax) + 0.15;
        const m = (P.rigNote || '').match(/\d+(?:\.\d+)?(?=\s*kn)/g) || [];
        const over = m.map(Number).filter(kn => kn > ceil);
        if (over.length)
          say(v.id, "rigNote claims a speed the hull cannot make",
              `note states ${over.join(', ')} kn over a ceiling of ${ceil.toFixed(1)} — another vessel's record pasted on`);
      }

      /* ── MUSCLE IS NOT A SAIL (round 48, B9). ──────────────────────────────────────
         route.js scales every sail curve by √(wind/8), so for as long as the paddlers'
         cruise sat inside a sail curve, a calm slowed the oars and a gale sped them.
         The fix is polar.floor {kn, lossKnPerMs, source} — thrust the router never
         wind-scales, less a measured windage per m/s of head component. These rules keep
         the class honest: every muscled hull must carry one, no engine may, and the floor
         must be consistent with the curve and survive its own reference headwind. */
      {
        const eng = P.beatLight === 0 && P.beatHard === 0;
        const muscled = /\b(oar|paddle)/.test(P.rig || '') && !eng;
        const F = P.floor;
        if (muscled && !(F && F.kn > 0 && F.lossKnPerMs >= 0 && F.source))
          say(v.id, 'muscle vessel without an oar floor',
              `rig says "${P.rig}" but no polar.floor {kn, lossKnPerMs, source} — route.js will wind-scale the crew`);
        if (F && eng)
          say(v.id, 'engine with an oar floor', 'a floor on a beat-0/0 polar is a contradiction — the engine curve already ignores the wind');
        if (F && cmax && F.kn > cmax + 0.05)
          say(v.id, 'oar floor above the curve',
              `floor ${F.kn} kn over a curve topping at ${cmax} — the curve at reference wind already includes the muscle`);
        if (F && F.kn - F.lossKnPerMs * 8 <= 0)
          say(v.id, 'oar floor dies in its own reference wind',
              `${F.kn} − ${F.lossKnPerMs}×8 ≤ 0 — she could never have made the crossing her anchor records`);
      }

      /* ── THE BEAT ANGLES BELONG TO THE RIG (round 48, the fault's second face). ────
         The two muscled hulls carried 30/45 — tighter than a modern sloop — a compensator
         from before the floor existed, when impossible pointing was the only way an oared
         hull could make windward ground. Once the card printed "closest made good under
         sail" the pair became a stated falsehood. Shape is the rig's (r47): every sailing
         hull's beat pair must be its rig family's researched pair, first match wins —
         "oars, with a square sail" is square, and pure muscle ("paddles") carries a
         fair-wind rig that claims nothing to windward. */
      {
        const eng = P.beatLight === 0 && P.beatHard === 0;
        const FAM = [
          /* ⚠ BARQUENTINE BEFORE SQUARE, AND THAT ORDER IS THE POINT. This table is
             matched by substring in array order, so a barquentine — which is square on
             the fore and fore-and-aft on main and mizzen — matched 'square' and was
             held to a full-rigged ship's 80/95. She points better than that and worse
             than a schooner, because two of her three masts are fore-and-aft; that is
             the whole reason the rig exists. Adding the family beats rewording the
             ship to suit the audit. */
          ['barquentine',  62,  78],
          ['square',       80,  95],
          ['lateen',       72,  84],
          ['settee',       72,  84],
          ['battened lug', 62,  70],
          ['gaff',         55,  68],
          ['crab claw',    75,  82],
          ['paddles',      90, 105],
        ];
        const fam = FAM.find(f => (P.rig || '').indexOf(f[0]) >= 0);
        if (!eng && fam && (P.beatLight !== fam[1] || P.beatHard !== fam[2]))
          say(v.id, "beat angles are not the rig's",
              `${P.beatLight}/${P.beatHard} on a "${P.rig}" — the ${fam[0]} family's measured pair is ${fam[1]}/${fam[2]}`);
        if (!eng && !fam)
          say(v.id, 'rig outside the beat-angle table',
              `"${P.rig}" matches no rig family — add its researched pair to the audit table`);
      }

      /* ── THE SUBTITLE IS THE RECORD'S RIG, NOT THE MESH'S MAST COUNT (round 49). ────
         The card's line keyed 'no sail' off hull.masts.length, so every mastless hull
         had its rig text overridden: the dugout read "no sail" above two "closest made
         good under sail" rows — her fair-wind mat sail is real, just undrawn — and the
         USV read "no sail" a full round after r47 set her label to "wind, wave and
         solar". The line is composed once, SHIPS_SW.rigLine, for both card views; run
         it for every hull and it must end with the polar's own rig. 'no sail' is only
         the fallback for a hull with no rig at all, and no vessel in the fleet is one. */
      {
        if (!(P.rig && String(P.rig).trim()))
          say(v.id, 'no polar.rig',
              "the card subtitle needs the record's rig; a missing one prints the 'no sail' fallback");
        const rl = (window.SHIPS_SW && window.SHIPS_SW.rigLine)
                   ? window.SHIPS_SW.rigLine(v) : null;
        if (rl !== null && P.rig && !rl.endsWith(P.rig))
          say(v.id, 'card subtitle contradicts the rig',
              `rigLine gives "${rl}" but the record's rig is "${P.rig}"`);
      }

      /* ── A CALM DOES NOT SLOW HER, THROUGH THE MODEL ITSELF (round 50). ────────────
         The r48 rules above hold the DATA honest — floor present, consistent, alive in
         its own reference wind. This one asks the running model: compile the polar with
         route.js's own compilePolar and evaluate route.js's own polarSpeed at zero wind,
         where a floored hull must make exactly her floor at every heading (no wind, no
         windage; no wind, no sail). Every consumer that goes through polarSpeed — the
         router since r48, the battle since r50 — inherits the pass; a consumer that
         wind-scales the crew again fails it before any picture is taken. */
      /* guarded on ALL THREE globals — polarSpeed calls polarBeat, so a missing one would
         throw here and mask the reachability rule below, which is the one that names it */
      if (P.floor && P.curve
          && typeof compilePolar === 'function' && typeof polarSpeed === 'function'
          && typeof polarBeat === 'function') {
        const CP = compilePolar(P);
        for (const a of [0, 90, 180]) {
          const kn = polarSpeed(CP, 0, a);
          if (Math.abs(kn - P.floor.kn) > 0.02) {
            say(v.id, 'a calm slows the muscled hull',
                `polarSpeed at 0 m/s, ${a}° gives ${kn.toFixed(2)} kn against a floor of ${P.floor.kn} — the crew is being wind-scaled`);
            break;
          }
        }
      }
    }

    /* ── THE FURLED STATE IS A SECOND BUILD, AND IT IS AUDITED AS ONE (round 63). ──────
       `buildShip(H, {furled:true})` must swap every cloth for stowed geometry, on the spar
       that cloth stows to. Four rules, all provable by fault injection:
         · a furled ship wearing SET canvas is the state simply not applied;
         · a rigged ship whose furled build shows NO stowed cloth is declared-but-not-drawn
           in its second state;
         · a furl in the SET build is the state leaking the other way;
         · a furl must LIE ON something — yard, boom, stay, mast or bowsprit — because a
           roll of canvas in open air is the floating-fitting class in its newest clothes.
       Coarse build: every furl path runs in it, and 29 extra fine builds would double the
       audit's runtime for no added coverage (only the FINE-gated sheet leads differ). */
    {
      const setKinds = ['square', 'tri', 'quad'];
      let setCloth = 0, setFurls = 0;
      g.traverse(o => { if (o.isMesh && o.userData.kind) {
        if (setKinds.includes(o.userData.kind)) setCloth++;
        if (o.userData.kind === 'furl') setFurls++;
      } });
      if (setFurls)
        say(v.id, 'a set ship carrying stowed canvas',
            `${setFurls} furled rolls drawn in the set state`);
      if (setCloth) {
        let gf = null;
        try { gf = SHIPS_HULL.buildShip(H, { furled: true }); }
        catch (e) { say(v.id, 'FURLED BUILD THREW', e.message); }
        if (gf) {
          gf.updateMatrixWorld(true);
          let worn = 0, furls = 0;
          const furlBoxes = [], sparBoxes = [];
          /* no 'mast' here: nothing in the fleet stows to a bare mast — a junk's stack
             rests on its boom, a staysail on its stay — and a mast is a tall box that
             would alibi any square furl drifted straight up */
          const sparKeys = ['yard', 'stay', 'bowsprit'];
          gf.traverse(o => {
            if (!o.isMesh) return;
            const p = tagOf(o);
            if (o.userData.kind && setKinds.includes(o.userData.kind)) worn++;
            if (o.userData.kind === 'furl') {
              furls++; furlBoxes.push(new THREE.Box3().setFromObject(o));
            } else if (p && sparKeys.includes(p.key)) {
              sparBoxes.push(new THREE.Box3().setFromObject(o));
            }
          });
          if (worn)
            say(v.id, 'furled ship still wearing canvas',
                `${worn} set cloths drawn in the furled state`);
          if (!furls)
            say(v.id, 'furled ship with no stowed canvas',
                `${setCloth} cloths when set, nothing stowed when furled`);
          const slack = Math.max(1.2, H.beam * 0.12);
          furlBoxes.forEach((fb, i) => {
            const fbx = fb.clone().expandByScalar(slack);
            if (!sparBoxes.some(sb => fbx.intersectsBox(sb)))
              say(v.id, 'a furled sail stowed on nothing',
                  `furl ${i} at y ${fb.min.y.toFixed(1)}–${fb.max.y.toFixed(1)} m touches no yard, stay or bowsprit`);
          });
          /* and a junk's furl DROPS — the stack lies at the boom, not up the hoist */
          if ((H.masts || []).length && (H.masts || []).every(m => m.rig === 'junk')) {
            let setTop = -1e9, furlTop = -1e9;
            g.traverse(o => { if (o.isMesh && o.userData.kind &&
                                  setKinds.includes(o.userData.kind))
              setTop = Math.max(setTop, new THREE.Box3().setFromObject(o).max.y); });
            furlBoxes.forEach(fb => { furlTop = Math.max(furlTop, fb.max.y); });
            if (furlTop > deckY + (setTop - deckY) * 0.6)
              say(v.id, "a junk's furled sail left hoisted",
                  `stowed cloth tops at ${furlTop.toFixed(1)} m against set canvas at ${setTop.toFixed(1)} m — the battens did not drop`);
          }
        }
      }
    }

    /* ── THE MADE MAST IS BOUND, AND BOUND IN ITS OWN PRACTICE (rounds 64, 67) ─────────
       A wooden lower mast drawn past 0.55 m through is past what one tree gives: it is a
       MADE mast and it must be bound or it opens at sea. The binding belongs to the
       CULTURE as well as the century. European square rig: rope wooldings pinched
       between pale wooden hoops to about 1800, shrunk iron hoops after. Chinese junk
       rig: compound spars "bound together with iron straps" (Needham IV:3 — an 1842
       Shanghai mainmast measured 1.12 m through, no shrouds or stays), and NEVER the
       European signature. The year asked is H.year — the year the hull is DEPICTED at —
       falling back to the record's own era start. Research/MASTHEADS.md. */
    {
      /* the drawn diameter is PER MAST since round 68: each mast scales beam x 0.06 by its
         own lower length over the ship's longest (Steel 1794 p.39 — an inch of diameter
         per yard of the spar's own length), and the aftermost mast of a wooden square-
         canvased three-master takes Steel's mizzen clause, 3/5 of the main's diameter.
         The audit recomputes the same rule; only masts past one tree (0.55 m) are bound. */
      const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
      const jk = (H.masts || []).filter(mm => mm.rig === 'junk').length;
      const steelMainA = (H.lwl + H.beam) / 2;
      const lowersA = (H.masts || []).map(mm =>
        mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainA);
      const mainLowerA = Math.max(...lowersA, 0) || 1;
      const aftAt = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
      const mixedSqA = (H.masts || []).some(mm => mm.rig === 'square');
      const drawnD = i => {
        const mm = H.masts[i], lo = lowersA[i];
        const mz = mm.at === aftAt && (H.masts || []).length >= 3 && !H.iron
          && mixedSqA && lo < mainLowerA * 0.95
          && (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
        return H.beam * 0.06 * (mz ? Math.min(lo / mainLowerA, 0.60) : lo / mainLowerA);
      };
      const sqThick = (H.masts || []).filter((mm, i) =>
        mm.rig === 'square' && !H.iron && drawnD(i) > 0.55).length;
      const jkThick = (H.masts || []).filter((mm, i) =>
        mm.rig === 'junk' && !H.iron && drawnD(i) > 0.55).length;
      const nW = part.woolding ? part.woolding.n : 0;
      const nB = part.mastband ? part.mastband.n : 0;
      /* rope wooldings draw TWO meshes per bound mast — the tarred bands and their pale
         pinch-hoops; iron hoops and junk straps draw one — so bound MASTS, not meshes,
         are what the counts must be read in */
      const depYearA = H.year || v.from || 0;
      const perMast = depYearA >= 1800 || jk ? 1 : 2;
      const bound = Math.round((nW + nB) / perMast);
      if (bound < sqThick + jkThick)
        say(v.id, 'a made mast left unbound',
            `${sqThick + jkThick} lower masts past 0.55 m through, ${bound} bound — ` +
            'timber that thick is coaked, and unbound it opens');
      if (jkThick && nB < jkThick)
        say(v.id, 'a made junk mast left unbound',
            `${jkThick} junk masts past 0.55 m through carry ${nB} iron-strap ` +
            'meshes — a compound pole with no shrouds is held together by its straps alone');
      if (jk && nW)
        say(v.id, 'European wooldings on a junk',
            `${nW} woolding meshes on a junk-rigged hull — the r61 copy class; Chinese ` +
            'practice is flat iron straps, no rope bands, no pale pinch-hoops');
      if (bound > sqThick + jkThick)
        say(v.id, 'binding on a single stick',
            `${bound} masts bound for ${sqThick + jkThick} past one tree — a stick one ` +
            'tree yields, or an iron tube, is not bound');
      const depYear = H.year || v.from || 0;
      if (nW && depYear >= 1820)
        say(v.id, 'rope wooldings out of their century',
            `depicted ${depYear}; iron hoops replaced wooldings about 1800`);
      /* the European iron-hoop date applies to the European practice only — a junk's
         iron straps are attested throughout the span this fleet depicts */
      if (nB && sq && depYear && depYear < 1780)
        say(v.id, 'iron mast hoops before the technology',
            `depicted ${depYear}; shrunk iron hoops arrive about 1800`);
      /* three dated technologies hang off the depicted year (tops, wooldings/hoops,
         straps), so a hull that carries a dated rig must state its year — a silent
         fallback here is the round-32 class at the masthead */
      if ((sq || jk) && !H.year)
        say(v.id, 'a dated rig with no date',
            `${sq + jk} square/junk masts and no H.year — tops and bindings key off it`);
    }

    /* ── THE TOP IS A DATED TECHNOLOGY (round 67) ──────────────────────────────────────
       No classical ship carried a masthead platform: the trireme struck her masts before
       battle, the Roman lookout stood at the bow, and the earliest tops among this
       fleet's types are the cog's on the 13th-century town seals. So top platforms
       (part key 'top', name 'Top' — the crosstrees share the key but not the name) are
       forbidden before 1100 and REQUIRED on every square lower mast after it. And the
       corbita hung a corbis — the basket that named her (Festus) — which is DATA:
       declared it must be drawn at the masthead, drawn it must be declared. */
    {
      const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
      const depYear = H.year || v.from || 0;
      let tops = 0;
      g.traverse(o => {
        const p = o.userData && o.userData.part;
        if (p && p.key === 'top' && p.name === 'Top' && !o.isMesh) tops++;
      });
      if (tops && depYear < 1100)
        say(v.id, 'a top before the evidence',
            `${tops} masthead platforms on a hull depicted ${depYear} — no classical ` +
            'ship carried one; the earliest here are the cog seals, 13th century');
      if (sq && depYear >= 1100 && tops < sq)
        say(v.id, 'a masthead left bare',
            `${tops} top platforms for ${sq} square lower masts, depicted ${depYear}`);
      const nCb = part.corbis ? part.corbis.n : 0;
      if (H.corbis && !nCb)
        say(v.id, 'declared but not drawn', 'the corbis at the masthead');
      if (!H.corbis && nCb)
        say(v.id, 'a corbis nobody attested',
            `${nCb} basket meshes on a hull whose record does not carry the corbis field`);
      if (H.corbis && nCb) {
        /* the basket hangs at the head of the tallest mast, not adrift down the pole —
           the floating-fitting class. Expected head height from the mast rule itself. */
        const maxShare = Math.max(...(H.masts || []).map(mm => mm.height || 0), 0);
        const head = (H.lwl + H.beam) / 2 * maxShare;
        if (part.corbis.y[1] < deckY + head * 0.7)
          say(v.id, 'a corbis adrift down the mast',
              `basket tops at ${part.corbis.y[1].toFixed(1)} m against a ~${head.toFixed(0)} m masthead`);
      }
    }

    /* ── THE ANCIENT MASTHEAD CARRIES ITS OWN GEAR (round 78) ──────────────────────────
       The other side of the r67 gate: a top is forbidden before 1100, but the masthead
       was not bare — the yard hoisted, so the head carried the halyard sheave, and its
       ancient name is the karchesion (Asclepiades of Myrlea in Athenaeus 11.49: heel,
       neck, and at the head the karchesion). So every single-tier square mast on a hull
       depicted before 1100 must carry one; one on a hull at or after 1100 — or with no
       stated year — is the fitting out of its age, the top's mirror rule. And it must
       stand AT the head, not adrift down the pole. Then the rope: on any hull whose
       square masts are all single-tier, the one yard IS the hoisting yard, so the
       halyard must REACH the masthead it hoists to — drawn slings-to-rail direct it
       was a rope that could hoist nothing, on the trireme, the corbita and the cog. */
    {
      const anc = (H.masts || []).filter(mm => mm.rig === 'square' && mm.only === 1);
      const depYear = H.year || v.from || 0;
      const headM = mm => mm.heightM || (H.lwl + H.beam) / 2 * (mm.height || 0);
      /* one karchesion is one tagged GROUP of several meshes — count groups, not meshes,
         or one drawn masthead would satisfy a two-masted hull's rule by mesh count */
      let nK = 0;
      g.traverse(o => { const p = o.userData && o.userData.part;
                        if (p && p.key === 'karchesion' && !o.isMesh) nK++; });
      const preTop = H.year !== undefined && H.year < 1100;
      if (preTop && anc.length && nK < anc.length)
        say(v.id, 'an ancient masthead with no karchesion',
            `${nK} karchesion mesh groups for ${anc.length} single-tier square masts ` +
            `depicted ${depYear} — the yard hoists to a sheave the drawing does not carry`);
      if (!preTop && nK)
        say(v.id, 'a karchesion out of its age',
            `${nK} karchesion meshes on a hull depicted ${depYear || 'undated'} — after ` +
            '1100 the masthead carries a top, and the two never share a pole');
      if (preTop && anc.length && nK) {
        /* the block is the head itself: the tallest one must reach the tallest masthead,
           and none may sit below the shortest mast's hounds */
        const heads = anc.map(headM);
        const hi = Math.max(...heads), lo = Math.min(...heads);
        if (part.karchesion.y[1] < deckY + hi * 0.80)
          say(v.id, 'a karchesion adrift down the mast',
              `karchesion tops at ${part.karchesion.y[1].toFixed(1)} m against a ` +
              `~${hi.toFixed(0)} m masthead`);
        if (part.karchesion.y[0] < deckY + lo * 0.45)
          say(v.id, 'a karchesion below the hounds',
              `karchesion base at ${part.karchesion.y[0].toFixed(1)} m on masts of ` +
              `${lo.toFixed(0)}–${hi.toFixed(0)} m`);
      }
      const sqAll = (H.masts || []).filter(mm => mm.rig === 'square');
      if (sqAll.length && sqAll.every(mm => mm.only === 1) && part.halyard) {
        const hi = Math.max(...sqAll.map(headM));
        if (part.halyard.y[1] < deckY + hi * 0.85)
          say(v.id, 'a halyard that reaches no masthead',
              `halyard tops at ${part.halyard.y[1].toFixed(1)} m against a ` +
              `~${hi.toFixed(0)} m masthead — the fall must lead over the head sheave`);
      }
    }

    /* ── AND THE LAID DECK HAS ITS WATERWAY (round 78) ─────────────────────────────────
       The margin plank at the deck edge: every laid plank deck carries one — a
       teak-decked liner as much as a seventy-four — a bare steel deck (deckSteel, a
       flight deck, a container top) does not, and a hull with no laid deck at all,
       the record's deckLaid: false, has no margin to plank. Where it exists it stands
       at the deck EDGE: a band that stops short of the skin, or floats clear of the
       deck, is the floating-fitting class at deck level. */
    {
      const steel = H.build === 'steel' || H.build === 'iron';
      const steelDeck = steel && (H.deckSteel !== undefined ? H.deckSteel
                                                            : !!(H.flightDeck || H.containers));
      const laid = !steelDeck && H.deckLaid !== false;
      const ww = part.waterway;
      if (laid && part.deck && !ww)
        say(v.id, 'a laid deck with no waterway',
            'a planked weather deck and no margin plank at its edge');
      if (!laid && ww)
        say(v.id, 'a margin plank on a deck that has none',
            `${ww.n} waterway meshes on a ` +
            (steelDeck ? 'bare steel deck' : 'hull with no laid deck (deckLaid: false)'));
      if (laid && ww && part.deck) {
        if (Math.abs(ww.z[1] - part.deck.z[1]) > 0.15 || Math.abs(ww.z[0] - part.deck.z[0]) > 0.15)
          say(v.id, 'a waterway off the deck edge',
              `waterway spans z ${ww.z[0].toFixed(2)}..${ww.z[1].toFixed(2)} m against a deck at ` +
              `${part.deck.z[0].toFixed(2)}..${part.deck.z[1].toFixed(2)} m`);
        if (ww.y[1] > deckY + 0.25 || ww.y[1] < deckY - 1.5)
          say(v.id, 'a waterway adrift of its deck',
              `waterway tops at ${ww.y[1].toFixed(2)} m against a deck crown at ${deckY.toFixed(2)} m`);
      }
    }

    /* ── AND THE TOP STANDS ON ITS CHEEKS (round 64) ───────────────────────────────────
       Every doubled square masthead — one with a topmast to fid, mk.only !== 1 —
       carries its top on trestletrees, and the trestletrees on two cheek knees bolted
       to the masthead. Two per doubling, no more and no fewer; a single-tier mast
       (cog, trireme, corbita) gets none, its top sitting on the hounds of the pole.
       And each cheek must TOUCH a top from below — a knee adrift down the mast is the
       floating-fitting class at the masthead. */
    {
      const dbl = (H.masts || []).filter(mm => mm.rig === 'square' && mm.only !== 1).length;
      const nC = part.cheek ? part.cheek.n : 0;
      if (dbl && nC < dbl * 2)
        say(v.id, 'a top standing on nothing',
            `${nC} cheek knees for ${dbl} doubled mastheads — the trestletrees rest on air`);
      if (!dbl && nC)
        say(v.id, 'cheeks with no doubling to carry',
            `${nC} cheek knees on a hull with no doubled square masthead`);
      if (nC) {
        const topBoxes = [], cheekBoxes = [];
        g.traverse(o => {
          const p = o.userData && o.userData.part;
          if (!p) return;
          if (p.key === 'top' && !o.isMesh) topBoxes.push(new THREE.Box3().setFromObject(o));
          if (p.key === 'cheek' && o.isMesh) cheekBoxes.push(new THREE.Box3().setFromObject(o));
        });
        const slack = Math.max(0.8, H.beam * 0.06);
        cheekBoxes.forEach((cb, i) => {
          const cbx = cb.clone().expandByScalar(slack);
          if (!topBoxes.some(tb => cbx.intersectsBox(tb)))
            say(v.id, 'a cheek carrying nothing',
                `cheek ${i} at y ${cb.min.y.toFixed(1)}–${cb.max.y.toFixed(1)} m touches no top`);
        });
      }
    }

    /* ── AND NO SHIP GROWS ALL HER MASTS FROM ONE TREE (round 68) ──────────────────────
       Mast diameter follows the spar's own length (Steel 1794 p.39: an inch to the yard
       at the partners; the mizzen 3/5 of the main), so masts of clearly different
       lengths must differ in girth. The old fault drew every mast at beam x 0.06 flat.
       This measures the DRAWN spars: generic 'Mast' cylinders clustered to the nearest
       data station, widest mesh per station being the lower mast; where the expected
       diameters spread by more than a quarter and the drawn ones sit within 8% of each
       other, every mast came from the same tree. */
    {
      const steelMainB = (H.lwl + H.beam) / 2;
      const lowersB = (H.masts || []).map(mm =>
        mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainB);
      const mainLowerB = Math.max(...lowersB, 0) || 1;
      const aftAtB = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
      const mixedSqB = (H.masts || []).some(mm => mm.rig === 'square');
      const expD = (H.masts || []).map((mm, i) => {
        const lo = lowersB[i];
        const mz = mm.at === aftAtB && H.masts.length >= 3 && !H.iron && mixedSqB
          && lo < mainLowerB * 0.95
          && (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
        return mz ? Math.min(lo / mainLowerB, 0.60) : lo / mainLowerB;
      });
      if ((H.masts || []).length >= 2) {
        const cols = [];
        g.traverse(o => {
          if (!o.isMesh || !o.userData.part) return;
          if (o.userData.part.key !== 'mast' || o.userData.part.name !== 'Mast') return;
          const bb = new THREE.Box3().setFromObject(o);
          /* a short lateen mast is still a mast — the caravel's mizzen column stands
             2.3 m over her poop — so the stub cut scales with the hull */
          if (bb.max.y - bb.min.y < Math.min(3, H.beam * 0.35)) return;
          cols.push({ x: (bb.min.x + bb.max.x) / 2, d: bb.max.z - bb.min.z });
        });
        const drawn = (H.masts || []).map(() => 0);
        cols.forEach(c => {
          let bi = -1, bd = 1e9;
          (H.masts || []).forEach((mm, i) => {
            const dx = Math.abs(c.x - ((mm.at || 0) - 0.5) * H.lwl);
            if (dx < bd) { bd = dx; bi = i; }
          });
          if (bi >= 0 && bd < H.lwl * 0.12) drawn[bi] = Math.max(drawn[bi], c.d);
        });
        const seen = drawn.map((d, i) => ({ d, e: expD[i] })).filter(s => s.d > 0);
        /* uniformity is not the test — an injected carrack draws her lateen mizzen
           FATTER than her mains (the lateen base is beam x 0.032 against 0.030), so
           min/max never moves. The test is PAIRWISE: the drawn girth ratio of any two
           masts must track the ratio their lengths ask, within the lateen/square base
           difference and the taper. */
        let worst = null;
        for (let i = 0; i < seen.length; i++)
          for (let j = i + 1; j < seen.length; j++) {
            const r = (seen[i].d / seen[j].d) / (seen[i].e / seen[j].e);
            const off = Math.abs(Math.log(r));
            if (!worst || off > worst.off) worst = { off, i, j };
          }
        if (worst && worst.off > Math.log(1.35))
          say(v.id, 'every mast from one tree',
              `lower masts drawn ${seen.map(s => s.d.toFixed(2)).join('/')} m through ` +
              `where their lengths ask ${seen.map(s => (H.beam * 0.06 * s.e).toFixed(2)).join('/')} — ` +
              "diameter follows the spar's own length (Steel 1794 p.39)");
      }
    }

    /* ── AND AN IRON MAST IS A TUBE, NOT A TREE (round 69) ─────────────────────────────
       The wooden law's calibration (beam x 0.06 at the tallest mast) has no authority on
       a plated tube: the tube's diameter is whatever the builder rolled, which is a record
       question. The attested set is Great Eastern's six masts (2 ft 9 in – 3 ft 6 in
       through, the record naming each), and on the model's own measure those tubes hold
       pole-length / diameter near 55. The drawing takes an attested `diaM` outright and
       derives the rest at poleM / 55 (Research/IRON-MASTS.md). The audit recomputes both:
       a drawn iron lower more than 25% off its expected tube — or off its RECORDED
       diameter where the data declares one — is the tree law creeping back, or a record
       being ignored. A declared diaM with no drawn mast at its station fires too.
       (Iron masts carry their own part names — 'Iron mast' / 'Steel mast' — so the
       one-tree pairwise rule above no longer sees them; THIS rule is their guard, and it
       is stronger: absolute diameters, not ratios.) */
    {
      if (H.iron && (H.masts || []).length) {
        const steelMainC = (H.lwl + H.beam) / 2;
        const colsC = [];
        g.traverse(o => {
          if (!o.isMesh || !o.userData.part) return;
          if (o.userData.part.key !== 'mast') return;
          if (!/^(Iron|Steel|Wooden) mast$/.test(o.userData.part.name || '')) return;
          const bb = new THREE.Box3().setFromObject(o);
          if (bb.max.y - bb.min.y < Math.min(3, H.beam * 0.35)) return;
          colsC.push({ x: (bb.min.x + bb.max.x) / 2, d: bb.max.z - bb.min.z });
        });
        (H.masts || []).forEach((mm, i) => {
          const lo = mm.heightM !== undefined ? mm.heightM
                                              : (mm.height || 0) * steelMainC;
          /* the same segment stack hull.js builds: square rig adds top and topgallant,
             a gaff mast its topmast; a pole is its own whole height */
          const pole = mm.rig === 'square' ? lo * 1.9
                     : mm.rig === 'gaff' ? (mm.topmast ? lo * 1.52 : lo)
                     : lo;
          const expDia = mm.diaM !== undefined ? mm.diaM : pole / 55;
          let drawn = 0;
          colsC.forEach(c => {
            if (Math.abs(c.x - ((mm.at || 0) - 0.5) * H.lwl) < H.lwl * 0.12)
              drawn = Math.max(drawn, c.d);
          });
          if (!drawn)
            say(v.id, 'a recorded mast not drawn',
                `mast ${i} at u=${mm.at} declares ${expDia.toFixed(2)} m through and no ` +
                'iron mast stands at its station');
          else if (Math.abs(Math.log(drawn / expDia)) > Math.log(1.25))
            say(v.id, 'an iron mast grown from a tree',
                `mast ${i} drawn ${drawn.toFixed(2)} m through where ` +
                (mm.diaM !== undefined ? 'the record says' : 'the tube law derives') +
                ` ${expDia.toFixed(2)} m — an iron mast's diameter is the record's, or ` +
                'poleM/55 labelled derived (Research/IRON-MASTS.md)');
        });
      }
    }

    /* ── AND NO YARD IS CUT FROM THE SHIP'S BEAM (round 70) ────────────────────────────
       A yard's diameter follows the SPAR'S OWN LENGTH, by the spar-maker's own rates:
       Steel 1794, "Proportional Diameters of Yards" — main and fore yards 7/10 of an inch
       to every yard of length at the slings, topsail yards 5/8, topgallant yards 6/10,
       the crossjack at the fore-topsail's rate — and a steel yard is length/50 at the
       slings, attested twice (Peking's 2017 re-masting delivery list, six spar classes
       exact; Great Eastern's 1858 iron lower yard at 50.4; Research/IRON-MASTS.md §2).
       The old fault drew every yard at beam x 0.0035, one girth per ship, L/D 100–500
       across the fleet. The audit measures the DRAWN spars: a crossed yard lies
       ATHWARTSHIPS (junk and crab-claw head spars share the 'Yard' name but rake along
       the ship, and a lateen yard carries its own name); a horizontal spar's box is as
       tall as its slings diameter, the fattest station; and yards rank by height at
       their own mast station — lowest is the course (the crossjack, at the topsail rate,
       on a wooden mizzen), the next two topsails, the rest topgallants and royals. More
       than 35% off the rate is the beam law creeping back. */
    {
      const steelMainD = (H.lwl + H.beam) / 2;
      const lowersD = (H.masts || []).map(mm =>
        mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainD);
      const mainLowerD = Math.max(...lowersD, 0) || 1;
      const aftAtD = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
      const mixedSqD = (H.masts || []).some(mm => mm.rig === 'square');
      const yardsD = [];
      g.traverse(o => {
        if (!o.isMesh) return;
        const p = tagOf(o);
        if (!p || p.key !== 'yard' || p.name !== 'Yard') return;
        const bb = new THREE.Box3().setFromObject(o);
        const xE = bb.max.x - bb.min.x, yE = bb.max.y - bb.min.y, zE = bb.max.z - bb.min.z;
        if (zE <= xE || yE > zE * 0.25) return;
        yardsD.push({ x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2,
                      len: Math.hypot(xE, zE), d: yE });
      });
      const byStation = new Map();
      yardsD.forEach(yd => {
        let bi = -1, bd = 1e9;
        (H.masts || []).forEach((mm, i) => {
          const dx = Math.abs(yd.x - ((mm.at || 0) - 0.5) * H.lwl);
          if (dx < bd) { bd = dx; bi = i; }
        });
        /* 0.18, wider than the mast rules' 0.12 — a hard-raked bow mast (the corbita's
           artemon) carries its yard well ahead of its own step; unmatched yards drop
           rather than fire */
        if (bi < 0 || bd > H.lwl * 0.18) return;
        if (!byStation.has(bi)) byStation.set(bi, []);
        byStation.get(bi).push(yd);
      });
      byStation.forEach((ys, mi) => {
        const mm = H.masts[mi];
        const mz = mm.at === aftAtD && (H.masts || []).length >= 3 && !H.iron && mixedSqD
          && lowersD[mi] < mainLowerD * 0.95
          && (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
        ys.sort((a, b) => a.y - b.y).forEach((yd, rank) => {
          const rate = rank === 0 ? (mz ? 0.625 : 0.700) : rank <= 2 ? 0.625 : 0.600;
          const exp = H.iron ? yd.len / 50 : yd.len * rate / 36;
          if (Math.abs(Math.log(yd.d / exp)) > Math.log(1.35))
            say(v.id, "a yard cut from the ship's beam",
                `yard at u=${mm.at} tier ${rank}, ${yd.len.toFixed(1)} m long, drawn ` +
                `${yd.d.toFixed(2)} m through where its own length asks ${exp.toFixed(2)} — ` +
                (H.iron ? 'a steel yard is length/50 at the slings (Peking 1911, Great Eastern 1858)'
                        : "yard diameter follows the spar's own length (Steel 1794, " +
                          '"Proportional Diameters of Yards")'));
        });
      });
    }

    rows.push({ id: v.id, loa: H.loa, airAboveDeck: +airM.toFixed(1),
                parts: Object.keys(part).length,
                funnelH: part.funnel ? +(part.funnel.y[1] - deckY).toFixed(1) : null });
  }

  /* ── AND NO TWO VESSELS SHARE A CURVE. ─────────────────────────────────────────────────
     The r47 derivation gives every hull its own scale, so a byte-identical curve on two
     vessels means someone pasted a class curve back in — the exact regression this round
     removed. */
  {
    const curveOwner = {};
    for (const v of list) {
      if (!v.polar || !v.polar.curve) continue;
      const k = JSON.stringify(v.polar.curve);
      if (curveOwner[k]) say(v.id, 'shared polar curve', 'byte-identical with ' + curveOwner[k]);
      else curveOwner[k] = v.id;
    }
  }

  /* ── AND ONE MODEL OF HOW A SHIP MOVES (round 50). ─────────────────────────────────────
     battle.js carried its own polar interpolator, btPolarSpeed, times a linear force scale
     — no beat gate, no oar floor, no engine rule — from the day the Action was built until
     round 50: the B9 fault route.js was cured of in r48, alive in a second consumer. The
     battle now compiles and evaluates through route.js's own globals at runtime, so the
     second model must stay dead and the shared one must stay reachable. If btPolarSpeed
     reappears (the likeliest regression is a revert), or compilePolar / polarSpeed /
     polarBeat stop being page globals, the battle either lies again or throws at open. */
  {
    if (typeof btPolarSpeed !== 'undefined')
      say('battle', 'a second speed model',
          'btPolarSpeed exists again — the Action must ask route.js\'s polarSpeed, not its own interpolator');
    for (const fn of ['compilePolar', 'polarSpeed', 'polarBeat'])
      if (typeof window[fn] !== 'function')
        say('battle', 'shared polar model unreachable',
            fn + ' is not a page global — the battle compiles and evaluates through it at open');
  }
  return { problems, checked: rows.length, rows };
})()
