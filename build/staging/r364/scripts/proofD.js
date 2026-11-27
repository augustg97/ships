(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, o) {
    if (S && Array.isArray(S.tierPorts) && S.tierPorts[1] && S.tierPorts[1].coveredAft)
      return orig.call(this, Object.assign({}, S, { tierPorts: [S.tierPorts[0], Object.assign({}, S.tierPorts[1], { coveredAft: 0 })] }), o);
    return orig.call(this, S, o);
  };
})();
