#!/usr/bin/env python3
"""── MINIFY INTO docs/, NEVER INTO web/ ────────────────────────────────────────────────────

web/ is the source and it is heavily commented on purpose — the comments in this project are
the record of what was tried and why, and several of them are the only place a hard-won fact is
written down. They are also, measured, about a third of the bytes shipped, and first paint is
the one budget that refuses to publish when it is exceeded.

So the source keeps every word and the PUBLISHED copy drops them. Nothing here renames an
identifier, removes a semicolon, or reorders anything: those are the transformations that break
code, and the saving that matters is already in the comments and the indentation.

⚠ AND IT IS A SCANNER, NOT A REGEX. `//` inside a string is not a comment; `/* */` inside a
template literal is not a comment; and `/` is division or the start of a regex literal
depending on the previous significant token, which is the single classic way a naive JS
minifier corrupts a file silently. The state machine below tracks strings, template literals
(including ${...} nesting), regex literals and both comment forms, so each is left alone.

⚠ NEWLINES ARE KEPT. Joining lines would need automatic-semicolon-insertion analysis to be
safe, and the byte saving from removing them is small next to the comments. Not worth the risk
of a fault that appears only on one code path.
"""
import re


def minify_js(src: str) -> str:
    out = []
    i, n = 0, len(src)
    # the previous significant character, for the regex-or-division decision
    prev = ''
    # template-literal nesting: each entry is depth of {} inside a ${ }
    tpl = []
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ''

        if c == '/' and nxt == '/':                      # line comment
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and nxt == '*':                      # block comment
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue

        if c in '"\'':                                   # string
            j = i + 1
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == c: break
                j += 1
            out.append(src[i:j + 1]); prev = c; i = j + 1
            continue

        if c == '`':                                     # template literal
            j = i + 1
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '`': break
                if src[j] == '$' and j + 1 < n and src[j + 1] == '{':
                    depth = 1; j += 2
                    while j < n and depth:
                        if src[j] == '{': depth += 1
                        elif src[j] == '}': depth -= 1
                        elif src[j] in '"\'`':
                            q = src[j]; j += 1
                            while j < n and src[j] != q:
                                j += 2 if src[j] == '\\' else 1
                        j += 1
                    continue
                j += 1
            out.append(src[i:j + 1]); prev = '`'; i = j + 1
            continue

        if c == '/':                                     # regex literal, or division
            # a regex may begin only where a value may begin
            if prev in '' or prev in '(,=:[!&|?{};+-*%~^<>' or prev == '':
                j = i + 1; cls = False
                while j < n:
                    if src[j] == '\\': j += 2; continue
                    if src[j] == '[': cls = True
                    elif src[j] == ']': cls = False
                    elif src[j] == '/' and not cls: break
                    elif src[j] == '\n': break
                    j += 1
                if j < n and src[j] == '/':
                    j += 1
                    while j < n and src[j].isalpha(): j += 1   # flags
                    out.append(src[i:j]); prev = '/'; i = j
                    continue
            out.append(c); prev = c; i += 1
            continue

        out.append(c)
        if not c.isspace():
            prev = c
        i += 1

    text = ''.join(out)
    # drop indentation and blank lines; keep the line breaks themselves
    lines = [ln.rstrip() for ln in text.split('\n')]
    return '\n'.join(ln.lstrip() for ln in lines if ln.strip())


def minify_css(src: str) -> str:
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    lines = [ln.strip() for ln in src.split('\n')]
    return '\n'.join(ln for ln in lines if ln)


if __name__ == '__main__':
    import sys, os
    tot_a = tot_b = 0
    for path in sys.argv[1:]:
        raw = open(path, encoding='utf-8').read()
        out = minify_css(raw) if path.endswith('.css') else minify_js(raw)
        open(path, 'w', encoding='utf-8').write(out)
        tot_a += len(raw.encode()); tot_b += len(out.encode())
        print(f'  {os.path.basename(path):22s} {len(raw)/1000:7.1f} kB -> {len(out)/1000:7.1f} kB')
    if tot_a:
        print(f'  total {tot_a/1e6:.2f} MB -> {tot_b/1e6:.2f} MB '
              f'({100*(tot_a-tot_b)/tot_a:.0f}% saved)')
