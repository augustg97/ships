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
(async function auditHulls() {
  /* async since round 84: the shore rules drive the app's own patch loader and must await
     it. Both runners eval this and get the promise; playwright resolves promises itself. */
  /* ⚠ NOT window.APP. Classic scripts share one global SCOPE, but a top-level `const` creates
     a lexical binding rather than a property of window — so `window.APP` is undefined while
     bare `APP` resolves. This project has been caught by that twice; the audit was caught by it
     on its first run and reported a clean sweep of zero ships. */
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const problems = [];
  const rows = [];
  const say = (id, rule, detail) => problems.push({ id, rule, detail });

  /* ── AN ASTERISK THE RENDERER CANNOT SPEND (round 180) ────────────────────────────────
     rows, cite and text are markdown-bearing fields, and every path that renders them now
     spends the emphasis through inlineMD/proseHTML (bold first, then italic). A star that
     survives that pass has no meaning to the renderer: it prints as itself in the panel —
     the r178 kalba fault, as data rather than as a render path. A fact about the record,
     not the geometry, so it sweeps every card collection, not only hulls. */
  {
    const spend = s => String(s == null ? '' : s)
      .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
    const sweep = (coll, items) => (items || []).forEach(it => {
      const id = `data:${coll}/${it.id || it.name || '?'}`;
      (it.rows || []).forEach((r, i) => [0, 1].forEach(j => {
        if (spend(r[j]).includes('*'))
          say(id, 'an asterisk the renderer cannot spend',
              `rows[${i}][${j}] = ${JSON.stringify(String(r[j]).slice(0, 60))}`);
      }));
      for (const f of ['cite', 'text'])
        if (spend(it[f]).includes('*'))
          say(id, 'an asterisk the renderer cannot spend',
              `${f} = ${JSON.stringify(String(it[f]).slice(0, 60))}`);
    });
    const V = (APP.voyages && (APP.voyages.voyages || APP.voyages)) || [];
    const C = (APP.chapters && APP.chapters.chapters) || [];
    const B = (APP.battles && APP.battles.battles) || [];
    const P = (APP.ports && APP.ports.ports) || [];
    sweep('vessels', list);
    sweep('voyages', V);
    sweep('chapters', C);
    sweep('battles', B);
    sweep('ports', P);

    /* ── AND A TITLE SLOT CANNOT SPEND ONE AT ALL (round 181) ───────────────────────────
       Names and titles are plain-text slots: cTitle/cSub and the hover tag go out through
       textContent, the voyage list interpolates v.name into raw HTML, and no title path
       runs inlineMD — so in a title slot even a well-formed pair of stars prints as
       punctuation. One star convicts, spent or not. Voyage LEG names are in scope though
       nothing renders them today: a slot with no renderer is exactly where a star lies
       latent until someone wires the field into a label (the r180→r181 Magellan leg). */
    const titles = (coll, items, fields) => (items || []).forEach(it => {
      const id = `data:${coll}/${it.id || it.name || it.title || '?'}`;
      for (const f of fields)
        if (String(it[f] == null ? '' : it[f]).includes('*'))
          say(id, 'an asterisk in a title slot',
              `${f} = ${JSON.stringify(String(it[f]).slice(0, 60))}`);
      (it.legs || []).forEach((l, i) => {
        if (String(l.name == null ? '' : l.name).includes('*'))
          say(id, 'an asterisk in a title slot',
              `legs[${i}].name = ${JSON.stringify(String(l.name).slice(0, 60))}`);
      });
    });
    titles('vessels', list, ['name', 'sub']);
    titles('voyages', V, ['name', 'dates']);
    titles('chapters', C, ['title', 'short', 'years', 'stat', 'lede']);
    titles('battles', B, ['name', 'date', 'campaign']);
    titles('ports', P, ['name', 'modern', 'eyebrow', 'kind']);
  }

  for (const v of list) {
    /* ── A SPEED FLOOR MUST NAME WHAT DRIVES IT (round 104) ─────────────────────────────
       The Shipwright's cap prints "under <word>" for any polar floor, and the word was
       guessed off the RIG string — /oar/ or else 'paddle'. Endurance's barquentine rig
       string says nothing about her 350 ihp auxiliary, so her steam floor printed
       "4.0 kn UNDER PADDLE" on a screw steamer, for as long as she has had a card. The
       floor now carries its means as data (`polar.floor.by`), the card prints the
       record's own word, and this convicts any floor that does not say — plus the exact
       fault that happened: a floor whose own provenance attests steam while its label
       claims muscle. Sits before the hull gate because it is a fact about the record,
       not the geometry. */
    if (v.polar && v.polar.floor) {
      const fb = v.polar.floor;
      if (!/^(oar|paddle|steam|motor)$/.test(fb.by || ''))
        say(v.id, 'speed floor with no means', `floor.by = ${JSON.stringify(fb.by)}`);
      else if (/steam|\bihp\b|\bbhp\b/i.test(fb.source || '') && !/^(steam|motor)$/.test(fb.by))
        say(v.id, 'floor attests steam but claims muscle',
            `floor.by = ${fb.by}; the floor's own source says steam`);
    }
    if (!v.hull) continue;
    const H = v.hull;

    /* ── A RECORDED DECK COVERING MUST BE DRAWABLE, AND MUST SAY WHERE IT CAME FROM
       (round 106). The covering became data (`hull.deck`) when Azzam's teak arrived;
       hull.js falls back silently to the old heuristic for any covering it does not
       know, so a typo'd covering would print an "INFERRED" card against a record that
       states the fact — the record ignored without a word. And a stated material with
       no source is the Azzam-cluster fault in a new field: nothing bounds what the
       claim can support. Sits before the geometry rules because it is a fact about
       the record. */
    if (H.deck) {
      if (!/^(teak|hinoki|pine|wood|steel|bare)$/.test(H.deck.covering || ''))
        say(v.id, 'deck covering unknown to the model',
            `hull.deck.covering = ${JSON.stringify(H.deck.covering)}; the registry `
            + 'draws teak/hinoki/pine/wood/steel/bare, and an unknown word falls back to '
            + 'the heuristic silently');
      else if (!(H.deck.provenance && H.deck.provenance.length > 20))
        say(v.id, 'deck covering with no provenance',
            `hull.deck.covering = ${H.deck.covering} but no source is recorded`);
    }

    /* ── A RECORDED STEAM PLANT MUST SHOW ITS UPTAKE (round 103) ────────────────────────
       Endurance carried a 350 ihp coal-fired auxiliary — her card says so, her polar's
       steam floor says so — and for 40 rounds she drew no funnel at all, because funnels
       are opt-in (`hull.funnels`) and nothing cross-examined the record against the
       silhouette. The ratchet was structurally blind: a funnel that never existed never
       CHANGED. So: any vessel whose own record attests steam (the word in her rows or in
       her polar's provenance, with ihp/bhp as corroborators) and whose hull predates 1950
       must declare at least one funnel. Post-1950 plants breathe through casings and
       nuclear ships have no stack worth the name, so the gate closes there. */
    if ((H.year || 0) < 1950) {
      const recordText = JSON.stringify([v.rows || [], (v.polar || {}).anchor || {},
                                         (v.polar || {}).floor || {}, v.sub || '']);
      if (/steam|\bihp\b|\bbhp\b/i.test(recordText) && !(H.funnels >= 1))
        say(v.id, 'steam attested, no funnel drawn',
            `year ${H.year}; record says steam; hull.funnels = ${H.funnels}`);
    }

    /* ── A RECORDED WINDOW GROUP MUST LIE WHERE ITS SURFACE IS (round 96) ───────────────
       tierBands.groups and hullRows put glazing at recorded u-spans and heights. A group
       outside its wall, or a hull row above the freeboard, maps past the surface's own
       coordinate range and silently never draws — the multiply-by-zero family, invisible
       to the ratchet because nothing changes. Checked on the record, before the build. */
    if (H.tierBands && H.tierBands.groups) {
      const [hA2, hB2] = H.houseAt || [0.10, 0.90];
      for (const ti in H.tierBands.groups)
        for (const gr of H.tierBands.groups[ti]) {
          if (!(gr[0] < gr[1]))
            say(v.id, 'window group inverted', `tier ${ti} group [${gr[0]}, ${gr[1]}]`);
          if (gr[0] < hA2 - 0.03 || gr[1] > hB2 + 0.03)
            say(v.id, 'window group outside its wall',
                `tier ${ti} group [${gr[0]}, ${gr[1]}] vs house ${hA2}-${hB2}`);
        }
    }
    if (H.hullRows && H.hullRows.groups) {
      for (const gr of H.hullRows.groups) {
        if (!(gr.u[0] < gr.u[1]) || gr.u[0] < 0 || gr.u[1] > 1)
          say(v.id, 'hull row group off the hull', `u [${gr.u[0]}, ${gr.u[1]}]`);
        if (gr.hM[1] > (H.freeboard || 6) + 0.01 || gr.hM[0] < 0 || !(gr.hM[0] < gr.hM[1]))
          say(v.id, 'hull row beyond the freeboard',
              `hM [${gr.hM[0]}, ${gr.hM[1]}] vs freeboard ${H.freeboard}`);
      }
    }

    /* ── A RECORDED BAND HEIGHT MUST LIE INSIDE ITS OWN TIER (round 97) ─────────────────
       bandsM places a tier's glazing at [sill, head] metres over the waterline; the wall
       that draws it spans that tier's floors. A band past its floor or ceiling converts to
       a fraction outside 0..1 and the builder's clamp quietly parks it at the tier edge —
       drawn, but not where the plate read it, which no picture-diff can prove wrong.
       Checked on the record, before the build. */
    if (H.tierBands && H.tierBands.bandsM && H.tierFloorsM) {
      const nT = H.decks || 0;
      const fl = i => i <= 0 ? (H.freeboard || 0)
        : i >= nT ? (H.houseTopM !== undefined ? H.houseTopM : Infinity)
        : (H.tierFloorsM[i - 1] !== undefined ? H.tierFloorsM[i - 1] : Infinity);
      for (const ti in H.tierBands.bandsM) {
        const bm = H.tierBands.bandsM[ti], i = +ti;
        if (!(bm[0] < bm[1]) || bm[0] < fl(i) - 0.01 || bm[1] > fl(i + 1) + 0.01)
          say(v.id, 'tier band outside its tier',
              `tier ${ti} band ${bm[0]}-${bm[1]} m vs floors ${fl(i)}-${fl(i + 1)}`);
      }
    }

    /* ── A FOOTING MUST STAND ON A TERRACE THAT REACHES IT (round 97) ───────────────────
       cluster.domes[].onTier plants a dome on that tier's roof. Round 95 recorded the aft
       pair at u 0.763/0.803 on tier 2 while the measured tier-2 wall ends at 0.744: the
       dome would stand on air past its own terrace, and the contact looks fine in any
       elevation because the miss is fore-and-aft. Checked on the record. */
    if (H.cluster && H.cluster.domes) {
      const [hA3, hB3] = H.houseAt || [0.10, 0.90];
      for (const dm of H.cluster.domes) {
        if (dm.onTier === undefined) continue;
        const aft = (H.tierAftU && H.tierAftU[dm.onTier] !== undefined)
          ? H.tierAftU[dm.onTier] : hB3;
        if (dm.u < hA3 - 0.01 || dm.u > aft + 0.01)
          say(v.id, 'dome past its terrace',
              `dome u ${dm.u} on tier ${dm.onTier}, terrace ends ${aft}`);
      }
    }

    /* ── A TERRACED STERN DESCENDS, CONTIGUOUSLY (round 98) ─────────────────────────────
       sternSteps records the bulwark cap line the broadside reads, span by span, and the
       derived deck behind each parapet. A gap between spans leaves a slice of hull on the
       OLD sheer; an ascending cap line puts a terrace above the one forward of it; a deck
       above its own cap is a parapet of negative height. All record errors the picture
       cannot see, because the build would draw each of them faithfully. */
    if (H.sternSteps) {
      const ss = H.sternSteps.steps || [];
      for (let i = 0; i < ss.length; i++) {
        const st = ss[i];
        if (!(st.u[0] < st.u[1]) || st.u[0] < 0 || st.u[1] > 1)
          say(v.id, 'stern step span inverted', `step ${i} u [${st.u[0]}, ${st.u[1]}]`);
        if (i && Math.abs(ss[i - 1].u[1] - st.u[0]) > 0.001)
          say(v.id, 'stern steps not contiguous',
              `step ${i - 1} ends ${ss[i - 1].u[1]}, step ${i} starts ${st.u[0]}`);
        if (i && st.topM[0] > ss[i - 1].topM[1] + 0.05)
          say(v.id, 'stern cap line ascends aft',
              `step ${i} fwd top ${st.topM[0]} m over step ${i - 1} aft top ${ss[i - 1].topM[1]} m`);
        if (st.deckM !== undefined) {
          const para = Math.min(st.topM[0], st.topM[1]) - st.deckM;
          if (para < 0.4 || para > 2.0)
            say(v.id, 'stern parapet off human height',
                `step ${i} deck ${st.deckM} m under cap ${st.topM} m — parapet ${para.toFixed(2)} m`);
          if (st.deckM > (H.freeboard || 6))
            say(v.id, 'stern step deck above the freeboard',
                `step ${i} deck ${st.deckM} m on ${H.freeboard} m freeboard`);
        }
      }
    }

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
    /* (r187) parts that cannot BEAR: a rest-ray asking what surface is under a
       stow must not accept a rope or an oar shaft as the answer — the sekibune's
       forestay crossed the anchor's rest-ray 0.44 m over the planking and the
       first live run convicted a seated anchor as stabbed-through. Every deck is
       a surface; a line crossing over one is not. */
    const NONBEARING = new Set(['stay', 'shroud', 'halyard', 'brace', 'lift',
                                'sheet', 'tack', 'ratline', 'oar']);

    /* r155: the record may attest the FLAG-BUTTON (`truckM`, deck-to-truck) instead of a
       lower-mast length — every expectation below that derives from the lower must mirror
       hull.js's own solution (lower = truckM / 1.708 for the full square stack), or a
       truckM record reads as a mast of height zero and every mast rule fires on it. */
    const lowerOf = mk => {
      if (mk.truckM !== undefined && mk.rig === 'square') {
        const K = mk.only === 1 ? 1.0 : mk.only === 2 ? 0.88 + 0.60
                : 0.88 * (1 + 0.60) + 0.30;
        return mk.truckM / K;
      }
      return mk.heightM !== undefined ? mk.heightM
                                      : (mk.height || 0) * (H.lwl + H.beam) / 2;
    };

    /* ── NOTHING ABOARD IS NaN ──────────────────────────────────────────────────────────
       Round 86: the first lateen mast with an ATTESTED height (`heightM`, the galley) hit
       a yard-share formula that assumed the Steel-share form of the record; both masts,
       both yards and both sails built with NaN in every position, the ship's bounding box
       went NaN with them, the camera fit died of it, and the Shipwright showed a black
       canvas behind working panels. The ratchet cannot convict a NEW frame (no baseline),
       and no proportion rule fires on a value that is not a number — so the audit walks
       every vertex of every mesh. One non-finite float anywhere is a conviction. */
    {
      const bad = {};
      g.traverse(o => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        const a = o.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i++)
          if (!Number.isFinite(a[i])) {
            const p = tagOf(o);
            bad[(p && p.name) || o.geometry.type] = true;
            return;
          }
      });
      const names = Object.keys(bad);
      if (names.length)
        say(v.id, 'geometry with non-finite vertices',
            `NaN positions in: ${names.join(', ')} — the black-canvas class`);
    }

    /* ── A TRIANGLE IS DRAWN ONCE (round 156) ───────────────────────────────────────────
       The both-ways index trick — the same three vertices indexed AGAIN in opposite
       winding so a strip reads from below — breaks computeVertexNormals: each cancelling
       pair is an exact FP negation, but per-vertex accumulation is not associative, so
       about half the sums come out exactly zero (normalize's `|| 1` guard keeps them —
       unlit) and the rest come out ~1e-16 dust that normalize amplifies to a FULL UNIT
       vector in an arbitrary direction (lit upside-down). The plank reads as alternating
       washed and dark bands — r118 saw exactly this on the sangjang wall, fixed that one
       instance (single winding on a DoubleSide clone) and named the class; this is the
       class rule. A magnitude test cannot convict it — the garbage normals are unit
       length — so the rule convicts the PATTERN: one unordered vertex triple drawn
       twice in one indexed geometry. Opposite winding is the both-ways form; same
       winding is a double draw, the z-fight form. Both convict. */
    {
      const bad = [];
      g.traverse(o => {
        if (!o.isMesh || !o.geometry || !o.geometry.index) return;
        const ia = o.geometry.index.array;
        const seen = new Set(); let dup = 0;
        for (let i = 0; i < ia.length; i += 3) {
          const t = [ia[i], ia[i + 1], ia[i + 2]].sort((a, b) => a - b).join(',');
          if (seen.has(t)) dup++; else seen.add(t);
        }
        if (dup) {
          const p = tagOf(o);
          bad.push(`${(p && (p.name || p.key)) || o.geometry.type}: ${dup} of ${ia.length / 3}`);
        }
      });
      if (bad.length)
        say(v.id, 'triangles drawn twice over the same vertices',
            `${bad.join('; ')} — the both-ways class: computeVertexNormals cancels `
            + 'shared windings to zeros and unit garbage');
    }

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

    /* ── HOLD FURNITURE REQUIRES A HOLD (round 120) ─────────────────────────────────────
       A grating covers a hatch — an opening through a laid deck into a hold — and a
       capstan stands ON a deck, heaving cable. Both were gated on "timber" for as long as
       buildFittings has existed, so the 8.6 m dugout and the voyaging canoe (the record's
       deckLaid: false — an open log, and a lashed platform between two open hulls) carried
       three hatch gratings and a bar-capstan whose bars overhung the sides. The
       expectation here is read off the RECORD, independently of the builder's own
       deckCovering() judgement, so a bug in that one judgement cannot hide from this rule.
       Two arms: an undecked hull draws NO hold furniture, and a decked timber hull STILL
       draws hers — so the gate that fixed the class cannot silently widen and strip the
       fleet's working ships of their hatches. */
    {
      const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
      const timber = !(H.build === 'iron' || H.build === 'steel');
      const steelDeck = H.deck && H.deck.covering === 'steel';
      /* r172: the capstan left this rule — its presence is the RECORD's (`capstan`
         field, the round-172 rule below), not an inference from timber-and-decked;
         that inference put a Georgian bar capstan on a trireme for 172 rounds. The
         gratings arm stays: a hatch through a laid deck is what a laid deck IS. */
      for (const k of ['grating']) {
        if (undecked && part[k])
          say(v.id, 'hold furniture on an undecked hull',
              `${part[k].n} ${k} mesh(es) drawn, but the record declares deckLaid: false — `
              + 'no laid deck, no hatch to cover');
        else if (!undecked && timber && !steelDeck && !part[k])
          say(v.id, `a decked timber ship lost her ${k}`,
              'the hull is timber and the record does not refuse a laid deck, so hatch '
              + 'gratings belong aboard and none is drawn');
      }
      if (undecked && part.capstan)
        say(v.id, 'hold furniture on an undecked hull',
            `${part.capstan.n} capstan mesh(es) drawn on a hull with no laid deck — `
            + 'nothing for a capstan to stand on');
    }

    /* ── AN OPEN HULL SHOWS HER GEAR, AND THE GEAR LIES IN THE HOLLOW (round 127) ───────
       deckLaid: false bought an empty hollow for 122 rounds. Both undecked hulls attest
       their gear in their own rows — the dugout steers with "the paddle itself" and her
       one measured figure is a paddled crossing; the canoe's rows say "a long paddle,
       not a rudder" and "lashed-lug planking" — and neither drew any of it. Three arms,
       read off the record as always: an undecked hull DRAWS stowage; a decked hull draws
       NONE (below her own deck it would be invisible, so a stowage part there means the
       gate widened wrongly); and every piece lies INSIDE the hollow — under the rim
       line, above the floor, inside the hull's own extents. The containment arm is what
       no picture can promise: a paddle floating over the rail still reads as "gear" in
       a frame, and only the bounds say it is adrift. A NEW open hull convicting on the
       bare-floor arm is the rule working: its gear must be decided from its own record,
       not inherited from another ship's stores. */
    {
      const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
      const st = part.stowage;
      if (undecked && !st)
        say(v.id, 'an open hull with a bare floor',
            'the record lays no deck, so the floor is in plain sight — and the gear the '
            + 'record itself attests (paddles, a bailer) is not drawn');
      else if (!undecked && st)
        say(v.id, 'stowage drawn on a decked hull',
            `${st.n} stowage mesh(es) on a hull whose deck would hide them — the open-`
            + 'hull gate widened wrongly');
      if (undecked && st && part.deck) {
        const eps = 0.03;
        if (st.y[1] > part.deck.y[1] + eps)
          say(v.id, 'stowed gear above the rim',
              `gear tops at ${st.y[1].toFixed(2)} m against a rim line of `
              + `${part.deck.y[1].toFixed(2)} m — adrift, not stowed`);
        if (st.y[0] < part.deck.y[0] - eps)
          say(v.id, 'stowed gear below the floor',
              `gear bottoms at ${st.y[0].toFixed(2)} m against a floor of `
              + `${part.deck.y[0].toFixed(2)} m — sunk through the hull`);
        if (st.x[0] < part.deck.x[0] - eps || st.x[1] > part.deck.x[1] + eps
            || st.z[0] < part.deck.z[0] - eps || st.z[1] > part.deck.z[1] + eps)
          say(v.id, 'stowed gear outside the hull',
              `gear spans x ${st.x[0].toFixed(2)}..${st.x[1].toFixed(2)}, `
              + `z ${st.z[0].toFixed(2)}..${st.z[1].toFixed(2)} against the open hull's `
              + `x ${part.deck.x[0].toFixed(2)}..${part.deck.x[1].toFixed(2)}, `
              + `z ${part.deck.z[0].toFixed(2)}..${part.deck.z[1].toFixed(2)}`);
      }
    }

    /* ── STEERING IS A FACT OF THE RECORD (round 121) ───────────────────────────────────
       The rudder was added to every hull UNCONDITIONALLY, so the 68,000 BP dugout hung a
       pintled stern rudder her card refuses ("Paddled"), the voyaging canoe carried one
       per hull against her own row — "a long paddle, not a rudder" — and the sewn dhow
       hung hers on an iron hinge under a construction row reading "no iron". The record
       now declares the kind — paddle | quarter | median | stern | steel — and this rule
       cross-examines the drawn parts against the declaration, both directions: what the
       record refuses must not be drawn, what it declares must be drawn, and drawn the
       right KIND in the right place. A record that declares nothing convicts too, because
       the builder's fallback is exactly the guess-off-the-build-string this round retired. */
    {
      const st = H.steering;
      if (!/^(paddle|quarter|median|stern|steel)$/.test(st || ''))
        say(v.id, 'record declares no steering',
            `hull.steering = ${JSON.stringify(st)}; the model draws paddle | quarter | `
            + 'median | stern | steel, and an undeclared record leaves the builder '
            + 'guessing off the build string — the round-121 fault standing again');
      else if (st === 'paddle') {
        for (const k of ['rudder', 'quarterRudder'])
          if (part[k])
            say(v.id, 'a paddled hull mounts steering',
                `${part[k].n} ${k} mesh(es) drawn, but the record steers with a hand-held `
                + 'paddle — nothing is hung on the hull');
      } else {
        const want = st === 'quarter' ? 'quarterRudder' : 'rudder';
        const other = st === 'quarter' ? 'rudder' : 'quarterRudder';
        if (!part[want])
          say(v.id, 'declared steering not drawn',
              `hull.steering = ${st} and no ${want} mesh exists`);
        if (part[other])
          say(v.id, 'steering of the wrong kind drawn',
              `hull.steering = ${st} but ${part[other].n} ${other} mesh(es) drawn`);
        if (st === 'quarter' && part.quarterRudder) {
          const q = part.quarterRudder;
          if (q.n !== 2)
            say(v.id, 'a quarter-rudder pair is a pair',
                `${q.n} quarter-rudder mesh(es); one steers over each quarter`);
          else if (!(q.z[0] < -0.1 && q.z[1] > 0.1))
            say(v.id, 'both quarter rudders on one side',
                `z extent ${q.z[0].toFixed(2)}..${q.z[1].toFixed(2)} m does not straddle `
                + 'the centreline');
          if (q.y[0] > -0.15 * (H.draught || 1))
            say(v.id, 'quarter rudder not immersed',
                `blade bottoms at ${q.y[0].toFixed(2)} m on a ${H.draught} m draught — `
                + 'a steering blade out of the water steers nothing');
          if (q.y[1] < 0.3)
            say(v.id, 'quarter rudder with no loom above the rail',
                `head tops out at ${q.y[1].toFixed(2)} m — nothing for a helmsman to hold`);
          if (q.xs && !q.xs.every(x => x > 0.15 * (H.lwl || 1)))
            say(v.id, 'quarter rudder off the quarter',
                `mesh centres at x ${q.xs.map(x => x.toFixed(1)).join(', ')} m — the `
                + 'quarter is the after end of the run, well abaft amidships');
        }
        if (st === 'steel' && part.rudder && part.rudder.y[1] > 0.05)
          say(v.id, 'steel rudder above the waterline',
              `rudder tops at ${part.rudder.y[1].toFixed(2)} m; a motor ship's plate lives `
              + 'wholly below the counter — the carrier fault of round 27');
      }
    }

    /* ── A ONE-PIECE HULL RAISES NO POSTS AND WEARS NO WALES (round 121) ────────────────
       "Construction: single trunk, fire and adze" — there is nothing to scarf a stem to
       and no strake to thicken into a wale, yet the dugout wore separate posts and two
       hogging girders because both were gated on "not iron and not steel". Two arms, the
       r120 pattern: a one-piece hull draws neither, and an assembled hull STILL draws
       hers, so the gate cannot silently widen and strip the fleet. Posts: every build
       except bulkhead (whose ends are transoms, tagged as such) and dugout. Wales: every
       timber build except dugout. */
    {
      const onePiece = H.build === 'dugout';
      const metal = H.build === 'iron' || H.build === 'steel';
      /* keel and frames joined the list in round 122, when opening the hull would have
         put thirty ribs inside a log whose own card says "no keel, no frame" — while
         the cap stood, the contradiction was invisible and only the part table knew */
      for (const k of ['stempost', 'wale', 'keel', 'frames']) {
        const belongs = k === 'stempost' ? !onePiece && H.build !== 'bulkhead'
                      : k === 'wale' ? !onePiece && !metal
                      : !onePiece;
        if (onePiece && part[k])
          say(v.id, 'assembly timber on a one-piece hull',
              `${part[k].n} ${k} mesh(es) drawn on a hull the record calls one piece`);
        else if (belongs && !part[k])
          say(v.id, `an assembled ship lost her ${k}`,
              `build ${H.build} is assembled from members, and no ${k} is drawn`);
      }
    }

    /* ── AN UNDECKED HULL IS OPEN (round 122) ───────────────────────────────────────────
       deckLaid: false bought a "bare timber" CAP across the sheer for as long as the deck
       loft has existed — a deck by any other name, on the two hulls whose records refuse
       one. The question is the viewer's own: can you see INTO her? Rays straight down at
       the hull's midbody centreline must reach geometry BELOW the load waterline — the
       floor of the hollow — at at least one probed station. The waterplane mask is
       exempted by name: it draws nothing, so sight passes through it, and a rule that
       counted it would convict the very build it guards. Capped, every ray lands at
       sheer height and the rule convicts. The decked arm is bounding-box: a real deck
       has no business below the load line, so a decked hull whose deck-tagged geometry
       dips under it has been wrongly opened. Twin hulls are probed on each hull's own
       centreline, at stations chosen clear of the record's crossbeams. */
    {
      const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
      if (undecked && part.deck) {
        g.updateMatrixWorld(true);
        const rc = new THREE.Raycaster();
        const lanes = H.doubleHull ? [-(H.hullSep || 0) / 2, (H.hullSep || 0) / 2] : [0];
        for (const lane of lanes) {
          let deepest = 1e9;
          for (const u of [0.35, 0.45, 0.55, 0.65, 0.75]) {
            const x = (u - 0.5) * H.lwl;
            rc.set(new THREE.Vector3(x, 50, lane), new THREE.Vector3(0, -1, 0));
            /* the question is what the VIEWER meets: an invisible mesh draws nothing
               (the log's pre-hollowing top face ships visible: false), and the
               waterplane mask draws nothing by construction — sight passes through
               both, and the Raycaster alone passes through neither */
            const hit = rc.intersectObject(g, true)
              .find(h => { for (let e = h.object; e; e = e.parent)
                             if (e.visible === false) return false;
                           const p = tagOf(h.object);
                           return !p || p.name !== 'Waterplane mask'; });
            if (hit) deepest = Math.min(deepest, hit.point.y);
          }
          if (deepest > -0.02)
            say(v.id, 'an undecked hull is capped',
                `rays down the ${lane ? (lane < 0 ? 'port' : 'starboard') + ' hull ' : ''}`
                + `centreline bottom out at ${deepest === 1e9 ? 'nothing' : deepest.toFixed(2) + ' m'}`
                + ' — the record lays no deck, so the view should reach the floor of the '
                + 'hollow, below the load waterline');
        }
      } else if (!undecked && part.deck && part.deck.y[0] < -0.02)
        say(v.id, 'a decked hull opened up',
            `deck geometry reaches down to ${part.deck.y[0].toFixed(2)} m — below the load `
            + 'waterline, where no laid deck belongs; the open-hull gate has widened');
      /* and the rail follows the deck it caps: an open hull has no deck edge, so the
         rim of the hull wall is the gunwale and a fitted capping is assembly timber.
         Found both ways in round 122: the dugout's rail z-fighting her rim, and the
         canoe's rail — never in the twin-hull clone list — floating at the CENTRELINE
         over open water. The decked arm keeps the fleet's rails aboard. */
      if (undecked && part.rail)
        say(v.id, 'a capping rail on a hull with no deck edge',
            `${part.rail.n} rail mesh(es) drawn, but the record lays no deck — the rim `
            + 'of the hull wall is the gunwale');
      else if (!undecked && !part.rail)
        say(v.id, 'a decked hull lost her rail',
            'every decked hull carries her capping (empty spans come out '
            + 'vertex-identical, but the mesh exists), and none is drawn');
    }

    /* ── A STAY ENDS ON A SPAR, NOT ON AN ESTIMATE OF ONE (round 99) ────────────────────
       buildRigging anchors every stay and backstay at __mastTops; for rounds those points
       were `y + lower*0.14` — 3.0 to 3.4 m ABOVE the trucks the mast loop actually drew, so
       the whole fleet's standing rigging converged on empty air. Invisible to the ratchet
       (a rope is thin, and it moved with everything else) and invisible from the deck. The
       question is geometric: near each anchor's own x there must be mast mesh reaching it. */
    if (H.__mastTops && H.__mastTops.length) {
      const mastBoxes = [];
      g.traverse(o => { if (o.isMesh && tagOf(o) && tagOf(o).key === 'mast')
                          mastBoxes.push(new THREE.Box3().setFromObject(o)); });
      H.__mastTops.forEach((mt, i) => {
        let my = -1e9;
        mastBoxes.forEach(b2 => {
          if (mt.x > b2.min.x - 3 && mt.x < b2.max.x + 3) my = Math.max(my, b2.max.y);
        });
        if (my > -1e9 && mt.y - my > 0.5)
          say(v.id, 'stay anchored above its own truck',
              `mast ${i} stay collar at ${mt.y.toFixed(1)} m vs drawn truck ${my.toFixed(1)} m`);
      });
    }

    /* ── r160: A BOW THE RECORD MEASURED BUT THE SHEER IGNORES ──────────────────────────
       Azzam's sheerBow survived at a liner's 3.0 — a 12.0 m bow — for 160 rounds while
       two of her own broadsides read the stem head at 8.05–8.37 m, BELOW her 9.0 m
       freeboard: an inverted sheer, one sweep rising aft into the house. The plates are
       data now: bowTopM, the measured stem-head height over the waterline. Both
       directions of the r84 class: (a) the RECORD must agree with itself — freeboard +
       sheerBow is the bow the plates measured; (b) the DRAWING must obey the record —
       rays down just aft of the stem meet the loft on the record's own sheer line, so a
       builder that drops or double-applies the rise convicts here. Record-gated: no
       bowTopM, no rule, no other hull touched. */
    if (typeof H.bowTopM === 'number' && typeof H.freeboard === 'number') {
      const expect = H.freeboard + (H.sheerBow || 0);
      if (Math.abs(expect - H.bowTopM) > 0.4)
        say(v.id, 'a bow the record measured but the sheer ignores',
            `freeboard ${H.freeboard} + sheerBow ${H.sheerBow} draws the stem head at `
            + `${expect.toFixed(1)} m against the plates' bowTopM ${H.bowTopM} m`);
      else {
        g.updateMatrixWorld(true);
        const rc = new THREE.Raycaster();
        let worst = 0, at = null;
        for (const u of [0.01, 0.02, 0.03]) {
          const line = H.freeboard + (H.sheerBow || 0) * Math.pow(1 - 2 * u, 2.8);
          rc.set(new THREE.Vector3((u - 0.5) * H.lwl, 50, 0), new THREE.Vector3(0, -1, 0));
          const hit = rc.intersectObject(g, true)
            .find(ht => { for (let e = ht.object; e; e = e.parent)
                            if (e.visible === false) return false;
                          const p = tagOf(ht.object);
                          return !p || p.name !== 'Waterplane mask'; });
          if (hit && Math.abs(hit.point.y - line) > worst) {
            worst = Math.abs(hit.point.y - line); at = { u, hit: hit.point.y, line };
          }
        }
        if (worst > 0.65)
          say(v.id, 'a drawn bow off its own recorded sheer line',
              `ray at u ${at.u} lands ${at.hit.toFixed(2)} m where the record's sheer `
              + `line runs ${at.line.toFixed(2)} m (bowTopM ${H.bowTopM})`);
      }
    }

    /* ── r162: A TERRACE THE RECORD PINS BUT THE DRAWN TIER IGNORES ─────────────────────
       Queen Mary 2's aft cascade drew seven near-equal steps for 65 rounds because the
       u-spans came off the Commons scale DRAWING; the 2016 aerial and the 2004 Hamburg
       pair read five terraces with the deep ones low and mid, and r162 wrote the measured
       pins into tierAftU (Research/QM2-PLATES.md). The pins are data now, and this rule
       keeps drawing and record from drifting the way r161's roofPlate flags had: at every
       pinned tier the aft wall must STAND at (u−0.5)·lwl — down-rays just forward of the
       pin meet the tier's roof, down-rays just aft fall past it toward the terrace below.
       Three z-stations each side, because a deck work standing on the lower terrace can
       block one ray but only a wall blocks all three (fwd takes the max, aft the min).
       Record-gated: no tierAftU, no rule, no other hull touched. */
    if (H.tierAftU && H.decks && H.lwl) {
      const nT = H.decks, baseT = H.freeboard || 0,
            dhT = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
      const fl = i => (i <= 0) ? baseT
        : (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
        : baseT + dhT * i;
      const rcT = new THREE.Raycaster();
      const zs = [0, (H.beam || 10) * 0.2, -(H.beam || 10) * 0.2];
      const drop = (x, z) => {
        rcT.set(new THREE.Vector3(x, 90, z), new THREE.Vector3(0, -1, 0));
        const hit = rcT.intersectObject(g, true)
          .find(ht => { for (let e = ht.object; e; e = e.parent)
                          if (e.visible === false) return false;
                        const p = tagOf(ht.object);
                        return !p || p.name !== 'Waterplane mask'; });
        return hit ? hit.point.y : -1;
      };
      for (const k in H.tierAftU) {
        const i = +k;
        if (!(i > 0 && i < nT - 1)) continue;          // mkPin's own key filter
        const wall = (H.tierAftU[k] - 0.5) * H.lwl, roof = fl(i + 1);
        /* r166: a recorded plan round bulges the face AFT of its own chord by the
           sagitta — the aft probe moves past the recorded apex, or it would convict
           the arc the record attests. No tierRound, the old 0.6, byte for byte. */
        const sagK = (H.tierRound && H.tierRound[k]) ? H.tierRound[k].sagittaM : 0;
        const fwd = Math.max(...zs.map(z => drop(wall - 0.6, z)));
        const aft = Math.min(...zs.map(z => drop(wall + sagK + 0.6, z)));
        if (fwd < roof - 0.5)
          say(v.id, 'a terrace the record pins but the drawn tier ignores',
              `tier ${i} pinned aft at u ${H.tierAftU[k]} yet the ray just forward of the `
              + `pin lands ${fwd.toFixed(2)} m where the tier roof runs ${roof.toFixed(2)} m`);
        else if (aft > roof - 0.5)
          say(v.id, 'a tier drawn past its recorded aft pin',
              `tier ${i} pinned aft at u ${H.tierAftU[k]} yet the ray just aft of the pin `
              + `still lands ${aft.toFixed(2)} m — the wall stands beyond its own record`);
      }

      /* ── AND A PIN PAST THE PERPENDICULAR MUST RIDE THE COUNTER (round 163) ──────────
         Queen Mary 2's fantail edge is recorded at u 1.008 — past the after
         perpendicular, over the counter (the r162 chain closure; the 2011 Southampton
         astern plate reads one continuous rounded shell from counter to fantail rail).
         Two ways that record can rot, so two arms. ARITHMETIC: the record's own
         loa/lwl/rakes place the drawn stern extremity, and a pin past it stands on
         water no loft can reach. RAYS: under the old u 0.999 clamp the walls freeze at
         the clamp's half-breadth and the last five metres of stern are a tube inside
         the counter — drawn, roofed, and wrong in plan only, which no elevation shows.
         So at three stations across the swept quarter a down-ray one waterway plus a
         margin inside the TRUE deck edge (surfacePoint at the bisection-inverted x, the
         same loft the builder rides) must meet the pinned tier's roof, both sides.
         Ray arm record-gated on a pin past u 1.0: no such pin, no rays, no other hull
         touched. */
      if (H.loa) {
        const rakeAllow2 = ((H.stemRake || 0) + (H.sternRake || 0)) * H.loa;
        const rakeScale2 = rakeAllow2 > 0
          ? Math.min(1, Math.max(0, H.loa - H.lwl) / rakeAllow2) : 1;
        const tipU = 0.5 + (0.5 * H.lwl + (H.sternRake || 0) * rakeScale2 * H.loa) / H.lwl;
        const pins2 = Object.entries(H.tierAftU).map(([k2, p2]) => [+k2, p2]);
        if (H.houseAt && H.houseAt.length === 2) pins2.push([0, H.houseAt[1]]);
        for (const [i2, p2] of pins2)
          if (p2 > tipU - 0.0005)
            say(v.id, 'a terrace pinned past the ship\'s own counter',
                `tier ${i2} aft pin u ${p2} vs the drawn stern extremity u ${tipU.toFixed(4)}`);
        const swept = pins2.filter(([i2, p2]) =>
          i2 > 0 && i2 < nT - 1 && p2 > 1.0 && p2 <= tipU - 0.0005);
        if (swept.length) {
          const HSs2 = SHIPS_HULL.hullSurface(H);
          const qAtX2 = (x) => {
            let lo = 0, hi = 1;
            for (let it = 0; it < 32; it++) {
              const q = (lo + hi) / 2;
              if ((q - 0.5) * H.lwl + HSs2.rake(q) < x) lo = q; else hi = q;
            }
            return (lo + hi) / 2;
          };
          for (const [i2, p2] of swept) {
            const xPin = (p2 - 0.5) * H.lwl;
            const above = H.tierAftU[String(i2 + 1)];
            const xAbove = ((above !== undefined ? above : p2 - 0.05) - 0.5) * H.lwl;
            const roof2 = fl(i2 + 1);
            for (const f of [0.45, 0.6, 0.75]) {
              const x = xAbove + (xPin - xAbove) * f;
              const zE = Math.abs(SHIPS_HULL.surfacePoint(H, HSs2, qAtX2(x), 1.0)[2])
                         - (H.beam || 10) * 0.015 - 0.35;
              if (zE < 0.8) continue;
              const land = Math.min(drop(x, zE), drop(x, -zE));
              if (land < roof2 - 0.5)
                say(v.id, 'a counter the record pins but the drawn sweep never reaches',
                    `tier ${i2} pinned at u ${p2} past the perpendicular, yet the ray one `
                    + `waterway inside the true deck edge at x ${x.toFixed(1)} lands `
                    + `${land.toFixed(2)} m where the tier roof runs ${roof2.toFixed(2)} m`);
            }
          }
        }
      }

      /* ── r165: A WING THE RECORD PINS BUT THE DRAWN TIER CUTS OFF ────────────────────
         Queen Mary 2's terraces sit recessed between side balcony wings — enclosed
         structure running aft past each tier's own centre face (the 2016 aerial,
         Research/QM2-PLATES.md read 3a) — and r165 recorded them (tierWings: the u
         each wing tip reaches and its inboard depth) and wound the tier perimeter
         around the notch. Three arms. ARITHMETIC: a wing must run AFT of its own
         tier's face and STAND ON the roof below — a tip past the floor that carries
         it hangs over the terrace or the sea. WING STANDS: a down-ray inside the wing
         strip midway between face and tip must land no lower than the wing's own roof
         less tolerance (one-sided, so a rail stanchion on the strip cannot
         false-convict). NOTCH OPEN: down-rays at the centreline at that same station
         must NOT land at the tier's roof — a full-width tier there is the wing drawn
         as a shelf, the exact fault the record exists to forbid. And the counter
         direction, closing r162's outboard blind spot: at every pinned tier WITHOUT a
         wing record, a down-ray at the deck edge just aft of the pin must land no
         higher than the terrace floor plus a rail — anything a story high there is a
         wing nobody attested. Record-gated: no tierWings and the counter arm sees
         only pinned tiers; a hull with neither is untouched. */
      {
        const HSw = SHIPS_HULL.hullSurface(H);
        const edgeZ = (u) => Math.abs(SHIPS_HULL.surfacePoint(H, HSw, u, 1.0)[2])
                             - (H.beam || 10) * 0.015 - 0.35;
        const wrec = H.tierWings || {};
        for (const k in wrec) {
          const i = +k;
          if (!Number.isFinite(i)) continue;               // the provenance key
          const w = wrec[k];
          const face = H.tierAftU[k];
          if (face === undefined) {
            say(v.id, 'a wing on a tier whose face no record pins',
                `tierWings[${k}] with no tierAftU[${k}]`);
            continue;
          }
          if (!(w.aftU > face + 0.004))
            say(v.id, 'a wing that does not outrun its own face',
                `tierWings[${k}].aftU ${w.aftU} against the tier face u ${face}`);
          if (!(w.depthM > 0 && w.depthM < (H.beam || 10) / 2))
            say(v.id, 'a wing deeper than the half-beam it stands in',
                `tierWings[${k}].depthM ${w.depthM} on beam ${H.beam}`);
          const bw = wrec[String(i - 1)];
          const below = bw ? bw.aftU
            : (i - 1 >= 1 ? H.tierAftU[String(i - 1)]
                          : (H.houseAt ? H.houseAt[1] : undefined));
          if (below !== undefined && w.aftU > below + 1e-6)
            say(v.id, 'a wing tip past the floor that carries it',
                `tierWings[${k}].aftU ${w.aftU} against the tier-below extent u ${below}`);
          /* the scene: the wing stands, and the notch is open */
          const uMid = (face + Math.min(w.aftU,
                                        below !== undefined ? below : w.aftU)) / 2;
          const zE = edgeZ(uMid);
          if (zE > 0.8) {
            const x = (uMid - 0.5) * H.lwl, wroof = fl(i + 1);
            const stand = Math.max(drop(x, zE), drop(x, -zE));
            if (stand < wroof - 0.5)
              say(v.id, 'a recorded wing with no drawn structure',
                  `tierWings[${k}] pins the tip at u ${w.aftU} yet the deck-edge ray `
                  + `at u ${uMid.toFixed(3)} lands ${stand.toFixed(2)} m where the `
                  + `wing roof runs ${wroof.toFixed(2)} m`);
            /* r166: a recorded round is allowed to reach into the notch as far as
               its own apex — the open-notch probes stand aft of it. No tierRound,
               uOpen === uMid, byte for byte. */
            const uOpen = Math.max(uMid, face
              + ((H.tierRound && H.tierRound[k]) ? H.tierRound[k].sagittaM : 0)
                / H.lwl + 0.002);
            const xO = (uOpen - 0.5) * H.lwl;
            const open = Math.min(...[0, (H.beam || 10) * 0.1, -(H.beam || 10) * 0.1]
                                  .map(z => drop(xO, z)));
            if (open > wroof - 0.5)
              say(v.id, 'a wing drawn as a full-width shelf',
                  `tier ${k} centreline ray at u ${uOpen.toFixed(3)} lands `
                  + `${open.toFixed(2)} m — the tier still crosses the notch the `
                  + `record recesses`);
          }
        }
        /* the counter direction: r162's aft arm watches z ±beam·0.2, and a wing
           lives outboard of that — so watch the deck edge at every pinned tier
           that carries NO wing record */
        for (const k in H.tierAftU) {
          const i = +k;
          if (!(i > 0 && i < nT - 1) || wrec[k]) continue;
          const pin = H.tierAftU[k];
          const bw2 = wrec[String(i - 1)];
          const ext = bw2 ? bw2.aftU
            : (i - 1 >= 1 ? H.tierAftU[String(i - 1)] : undefined);
          const uProbe = pin + 0.012;
          if (ext === undefined || uProbe > ext - 0.005) continue;  // no floor to probe
          const zP = edgeZ(uProbe);
          if (zP < 0.8) continue;
          const xP = (uProbe - 0.5) * H.lwl;
          const landE = Math.max(drop(xP, zP), drop(xP, -zP));
          if (landE > fl(i) + 1.5)
            say(v.id, 'a wing nobody attested',
                `tier ${k} ends at u ${pin} with no tierWings, yet the deck-edge ray `
                + `just aft lands ${landE.toFixed(2)} m — a story above the terrace `
                + `floor ${fl(i).toFixed(2)} m`);
        }
      }

      /* ── r166: A ROUND THE RECORD PINS BUT THE DRAWN FACE CUTS SQUARE ────────────────
         Queen Mary 2's jacuzzi step sweeps convex-aft between its r165 wing decks on
         the 2016 aerial — the aft rail an arc, 2.9 m of sagitta at the centreline —
         and r166 recorded it (tierRound: how far the face's centre stands aft of the
         chord through its notch corners) and bent the perimeter's centre-face leg
         into the arc. Two arms plus the counter. ARITHMETIC: a sagitta below any
         plate's support is a number nobody measured, and an apex past the tier's own
         wing chamfer (or, unwinged, past the terrace floor below) bulges into
         structure the record contradicts. SCENE: a centreline down-ray just aft of
         the chord, inside the recorded bulge, must land ON the tier's own roof — a
         fall to the terrace below is the square cut the record exists to forbid.
         COUNTER: at every pinned tier with NO round, a centreline ray 1.2 m aft of
         the pin must fall past the face — a roof there is a bulge nobody attested.
         Record-gated: no tierRound and the counter arm sees only pinned tiers. */
      {
        const rrec = H.tierRound || {};
        const pitchR = ((H.tierBands && H.tierBands.pitchM) || 2.6) / H.lwl;
        for (const k in rrec) {
          const i = +k;
          if (!Number.isFinite(i)) continue;             // the provenance key
          const r = rrec[k];
          const face = H.tierAftU[k];
          if (face === undefined) {
            say(v.id, 'a round on a tier whose face no record pins',
                `tierRound[${k}] with no tierAftU[${k}]`);
            continue;
          }
          if (!(r.sagittaM > 0.3 && r.sagittaM <= (H.beam || 10) * 0.45))
            say(v.id, 'a round the plate cannot support',
                `tierRound[${k}].sagittaM ${r.sagittaM} on beam ${H.beam}`);
          const wR = (H.tierWings || {})[k];
          const boundR = (wR ? wR.aftU
            : (i - 1 >= 1 ? H.tierAftU[String(i - 1)]
                          : (H.houseAt ? H.houseAt[1] : 1))) - pitchR;
          const apexU = face + r.sagittaM / H.lwl;
          if (apexU >= boundR)
            say(v.id, 'a round whose apex outruns its own notch',
                `tierRound[${k}] puts the apex at u ${apexU.toFixed(4)} against the `
                + `${wR ? 'wing chamfer' : 'floor below'} at u ${boundR.toFixed(4)}`);
          /* the scene: the bulge stands */
          if (i > 0 && i < nT - 1) {
            const xR = (face - 0.5) * H.lwl + r.sagittaM * 0.55;
            const landR = drop(xR, 0), roofR = fl(i + 1);
            if (landR < roofR - 0.5)
              say(v.id, 'a recorded round with no drawn bulge',
                  `tierRound[${k}] attests ${r.sagittaM} m of sweep yet the centreline `
                  + `ray at x ${xR.toFixed(1)} lands ${landR.toFixed(2)} m where the `
                  + `tier roof runs ${roofR.toFixed(2)} m`);
          }
        }
        /* the counter direction: a centre bulge slips the r162 aft arm, which takes
           the MIN over three z-stations exactly so deck furniture cannot convict —
           so the centreline gets its own one-sided watch at every unrounded pin */
        for (const k in H.tierAftU) {
          const i = +k;
          if (!(i > 0 && i < nT - 1) || rrec[k]) continue;
          const pin = H.tierAftU[k];
          const below = (H.tierWings && H.tierWings[k]) ? H.tierWings[k].aftU
            : (i - 1 >= 1 ? H.tierAftU[String(i - 1)] : undefined);
          const uC = pin + 1.2 / H.lwl;
          if (below !== undefined && uC > below - pitchR) continue;  // no room to probe
          const landC = drop((uC - 0.5) * H.lwl, 0);
          if (landC > fl(i + 1) - 0.5)
            say(v.id, 'a bulge nobody attested',
                `tier ${k} ends square at u ${pin} with no tierRound, yet the `
                + `centreline ray 1.2 m aft lands ${landC.toFixed(2)} m at the tier's `
                + `own roof height ${fl(i + 1).toFixed(2)} m`);
        }
      }
    }

    /* ── r167: A WALL SIZED OFF A STATION IT DOES NOT STAND AT ──────────────────────────
       linerHouse half() sampled the shell at u as if x were (u − 0.5)·lwl — no rake —
       on every hull without a pin past the perpendicular (r163 fixed only those), so
       inside the rake spans each wall stood up to a rake's length INBOARD of the shell
       at its own station: Queen Mary 2's forward tiers 1.7 m too narrow before her r163
       gate, the warship bow tiers 0.2–0.3 m, titanic's aft corner 5 cm (measured,
       build/staging/r167/bias-before.json). r167 re-lofted the FLEET: every
       half-breadth inverts the true deck-edge x by bisection. Three arms. ARITHMETIC:
       the audit's own re-derived inversion must return a q whose x matches the target
       within 2 cm at every tier edge — a rake term bisection cannot invert breaks
       every derivation downstream, silently. RAYS (gated on a predicted bias over
       0.5 m at some tier edge, so a hull whose house never enters a rake span is
       untouched): a down-ray one margin inside the PREDICTED wall at the biased edge
       must meet the tier's roof — under no-rake sampling the wall stands a rake's
       length further inboard and the ray falls to the deck. COUNTER: rays just
       outside the predicted wall, at three x-stations so a davit or a boat cannot
       false-convict (min per side), must NOT land at roof height — structure out
       there is sized off yet another station nobody attested. Only hulls that draw
       the house are probed (no turrets, no flight deck — their tiers feed fittings
       and boats, not walls). */
    if (H.decks && H.lwl && !H.turrets && !H.flightDeck && g) {
      const n7 = H.decks, B7 = H.beam || 10, L7 = H.lwl;
      const HS7 = SHIPS_HULL.hullSurface(H);
      const base7 = H.freeboard || 0,
            dh7 = H.deckM || Math.min(B7 * 0.105, 3.0);
      const fl7 = i => (i <= 0) ? base7
        : (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
        : base7 + dh7 * i;
      const qAtX7 = (x) => {
        if (x <= -0.5 * L7 + HS7.rake(0)) return 0;
        if (x >= 0.5 * L7 + HS7.rake(1)) return 1;
        let lo = 0, hi = 1;
        for (let it = 0; it < 32; it++) {
          const q = (lo + hi) / 2;
          if ((q - 0.5) * L7 + HS7.rake(q) < x) lo = q; else hi = q;
        }
        return (lo + hi) / 2;
      };
      const shellTrue7 = x => Math.abs(SHIPS_HULL.surfacePoint(H, HS7, qAtX7(x), 1.0)[2]);
      const shellOld7 = u => Math.abs(SHIPS_HULL.surfacePoint(H, HS7,
                              Math.max(0.001, Math.min(0.999, u)), 1.0)[2]);
      const ns7 = H.shellTiers || 0,
            taper7 = H.houseTaper !== undefined ? H.houseTaper : 0.16;
      const predHalf = (i, x) => {
        const sh = i < ns7;
        const wid = sh ? B7 : B7 * (1 - taper7 * (0.5 + i / n7));
        const ins = sh ? B7 * 0.015 : (taper7 < 0.06 ? B7 * 0.015 : B7 * 0.055);
        return Math.max(B7 * 0.06, Math.min(wid / 2, shellTrue7(x) - ins));
      };
      /* the tier SPANS come from the builder (record-interpolated pins — not the
         contested quantity); the predicted HALVES are re-derived above, independently */
      const T7 = SHIPS_HULL.linerHouse(H);
      let pick = null;
      for (let i = 0; i < T7.tiers.length; i++) {
        const t = T7.tiers[i];
        for (const [u7, dir7] of [[t.uA, 1], [t.uB, -1]]) {
          const x7 = (u7 - 0.5) * L7, q7 = qAtX7(x7);
          if (q7 > 0 && q7 < 1
              && Math.abs((q7 - 0.5) * L7 + HS7.rake(q7) - x7) > 0.02)
            say(v.id, 'a station inversion the loft cannot trust',
                `tier ${i} edge u ${u7.toFixed(4)}: bisection returns q ${q7.toFixed(5)} `
                + `whose x misses the target by more than 2 cm`);
          const bias7 = shellTrue7(x7) - shellOld7(u7);
          if (!pick || Math.abs(bias7) > Math.abs(pick.bias))
            pick = { i, u: u7, dir: dir7, bias: bias7 };
        }
      }
      if (pick && Math.abs(pick.bias) > 0.5) {
        const rc7 = new THREE.Raycaster();
        const drop7 = (x, z) => {
          rc7.set(new THREE.Vector3(x, 90, z), new THREE.Vector3(0, -1, 0));
          const hit = rc7.intersectObject(g, true)
            .find(ht => { for (let e = ht.object; e; e = e.parent)
                            if (e.visible === false) return false;
                          const p = tagOf(ht.object);
                          return !p || p.name !== 'Waterplane mask'; });
          return hit ? hit.point.y : -1;
        };
        const xP = (pick.u - 0.5) * L7 + pick.dir * 1.2;
        const wall7 = predHalf(pick.i, xP), roof7 = fl7(pick.i + 1);
        const inn = Math.min(drop7(xP, wall7 - 0.35), drop7(xP, -(wall7 - 0.35)));
        if (inn < roof7 - 0.5)
          say(v.id, 'a wall sized off a station it does not stand at',
              `tier ${pick.i} edge u ${pick.u.toFixed(3)} carries ${pick.bias.toFixed(2)} m `
              + `of rake bias, yet the ray one margin inside the true wall at x `
              + `${xP.toFixed(1)} lands ${inn.toFixed(2)} m where the tier roof runs `
              + `${roof7.toFixed(2)} m`);
        for (const sgn of [1, -1]) {
          const outs = Math.min(...[xP - 2, xP, xP + 2]
            .map(xx => drop7(xx, sgn * (predHalf(pick.i, xx) + 0.6))));
          if (outs > roof7 - 0.5)
            say(v.id, 'a wall standing outside the shell station that sizes it',
                `tier ${pick.i} edge u ${pick.u.toFixed(3)}: rays just outside the `
                + `predicted wall land ${outs.toFixed(2)} m, at the tier's own roof `
                + `height ${roof7.toFixed(2)} m`);
        }
      }
    }

    /* ── r164: THE HULL'S PAINT DOES NOT STOP AT THE HULL ───────────────────────────────
       Queen Mary 2's black rises over the counter: every aft-quarter plate reads ONE deck
       of white at the stern face — the name is painted on black — and r164 recorded it
       (sternLivery: how many white shell strakes the black swallows at the face, and the
       knee where the line leaves the level sheer) and drew it as a paint strip riding the
       strake walls' own loft, its top edge the paint line. Two ways record and drawing
       can drift, so two arms. ARITHMETIC: the rise must fit the ship that carries it —
       at least one strake, no more than the shell has, the knee inside the house and
       forward of the stern extremity. SCENE: the strip must STAND — meshes named
       sternLivery must reach the house's aft extremity in x, run from the house floor to
       the recorded strake boundary in y, and wear the topside's own colour, not the
       strake white they cover. And the other direction: a strip on a hull whose record
       says nothing is paint nobody attested. Record-gated both ways: no sternLivery and
       no strip, no rule, no other hull touched. */
    {
      const strips = [];
      g.traverse(o => { if (o.isMesh && o.name === 'sternLivery') strips.push(o); });
      const sl = H.sternLivery;
      if (sl) {
        const shellsA = H.shellTiers || 0;
        if (!(sl.strakes >= 1) || sl.strakes > shellsA)
          say(v.id, 'a livery rise the ship cannot carry',
              `sternLivery.strakes ${sl.strakes} against ${shellsA} shell strake(s)`);
        if (H.houseAt && H.houseAt.length === 2
            && !(sl.fromU > H.houseAt[0] && sl.fromU < H.houseAt[1] - 0.01))
          say(v.id, 'a livery knee outside the house it paints',
              `sternLivery.fromU ${sl.fromU} against houseAt [${H.houseAt}]`);
        if (!strips.length) {
          say(v.id, 'a recorded livery rise with no drawn paint',
              `sternLivery attests ${sl.strakes} strake(s) risen and no sternLivery `
              + 'mesh stands in the scene');
        } else {
          const baseL = H.freeboard || 0,
                dhL = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
          const flL = i => (i <= 0) ? baseL
            : (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
            : baseL + dhL * i;
          const topL = flL(Math.min(sl.strakes, shellsA));
          const bb = new THREE.Box3();
          strips.forEach(s2 => bb.union(new THREE.Box3().setFromObject(s2)));
          if (H.houseAt && H.houseAt.length === 2
              && bb.max.x < (H.houseAt[1] - 0.5) * H.lwl - 1.0)
            say(v.id, 'a livery rise that stops short of the stern it paints',
                `the strip ends at x ${bb.max.x.toFixed(1)} where the house aft `
                + `extremity runs to x ${((H.houseAt[1] - 0.5) * H.lwl).toFixed(1)}`);
          if (Math.abs(bb.max.y - topL) > 0.35 || Math.abs(bb.min.y - baseL) > 0.35)
            say(v.id, 'a paint line off its own recorded strake boundary',
                `the strip spans y ${bb.min.y.toFixed(2)}–${bb.max.y.toFixed(2)} m where `
                + `the record puts the rise ${baseL.toFixed(2)}–${topL.toFixed(2)} m`);
          const ca = strips[0].geometry.getAttribute('color');
          const want = new THREE.Color(H.topside || '#3a3a3c');
          if (ca && (Math.abs(ca.getX(0) - want.r) > 0.03
                  || Math.abs(ca.getY(0) - want.g) > 0.03
                  || Math.abs(ca.getZ(0) - want.b) > 0.03))
            say(v.id, 'risen paint that is not the topside\'s own',
                `strip colour (${ca.getX(0).toFixed(2)}, ${ca.getY(0).toFixed(2)}, `
                + `${ca.getZ(0).toFixed(2)}) against topside ${H.topside}`);
        }
      } else if (strips.length) {
        say(v.id, 'risen paint nobody attested',
            `${strips.length} sternLivery mesh(es) stand on a hull whose record `
            + 'carries no sternLivery');
      }
    }

    /* ── r166: THE FANTAIL RAIL IS A SCREEN THE RECORD NAMES ────────────────────────────
       Both of Queen Mary 2's aft-quarter plate eras read the fantail's swept edge
       carrying a continuous translucent windscreen band under a dark top rail — panel
       posts and a person leaning on the rail resolved on the 2011 astern plate — and
       r166 recorded it (fantailScreen: which tier's exposed aft roof edge, the height
       over the deck, the outward lean) and drew it riding the promenade path the open
       rail rode. Two arms. ARITHMETIC: the height and lean must be what a deck screen
       can be, and the tier must exist. SCENE: a mesh named fantailScreen must stand —
       base at the tier's own roof, head the recorded height above it, reaching the
       house's aft extremity, and LEANING: the top vertex of each pair stands farther
       from the path's own horizontal centroid than its base, or the record's one
       attested direction is not drawn. And the other direction: a screen on a hull
       whose record names none is glass nobody attested. Record-gated both ways. */
    {
      const scr = [];
      g.traverse(o => { if (o.isMesh && o.name === 'fantailScreen') scr.push(o); });
      const fs = H.fantailScreen;
      if (fs) {
        if (!(fs.hM >= 0.9 && fs.hM <= 2.0))
          say(v.id, 'a screen no deck edge carries',
              `fantailScreen.hM ${fs.hM} — outside 0.9–2.0 m`);
        if (!(fs.leanDeg >= 0 && fs.leanDeg <= 25))
          say(v.id, 'a screen leaning past its own plates',
              `fantailScreen.leanDeg ${fs.leanDeg} — outside 0–25 deg`);
        if (!(Number.isInteger(fs.tier) && fs.tier >= 0 && fs.tier < (H.decks || 0)))
          say(v.id, 'a screen on a tier the ship does not have',
              `fantailScreen.tier ${fs.tier} on ${H.decks || 0} decks`);
        if (!scr.length) {
          say(v.id, 'a recorded windscreen with no drawn glass',
              `fantailScreen attests ${fs.hM} m of screen and no fantailScreen mesh `
              + 'stands in the scene');
        } else {
          const baseF = H.freeboard || 0,
                dhF = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
          const flF = i => (i <= 0) ? baseF
            : (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
            : baseF + dhF * i;
          const yDeck = flF(fs.tier + 1);
          const bbF = new THREE.Box3();
          scr.forEach(s2 => bbF.union(new THREE.Box3().setFromObject(s2)));
          if (Math.abs(bbF.min.y - yDeck) > 0.35
              || Math.abs(bbF.max.y - (yDeck + fs.hM)) > 0.35)
            say(v.id, 'a screen off its own recorded deck edge',
                `the glass spans y ${bbF.min.y.toFixed(2)}–${bbF.max.y.toFixed(2)} m `
                + `where the record puts it ${yDeck.toFixed(2)}–`
                + `${(yDeck + fs.hM).toFixed(2)} m`);
          if (H.houseAt && H.houseAt.length === 2
              && bbF.max.x < (H.houseAt[1] - 0.5) * H.lwl - 1.5)
            say(v.id, 'a screen that stops short of the sweep it rings',
                `the glass ends at x ${bbF.max.x.toFixed(1)} where the house aft `
                + `extremity runs to x ${((H.houseAt[1] - 0.5) * H.lwl).toFixed(1)}`);
          /* the lean: base/top vertex pairs, the top outboard of the base */
          const pa = scr[0].geometry.getAttribute('position');
          let cx = 0, cz = 0, nB = 0;
          for (let q2 = 0; q2 < pa.count; q2 += 2) { cx += pa.getX(q2); cz += pa.getZ(q2); nB++; }
          cx /= nB; cz /= nB;
          let leanOK = 0;
          for (let q2 = 0; q2 + 1 < pa.count; q2 += 2) {
            const dB = Math.hypot(pa.getX(q2) - cx, pa.getZ(q2) - cz);
            const dT = Math.hypot(pa.getX(q2 + 1) - cx, pa.getZ(q2 + 1) - cz);
            if (dT > dB + 0.02) leanOK++;
          }
          if (fs.leanDeg > 2 && leanOK < nB * 0.9)
            say(v.id, 'a screen that does not lean the way the plates read',
                `${leanOK} of ${nB} panel pairs stand outboard of their own base`);
        }
      } else if (scr.length) {
        say(v.id, 'a windscreen nobody attested',
            `${scr.length} fantailScreen mesh(es) stand on a hull whose record `
            + 'carries no fantailScreen');
      }
    }

    /* ── r155: A RECORDED FLAG-BUTTON IS WHERE THE MAST STOPS ───────────────────────────
       Preussen's record attests ONE mast height and its datum is the truck: 58 m deck to
       flag-button, all five masts — the Laeisz Standardrigg cut interchangeable spars, so
       one figure covers the rig. `truckM` on a square mast record states it. The drawn
       stack must LAND it, and the mast's own meshes are the witnesses: every segment is
       stepped at the deck and the stack tops out at the truck, so the y-span of the
       mast-tagged meshes at that station IS deck-to-truck. Before r155 the builder drew
       heightM (a lower-mast guess) through the fidded fractions and Preussen's trucks
       stood 51.2 m — 6.8 m short of her record, on all five masts. */
    (H.masts || []).forEach((mk, i) => {
      if (mk.truckM === undefined || mk.rig !== 'square') return;
      const mt = (H.__mastTops || []).find(t => Math.abs(t.u - mk.at) < 0.02);
      if (!mt) {
        say(v.id, 'recorded truck with no drawn masthead',
            `mast ${i} attests truckM ${mk.truckM} m and no masthead stands near u ${mk.at}`);
        return;
      }
      const win = (H.beam || 10) * 0.25;
      let lo = 1e9, hi = -1e9;
      g.traverse(o => {
        if (!o.isMesh || !tagOf(o) || tagOf(o).key !== 'mast') return;
        const b2 = new THREE.Box3().setFromObject(o);
        if (Math.abs((b2.min.x + b2.max.x) / 2 - mt.x) < win) {
          lo = Math.min(lo, b2.min.y); hi = Math.max(hi, b2.max.y);
        }
      });
      if (hi > lo && Math.abs((hi - lo) - mk.truckM) > 0.75)
        say(v.id, 'mast short of its recorded flag-button',
            `mast ${i} spans ${(hi - lo).toFixed(2)} m deck-to-truck against the record's `
            + `${mk.truckM} m`);
    });

    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99) ─────────────────────────────
       The fished anchor's fork plane is parallel to the planking — that is why broadside
       photographs of a preserved two-decker show the anchor's whole profile. A fixed roll
       constant had the fork athwartships instead: one fluke buried two metres INSIDE the
       skin, the other 3.0 m off the ship in open air, and no bearing in the baseline set
       could tell, because a black anchor against a dark wale reads as an anchor. The two
       flukes are the fork's own witnesses: cones on one anchor group must stand at the
       same distance off the centreline, or the fork is rotated off the side. */
    g.traverse(o => {
      if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'anchor') return;
      const flukes = [];
      o.traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === 'ConeGeometry')
                          flukes.push(Math.abs(new THREE.Box3().setFromObject(m)
                            .getCenter(new THREE.Vector3()).z)); });
      if (flukes.length === 2 && Math.abs(flukes[0] - flukes[1]) > 1.5)
        say(v.id, 'anchor fork athwart the ship',
            `flukes at ${flukes[0].toFixed(1)} and ${flukes[1].toFixed(1)} m off centre — `
            + 'one in the planking or one in the air');
    });

    /* ── EVERY MESH HAS A PART (round 99) ───────────────────────────────────────────────
       The stated rule of this view: the geometry is the source of the labels, no second
       list. A mesh with no tagged ancestor is invisible to the part picker, uncounted by
       every census in this audit, and unnameable by a viewer — the 74 carried her boat
       skids that way for sixty rounds. */
    {
      let untagged = 0, first = null;
      g.traverse(o => {
        if (!o.isMesh || tagOf(o)) return;
        untagged++;
        if (!first) {
          const b2 = new THREE.Box3().setFromObject(o);
          first = `${o.geometry ? o.geometry.type : '?'} at x ${b2.min.x.toFixed(1)}..${b2.max.x.toFixed(1)}`;
        }
      });
      if (untagged)
        say(v.id, 'mesh with no part tag', `${untagged} untagged mesh(es); first: ${first}`);
    }

    /* ── THE BUILT CAP LINE STANDS WHERE THE RECORD READS IT (round 98) ─────────────────
       The record can be right and the build still wrong — a dropped gate, a stale copy of
       the sheer, a loft fed the deck instead of the cap. So ask the MESHES: inside each
       span (margins exclude the riser and end stations; u from x assumes the terrace region
       carries no stern rake, which a terraced stern does not), the tallest terrace-tagged
       vertex must reach the span's own cap line and nothing tagged terrace may stand past
       it. Fires 1-for-1 under a y-shift injection; silent when the build honours the read. */
    if (H.sternSteps) {
      const ss = H.sternSteps.steps || [];
      /* the cap is RAKED, so a span has no single height: every vertex is judged against
         the record's own line AT ITS OWN u. The tallest deviation should be ~0 — the cap
         tops sit on the line — so a build shifted low reads a large negative maxDev and
         anything standing proud reads positive. (The first version compared the span's
         interior max against the span's FORWARD cap value and convicted every raked cap
         of being its own rake short — the audit was the fault, rule 8.) */
      const spanDev = ss.map(() => -1e9);
      g.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        const p = tagOf(o);
        if (!p || p.key !== 'terrace') return;
        const a = o.geometry.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) {
          const uu = a[i] / H.lwl + 0.5;
          for (let s2 = 0; s2 < ss.length; s2++)
            if (uu > ss[s2].u[0] + 0.002 && uu < ss[s2].u[1] - 0.002) {
              const t = (uu - ss[s2].u[0]) / (ss[s2].u[1] - ss[s2].u[0]);
              const want = ss[s2].topM[0] + (ss[s2].topM[1] - ss[s2].topM[0]) * t;
              spanDev[s2] = Math.max(spanDev[s2], a[i + 1] - want);
            }
        }
      });
      for (let s2 = 0; s2 < ss.length; s2++) {
        if (spanDev[s2] < -1e8) continue;   // a span too short to hold an interior station
        if (spanDev[s2] < -0.2 || spanDev[s2] > 0.3)
          say(v.id, 'stern cap off its record',
              `step ${s2} built cap sits ${spanDev[s2].toFixed(2)} m off the recorded line`);
      }

      /* ── A STAIR LANDS ON BOTH ITS DECKS, INSIDE THE HULL (round 102) ────────────────
         A terrace flight's top tread is flush with the deck above its break and its feet
         stand on the deck below; both decks CROWN 0.035·half above their edge height, so
         the tolerance absorbs the camber. And every tread stays inside the deck edge at
         its own station — a flight placed from a stale half-breadth would hang past the
         shell exactly like round 100's rails. Fires under a ±0.5 m y-shift and a 1.2 m
         outboard shift (inject-stair-shift.js / inject-stair-outboard.js). */
      const HSs = SHIPS_HULL.hullSurface(H);
      const wv = new THREE.Vector3();
      g.updateMatrixWorld(true);
      g.traverse(o => {
        if (!o.userData.part || o.userData.part.key !== 'stair' || !o.children.length) return;
        let minY = 1e9, maxY = -1e9, maxZ = 0, mx = 0, nch = 0;
        for (const c of o.children) {
          if (!c.isMesh || !c.geometry.parameters) continue;
          const p = c.geometry.parameters;
          c.getWorldPosition(wv);          // world, not local — a shifted GROUP must still convict
          minY = Math.min(minY, wv.y - p.height / 2);
          maxY = Math.max(maxY, wv.y + p.height / 2);
          maxZ = Math.max(maxZ, Math.abs(wv.z) + p.depth / 2);
          mx += wv.x; nch++;
        }
        if (!nch) return;
        const u = (mx / nch) / H.lwl + 0.5;
        let bu = null;
        for (const st of ss) if (st.u[0] > 0.5 && Math.abs(st.u[0] - u) < 0.05 &&
                                 (bu === null || Math.abs(st.u[0] - u) < Math.abs(bu - u)))
          bu = st.u[0];
        if (bu === null) { say(v.id, 'stair off its decks', `flight at u ${u.toFixed(3)} near no break`); return; }
        const dUp = HSs.sheer(bu - 1e-5), dLo = HSs.sheer(bu + 1e-5);
        const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSs, bu + 1e-5, 1)[2]);
        if (maxY < dUp - 0.05 || maxY > dUp + 0.45)
          say(v.id, 'stair off its decks',
              `top tread ${maxY.toFixed(2)} m vs upper deck ${dUp.toFixed(2)} at break ${bu}`);
        if (minY < dLo - 0.05 || minY > dLo + 0.45)
          say(v.id, 'stair off its decks',
              `foot ${minY.toFixed(2)} m vs lower deck ${dLo.toFixed(2)} at break ${bu}`);
        if (maxZ > half + 0.05)
          say(v.id, 'stair off its decks',
              `tread reaches ${maxZ.toFixed(2)} m off centre on a ${half.toFixed(2)} m half-breadth`);
      });
    }

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
                                      ['deckHatches', 'hatch', 'stowage hatches'],
                                      ['sternSteps', 'terrace', 'the stern terraces']])
      if (H[flag] && (!Array.isArray(H[flag]) || H[flag].length) && !part[key]
          /* a boatsInboard record EXPLAINS the absence: the tenders live in a garage
             inside the shell, so a declared count rightly draws nothing topside */
          && !(flag === 'boats' && H.boatsInboard))
        say(v.id, 'declared but not drawn', label);

    /* ── THE UPPER DECK STANDS ON WHAT IT CLAIMS (round 89). A gunDeck record now has two
       laws: over the apostis (the galleass) or on the hull's own rail (the panokseon — no
       frame exists, so the stanchions stand on the gunwale and the deck edge follows the
       rail line). Either way it must be DRAWN, its deck plane must sit at the declared
       height over the water, and nothing of it may reach below the waterline. And a tower
       record (the janggundae) must be drawn AND must stand on the fighting deck it claims
       — the r58 stern-furniture class in Korean dress: furniture buried in the hull or
       floating over it is invisible from every bearing, and the frame ratchet cannot see
       wrongness, only change. Datum: y is metres over water, deck plane derives as
       freeboard + gunDeck.height (rail amidships IS the freeboard, the fleet convention). */
    if (H.gunDeck) {
      const gd = part.gundeck;
      const planeY = H.freeboard + H.gunDeck.height;
      if (!gd) say(v.id, 'gun deck declared but not drawn', 'gunDeck record with no geometry');
      else {
        if (gd.y[0] < 0)
          say(v.id, 'gun deck under water',
              `lowest gun-deck vertex ${gd.y[0].toFixed(1)} m over water`);
        if (planeY < gd.y[0] - 0.3 || planeY > gd.y[1] + 0.3)
          say(v.id, 'gun deck off its declared height',
              `deck plane derives to ${planeY.toFixed(1)} m over water, drawn band ` +
              `${gd.y[0].toFixed(1)}–${gd.y[1].toFixed(1)}`);
      }
      /* ── AND THE SAMA ARE OPENINGS, NOT MARKS (round 140, supersedes the round-90
         plate count). GD.loops declares sama a side — the sekibune's whole armament
         story — and since r140 the tate-ita is built PIERCED: each sama a real slot
         through the plank, dark board behind it. A count of plate meshes can no
         longer see the story, so what convicts now is PASSAGE, slot by slot: at each
         declared slot centre a perpendicular ray from outside must pass THROUGH the
         wall's own plane — its first strike on the wall-band meshes deeper than the
         outer face — and midway between two slots the same ray must be STOPPED at
         the face. Expectation from the record and surfacePoint, never from the drawn
         meshes (the r113 discipline). The old plate form convicts itself here: a
         plate stands PROUD of the face, so the slot-centre ray strikes it shallower
         than the face, never deeper. Band check on the sama meshes kept from r90. */
      if (H.gunDeck.loops) {
        const sm = part.sama;
        if (!sm) say(v.id, 'loopholes declared but not drawn', 'GD.loops with no sama geometry');
        else {
          const bandTop = planeY + (H.gunDeck.screenH || 0) + 0.3;
          if (sm.y[0] < planeY - 0.1 || sm.y[1] > bandTop)
            say(v.id, 'loopholes out of the bulwark band',
                `sama band ${sm.y[0].toFixed(1)}–${sm.y[1].toFixed(1)} m, bulwark ` +
                `${planeY.toFixed(1)}–${bandTop.toFixed(1)}`);
          const wallSet = [];
          g.updateMatrixWorld(true);
          g.traverse(o => { const p = tagOf(o);
            if (o.isMesh && p && (p.key === 'sama' || p.name === 'Tate-ita')) wallSet.push(o); });
          const HSs = SHIPS_HULL.hullSurface(H);
          const GDs = H.gunDeck;
          const overS = GDs.over !== undefined ? GDs.over : H.beam * 0.045;
          const shHs = GDs.screenH !== undefined ? GDs.screenH : H.beam * 0.042;
          const nL = GDs.loops;
          const rc = new THREE.Raycaster(); rc.far = 60;
          let bad = 0, shot = 0, first = '';
          const yRay = planeY + H.beam * 0.007 + shHs * 0.60;
          for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nL - 1; j++) {
            /* even j: slot centre (must pass); odd j: midway between slots (must stop) */
            const u = GDs.from + (GDs.to - GDs.from) * (j / 2 + 0.5) / nL;
            const pd = SHIPS_HULL.surfacePoint(H, HSs, u, 1.0);
            const faceZ = Math.abs(pd[2]) + overS;
            rc.set(new THREE.Vector3(pd[0], yRay, sgn * (faceZ + 4)),
                   new THREE.Vector3(0, 0, -sgn));
            shot++;
            const hit = rc.intersectObjects(wallSet, true)[0];
            const depth = hit ? faceZ - hit.point.z * sgn : 99;
            const isSlot = j % 2 === 0;
            if (isSlot ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
              bad++;
              if (!first) first = `${isSlot ? 'slot' : 'wall'} at u ${u.toFixed(2)} `
                + `${sgn > 0 ? 'stbd' : 'port'}: first strike ${hit ? depth.toFixed(2) + ' m in'
                                                                    : 'nothing'}`;
            }
          }
          if (bad) say(v.id, 'sama are not openings through the wall',
                       `${bad} of ${shot} passage rays wrong — ${first}`);
        }
      }
      /* ── AND THE GUN PORTS ARE OPENINGS TOO (round 141, the r140 law on the battery).
         On a hull with no rowing frame the guns fire through the fighting-deck wall
         itself — gunsPerSide with no apostis is the panokseon's broadside — and since
         r141 that wall is built pierced: one square port at each gun's station, cut
         low on the battery's axis line, the muzzle through it. Same conviction as the
         sama: PASSAGE. At each port centre a perpendicular ray from outside must
         strike the wall-band meshes DEEPER than the outer face (the dark board
         inboard); midway between ports it must be STOPPED at the face. Expectation
         from the record and surfacePoint, never the drawn meshes (r113). The old form
         — a dark plate proud of the wall, the barrel through solid plank — convicts
         itself both ways. Rays intersect the wall set alone: the muzzle standing in
         its own port must not answer for the wall. */
      if (!H.apostis && H.gunDeck.gunsPerSide) {
        const wallSet = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && (p.name === 'Bulwark' || p.name === 'Gun port'))
            wallSet.push(o); });
        if (!wallSet.length)
          say(v.id, 'a battery with no wall to fire through',
              'gunsPerSide on a frameless hull with no Bulwark or Gun port mesh');
        else {
          const HSp = SHIPS_HULL.hullSurface(H);
          const GDp = H.gunDeck;
          const overP = GDp.over !== undefined ? GDp.over : H.beam * 0.045;
          const nP2 = GDp.gunsPerSide;
          const rc = new THREE.Raycaster(); rc.far = 60;
          let bad = 0, shot = 0, first = '';
          const yRay = planeY + H.beam * 0.007 + H.beam * 0.042;  // the battery's axis
          for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nP2 - 1; j++) {
            /* even j: port centre (must pass); odd j: midway between ports (must stop) */
            const u = GDp.from + (GDp.to - GDp.from) * (j / 2 + 0.5) / nP2;
            const pd = SHIPS_HULL.surfacePoint(H, HSp, u, 1.0);
            const faceZ = Math.abs(pd[2]) + overP;
            rc.set(new THREE.Vector3(pd[0], yRay, sgn * (faceZ + 4)),
                   new THREE.Vector3(0, 0, -sgn));
            shot++;
            const hit = rc.intersectObjects(wallSet, true)[0];
            const depth = hit ? faceZ - hit.point.z * sgn : 99;
            const isPort = j % 2 === 0;
            if (isPort ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
              bad++;
              if (!first) first = `${isPort ? 'port' : 'wall'} at u ${u.toFixed(2)} `
                + `${sgn > 0 ? 'stbd' : 'port side'}: first strike `
                + `${hit ? depth.toFixed(2) + ' m in' : 'nothing'}`;
            }
          }
          if (bad) say(v.id, 'gun ports are not openings through the wall',
                       `${bad} of ${shot} passage rays wrong — ${first}`);
        }
      }
      /* ── AND THE OAR-DECK PORTS ARE OPENINGS TOO (round 142, the r140 law one
         storey down). GD.walls closes the band between the gunwale and the fighting
         deck and GD.wallPorts counts the port row a side — the panokseon's sangjang
         belt, whose record has said "pierced by a row of small ports" since r118
         while the drawn ports were dark plates PROUD of the loft. Since r142 the
         belt is built pierced, so the same conviction applies: PASSAGE. At each
         drawn port centre a perpendicular ray from outside must strike the belt
         meshes DEEPER than the outer face; midway between ports it must be STOPPED
         at the face. The belt RAKES between rail and deck clamp, so the expected
         face is interpolated at the port row's own height — foot on the rail one
         post-face inboard, head at the clamp — from the record and surfacePoint,
         never the drawn meshes (r113). The rail's world height comes off
         surfacePoint anchored to the fleet convention (rail amidships IS the
         freeboard). The old plate form convicts itself at every port centre,
         standing proud where the ray must pass. */
      if (H.gunDeck.walls && H.gunDeck.wallPorts) {
        const beltSet = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.key === 'sangjang') beltSet.push(o); });
        if (!beltSet.length)
          say(v.id, 'a port row with no belt to pierce',
              'GD.wallPorts declared with no sangjang geometry');
        else {
          const HSw = SHIPS_HULL.hullSurface(H);
          const GDw = H.gunDeck, B2 = H.beam;
          const overW = GDw.over !== undefined ? GDw.over : B2 * 0.045;
          const nW = GDw.wallPorts;
          const headYw = planeY - B2 * 0.016;
          const yRow = headYw - 0.42;
          const pdM = SHIPS_HULL.surfacePoint(H, HSw, 0.5, 1.0);
          const yOff = H.freeboard - pdM[1];
          const rc = new THREE.Raycaster(); rc.far = 60;
          let bad = 0, shot = 0, first = '';
          for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nW - 1; j++) {
            /* even j: port centre (must pass); odd j: midway between ports (must stop) */
            const u = GDw.from + (GDw.to - GDw.from) * (j / 2 + 0.5) / nW;
            const pd = SHIPS_HULL.surfacePoint(H, HSw, u, 1.0);
            const footY = pd[1] + yOff - B2 * 0.010;
            const footZ = Math.abs(pd[2]) - B2 * 0.006;
            const headZ = Math.abs(pd[2]) + overW - B2 * 0.020 - B2 * 0.006;
            const faceZ = footZ + (headZ - footZ) * (yRow - footY) / (headYw - footY);
            rc.set(new THREE.Vector3(pd[0], yRow, sgn * (faceZ + 4)),
                   new THREE.Vector3(0, 0, -sgn));
            shot++;
            const hit = rc.intersectObjects(beltSet, true)[0];
            const depth = hit ? faceZ - hit.point.z * sgn : 99;
            const isPort = j % 2 === 0;
            if (isPort ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
              bad++;
              if (!first) first = `${isPort ? 'port' : 'belt'} at u ${u.toFixed(2)} `
                + `${sgn > 0 ? 'stbd' : 'port side'}: first strike `
                + `${hit ? depth.toFixed(2) + ' m in' : 'nothing'}`;
            }
          }
          if (bad) say(v.id, 'oar-deck ports are not openings through the belt',
                       `${bad} of ${shot} passage rays wrong — ${first}`);
        }
      }
      /* ── AND THE CLAMP IS ONE BENT TIMBER, NOT A CHAIN (round 143). On a hull that
         carries her fighting deck on the gunwale — gunDeck with no apostis, so the
         deck edge follows the hull's own curve — the fore-and-aft clamp under the
         deck lip is bent round that curve in ONE piece per side, and since r143 it
         is lofted that way. The old form was N chord boxes a side, a kink and a
         wedge gap at every joint. Conviction is by SPAN, because passage cannot
         tell two solid forms apart: every mesh tagged 'Deck clamp' must run the
         deck's own length — its x-extent within one station's width of the
         GD.from..GD.to run, from the record and surfacePoint, never the drawn
         meshes (r113) — and there must be exactly two, one a side. A chain fails
         both ways: 44 meshes, each spanning 1/22 of the run. The galleass keeps
         her straight-framed clamp (apostis branch) and is out of scope by the same
         clause that scopes the law. */
      if (!H.apostis) {
        const clamps = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.name === 'Deck clamp') clamps.push(o); });
        if (!clamps.length)
          say(v.id, 'a fighting deck with no clamp under its edge',
              'gunDeck on a frameless hull with no Deck clamp mesh');
        else {
          const HSc = SHIPS_HULL.hullSurface(H);
          const GDc = H.gunDeck;
          const xFc = SHIPS_HULL.surfacePoint(H, HSc, GDc.from, 1.0)[0];
          const xTc = SHIPS_HULL.surfacePoint(H, HSc, GDc.to, 1.0)[0];
          const run = Math.abs(xTc - xFc), stW = run / 22;
          let badC = 0, firstC = '';
          for (const m of clamps) {
            const bb = new THREE.Box3().setFromObject(m);
            const span = bb.max.x - bb.min.x;
            if (span < run - stW) {
              badC++;
              if (!firstC) firstC = `a clamp mesh spans ${span.toFixed(2)} m of a `
                + `${run.toFixed(2)} m run`;
            }
          }
          if (clamps.length !== 2 && !firstC)
            firstC = `${clamps.length} clamp meshes for two sides`;
          if (badC || clamps.length !== 2)
            say(v.id, 'the deck clamp is a chain, not a bent timber',
                `${badC} of ${clamps.length} clamp meshes short of the run — ${firstC}`);
        }
      }
      /* ── AND THE WALL ANSWERS FROM EVERY BEARING (round 91). The fighting deck's wall
         is hand-placed segment by segment along a curved rail — one side, one end panel
         or one run of segments can silently not be there, and the berth baseline shows
         each hull from ONE bearing. This is the deckhouse ring aimed at the wall's own
         band: 72 bearings x 3 heights at the wall box centre, and every ray must strike
         the ship — the panokseon closes her ends precisely because dead ahead and astern
         are the bearings a fleet met her on. The ring found all four oared hulls solid
         the day it was written (Research/ring_survey.py, 216/216 each); the rule stands
         for the atakebune and whatever else declares a gunDeck next. */
      {
        const WALL = ['Bulwark', 'End bulwark', 'Screen', 'Tate-ita'];
        const wallB = new THREE.Box3(); wallB.makeEmpty(); let nWall = 0;
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && WALL.includes(p.name)) { wallB.expandByObject(o); nWall++; } });
        if (!nWall) say(v.id, 'gun deck without a wall',
                        'a gunDeck hull with no bulwark or screen mesh at all');
        else {
          const cx = (wallB.min.x + wallB.max.x) / 2, cz = (wallB.min.z + wallB.max.z) / 2;
          const bandH = wallB.max.y - wallB.min.y;
          const rc = new THREE.Raycaster(); let through = 0, shot = 0, first = '';
          for (const f of [0.25, 0.5, 0.8]) {
            const y = wallB.min.y + bandH * f;
            for (let b = 0; b < 72; b++) {
              const th = b * Math.PI / 36;
              rc.set(new THREE.Vector3(cx + Math.cos(th) * 400, y, cz + Math.sin(th) * 400),
                     new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)).normalize());
              rc.far = 900; shot++;
              if (!rc.intersectObject(g, true).length) {
                through++;
                if (!first) first = `first at bearing ${Math.round(th * 180 / Math.PI)}°, ` +
                                    `y ${y.toFixed(1)} m`;
              }
            }
          }
          if (through) say(v.id, 'you can see through the gun-deck wall',
                           `${through} of ${shot} bearings at the wall band strike nothing — ${first}`);
        }
      }
      /* ── THE OAR DECK IS PROTECTED, AND ITS OWN RECORD SAYS SO (round 118).
         gunDeck.walls declares the sangjang belt — the closed plank band between the
         hull's rail and the fighting deck that the panokseon's own plate paints a
         dragon on. The class default is open stanchions, and the r91 ring above
         guards only the bulwark ABOVE the deck, so a missing belt BELOW it convicts
         nothing. ⚠ The first draft of this rule was a single-origin escape ring from
         the band's centre, and its own hole injection refuted it: a ship's boat and
         the capstan stand on the oar deck between the centre and the stern, so the
         missing aft end wall hid behind honest furniture. A shared origin is blind
         along any shadowed bearing. So instead: PERPENDICULAR rays at the wall's own
         expected surface, station by station, the expectation derived from the
         record and the hull surface (surfacePoint), never from the drawn meshes —
         the r113 discipline. Sides: 24 stations x 3 heights x 2 sides, straight in
         athwartships; the first strike ON THE SANGJANG MESHES must land in the
         band's own depth window [rail − 0.35, rail + over + 0.6] — the rays
         intersect the sangjang part alone, because the question is whether the
         record's wall stands where the record puts it, and the foresail honestly
         hanging across the forward approach convicted the first draft of THIS
         version too. A ray through a gap still convicts: its first sangjang strike
         is the far side's wall, outside the window. Ends: 3 heights x 3 offsets x
         2 ends, straight in fore-and-aft from just outside the panel (an approach
         from far out would start inside the bow loft), first sangjang strike
         within 0.5 m of the end plane; approach heights clear the LOCAL sheer. And
         the port row is counted like the sama: exactly 2 x wallPorts. */
      if (H.gunDeck.walls) {
        const sj = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.key === 'sangjang') sj.push(o); });
        if (!sj.length)
          say(v.id, 'sangjang walls declared but not drawn',
              'gunDeck.walls with no sangjang geometry');
        else {
          const HSw = SHIPS_HULL.hullSurface(H);
          const GDw = H.gunDeck;
          const overW = GDw.over !== undefined ? GDw.over : H.beam * 0.045;
          const rc = new THREE.Raycaster(); rc.far = 60;
          let open = 0, shot = 0, first = '';
          const miss = (where, y) => {
            open++;
            if (!first) first = `first ${where}, y ${y.toFixed(1)} m`;
          };
          for (const sgn of [-1, 1]) for (let i = 0; i < 24; i++) {
            const u = GDw.from + (GDw.to - GDw.from) * ((i + 0.5) / 24);
            const pd = SHIPS_HULL.surfacePoint(H, HSw, u, 1.0);
            const railZ = Math.abs(pd[2]);
            for (const f of [0.30, 0.55, 0.85]) {
              const y = pd[1] + (planeY - 0.15 - pd[1]) * f;
              rc.set(new THREE.Vector3(pd[0], y, sgn * (railZ + overW + 4)),
                     new THREE.Vector3(0, 0, -sgn));
              shot++;
              const hit = rc.intersectObjects(sj, true)[0];
              if (!hit || hit.point.z * sgn < railZ - 0.35
                       || hit.point.z * sgn > railZ + overW + 0.6)
                miss(`at u ${u.toFixed(2)} ${sgn > 0 ? 'stbd' : 'port'}`, y);
            }
          }
          for (const uE of [GDw.from, GDw.to]) {
            const pd = SHIPS_HULL.surfacePoint(H, HSw, uE, 1.0);
            const railZ = Math.abs(pd[2]);
            const dir = uE === GDw.from ? 1 : -1;      // +x is aft: approach the near end
            const uO = uE - dir * (1.2 / H.loa);
            const pO = SHIPS_HULL.surfacePoint(H, HSw, Math.max(0.01, Math.min(0.99, uO)), 1.0);
            const yLo = Math.max(pd[1], pO[1]) + 0.2;
            for (const zf of [-0.5, 0, 0.5]) for (const f of [0.30, 0.55, 0.85]) {
              const y = yLo + (planeY - 0.15 - yLo) * f;
              rc.set(new THREE.Vector3(pd[0] - dir * 1.2, y, zf * railZ),
                     new THREE.Vector3(dir, 0, 0));
              shot++;
              const hit = rc.intersectObjects(sj, true)[0];
              if (!hit || Math.abs(hit.point.x - pd[0]) > 0.5)
                miss(`at the ${uE === GDw.from ? 'forward' : 'aft'} end`, y);
            }
          }
          if (open) say(v.id, 'oar deck open where its wall should stand',
                        `${open} of ${shot} rays at the sangjang band miss it — ${first}`);
          if (H.gunDeck.wallPorts) {
            /* r142 supersedes the r118 plate count: the ports are OPENINGS through
               the belt now, and two meshes a side carry all sixteen (the reveal
               faces and the shadow boards), so a mesh count can no longer see the
               record. The r142 passage rule above shoots every declared port centre
               and every midpoint; what this clause still owns is bare existence. */
            const np = sj.filter(m => tagOf(m).name === 'Oar-deck port').length;
            if (!np)
              say(v.id, 'oar-deck ports declared but not drawn',
                  `record declares ${H.gunDeck.wallPorts} a side, no Oar-deck port mesh`);
          }
        }
      }
      /* ── THE BAND WEARS CLOTH, NOT PLANK (round 119).
         The panokseon's plate closes the oar band with a plank belt (gunDeck.walls,
         r118); the sekibune's plate — the Busan scroll — draws no plank there and
         hangs cloth instead: gunDeck.maku, the white band under a dark scalloped
         hem. Same discipline as the sangjang rule above: PERPENDICULAR rays at the
         band, station by station, the expectation derived from the record and
         surfacePoint, never from the drawn meshes, intersecting the MAKU part
         alone. A bare near side still convicts: its first maku strike is the far
         side's cloth, sign flipped, far outside the depth window. Ray heights stay
         BETWEEN hem and head. Until r170 the valance hung BELOW the hem line and a
         rule aimed too low would have taken the scallops for the cloth; r170 moved
         the valance to the band's HEAD, ON the cloth surface, where these rays may
         honestly count it as cloth — the strip still owns the lower ray height, so
         the r119 hole injection (strip removed, valance left) still convicts. */
      if (H.gunDeck.maku) {
        const mk = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.key === 'maku') mk.push(o); });
        if (!mk.length)
          say(v.id, 'maku declared but not drawn', 'gunDeck.maku with no cloth geometry');
        else {
          const HSm = SHIPS_HULL.hullSurface(H);
          const GDm = H.gunDeck;
          const overM = GDm.over !== undefined ? GDm.over : H.beam * 0.045;
          const headYm = H.freeboard + GDm.height - H.beam * 0.016;
          const rc = new THREE.Raycaster(); rc.far = 60;
          let open = 0, shot = 0, first = '';
          for (const sgn of [-1, 1]) for (let i = 0; i < 24; i++) {
            const u = GDm.from + (GDm.to - GDm.from) * ((i + 0.5) / 24);
            const pd = SHIPS_HULL.surfacePoint(H, HSm, u, 1.0);
            const railZ = Math.abs(pd[2]);
            const hemY = pd[1] + 0.15;
            if (headYm - hemY < 0.25) continue;   // the sheer squeezes the band out
            for (const f of [0.35, 0.75]) {
              const y = hemY + (headYm - hemY) * f;
              rc.set(new THREE.Vector3(pd[0], y, sgn * (railZ + overM + 4)),
                     new THREE.Vector3(0, 0, -sgn));
              shot++;
              const hit = rc.intersectObjects(mk, true)[0];
              if (!hit || hit.point.z * sgn < railZ - 0.05
                       || hit.point.z * sgn > railZ + overM + 0.3) {
                open++;
                if (!first) first = `first at u ${u.toFixed(2)} ` +
                                    `${sgn > 0 ? 'stbd' : 'port'}, y ${y.toFixed(1)} m`;
              }
            }
          }
          if (open) say(v.id, 'yagura band bare where its cloth should hang',
                        `${open} of ${shot} rays at the maku band miss the cloth — ${first}`);
        }
      }
      /* ── THE VALANCE HANGS FROM THE HEAD, IN ONE STRIP (round 170). The r168 sweep
         flagged the 52 'Maku hem' half-discs; the plate overruled the drawing, not
         the form — a scallop IS flat cloth, but on every hull of the scroll that
         resolves the border it hangs from the band's HEAD, tangent semicircles cut
         from one strip, white cusps rising between them to the hanging line. The
         r119 code hung spaced medallions off the FOOT: the record's own sentence
         ("white cloth UNDER a dark scalloped hem") drawn the other sign. Expectation
         from the record, surfacePoint and the class constants (lip B·0.010, tuck
         0.10, clear 0.15), never the drawn meshes; vertices read via matrixWorld in
         the hull's own frame — the r169 lesson: geometry positions, no Box3, ever.
         The band parameter is recovered from x by inverting the builder's own
         station table piecewise — a global linear inverse samples the wrong station
         where x(u) compresses at the curved ends, and a rule that measures against
         the wrong station convicts the innocent. Arms: V-HEAD (the border's top
         edge on the hanging line, judged amidships where the sheer cannot blur it),
         V-COVER (a strip, not medallions — ≥97% of head-line stations within
         0.075 m of a border vertex), V-ONCLOTH (every border vertex on the record's
         own cloth surface, [−0.02, +0.06] outboard of it), and V-COUNTER
         record-blind (no border vertex deeper than 0.75 m below the head, none
         below the band's mid-height — a valance nobody hung; the one arm that
         survives a dragged record). */
      if (H.gunDeck.maku) {
        const GDv = H.gunDeck;
        const HSv = SHIPS_HULL.hullSurface(H);
        const overV = GDv.over !== undefined ? GDv.over : H.beam * 0.045;
        const headYv = H.freeboard + GDv.height - H.beam * 0.016;
        const lipV = H.beam * 0.010, tuckV = 0.10, clearV = 0.15;
        const NV = 22, sxV = [], ryV = [], hwV = [];
        for (let i = 0; i <= NV; i++) {
          const u = GDv.from + (GDv.to - GDv.from) * i / NV;
          const pd = SHIPS_HULL.surfacePoint(H, HSv, u, 1.0);
          sxV.push(pd[0]); ryV.push(pd[1]); hwV.push(Math.abs(pd[2]) + overV);
        }
        const dirV = Math.sign(sxV[NV] - sxV[0]) || 1;
        const fInv = x => {           // invert the piecewise-linear station table
          if ((x - sxV[0]) * dirV <= 0) return 0;
          for (let i = 0; i < NV; i++)
            if ((x - sxV[i + 1]) * dirV <= 0)
              return (i + (x - sxV[i]) / (sxV[i + 1] - sxV[i])) / NV;
          return 1;
        };
        const lerpV = (arr, f) => { const t = Math.min(1, Math.max(0, f)) * NV;
          const i = Math.min(NV - 1, Math.floor(t)), w = t - i;
          return arr[i] + (arr[i + 1] - arr[i]) * w; };
        g.updateMatrixWorld(true);
        const VW = new THREE.Vector3();
        for (const sgn of [-1, 1]) {
          const vtx = [];             // border vertices this side, hull frame
          g.traverse(o => { const p = tagOf(o);
            if (!(o.isMesh && p && p.key === 'maku' && p.name !== 'Maku')) return;
            const pa = o.geometry.getAttribute('position');
            for (let k = 0; k < pa.count; k++) {
              VW.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld);
              if (VW.z * sgn > 0) vtx.push([VW.x, VW.y, VW.z]);
            } });
          if (!vtx.length) {
            say(v.id, 'maku band drawn without its valance',
                `no border geometry on the ${sgn > 0 ? 'starboard' : 'port'} side`);
            continue;
          }
          /* V-HEAD, judged amidships: the border's top edge is the hanging line */
          const xMidLo = lerpV(sxV, 1 / 3), xMidHi = lerpV(sxV, 2 / 3);
          const mid = vtx.filter(p => (p[0] - xMidLo) * dirV >= 0
                                   && (p[0] - xMidHi) * dirV <= 0);
          const topMid = mid.length ? Math.max(...mid.map(p => p[1])) : -1e9;
          if (Math.abs(topMid - headYv) > 0.06)
            say(v.id, 'maku valance hung off the head',
                `border top edge ${topMid.toFixed(2)} m amidships, `
                + `the hanging line at ${headYv.toFixed(2)}`);
          /* V-COVER: a strip, not medallions */
          const x0c = lerpV(sxV, 0) + dirV * 0.7, x1c = lerpV(sxV, 1) - dirV * 0.7;
          let cov = 0; const MC = 60;
          for (let m = 0; m < MC; m++) {
            const xs = x0c + (x1c - x0c) * (m + 0.5) / MC;
            if (vtx.some(p => Math.abs(p[0] - xs) <= 0.075)) cov++;
          }
          if (cov / MC < 0.97)
            say(v.id, 'maku border is medallions, not a strip',
                `${cov} of ${MC} head-line stations have border cloth within 0.075 m `
                + '— the scallops are cut from one strip and touch');
          /* V-ONCLOTH: every border vertex on the record's own cloth surface */
          let offC = 0, firstC = '';
          for (const p of vtx) {
            const f = fInv(p[0]);
            const depF = Math.max(0.05, headYv - (lerpV(ryV, f) + clearV));
            const s = Math.min(1, Math.max(0, (headYv - p[1]) / depF));
            const dev = Math.abs(p[2]) - (lerpV(hwV, f) - lipV - tuckV * s);
            if (dev < -0.02 || dev > 0.06) {
              offC++;
              if (!firstC) firstC = `first at x ${p[0].toFixed(1)}, y ${p[1].toFixed(2)}, `
                                  + `${dev.toFixed(3)} m off the cloth`;
            }
          }
          if (offC) say(v.id, 'maku border off its own cloth',
                        `${offC} of ${vtx.length} border vertices off the surface — ${firstC}`);
          /* V-COUNTER, record-blind: a valance nobody hung */
          const botV = Math.min(...vtx.map(p => p[1]));
          const hemMidV = lerpV(ryV, 0.5) + clearV;
          if (headYv - botV > 0.75)
            say(v.id, 'a scallop nobody hung',
                `border reaches ${(headYv - botV).toFixed(2)} m below the hanging line `
                + '— no plate reads a valance past 0.75 m');
          else if (botV < (headYv + hemMidV) / 2)
            say(v.id, 'a scallop nobody hung',
                `border bottom ${botV.toFixed(2)} m, below the band's own mid-height `
                + `${((headYv + hemMidV) / 2).toFixed(2)}`);
        }
      }
      if (H.tower) {
        const tw = part.tower;
        if (!tw) say(v.id, 'tower declared but not drawn', 'tower record with no geometry');
        else {
          if (Math.abs(tw.y[0] - planeY) > 0.6)
            say(v.id, tw.y[0] < planeY ? 'tower buried in the deck' : 'tower floats above the deck',
                `tower foot ${tw.y[0].toFixed(1)} m over water, fighting deck at ${planeY.toFixed(1)}`);
          if (tw.y[1] < planeY + (H.tower.h || 0))
            say(v.id, 'tower short of its record',
                `tower top ${tw.y[1].toFixed(1)} m, record claims ${(planeY + H.tower.h).toFixed(1)}+`);
        }
      }
      /* ── THE WALLED CABIN ANSWERS FROM EVERY BEARING, FROM ITS OWN SKIN (round 117).
         tower.walls declares the yakata the Busan scroll draws: a CLOSED plank house,
         not the open janggundae pavilion the class default draws. An open pavilion at
         the wall band is four posts and a rail — most bearings pass straight through —
         and a single missing wall panel hides from the one berth bearing a baseline
         shows. So: 72 bearings x 3 heights in the wall band, aimed at the tower's own
         centre, intersecting the TOWER part alone — and the first strike must land at
         the face the ray ENTERS, because a ray through a hole still hits the far wall
         from inside. That depth test is what the r91 ring could not do. */
      if (H.tower && H.tower.walls) {
        const tm = []; g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.key === 'tower') tm.push(o); });
        if (tm.length) {
          const tb = new THREE.Box3();
          for (const m of tm) tb.expandByObject(m);
          /* the entry datum is the WALL box, not the part box: the part box is inflated
             by the roof overhang in both axes, and at a diagonal bearing the run from
             that corner to the wall is longer than any honest margin — the first clean
             run convicted its own house by 1 cm exactly there. Wall-band meshes are the
             ones whose feet stand on the cabin sole. */
          const wb = new THREE.Box3(); let nw = 0;
          for (const m of tm) {
            const b = new THREE.Box3().setFromObject(m);
            if (b.min.y < tb.min.y + 0.3) { wb.union(b); nw++; }
          }
          const eb = nw ? wb : tb;
          const cx = (eb.min.x + eb.max.x) / 2, cz = (eb.min.z + eb.max.z) / 2;
          const rc = new THREE.Raycaster(); rc.far = 900;
          const entry = new THREE.Vector3();
          let open = 0, shot = 0, first = '';
          for (const f of [0.25, 0.5, 0.8]) {
            const y = tb.min.y + (H.tower.h || (tb.max.y - tb.min.y)) * f;
            for (let b = 0; b < 72; b++) {
              const th = b * Math.PI / 36;
              rc.set(new THREE.Vector3(cx + Math.cos(th) * 400, y, cz + Math.sin(th) * 400),
                     new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)));
              shot++;
              const hit = rc.intersectObjects(tm, true)[0];
              const ent = rc.ray.intersectBox(eb, entry);
              if (!hit || !ent || hit.point.distanceTo(ent) > 0.6) {
                open++;
                if (!first) first = `first at bearing ${Math.round(th * 180 / Math.PI)}°, ` +
                                    `y ${y.toFixed(1)} m`;
              }
            }
          }
          if (open) say(v.id, 'walled cabin open to a bearing',
                        `${open} of ${shot} rays into the wall band miss plank — ${first}`);
        }
      }
    } else if (H.tower)
      say(v.id, 'tower without a deck', 'tower record on a hull with no gunDeck to stand on');

    /* ── A RO SCULLS, A SWEEP PULLS (round 115). A hull whose record declares oarStyle
       'ro' rows the Japanese/Korean way: each blade trails AFT of its pin and stays IN
       the water — that is what sculling is. Round 90 drew the sekibune's forty ro as
       perpendicular western sweeps and recorded the simplification; this rule is that
       record cashed, and it guards the panokseon's ro too. The audit sees the BUILT rest
       pose (its own buildShip instances never animate), so the tolerances are the rest
       pose's own. */
    if (H.oarStyle === 'ro') {
      let nRo = 0, bad = 0, first = '', badF = 0, firstF = '';
      const tip = new THREE.Vector3(), pin = new THREE.Vector3(), cnr = new THREE.Vector3();
      g.updateMatrixWorld(true);
      g.traverse(o => {
        const d = o.userData && o.userData.oar;
        if (!d) return;
        nRo++;
        if (d.style !== 'ro') { bad++; if (!first) first = 'drawn as a sweep'; return; }
        tip.set(0, 0, d.outb).applyMatrix4(o.matrixWorld);
        o.getWorldPosition(pin);
        if (tip.x < pin.x + 0.3) {
          bad++; if (!first) first = `tip not abaft its pin (dx ${(tip.x - pin.x).toFixed(1)} m)`;
        } else if (tip.y > 0.15 || tip.y < -(H.draught + 0.6)) {
          bad++; if (!first) first = `tip at ${tip.y.toFixed(2)} m over water (draught ${H.draught})`;
        }
        /* ── AND THE BLADE IS ONE SCARFED TIMBER (round 144). A ro's blade widens
           CONTINUOUSLY from the loom scarf to the tip — a step is not a scarf, and
           the way a step gets drawn is a wider face plate OVERLAID on the limb.
           Conviction is by OVERLAP, in the group's own frame where +z is the blade
           run (so the rake cannot alias into the measure): exactly two timbers hang
           on the pin — blade and loom — no two of them may share more than 15% of
           the blade run, and the blade must REACH its own recorded tip. The r144
           pre-form convicts itself twice over: three meshes on the pin, the face
           plate sharing 0.45·outb of the run with the limb inside it. */
        const kids = [];
        o.traverse(m => { if (m.isMesh) kids.push(m); });
        const ext = kids.map(m => {
          m.updateMatrix();
          const gm = m.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
          const bb = gm.boundingBox; let z0 = Infinity, z1 = -Infinity;
          for (const cx of [bb.min.x, bb.max.x])
            for (const cy of [bb.min.y, bb.max.y])
              for (const cz of [bb.min.z, bb.max.z]) {
                cnr.set(cx, cy, cz).applyMatrix4(m.matrix);
                z0 = Math.min(z0, cnr.z); z1 = Math.max(z1, cnr.z);
              }
          return [z0, z1];
        });
        let ovl = 0;
        for (let a2 = 0; a2 < ext.length; a2++)
          for (let b2 = a2 + 1; b2 < ext.length; b2++)
            ovl = Math.max(ovl,
              Math.min(ext[a2][1], ext[b2][1]) - Math.max(ext[a2][0], ext[b2][0]));
        const reach = Math.max(...ext.map(e => e[1]));
        if (ovl > 0.15 * d.outb) {
          badF++; if (!firstF) firstF = `two timbers overlap ${ovl.toFixed(2)} m of a `
            + `${d.outb.toFixed(2)} m blade run`;
        } else if (kids.length !== 2) {
          badF++; if (!firstF) firstF = `${kids.length} meshes on one pin for a blade and a loom`;
        } else if (reach < 0.95 * d.outb) {
          badF++; if (!firstF) firstF = `blade reaches ${reach.toFixed(2)} m of its `
            + `${d.outb.toFixed(2)} m run`;
        }
      });
      if (!nRo) say(v.id, 'ro declared but no oars drawn', 'oarStyle ro with no oar groups');
      else if (bad) say(v.id, 'ro drawn as sweeps', `${bad} of ${nRo} oars fail the scull test — ${first}`);
      if (nRo && badF)
        say(v.id, 'the ro blade is a stepped overlay, not one scarfed timber',
            `${badF} of ${nRo} — ${firstF}`);
    }

    /* ── A BANK OF ROWERS FITS THE HULL THAT SEATS THEM (round 168) ─────────────────────
       The record must agree with itself before the drawing is judged: a bank's extent is
       (perBank − 1) · interscalmium, a REAL length, and it must fit inside nine tenths of
       the waterline it claims to sit on. A record dragged to more rowers than the hull
       has stations would seat men off both ends of the ship — the builder would draw it
       faithfully, so only the record's own arithmetic can convict it. All oared hulls,
       ro and sweep alike; the defaults mirror hull.js's own (Vitruvius 0.98, oarLen 4.2). */
    if (H.oarBanks) {
      const isc = H.interscalmium || 0.98;
      const banks = Array.isArray(H.oarsPerBank) ? H.oarsPerBank
                  : [H.oarsPerBank || 27];
      for (let b = 0; b < banks.length; b++) {
        const span = (banks[b] - 1) * isc;
        if (span > 0.9 * H.lwl)
          say(v.id, 'more rowers than the hull has stations',
              `bank ${b}: ${banks[b]} rowers at ${isc} m span ${span.toFixed(1)} m `
              + `on a ${H.lwl} m waterline`);
      }
    }

    /* ── A SWEEP STOPS AT ITS OWN RECORD, AND ITS BLADE IS A LOFT (round 168) ───────────
       The fleet probe ranked the oared fleet's 270 sweep blades the largest boxy class
       left after the containers: every blade a 12-triangle crate, and the crate overran
       the oar — centred at 0.90·outb with an 0.11·oarLen half-length, its corner stood
       at 1.049·outb, five per cent past the oar's own recorded length. Three arms, in
       the oar group's own frame (the ro rule's corner-transform, so the rest rake cannot
       alias into the measure), outb derived from the RECORD (0.74 · (oarLen or the
       builder's own 4.2 default), mirroring hull.js the way lowerOf mirrors the mast
       stack). REACH: the oar's drawn tip lands on [0.97, 1.01]·outb — the crate's 1.049
       convicts, and so does an oar cut short. FORM: the blade (the outboard mesh of the
       pin's two) must deepen from its neck and ease at its tip — widest section over
       1.15× the neck's and over 1.05× the tip's; a constant-section crate fails both.
       COUNTER: no blade deeper than 0.045·B — a blade nobody attested, the arm that
       watches the fix itself. */
    if (H.oarBanks && H.oarStyle !== 'ro') {
      const outbR = 0.74 * (H.oarLen || 4.2);
      let nSw = 0, badR = 0, firstR = '', badF2 = 0, firstF2 = '', badC = 0, firstC = '';
      const cnr = new THREE.Vector3();
      g.updateMatrixWorld(true);
      g.traverse(o => {
        const d = o.userData && o.userData.oar;
        if (!d || d.style === 'ro') return;
        nSw++;
        const kids = [];
        o.traverse(m => { if (m.isMesh) kids.push(m); });
        if (kids.length !== 2) {
          badF2++; if (!firstF2) firstF2 = `${kids.length} meshes on one thole for a loom and a blade`;
          return;
        }
        /* z-extents of each timber in the group's frame */
        const ext = kids.map(m => {
          m.updateMatrix();
          const gm = m.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
          const bb = gm.boundingBox; let z0 = Infinity, z1 = -Infinity;
          for (const cx of [bb.min.x, bb.max.x])
            for (const cy of [bb.min.y, bb.max.y])
              for (const cz of [bb.min.z, bb.max.z]) {
                cnr.set(cx, cy, cz).applyMatrix4(m.matrix);
                z0 = Math.min(z0, cnr.z); z1 = Math.max(z1, cnr.z);
              }
          return [z0, z1];
        });
        const reach = Math.max(ext[0][1], ext[1][1]);
        if (reach > 1.01 * outbR || reach < 0.97 * outbR) {
          badR++; if (!firstR) firstR = `tip at ${reach.toFixed(2)} m of a recorded `
            + `${outbR.toFixed(2)} m outboard run`;
        }
        /* the blade is the mesh that STARTS further outboard */
        const bi = ext[0][0] > ext[1][0] ? 0 : 1;
        const bm = kids[bi], bz0 = ext[bi][0], bz1 = ext[bi][1], run = bz1 - bz0;
        const pa = bm.geometry.attributes.position.array;
        const p3 = new THREE.Vector3();
        let neckLo = Infinity, neckHi = -Infinity, tipLo = Infinity, tipHi = -Infinity,
            allLo = Infinity, allHi = -Infinity;
        for (let i = 0; i < pa.length; i += 3) {
          p3.set(pa[i], pa[i + 1], pa[i + 2]).applyMatrix4(bm.matrix);
          allLo = Math.min(allLo, p3.y); allHi = Math.max(allHi, p3.y);
          if (p3.z < bz0 + 0.15 * run) { neckLo = Math.min(neckLo, p3.y);
                                         neckHi = Math.max(neckHi, p3.y); }
          if (p3.z > bz1 - 0.02 * run) { tipLo = Math.min(tipLo, p3.y);
                                         tipHi = Math.max(tipHi, p3.y); }
        }
        const neckD = (neckHi - neckLo) / 2, tipD = (tipHi - tipLo) / 2,
              maxD = (allHi - allLo) / 2;
        if (!(maxD > 1.15 * neckD && maxD > 1.05 * tipD)) {
          badF2++; if (!firstF2) firstF2 = `neck ${neckD.toFixed(3)}, widest `
            + `${maxD.toFixed(3)}, tip ${tipD.toFixed(3)} m half-depth — the same depth `
            + 'at the neck as at its widest is a crate, not a blade';
        }
        if (maxD > 0.045 * H.beam) {
          badC++; if (!firstC) firstC = `blade ${(2 * maxD).toFixed(2)} m deep on a `
            + `${H.beam} m beam — deeper than the class it replaced`;
        }
      });
      if (H.oarBanks && !nSw) say(v.id, 'oar banks declared but no sweeps drawn',
                                  'oarBanks with no oar groups');
      if (badR) say(v.id, 'an oar drawn past its own record',
                    `${badR} of ${nSw} sweeps — ${firstR}`);
      if (badF2) say(v.id, 'the sweep blade is a crate, not a loft',
                     `${badF2} of ${nSw} — ${firstF2}`);
      if (badC) say(v.id, 'a blade nobody attested',
                    `${badC} of ${nSw} — ${firstC}`);
    }

    /* ── A PADDLE FLOAT IS THE RECORDED BOARD (round 169) ───────────────────────────────
       The r168 sweep ranked great-eastern's 96 paddle meshes the largest boxy class after
       the containers, and the judgment came back from the record: a float IS a flat
       board — 'the propelling boards fixed on the radiating arms' (Young's Nautical
       Dictionary, 1863) — so the boxy FORM is attested and what convicts is ARITHMETIC.
       Lindsay's specification table (1876) gives each wheel 30 floats of 13 ft × 3 ft;
       the drawn wheel carried 24 floats of 7.6 × 2.0 m, every dimension roughly double
       its record, and the housing rode out to 45.2 m against 120 ft attested over the
       boxes. Four arms, all in the wheel group's own frame from geometry parameters and
       local positions — Box3.setFromObject inflates a spinning wheel's rim AABB by √2
       and convicted the rims falsely this same round. COUNT: floats drawn per wheel
       equal the record's. BOARD: each float within 15% of the recorded depth and length,
       its outer edge landing on [0.95, 1.01]·R. BREADTH: the face ornament lands on
       [0.93, 1.01] of the recorded half-breadth over the boxes. COUNTER, record-blind:
       no float deeper than 1.5 m or thicker than 0.30 m — a board nobody ever hung on a
       wheel, the arm that convicts a dragged record under a faithful builder. */
    if (H.paddleFloats) {
      const Rw = (H.paddleDia || 0) / 2;
      const fD = H.paddleFloatDeepM || 0, fL = H.paddleFloatLenM || 0;
      let wheels = 0, badN = 0, firstN = '', badB = 0, firstB = '',
          badC = 0, firstC = '';
      g.traverse(o => {
        if (!(o.userData && o.userData.wheel)) return;
        wheels++;
        let nF = 0;
        o.children.forEach(m => {
          if (!m.isMesh || m.name !== 'Float') return;
          nF++;
          const pp = m.geometry.parameters || {};
          const deep = pp.height || 0, len = pp.depth || 0, thick = pp.width || 0;
          const reach = Math.hypot(m.position.x, m.position.y) + deep / 2;
          const dimBad = (fD && Math.abs(deep - fD) > 0.15 * fD)
                      || (fL && Math.abs(len - fL) > 0.15 * fL);
          if (dimBad || reach > 1.01 * Rw || reach < 0.95 * Rw) {
            badB++; if (!firstB) firstB = `a ${len.toFixed(2)} × ${deep.toFixed(2)} m float `
              + `reaching ${reach.toFixed(2)} m against a recorded ${fL.toFixed(2)} × `
              + `${fD.toFixed(2)} m board on a ${Rw.toFixed(2)} m wheel`;
          }
          if (deep > 1.5 || thick > 0.30) {
            badC++; if (!firstC) firstC = `a float ${deep.toFixed(2)} m deep and `
              + `${thick.toFixed(2)} m thick`;
          }
        });
        if (nF !== H.paddleFloats) {
          badN++; if (!firstN) firstN =
            `${nF} floats drawn on a wheel recorded with ${H.paddleFloats}`;
        }
      });
      if (!wheels) say(v.id, 'paddle floats recorded but no wheel drawn',
                       'paddleFloats with no wheel group');
      if (badN) say(v.id, 'the wheel does not carry its recorded floats', firstN);
      if (badB) say(v.id, 'a float drawn past its own record', `${badB} — ${firstB}`);
      if (badC) say(v.id, 'a board nobody attested', `${badC} — ${firstC}`);
      if (H.paddleOverBoxesM && wheels) {
        /* the widest paddle-box structure, corner-transformed per mesh — exact for
           boxes, and the box group only ever turns a half-turn about Y */
        const obHalf = H.paddleOverBoxesM / 2;
        let zMax = 0;
        const cnr = new THREE.Vector3();
        g.updateMatrixWorld(true);
        g.traverse(o => {
          if (!o.isMesh) return;
          let part = null;
          for (let e = o; e; e = e.parent)
            if (e.userData && e.userData.part) { part = e.userData.part; break; }
          if (!part || part.key !== 'paddlebox') return;
          const gm = o.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
          const bb = gm.boundingBox;
          for (const cx of [bb.min.x, bb.max.x])
            for (const cy of [bb.min.y, bb.max.y])
              for (const cz of [bb.min.z, bb.max.z]) {
                cnr.set(cx, cy, cz).applyMatrix4(o.matrixWorld);
                zMax = Math.max(zMax, Math.abs(cnr.z));
              }
        });
        if (zMax > 1.01 * obHalf || zMax < 0.93 * obHalf)
          say(v.id, 'the housing does not stop at its recorded breadth',
              `widest box structure at ${(2 * zMax).toFixed(2)} m over a recorded `
              + `${H.paddleOverBoxesM} m over the boxes`);
      }
    }

    /* ── THE RECORD'S GUNS FIRE THE WAY THE RECORD SAYS (round 116). Round 88 recorded
       two gaps on the galleass: 'chasers aft' claimed by her own Guns row and never
       drawn, and the Lepanto conversions' ROUND bow fortress flattened to a galley
       arrumbada. Both are record fields now, so both get the r113 discipline — a field
       the builder silently ignores must convict. sternGuns: exactly that many chaser
       groups, each standing abaft 0.8·LWL and firing ASTERN (muzzle tip abaft its
       breech). bowFortress: fortress meshes must be DRAWN, and every bow piece fires
       forward-OUT through the curve (tip forward of its breech and no closer to the
       centreline), which is what a radial battery is. */
    if (H.sternGuns) {
      let nCh = 0, bad = 0, first = '';
      const tip = new THREE.Vector3(), pin = new THREE.Vector3();
      g.updateMatrixWorld(true);
      g.traverse(o => {
        const d = o.userData && o.userData.gun;
        if (!d || d.style !== 'chaser') return;
        nCh++;
        tip.set(d.tip[0], d.tip[1], d.tip[2]).applyMatrix4(o.matrixWorld);
        o.getWorldPosition(pin);
        if (pin.x < (0.80 - 0.5) * H.lwl) {
          bad++; if (!first) first = `chaser amidships (x ${pin.x.toFixed(1)} m)`;
        } else if (tip.x < pin.x + 0.5) {
          bad++; if (!first) first = `chaser fires forward (dx ${(tip.x - pin.x).toFixed(1)} m)`;
        }
      });
      if (nCh !== H.sternGuns)
        say(v.id, 'stern chasers off the record', `record says ${H.sternGuns}, drawn ${nCh}`);
      else if (bad) say(v.id, 'chasers mis-laid', `${bad} of ${nCh} — ${first}`);
    }
    if (H.bowFortress) {
      let fortDrawn = false, nBow = 0, bad = 0, first = '';
      const tip = new THREE.Vector3(), pin = new THREE.Vector3();
      g.updateMatrixWorld(true);
      g.traverse(o => {
        const p = tagOf(o);
        if (o.isMesh && p && p.key === 'fortress') fortDrawn = true;
        const d = o.userData && o.userData.gun;
        if (!d || d.style !== 'fortress') return;
        nBow++;
        tip.set(d.tip[0], d.tip[1], d.tip[2]).applyMatrix4(o.matrixWorld);
        o.getWorldPosition(pin);
        if (tip.x > pin.x - 0.3) {
          bad++; if (!first) first = `bow piece not firing ahead (dx ${(tip.x - pin.x).toFixed(1)} m)`;
        } else if (Math.abs(tip.z) < Math.abs(pin.z) - 0.15) {
          bad++; if (!first) first = 'bow piece crossing inboard of its breech';
        }
      });
      if (!fortDrawn)
        say(v.id, 'bow fortress declared but not drawn', 'bowFortress with no fortress meshes');
      else if (H.bowGuns && nBow !== H.bowGuns)
        say(v.id, 'bow battery off the record', `record says ${H.bowGuns}, drawn on the fortress ${nBow}`);
      else if (bad) say(v.id, 'bow battery mis-laid', `${bad} of ${nBow} — ${first}`);
    }

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
        const roofY = H.houseTopM !== undefined ? H.houseTopM
                    : H.freeboard + (H.decks || 0) * dh2;
        /* ── THE FLOOR IS THE LOWEST DECLARED FOOTING (round 77). A dome's onTier and
           the fairing's fairFootTier land on that tier's roof — freeboard + (tier+1)·deck
           — a full module below the house top the rest of the cluster stands on. Azzam's
           aft domes and fairing foot the tier-3 terrace at 19.4 m; against a 22 m house
           top alone that healthy geometry would read as 'reaches into the house'.
           ⚠ AND THE AUDIT STACKS THE SAME FLOORS THE MODEL DOES (round 97): where the
           record carries measured tierFloorsM/houseTopM the uniform deckM stack is
           exactly the mis-derivation the record exists to correct, and deriving the
           footing from it re-fires rule 8 — the audit disagreeing because the audit is
           still running the old arithmetic. */
        const tierRoofY = ti => (H.tierFloorsM && H.tierFloorsM[ti] !== undefined)
          ? H.tierFloorsM[ti]
          : (ti + 1 >= (H.decks || 0) && H.houseTopM !== undefined) ? H.houseTopM
          : H.freeboard + (ti + 1) * dh2;
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

    /* ── A DECLARED DAVIT BOAT HANGS OUTBOARD OF THE SHELL, ONE PER SIDE, CLEAR OF THE
       SEA (round 105). davitBoats is the record saying the sea boats hang in davits at
       the quarters — Endurance's pair, in every Hurley plate. The r58 stern taught that
       drawn-but-buried is invisible from every bearing, and the generic
       declared-but-not-drawn rule cannot see this class because the skid boat already
       populates part.boat. So ask the MESHES: each entry must hang one 'Quarter boat'
       per side; each drawn boat's inboard edge must stand outboard of the shell's own
       half-breadth at its station (surfacePoint, the geometry's source), and its keel
       must stand above the load waterline. */
    if (H.davitBoats && H.davitBoats.length) {
      const qb = [];
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.name === 'Quarter boat')
        qb.push(new THREE.Box3().setFromObject(o)); });
      if (qb.length !== H.davitBoats.length * 2)
        say(v.id, 'davit boat declared but not drawn',
            `${H.davitBoats.length * 2} quarter boats declared, ${qb.length} drawn`);
      const HSq = SHIPS_HULL.hullSurface(H);
      for (const b of qb) {
        const u = Math.max(0.001, Math.min(0.999, 0.5 + ((b.min.x + b.max.x) / 2) / H.lwl));
        const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSq, u, 1)[2]);
        const zin = Math.min(Math.abs(b.min.z), Math.abs(b.max.z));
        if (Math.sign(b.min.z) !== Math.sign(b.max.z) || zin < half - 0.15)
          say(v.id, 'davit boat buried in the shell',
              `inboard edge ${zin.toFixed(2)} m off centre, hull side there ${half.toFixed(2)} m`);
        if (b.min.y < 0.5)
          say(v.id, 'davit boat in the water',
              `keel at ${b.min.y.toFixed(2)} m over the load waterline`);
      }
    }

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
        /* the lean the loft actually owes: since round 129 hull.js clamps both rakes by
           one scale so the drawn length cannot outrun the record's loa. The rule asks
           for the CLAMPED lean — asking for the raw product would convict the clamp. */
        const rakeAllow = ((H.stemRake || 0) + (H.sternRake || 0)) * H.loa;
        const rakeScale = rakeAllow > 0
          ? Math.min(1, Math.max(0, H.loa - H.lwl) / rakeAllow) : 1;
        for (const [name, want, got] of [
            ['stem', H.stemRake * rakeScale * H.loa, foreWL - foreDk],
            ['sternpost', H.sternRake * rakeScale * H.loa, aftDk - aftWL]]) {
          if (want > 1.5 && Math.abs(got - want) > Math.max(1.2, want * 0.4))
            say(v.id, 'a recorded rake drawn vertical',
                `${name}: record asks a ${want.toFixed(1)} m lean, drawn ${got.toFixed(1)} m`);
        }
        /* ── THE DRAWN LENGTH MAY NOT OUTRUN THE RECORD (round 129). The clamp above is
           code, and code regresses silently; this arm measures the planking's own x-span
           against the card's LENGTH OVERALL, which is the fact a visitor reads beside
           the drawn hull. One-sided on purpose: four hulls draw SHORTER than their loa
           (wyoming −18.8 m) and what their loa rows actually measure — sparred length?
           between perpendiculars? — is a research question, not a conviction. */
        let px0 = 1e9, px1 = -1e9;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i);
          if (x < px0) px0 = x; if (x > px1) px1 = x;
        }
        const drawnL = px1 - px0;
        if (drawnL > H.loa + Math.max(0.25, H.loa * 0.002))
          say(v.id, 'drawn length beyond record loa',
              `planking spans ${drawnL.toFixed(2)} m against loa ${H.loa} m`);
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

    /* ── THE RAIL SITS ON THE DECK EDGE, ASKED OF THE SURFACE (round 100) ───────────────
       The rail loft computed its half-breadth as halfB·wl·(1−tumble) — a stale parallel
       copy of surfacePoint that predates the counter flare, the bow flare, the rounded
       stern and the stem rabbet. Measured before the fix: 20 of 33 hulls carried the rail
       more than half a metre inboard of the true edge somewhere (carrier −4.9 m at the
       counter), and Queen Mary 2's rail hung 4.1 m OUTBOARD of her rounded stern, in open
       air. Same class the deck builder's own comment names; the deck and the waterway ask
       surfacePoint, so anything capping their edge must land where they end. The rule
       walks every drawn rail station: recover its u by nearest-x against the true edge,
       and its outer face must sit at trueHalf + 0.3·r within tolerance, both directions. */
    {
      const HSr = SHIPS_HULL.hullSurface(H);
      const spr = u => SHIPS_HULL.surfacePoint(H, HSr, u, 1);
      const NSr = 2000, rxs = [], rus = [];
      for (let i = 0; i <= NSr; i++) { const u = i / NSr; rus.push(u); rxs.push(spr(u)[0]); }
      const uOfX = x => { let bi = 0, bd = Infinity;
        for (let i = 0; i <= NSr; i++) { const d = Math.abs(rxs[i] - x); if (d < bd) { bd = d; bi = i; } }
        return rus[bi]; };
      const rr = H.capM ? H.capM / 1.6 : H.beam * 0.016;
      const tol = Math.max(0.25, rr * 1.2);
      let off = 0, worst = 0, wu = null, walked = 0;
      g.traverse(o => { const p = tagOf(o);
        if (!o.isMesh || !p || p.key !== 'rail') return;
        const pos = o.geometry.attributes.position;
        for (let k = 0; k + 3 < pos.count; k += 4) {
          let maxZ = 0;
          for (let j = 0; j < 4; j++) maxZ = Math.max(maxZ, Math.abs(pos.getZ(k + j)));
          const u = uOfX(pos.getX(k));
          const err = maxZ - (Math.abs(spr(u)[2]) + rr * 0.3);
          walked++;
          if (Math.abs(err) > tol) { off++;
            if (Math.abs(err) > Math.abs(worst)) { worst = err; wu = u; } }
        }
      });
      if (off) say(v.id, 'rail off its deck edge',
                   `${off} of ${walked} rail stations off the surface edge, worst ` +
                   `${worst.toFixed(2)} m (${worst < 0 ? 'inboard' : 'outboard'}) at u ${wu}`);
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
                          hs.push({ grp: o, box: new THREE.Box3().setFromObject(o) }); });
      if (hs.length !== H.deckHatches.length)
        say(v.id, 'stowage hatches miscounted',
            `${H.deckHatches.length} in the record, ${hs.length} drawn`);
      for (const { box: hb } of hs) {
        const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hb.min.x + hb.max.x) / 2) / H.lwl));
        const zc = (hb.min.z + hb.max.z) / 2;
        const bB = Math.abs(SHIPS_HULL.surfacePoint(H, HSh, uu, 1.0)[2]);
        const camber = Math.cos((zc / bB) * Math.PI / 2) * bB * 0.035;
        const d = hb.min.y - (HSh.sheer(uu) + camber);
        if (d < -0.6 || d > 0.6)
          say(v.id, 'hatch off the deck',
              `coaming bottom ${d.toFixed(2)} m from the cambered deck at its station`);
      }
      /* ⚠ A STOWAGE HATCH IS A COVER DROPPED INTO A COAMING (round 147). The part's own
         card says these hatches are FLUSH; the convicted form was a lid box stacked ON a
         coaming box with two seam strips proud of the lid — the cover stood 0.16 m above
         its own rim and the seam strips 0.21. Rays straight down the cover's centreline
         (and down the old strips' own stations) must stop BELOW a ray down the coaming's
         rim line: a cover sits IN a coaming, not on it. */
      for (const hc of H.deckHatches) {
        const rx = (hc.at - 0.5) * H.lwl;
        const rz = (hc.z || 0) * Math.abs(SHIPS_HULL.surfacePoint(H, HSh, hc.at, 1.0)[2]);
        let best = null, bd = Infinity;
        for (const h of hs) {
          const c = h.box.getCenter(new THREE.Vector3());
          const d2 = (c.x - rx) ** 2 + (c.z - rz) ** 2;
          if (d2 < bd) { bd = d2; best = h; }
        }
        if (!best) continue;
        const rc = new THREE.Raycaster(); rc.far = 60;
        const down = new THREE.Vector3(0, -1, 0);
        const top = best.box.max.y + 5;
        const hitY = (dx, dz) => {
          rc.set(new THREE.Vector3(rx + dx, top, rz + dz), down);
          const h2 = rc.intersectObject(best.grp, true);
          return h2.length ? h2[0].point.y : -Infinity;
        };
        const hC = Math.max(hitY(0, 0), hitY(-hc.lenM * 0.16, 0), hitY(hc.lenM * 0.16, 0));
        const hR = Math.max(hitY(0, hc.widM / 2 - 0.07), hitY(0, -(hc.widM / 2 - 0.07)));
        if (hR === -Infinity)
          say(v.id, 'hatch has no coaming', 'no surface under the rim line');
        else if (hC >= hR - 0.02)
          say(v.id, 'hatch cover stands proud of its own coaming',
              `cover line ${hC.toFixed(2)} m, rim line ${hR.toFixed(2)} m — ` +
              'a lid stacked on a box, not a cover dropped into a ring');
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

    /* ── THE LIGHTS ARE A PIERCED SASH, GLASS BEHIND ITS BARS (round 171). The r168
       sweep flagged the 57 twelve-triangle sternlight boxes; the plate overruled the
       drawing, not the form — a sash light IS flat glazing in a flat frame, but
       SLR0338 (the RMG contemporary Bellona model, the 74's own sub-type) resolves
       every light in both tiers as a 3×3 grid of panes recessed BEHIND the bars,
       glazing filling 74–80% of the tier pilaster to pilaster — and the drawn light
       was one uncastable 0.9 m sheet with a single stick, the glass slab and the bar
       each floating PROUD of the slab meant to hold them, 36% of the tier blank
       wall. Every read here is geometry parameters and sibling-local positions in
       the stern group's own frame — no Box3, the r169 lesson. Arms: V-PIERCED (a
       glazed tier has real apertures — an extruded sash whose shape carries holes; a
       tier of solid slabs convicts), V-GRID (record arm — apertures = N·cols·rows of
       the record's own sternLightPanes for an integer 3–7 lights), V-BEHIND (the
       glass sheet's outer face at least 5 mm INBOARD of the sash's outer face — a
       rebate, not an appliqué; the pre-r171 stack fails it by 0.001·B), V-COUNTER
       record-blind (no aperture over 0.45 m either way — a pane nobody could cast;
       the one arm that survives a dragged record). */
    if (H.sternLights) {
      const sl = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'sternlight') sl.push(o); });
      const sashes = sl.filter(o => o.geometry && o.geometry.type === 'ExtrudeGeometry');
      const sheets = sl.filter(o => o.geometry && o.geometry.type === 'BoxGeometry'
        && o.material && o.material.metalness >= 0.3);
      if (sashes.length < H.sternLights)
        say(v.id, 'a glazed tier with no aperture',
            `${H.sternLights} tier(s) declared, ${sashes.length} pierced sash frame(s) `
            + 'drawn — a light laid ON a solid wall is a slab, not a window');
      const gridRec = H.sternLightPanes || [3, 3];
      const perLight = gridRec[0] * gridRec[1];
      for (const fr of sashes) {
        const shp = fr.geometry.parameters.shapes;
        const holes = (shp && shp.holes) || [];
        if (!holes.length) {
          say(v.id, 'a glazed tier with no aperture',
              'sash frame extruded without a single hole');
          continue;
        }
        const nL = holes.length / perLight;
        if (holes.length % perLight !== 0 || nL < 3 || nL > 7)
          say(v.id, "stern lights off the record's grid",
              `${holes.length} apertures cannot be an integer 3–7 lights of `
              + `${gridRec[0]}×${gridRec[1]} panes`);
        let big = 0, dims = '';
        for (const hp of holes) {
          let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
          for (const q of hp.getPoints(1)) {
            a0 = Math.min(a0, q.x); a1 = Math.max(a1, q.x);
            b0 = Math.min(b0, q.y); b1 = Math.max(b1, q.y);
          }
          if (a1 - a0 > 0.45 || b1 - b0 > 0.45) {
            big++;
            if (!dims) dims = `${(a1 - a0).toFixed(2)} × ${(b1 - b0).toFixed(2)} m`;
          }
        }
        if (big)
          say(v.id, 'a pane nobody could cast',
              `${big} aperture(s) over 0.45 m — the first ${dims}`);
      }
      if (sashes.length && sheets.length) {
        /* the sash extrudes up its local z, turned aft by the builder, so its outer
           face is position.x + depth; the sheet is an axis-aligned box, outer face
           position.x + width/2. Both are children of the same stern group. */
        const sashOut = Math.min(...sashes.map(o =>
          o.position.x + (o.geometry.parameters.options.depth || 0)));
        const glassOut = Math.max(...sheets.map(o =>
          o.position.x + o.geometry.parameters.width / 2));
        if (glassOut > sashOut - 0.005)
          say(v.id, 'glazing proud of its own sash',
              `glass face at x ${glassOut.toFixed(3)}, sash face at `
              + `${sashOut.toFixed(3)} — panes sit in a rebate behind their bars`);
      } else if (sashes.length && !sheets.length)
        say(v.id, 'a sash with no glass behind it', 'no glazing sheet in any tier');
    }

    /* ── THE CAPSTAN IS THE RECORD'S MACHINE, SIZED TO THE MEN WHO HEAVE IT (round 172).
       Until r172 `timberShip && laidDeck` drew a Georgian bar capstan on 19 hulls — a
       trireme and a Song junk among them — with parallel-box whelps floating clear of
       deck and drumhead both, no pawls, and the bar plane at 0.132·B: 1.93 m over the
       74's deck, 2.02 m over Wyoming's, 0.69 m over the galley's. Falconer 1769
       (CAPSTERN, and pl. II fig 11 measured by row): whelps reach drumhead-to-deck
       like buttresses enlarging the sweep; two iron pawls stand on deck in the whelp
       intervals; men heave with their breasts against the bars. Parts are identified
       STRUCTURALLY (a disc cylinder is the head, tall vertical timbers are whelps,
       small horizontal boxes at deck are pawls) so a builder that never heard of the
       naming still gets read; every number is geometry vertices and sibling-local
       positions in the capstan group's own frame — no Box3, the r169 lesson. Arms:
       V-WARRANT (capstan drawn, record silent — the drawing convicts, not the record),
       V-COUNT (record arm — whelp and bar counts are the record's), V-REACH (whelps
       touch deck and drumhead underside within 0.02·dia), V-FLARE (base sweep ≥ 1.08×
       neck sweep; fig 11 measures 1.15–1.22), V-PAWL (two on deck), V-STATURE
       (record-blind counter — no drumhead over 1.8 m, and height ≥ 0.55× drumhead dia:
       the arm that survives a dragged drumDiaM). */
    {
      const capm = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'capstan') capm.push(o); });
      if (capm.length && !H.capstan)
        say(v.id, 'a machine the record does not carry',
            `${capm.length} capstan meshes drawn with no capstan field — this hull's `
            + 'tradition attests other gear, and silence draws nothing');
      if (H.capstan && !capm.length)
        say(v.id, 'declared but not drawn', 'capstan');
      if (H.capstan && capm.length) {
        const vrange = o => {          // vertex extents in the mesh's own frame
          const a = o.geometry.attributes.position;
          let y0 = 1e9, y1 = -1e9;
          for (let i = 0; i < a.count; i++) {
            const yy = a.getY(i); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
          }
          return [y0, y1];
        };
        const radAt = (o, yq, tol) => { // outer radial extent near height yq
          const a = o.geometry.attributes.position;
          const off = Math.hypot(o.position.x, o.position.z);
          let r = 0;
          for (let i = 0; i < a.count; i++)
            if (Math.abs(a.getY(i) - yq) < tol)
              r = Math.max(r, Math.hypot(a.getX(i), a.getZ(i)));
          return off + r;
        };
        let head = null, headDia = 0;
        for (const o of capm) {
          if (o.geometry.type !== 'CylinderGeometry') continue;
          const p = o.geometry.parameters;
          const dia = 2 * Math.max(p.radiusTop, p.radiusBottom);
          if (p.height < dia / 2 && dia > headDia &&
              Math.abs(o.rotation.z) < 0.1) { head = o; headDia = dia; }
        }
        if (!head) say(v.id, 'a capstan with no drumhead', 'no disc atop the barrel');
        else {
          const headT = head.geometry.parameters.height;
          const headUnder = head.position.y - headT / 2;
          const headTop = head.position.y + headT / 2;
          let deckRef = 1e9;
          for (const o of capm) {
            if (Math.abs(o.rotation.z) > 0.1) continue;    // bars lie on their sides
            deckRef = Math.min(deckRef, o.position.y + vrange(o)[0]);
          }
          const whelps = [], pawls = [];
          let bars = 0;
          for (const o of capm) {
            if (o === head) continue;
            if (Math.abs(o.rotation.z) > 0.1) { bars++; continue; }
            const [y0, y1] = vrange(o);
            if (o.geometry.type === 'BoxGeometry' &&
                o.geometry.parameters.height <= 0.1 * headDia &&
                o.position.y + y0 < deckRef + 0.1 * headDia) { pawls.push(o); continue; }
            if ((o.geometry.type === 'BoxGeometry' ||
                 o.geometry.type === 'ExtrudeGeometry') &&
                (y1 - y0) >= 0.25 * headDia) whelps.push(o);
          }
          if (H.capstan.whelps && whelps.length !== H.capstan.whelps)
            say(v.id, "the capstan off the record's count",
                `${whelps.length} whelps drawn, record says ${H.capstan.whelps}`);
          if (H.capstan.bars && bars !== H.capstan.bars)
            say(v.id, "the capstan off the record's count",
                `${bars} bars shipped, record says ${H.capstan.bars}`);
          if (whelps.length) {
            const tol = 0.05 * headDia;
            let baseGap = 1e9, headGap = 1e9, flare = 0;
            for (const o of whelps) {
              const [y0, y1] = vrange(o);
              baseGap = Math.min(baseGap, (o.position.y + y0) - deckRef);
              headGap = Math.min(headGap, headUnder - (o.position.y + y1));
              const rT = radAt(o, y1, tol), rB = radAt(o, y0, tol);
              if (rT > 0) flare = Math.max(flare, rB / rT);
            }
            if (baseGap > 0.02 * headDia || headGap > 0.02 * headDia)
              say(v.id, 'whelps that touch neither deck nor drumhead',
                  `gap to deck ${baseGap.toFixed(3)} m, to drumhead `
                  + `${headGap.toFixed(3)} m — Falconer: drum-head to the deck, both`);
            if (flare < 1.08)
              say(v.id, 'whelps with no sweep to enlarge',
                  `base/neck ${flare.toFixed(2)} — buttresses flare; fig 11 reads `
                  + '1.15–1.22');
          }
          if (pawls.length < 2)
            say(v.id, 'a capstan that would recoil through its crew',
                `${pawls.length} pawl(s) on deck — Falconer bolts two`);
          const Habove = headTop - deckRef;
          if (headDia > 1.8 || Habove / headDia < 0.55)
            say(v.id, 'a capstan nobody built',
                `drumhead ${headDia.toFixed(2)} m dia, ${Habove.toFixed(2)} m tall — `
                + 'over 1.8 m or squatter than 0.55 of its own drum');
        }
      }
    }

    /* ── THE WINDLASS IS THE RECORD'S MACHINE, LYING WHERE MEN CAN LEVER IT (round 173).
       The Bremen cog's wreck-attested gear: a heavy windlass athwartships at the
       aftcastle (Ellmers — the tillerman stood BEHIND it), barrel 4.5 × 0.60 m (the Kiel
       replica's build record to the DSM plans, Baykowski 1991). Falconer's WINDLASS is
       the class mechanism: a timber "supported at the two ends by two frames of wood",
       handspikes thrust into holes bored through the body, lower part about a foot over
       the deck. Parts identified STRUCTURALLY from LOCAL VERTEX EXTENTS — the barrel is
       the longest round timber, ≥ 2.5× its own cross dimension — not from geometry
       class or .parameters: the first draft keyed on CylinderGeometry and the faithful
       builder's own toNonIndexed() barrel (flat-shaded eight-square) vanished from the
       candidate set, so the rule convicted a handspike as an undersized barrel. Read
       the vertices and a builder using raw buffers is still read. Sibling-local
       positions, no Box3 (the r169 lesson). Arms: V-WARRANT (drawn,
       record silent), V-AXIS (horizontal and athwartships — a vertical barrel is a
       capstan wearing the wrong name), V-SPAN (record length, AND inside the planking
       at its own station), V-DIA (record diameter), V-STANDARD (both ends carried),
       V-BREAST (record-blind: axis 0.45–0.90 m over the deck the standards stand on —
       the handspike is levered by a standing man, and no dragged record may move the
       work out of his reach). */
    {
      const wm = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'windlass') wm.push(o); });
      if (wm.length && !H.windlass)
        say(v.id, 'a machine the record does not carry',
            `${wm.length} windlass meshes drawn with no windlass field — this hull's `
            + 'record is silent, and silence draws nothing');
      if (H.windlass && !wm.length)
        say(v.id, 'declared but not drawn', 'windlass');
      if (H.windlass && wm.length) {
        const R = H.windlass;
        const ext = o => {              // local AABB of the mesh's own vertices
          const a = o.geometry.attributes.position;
          const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
          for (let i = 0; i < a.count; i++) {
            const p = [a.getX(i), a.getY(i), a.getZ(i)];
            for (let k = 0; k < 3; k++) {
              lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]);
            }
          }
          return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
        };
        let bar = null, barLen = 0, barDia = 0, barK = 1;
        for (const o of wm) {
          if (o.geometry.type === 'BoxGeometry') continue;   // standards are boxes
          const e = ext(o);
          const k = e[0] > e[1] ? (e[0] > e[2] ? 0 : 2) : (e[1] > e[2] ? 1 : 2);
          const dia = (e[(k + 1) % 3] + e[(k + 2) % 3]) / 2;
          if (e[k] >= 2.5 * dia && e[k] > barLen) {
            bar = o; barLen = e[k]; barDia = dia; barK = k;
          }
        }
        if (!bar)
          say(v.id, 'a windlass with no barrel',
              'no round timber at least 2.5× its own cross dimension in the group');
        else {
          const ax = new THREE.Vector3(barK === 0 ? 1 : 0, barK === 1 ? 1 : 0,
                                       barK === 2 ? 1 : 0).applyEuler(bar.rotation);
          if (Math.abs(ax.y) >= 0.1 || Math.abs(ax.z) <= 0.95)
            say(v.id, 'a windlass stood on end',
                `barrel axis (${ax.x.toFixed(2)}, ${ax.y.toFixed(2)}, `
                + `${ax.z.toFixed(2)}) — the machine lies athwartships or it is `
                + 'a capstan wearing the wrong name');
          if (R.barrelLenM && Math.abs(barLen - R.barrelLenM) > 0.12 * R.barrelLenM)
            say(v.id, "the windlass off the record's length",
                `barrel ${barLen.toFixed(2)} m, record says ${R.barrelLenM}`);
          if (R.barrelDiaM && Math.abs(barDia - R.barrelDiaM) > 0.15 * R.barrelDiaM)
            say(v.id, "the windlass off the record's diameter",
                `barrel ${barDia.toFixed(2)} m, record says ${R.barrelDiaM}`);
          /* the barrel must fit inside the planking at its own station — asked of the
             shell itself, in hull frame: the windlass group is a direct child of the
             ship group, so its x IS the station */
          let wgrp = bar; while (wgrp.parent && wgrp.parent !== g) wgrp = wgrp.parent;
          const stationX = wgrp.position.x;
          let plank = null;
          g.traverse(o => { const p = tagOf(o);
            if (!plank && o.isMesh && p && p.key === 'planking') plank = o; });
          if (plank) {
            const a = plank.geometry.attributes.position;
            let zmax = 0;
            for (let i = 0; i < a.count; i++)
              if (Math.abs(a.getX(i) - stationX) < 0.6)
                zmax = Math.max(zmax, Math.abs(a.getZ(i)));
            if (zmax > 0 && barLen / 2 > 0.95 * zmax)
              say(v.id, 'a windlass through the planking',
                  `barrel ${barLen.toFixed(2)} m across a deck `
                  + `${(2 * zmax).toFixed(2)} m wide at its station`);
          }
          const stands = wm.filter(o => o.geometry.type === 'BoxGeometry' &&
            o.geometry.parameters.height > o.geometry.parameters.width);
          for (const sg of [1, -1]) {
            const zEnd = bar.position.z + sg * barLen / 2;
            if (!stands.some(s => Math.abs(s.position.z - zEnd) < 0.35))
              say(v.id, 'a windlass end carried by nothing',
                  `barrel end at z ${zEnd.toFixed(2)} with no standard within 0.35 m — `
                  + 'Falconer supports it at the two ends by two frames of wood');
          }
          if (stands.length) {
            let deckRef = 1e9;
            for (const s of stands)
              deckRef = Math.min(deckRef,
                                 s.position.y - s.geometry.parameters.height / 2);
            const over = bar.position.y - deckRef;
            /* record-blind, all three: the axis where a standing man levers, a barrel
               a man can bore a handspike hole through, and room for the cable to pass
               beneath. The builder's own clamp caps the axis at 0.90, so a dragged
               diameter shows up in the barrel itself and in the vanished clearance —
               the arms that survive a lying record. */
            if (!(over >= 0.45 && over <= 0.90))
              say(v.id, 'a windlass nobody could heave',
                  `axis ${over.toFixed(2)} m over the deck — the handspike is levered `
                  + 'by a standing man');
            if (barDia > 0.9)
              say(v.id, 'a windlass nobody bored',
                  `barrel ${barDia.toFixed(2)} m thick — no handspike reaches through it`);
            if (over - barDia / 2 < 0.12)
              say(v.id, 'a windlass the cable cannot pass under',
                  `${(over - barDia / 2).toFixed(2)} m under the barrel`);
          }
          /* V-THROUGH (r175): the Korean horong's record says its bars pass THROUGH
             the drum — so every long thin round timber in the group must straddle the
             axis: centre within 0.25 m of the barrel's axis in the plane the bars
             swing in. A single-ended Falconer spike rides its centre 0.63 m out along
             its own shaft and convicts. Bars found by the same local-vertex-extent
             read as the barrel (length >= 1.2 m keeps the 0.32 m journals out; cross
             <= 0.15 m keeps the barrel out). */
          if (R.throughBars) {
            for (const o of wm) {
              if (o === bar || o.geometry.type === 'BoxGeometry') continue;
              const e = ext(o);
              const k2 = e[0] > e[1] ? (e[0] > e[2] ? 0 : 2)
                                     : (e[1] > e[2] ? 1 : 2);
              const d2 = (e[(k2 + 1) % 3] + e[(k2 + 2) % 3]) / 2;
              if (e[k2] < 1.2 || d2 > 0.15 || e[k2] < 2.5 * d2) continue;
              const off = Math.hypot(o.position.x - bar.position.x,
                                     o.position.y - bar.position.y);
              if (off > 0.25)
                say(v.id, 'a bar the record says passes through the drum',
                    `bar centre ${off.toFixed(2)} m off the axis — the horong's bars `
                    + 'pass clean through, a man at each of the four ends');
            }
          }
        }
      }
    }

    /* ── THE GRAPNEL IS THE RECORD'S ANCHOR, RESTING ON THE DECK (round 182).
       The Belitung wreck's own composite grapnel — the fleet's one ground tackle lifted
       from its own ship's wreck (Flecker 2001; Flecker in Krahl et al. 2010, figs.
       84–85). V-WARRANT both ways: meshes with no grapnel record convict (silence draws
       nothing — the r172 lesson generalised), a record with no meshes convicts.
       V-ARMS: the record's anchor carries four arms crossing at two levels, so four
       swollen tips must be drawn — tips found STRUCTURALLY as the group's spheres, not
       by name. V-SPAN: opposite tips of a pair sit one span apart in ANY stow attitude,
       so the greatest pairwise tip distance reads the record's tip-to-tip span — a box
       read cannot, because the stowed anchor lies spun 45° with two arms up.
       V-REST: a dumped anchor neither floats nor stabs through the planking — the
       group's lowest drawn point sits on the deck at its own station, asked of the
       surface itself. */
    {
      const gm = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'grapnel') gm.push(o); });
      if (gm.length && !H.grapnel)
        say(v.id, 'an anchor the record does not carry',
            `${gm.length} grapnel meshes drawn with no grapnel field — this hull's `
            + 'record is silent, and silence draws nothing');
      if (H.grapnel && !gm.length)
        say(v.id, 'declared but not drawn', 'grapnel');
      if (H.grapnel && gm.length) {
        const R = H.grapnel;
        const tips = gm.filter(o => o.geometry.type === 'SphereGeometry');
        if (tips.length !== 4)
          say(v.id, 'a grapnel without its four arms',
              `${tips.length} arm tips drawn — the record's anchor crosses two pairs`);
        if (R.spanM && tips.length >= 2) {
          const cs = tips.map(o => o.getWorldPosition(new THREE.Vector3()));
          let span = 0;
          for (let i = 0; i < cs.length; i++)
            for (let j = i + 1; j < cs.length; j++)
              span = Math.max(span, cs[i].distanceTo(cs[j]));
          if (Math.abs(span - R.spanM) > 0.10 * R.spanM)
            say(v.id, "the grapnel off the record's span",
                `arms ${span.toFixed(2)} m tip to tip, record says ${R.spanM}`);
        }
        const bb = new THREE.Box3();
        for (const o of gm) bb.union(new THREE.Box3().setFromObject(o));
        const HSg = SHIPS_HULL.hullSurface(H);
        const ug = Math.max(0, Math.min(1,
          ((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
        const deckY = HSg.sheer(ug);
        if (bb.min.y > deckY + 0.25)
          say(v.id, 'an anchor floating over its own deck',
              `lowest point ${(bb.min.y - deckY).toFixed(2)} m above the deck at u ${ug.toFixed(2)}`);
        if (bb.min.y < deckY - 0.20)
          say(v.id, 'an anchor through the planking',
              `lowest point ${(deckY - bb.min.y).toFixed(2)} m below the deck at u ${ug.toFixed(2)}`);
      }
    }

    /* (r183) THE STONE ANCHOR THE EYEWITNESS DESCRIBES. Xu Jing 1124: the anchor-stone
       hangs at the bow, two wooden hooks clamping its sides, on the windlass's own
       rattan cable. V-WARRANT both ways, as the grapnel rule. V-STONE: one stone bar,
       its longest drawn dimension the record's stoneLenM. V-HOOKS: two hook points,
       found STRUCTURALLY as the group's cones, not by name. V-REST: the recovered
       anchor is taken in (收之) and lies on the foredeck — the assembly's lowest
       point sits ON the deck at its own station, asked of the surface itself, as the
       grapnel rule asks; floating and stabbed-through both convict. V-CABLE: the
       text's one sentence carries wheel, cable and stone together — a drawn stone
       with no cable convicts. */
    {
      const am = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'stoneAnchor') am.push(o); });
      if (am.length && !H.stoneAnchor)
        say(v.id, 'an anchor the record does not carry',
            `${am.length} stone-anchor meshes drawn with no stoneAnchor field — this `
            + "hull's record is silent, and silence draws nothing");
      if (H.stoneAnchor && !am.length)
        say(v.id, 'declared but not drawn', 'stoneAnchor');
      if (H.stoneAnchor && am.length) {
        const R = H.stoneAnchor;
        const stones = am.filter(o => o.name === 'st-stone');
        if (stones.length !== 1)
          say(v.id, 'a stone anchor without its stone',
              `${stones.length} stone bars drawn — the record hangs one`);
        else if (R.stoneLenM) {
          const bs = new THREE.Box3().setFromObject(stones[0]);
          const lg = Math.max(bs.max.x - bs.min.x, bs.max.y - bs.min.y,
                              bs.max.z - bs.min.z);
          if (Math.abs(lg - R.stoneLenM) > 0.10 * R.stoneLenM)
            say(v.id, "the stone off the record's length",
                `bar ${lg.toFixed(2)} m, record says ${R.stoneLenM}`);
        }
        const tips = am.filter(o => o.geometry.type === 'ConeGeometry');
        if (tips.length !== 2)
          say(v.id, 'a stone anchor without its two hooks',
              `${tips.length} hook points drawn — the text clamps the stone with two`);
        const bb = new THREE.Box3();
        for (const o of am) if (o.name !== 'st-cable')
          bb.union(new THREE.Box3().setFromObject(o));
        const HSa = SHIPS_HULL.hullSurface(H);
        const ua = Math.max(0, Math.min(1,
          ((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
        const deckA = HSa.sheer(ua);
        if (bb.min.y > deckA + 0.25)
          say(v.id, 'an anchor floating over its own deck',
              `lowest point ${(bb.min.y - deckA).toFixed(2)} m above the deck at u ${ua.toFixed(2)}`);
        if (bb.min.y < deckA - 0.20)
          say(v.id, 'an anchor through the planking',
              `lowest point ${(deckA - bb.min.y).toFixed(2)} m below the deck at u ${ua.toFixed(2)}`);
        if (!am.some(o => o.name === 'st-cable'))
          say(v.id, 'a stone anchor with no cable',
              "the text's sentence carries wheel, cable and stone together — "
              + 'nothing drawn holds this anchor to the ship');
      }
    }

    /* (r184) THE FOUR-CLAW IRON ANCHORS THE TWO TGK CHAPTERS CARRY. 錘鍛 forges the
       form (four claws joined to a shank, fetched whole r184); 舟車 counts the
       inventory (five or six, the 500-catty sheet anchor, two at the head).
       V-WARRANT both ways, as the grapnel and stone rules. V-COUNT: drawn anchor
       assemblies, found STRUCTURALLY as the group's ring tori, equal what the record
       draws (sheet + head pair + stern pair where the record stows one, r185).
       V-CLAWS: four cone points per anchor — the forging text's own count. V-LEN
       (r188; r189 adds the crown): each anchor's 全長 — crown BOTTOM to ring top,
       the span the find convention measures — crown, shank and head-ring extents
       projected on the shank's own world axis, geometry through the world matrix
       (the r186 lesson), sorted against the record's full lengths, which are
       CALIBRATED from the Penglai find (2.15 m, 456 kg; Matsui 2013 fig. 3).
       V-SWEEP (r189): each anchor's claw reach — tip-cone apexes' radial distance
       from the shank's own world axis — against the proportion measured from the
       same find's drawing, 0.339 of the record's 全長 (fig. 3a self-scaled,
       322.8 px/m). An anchor with no tips is V-CLAWS's conviction, so V-SWEEP
       passes over it. V-MASS (r190): each anchor's iron INTEGRATED from the
       built scene — every member's analytic volume (frustum, cone, ball, torus
       from its geometry parameters) through its own world matrix's DETERMINANT,
       exact under any linear map — × 7850 kg/m³ against the record's weight
       slot (sheetKg 295 RECORDED, the 舟車 text's own 500 catties; the pair's
       300-catty inference), 12% band; {len, sweep, kg} measured in ONE pass and
       sorted together (the r189 slot lesson). An anchor with missing members is
       V-COUNT's fault and V-MASS passes over it. V-REST (r185): each assembly asked of the
       SURFACE ITSELF — a ray straight down from over the assembly, first non-anchor
       hit is the surface it must rest on. Sheer-only V-REST would convict any
       poop-stowed stern anchor as floating, and could never see a missing roof.
       V-CABLE: one cable per anchor — the 舟車 sentence carries anchor, cable,
       posts and winch together; a loose anchor convicts. */
    {
      const im = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'ironAnchors') im.push(o); });
      if (im.length && !H.ironAnchors)
        say(v.id, 'an anchor the record does not carry',
            `${im.length} iron-anchor meshes drawn with no ironAnchors field — this `
            + "hull's record is silent, and silence draws nothing");
      if (H.ironAnchors && !im.length)
        say(v.id, 'declared but not drawn', 'ironAnchors');
      if (H.ironAnchors && im.length) {
        const R = H.ironAnchors;
        const want = (R.sheetLenM !== 0 ? 1 : 0) + (R.bowerLenM !== 0 ? 2 : 0)
          + (R.sternAtU != null && R.sternLenM !== 0 ? 2 : 0);
        const rings = im.filter(o => o.geometry.type === 'TorusGeometry');
        if (rings.length !== want)
          say(v.id, "the anchors off the record's count",
              `${rings.length} head rings drawn — the record's drawn set is ${want}`);
        const tips = im.filter(o => o.geometry.type === 'ConeGeometry');
        if (tips.length !== want * 4)
          say(v.id, 'an iron anchor without its four claws',
              `${tips.length} claw points drawn for ${want} anchors — the forging text `
              + 'makes four claws first');
        const grps = [];
        g.traverse(o => { const p = tagOf(o);
          if (o.isGroup && o.name === 'ia-grp' && p && p.key === 'ironAnchors')
            grps.push(o); });
        /* full length per anchor — 全長, crown bottom to ring top: crown, shank
           and head-ring extents projected on the shank's own world axis — geometry
           through the world matrix (the r186 lesson: a world AABB cannot read the
           45° stow). Sweep is measured on the SAME pass and the pair {len, sweep}
           stays together, sorted by length — the first sever run proved that
           sorting sweeps separately slides the survivors against the wrong record
           slots and convicts an innocent anchor. */
        const volOf = (o) => {
          /* analytic member volume through the world matrix's determinant —
             exact under any linear map, so a stretched or thinned member
             weighs as drawn (r190) */
          o.updateMatrixWorld(true);
          const e = o.matrixWorld.elements;
          const det = Math.abs(
            e[0] * (e[5] * e[10] - e[6] * e[9])
            - e[4] * (e[1] * e[10] - e[2] * e[9])
            + e[8] * (e[1] * e[6] - e[2] * e[5]));
          const pg = o.geometry.parameters;
          if (o.geometry.type === 'ConeGeometry')
            return det * Math.PI * pg.radius * pg.radius * pg.height / 3;
          if (o.geometry.type === 'CylinderGeometry')
            return det * Math.PI * pg.height / 3
              * (pg.radiusTop * pg.radiusTop + pg.radiusTop * pg.radiusBottom
                 + pg.radiusBottom * pg.radiusBottom);
          if (o.geometry.type === 'SphereGeometry')
            return det * 4 / 3 * Math.PI * Math.pow(pg.radius, 3);
          if (o.geometry.type === 'TorusGeometry')
            return det * 2 * Math.PI * Math.PI * pg.radius * pg.tube * pg.tube;
          return 0;
        };
        const per = grps.map(gr => {
          let shk = null, rng = null, crn = null;
          const tps = [], mem = [];
          gr.traverse(o => { if (o.isMesh) mem.push(o);
            if (o.name === 'ia-shank') shk = o;
            else if (o.name === 'ia-ring') rng = o;
            else if (o.name === 'ia-crown') crn = o;
            else if (o.name === 'ia-tip') tps.push(o); });
          if (!shk || !rng || !crn) return { len: 0, sweep: null, kg: null };
          let lo = Infinity, hi = -Infinity;
          const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
          for (const o of [shk, rng, crn]) {
            o.geometry.computeBoundingBox();
            o.updateMatrixWorld(true);
            const lb2 = o.geometry.boundingBox;
            for (const yy of [lb2.min.y, lb2.max.y]) {
              const t = new THREE.Vector3(0, yy, 0).applyMatrix4(o.matrixWorld).dot(ax);
              if (t < lo) lo = t; if (t > hi) hi = t;
            }
          }
          /* V-SWEEP (r189): apex of each tip cone through its world matrix;
             radial distance from the line through the shank along its own axis.
             Null (no tips) is V-CLAWS's fault, not this rule's. */
          let mx = null;
          const p0 = new THREE.Vector3().setFromMatrixPosition(shk.matrixWorld);
          for (const t of tps) {
            t.updateMatrixWorld(true);
            const apex = new THREE.Vector3(0, t.geometry.parameters.height / 2, 0)
              .applyMatrix4(t.matrixWorld);
            const d = apex.sub(p0);
            const rad = d.sub(ax.clone().multiplyScalar(d.dot(ax))).length();
            if (mx == null || rad > mx) mx = rad;
          }
          const kg = 7850 * mem.reduce((s2, o) => s2 + volOf(o), 0);
          return { len: hi - lo, sweep: mx, kg };
        }).sort((a, b2) => b2.len - a.len);
        const wantLn = [];
        if (R.sheetLenM !== 0)
          wantLn.push({ ln: R.sheetLenM || 1.86, kg: R.sheetKg || 295 });
        if (R.bowerLenM !== 0)
          for (let k2 = 0; k2 < 2; k2++)
            wantLn.push({ ln: R.bowerLenM || 1.57, kg: R.bowerKg || 177 });
        if (R.sternAtU != null && R.sternLenM !== 0)
          for (let k2 = 0; k2 < 2; k2++)
            wantLn.push({ ln: R.sternLenM || 1.57, kg: R.sternKg || 177 });
        wantLn.sort((a, b2) => b2.ln - a.ln);
        for (let i = 0; i < Math.min(per.length, wantLn.length); i++) {
          if (Math.abs(per[i].len - wantLn[i].ln) > 0.12 * wantLn[i].ln)
            say(v.id, "an anchor off the record's length",
                `crown to ring head ${per[i].len.toFixed(2)} m along the shank's own `
                + `axis — the record's full length is ${wantLn[i].ln}`);
          if (per[i].sweep != null
              && Math.abs(per[i].sweep - 0.339 * wantLn[i].ln)
                 > 0.12 * 0.339 * wantLn[i].ln)
            say(v.id, "a claw sweep off the find's proportion",
                `claw reach ${per[i].sweep.toFixed(2)} m from the shank's own axis — `
                + `the Penglai proportion gives ${(0.339 * wantLn[i].ln).toFixed(2)}`);
          if (per[i].kg != null
              && Math.abs(per[i].kg - wantLn[i].kg) > 0.12 * wantLn[i].kg)
            say(v.id, "an anchor off the record's weight",
                `${per[i].kg.toFixed(0)} kg of drawn iron integrated from the scene — `
                + `the record's weight is ${wantLn[i].kg}`);
        }
        const rayR = new THREE.Raycaster();
        for (const gr of grps) {
          const bb = new THREE.Box3().setFromObject(gr);
          const ui = Math.max(0, Math.min(1,
            ((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
          /* ask the surface itself: from just over the assembly straight down, the
             first hit that is not the anchor's own iron or cordage is the surface
             it rests on — foredeck for the bow set, poop roof for the stern pair */
          rayR.set(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.5,
                                     (bb.min.z + bb.max.z) / 2),
                   new THREE.Vector3(0, -1, 0));
          const under = rayR.intersectObject(g, true).filter(h => {
            const p = tagOf(h.object);
            return !(p && (p.key === 'ironAnchors' || NONBEARING.has(p.key))); });
          if (!under.length) {
            say(v.id, 'an anchor resting on nothing',
                `no surface under the assembly at u ${ui.toFixed(2)}`);
            continue;
          }
          const gap = bb.min.y - under[0].point.y;
          if (gap > 0.25)
            say(v.id, 'an anchor floating over its own deck',
                `lowest point ${gap.toFixed(2)} m above the surface under it at u ${ui.toFixed(2)}`);
          if (gap < -0.20)
            say(v.id, 'an anchor through the planking',
                `lowest point ${(-gap).toFixed(2)} m into the surface under it at u ${ui.toFixed(2)}`);
        }
        const cables = im.filter(o => o.name === 'ia-cable');
        if (cables.length !== want)
          say(v.id, 'an iron anchor with no cable',
              `${cables.length} cables for ${want} anchors — the 舟車 sentence gives `
              + 'every anchor its cable');
      }
    }

    /* (r186) THE KOREAN WOODEN ANCHOR AND ITS STONE. The warship plate of her own
       navy's album draws the anchor; the form is the West Sea composite — oak shank,
       hook-arms both sides, crossbar at the head, a long grooved stone lashed on to
       sink the frame. V-WARRANT both ways, as every anchor rule. V-ARMS: the
       record's arm count of hook points, found STRUCTURALLY as the group's cones.
       V-STONE: one stone, its longest dimension read THROUGH the stow transform
       (sorted world extents — a box axis cannot read a 45° roll) against the
       record's stoneLenM. V-CROSS: the 닻장 is a record field no bounding box can
       see — a cross-member must sit near the shank head with its axis athwart the
       shank's, or the cable has nothing to bend on. V-REST: the recovered anchor
       lies on the foredeck, asked of the surface itself (ray straight down, first
       non-anchor hit — the r185 form); floating and stabbed-through both convict.
       V-CABLE: the horong turns this anchor's cable — a drawn anchor with nothing
       led to the machine convicts. */
    {
      const wm = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'woodAnchor') wm.push(o); });
      if (wm.length && !H.woodAnchor)
        say(v.id, 'an anchor the record does not carry',
            `${wm.length} wooden-anchor meshes drawn with no woodAnchor field — this `
            + "hull's record is silent, and silence draws nothing");
      if (H.woodAnchor && !wm.length)
        say(v.id, 'declared but not drawn', 'woodAnchor');
      if (H.woodAnchor && wm.length) {
        const R = H.woodAnchor;
        const tips = wm.filter(o => o.geometry.type === 'ConeGeometry');
        const wantArms = R.arms || 4;
        if (tips.length !== wantArms)
          say(v.id, 'a wooden anchor off its arm count',
              `${tips.length} hook points drawn — the record hangs ${wantArms}`);
        const stones = wm.filter(o => o.name === 'wa-stone');
        if (stones.length !== 1)
          say(v.id, 'a wooden anchor without its stone',
              `${stones.length} anchor-stones drawn — the record lashes one on, and `
              + 'an oak frame without it will not sink');
        else if (R.stoneLenM) {
          /* a world AABB cannot read a box rolled 45° (the r182 span lesson) — read
             the stone's own geometry extents through the world matrix's scale, which
             a rigid stow cannot shrink and a scale cheat cannot hide from */
          const sg2 = stones[0];
          sg2.geometry.computeBoundingBox();
          sg2.updateMatrixWorld(true);
          const lb = sg2.geometry.boundingBox, me = sg2.matrixWorld.elements;
          const scl = [Math.hypot(me[0], me[1], me[2]),
                       Math.hypot(me[4], me[5], me[6]),
                       Math.hypot(me[8], me[9], me[10])];
          const ext = [(lb.max.x - lb.min.x) * scl[0],
                       (lb.max.y - lb.min.y) * scl[1],
                       (lb.max.z - lb.min.z) * scl[2]].sort((a, b2) => b2 - a);
          if (Math.abs(ext[0] - R.stoneLenM) > 0.10 * R.stoneLenM)
            say(v.id, "the stone off the record's length",
                `stone ${ext[0].toFixed(2)} m through the stow transform, `
                + `record says ${R.stoneLenM}`);
        }
        const shk = wm.find(o => o.name === 'wa-shank');
        const crs = wm.find(o => o.name === 'wa-cross');
        if (!crs)
          say(v.id, 'a wooden anchor with no crossbar',
              'the 닻장 the cable bends on is a record field — nothing drawn carries it');
        else if (shk) {
          shk.updateMatrixWorld(true); crs.updateMatrixWorld(true);
          const axS = new THREE.Vector3(0, 1, 0)
            .transformDirection(shk.matrixWorld);
          const axC = new THREE.Vector3(0, 1, 0)
            .transformDirection(crs.matrixWorld);
          if (Math.abs(axS.dot(axC)) > 0.35)
            say(v.id, 'a crossbar along its own shank',
                `닻장 axis ${Math.abs(axS.dot(axC)).toFixed(2)} off athwart — the `
                + 'bar is fixed across the shank, not along it');
          const bS = new THREE.Box3().setFromObject(shk);
          const bC = new THREE.Box3().setFromObject(crs);
          const cS = bS.getCenter(new THREE.Vector3());
          const cC = bC.getCenter(new THREE.Vector3());
          const shankLen = R.shankM || 3.2;
          if (cC.distanceTo(cS) < shankLen * 0.25)
            say(v.id, 'a crossbar lost down the shank',
                '닻장 drawn at the shank middle — the dictionary fixes it 닻채 위에, '
                + 'at the head where the cable bends');
        }
        const bbW = new THREE.Box3();
        for (const o of wm) if (o.name !== 'wa-cable')
          bbW.union(new THREE.Box3().setFromObject(o));
        const uw = Math.max(0, Math.min(1,
          ((bbW.min.x + bbW.max.x) / 2) / (H.lwl || H.loa) + 0.5));
        const rayW = new THREE.Raycaster();
        rayW.set(new THREE.Vector3((bbW.min.x + bbW.max.x) / 2, bbW.max.y + 0.5,
                                   (bbW.min.z + bbW.max.z) / 2),
                 new THREE.Vector3(0, -1, 0));
        const underW = rayW.intersectObject(g, true).filter(h => {
          const p = tagOf(h.object);
          return !(p && (p.key === 'woodAnchor' || NONBEARING.has(p.key))); });
        if (!underW.length)
          say(v.id, 'an anchor resting on nothing',
              `no surface under the assembly at u ${uw.toFixed(2)}`);
        else {
          const gapW = bbW.min.y - underW[0].point.y;
          if (gapW > 0.25)
            say(v.id, 'an anchor floating over its own deck',
                `lowest point ${gapW.toFixed(2)} m above the surface under it at u ${uw.toFixed(2)}`);
          if (gapW < -0.20)
            say(v.id, 'an anchor through the planking',
                `lowest point ${(-gapW).toFixed(2)} m into the surface under it at u ${uw.toFixed(2)}`);
        }
        if (!wm.some(o => o.name === 'wa-cable'))
          say(v.id, 'a wooden anchor with no cable',
              'the horong turns this anchor\'s cable — nothing drawn holds it to the ship');
      }
    }

    /* (r187) THE JAPANESE FOUR-CLAW IRON ANCHOR. Her own plate draws the recurved-
       claw anchor at the anchored barrier's cable-end (Busan 1593); the form is the
       wasen tradition's 四爪碇 — square-bar shank split into four claws, elongated
       head ring, free accessory ring the cable bends to. V-WARRANT both ways, as
       every anchor rule. V-YARMS: four fluke tips, found STRUCTURALLY as cones.
       V-YRING: exactly TWO ring tori — the head ring and the accessory ring through
       it; one is a lost cable-bend, three is an invented fitting. V-YLEN: the
       assembly's longest extent read from each mesh's own geometry through the world
       matrix scale (the r186 lesson — a world AABB cannot read a 45° roll) against
       the record's lenM. V-YREST: the recovered anchor lies on the foredeck, asked
       of the surface itself (ray straight down, first non-anchor hit — the r185
       form); floating and stabbed-through both convict. V-YCABLE: no machine and no
       belay is attested — the cable is flaked in a coil beside the head, so a drawn
       anchor with no cable or no coil convicts. */
    {
      const ym = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'yotsumeAnchor') ym.push(o); });
      if (ym.length && !H.yotsumeAnchor)
        say(v.id, 'an anchor the record does not carry',
            `${ym.length} yotsume-anchor meshes drawn with no yotsumeAnchor field — `
            + "this hull's record is silent, and silence draws nothing");
      if (H.yotsumeAnchor && !ym.length)
        say(v.id, 'declared but not drawn', 'yotsumeAnchor');
      if (H.yotsumeAnchor && ym.length) {
        const R = H.yotsumeAnchor;
        const tips = ym.filter(o => o.geometry.type === 'ConeGeometry');
        if (tips.length !== 4)
          say(v.id, 'a four-claw anchor off its claw count',
              `${tips.length} fluke tips drawn — the name itself says four`);
        const tori = ym.filter(o => o.geometry.type === 'TorusGeometry');
        if (tori.length !== 2)
          say(v.id, 'a yotsume off its rings',
              `${tori.length} ring tori drawn — the head ring carries the free ring `
              + 'the cable bends to: exactly two');
        /* the length through the stow transform: per-mesh geometry extents through
           world scale, assembled — a rigid stow cannot shrink it, a scale cheat
           cannot hide from it */
        const lenR = R.lenM || 2.0;
        let lo = Infinity, hi = -Infinity;
        const shk = ym.find(o => o.name === 'ya-shank');
        const rng = ym.find(o => o.name === 'ya-ring');
        if (shk && rng) {
          for (const o of [shk, rng]) {
            o.geometry.computeBoundingBox();
            o.updateMatrixWorld(true);
            const lb2 = o.geometry.boundingBox;
            for (const yy of [lb2.min.y, lb2.max.y]) {
              const p2 = new THREE.Vector3(0, yy, 0).applyMatrix4(o.matrixWorld);
              /* project onto the shank's own world axis */
              const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
              const t = p2.dot(ax);
              if (t < lo) lo = t; if (t > hi) hi = t;
            }
          }
          const drawnLen = hi - lo;
          if (Math.abs(drawnLen - lenR) > 0.12 * lenR)
            say(v.id, "a yotsume off the record's length",
                `crown to ring head ${drawnLen.toFixed(2)} m along the shank's own `
                + `axis — the record says ${lenR}`);
        }
        const bbY = new THREE.Box3();
        for (const o of ym) if (o.name !== 'ya-cable' && o.name !== 'ya-coil')
          bbY.union(new THREE.Box3().setFromObject(o));
        const uy = Math.max(0, Math.min(1,
          ((bbY.min.x + bbY.max.x) / 2) / (H.lwl || H.loa) + 0.5));
        const rayY = new THREE.Raycaster();
        rayY.set(new THREE.Vector3((bbY.min.x + bbY.max.x) / 2, bbY.max.y + 0.5,
                                   (bbY.min.z + bbY.max.z) / 2),
                 new THREE.Vector3(0, -1, 0));
        const underY = rayY.intersectObject(g, true).filter(h => {
          const p = tagOf(h.object);
          return !(p && (p.key === 'yotsumeAnchor' || NONBEARING.has(p.key))); });
        if (!underY.length)
          say(v.id, 'an anchor resting on nothing',
              `no surface under the assembly at u ${uy.toFixed(2)}`);
        else {
          const gapY = bbY.min.y - underY[0].point.y;
          if (gapY > 0.25)
            say(v.id, 'an anchor floating over its own deck',
                `lowest point ${gapY.toFixed(2)} m above the surface under it at u ${uy.toFixed(2)}`);
          if (gapY < -0.20)
            say(v.id, 'an anchor through the planking',
                `lowest point ${(-gapY).toFixed(2)} m into the surface under it at u ${uy.toFixed(2)}`);
        }
        if (!ym.some(o => o.name === 'ya-cable'))
          say(v.id, 'a yotsume with no cable',
              'nothing drawn holds this anchor to the ship');
        else if (!ym.some(o => o.name === 'ya-coil'))
          say(v.id, 'a cable with no coil',
              'no machine and no belay is attested — the cable is flaked beside the '
              + 'head, and a cable ending in air is a part attached to nothing');
      }
    }

    /* declared screws must be drawn, and a screw lives under water */
    if (H.screws) {
      if (!part.screw) say(v.id, 'declared but not drawn', 'screws');
      else if (part.screw.y[1] > 0)
        say(v.id, 'screws out of the water', `top at ${part.screw.y[1].toFixed(1)} m`);
    }

    /* (r101) A BUILD KEY NAMES A TRADITION THE TABLE KNOWS. Endurance shipped with
       build: 'wood' — no such entry — and the undefined lookup threw inside swAdoptShip,
       killing __FRAME_READY for the whole Shipwright deep-link. The view now degrades to
       the default tradition, so only this rule reports the bad field. TRADITION is read
       from the page's own global scope so this list cannot drift from the real table. */
    if (H.build && typeof TRADITION !== 'undefined' && !TRADITION[H.build])
      say(v.id, 'build tradition unknown',
          `build: '${H.build}' names no entry in the tradition table`);

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

    /* (r101) THE OPEN AFTERMOST BOOM DRAWS ITS SAIL PLAN, NOT THE HULL'S LEFTOVERS.
       Twice now a spanker boom was clamped by something that is not there: a virtual stern
       station discounted for swing clearance (the 74's driver at 7.6 m against Steel's
       13–17), and a phantom funnel slot no funnel occupies (the steamer's at 5.4 m). The
       rule pins the agreed entitlement — the 0.62 share of the lower mast, bounded by
       gapAft * 1.6, the calibrated taffrail-overhang limit — and fires BOTH ways, because
       an unclamped boom running to 0.62 of a pole mast is the Endurance fault in reverse.
       Obstruction is decided by GEOMETRY: a drawn funnel mesh abaft the mast station makes
       the clamp legitimate and the rule stands down, whatever the spec declares. */
    (() => {
      const masts = H.masts || [];
      const mk = masts[masts.length - 1];
      if (!mk || !(mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker))) return;
      const L = H.lwl, mastX = (mk.at - 0.5) * L;
      let funnelAbaft = false;
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.key === 'funnel') {
        const bbx = new THREE.Box3().setFromObject(o);
        if ((bbx.min.x + bbx.max.x) / 2 > mastX) funnelAbaft = true;
      } });
      if (funnelAbaft) return;
      const lower = lowerOf(mk);
      const want = Math.max(lower * 0.16,
                            Math.min(lower * 0.62, (1.04 - mk.at) * L * 1.6));
      const booms = [];
      g.traverse(o => { if (o.isMesh && o.userData.part &&
                            o.userData.part.name === 'Boom') {
        const bbx = new THREE.Box3().setFromObject(o);
        booms.push({ cx: (bbx.min.x + bbx.max.x) / 2, len: bbx.max.x - bbx.min.x });
      } });
      if (!booms.length) return;
      booms.sort((a, b) => a.cx - b.cx);
      const aft = booms[booms.length - 1];
      if (aft.cx < mastX - L * 0.02) return;   // no boom on the aftermost mast itself
      if (aft.len < want * 0.93 || aft.len > want * 1.15)
        say(v.id, 'open boom off its sail plan',
            `aftermost boom ${aft.len.toFixed(1)} m against an entitlement of ` +
            `${want.toFixed(1)} m with nothing drawn abaft the mast`);
    })();

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
      const lower = lowerOf(mk);
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
        /* ⚠ AN AIRFRAME IS ONE BODY (round 145). Each parked aircraft's principal
           mesh — the one with the longest run down the group's own x axis — must BE
           the airframe: spanning at least 0.8 of the group's length and lofted
           rather than a twelve-triangle box. The convicted form was a nose cone
           abutting a 13.2 m brick — the r144 step class, two meshes pretending to
           be one body, and the brick was 70% of the airframe. Measured in the
           group's LOCAL frame (the r144 lesson), because every aircraft on the
           deck is rotated to its own heading and a world-frame box aliases the
           rake in. */
        let acBad = 0, acNote = '';
        for (const ac of acs) {
          let lo = Infinity, hi = -Infinity, pRun = 0, pTris = 0;
          ac.traverse(o => {
            if (!o.isMesh || !o.geometry) return;
            o.geometry.computeBoundingBox();
            const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
            lo = Math.min(lo, bb.min.x); hi = Math.max(hi, bb.max.x);
            const r = bb.max.x - bb.min.x;
            if (r > pRun) {
              pRun = r;
              pTris = o.geometry.index ? o.geometry.index.count / 3
                    : o.geometry.attributes.position.count / 3;
            }
          });
          if (pRun < (hi - lo) * 0.8 || pTris <= 12) {
            acBad++;
            acNote = `principal mesh runs ${pRun.toFixed(2)} of ${(hi - lo).toFixed(2)} m ` +
                     `at ${pTris} triangles`;
          }
        }
        if (acBad)
          say(v.id, 'airframe is not one body',
              `${acBad} of ${acs.length} — ${acNote} — a cone abutting a brick, ` +
              'not a lofted body');
      }
    }

    /* ⚠ AN ISLAND IS ONE TOWER, NOT A STACK OF SLABS UNDER A STICK (round 146). The
       island's principal mesh — the one with the longest run up the group's own y axis —
       must BE the tower: spanning at least half the island's full height, mast included,
       and lofted rather than boxed. The convicted form was three stacked tier boxes with
       a glass box laid over each upper tier and a picket of 22 mullion boxes over the
       glass; its tallest single mesh was the MAST, an eight-sided stick at 43% of the
       assembly, and no slab rose past a quarter of it. Measured in the group's LOCAL
       frame, the r144 lesson. */
    if (H.flightDeck) {
      let islG = null;
      g.traverse(o => {
        if (!islG && o.isGroup && o.userData.part && o.userData.part.key === 'island')
          islG = o;
      });
      if (islG) {
        islG.updateMatrixWorld(true);
        let lo2 = Infinity, hi2 = -Infinity, pRun = 0, pTris = 0;
        islG.traverse(o => {
          if (!o.isMesh || !o.geometry) return;
          o.geometry.computeBoundingBox();
          const bb2 = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
          lo2 = Math.min(lo2, bb2.min.y); hi2 = Math.max(hi2, bb2.max.y);
          const r = bb2.max.y - bb2.min.y;
          if (r > pRun) {
            pRun = r;
            pTris = o.geometry.index ? o.geometry.index.count / 3
                  : o.geometry.attributes.position.count / 3;
          }
        });
        if (pRun < (hi2 - lo2) * 0.5 || pTris <= 40)
          say(v.id, 'island is not one tower',
              `principal mesh runs ${pRun.toFixed(2)} of ${(hi2 - lo2).toFixed(2)} m ` +
              `at ${pTris} triangles — slabs under a stick, not a lofted tower`);
      }
    }

    /* ⚠ A FLOATPLANE IS ONE BODY TOO (round 148) — the r145 airframe law reaching the
       catapult aircraft. Each floatplane group's principal mesh — the longest run down
       the group's own x axis — must BE the airframe: spanning at least 0.8 of the
       aircraft's length and lofted rather than boxed. The convicted form was three
       abutting cylinders — cowl, barrel, tail cone, the r144 step class — whose
       principal mesh was the 6.6 m barrel of a 9.3 m aircraft. Measured in the group's
       LOCAL frame (the r144 lesson): one aircraft rides the catapult nose-astern, the
       parked ones stand at hand-pushed headings, and a world-frame box aliases all of
       that in. */
    if (H.floatplanes) {
      const acs = [];
      g.traverse(o => {
        if (o.isGroup && o.userData.part && o.userData.part.key === 'floatplane')
          acs.push(o);
      });
      let fpBad = 0, fpNote = '';
      for (const ac of acs) {
        let lo = Infinity, hi = -Infinity, pRun = 0, pTris = 0;
        ac.traverse(o => {
          if (!o.isMesh || !o.geometry) return;
          o.geometry.computeBoundingBox();
          const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
          lo = Math.min(lo, bb.min.x); hi = Math.max(hi, bb.max.x);
          const r = bb.max.x - bb.min.x;
          if (r > pRun) {
            pRun = r;
            pTris = o.geometry.index ? o.geometry.index.count / 3
                  : o.geometry.attributes.position.count / 3;
          }
        });
        if (pRun < (hi - lo) * 0.8 || pTris <= 12) {
          fpBad++;
          fpNote = `principal mesh runs ${pRun.toFixed(2)} of ${(hi - lo).toFixed(2)} m ` +
                   `at ${pTris} triangles`;
        }
      }
      if (fpBad)
        say(v.id, 'floatplane is not one body',
            `${fpBad} of ${acs.length} — ${fpNote} — a cowl, a barrel and a tail cone ` +
            'abutting, not a lofted body');
    }

    /* ⚠ A WING PLATFORM STANDS ON A TAPERING WEB, NOT ON A SLAB (round 149). Each
       searchlight platform hangs off the pagoda on a bracket, and a cantilever bracket
       is deep at the tower face and thins to a toe under the platform rim — a web whose
       depth at the root is at least twice its depth at the free end, plated rather than
       boxed. The convicted form was one 1.1 × 0.9 × 2.6 box, the same depth at the
       tower as at its free end, which no cantilever web is. Measured on the bracket's
       own geometry in mesh-local coordinates — the port meshes share the starboard
       geometry under a PI turn about y (r118), which only swaps the two ends, so the
       root/toe read is taken as max/min of the ends and holds on both sides. */
    if (H.searchlights) {
      let bkBad = 0, bkN = 0, bkNote = '';
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Platform bracket')
          return;
        bkN++;
        const pos = o.geometry.attributes.position;
        const bkTris = o.geometry.index ? o.geometry.index.count / 3 : pos.count / 3;
        let zLo = Infinity, zHi = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          zLo = Math.min(zLo, pos.getZ(i)); zHi = Math.max(zHi, pos.getZ(i));
        }
        const span = zHi - zLo;
        const depth = band => {
          let yLo = Infinity, yHi = -Infinity;
          for (let i = 0; i < pos.count; i++)
            if (band(pos.getZ(i))) {
              yLo = Math.min(yLo, pos.getY(i)); yHi = Math.max(yHi, pos.getY(i));
            }
          return yHi > yLo ? yHi - yLo : 0;
        };
        const dA = depth(z => z < zLo + span * 0.15);
        const dB = depth(z => z > zHi - span * 0.15);
        const dRoot = Math.max(dA, dB), dToe = Math.min(dA, dB);
        if (bkTris <= 12 || dRoot < 2 * dToe) {
          bkBad++;
          bkNote = `depth ${dRoot.toFixed(2)} at the tower, ${dToe.toFixed(2)} at the ` +
                   `toe, ${bkTris} triangles`;
        }
      });
      if (bkBad)
        say(v.id, 'platform bracket is a slab',
            `${bkBad} of ${bkN} — ${bkNote} — the same depth at its free end as at ` +
            'the tower face, which no cantilever web is');
    }

    /* ⚠ A GUN SHIELD RAKES; ONLY A CRATE IS PLUMB ON EVERY SIDE (round 150). The
       high-angle gunhouse and the shielded 25 mm mount are near-boxy in life — that is
       why they survived 149 rounds — but both shields rake back from their own base:
       the Type 89 house to a narrower crown, the Type 96 wrap inward toward the guns.
       The convicted forms were rectangular boxes, 12 triangles, plumb on every side.
       Measured on the shield's own geometry in mesh-local coordinates — the port
       mount turns the starboard geometry PI about y (r118), which leaves the local
       attributes untouched, so the read holds on both sides: max z in the top quarter
       of the mesh's height must be ≤ 0.9 x max z in the bottom quarter, and the shell
       must be plated past the boxy line (> 12 triangles). */
    if (H.aa || H.aaLight) {
      let shBad = 0, shN = 0, shNote = '';
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part) return;
        const nm = o.userData.part.name;
        if (nm !== 'High-angle mount' && nm !== 'Triple 25 mm mount') return;
        shN++;
        const pos = o.geometry.attributes.position;
        const shTris = o.geometry.index ? o.geometry.index.count / 3 : pos.count / 3;
        let yLo = Infinity, yHi = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          yLo = Math.min(yLo, pos.getY(i)); yHi = Math.max(yHi, pos.getY(i));
        }
        const h = yHi - yLo;
        const maxZ = band => {
          let m = -Infinity;
          for (let i = 0; i < pos.count; i++)
            if (band(pos.getY(i))) m = Math.max(m, pos.getZ(i));
          return m;
        };
        const zTop = maxZ(y => y > yHi - h * 0.25), zBot = maxZ(y => y < yLo + h * 0.25);
        if (shTris <= 12 || zTop > 0.9 * zBot) {
          shBad++;
          shNote = `${nm}: face ${zBot.toFixed(2)} at the base, ${zTop.toFixed(2)} at ` +
                   `the crown, ${shTris} triangles`;
        }
      });
      if (shBad)
        say(v.id, 'gun shield is a crate',
            `${shBad} of ${shN} — ${shNote} — plumb on every side, which no gun ` +
            'shield is');
    }

    /* ⚠ A PAGODA IS ONE TOWER, NOT A STACK OF CRATES (round 151) — the r146 island
       law reaching the battleship's bridge structure. The superstructure's principal
       mesh — the one with the longest run up the group's own y axis — must BE the
       tower: spanning at least 0.6 of the assembly's full height, rangefinder
       included, and lofted rather than boxed. The convicted form was K stacked boxes
       with a proud glass box wrapped round each of the top two levels; its tallest
       single mesh was one level at 14% of the assembly on yamato, 19% on
       dreadnought. Measured through each mesh's own matrix — every superstructure
       mesh is a direct child of the citadel group, so one level of matrix is the
       whole local frame (the r144 lesson). */
    if (H.turrets) {
      let ssLo = Infinity, ssHi = -Infinity, pRun = 0, pTris = 0, ssN = 0;
      g.traverse(o => {
        if (!o.isMesh || !o.geometry || !o.userData.part ||
            o.userData.part.key !== 'superstructure') return;
        ssN++;
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
        ssLo = Math.min(ssLo, bb.min.y); ssHi = Math.max(ssHi, bb.max.y);
        const r = bb.max.y - bb.min.y;
        if (r > pRun) {
          pRun = r;
          pTris = o.geometry.index ? o.geometry.index.count / 3
                : o.geometry.attributes.position.count / 3;
        }
      });
      if (ssN && (pRun < (ssHi - ssLo) * 0.6 || pTris <= 40))
        say(v.id, 'pagoda is a stack of crates',
            `principal mesh runs ${pRun.toFixed(2)} of ${(ssHi - ssLo).toFixed(2)} m ` +
            `at ${pTris} triangles — stacked boxes, not one lofted tower`);
    }

    /* ⚠ THE AVIATION DECK'S STEELWORK IS OPEN STEELWORK (round 152). A catapult is
       a truss and a crane jib is a tapering lattice: member-built, open web — only
       a crate encloses its own bounding volume, so the mesh's enclosed volume (the
       divergence sum over its own triangles) must stay under a quarter of its
       bounding box, and past the boxy line by a plated margin (> 60 triangles).
       And a launch rail carries its shuttle in a SLOT: in the head band — the top
       5 cm, mesh-local — no triangle may cross the centreline. The old rail's
       one-piece top face cannot dodge that; a vertex-band width read on an
       8-vertex box sees nothing at all, which is why the property is asked of
       triangles. */
    if (H.catapults) {
      let avBad = 0, avN = 0, avNote = '';
      const avTri = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const eachTri = (geo, fn) => {
        const pos = geo.attributes.position, ix = geo.index;
        const n = ix ? ix.count : pos.count;
        for (let i = 0; i + 2 < n; i += 3) {
          for (let k = 0; k < 3; k++) {
            const vi = ix ? ix.getX(i + k) : i + k;
            avTri[k][0] = pos.getX(vi); avTri[k][1] = pos.getY(vi);
            avTri[k][2] = pos.getZ(vi);
          }
          fn(avTri);
        }
      };
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part) return;
        const nm = o.userData.part.name;
        if (nm !== 'Aircraft catapult' && nm !== 'Aircraft crane' &&
            nm !== 'Launch rail') return;
        avN++;
        const geo = o.geometry;
        const tris = geo.index ? geo.index.count / 3
                   : geo.attributes.position.count / 3;
        if (nm === 'Launch rail') {
          let yHi = -Infinity, cross = false;
          eachTri(geo, t => {
            for (const p of t) yHi = Math.max(yHi, p[1]);
          });
          eachTri(geo, t => {
            if (t[0][1] >= yHi - 0.05 && t[1][1] >= yHi - 0.05 &&
                t[2][1] >= yHi - 0.05 &&
                Math.min(t[0][2], t[1][2], t[2][2]) < -0.02 &&
                Math.max(t[0][2], t[1][2], t[2][2]) > 0.02) cross = true;
          });
          if (tris <= 12 || cross) {
            avBad++;
            avNote = `${nm}: ${tris} triangles, head face in one piece across ` +
                     'the slot line';
          }
        } else {
          geo.computeBoundingBox();
          const bb = geo.boundingBox;
          const bbV = Math.max(1e-9, (bb.max.x - bb.min.x) *
                      (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z));
          let vol = 0;
          eachTri(geo, t => {
            const a = t[0], b = t[1], c = t[2];
            vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
                  - a[1] * (b[0] * c[2] - b[2] * c[0])
                  + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
          });
          const fill = Math.abs(vol) / bbV;
          if (tris <= 60 || fill > 0.25) {
            avBad++;
            avNote = `${nm}: ${tris} triangles filling ${fill.toFixed(2)} of its ` +
                     'own box';
          }
        }
      });
      if (avBad)
        say(v.id, 'aviation steelwork is a crate',
            `${avBad} of ${avN} — ${avNote} — a catapult is a truss, a rail is a ` +
            'slotted girder, a jib is a lattice');
    }

    /* ⚠ A BALANCED RUDDER IS A FOIL (round 153). A steel ship's rudder is a
       streamlined body, thickest near a third of its chord and CLOSED by its
       trailing edge: in the aft tenth of the chord run no vertex may stand past
       0.35 of the mesh's own max half-thickness (a NACA00 section still carries
       44% of max thickness at 80% chord, so the band is the last tenth, where the
       section really has closed). The convicted form was the 12-triangle slab at
       full thickness to its trailing edge — on every steel-steered hull in the
       fleet, twelve of them. Timber and median rudders really are plates, and stay
       out of scope by the record's own steering kind. */
    const steerR153 = H.steering ? H.steering
      : (H.build === 'steel' || H.build === 'iron') ? 'steel'
      : H.build === 'bulkhead' ? 'median' : 'stern';
    if (steerR153 === 'steel') {
      let rdBad = 0, rdNote = '';
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Rudder')
          return;
        const geo = o.geometry, pos = geo.attributes.position;
        const tris = geo.index ? geo.index.count / 3 : pos.count / 3;
        let xLo = Infinity, xHi = -Infinity, zMax = 0;
        for (let i = 0; i < pos.count; i++) {
          xLo = Math.min(xLo, pos.getX(i)); xHi = Math.max(xHi, pos.getX(i));
          zMax = Math.max(zMax, Math.abs(pos.getZ(i)));
        }
        let zAft = 0;
        for (let i = 0; i < pos.count; i++)
          if (pos.getX(i) > xHi - (xHi - xLo) * 0.10)
            zAft = Math.max(zAft, Math.abs(pos.getZ(i)));
        if (tris <= 12 || zAft > 0.35 * zMax) {
          rdBad++;
          rdNote = `${(zAft / Math.max(1e-9, zMax)).toFixed(2)} of full thickness ` +
                   `at the trailing edge, ${tris} triangles`;
        }
      });
      if (rdBad)
        say(v.id, 'rudder is a slab',
            `${rdNote} — a balanced rudder is a foil, closed at its trailing edge`);
    }

    /* ⚠ A NET SHELF IS ONE LEDGE ON GOOSENECKS, NOT A CHAIN OF CRATES (round 154).
       The torpedo-net outfit rides a continuous shelf plate following the plating —
       one fair ledge spanning the gear's own run, carried on gusset webs — and every
       boom heel swings in a gooseneck: backing pad, tapering cheek lugs, a pin. The
       convicted form was 18 loose plumb boxes per side chained on 6% overlap, and a
       solid crate at every heel. Two reads, both on the part's own meshes: the
       principal 'Net shelf' mesh must run at least 0.8 of the gear's fore-aft span
       past the boxy line (the r148 principal-body read), and no 'Boom hinge' may
       enclose more than 0.6 of its own bounding box (the divergence sum over its
       triangles, the r152 read) or sit at the boxy line. Extents via o.matrix — the
       net gear hangs directly on the ship group. */
    if (H.netDefence) {
      let ndBad = 0, ndN = 0, ndNote = '';
      let nsLo = Infinity, nsHi = -Infinity, nsRun = 0, nsTris = 0;
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part) return;
        const nm = o.userData.part.name;
        if (nm !== 'Net shelf' && nm !== 'Boom hinge') return;
        const geo = o.geometry;
        geo.computeBoundingBox();
        const tris = geo.index ? geo.index.count / 3
                   : geo.attributes.position.count / 3;
        if (nm === 'Net shelf') {
          ndN++;
          const bb = geo.boundingBox.clone().applyMatrix4(o.matrix);
          nsLo = Math.min(nsLo, bb.min.x); nsHi = Math.max(nsHi, bb.max.x);
          const r = bb.max.x - bb.min.x;
          if (r > nsRun) { nsRun = r; nsTris = tris; }
          return;
        }
        ndN++;
        const bb = geo.boundingBox;
        const bbV = Math.max(1e-9, (bb.max.x - bb.min.x) *
                    (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z));
        const pos = geo.attributes.position, ix = geo.index;
        const n = ix ? ix.count : pos.count;
        let vol = 0;
        const t = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let i = 0; i + 2 < n; i += 3) {
          for (let k = 0; k < 3; k++) {
            const vi = ix ? ix.getX(i + k) : i + k;
            t[k][0] = pos.getX(vi); t[k][1] = pos.getY(vi); t[k][2] = pos.getZ(vi);
          }
          vol += (t[0][0] * (t[1][1] * t[2][2] - t[1][2] * t[2][1])
                - t[0][1] * (t[1][0] * t[2][2] - t[1][2] * t[2][0])
                + t[0][2] * (t[1][0] * t[2][1] - t[1][1] * t[2][0])) / 6;
        }
        const fill = Math.abs(vol) / bbV;
        if (tris <= 12 || fill > 0.6) {
          ndBad++;
          ndNote = `a heel fitting of ${tris} triangles filling ${fill.toFixed(2)} ` +
                   'of its own box';
        }
      });
      if (nsHi > nsLo && (nsTris <= 12 || nsRun < (nsHi - nsLo) * 0.8)) {
        ndBad++;
        ndNote = `principal shelf plate runs ${nsRun.toFixed(2)} of ` +
                 `${(nsHi - nsLo).toFixed(2)} m at ${nsTris} triangles`;
      }
      if (ndBad)
        say(v.id, 'net defence is dry goods',
            `${ndBad} of ${ndN} — ${ndNote} — a net shelf is one ledge riding the ` +
            'plating, and a boom heel swings in a gooseneck, not a crate');
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

    /* ⚠ A WELDED SHIP'S POST STAYS INSIDE HER SHELL (round 95, Azzam). The steel stem bar
       carried a fixed siding of 5.5% of beam, wider than a fine entry's own half-breadth
       over most of the stem's run, and broke through the white shell as a dark arc down the
       bow. No rule saw it, because every width rule asks about deck fittings; this one walks
       the POST'S OWN STATIONS — its geometry is a strip, four vertices each — and asks the
       surface for its half-breadth at that station's height, u recovered through the rake by
       one fixed-point pass. Timber posts stand proud by design and are exempt. */
    if (H.build === 'steel' || H.build === 'iron') {
      const HS4 = SHIPS_HULL.hullSurface(H);
      let poke = 0, worstP = 0;
      g.traverse(o => {
        if (!o.isMesh) return;
        const p = tagOf(o);
        if (!p || p.key !== 'stempost') return;
        const pa = o.geometry.getAttribute('position');
        for (let s = 0; s + 3 < pa.count; s += 4) {
          const x = pa.getX(s), y = pa.getY(s);
          const zHalf = Math.max(Math.abs(pa.getZ(s)), Math.abs(pa.getZ(s + 1)));
          if (y < 0.3) continue;                       // the underwater run cannot read
          let u = Math.max(0.001, Math.min(0.999, 0.5 + x / H.lwl));
          const fb = HS4.sheer(u) || 1;
          const k = Math.max(0, Math.min(1, y / fb));
          u = Math.max(0.001, Math.min(0.999, 0.5 + (x - HS4.rake(u) * k) / H.lwl));
          const shell = Math.abs(
            SHIPS_HULL.surfacePoint(H, HS4, u, 0.62 + 0.38 * k)[2]);
          if (zHalf > shell + 0.05) { poke++; worstP = Math.max(worstP, zHalf - shell); }
        }
      });
      if (poke) say(v.id, 'post proud of a welded shell',
                    `${poke} stations stand up to ${worstP.toFixed(2)} m outside the plating`);
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

    /* ⚠ THE ISLANDS STAND WHERE THE RECORD STANDS THEM (round 113). Ever Given's bridge
       was drawn right aft for 66 rounds because the builder hard-coded the classic
       single-island layout, while her own loading computer puts her highest point — the
       bridge mast — 245.35 m forward of the aft perpendicular. A hull whose record
       carries bridgeU or funnelU must build that island within 3% of length of the
       recorded station; a record field the builder silently ignores is the class this
       round found. */
    for (const [fld, key] of [['bridgeU', 'bridge'], ['funnelU', 'funnel']]) {
      if (H[fld] === undefined || !part[key]) continue;
      const want = (H[fld] - 0.5) * H.lwl;
      const got = (part[key].x[0] + part[key].x[1]) / 2;
      if (Math.abs(got - want) > H.lwl * 0.03)
        say(v.id, `${key} island off its recorded station`,
            `record ${fld} = ${H[fld]} puts it at x ${want.toFixed(1)} m; ` +
            `built centroid x ${got.toFixed(1)} m`);
    }

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

    /* ── A SURFACE YOU STAND ON TAKES THE RECORDED COVERING (round 108). ──────────────
       Azzam's record states 2,200 m² of laid teak and after r106 the weather deck drew
       it — while the terrace stairs stayed topside white and every walkable tier roof
       stayed a MeshStandard plate: surfaces you stand on, ignoring the record they stand
       in the middle of. The class: stair treads and exposed house roofs are DECKS, and
       must ask deckCovering()'s one judgement. Gated exactly as the builder gates —
       recorded AND laid — so the 32 fallback ships convict nothing. Checked on the built
       graph because the fault is an assignment, invisible in the record itself. */
    if (H.deck && /^(teak|hinoki|pine|wood)$/.test(H.deck.covering || '')) {
      const covCol = { teak: '8a7250', hinoki: 'b3a17c', pine: 'c0ad84',
                       wood: 'a08a66' }[H.deck.covering];
      let badTreads = 0, coveredRoof = false;
      g.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const p = tagOf(o);
        if (p && p.key === 'stair') {
          const c = o.material.uniforms && o.material.uniforms.uCol
            ? o.material.uniforms.uCol.value.getHexString()
            : (o.material.color ? o.material.color.getHexString() : '');
          if (c !== covCol) badTreads++;
        }
        if (p && p.key === 'superstructure' && o.material.isShaderMaterial
            && o.material.uniforms && o.material.uniforms.uPlankW
            && o.geometry && o.geometry.type === 'ShapeGeometry') coveredRoof = true;
      });
      if (badTreads)
        say(v.id, 'stair treads ignore the recorded covering',
            `${badTreads} tread mesh(es) not in ${H.deck.covering} on a ship whose record lays it`);
      /* ⚠ AND SILENCE IS THE FAULT, NOT A DECISION. This convicted any ship with a laid
         covering whose tier roofs were not in it — which is r108's inference, and r132 found
         it too strong: a record covers the DECK IT NAMES. Queen Mary 2's source attests the
         wrap-around Promenade, deck 7, and deck 7 is that hull's own weather deck, so the
         teak is already drawn where it is attested; extending it upward painted her sun deck
         and every aft terrace one khaki field, which no photograph of her supports and which
         her own provenance admitted in the words "EXTENDED above".
         So what this rule now asks is whether the record has ANSWERED the question. A ship
         that says deck.roofs (either way, with a reason) has decided; a ship that is silent
         while carrying a laid covering has not, and that is the ambiguity worth convicting. */
      if (H.decks && !H.flightDeck && !H.turrets && H.houseAt
          && (H.deck || {}).roofs === undefined && !coveredRoof)
        say(v.id, 'record is silent on whether the covering reaches the tier roofs',
            'a recorded laid covering, a walkable tier roof cascade, and no roof plate '
            + 'draws in the deck shader');

      /* ── ⚠ A 'terraces' ANSWER THE DRAWING IGNORES (round 159). ────────────────────
         deck.roofs learned a third value: 'terraces' — the covering reaches the exposed
         tier terraces but NOT the top tier's roof, which stays coated plate (Azzam: the
         delivery-trials aerial reads white around the radome pedestals and the mast
         foot, the teak one level down on the ringing terraces; Research/AZZAM-PLATES.md
         plate 2). A record field the builder ignores is the r84 class, so the graph is
         checked in both directions: a covered crest is the word not honoured, and no
         covered terrace at all is the word read as false. */
      if ((H.deck || {}).roofs === 'terraces') {
        const plates = [];
        g.traverse(o => {
          if (!o.isMesh || !o.material || !o.geometry) return;
          const p = tagOf(o);
          if (!p || p.key !== 'superstructure' || o.geometry.type !== 'ShapeGeometry') return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          plates.push({
            covered: !!(o.material.isShaderMaterial && o.material.uniforms
                        && o.material.uniforms.uPlankW),
            y: o.geometry.boundingBox.max.y });
        });
        if (plates.length) {
          const top = plates.reduce((a, b) => (b.y > a.y ? b : a));
          if (top.covered)
            say(v.id, 'the crest roof wears the covering the record keeps off it',
                `deck.roofs is 'terraces' yet the topmost roof plate (y ${top.y.toFixed(2)}) `
                + 'draws in the deck shader');
          if (!plates.some(p2 => p2.covered))
            say(v.id, "a 'terraces' answer with no terrace drawn in the covering",
                `deck.roofs is 'terraces' yet none of ${plates.length} roof plates draws `
                + 'in the deck shader');
        }
      }
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
      const lowersA = (H.masts || []).map(mm => lowerOf(mm));
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
      const headM = mm => lowerOf(mm);
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

    /* ── THE HOISTING YARD RIDES A TIE OVER ITS OWN MASTHEAD (round 79) ────────────────
       Falconer 1780, read verbatim: the lower yards hang in JEERS ("an assemblage of
       tackles... one [block] fastened to the lower-mast-head, and the other to the middle
       of the yard"), and every yard above rides a TIE reeved through the sheave-hole in
       the head of its OWN mast section (his encornail). So the fall count is exact and
       the record says what it must be: two rope legs per hoisting yard — slings up to
       the head, head down to the rail — and NONE on a fixed yard (the crossjack, the
       doubled-rig course, the lower topsail, the lower topgallant). ropeMesh builds every
       leg as an 8-vertex prism, so legs = vertices / 8, an exact census like the yard
       gear's. The junk halyard is the same mechanism in Chinese dress: two legs over the
       sheave in the pole's head (Needham: "sheave pins passing through both masts"), and
       the sheave itself is drawn-vs-declared both ways like the karchesion. */
    {
      const legsOf = key => { let n = 0;
        g.traverse(o => { if (!o.isMesh) return; const p = tagOf(o);
          if (p && p.key === key) n += o.geometry.attributes.position.count; });
        return Math.round(n / 8); };
      const HOISTY = { top: 1, utop: 1, tg: 1, utg: 1, royal: 1 };
      const sq = (H.masts || []).filter(m => m.rig === 'square');
      const jmM = (H.masts || []).filter(m => m.rig === 'junk');
      if (sq.length || jmM.length) {
        let want = 0, nHoist = 0;
        for (const m of sq) {
          const tiers = m.only ? Math.min(m.only, 3) : 3;
          const nh = m.yards ? m.yards.filter(nm => HOISTY[nm]).length
                   : Math.max(1, tiers - 1);
          nHoist += nh; want += 2 * nh;
        }
        nHoist += jmM.length; want += 2 * jmM.length;
        const got = legsOf('halyard');
        if (got !== want)
          say(v.id, 'a hoisting yard without its tie',
              `${nHoist} hoisting yards want ${want} halyard legs (slings to the head, ` +
              `head to the rail), ${got} drawn — a count below the mark is a fall that ` +
              `misses its masthead, above it is a fall on a fixed yard`);
      }
      /* jeers: only the classic fidded rig sways its courses up in tackles — a mast with
         a `yards` list (the doubled rig) sits its lower yards on trusses, and the
         crossjack (the builder's mizzen) hung in standing slings on every rig.
         ⚠ the mizzen test replicates the builder's isMizzen (aftermost station, 3+
         masts, shorter than the main) — if this rule fires when the app looks right,
         check this test against hull.js's isMizzen FIRST, rule 8. */
      const vv = m => lowerOf(m);
      const seg3 = sq.filter(m => !m.yards && (m.only ? Math.min(m.only, 3) : 3) >= 2);
      let wantJ = 0;
      if (seg3.length && !H.iron) {
        const atMax = Math.max(...(H.masts || []).map(m => m.at));
        const mainH = Math.max(...(H.masts || []).map(vv));
        wantJ = seg3.filter(m => !((H.masts || []).length >= 3 && m.at === atMax
                                   && vv(m) < mainH * 0.95)).length;
      }
      const gotJ = part.jeers ? part.jeers.n : 0;
      if (gotJ < wantJ)
        say(v.id, 'a course without its jeers',
            `${wantJ} coursed mast(s) on a classic rig want jeer tackles at the lower ` +
            `masthead, ${gotJ} jeers mesh(es) drawn`);
      if (gotJ > wantJ)
        say(v.id, 'jeers out of their age',
            `${gotJ} jeers mesh(es) for ${wantJ} wanted — the doubled rig sits its ` +
            `lower yards on trusses, and the crossjack hangs in slings`);
      if (wantJ && gotJ === wantJ && legsOf('jeers') !== 4 * wantJ)
        say(v.id, 'jeers short of their tackle',
            `${legsOf('jeers')} jeer legs for ${wantJ} coursed mast(s) — each pair is ` +
            `four: block to slings and fall to the deck, both sides`);
      /* the junk masthead sheave, drawn-vs-declared both ways, and at the HEAD —
         one tagged GROUP per masthead, the karchesion's own counting rule */
      let nS = 0;
      g.traverse(o => { const p = o.userData && o.userData.part;
                        if (p && p.key === 'sheave' && !o.isMesh) nS++; });
      if (jmM.length && nS < jmM.length)
        say(v.id, 'a junk masthead with no sheave',
            `${nS} sheave groups for ${jmM.length} junk masts — the halyard leads over ` +
            `a sheave the pole does not carry`);
      if (!jmM.length && nS)
        say(v.id, 'a sheave out of its rig',
            `${nS} through-pole sheave(s) on a hull with no junk mast`);
      if (jmM.length && part.sheave) {
        const heads = jmM.map(vv);
        const hiJ = Math.max(...heads), loJ = Math.min(...heads);
        if (part.sheave.y[1] < deckY + hiJ * 0.85)
          say(v.id, 'a sheave adrift down the mast',
              `sheaves top at ${part.sheave.y[1].toFixed(1)} m against a ` +
              `~${hiJ.toFixed(0)} m masthead`);
        if (part.sheave.y[0] < deckY + loJ * 0.55)
          say(v.id, 'a sheave below the hounds',
              `sheave base at ${part.sheave.y[0].toFixed(1)} m on poles of ` +
              `${loJ.toFixed(0)}–${hiJ.toFixed(0)} m`);
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
      const lowersB = (H.masts || []).map(mm => lowerOf(mm));
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
          const lo = lowerOf(mm);
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

  /* ── AND A CAMPAIGN IS A COMPLETE RECORD (round 80). ───────────────────────────────────
     Staging Salamis meant tearing the Armada out of the code: fleets, formations, powder,
     the year and the board camera are battle DATA now, and the Action opens whatever
     campaign the data carries. Which means the data can now be wrong in ways the code used
     to make impossible — a fleet id no vessel answers to draws an EMPTY SEA with a working
     UI over it, the quietest possible failure. Every field the two consumers read is
     checked here, per battle, per fleet, per day. */
  {
    /* ⚠ bare APP, tested with typeof, same as the audit's own header: `const APP` is a
       global LEXICAL binding, so window.APP is undefined and a window-guarded read here
       silently skipped every data rule while the function-source rules still ran */
    const BATS = (typeof APP !== 'undefined' && APP.battles && APP.battles.battles) || [];
    const VS = (typeof APP !== 'undefined' && APP.vessels && APP.vessels.vessels) || [];
    for (const b of BATS) {
      if (!b.campaign) continue;
      const bid = 'battle-' + b.id;
      if (!Array.isArray(b.fleets) || b.fleets.length < 2)
        say(bid, 'a campaign without its two fleets',
            'the Action and the board need the two principals in battle.fleets[0] and [1]');
      else {
        /* the first two blocks are the PRINCIPALS — the gauge line names FL[0]/FL[1] by
           index — so neither may re-side itself; every block after them is an attachment
           (Lepanto's galleasses) and must say which side it fights on, or both views
           would guess from its index and stage it with the enemy */
        b.fleets.slice(0, 2).forEach((F, i) => {
          if (F.side !== undefined && F.side !== i)
            say(bid, 'a principal fleet on the wrong side',
                `fleets[${i}] ("${F.name}") declares side ${F.side} — the gauge names FL[0]/FL[1] by index`);
        });
        b.fleets.slice(2).forEach(F => {
          if (F.side !== 0 && F.side !== 1)
            say(bid, 'an attached fleet with no side',
                `"${F.name}": a third fleet block must declare side 0 or 1 explicitly`);
        });
      }
      if (typeof b.powder !== 'boolean')
        say(bid, 'a campaign without an armament record',
            'powder must be true or false — the gunfire path asks it, and absence is not an answer');
      if (typeof b.year !== 'number')
        say(bid, 'a campaign without a year', 'the date line is d.d + btYear(year)');
      if (!Array.isArray(b.cam) || b.cam.length !== 3 || !b.cam.every(isFinite))
        say(bid, 'a campaign without a board camera', 'cam is [lon, lat, altitude km]');
      for (const F of (b.fleets || [])) {
        const ves = VS.find(x => x.id === F.id);
        if (!ves || !ves.hull || !ves.polar)
          say(bid, 'a fleet no vessel answers to',
              `fleet "${F.name}" asks for vessel "${F.id}" — not in the vessel list with hull ` +
              'and polar, so the Action would draw an empty sea under a working UI');
        if (!(F.n >= 1) || !F.name || !/^[0-9a-f]{6}$/i.test(F.color || '') || !F.chip)
          say(bid, 'a fleet with a broken record',
              `"${F.id}": n ≥ 1, name, 6-digit color and chip are all required`);
        const fm = F.form || {};
        const formOk = fm.shape === 'crescent'
          ? [fm.front, fm.depth, fm.lead].every(isFinite)
          : fm.shape === 'ranks'
            ? [fm.front, fm.rows, fm.gap].every(isFinite) && fm.rows >= 1
            : false;
        if (!formOk)
          say(bid, 'a fleet with no formation',
              `"${F.id}": form.shape must be crescent (front/depth/lead) or ranks (front/rows/gap)`);
      }
      const C = b.campaign;
      if (C.length < 2)
        say(bid, 'a campaign of one day', 'the fleet heading is the track\'s own bearing, day to day');
      C.forEach((day, i) => {
        for (const k of ['lon', 'lat', 'elon', 'elat'])
          if (!isFinite(day[k])) say(bid, 'a campaign day off the map', `day ${i} ("${day.d}") ${k}`);
        if (!(day.rng > 0)) say(bid, 'a campaign day without a range', `day ${i} ("${day.d}")`);
        if (!(day.w >= 0 && day.w <= 360) || !(day.f >= 0 && day.f <= 12))
          say(bid, 'a campaign day with impossible weather',
              `day ${i} ("${day.d}") w=${day.w} f=${day.f}`);
        if (!day.d || !day.t) say(bid, 'a campaign day with no record', `day ${i}`);
        if (day.a !== undefined && day.a !== true)
          say(bid, 'an action flag that is not a flag', `day ${i} ("${day.d}") a=${day.a}`);
        if (day.hd !== undefined && !(day.hd >= 0 && day.hd <= 360))
          say(bid, 'a day with an impossible facing',
              `day ${i} ("${day.d}") hd=${day.hd} — an authored fleet heading is a compass bearing`);
        /* the tidal stream is a VECTOR of the record (round 158, Myeongnyang): a day that
           states a rate must state a set and vice versa, or the Action would advect every
           hull in a direction nobody wrote down */
        if (day.ck !== undefined || day.cs !== undefined)
          if (!(day.ck >= 0 && day.ck <= 15) || !(day.cs >= 0 && day.cs <= 360))
            say(bid, 'a stream that is not a vector',
                `day ${i} ("${day.d}") cs=${day.cs} ck=${day.ck} — a tidal stream is a set ` +
                '(degrees toward, 0-360) and a rate (knots), both or neither');
        /* the anchor is the record's own fact (the diary's "dropped anchor"), and it names
           WHICH fleet lies to it by side — an anchor that names no fleet holds nothing */
        if (day.anc !== undefined
            && (!Array.isArray(day.anc) || !day.anc.length
                || !day.anc.every(a => a === 0 || a === 1)))
          say(bid, 'an anchor that names no fleet',
              `day ${i} ("${day.d}") anc=${JSON.stringify(day.anc)} — anc lists the sides (0/1) lying to anchors`);
      });

      /* ── A SHORE IS A CHECKED FACT (round 83). ─────────────────────────────────────────
         A battle may carry a DEM patch (`shore`) and the Action stages the real coast from
         it — which opens three new ways to be wrong: a mirrored or misplaced patch (the
         chirality class psgFrame warns about, now visible the moment land exists), a fleet
         staged on dry land (Salamis day 5 was 44 m up a hillside before round 83 re-laid
         the anchors), and a patch that silently fails to load, staging the strait on open
         ocean under a working UI. The record carries named probes — points that must be
         land and points that must be water — so the data can convict its own placement. */
      if (b.shore) {
        const sh = b.shore;
        if (!sh.src || ![sh.lon0, sh.lat0, sh.lon1, sh.lat1].every(isFinite)
            || !(sh.lon1 > sh.lon0) || !(sh.lat1 > sh.lat0))
          say(bid, 'a shore without bounds', 'shore needs src and lon0<lon1, lat0<lat1');
        const pr = sh.probes || [];
        if (!pr.some(p => p.land === true) || !pr.some(p => p.land === false))
          say(bid, 'a shore without witnesses',
              'probes must name at least one point that is land and one that is water — ' +
              'a mirrored patch passes any test that only asks one side');
        for (const p of pr)
          if (!isFinite(p.lon) || !isFinite(p.lat) || typeof p.land !== 'boolean'
              || p.lon <= sh.lon0 || p.lon >= sh.lon1 || p.lat <= sh.lat0 || p.lat >= sh.lat1)
            say(bid, 'a probe off its own patch', `"${p.n}"`);
        if (typeof SHIPS_BT === 'undefined' || typeof SHIPS_BT.btShoreElev !== 'function'
            || typeof SHIPS_BT.btShoreLoad !== 'function')
          say(bid, 'a shore the Action cannot sample',
              'SHIPS_BT.btShoreElev / btShoreLoad missing');
        /* the shore's dress is data too (round 85): `veg` must name a palette the app
           actually has, or the coast silently wears another climate's colours — which is
           exactly how the Gravelines chalk shipped dressed in Attic phrygana in r84 */
        if (typeof SHIPS_BT !== 'undefined' && SHIPS_BT.SHORE_PALS
            && !SHIPS_BT.SHORE_PALS[sh.veg])
          say(bid, 'a shore in another climate\'s clothes',
              `shore.veg "${sh.veg}" names no palette in SHORE_PALS — ` +
              `known: ${Object.keys(SHIPS_BT.SHORE_PALS).join(', ')}`);
        /* ── THE WITNESSES TESTIFY, ALWAYS (round 84). ─────────────────────────────────
           The round-83 version ran the probes only "with the grid loaded", and in a
           standard audit run the Action has no battle open — so the probes had never
           once fired, and the audit said pass over a CPU grid whose decode was 255x off
           (the GLSL normalized-channel formula applied to raw bytes: every point on
           Earth read as +2.8 million metres of land, the grounding rule inert, the live
           helm refusing every step). A conditional check that cannot run in the standard
           pass is a green light wired to nothing. The audit now drives the app's own
           loader — the same fetch, the same decode, the same grid the grounding reads —
           and the witnesses speak in every audit, on every battle that carries a shore. */
        else {
          const B = SHIPS_BT.BT;
          if (!B.shoreGrid || B.shoreFor !== b.id) {
            try { SHIPS_BT.btShoreLoad(b); } catch (e) { /* judged by the grid below */ }
            for (let w = 0; w < 200 && !B.shoreReady; w++)
              await new Promise(r => setTimeout(r, 50));
          }
          if (!B.shoreGrid || B.shoreFor !== b.id)
            say(bid, 'a shore that did not load',
                `${sh.src} — no grid after btShoreLoad (staging the strait on open ocean)`);
          else {
            for (const p of pr) {
              const el = SHIPS_BT.btShoreElev(p.lon, p.lat);
              if (p.land !== (el > 0))
                say(bid, 'a shore that contradicts its witnesses',
                    `"${p.n}" (${p.lon}, ${p.lat}) reads ${el.toFixed(1)} m but must be ${p.land ? 'land' : 'water'} — ` +
                    'mirrored, misplaced or misdecoded patch');
            }
            /* every campaign day must anchor in validated water: Salamis day 5 was 44 m
               up a hillside before round 83, and the Gravelines wiring repeated the class
               on day 8 within the hour. Outside the patch btShoreElev is -30, open sea. */
            (b.campaign || []).forEach((d, i) => {
              const el = SHIPS_BT.btShoreElev(d.lon, d.lat);
              if (el > -2.0)
                say(bid, 'a campaign day anchored on dry land',
                    `day ${i} ("${d.d}") at (${d.lon}, ${d.lat}) reads ${el.toFixed(1)} m`);
            });
          }
          /* and every staged ship floats — only when the Action itself has THIS battle
             open, so a grid the audit loaded is never paired with another battle's ships */
          if (B.spec && B.spec.id === b.id && B.shoreFor === b.id && B.shoreGrid) {
            for (const s of B.ships) {
              const el = SHIPS_BT.btElevLocal(s.x, s.z);
              if (el > 0)
                say(bid, 'a ship on dry land',
                    `side ${s.side} at local (${s.x.toFixed(0)}, ${s.z.toFixed(0)}) sits on ${el.toFixed(1)} m of ground`);
            }
          }
        }
        if (typeof SHIPS_BT !== 'undefined' && SHIPS_BT.btFrame
            && !/btElevLocal/.test(String(SHIPS_BT.btFrame)))
          say(bid, 'a helm that ignores the shore',
              'btFrame no longer refuses a grounding step — ships will sail up the hillsides');
      }
    }

    /* the gunfire path must ask the RECORD. The old test was a regex over the day's prose
       that fired on "A day of no action" — 5 Aug drew broadsides for as long as the Action
       existed. The regex must stay dead and the record must be what the frame reads. */
    if (window.SHIPS_BT) {
      const src = String(SHIPS_BT.btFrame);
      if (/GRAVELINES/.test(src))
        say('battle', 'gunfire by regex again',
            'btFrame matches the day\'s prose for GRAVELINES — the a flag and powder are the record');
      if (!/\.a\b/.test(src) || !/powder/.test(src))
        say('battle', 'gunfire not asking the record',
            'btFrame must gate its broadsides on the day\'s a flag and the battle\'s powder field');
      /* one formation implementation, drawn by both views */
      if (typeof SHIPS_BT.formStation !== 'function')
        say('battle', 'the formation model unreachable',
            'SHIPS_BT.formStation is the one implementation both views draw');
      if (typeof startCampaign === 'function' && !/formStation/.test(String(startCampaign)))
        say('battle', 'the board keeps its own formation',
            'startCampaign no longer draws SHIPS_BT.formStation — two shapes for one fleet');
      /* years BC label as years BC */
      if (typeof SHIPS_BT.btYear !== 'function' || SHIPS_BT.btYear(-480) !== '480 BC'
          || SHIPS_BT.btYear(1588) !== '1588')
        say('battle', 'a year that cannot go BC',
            'btYear(-480) must read "480 BC" — Salamis is dated like the vessels are');
      /* the stream must be a FORCE, not a caption (round 158): if any staged day carries
         a tidal rate, btFrame must advect through it, and if any day states the anchor
         fact, btFrame must honour it — else Myeongnyang's tide is prose over still water */
      const src158 = String(SHIPS_BT.btFrame);
      if (BATS.some(b => (b.campaign || []).some(dd => dd.ck !== undefined))
          && !/curMs/.test(src158))
        say('battle', 'a helm that ignores the stream',
            'a campaign day carries a tidal rate (ck) but btFrame never reads BT.curMs — the tide would be a caption, not a force');
      if (BATS.some(b => (b.campaign || []).some(dd => dd.anc !== undefined))
          && !/anchored|\.anc\b/.test(src158))
        say('battle', 'an anchor the helm never feels',
            'a campaign day states the anchor fact (anc) but btFrame never reads it — the anchored fleet would drift on the stream its cable holds');
    }

    /* the BOARD must survive a step of every campaign. No baseline frame can name the
       globe's campaign board, and that blindness hid a nine-day total failure: the
       tangentBasis refactor (2026-08-02) deleted the `side` vector its own heel still
       read, so stepCampaign threw on its first frame and the render loop died whenever
       any campaign was opened from the globe. Opening and stepping each campaign here is
       the cheapest watch that class gets. */
    if (typeof startCampaign === 'function' && typeof stepCampaign === 'function'
        && typeof clearCampaign === 'function') {
      for (const b of BATS) {
        if (!b.campaign || !b.fleets) continue;
        try {
          startCampaign(b);
          stepCampaign(0.001);
        } catch (e) {
          say('battle-' + b.id, 'a board that cannot draw its campaign',
              'startCampaign/stepCampaign threw: ' + e.message);
        } finally {
          try { clearCampaign(); } catch (e) { /* already said */ }
        }
      }
    }
  }

  /* ══ THE ROUTER'S SHORELINE IS THE RENDERER'S (round 123) ═══════════════════════════════
     buildEraFleet used to take its routing datum from mat.uniforms.uSeaLevel — which onTime
     writes AFTER buildEraFleet runs, so the router was always one state behind the picture.
     At a frozen #e=0 boot the uniform still held 0: the first sea crossings were routed on
     the MODERN coastline while the shader drew the shore 68 m lower, and the crossing to
     Sahul — the voyage this project exists for — was drawn paddling 200 km of exposed shelf,
     a near-black field of moonlit dry land in the close-up. route.js's own comment declared
     this class fixed; the fix read the wrong clock, and nothing was watching the agreement.

     Two arms, driven per era through the app's own selectEra and fleet queue:
       1. FINE.datum must equal the era's own seaLevelAt(S.year), quantised the way the
          router quantises it. Anything else means every track in the era was planned on a
          coastline the viewer is not being shown.
       2. Every assembled track must lie in water on the fine array — sampled at the points
          the fleet actually slerps between, plus midpoints. This also convicts the router's
          stated give-up path (an unroutable leg falls back to its raw waypoints and draws
          the shortcut across whatever is in the way). The conviction line is the raster's
          own resolution: samples run ~2 km apart, a texel is 4.9 km, so TWO consecutive
          ashore samples mean the ship crosses a full texel of land — a fact the field can
          state. One isolated ashore sample is a corner clip below the texel, which the
          field cannot resolve into a coastline; those are counted and reported in the
          detail of any conviction but do not convict alone (measured r123: 23 tracks carry
          exactly one, at Cape Horn, the Hanish Islands, Mindoro and the like, every one at
          a strait or headland the 4.9 km raster pinches shut). */
  if (typeof selectEra === 'function' && typeof seaLevelAt === 'function'
      && window.SHIPS_ROUTE && typeof S !== 'undefined' && typeof eraTracks !== 'undefined'
      && APP.chapters && APP.voyages) {
    const RT = window.SHIPS_ROUTE;
    const eraHome = S.era;
    const chs = APP.chapters.chapters || [];
    const drain = async () => {
      for (let w = 0; w < 2000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
        try { if (typeof pumpFleetQueue === 'function') pumpFleetQueue(24); } catch (e) { break; }
        await new Promise(r => setTimeout(r, 0));
      }
    };
    for (let e = 0; e < chs.length; e++) {
      try { selectEra(e); } catch (err) {
        say('era-' + e, 'an era that cannot build its fleet', 'selectEra threw: ' + err.message);
        continue;
      }
      await drain();
      const want = Math.round((seaLevelAt(S.year) || 0) / 5) * 5;
      if (RT.FINE.ready && RT.FINE.datum !== want)
        say('era-' + e, 'the router and the renderer hold two shorelines',
            `FINE.datum ${RT.FINE.datum} m against seaLevelAt(${S.year}) = ${want} m — `
            + 'every track in this era was planned on a coastline the viewer is not shown');
      for (const tr of eraTracks) {
        const legs = tr.legs || [];
        let ashore = 0, total = 0, run = 0, maxRun = 0, at = null;
        const test = (lon, lat) => {
          total++;
          if (!RT.fineIsWater(lon, lat)) {
            ashore++; run++; if (run > maxRun) maxRun = run;
            if (!at) at = [lon, lat];
          } else run = 0;
        };
        for (let i = 0; i < legs.length; i++) {
          test(legs[i].lon, legs[i].lat);
          if (i < legs.length - 1) {
            /* midpoint, with the antimeridian unwrapped — a Pacific track's midpoint is
               not in Africa */
            const b = legs[i + 1], dl = ((b.lon - legs[i].lon + 540) % 360) - 180;
            test(legs[i].lon + dl / 2, (legs[i].lat + b.lat) / 2);
          }
        }
        if (maxRun >= 2)
          say(tr.name || tr.vesselId, 'a voyage drawn on the model\'s own land',
              `era ${e}: ${ashore} of ${total} track samples ashore at the era's own sea `
              + `level, longest run ${maxRun}`
              + (at ? `, first at (${at[0].toFixed(2)}, ${at[1].toFixed(2)})` : ''));

        /* ══ THE CARD CONFESSES THE ROUTER'S GIVE-UP (round 125) ═══════════════════════
           seaPath's unroutable legs and clearSegments' uncleared stretches ride on the
           track as tr.give, and rule 10 says a fallback the UI does not label is not a
           legitimate return. Checked in both directions against the card the viewer
           actually opens: a track carrying a give-up must show the 'Route fallback' row,
           and a clean track must not — a caveat printed on every card indicts nothing. */
        if (typeof showVoyageCard === 'function' && document.getElementById('cRows')) {
          const vv = ((APP.voyages.voyages || APP.voyages) || [])
            .find(x => x.name === tr.name);
          if (vv) {
            try {
              showVoyageCard(vv);
              const rowsTxt = document.getElementById('cRows').textContent || '';
              const has = rowsTxt.indexOf('Route fallback') >= 0;
              const need = !!(tr.give && (tr.give.legs || tr.give.unfixed || tr.give.ashore));
              if (need && !has)
                say(tr.name, 'a give-up the card does not confess',
                    `era ${e}: the track carries give ${JSON.stringify(tr.give)} and the `
                    + 'voyage card shows no Route fallback row');
              if (!need && has)
                say(tr.name, 'a caveat on a clean track',
                    `era ${e}: the card shows a Route fallback row but the track's own `
                    + 'ledger is clean');
            } catch (err) {
              say(tr.name, 'a voyage card that cannot open',
                  'showVoyageCard threw: ' + err.message);
            }
          }
        }
      }
    }
    try { selectEra(eraHome); await drain(); } catch (e) { /* state restore only */ }
  }

  /* ══ THE READOUT'S GAZETTEER SPEAKS ONLY IN ITS OWN TIME (round 124) ═══════════════════
     r123's close-up of the Sahul crossing read "Nearest land: Ujung Pandang · 2 nm SE" —
     the number was the land scan's answer about the shelf, the name was the port nearest
     THE SHIP, 528 nm away on a coast the scan never looked at and forty millennia before
     the city. The fix names land from the port nearest the FOUND coast, gated by
     portExistsAt. This rule does not trust the gate: it drives the real fillLandRow at the
     sahul track's own open-water waypoint in era 0 and convicts if the cell contains ANY
     name from the gazetteer — at 60,000 BP none existed, a fact of the record that needs
     no predicate — or if the printed range states a distance finer than the fine raster's
     own texel without saying "under". */
  if (typeof fillLandRow === 'function' && typeof selectEra === 'function'
      && window.SHIPS_ROUTE && APP.ports && APP.chapters) {
    const RT = window.SHIPS_ROUTE;
    const eraHome2 = S.era;
    const drain2 = async () => {
      for (let w = 0; w < 2000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
        try { if (typeof pumpFleetQueue === 'function') pumpFleetQueue(24); } catch (e) { break; }
        await new Promise(r => setTimeout(r, 0));
      }
    };
    try {
      selectEra(0); await drain2();
      const cell = document.createElement('div');
      cell.innerHTML = '<table><tr><td class="pc-land">—</td></tr></table>';
      if (typeof PSGV !== 'undefined') PSGV.landKey = undefined;
      fillLandRow(cell, { at: { lon: 126.4, lat: -10.1 } });
      const txt = cell.querySelector('.pc-land').textContent;
      for (const p of (APP.ports.ports || []))
        if (p.name && txt.includes(p.name))
          say('passage-readout', 'a gazetteer that names a place out of its own time',
              `era 0, year ${S.year}: the land row reads "${txt}" — "${p.name}" is a port `
              + 'of the modern record naming a coast sixty millennia before any port existed');
      const m = txt.match(/^(\d+) nm/);
      if (m && RT.FINE && RT.FINE.ready) {
        const texNm = 40075 / RT.FINE.w * Math.cos(-10.1 * Math.PI / 180) / 1.852;
        if (+m[1] < texNm)
          say('passage-readout', 'a distance the field cannot state',
              `the land row reads "${txt}" but the fine raster's texel here is `
              + `${texNm.toFixed(1)} nm — sub-texel ranges must say "under"`);
      }
    } catch (e) {
      say('passage-readout', 'a land row that cannot be asked', 'fillLandRow threw: ' + e.message);
    }
    try { selectEra(eraHome2); await drain2(); } catch (e) { /* state restore only */ }
  }
  return { problems, checked: rows.length, rows };
})()
