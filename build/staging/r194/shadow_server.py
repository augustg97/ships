#!/usr/bin/env python3
"""r194 pre-land shadow: serve web/ on :8151 with the two staged files
overlaid, so the audit and injections run against the STAGED rest rules before
a byte lands in the live tree the :8149 ratchet is still capturing."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.expanduser('~/Ships/web')
STAGE = os.path.expanduser('~/Ships/build/staging/r194')
MAP = {
    '/js/hull.js': os.path.join(STAGE, 'hull.js'),
    '/audit-hulls.js': os.path.join(STAGE, 'audit-hulls.js'),
}

class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?')[0].split('#')[0]
        if p in MAP:
            return MAP[p]
        return os.path.join(ROOT, p.lstrip('/'))
    def log_message(self, *a):
        pass

os.chdir(ROOT)
ThreadingHTTPServer(('127.0.0.1', 8151), H).serve_forever()
