import sys
P = sys.argv[1]; s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)
rep("""            if (st === 7 && H.machinery && txt.indexOf(H.machinery) < 0)
              say(v.id, 'a last stage card without her machinery', `stage 7 reads "${txt.slice(0, 120)}"`);
          }
        }
      }
    }
""", """            if (st === 7 && H.machinery && txt.indexOf(H.machinery) < 0)
              say(v.id, 'a last stage card without her machinery', `stage 7 reads "${txt.slice(0, 120)}"`);
          }
        }
      }

      /* ── A-STAGE-CARD-SAIL (round 302, 0y¹²⁷): A SAILING HULL'S CARDS SAY WHAT ITS STAGES ADD.
         The eight sailing cards were one fixed list on every hull that sets sail: "carries the guns"
         on the junk and the clipper, "Rudder hung aft" on the trireme and the dhow, which steer with
         quarter rudders, and "Lower mast, topmast, topgallant — each fidded" on every lateen, junk
         and crab-claw pole. This asks SW_STAGE_CARD for stages 3 to 7 with the parts the built hull
         adds at each (a mast mesh's userData.seg gives its mast and piece, as on the page) and
         convicts any card whose claim the parts contradict, either way: guns, a stern rudder,
         quarter rudders, fidded pieces, single poles, shrouds, ratlines, braces; and any rig named
         on the yard, sail or furled card that she does not carry, or carried and not named.
         Stage 0 is the keel on every hull but the dugout: r301's powered composer answered it with
         "Afloat", and an iron or steel hull must not be told its keel is a timber. */
      if (H.build !== 'dugout' && typeof SW_STAGE_CARD === 'function') {
        const k0 = SW_STAGE_CARD(v, 0, []);
        if (!k0 || k0[0] !== 'Keel laid') say(v.id, 'a keel stage that is not the keel', `stage 0 reads "${k0 ? k0.join(' — ').slice(0, 100) : 'nothing'}"`);
        else if ((H.build === 'steel' || H.build === 'iron') && /timber/i.test(k0[1])) say(v.id, 'a metal keel told it is a timber', `stage 0 reads "${k0[1].slice(0, 100)}"`);
      }
      if (setsSail && H.build !== 'dugout') {
        if (typeof SW_STAGE_CARD !== 'function') say(v.id, 'a stage card the audit cannot ask', 'window.SW_STAGE_CARD is not defined');
        else {
          const by = {};
          g.traverse(o => { const p = o.userData && o.userData.part; if (!p || p.stage < 3) return;
            const sg = o.userData.seg;
            (by[p.stage] = by[p.stage] || []).push(sg ? { key: p.key, name: p.name, mi: sg.mi, si: sg.si } : { key: p.key, name: p.name }); });
          const rigs = new Set((H.masts || []).map(m => m.rig));
          const card = {};
          for (let st = 3; st <= 7; st++) {
            const c = SW_STAGE_CARD(v, st, by[st] || []);
            if (!c) { say(v.id, 'a stage with no card', `stage ${st}`); continue; }
            card[st] = c[0] + ' — ' + c[1];
            const has = k => (by[st] || []).some(p => p.key === k);
            const claim = (what, said, built) => { if (said !== built)
              say(v.id, 'a sailing stage card that misstates what the stage adds',
                  `stage ${st}: the card ${said ? 'names' : 'omits'} ${what}, which the built hull ${built ? 'adds' : 'does not add'} here: "${card[st].slice(0, 140)}"`); };
            claim('guns', /\\bguns\\b/i.test(card[st]), has('gun'));
            claim('a stern rudder', /a rudder hung/i.test(card[st]), has('rudder'));
            claim('quarter rudders', /quarter rudder/i.test(card[st]), has('quarterRudder'));
            claim('ratlines', /ratline/i.test(card[st]), has('ratline'));
            claim('braces', /\\bbraces\\b/i.test(card[st]), has('brace'));
            if (/driven by the wind rather than carried/i.test(card[st])) say(v.id, 'a sailing stage card that gestures', `stage ${st}: "${card[st].slice(0, 120)}"`);
            if (st === 4) {
              const pcs = {};
              for (const p of by[4] || []) if (p.key === 'mast' && p.mi !== undefined) pcs[p.mi] = Math.max(pcs[p.mi] || 0, (p.si || 0) + 1);
              const vals = Object.values(pcs);
              claim('a fidded piece', /\\bfid\\b|fidded|topmast|topgallant/i.test(card[st]), vals.some(n => n > 1));
              claim('a single pole', /single pole/i.test(card[st]), vals.some(n => n === 1));
            }
            if (st === 5) {
              claim('shrouds', /^Rigged — Shrouds run/.test(card[st]), has('shroud'));
              claim('stays', /\\bStays hold\\b/.test(card[st]), has('stay'));
            }
            if (st >= 6) {
              const RIGW = { square: /square/i, lateen: /lateen/i, gaff: /\\bgaffs?\\b/i, junk: /batten/i, crabclaw: /crab-claw/i };
              for (const [rig, re] of Object.entries(RIGW)) claim(`the ${rig} rig`, re.test(card[st]), rigs.has(rig));
            }
          }
          if (typeof SW_FURLED_CARD === 'function') {
            const f = SW_FURLED_CARD(v);
            const txt = f[0] + ' — ' + f[1];
            const RIGF = { square: /square sails/i, lateen: /lateen/i, gaff: /gaff sails/i, junk: /battened/i, crabclaw: /crab-claw/i };
            for (const [rig, re] of Object.entries(RIGF)) if (re.test(txt) !== rigs.has(rig))
              say(v.id, 'a furled card that misnames her rig', `the ${rig} rig is ${rigs.has(rig) ? 'carried and not named' : 'named and not carried'}: "${txt.slice(0, 140)}"`);
          } else say(v.id, 'a furled card the audit cannot ask', 'window.SW_FURLED_CARD is not defined');
        }
      }
    }
""")
open(P, 'w').write(s); print('ok')
