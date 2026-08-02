# Frame baseline log

Every accepted change, with the reason. A baseline moved without a reason here is a regression nobody noticed.

- **2026-08-02 16:02** · `shipwright` — Weathered sailcloth reaches the artefact at last: flax 0.815 (near paper) to 0.680 with grime accumulating from the foot and leeches inward, applied to web/shaders/SAIL_FRAG.frag.glsl, which is the source of truth. Also the first frame in which the yards are actually braced. Diff is confined to the sails: hulls, deck, sea and panels are unchanged.
- **2026-08-02 16:02** · `action` — Same sailcloth and yard-bracing change seen at sea. 0.079 percent, confined to the canvas of the engaged ships.
- **2026-08-02 16:35** · `ship-dhow` — New frame. The Shipwright is now addressable by hull via #v=ship&s=<id>, so a baseline can target a specific ship instead of whatever the view opens on. This one covers the settee rig, which the audit found the code had been building as a lateen triangle.
- **2026-08-02 16:35** · `ship-junk` — New frame. Covers the battened lug, where the battens must stay inside the canvas when the sail is sheeted out — the fault August reported on 2026-08-02.
- **2026-08-02 16:39** · `ship-dhow` — Re-baselined against the pinned Shipwright camera. The first baseline was captured mid-pan because the view's eased pan and zoom was not frozen; it is now, so the framing is stable. Also carries settee 0.30.
- **2026-08-02 16:39** · `ship-junk` — Re-baselined against the pinned Shipwright camera; the first was captured mid-pan.
