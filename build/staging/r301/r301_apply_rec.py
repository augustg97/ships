import json, sys
P = sys.argv[1]
d = json.load(open(P))
WP = lambda page: f"Wikipedia, *{page}* (read 2026-11-24, r301)"
M = {
 'titanic': ("Two four-cylinder triple-expansion steam engines, 30,000 hp between them, turned her two wing propellers. Their exhaust steam drove a 16,000 hp low-pressure Parsons turbine on the centre propeller. The steam came from 29 coal-fired boilers with 159 furnaces, which took more than 600 tonnes of coal a day, shovelled by hand.",
   WP('RMS Titanic') + ", Power: three main engines, the two reciprocating engines 30,000 hp combined and the turbine 16,000 hp; 29 boilers (24 double-ended, 5 single-ended), 159 furnaces; over 600 tonnes of coal a day shovelled by 176 firemen. That the turbine ran on the reciprocating engines' exhaust steam is the standard description of the Olympic class's combination machinery; the quoted passage states the engines and outputs, not the steam path."),
 'dreadnought': ("Parsons direct-drive steam turbines, the first in any battleship, turned four propellers: 23,000 shp from 18 Babcock & Wilcox boilers. They burned coal, with fuel oil sprayed on it to make it burn faster. On trials in October 1906 she made 21.6 knots.",
   WP('HMS Dreadnought (1906)') + ", Propulsion: two paired sets of direct-drive turbines, each driving two propellers; 18 Babcock & Wilcox boilers at 250 psi; 23,000 shp rated; 21.6 kn from 27,018 shp on trials, 9 October 1906; 2,868 long tons of coal and 1,120 long tons of fuel oil sprayed on the coal."),
 'yamato': ("Four steam turbines on four shafts, fed by 12 Kampon boilers, developed 150,000 shp and gave her 27 knots.",
   WP('Japanese battleship Yamato') + ", infobox: installed power 12 Kampon boilers, 150,000 shp; propulsion 4 shafts, 4 steam turbines; speed 27 kn."),
 'queen-mary-2': ("Four Wärtsilä 16V46 diesels (67,200 kW together) and two General Electric LM2500+ gas turbines (50,000 kW) drive generators. The electricity runs four 21,500 kW motors that sit inside the pods under her stern, outside the hull.",
   WP('RMS Queen Mary 2') + ", Power plant: four Wärtsilä 16V46CR diesels, 67,200 kW combined at 514 rpm; two GE LM2500+ gas turbines, a further 50,000 kW; generators driving four 21,500 kW Alstom motors inside the podded propulsors, outside the hull."),
 'carrier': ("Two A1B nuclear reactors make steam. It drives the turbines on her four shafts and four turbine generators, which supply the ship's electricity, including the electromagnetic catapults.",
   WP('Gerald R. Ford-class aircraft carrier') + ": two A1B reactors per ship; steam piped to four main turbine generators for ship systems and the EMALS catapults; steam turbines for propulsion; four shafts (infobox)."),
 'container': ("Most large container ships have one low-speed two-stroke diesel coupled directly to one fixed-pitch propeller, with no gearbox.",
   WP('Ever Given') + ": 'As with most large container ships, Ever Given's propulsion system consists of a single low-speed two-stroke diesel engine coupled to a large fixed-pitch propeller.' This record is the type, not one ship, so the card states the type's usual plant."),
 'ever-given': ("One 11-cylinder MAN B&W 11G95ME-C9 two-stroke diesel, built under licence by Mitsui, turns her single propeller directly: 59,300 kW at 79 rpm, for a service speed of 22.8 knots. Four Yanmar diesel generators make her electricity, and two 2,500 kW bow thrusters push her bow sideways in port.",
   WP('Ever Given') + ": licence-built Mitsui MAN B&W 11G95ME-C9, 59,300 kW at 79 rpm, service speed 22.8 kn; four Yanmar 8EY33LW auxiliary generators; two 2,500 kW bow thrusters."),
 'azzam': ("A combined diesel and gas-turbine plant of about 94,000 shaft horsepower drives four waterjets, for more than 30 knots.",
   "Her own card in this record (Lürssen; Boat International): roughly 94,000 shp, combined diesel and gas turbine, four waterjets, over 30 kn. Not checked against a builder's specification in r301."),
 'usv': ("No engine drives her. A rigid wing sail, trimmed by its tail vane, gives her way, and solar panels power the instruments.",
   "Her own card in this record (Saildrone and NOAA survey programmes): a Saildrone is driven by wind and sunlight; the model's hull.wingSail and the stage-6 parts (wing sail, tail vane, solar array, instrument mast)."),
}
seen = set()
for v in d['vessels']:
    if v['id'] in M:
        h = v['hull']; assert 'machinery' not in h
        h['machinery'], h['machineryProvenance'] = M[v['id']]; seen.add(v['id'])
assert seen == set(M), set(M) - seen
open(P, 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('ok', len(seen))
