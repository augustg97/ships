/* prove round 120's hold-furniture rule fires, the LOST-FURNITURE arm: the gate that
   keeps hold furniture off undecked hulls must not be able to widen silently and strip
   the working fleet. Remove every drawn grating and capstan after the build; the rule's
   second arm ('a decked timber ship lost her …') must convict on every decked timber
   hull, and stay silent on the dugout, the voyaging canoe and the steel fleet. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    const doomed = [];
    g.traverse(o => {
      const p = o.userData && o.userData.part;
      if (p && (p.key === 'grating' || p.key === 'capstan')) doomed.push(o);
    });
    doomed.forEach(o => o.removeFromParent());
    return g;
  };
})();
