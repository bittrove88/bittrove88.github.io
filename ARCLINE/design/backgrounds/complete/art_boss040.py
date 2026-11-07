from art_core import Scene

def make():
 s=Scene('boss-040','プリズム・ガーディアン — 多面の守護廊',7,'葡萄色の城壁の内側へ。多面体の張り出しと琥珀色の継ぎ目が、青い鉱石板を囲む。丸い門や自然の水晶柱は使わず、加工された鉱物の広い面で守護廊を描く。',{
 'sky':'#B69EBA','air':'#CFB5C4','far':'#B198B2','wall':'#9C708F','wallLit':'#C18FA4','wallShade':'#805877','deep':'#674C6D',
 'rose':'#C8A0B7','roseLit':'#E0BCCC','roseShade':'#A77D9D','blue':'#8CA7BF','blueLit':'#B6CAD2','blueShade':'#6E87AC',
 'gold':'#CBB08A','goldLit':'#E3CCA4','floor':'#A68DAB','floorLit':'#C5A9BF','floorShade':'#887491'})
 s.base()
 s.p('air','M229 126 L567 89 L870 143 L943 493 L270 526 Z','far')
 s.p('far','M275 141 L559 118 L869 142 L907 497 L268 526 Z','far','continuous inner wall, without a mountain-like horizon')
 s.p('floor','M0 504 L284 458 L556 485 L847 444 L1120 475 V604 H0 Z','middle')
 s.p('floorShade','M0 577 L302 528 L519 563 L833 515 L1120 549 V604 H0 Z','middle')
 # An irregular cut-stone enclosure, no round portal motif.
 s.p('wall','M0 0 H238 L299 160 L252 321 L295 509 L216 604 H0 Z','land')
 s.p('wallLit','M115 0 H167 L222 152 L179 320 L228 490 L175 604 H132 L171 494 L133 322 L178 157 Z','structure')
 s.p('wallShade','M238 0 L299 160 L252 321 L295 509 L216 604 H175 L228 490 L179 320 L222 152 L167 0 Z','structure')
 s.p('gold','M238 0 L254 0 L316 161 L269 321 L311 511 L233 604 H216 L295 509 L252 321 L299 160 Z','structure')
 s.p('wall','M1120 0 H943 L885 143 L911 311 L863 485 L922 604 H1120 Z','land')
 s.p('deep','M1120 115 L1044 168 L1067 317 L1013 488 L1061 604 H1120 Z','structure')
 s.p('wallLit','M943 0 H972 L919 145 L948 313 L901 485 L948 604 H922 L863 485 L911 311 L885 143 Z','structure')
 s.p('gold','M943 0 H956 L900 143 L927 312 L880 486 L936 604 H922 L863 485 L911 311 L885 143 Z','structure')
 s.p('wallShade','M0 0 H1120 V76 L905 111 L745 78 L563 118 L363 80 L238 118 L0 74 Z','near')
 s.p('rose','M237 0 H543 L563 118 L363 80 L238 118 Z','near')
 s.p('wall','M543 0 H885 L905 111 L745 78 L563 118 Z','near')
 s.p('goldLit','M238 118 L363 80 L563 118 L745 78 L905 111 L901 123 L745 92 L563 131 L363 94 L241 130 Z','near')
 panels=[('blue','M32 225 L84 171 L137 247 L91 339 Z'),('blueLit','M32 225 L84 171 L83 259 L91 339 Z'),
 ('blueShade','M84 171 L137 247 L91 339 L83 259 Z'),('rose','M974 220 L1030 174 L1063 272 L1009 346 Z'),
 ('roseLit','M974 220 L1030 174 L1019 274 L1009 346 Z'),('roseShade','M1030 174 L1063 272 L1009 346 L1019 274 Z'),
 ('wallLit','M351 195 L401 160 L450 191 L399 239 Z'),('wallShade','M401 160 L450 191 L399 239 L408 194 Z'),
 ('wallLit','M697 181 L748 149 L793 179 L744 226 Z'),('wallShade','M748 149 L793 179 L744 226 L754 185 Z')]
 for c,d in panels:s.p(c,d,'structure')
 s.p('floorLit','M380 565 L453 536 L527 555 L452 589 Z','near')
 s.p('floorShade','M453 536 L527 555 L452 589 L463 559 Z','near')
 s.p('deep','M0 604 V561 L134 528 L232 563 L259 604 Z','near')
 s.p('deep','M1120 556 L1026 523 L938 560 L913 604 H1120 Z','near')
 s.data.update(kind='boss',stage=40)
 return s.data
