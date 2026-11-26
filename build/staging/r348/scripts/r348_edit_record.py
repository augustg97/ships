#!/usr/bin/env python3
"""r348: the 74's crossjack read names the top's new height. usage: r348_edit_record.py <web dir>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'data' / 'vessels.json'; s = p.read_text()
old = "The builder stands the top's centre at 0.90 of the lower mast, so the crossjack hangs at 0.845 x 0.90 of the lower mast;"
new = ("Until r348 the builder stood the top's centre at 0.90 of the lower mast; since r348 it stands under Steel's masthead "
       "(4 inches to every yard of the whole mizzen mast, 3.12 m), at 0.846 of the lower, and the crossjack hangs at 0.845 of "
       "the deck-to-top height under it, so the yard came down with the top;")
assert s.count(old) == 1; p.write_text(s.replace(old, new)); print('r348_edit_record: ok')
