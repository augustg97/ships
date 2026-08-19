/* prove round 121's steering rule convicts the ORIGINAL FAULT: the builder's old
   unconditional stern rudder is forced back onto every paddle-steered hull for the
   build only; the record still says paddle. 'A paddled hull mounts steering' must
   convict on exactly the dugout (1 rudder mesh) and the voyaging canoe (2 — the
   double-hull duplication that hung one on EACH hull before round 121). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    if (S && S.steering === 'paddle') {
      S.steering = 'stern';
      const g = orig.apply(this, arguments);
      S.steering = 'paddle';
      return g;
    }
    return orig.apply(this, arguments);
  };
})();
