    /* (r184) THE FOUR-CLAW IRON ANCHORS THE TWO TGK CHAPTERS CARRY. 錘鍛 forges the
       form (four claws joined to a shank, fetched whole r184); 舟車 counts the
       inventory (five or six, the 500-catty sheet anchor, two at the head).
       V-WARRANT both ways, as the grapnel and stone rules. V-COUNT: drawn anchor
       assemblies, found STRUCTURALLY as the group's ring tori, equal what the record
       draws (sheet + pair). V-CLAWS: four cone points per anchor — the forging
       text's own count. V-SHANK: each shank's longest drawn dimension through any
       stow transform, sorted against the record's sheet and bower lengths. V-REST:
       each assembly's lowest point ON the deck at its own station, asked of the
       surface itself. V-CABLE: one cable per anchor — the 舟車 sentence carries
       anchor, cable, posts and winch together; a loose anchor convicts. */
    {
      const im = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'ironAnchors') im.push(o); });
      if (im.length && !H.ironAnchors)
        say(v.id, 'an anchor the record does not carry',
            `${im.length} iron-anchor meshes drawn with no ironAnchors field — this `
            + "hull's record is silent, and silence draws nothing");
      if (H.ironAnchors && !im.length)
        say(v.id, 'declared but not drawn', 'ironAnchors');
      if (H.ironAnchors && im.length) {
        const R = H.ironAnchors;
        const want = (R.sheetShankM !== 0 ? 1 : 0) + (R.bowerShankM !== 0 ? 2 : 0);
        const rings = im.filter(o => o.geometry.type === 'TorusGeometry');
        if (rings.length !== want)
          say(v.id, "the anchors off the record's count",
              `${rings.length} head rings drawn — the record's bow-worked set is ${want}`);
        const tips = im.filter(o => o.geometry.type === 'ConeGeometry');
        if (tips.length !== want * 4)
          say(v.id, 'an iron anchor without its four claws',
              `${tips.length} claw points drawn for ${want} anchors — the forging text `
              + 'makes four claws first');
        const shanks = im.filter(o => o.name === 'ia-shank')
          .map(o => { const b = new THREE.Box3().setFromObject(o);
            return Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z); })
          .sort((a, b2) => b2 - a);
        const wantSh = [];
        if (R.sheetShankM !== 0) wantSh.push(R.sheetShankM || 2.4);
        if (R.bowerShankM !== 0) wantSh.push(R.bowerShankM || 2.0, R.bowerShankM || 2.0);
        wantSh.sort((a, b2) => b2 - a);
        for (let i = 0; i < Math.min(shanks.length, wantSh.length); i++)
          if (Math.abs(shanks[i] - wantSh[i]) > 0.12 * wantSh[i])
            say(v.id, "a shank off the record's length",
                `shank ${shanks[i].toFixed(2)} m drawn, the record's is ${wantSh[i]}`);
        const HSi = SHIPS_HULL.hullSurface(H);
        const grps = [];
        g.traverse(o => { const p = tagOf(o);
          if (o.isGroup && o.name === 'ia-grp' && p && p.key === 'ironAnchors')
            grps.push(o); });
        for (const gr of grps) {
          const bb = new THREE.Box3().setFromObject(gr);
          const ui = Math.max(0, Math.min(1,
            ((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
          const deckI = HSi.sheer(ui);
          if (bb.min.y > deckI + 0.25)
            say(v.id, 'an anchor floating over its own deck',
                `lowest point ${(bb.min.y - deckI).toFixed(2)} m above the deck at u ${ui.toFixed(2)}`);
          if (bb.min.y < deckI - 0.20)
            say(v.id, 'an anchor through the planking',
                `lowest point ${(deckI - bb.min.y).toFixed(2)} m below the deck at u ${ui.toFixed(2)}`);
        }
        const cables = im.filter(o => o.name === 'ia-cable');
        if (cables.length !== want)
          say(v.id, 'an iron anchor with no cable',
              `${cables.length} cables for ${want} anchors — the text belays every one `
              + 'to the posts and the winch');
      }
    }
