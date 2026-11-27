import sys, os
h = sys.argv[1]; s = open(h).read()
old = """    source: R.provenance ? R.provenance.split('.')[0] : 'record',
    anchor: 'taffrail top = ' + (islT !== null ? 'the island top at u 1' : 'the sheer at u 1') + ', y ' + anchorY.toFixed(2),"""
assert s.count(old) == 1
s = s.replace(old, """    anchorY: +anchorY.toFixed(3),       // the taffrail's top (quarterGallery.registerOn): the island's top at u 1, else the sheer""")
open(h + '.tmp', 'w').write(s); os.replace(h + '.tmp', h); print('ok')
