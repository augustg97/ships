/* r155 staging sim — a record may attest the FLAG-BUTTON, not the spar. Preussen's
 * record gives one mast figure and it is the truck: 58 m deck to flag-button
 * (68 m from the keel), one number for all five masts because the Laeisz
 * Standardrigg cut interchangeable spars — and her main course yard is attested
 * at 32 m, her royal at 16. The model drew heightM (a lower-mast guess) through
 * the fidded stack and stood 51.24 m; the fix lets the record state `truckM` and
 * `courseYardM` and solves the stack for them IN hull.js, next to the stack
 * constants the solution depends on. Pure node: replicates the exact segment
 * advance the builder runs, the conversion the edit adds, and the r155 audit
 * predicate against both forms. Run: node build/staging-r155-trucks.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ══ THE BUILDER'S OWN STACK, replicated exactly ══════════════════════════════════
 * hull.js: segs = [lower, lower*0.60, lower*0.30] for a full square mast
 * (top = lower*0.60, tg = top*0.50); the loop runs capY = y + seg;
 * segHeads[si] = capY; y += seg*0.88 — the doubling. `only` truncates. */
function drawnStack(lower, only) {
  const top = lower * 0.60, tg = top * 0.50;
  const segs = [lower, top, tg];
  let y = 0, capY = 0;
  const segHeads = [];
  segs.forEach((seg, si) => {
    if (only && si >= only) return;
    capY = y + seg;
    segHeads.push(capY);
    y += seg * 0.88;
  });
  return { truck: segHeads[segHeads.length - 1], yAfter: y };
}

/* ══ THE EDIT'S CONVERSION — as hull.js will carry it ═════════════════════════════ */
function mastLower(mk, steelMain) {
  if (mk.truckM !== undefined && mk.rig === 'square') {
    const K = mk.only === 1 ? 1.0
            : mk.only === 2 ? 0.88 + 0.60
            : 0.88 * (1 + 0.60) + 0.30;
    return mk.truckM / K;
  }
  return mk.heightM !== undefined ? mk.heightM : (mk.height || 0) * steelMain;
}

/* ── 1. the stack factor is what the conversion says it is ──────────────────────── */
for (const L of [10, 27, 30, 33.9578, 41.7]) {
  const { truck } = drawnStack(L);
  ok(`stack factor at lower ${L}`, Math.abs(truck - 1.708 * L) < 1e-9,
     `drawn ${truck} vs 1.708·L ${1.708 * L}`);
}
{
  const { truck } = drawnStack(30, 2);
  ok('only=2 factor 1.48', Math.abs(truck - 1.48 * 30) < 1e-9, `drawn ${truck}`);
  const t1 = drawnStack(30, 1).truck;
  ok('only=1 factor 1.00', Math.abs(t1 - 30) < 1e-9, `drawn ${t1}`);
}

/* ── 2. truckM lands the flag-button EXACTLY ────────────────────────────────────── */
{
  const mk = { rig: 'square', truckM: 58.0 };
  const L = mastLower(mk, 70.2);
  const { truck } = drawnStack(L);
  ok('truckM 58 solves lower 33.9578…', Math.abs(L - 58 / 1.708) < 1e-12, `L ${L}`);
  ok('drawn truck lands 58.000000', Math.abs(truck - 58.0) < 1e-9, `truck ${truck}`);
}
{
  const mk = { rig: 'square', truckM: 58.0, only: 2 };
  const { truck } = drawnStack(mastLower(mk, 0), 2);
  ok('truckM with only=2 still lands', Math.abs(truck - 58.0) < 1e-9, `truck ${truck}`);
}

/* ── 3. precedence: the old records are byte-untouched by the edit ──────────────── */
{
  const steelMain = (124 + 16.4) / 2;
  ok('heightM without truckM unchanged',
     mastLower({ rig: 'square', heightM: 27.0 }, steelMain) === 27.0);
  ok('height share fallback unchanged',
     mastLower({ rig: 'square', height: 0.88 }, steelMain) === 0.88 * steelMain);
  ok('truckM on a non-square rig is ignored (falls to heightM)',
     mastLower({ rig: 'gaff', truckM: 58, heightM: 33.5 }, steelMain) === 33.5);
  ok('truckM beats a coexisting heightM',
     Math.abs(mastLower({ rig: 'square', truckM: 58, heightM: 30 }, steelMain)
              - 58 / 1.708) < 1e-12);
}

/* ── 4. the yard record: courseYardM 32 puts the royal at the record's OWN 16 ───── */
{
  const SHARES = { course: 1.000, ltop: 0.93, utop: 0.85, ltg: 0.73, utg: 0.62, royal: 0.50 };
  const lower = 58 / 1.708;
  const courseL = 32.0;                       // attested — replaces lower*0.875
  ok('royal lands the record\'s 16 m', Math.abs(courseL * SHARES.royal - 16.0) < 1e-9,
     `royal ${courseL * SHARES.royal}`);
  ok('derived course would have been short',
     Math.abs(lower * 0.875 - 29.713) < 0.001, `derived ${lower * 0.875}`);
  /* the three-yard path (no yards list) takes the same attested course length */
  const yl = si => si === 0 ? courseL : si === 1 ? courseL * 0.714 : courseL * 0.714 * 0.667;
  ok('three-yard path course = attested', yl(0) === 32.0);
  ok('three-yard path topsail from attested course', Math.abs(yl(1) - 22.848) < 1e-9);
}

/* ── 5. the r155 audit predicate against both forms ─────────────────────────────── */
{
  const TOL = 0.75;
  const audits = (span, truckM) => Math.abs(span - truckM) > TOL;
  const oldSpan = drawnStack(30).truck;         // the committed form: heightM 30
  ok('old form convicts', audits(oldSpan, 58.0),
     `span ${oldSpan.toFixed(2)} vs 58 — short ${(58 - oldSpan).toFixed(2)}`);
  const newSpan = drawnStack(mastLower({ rig: 'square', truckM: 58 }, 0)).truck;
  ok('new form passes at 0.000', !audits(newSpan, 58.0),
     `span ${newSpan.toFixed(6)}`);
  /* and the conviction the injection run must print: 6.76 m short */
  ok('injection number is 6.76', Math.abs((58 - oldSpan) - 6.76) < 0.005,
     `short ${(58 - oldSpan).toFixed(3)}`);
}

/* ── 6. five masts, one figure — the drawn rig is the uniform wall ──────────────── */
{
  const masts = [0.16, 0.34, 0.52, 0.70, 0.86].map(at =>
    ({ at, rig: 'square', truckM: 58.0 }));
  const trucks = masts.map(mk => drawnStack(mastLower(mk, 0)).truck);
  ok('all five trucks equal', trucks.every(t => Math.abs(t - trucks[0]) < 1e-12),
     trucks.map(t => t.toFixed(3)).join(' '));
  /* the OLD data's taper, for the record of what changes: 27/30/30/29/25 */
  const olds = [27, 30, 30, 29, 25].map(h => drawnStack(h).truck);
  ok('old rig tapered 46.1–51.2', Math.abs(olds[0] - 46.116) < 0.001
     && Math.abs(olds[4] - 42.70) < 0.001, olds.map(t => t.toFixed(1)).join(' '));
}

console.log(`\n${checks - fails}/${checks} checks passed${fails ? ' — ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
