precision highp float;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
uniform vec3 uSun, uCam;
uniform float uStrakes;      // number of planking strakes keel to sheer
uniform float uPlankLen;     // plank butts along the hull, = LOA / plank length
uniform float uFrames;       // frame crossings along the hull, = LOA / room-and-space
uniform float uCopper;       // 0 = none, 1 = sheathed
uniform float uCopperAge;    // 0 = new and bright, 1 = fully verdigris
uniform float uWaterline;    // v coordinate of the load waterline
uniform float uChequer;      // 0 = plain, 1 = Nelson chequer with gunport bands
uniform float uGunDecks;
uniform vec3  uTopside;      // the paint above the waterline
uniform float uIron;         // 0 = wood, 1 = iron/steel plate
uniform float uWeld;         // 0 = riveted lands, 1 = all-welded flush butts (≈1950 on)
uniform vec3  uBottom;       // antifouling colour — an era fact, supplied by hull.js, not assumed here
uniform float uCove;         // gilt cove line at the sheer — a documented per-ship fact, from the data
uniform float uPortholes;    // porthole count along the hull, 0 = none
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }

void main(){
  float u = vUv.x, v = vUv.y;
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);

  vec3 col;
  bool underwater = v < uWaterline;

  if (underwater && uCopper > 0.5) {
    /* ── COPPER SHEATHING ────────────────────────────────────────────────
       The Royal Navy plate is 4 ft × 14 in, and the 14 inches is not arbitrary: hull planks
       were 12 in wide, so a 14 in sheet gives a 1 in overlap top and bottom AND puts the
       copper seam deliberately midway between two plank seams. The whole geometry falls out
       of one sentence in the record.

       ⚠ IT DOES NOT GO GREEN. Verdigris is what copper does in AIR — roofs, statues. On the
       wetted hull the antifouling mechanism *is* that the corrosion film keeps dissolving
       away; a stable green patina cannot build up, because if it did the copper would stop
       working. So: bright salmon when new, dulling within weeks, then a dark brown immersed
       film that is continuously shedding. The green belongs only at the boot-top, which is
       wetted and dried and sees the air. The first version of this shader painted the whole
       underwater body verdigris and was wrong for a reason worth knowing. */
    float courses = uStrakes * 1.6;                 // 14 in courses against 12 in planks
    float cv = v * courses;
    float ch = u * 46.0 + floor(cv) * 0.5;          // courses are staggered, like brickwork
    float seamV = smoothstep(0.03, 0.10, abs(fract(cv) - 0.5) * 2.0);
    float seamH = smoothstep(0.05, 0.14, abs(fract(ch) - 0.5) * 2.0);
    /* tacks: 1.25–1.5 in along the overlaps, ~4 in across the field of the sheet */
    float tack = smoothstep(0.40, 0.26,
                   length(fract(vec2(ch * 4.0, cv * 3.0)) - 0.5)) * seamV;
    vec3 bright = vec3(0.76, 0.42, 0.25);           // newly laid
    vec3 dull   = vec3(0.42, 0.26, 0.17);           // weeks
    vec3 dark   = vec3(0.20, 0.15, 0.12);           // the shedding immersed film
    vec3 c = mix(bright, dull, clamp(uCopperAge * 2.2, 0.0, 1.0));
    c = mix(c, dark, clamp((uCopperAge - 0.45) * 1.8, 0.0, 1.0));
    c *= 0.80 + 0.20 * noise(vec2(u * 220.0, v * 90.0));
    c *= mix(0.62, 1.0, seamV * seamH);              // the plate edges catch shadow
    c += tack * 0.06;
    /* the sheathing was carried to about a foot above the load waterline and finished with a
       batten or a canvas roll — and THAT band, wetted and dried, is where green appears */
    c = mix(c, vec3(0.28, 0.44, 0.34), smoothstep(0.585, 0.615, v) * 0.55);
    col = c;
  } else if (underwater && uIron < 0.5) {
    /* the unsheathed underwater body: "white stuff" — tallow, rosin and sulphur — over pitch */
    col = vec3(0.42, 0.40, 0.35) * (0.80 + 0.22 * noise(vec2(u * 160.0, v * 70.0)));
    col = mix(col, vec3(0.20, 0.24, 0.18),
              smoothstep(0.35, 0.9, noise(vec2(u * 34.0, v * 15.0))) * 0.55);  // weed
  } else if (uIron > 0.5) {
    /* ── THE PLATED HULL, ABOVE WATER AND BELOW — ⚠ THIS PASS WAS UNREACHABLE FOR FOUR
       ROUNDS. Round 27 cut the early uniform-rivet branch down to col = uTopside and left
       the real plating pass where it had always lived: inside the WOODEN else, where uIron
       cannot exceed 0.5. Every iron ship in the fleet rendered as a flat slab of topside
       paint on a TALLOWED WOODEN BOTTOM, and the ratchet sat green because a flat slab never
       changes. Two models of one surface again — and the one being maintained, commented and
       "fixed" (porthole rims, plate patchwork, streaks) was the one that never ran. The
       plated surface now has ONE branch, and it owns the whole depth: the same plates run
       from sheer to keel, painted antifouling below the boot-top instead of tallow.
       ⚠ AND THE DRESS IS A DATE. The first restoration painted one Victorian scheme on
       ships from 1858 to 2017. Fastening, bottom colour and cove line are era facts, so
       they arrive as uniforms (uWeld, uBottom, uCove) computed from the vessel record —
       this shader renders a described scheme, it does not assume one. */
    float taper = 0.55 + 0.45 * (1.0 - abs(2.0 * u - 1.0));
    float pv, ph, land, butt, rivet, landShade, buttShade, toneAmp;
    if (uWeld < 0.5) {
      /* ── RIVETED: what a riveted hull shows is the plate LANDS — the overlap where one
         strake laps the next, a hard line every metre or so — the rivet rows along them,
         and nothing else. The middle of a plate is bare steel. */
      pv = v * uStrakes * 0.55; ph = u * 34.0;
      land = smoothstep(0.03, 0.11, abs(fract(pv) - 0.5) * 2.0);
      butt = smoothstep(0.02, 0.07, abs(fract(ph) - 0.5) * 2.0);
      /* ⚠ RIVETS GO ALONG THE SEAMS, NOT EVERYWHERE. A uniform grid of them over the whole
         plate is not what a riveted ship looks like and, at any distance, moirés into
         something that reads as woven mesh. Rivets fasten one plate to the NEXT, so they run
         in rows down the LANDS and across the BUTTS and nowhere else. */
      float onLand = 1.0 - smoothstep(0.0, 0.16, abs(fract(pv) - 0.5) * 2.0);
      float onButt = 1.0 - smoothstep(0.0, 0.10, abs(fract(ph) - 0.5) * 2.0);
      float rowL = smoothstep(0.34, 0.16, abs(fract(ph * 3.0) - 0.5) * 2.0) * onLand;
      float rowB = smoothstep(0.34, 0.16, abs(fract(pv * 1.6) - 0.5) * 2.0) * onButt;
      rivet = max(rowL, rowB);
      landShade = 0.74; buttShade = 0.86; toneAmp = 0.34;
    } else {
      /* ── WELDED: an all-welded shell has NO lands — plates butt flush and the seam is a
         ground bead under paint, a hairline the eye finds mostly by its sheen. Plates are
         wider (a strake of shell plate runs 2.5–3 m) and longer, so the grid is coarser.
         No rivets exist to draw. What a welded hull shows instead is the HUNGRY HORSE —
         thin shell dished inboard between frames by weld shrinkage, a soft vertical ripple
         at frame spacing that every photo of a working container ship shows in raking
         light. That ripple is drawn below with the frame count, not a texture frequency. */
      pv = v * uStrakes * 0.30; ph = u * 10.0;
      land = smoothstep(0.008, 0.030, abs(fract(pv) - 0.5) * 2.0);
      butt = smoothstep(0.006, 0.024, abs(fract(ph) - 0.5) * 2.0);
      rivet = 0.0;
      landShade = 0.90; buttShade = 0.94; toneAmp = 0.14;
    }
    vec3 paint = uTopside;
    /* ── ⚠ ANTI-FOULING IS NOT ONE COLOUR, IT IS A DATE ─────────────────────────────
       The nineteenth-century mercuric/arsenical composition was a pale SALMON PINK — the
       museum model of Great Eastern shows it clearly. Around 1890 the oxide red-browns take
       over, and the modern self-polishing paints are the oxide red every dry dock shows
       today. Yamato's record says dark IJN hull-red. The colour arrives in uBottom.
       The GOLD SHEER LINE is a documented per-ship fact — the Olympic class carried a gilt
       cove stripe, no warship or working box ship did — so it is gated by uCove, from the
       vessel record. */
    float below = smoothstep(uWaterline + 0.012, uWaterline - 0.012, v);
    paint = mix(paint, uBottom, below);
    float sheerLine = smoothstep(0.016, 0.004, abs(v - (uWaterline + 0.30)));
    paint = mix(paint, vec3(0.78, 0.62, 0.26), sheerLine * 0.92 * uCove);

    /* ── ⚠ A HULL IS MADE OF PLATES, AND EVERY PLATE WAS THE SAME COLOUR ───────────────
       That is why the rivets read as a printed dot screen: they were the ONLY variation on
       an otherwise perfectly uniform sheet, so the eye had nothing else to hold and locked
       onto the grid. A real riveted hull is visibly assembled — each plate was rolled from a
       different heat, faired by a different hand and painted on a different day, so no two
       are quite the same tone, and that patchwork is what says "built from parts" before any
       rivet is visible at all. Give each plate its own shade off the land/butt cell it sits
       in, and the rivets stop being the whole story.
       ⚠ On a BLACK hull — and Great Eastern's was black — a multiplicative tone shift of a
       few percent is invisible: a few percent of nearly nothing is nothing. The variation has
       to be wide enough to survive a dark base. It applies to the bottom too: an antifouled
       bottom is repainted plate by plate at every docking, and reads as a patchwork in every
       dry-dock photograph. */
    vec2 cell = floor(vec2(ph, pv));
    float plateTone = 0.97 + toneAmp * (hash(cell * 7.31) - 0.5);
    paint *= plateTone;

    /* ── AND STEEL STREAKS. ────────────────────────────────────────────────────────────
       The most recognisable thing about a working steel hull is not its rivets, it is the
       VERTICAL WEEPING down its sides: rust and dirt carried down by rain and spray from
       every scupper, freeing port and seam. It runs DOWN, always, because gravity does, and
       it is strongest under the deck edge and fades toward the water where the sea scrubs it.
       ⚠ The first version peaked its runDown term BELOW the waterline — the exact opposite of
       the sentence above, and never seen because the branch never ran. Weeping starts where
       the water is thrown ON: at the deck edge. */
    float streakN = noise(vec2(u * 90.0, 0.0)) * 0.6 + noise(vec2(u * 260.0, 0.0)) * 0.4;
    float runDown = smoothstep(uWaterline, 1.0, v);
    float streak = smoothstep(0.58, 0.92, streakN) * runDown * (1.0 - below);
    /* streaks lighten as well as darken on a dark hull — salt dries white on black paint */
    paint = mix(paint, paint * vec3(1.55, 1.34, 1.14), streak * 0.42);

    /* ── PORTHOLES, IN ROWS, AT A REAL SPACING ─────────────────────────────────────
       A porthole is about 400 mm whatever the ship, so the number of them between bow and
       stern IS the length, read directly. Spaced by a real distance along the hull rather
       than by a fraction of it, so the count follows the ship instead of the ship following
       the count.
       ⚠ THE ROWS WERE WRITTEN AT uWaterline + 0.42 AND + 0.61 — v = 1.04 and 1.23, ABOVE THE
       SHEER. No porthole could ever have drawn, even from a live branch. The rows belong in
       the freeboard, as fractions of the distance from the load line to the deck edge. */
    float portRow = 0.0, portRim = 0.0;
    for (int r = 0; r < 2; r++) {
      float rv = mix(uWaterline, 1.0, 0.40 + float(r) * 0.26);
      float dy = (v - rv) * 5.2;
      float px = fract(u * uPortholes) - 0.5;
      float d = length(vec2(px * 1.6, dy));
      portRow = max(portRow, smoothstep(0.155, 0.095, d));   // the dark glass
      /* the ring is what makes a porthole READ: a polished brass annulus round the glass —
         on a dark topside that bright ring is the only part the eye catches. An annulus is
         two smoothsteps: inside the outer edge, outside the inner one. */
      float rim = smoothstep(0.185, 0.150, d) * smoothstep(0.095, 0.130, d);
      portRim = max(portRim, rim);
    }
    paint = mix(paint, vec3(0.045, 0.050, 0.060), portRow * 0.92);
    paint = mix(paint, vec3(0.78, 0.66, 0.38), portRim * 0.85);

    col = paint * (0.965 + 0.035 * noise(vec2(u * 60.0, v * 26.0)));
    /* a riveted lap stands proud, so it shades on one side and catches light on the other —
       that highlight is what makes a plate seam visible on a dark hull at all. A welded butt
       is flush: the same expression at a fraction of the depth, a sheen line, not a step. */
    col *= mix(landShade, uWeld < 0.5 ? 1.06 : 1.01, land);
    col *= mix(buttShade, uWeld < 0.5 ? 1.02 : 1.005, butt);
    /* rivets at a third of their old strength. They are 20 mm domes on a 200 m ship: at any
       honest viewing distance they are a texture, not a feature. */
    col += rivet * 0.011;
    if (uWeld > 0.5) {
      /* the HUNGRY HORSE: weld shrinkage dishes the thin shell inboard between frames, so a
         soft dark ripple runs down the side at web-frame spacing — every fourth frame or so,
         hence uFrames * 0.26, a real distance, not a chosen frequency. Strongest in raking
         light on the topside; the matte antifouling below the boot-top hides it. */
      float bay = fract(u * uFrames * 0.26);
      float dish = 0.5 - 0.5 * cos(bay * 6.2831853);
      float vary = 0.6 + 0.4 * noise(vec2(floor(u * uFrames * 0.26) * 3.7, v * 2.0));
      col *= 1.0 - 0.045 * dish * vary * (1.0 - below);
    }
    col *= taper * 0.25 + 0.75;
  } else {
    /* ── PLANKING ────────────────────────────────────────────────────────
       Carvel strakes running fore-and-aft, caulked with oakum and payed with pine tar. The
       planks NARROW toward the ends, which they must: the girth of a section falls away at
       the stem, so the same number of strakes has less to cover. */
    float taper = 0.55 + 0.45 * (1.0 - abs(2.0 * u - 1.0));
    float sv = v * uStrakes;
    float seam = smoothstep(0.02, 0.09, abs(fract(sv) - 0.5) * 2.0);
    float grain = noise(vec2(u * 420.0, floor(sv) * 31.7)) * 0.5
                + noise(vec2(u * 90.0, floor(sv) * 12.3)) * 0.5;
    col = uTopside * (0.84 + 0.30 * grain);
    col *= mix(0.52, 1.0, seam);                     // the caulked seam is a dark line

    /* ── PLANK BUTTS, AND WHY THEY ARE STAGGERED ────────────────────────
       A plank is a tree, so it is finite: English oak gave lengths of about 7 m, which on a
       57 m ship means eight butts in every strake. Butts are the weak point of the skin, so
       the shift of butts is a RULE, not a preference — no two butts in adjacent strakes may
       fall on the same frame space, and three strakes must separate any two on the same one.
       The stagger below is that rule: each strake's butts are offset by an irrational-ish
       fraction of a plank so no two lines ever queue up.

       ── AND THE TREENAILS. Every plank is fastened to every frame it crosses by oak pins
       driven through and wedged, two to a frame. They are the same wood as the plank, so
       they show as grain disturbance rather than as dots — which is exactly how they read on
       a real hull, and why an iron-fastened ship looks so different. */
    float strake = floor(sv);
    float plankL = uPlankLen;                        // butts per unit u, from the real length
    float bu = u * plankL + strake * 0.379;          // the shift of butts
    float butt = smoothstep(0.010, 0.030, abs(fract(bu) - 0.5) * 2.0);
    col *= mix(0.63, 1.0, butt);

    /* two treenails per frame crossing, in the middle third of the plank's width */
    float fr = u * uFrames;
    float across = abs(fract(sv) - 0.5) * 2.0;
    float tn = smoothstep(0.16, 0.05, length(vec2(fract(fr) - 0.5, (across - 0.45) * 2.2)));
    col *= mix(1.0, 0.90 + 0.10 * grain, tn * seam);

    /* ── THE "NELSON CHEQUER", as the paint actually was ────────────────
       ⚠ NOT yellow and black. The 2015 repaint of HMS Victory was preceded by the most
       extensive paint survey ever made of a historic ship — several hundred samples, in places
       through 72 layers, led by Michael Crick-Smith at Lincoln — and it found that at
       Trafalgar she was **pale yellow and DARK GREY**. The pigments were the ones the Navy
       issued free: lead white and ochre. The result is described as running "from a
       creamy-orange to almost salmon pink in certain lights", which is a long way from the
       lemon-yellow of every model kit.

       And the chequer is only a chequer when the ports are OPEN — cleared for action. With
       the lids closed the hull reads as plain stripes, because the lids were painted to match. */
    if (uChequer > 0.5) {
      float band = 0.0, port = 0.0;
      for (float d = 0.0; d < 4.0; d += 1.0) {
        if (d >= uGunDecks) break;
        float centre = uWaterline + 0.10 + d * 0.115;
        band = max(band, smoothstep(0.052, 0.030, abs(v - centre)));
        float px = fract(u * 26.0);
        port = max(port, smoothstep(0.030, 0.016, abs(v - centre))
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));
      }
      vec3 ochre = vec3(0.780, 0.585, 0.395);        // creamy-orange, not lemon
      vec3 grey  = vec3(0.180, 0.178, 0.172);        // dark grey, not black
      col = mix(grey, ochre, band);
      col *= (0.84 + 0.30 * grain);
      col *= mix(0.52, 1.0, seam);
      col = mix(col, vec3(0.055, 0.052, 0.050), port);   // the open port is a hole
    }
    col *= taper * 0.25 + 0.75;
  }

  /* ── light. One sun, a broad sky term, and a bounce off the water so the underside of the
     hull is never black — which it never is, at sea. */
  float lam = max(dot(N, L), 0.0);
  float sky = 0.5 + 0.5 * N.y;
  float bounce = max(0.0, -N.y) * 0.30;
  vec3 lit = col * (0.24 * sky + 0.95 * lam) + col * bounce * vec3(0.34, 0.52, 0.62);

  /* wet sheen below the waterline, and a spec on the paint above it */
  vec3 Hv = normalize(L + V);
  float shin = underwater ? 46.0 : 22.0;
  float spec = pow(max(dot(N, Hv), 0.0), shin) * (underwater ? 0.55 : 0.16);
  lit += vec3(1.0, 0.97, 0.90) * spec * lam;

  /* the boot-top: a hard, wet line exactly at the load waterline */
  float wl = smoothstep(0.012, 0.0, abs(v - uWaterline));
  lit = mix(lit, lit * 0.45, wl * 0.75);

  gl_FragColor = vec4(pow(clamp(lit, 0.0, 1.6), vec3(0.4545)), 1.0);
}
