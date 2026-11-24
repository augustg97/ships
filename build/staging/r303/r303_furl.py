p='/Users/augustgweon/Ships/web/css/styles.css'; s=open(p).read()
a="#swNav .mini:hover{border-color:var(--edge-strong);color:var(--ink)}\n"
b=a+"""/* r303 (0y129): the toggle's ON state. `#swNav .mini` (an id and a class) outranks `.mini.on` (two
   classes), so in the furled state the button kept .on's dark text and lost its brass ground:
   'Set sail' was drawn dark on the dark panel and read as a blank button. */
#swNav .mini.on{color:var(--abyss);background:var(--brass);border-color:var(--brass)}
"""
assert s.count(a)==1; open(p,'w').write(s.replace(a,b)); print('ok')
