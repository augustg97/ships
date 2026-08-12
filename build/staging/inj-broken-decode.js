/* r84 proof 3: THE ROUND'S OWN BUG, re-introduced verbatim — btShoreLoad rebuilt with
   the GLSL normalized-channel decode applied to raw bytes (255x too large, every point
   on Earth land). The witnesses must convict every water probe on every shore battle.
   Expect: 'a shore that contradicts its witnesses' (water probes reading ~+2.8e6 m)
   and 'a campaign day anchored on dry land' for every in-patch day. */
(() => {
  const src = String(SHIPS_BT.btShoreLoad)
    .replace('px[i * 4] * 256 + px[i * 4 + 1]',
             'px[i * 4] * 65280 + px[i * 4 + 1] * 255');
  if (!/65280/.test(src)) throw new Error('injection missed the decode line');
  SHIPS_BT.btShoreLoad = (0, eval)('(' + src + ')');
})();
null;
