import sys
P = sys.argv[1]
s = open(P).read()
a0 = s.index("/* ── A SHIP WITH NO RIG IS NOT \"BENT ON\"")
a1 = s.index("function swApplyStage() {")
NEW = r'''/* ── A SHIP THAT SETS NO SAIL IS NOT "BENT ON" ─────────────────────────────────────────
   The build stages are a sailing ship's story: masts, rigging, yards, canvas.
   ⚠ r301: two faults, both on every powered hull.
   (1) The test for "powered" was "no masts at all", so Titanic, Queen Mary 2, Dreadnought and
       Yamato — steel pole masts and no canvas — were told about topgallants fidded through the
       doubling, ratlines, yards braced to the wind and "Canvas. She can now be driven by the
       wind". The test is now the one the furled card already used: does she carry cloth.
   (2) The powered cards were four fixed paragraphs written for a container ship ("Machinery in",
       "Accommodation", "Funnel and uptakes", "Loaded") and they narrated parts the picture does
       not show at those stages: every powered hull's house, bridge and funnels go on at stage 3,
       with the deck, and nothing at all is added at stages 5 and 6. The carrier was told about a
       low-speed diesel; she has two reactors.
   So the powered cards are COMPOSED, not written: each lists the parts the stage actually adds
   to this hull (read off the geometry's own userData.part tags, the same tags the clicks use),
   and the last card carries the hull's recorded machinery (hull.machinery). A stage that adds
   nothing says so. A hull with no machinery record says that, too. */
const POWER_SKIP = new Set(['deck', 'rail', 'waterway', 'islandRail', 'stair']);
const POWER_PHRASE = {
  rudder: 'rudder', screw: 'screws', superstructure: 'superstructure', bridge: 'bridge',
  boat: 'boats', container: 'container stacks', cluster: 'mast and exhaust tower',
  terrace: 'stern terraces', vent: 'cowl ventilators', net: 'torpedo nets',
  turret: 'gun turrets', aa: 'heavy anti-aircraft guns', aaLight: 'light anti-aircraft guns',
  catapult: 'aircraft catapults and crane', hatch: 'hatches', searchlight: 'searchlights',
  flightdeck: 'flight deck', hangar: 'hangar', island: 'island', sensor: 'instrument mast',
  solar: 'solar panels', wing: 'wing sail and tail vane', floatplane: 'floatplanes',
  aircraft: 'aircraft on deck', livery: 'livery and name', paddle: 'paddle wheels',
  paddlebox: 'paddle boxes',
};
function swHullSetsSail(H) {
  return (H.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole')
      || !!H.headsails;
}
/* parts: [{key, name}] for the parts this stage ADDS. Returns [title, text]. Pure, so the
   audit can call it on every hull and stage (window.SW_STAGE_CARD). */
function swPowerCard(spec, stage, parts) {
  const H = spec.hull || {};
  const keys = [], names = {};
  for (const p of parts) {
    if (POWER_SKIP.has(p.key)) continue;
    if (!names[p.key]) { names[p.key] = new Set(); keys.push(p.key); }
    names[p.key].add(p.name);
  }
  const phrase = k => {
    if (k === 'funnel') return (H.funnels || 1) > 1 ? H.funnels + ' funnels' : 'funnel';
    if (k === 'mast') {
      const nm = [...names.mast].filter(n => /mast$/i.test(n)).length;
      return Math.max(nm, (H.masts || []).length) > 1 ? 'masts' : 'mast';
    }
    if (k === 'forecast') return [...names.forecast].map(n => n.toLowerCase()).join(', ');
    return POWER_PHRASE[k] || [...names[k]][0].toLowerCase();
  };
  const list = keys.map(phrase);
  const added = list.length
    ? 'Added at this stage: ' + (list.length > 1 ? list.slice(0, -1).join(', ') + ' and '
                                                   + list[list.length - 1] : list[0]) + '.'
    : '';
  if (stage === 3) {
    let t = 'The weather deck closes the hull. ' + added;
    if (H.containers)
      t += ' Most of her deck is hatch covers, because the boxes in the holds are lowered '
         + 'straight down into cell guides. Every box has the same ISO corner castings, so any '
         + 'crane, ship or truck can lift it.';
    return ['Decked', t];
  }
  if (stage >= 4 && stage <= 6) {
    if (list.length) return ['Fitted out', added];
    return ['Nothing added', 'Nothing is added at this stage. On a sailing ship this is when '
                           + 'the rigging and yards go up' + (H.wingSail ? '.' : '; she sets no sail.')];
  }
  const mach = H.machinery ? H.machinery : 'Her machinery is not recorded in this model.';
  return ['Afloat', (added ? added + ' ' : '') + mach];
}
window.SW_STAGE_CARD = swPowerCard;
window.SW_SETS_SAIL = swHullSetsSail;

'''
s = s[:a0] + NEW + s[a1:]

old_engine = """  const engine = !(SW.spec.hull.masts || []).length;
  let nm = SW.stage === 1 ? trad.s1
         : SW.stage === 2 ? trad.s2
         : (engine && ENGINE_STAGES[SW.stage]) || STAGE_NAMES[SW.stage];"""
assert s.count(old_engine) == 1
new_engine = """  const engine = !swHullSetsSail(SW.spec.hull);
  let addedHere = [];
  if (engine && SW.stage >= 3) SW.ship.traverse(o => {
    const p = o.userData && o.userData.part;
    if (p && p.stage === SW.stage) addedHere.push({ key: p.key, name: p.name });
  });
  let nm = SW.stage === 1 ? trad.s1
         : SW.stage === 2 ? trad.s2
         : engine ? swPowerCard(SW.spec, SW.stage, addedHere) : STAGE_NAMES[SW.stage];"""
s = s.replace(old_engine, new_engine)

old_box = """  if (SW.stage === 7 && SW.spec.hull.containers)
    nm = ['Loaded', 'The boxes. Eight feet by eight foot six by twenty or forty, corner castings '
                  + 'identical everywhere on earth — and the standard, not the ship, is the '
                  + 'invention.'];
"""
assert s.count(old_box) == 1
s = s.replace(old_box, "")
old_cloth = """  const cloth = (SW.spec.hull.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole')
             || SW.spec.hull.headsails;"""
assert s.count(old_cloth) == 1
s = s.replace(old_cloth, "  const cloth = !engine;")
assert 'ENGINE_STAGES' not in s
open(P, 'w').write(s)
print('ok')
