#!/usr/bin/env python3
"""r178: the dhow windlass judgment — JUDGED SILENT. Row + provenance, nothing drawn."""
import json, io

P = "/Users/augustgweon/Ships/web/data/vessels.json"

ROW = ["Windlass, judged",
    "none is drawn, because none is attested — not on her own wreck, whose only "
    "nautical equipment is the composite grapnel (wooden shank, iron arms); not "
    "anywhere in the tradition's 7th–16th-century survey, which describes the anchors "
    "of every period and no winding machine; and not at its documented end, where "
    "Gulf craft stow the anchor loose on deck or hang it on the *kalba* beam at the "
    "prow, and the winch arrives with the engine. Her grapnel worked by the crew's "
    "direct pull — twelve to thirty hands — is the read backward from that practice "
    "(inference)"]

PROV = ("JUDGED SILENT, r178 — the windlass question for this hull, opened by the "
    "r172 residual, closes with nothing drawn, and this field says why. The drawn "
    "ship is the sewn early type (this record's own steering provenance), the "
    "Belitung wreck's tradition, and the evidence is silent at every documented "
    "point of that tradition. Her own wreck's excavation report, read whole this "
    "round, mentions no windlass, winch or capstan anywhere; the ship's nautical "
    "equipment 'may be represented by a composite grapnel-type anchor, the shank of "
    "wood and the arms of iron' (Flecker, World Archaeology 32:3, 2001) — though the "
    "wreck preserves the lower hull only, so its machine silence is weak and is not "
    "leaned on. What decides is the tradition itself: Agius's Classic Ships of Islam "
    "(Brill 2008), the scholarly survey of this ocean's ships from the 7th to the "
    "16th century, read whole this round, describes the anchors of every period — "
    "Omani stone anchors with sharp-ended timbers fitted through, Indo-Arabian stone "
    "shanks at Siraf (8th–11th c.), Ibn Sida's wood-and-lead anchor recipe (d. "
    "1066), Correia's iron-and-stone and Varthema's marble anchors (16th c.) — each "
    "topped by a hawser hole and a rope, and names no winding machine in gear, crew "
    "roles or terminology anywhere in the book. At the tradition's best-documented "
    "end, the Gulf craft of the last working-sail century stow the anchor loose on "
    "deck or hang it on the kalba cat beam at the prow, take lines to bitts and the "
    "rumaana bollard, and acquire a winch only 'with the advent of power' "
    "(Lockerbie, catnaps.org, fetched whole). Unlike the junk (two primary texts), "
    "the panokseon (the living horong) and the corbita (her own trade's gear list), "
    "this tradition attests no machine at any era to extend from — drawing one would "
    "invent existence, form and place at once, the class of error the r172 Georgian "
    "capstan was. The record stays silent and the builder draws nothing. That her "
    "crew worked the grapnel by direct pull is itself an inference, marked as one on "
    "the card. Named as not fetched: Villiers' Sons of Sinbad (borrow-gated, "
    "search-inside blocked too), Vosmer's reconstruction chapter (403), the PSAS "
    "Jewel of Muscat paper (pay-gated), Agius's two other dhow books — any of them, "
    "fetched and attesting a sail-era machine, reopens the question. Scope: the "
    "judgment is for the drawn sewn trader and the sail tradition as documented; a "
    "powered conversion's winch is a different ship.")

with open(P) as f:
    d = json.load(f)
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
v = next(x for x in vs if x.get("id") == "dhow")
assert "windlass" not in v["hull"], "dhow unexpectedly has a windlass record"
assert not any(r[0] == "Windlass, judged" for r in v["rows"]), "row already present"
v["rows"].append(ROW)
v["hull"]["windlassProvenance"] = PROV
with io.open(P, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print("applied: dhow row + windlassProvenance; no hull.windlass")
