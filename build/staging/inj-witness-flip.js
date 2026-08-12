/* r84 proof 1: a flipped witness must convict — and must convict in a STANDARD audit
   context (ship view, Action closed), the exact context where the r83 rule silently
   skipped. Expect: salamis 'a shore that contradicts its witnesses'. */
(() => {
  const b = APP.battles.battles.find(x => x.id === 'salamis');
  b.shore.probes[0].land = false;   // Mount Aigaleo ridge, claimed water
})();
null;
