#!/usr/bin/env python3
"""r363: HULL_FRAG cuts each tier's port between uTierPortLo and uTierPortHi. Usage: r363_edit_shader.py <shaders dir>"""
import sys
p = sys.argv[1] + '/HULL_FRAG.frag.glsl'; s = open(p).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]; s = s.replace(old, new)
rep("uniform vec4  uTierLo, uTierHi, uTierPort;",
    "uniform vec4  uTierLo, uTierHi;\n/* r363: each tier's ports' sill and head in v (hull.js tierPortRows: Steel's where recorded, else the class band\n   0.023 either side of the old centre, so an unrecorded hull draws as before) */\nuniform vec4  uTierPortLo, uTierPortHi;")
rep("""        float lo = uTierLo[d], hi = uTierHi[d], pc = uTierPort[d];""",
    """        float lo = uTierLo[d], hi = uTierHi[d], pl = uTierPortLo[d], ph = uTierPortHi[d];""")
rep("""        port = max(port, smoothstep(0.030, 0.016, abs(v - pc))
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));""",
    """        port = max(port, smoothstep(pl - 0.007, pl + 0.007, v) * smoothstep(ph + 0.007, ph - 0.007, v)
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));""")
open(p, 'w').write(s); print('shader edited')
