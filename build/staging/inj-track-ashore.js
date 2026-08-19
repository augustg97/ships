/* r123 injection: the router's own give-up path — a leg whose endpoints cannot be walked
   out to the one connected ocean (snapToOcean's 40-cell reach) makes seaPath return null,
   and seaRouteSteps falls back to the raw waypoints, drawing the shortcut across whatever
   is in the way. Central Asia is unsnappable at every datum this model knows. Arm 2 alone
   must convict; the datum arm must stay quiet. */
(() => {
  const list = APP.voyages.voyages || APP.voyages;
  list.push({ id: 'inj-steppe', name: 'INJECTED: the steppe passage', vessel: 'dugout',
              year: -40000,
              legs: [{ lon: 88.0, lat: 47.0, name: 'a' }, { lon: 76.0, lat: 42.0, name: 'b' }] });
})();
