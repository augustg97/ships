(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, o) {
    if (S && Array.isArray(S.tierPorts) && S.tierPorts[1] && S.tierPorts[1].foreM) {
      /* r363's reading: 8 ft 1 in as the centre-to-centre pitch, so the clear space is 8 ft 1 in less the port */
      const T = Object.assign({}, S.tierPorts[1], { clearM: 2.464 - 0.864 });
      const S2 = Object.assign({}, S, { tierPorts: [S.tierPorts[0], T] });
      return orig.call(this, S2, o);
    }
    return orig.call(this, S, o);
  };
})();
