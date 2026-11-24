"""r302 (0y127): compose the sailing hulls' stage cards from the parts each stage adds, and give
every hull a keel card at stage 0. Every replace is asserted."""
import sys
P = sys.argv[1]
s = open(P).read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)

rep("""const STAGE_NAMES = [
  ['Keel laid', 'One timber, stem to sternpost. Everything is measured from it.'],
  ['Frames raised', 'The ribs go up on the keel. In a carvel ship the shape is now decided.'],
  ['Planked', 'The skin goes on. Carvel: edge to edge, caulked. Clinker: overlapped, riveted.'],
  ['Decked', 'The deck ties the sides together and carries the guns. Rudder hung aft.'],
  ['Masts stepped', 'Lower mast, topmast, topgallant — each fidded through the doubling.'],
  ['Rigged', 'Shrouds take the sideways pull; ratlines make them a ladder aloft.'],
  ['Yards crossed', 'The spars the square sails hang from, braced round to trim to the wind.'],
  ['Bent on', 'Canvas. She can now be driven by the wind rather than carried by it.'],
];
""", """/* ⚠ r302 (0y¹²⁷): there was a fixed list of eight stage cards here, shown on every hull that sets
   sail. Stage 3 told the junk, the clipper and every merchantman that the deck "carries the guns",
   and told the trireme, the corbita and the dhow, which steer with quarter rudders, "Rudder hung
   aft". Stage 4 told every lateen, gaff, junk and crab-claw rig "Lower mast, topmast, topgallant —
   each fidded through the doubling", though their masts are single poles. The cards are composed
   now, by swSailCard below, from the parts the stage adds and the masts the record carries. */
""")

rep("""/* the one dispatch: the page and the audit both ask this which card a stage shows */
function swStageCard(spec, stage, parts) {
  return swHullSetsSail(spec.hull || {}) ? STAGE_NAMES[stage] : swPowerCard(spec, stage, parts);
}""", r"""/* ── THE SAILING CARDS ARE COMPOSED TOO (r302, 0y¹²⁷) ─────────────────────────────────
   Same method as the powered cards: each card is built from the parts the stage adds to THIS
   hull (userData.part, plus userData.seg's mast and piece index on a mast mesh) and from her
   recorded masts (rig and station). A card says "guns" only where the stage adds a gun, "quarter
   rudders" only where it adds them, "fidded" only on a mast built in more than one piece, and
   "braces" only where braces are rove. */
const SAIL_SKIP = new Set(['deck', 'rail', 'waterway', 'islandRail', 'stair', 'cheek', 'top',
                           'mast', 'shroud', 'stay', 'ratline', 'yard', 'sail']);
const SAIL_PHRASE = {
  gun: 'guns', anchor: 'anchors', grapnel: 'a grapnel anchor', ironAnchors: 'four-claw iron anchors',
  stoneAnchor: 'a stone anchor', woodAnchor: 'a wooden anchor weighted with a stone',
  yotsumeAnchor: 'a four-claw iron anchor (yotsume-ikari)', capstan: 'a capstan',
  windlass: 'a windlass', cathead: 'catheads', boat: 'boats', grating: 'hatch gratings',
  gallery: 'quarter galleries', sternlight: 'stern lanterns', taffrail: 'a taffrail',
  apostis: 'the rowing frame (apostis) the oars work from', arrumbada: 'a bow fighting platform (arrumbada)',
  spur: 'a beak spur', fortress: 'a bow fortress', platform: 'a deck platform',
  bulwarkStanchion: 'bulwark stanchions', fifeRail: 'fife rails', pinRail: 'pin rails',
  superstructure: 'a superstructure', bridge: 'a bridge', boatDeck: 'a boat deck',
  bench: 'rowing benches', bowsprit: 'a bowsprit', head: 'a head and beakhead',
  oar: 'oars', paddle: 'paddle wheels', paddlebox: 'paddle boxes', sheave: 'masthead sheaves',
  vent: 'cowl ventilators', woolding: 'wooldings round the lower masts', cross: 'a cross at the truck',
  karchesion: 'a masthead cage (karchesion)', corbis: 'the corbis',
  deadeye: 'deadeyes and lanyards', channel: 'channels outside the hull',
  channelWale: 'channel wales', tackle: 'shroud tackles', shroudEye: 'rope collars on the masts',
  shroudLashing: 'shroud lashings', deckhouse: 'a deckhouse', helm: 'a steering wheel',
  compassPlatform: 'a compass platform', tower: null, gundeck: null, sangjang: null,
  block: 'blocks', brace: 'braces', buntline: 'buntlines', clewline: 'clewlines', coil: 'rope coils',
  halyard: 'halyards', jeers: 'jeers', lift: 'lifts', parrel: 'parrels', sheet: 'sheets',
  tack: 'tacks', peakHalyard: 'peak halyards', throatHalyard: 'throat halyards',
  toppingLift: 'topping lifts', truss: 'trusses', mastheadBlock: 'masthead blocks',
  mastheadHorn: 'masthead horns', yardLashing: 'yard lashings', reefPoint: 'reef points',
  canopy: 'a stern awning', rudder: 'a rudder hung at the stern',
};
const SAIL_NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const swNum = n => SAIL_NUM[n] || String(n);
const swCap = t => t.charAt(0).toUpperCase() + t.slice(1);
function swAnd(list) {
  return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : (list[0] || '');
}
/* which masts a group is, counted from forward: "each of her three masts", "the foremost",
   "the aftermost two", "the second and third from forward" */
function swMastGroup(idx, n) {
  if (idx.length === n) return n === 1 ? 'her mast' : n === 2 ? 'both masts' : 'all ' + swNum(n) + ' masts';
  const pre = idx.every((m, i) => m === i), suf = idx.every((m, i) => m === n - idx.length + i);
  if (pre) return idx.length === 1 ? 'the foremost mast' : 'the forward ' + swNum(idx.length);
  if (suf) return idx.length === 1 ? 'the aftermost mast' : 'the aftermost ' + swNum(idx.length);
  const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  return 'the ' + swAnd(idx.map(i => ord[i])) + ' from forward';
}
const SAIL_RIG = {
  square: ['square sails', 'square sails'], lateen: ['a lateen sail', 'lateen sails'],
  gaff: ['a gaff sail', 'gaff sails'], junk: ['a battened lug sail', 'battened lug sails'],
  crabclaw: ['a crab-claw sail', 'crab-claw sails'],
};
function swSailCard(spec, stage, parts) {
  const H = spec.hull || {};
  const masts = (H.masts || []).map((m, i) => ({ m, i })).sort((a, b) => (a.m.at || 0) - (b.m.at || 0));
  const n = masts.length;
  const order = {};                       // record index -> position from forward
  masts.forEach((e, k) => { order[e.i] = k; });
  const keys = [], names = {};
  for (const p of parts) {
    if (!names[p.key]) { names[p.key] = new Set(); keys.push(p.key); }
    names[p.key].add(p.name);
  }
  const has = k => !!names[k];
  const nameList = k => [...names[k]].map(t => t.toLowerCase());
  const phrase = k => {
    if (k === 'quarterRudder') {
      const q = names[k].size;
      return q > 1 ? swNum(q) + ' quarter rudders, one on each side aft' : 'a quarter rudder';
    }
    if (k === 'crossbeam') return [...names[k]].some(t => /through-beam/i.test(t))
      ? 'through-beams with their knees and carlings' : 'crossbeams';
    if (k === 'funnel') return (H.funnels || 1) > 1 ? swNum(H.funnels) + ' funnels' : 'a funnel';
    if (['forecast', 'castle', 'castles', 'poop', 'mastband', 'stowage', 'tower', 'gundeck', 'sangjang'].includes(k))
      return swAnd(nameList(k));
    if (k in SAIL_PHRASE && SAIL_PHRASE[k]) return SAIL_PHRASE[k];
    return [...names[k]][0].toLowerCase();
  };
  const extras = (skip) => {
    const l = keys.filter(k => !SAIL_SKIP.has(k) && !(skip || []).includes(k)).map(phrase);
    return [...new Set(l)];
  };

  if (stage === 3) {
    const open = [...(names.deck || [])].filter(t => /^Open hull/.test(t)).length;
    let t = open ? (open > 1 ? 'Her ' + swNum(open) + ' hulls are left open, with no deck laid.'
                             : 'Her hull is left open, with no deck laid.')
                 : 'The deck is laid, and its beams tie the two sides together.';
    const l = extras();
    if (l.length) t += ' Added at this stage: ' + swAnd(l) + '.';
    return [open ? 'Hull closed' : 'Decked', t];
  }

  if (stage === 4) {
    /* pieces per mast, read off the mast meshes' own segment index */
    const pieces = masts.map(() => 1);
    for (const p of parts) if (p.key === 'mast' && p.mi !== undefined && order[p.mi] !== undefined)
      pieces[order[p.mi]] = Math.max(pieces[order[p.mi]], (p.si || 0) + 1);
    const tube = (H.build === 'steel' || H.build === 'iron') && (H.year || 0) >= 1890;
    const PIECES = {
      1: ['is a single pole', 'are single poles'],
      2: ['is built in two pieces, lower mast and topmast', 'are each built in two pieces, lower mast and topmast'],
      3: tube ? ['is a steel tube, lower mast and topmast in one piece, with a topgallant mast above it',
                 'are steel tubes, lower mast and topmast in one piece, with a topgallant mast above each']
              : ['is built in three pieces, lower mast, topmast and topgallant mast',
                 'are each built in three pieces, lower mast, topmast and topgallant mast'],
      4: ['is built in four pieces, lower mast, topmast, topgallant and royal mast',
          'are each built in four pieces, lower mast, topmast, topgallant and royal mast'],
    };
    let t = n === 1 ? 'Her mast is stepped.' : swCap(swNum(n)) + ' masts are stepped.';
    const groups = [];
    pieces.forEach((pc, k) => {
      const g = groups.find(x => x.pc === pc);
      if (g) g.idx.push(k); else groups.push({ pc, idx: [k] });
    });
    const clauses = groups.map(g => {
      const who = swMastGroup(g.idx, n);
      const pl = g.idx.length > 1 ? 1 : 0;
      const what = (PIECES[Math.min(g.pc, 4)] || PIECES[1])[pl];
      return (who === 'her mast' ? 'It' : who === 'both masts' || /^all /.test(who) ? swCap(who.replace(/^all /, 'All ')) : swCap(who)) + ' ' + what;
    });
    if (n) t += ' ' + clauses.join('; ') + '.';
    if (pieces.some(pc => pc > 1))
      t += ' Each piece above the lowest stands in the doubling at the head of the one below, '
         + 'held up by an iron fid through its heel, so it can be lowered to the deck.';
    const l = extras();
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';
    return ['Masts stepped', t];
  }

  if (stage === 5) {
    const shr = has('shroud'), stay = has('stay');
    let t;
    const mm = n === 1 ? 'the mast' : 'each mast';
    if (shr) {
      t = 'Shrouds run from ' + (n === 1 ? 'the masthead' : 'each masthead') + ' down to the ship\'s sides '
        + 'and hold ' + mm + ' against the sideways pull of the sail.';
      if (stay) t += ' Stays hold ' + (n === 1 ? 'it' : 'them') + ' fore and aft.';
      if (has('ratline')) t += ' Ratlines across the shrouds make a ladder for the crew to climb aloft.';
    } else if (stay) {
      t = 'Stays hold ' + mm + ' fore and aft. She carries no shrouds.';
    } else {
      t = 'Her masts stand without shrouds or stays.';
    }
    const l = extras();
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';
    return [shr || stay ? 'Rigged' : 'No standing rigging', t];
  }

  if (stage === 6) {
    const rigs = new Set(masts.map(e => e.m.rig));
    const yn = [...(names.yard || [])];
    const count = nm => parts.filter(p => p.key === 'yard' && p.name === nm).length;
    const bits = [];
    if (rigs.has('square')) {
      const ny = count('Yard');
      bits.push(swCap(swNum(ny)) + ' yard' + (ny === 1 ? ' is' : 's are') + ' crossed on the square-rigged mast'
                + (masts.filter(e => e.m.rig === 'square').length > 1 ? 's' : '') + '; the square sails hang from them.'
                + (has('brace') ? ' Braces at the yardarms swing the yards round to trim the sails to the wind.' : ''));
    }
    if (rigs.has('lateen')) {
      const nl = masts.filter(e => e.m.rig === 'lateen').length;
      bits.push((nl === 1 ? 'The lateen mast gets one long yard' : 'Each lateen mast gets one long yard')
                + ', slung slantwise across it; the sail is laced along the yard.');
    }
    if (rigs.has('gaff')) {
      const ng = count('Gaff'), nb = count('Boom');
      bits.push(swCap(swNum(ng)) + ' gaff' + (ng === 1 ? '' : 's') + ' and ' + swNum(nb) + ' boom' + (nb === 1 ? '' : 's')
                + ' go up: a gaff holds the head of a fore-and-aft sail and a boom its foot.');
    }
    if (rigs.has('junk')) {
      const nbat = yn.filter(x => /^Batten/.test(x)).length;
      bits.push('Each mast gets a yard for the head of its sail, a boom for the foot and '
                + swNum(nbat) + ' battens between them. The battens hold the sail flat, and it is '
                + 'reefed by lowering it a panel at a time onto the boom.');
    }
    if (rigs.has('crabclaw'))
      bits.push('Each mast gets the two spars of a crab-claw sail, a yard and a boom.');
    const l = extras();
    let t = bits.join(' ');
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';
    const title = rigs.has('square') ? 'Yards crossed'
                : rigs.has('gaff') && rigs.size === 1 ? 'Gaffs and booms' : 'Spars hung';
    return [title, t];
  }

  if (stage === 7) {
    const byRig = [];
    masts.forEach((e, k) => {
      const g = byRig.find(x => x.rig === e.m.rig);
      if (g) g.idx.push(k); else byRig.push({ rig: e.m.rig, idx: [k] });
    });
    const parts7 = byRig.filter(g => SAIL_RIG[g.rig]).map(g => {
      const who = swMastGroup(g.idx, n);
      const one = g.idx.length === 1 && g.rig !== 'square';
      const w = SAIL_RIG[g.rig][one ? 0 : 1];
      if (who === 'her mast') return w + ' on her mast';
      if (who === 'both masts' || /^all /.test(who)) return w + ' on ' + who;
      return w + ' on ' + who;
    });
    if (H.headsails) parts7.push(H.headsails === 1 ? 'a headsail on a stay forward'
                                                   : swNum(H.headsails) + ' headsails on the stays forward');
    let t = 'The sails are bent on: ' + swAnd(parts7) + '.';
    const l = extras();
    if (l.length) t += ' Also added: ' + swAnd(l) + '.';
    return ['Bent on', t];
  }
  return null;
}
/* stage 0 is the keel, on every hull. ⚠ r302: r301's powered composer answered any stage
   under 3 with its last card, so Titanic's keel-laid stage read "Afloat" and her machinery. */
function swKeelCard(spec) {
  const H = spec.hull || {};
  if (H.build === 'steel' || H.build === 'iron')
    return ['Keel laid', 'The keel goes down first: a line of heavy ' + H.build + ' plates along '
                       + 'the bottom on the centreline, with the stem and sternpost at its ends. '
                       + 'Every frame is set out from it.'];
  return ['Keel laid', 'One timber, stem to sternpost. Every frame is set out from it.'];
}
/* the one dispatch: the page and the audit both ask this which card a stage shows */
function swStageCard(spec, stage, parts) {
  if (stage === 0) return swKeelCard(spec);
  return swHullSetsSail(spec.hull || {}) ? swSailCard(spec, stage, parts || [])
                                         : swPowerCard(spec, stage, parts || []);
}""")

rep("""  const engine = !swHullSetsSail(SW.spec.hull);
  let addedHere = [];
  if (engine && SW.stage >= 3) SW.ship.traverse(o => {
    const p = o.userData && o.userData.part;
    if (p && p.stage === SW.stage) addedHere.push({ key: p.key, name: p.name });
  });""", """  const engine = !swHullSetsSail(SW.spec.hull);
  /* the parts this stage adds, for the composed cards; a mast mesh carries which mast and
     which piece it is (userData.seg), so the stage-4 card can say how each mast is built */
  let addedHere = [];
  if (SW.stage >= 3) SW.ship.traverse(o => {
    const p = o.userData && o.userData.part;
    if (p && p.stage === SW.stage) {
      const sg = o.userData.seg;
      addedHere.push(sg ? { key: p.key, name: p.name, mi: sg.mi, si: sg.si } : { key: p.key, name: p.name });
    }
  });""")

rep("""    nm = ['Bent on, furled', 'The canvas is bent to its spars and stowed: square sails rolled '
                           + 'on their yards in harbour gaskets with the bunt gathered at the '
                           + 'slings, gaff sails lowered onto their booms, a junk\\'s battens '
                           + 'dropped into their stack. This is how a ship spends most of her '
                           + 'life — canvas wears out in use, and it was set only when she '
                           + 'was going somewhere.'];""", """    nm = swFurledCard(SW.spec);""")

rep("""function swApplyStage() {""", """/* the furled card names only the rigs this hull carries (r302): it used to tell every
   sailing hull about square sails, gaff sails and a junk's battens at once */
function swFurledCard(spec) {
  const rigs = new Set(((spec.hull || {}).masts || []).map(m => m.rig));
  const how = [];
  if (rigs.has('square')) how.push('the square sails are rolled up on their yards and tied with gaskets');
  if (rigs.has('lateen')) how.push('each lateen yard is lowered and its sail furled along it');
  if (rigs.has('gaff')) how.push('the gaff sails are lowered onto their booms');
  if (rigs.has('junk')) how.push('the battened sails are lowered and folded down onto their booms');
  if (rigs.has('crabclaw')) how.push('the crab-claw sails are rolled round their spars');
  if ((spec.hull || {}).headsails) how.push('the headsails are hauled down onto their stays');
  return ['Bent on, furled', 'The sails are bent to their spars and stowed: ' + swAnd(how)
                           + '. This is how she lay in harbour and at anchor.'];
}
function swApplyStage() {""")

open(P, 'w').write(s)
print('ok')
