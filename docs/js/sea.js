/* ── THE SEA SURFACE, DEFINED ONCE ──────────────────────────────────────────────────────
 *
 * ⚠ THE ONE THING THAT MUST NOT HAPPEN HERE IS TWO MODELS OF ONE NUMBER. If the shader draws
 * the water from one wave sum and the ships are floated on another, every hull sits at a
 * height nothing on screen agrees with — and it would look almost right, which is the worst
 * kind of wrong. This project has been bitten by that class repeatedly: the Yard's rig-height
 * estimate against the real spar, the stern lights sized alongside the transom, the rig note
 * restating the polar figures and drifting from them.
 *
 * So the WAVE TABLE below is the single source. It is uploaded to SEA_VERT as the `uWave`
 * uniform and it is read by `seaAt()` for buoyancy. The GLSL loop and the JS loop are eight
 * lines each and are deliberately written to mirror one another line for line, so a
 * divergence is visible by reading them side by side.
 *
 * Each entry: [dirX, dirZ, wavelength m, amplitude m]. The set is a crude but honest sea
 * state: one long swell, a second swell crossing it at an angle, and two shorter wind-chop
 * components. Real seas are always at least two systems at once — the swell left by a distant
 * storm and the chop raised by whatever the wind is doing now — and a single train is the
 * giveaway of a fake ocean.
 *
 * Speed is NOT stored, because it is not free: a deep-water gravity wave runs at c = sqrt(g/k).
 * Both implementations derive it.
 */
const SEA_WAVES = [
  [ 1.000,  0.160, 118.0, 1.30],   // the long swell
  [ 0.820, -0.570,  61.0, 0.72],   // a second swell across it
  [ 0.550,  0.840,  27.0, 0.31],   // wind chop
  [-0.310,  0.950,  13.0, 0.14],   // and the short stuff
];

/* ── HOW BIG THE SEA IS, FOR A GIVEN WIND ───────────────────────────────────────────────
 * ⚠ THE FIRST LAW WAS A * (0.30 + 0.070 * U), WHICH IS BARELY A LAW AT ALL. Across the entire
 * range this model ever sees — 2 m/s in the horse latitudes to 10 m/s in the Southern Ocean —
 * it changes wave height by 1.7 times. So a clipper in the Roaring Forties and a steamer on a
 * glassy July afternoon off Devon sailed in visibly the same water, and the wind field the app
 * spends a whole layer displaying made no difference to what the sea looked like.
 *
 * Wave height goes with the SQUARE of wind speed, not with it. The Sverdrup–Munk–Bretschneider
 * relation for a fully developed sea is Hs ~ 0.021 U^2: a 4 m/s breeze raises 0.34 m, 9 m/s
 * raises 1.7 m, and a 15 m/s gale raises 4.7 m — a fourteenfold range where there was a 1.7.
 * That is the difference between a sea state and a texture.
 *
 * TWO THINGS ARE NOT SCALED BY THE LOCAL WIND, and both matter:
 *   * SWELL, which was raised somewhere else. A calm does not flatten the ocean; it leaves the
 *     old swell running under it, and a long low swell on a windless day is one of the most
 *     recognisable things at sea. The two swell components keep a floor.
 *   * CHOP, which is entirely local and does go to nothing in a calm. It has no floor.
 *
 * ── AND IT IS COMPUTED IN ONE PLACE ────────────────────────────────────────────────────
 * This scaling used to be written three times: here, in SEA_VERT, and again in the globe's
 * fragment shader. Three copies of one formula is the exact failure this file's opening note
 * warns about, so the amplitude is now folded into the uniform BEFORE upload. The shaders get
 * a finished number and have no wind term left to disagree about. */
const SWELL_FLOOR = [0.34, 0.22, 0.0, 0.0];        // fraction retained in a flat calm

function seaAmp(i, wind) {
  const U = wind === undefined ? 7.0 : Math.max(0, wind);
  const hs = 0.021 * U * U;                        // significant wave height, metres
  const ref = 0.021 * 7.0 * 7.0;                   // the table is written for a 7 m/s sea
  const f = Math.min(4.2, hs / ref);               // capped: this is not a survival model
  return SEA_WAVES[i][3] * Math.max(SWELL_FLOOR[i], f);
}

/* Flattened for the uniform, with the amplitude already scaled, so the shader and this file
   cannot fall out of step — there is nothing left for them to compute independently. */
function seaWaveUniform(wind) {
  return SEA_WAVES.map((w, i) => new THREE.Vector4(w[0], w[1], w[2], seaAmp(i, wind)));
}

/* Re-scale an existing uniform array in place, for views whose wind changes as the camera or
   the ship moves. Mutating beats rebuilding: a fresh array every frame would replace the
   uniform's identity and force three.js to re-upload the whole thing. */
function updateWaveUniform(arr, wind) {
  if (!arr) return arr;
  for (let i = 0; i < SEA_WAVES.length && i < arr.length; i++) arr[i].w = seaAmp(i, wind);
  return arr;
}

/* ── seaAt: the height and slope of the water at a point ────────────────────────────────
 * Mirrors the loop in SEA_VERT exactly. Returns the displaced height and the surface normal,
 * which between them are everything needed to float a hull: heave from y, pitch and roll from
 * the normal.
 *
 * Note it returns the height at the UNDISPLACED x,z. Gerstner moves water horizontally too, so
 * strictly one should invert the displacement to find which particle is under the ship. For a
 * hull many times longer than the horizontal excursion the error is far below the amplitude,
 * and the alternative is a fixed-point solve per ship per frame.
 */
function seaAt(x, z, t, wind) {
  const w = wind === undefined ? 7.0 : wind;
  let y = 0, nx = 0, nz = 0, ny = 1;
  for (let i = 0; i < SEA_WAVES.length; i++) {
    const W = SEA_WAVES[i];
    const dl = Math.hypot(W[0], W[1]) || 1;
    const dx = W[0] / dl, dz = W[1] / dl;
    const L = W[2];
    const A = seaAmp(i, w);
    const k = 6.2831853 / L;
    const c = Math.sqrt(9.81 / k);
    const ph = k * (dx * x + dz * z) - c * k * t;
    const s = Math.sin(ph), co = Math.cos(ph);
    const Q = Math.min(0.72 / Math.max(k * A * 4.0, 1e-4), 1.0);
    y  += A * s;
    nx -= dx * k * A * co;
    nz -= dz * k * A * co;
    ny -= Q * k * A * s;
  }
  const n = Math.hypot(nx, ny, nz) || 1;
  return { y, nx: nx / n, ny: ny / n, nz: nz / n };
}

/* ── float a ship on it ─────────────────────────────────────────────────────────────────
 * A hull does not sit on the water at one point. It spans a length, and what it actually does
 * is average the surface under itself — which is why a long ship is steady in a short sea and
 * a boat the length of the waves is not. So sample at the bow, amidships and the stern and
 * take the mean for heave, and take PITCH from the difference between bow and stern rather
 * than from the local normal. That one detail is the difference between a ship riding a sea
 * and a ship glued to a wobbling plane.
 */
function floatShip(obj, x, z, heading, lengthM, t, wind) {
  const hx = Math.cos(heading), hz = Math.sin(heading);
  const half = lengthM * 0.5;
  const bow = seaAt(x + hx * half, z + hz * half, t, wind);
  const mid = seaAt(x, z, t, wind);
  const aft = seaAt(x - hx * half, z - hz * half, t, wind);
  obj.position.y = (bow.y + mid.y * 2 + aft.y) * 0.25;
  /* pitch: bow height minus stern height, over the length between them */
  const pitch = Math.atan2(bow.y - aft.y, lengthM);
  /* roll: the athwartships slope of the surface under her */
  const roll = Math.asin(Math.max(-1, Math.min(1, -mid.nx * hz + mid.nz * hx))) * 0.65;
  return { pitch, roll, y: obj.position.y };
}

/* ── THE OARSTROKE ──────────────────────────────────────────────────────────────────────
 * ⚠ AN OARSTROKE IS NOT A SINE WAVE, and that asymmetry is the whole look of it. The blade is
 * only in the water for about a THIRD of the cycle. That third — the drive — is short, hard
 * and fast; the other two thirds are the recovery, swinging the loom forward through the air,
 * and it is slower because nothing is resisting it. A sine wave spends equal time in both and
 * reads instantly as a machine rather than as men pulling.
 *
 * Two rotations make it: a fore-and-aft SWEEP about the vertical (the stroke itself), and a
 * rise and fall about the horizontal (catch, and lifting clear at the finish). The blade
 * feathers on the recovery — turned flat so it does not catch the wind or a wave top — which
 * on a real crew is the most visible single thing about the stroke.
 *
 * The three banks of a trireme do not enter together. The thranite oar above reaches the water
 * a fraction after the thalamite below it, because it is longer and swings through a bigger
 * arc from further outboard; the ripple down the banks is what a trireme actually looked like.
 *
 * Rate: a trireme cruised near 30 strokes a minute and could sprint far above it. Olympias
 * turned 180 degrees inside two and a half ship-lengths at racing rate.
 */
const STROKES_PER_MIN = 31;

function animateOars(root, t) {
  if (!root) return;
  const period = 60 / STROKES_PER_MIN;
  root.traverse(o => {
    const d = o.userData && o.userData.oar;
    if (!d) return;
    const ph = ((t / period) + d.bank * 0.075) % 1.0;
    const DRIVE = 0.36;

    /* ── ⚠ THE BLADES NEVER WENT IN THE WATER ────────────────────────────────────────
       The first version moved the oars between 19 and 9 degrees below horizontal — so they
       stood out from the hull almost flat, all 170 of them, splayed like a fan, and not one
       ever touched the sea. An oar that never enters the water is not rowing; it is waving.

       These are the angles the geometry actually needs. The looms pivot at the thole, well
       above the waterline, so the blade only reaches the sea at a real angle of depression:
       BURIED through the drive, and lifted clear — but only just clear, because lifting more
       than you must is wasted effort and a trireme's oarsmen had 170 strokes a minute between
       them to think about. */
    const DOWN_IN = 0.30;       // buried: the blade end down, about 17 degrees
    const DOWN_OUT = 0.02;      // recovering: blade just skimming clear
    let sweep, tilt, feather;
    if (ph < DRIVE) {
      /* the drive. Blade buried, hauling aft, and the pull is EVEN — a crew that snatches
         loses the blade. Slightly deeper at mid-stroke where the load is greatest. */
      const k = ph / DRIVE;
      sweep = Math.cos(Math.PI * k);
      tilt = DOWN_IN - 0.03 * Math.sin(Math.PI * k);
      feather = 0.0;                                  // square in the water, or it slips
    } else {
      /* the recovery. Out, forward, and FEATHERED — turned flat so it does not catch the
         wind or clip a wave top. Eased, because a body swinging a 9 m loom cannot jerk. */
      const k = (ph - DRIVE) / (1 - DRIVE);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
      sweep = -1.0 + 2.0 * e;
      tilt = DOWN_IN + (DOWN_OUT - DOWN_IN) * Math.sin(Math.PI * k);
      /* feather in fast after the blade leaves the water, square up again before the catch */
      feather = Math.sin(Math.PI * Math.pow(k, 0.75));
    }
    /* ── THE ARC COMES FROM THE ROWER, NOT FROM TASTE ────────────────────────────────
       A seated man on a fixed thwart swings his body and draws his arms through about a
       metre. On a loom 1.1 m inboard of the thole that is an arc of roughly 0.9 rad — call it
       ±26 degrees either side of square. Wider than that and he has run out of body; it is
       the reach that limits a fixed-seat stroke, which is exactly why the sliding seat was
       such a large change when it finally came. */
    const HANDLE_TRAVEL = 1.00, INBOARD = 1.10;
    const ARC = HANDLE_TRAVEL / INBOARD / 2;           // half-angle, radians
    o.rotation.y = d.restY + d.sgn * sweep * ARC;
    o.rotation.x = tilt;                               // the oar lies along Z, so tilt is about X
    o.rotation.z = feather * 1.35 * d.sgn;             // and feather is about its own axis
  });
}

/* ── THE PADDLE WHEEL TURNS ─────────────────────────────────────────────────────────────
 * ⚠ And its rate is not free. A paddle wheel is a wheel rolling on the water: the float at
 * the rim has to travel sternward at about the ship's own speed through the sea, or the wheel
 * is either slipping — churning water it has already thrown — or being dragged round by the
 * ship, which is worse. So the angular rate comes from the SHIP'S SPEED and the WHEEL'S
 * RADIUS, not from whatever looked about right:
 *
 *     omega = v / R,  with a slip factor, because a real wheel always slips a little.
 *
 * Great Eastern made 8.2 kn = 4.2 m/s on a wheel of radius 8.5 m, which is 0.5 rad/s, or
 * about 4.7 revolutions a minute. That is SLOW — much slower than instinct suggests — and it
 * is why period photographs of paddle steamers under way rarely show the wheel blurred.
 */
function animateWheels(root, t, speedKn) {
  if (!root) return;
  const v = (speedKn || 8) * 0.5144;                    // knots to m/s
  root.traverse(o => {
    const d = o.userData && o.userData.wheel;
    if (!d) return;
    const omega = (v / Math.max(1, d.R)) * 0.88;        // 12% slip, which a real wheel has
    /* the wheel turns about the athwartships axis, and the two sides turn the same way seen
       from their own side — so the sign flips with the side you are looking from */
    o.rotation.z = -d.sgn * omega * t;
  });
}

window.SHIPS_SEA = { SEA_WAVES, seaWaveUniform, updateWaveUniform, seaAmp, seaAt, floatShip,
                     animateOars, animateWheels };
