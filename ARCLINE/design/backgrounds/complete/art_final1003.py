from art_core import Scene,annulus

def make():
 s=Scene('final-100-3','アークハート中枢 — 帰還照合室',19,'古い保全中枢の最後の照合室。頭上の巨大な支持環、斜めのクリーム色の補強材、十個の未点灯の照合口。暖かな採光と静かな中央の余白で、最後の一射の向こうにある帰還を待つ場所を描く。',{
 'sky':'#B3C3AC','wall':'#9FB6A0','wallLit':'#C0CAB0','wallShade':'#87A58F','deep':'#567E7D',
 'light':'#DDD0A8','lightLit':'#EEE0BA','glass':'#CAD8BF','steel':'#70988E','steelLit':'#9DB7A1','steelShade':'#527D7E',
 'cream':'#D1C7A5','creamLit':'#E7D9B5','creamShade':'#ACA98D','brass':'#B59D70','brassLit':'#D1B889','brassShade':'#928A69',
 'port':'#658584','portDeep':'#527577','panel':'#B6B493','panelLit':'#D3C6A4','panelShade':'#8F9D88',
 'floor':'#A5B296','floorLit':'#C4C4A1','floorShade':'#819D87'},kind='final',stage=100,map_index=3)
 s.base()
 s.p('wall','M0 0 H1120 V604 H0 Z','far')
 s.p('wallLit','M274 98 L558 49 L876 106 L904 477 L694 516 L393 490 L250 514 Z','far')
 s.p('light','M497 0 H840 L783 289 L650 347 H461 L486 254 Z','far')
 s.p('lightLit','M586 0 H682 L642 286 L579 331 H541 L562 249 Z','far')
 s.p('glass','M793 0 H875 L823 271 L783 289 Z','far')
 s.p('steelShade','M777 0 H794 L748 310 L730 319 Z','back-structure')
 s.p('wallShade','M0 0 H182 L207 604 H0 Z','far')
 s.p('wallShade','M1120 0 H969 L944 604 H1120 Z','far')
 s.p('floor','M0 506 L268 473 L554 495 L832 457 L1120 486 V604 H0 Z','middle')
 s.p('floorShade','M0 581 L254 535 L495 565 L782 522 L1120 550 V604 H0 Z','middle')
 annulus(s,'creamShade',576,745,465,192,28,'middle')
 annulus(s,'floorLit',576,745,424,163,11,'middle')
 # Ceiling architecture surrounds empty air: the real guardian remains the only core.
 annulus(s,'steelShade',559,-171,590,426,52,'back-structure')
 annulus(s,'cream',559,-171,539,377,35,'back-structure')
 annulus(s,'brass',559,-171,493,337,12,'back-structure')
 s.p('cream','M151 0 H195 L314 604 H272 Z','structure')
 s.p('creamLit','M151 0 H167 L289 604 H272 Z','structure')
 s.p('creamShade','M195 0 H215 L334 604 H314 Z','structure')
 s.p('cream','M1004 0 H1044 L904 604 H865 Z','structure')
 s.p('creamLit','M1004 0 H1018 L878 604 H865 Z','structure')
 s.p('creamShade','M1044 0 H1061 L922 604 H904 Z','structure')
 # Discrete large structural clamps, not bolts/noise/texture.
 for c,d in [('brass','M139 88 L162 71 L179 96 L157 112 Z'),('brassLit','M271 170 L294 158 L307 182 L285 194 Z'),
 ('brass','M812 170 L833 154 L849 179 L828 194 Z'),('brassLit','M952 89 L974 72 L991 97 L969 113 Z')]:s.p(c,d,'structure')
 s.p('steelShade','M0 237 H203 L240 259 L217 280 H0 Z','structure')
 s.p('steelLit','M0 237 H203 L240 259 L223 265 L201 251 H0 Z','structure')
 s.p('brass','M0 236 H203 L221 248 L205 253 L198 246 H0 Z','structure')
 s.p('steelShade','M1120 217 H960 L915 246 L936 269 H1120 Z','structure')
 s.p('steelLit','M1120 217 H960 L915 246 L930 254 L964 232 H1120 Z','structure')
 s.p('brass','M1120 216 H960 L938 230 L953 236 L967 226 H1120 Z','structure')
 # E02-01 reference: ten dormant maintenance/return lenses, fixed and unlit.
 s.p('panelShade','M0 310 L247 300 L282 449 L0 475 Z','structure')
 s.p('panel','M0 310 L227 302 L257 438 L0 461 Z','structure')
 s.p('panelLit','M0 310 L227 302 L247 312 L0 325 Z','structure')
 s.p('panelShade','M227 302 L247 300 L282 449 L257 438 Z','structure')
 for row in [0,1]:
  for x in [28,73,118,163,208]:
   y=348+row*59-x*.035
   s.e('brassShade',x,y,17,19,'structure','unlit return lens surround')
   s.e('port',x,y,12,14,'structure','dormant; never a live return counter')
   s.p('portDeep',f'M{x-12} {y} a12 14 0 0 0 24 0 Z','structure','dark unlit lens face; no light, glow or progress state')
 s.p('steelShade','M0 461 L257 438 L282 449 L277 480 L0 505 Z','structure')
 s.p('steel','M43 499 L67 496 L76 569 L52 576 Z','structure')
 s.p('steel','M212 483 L235 480 L243 551 L220 558 Z','structure')
 s.p('creamShade','M957 375 L1041 358 L1120 379 V463 L989 487 L961 463 Z','structure')
 s.p('cream','M957 375 L1041 358 L1120 379 V392 L1043 376 L973 393 Z','structure')
 s.p('brass','M986 413 L1052 400 L1054 416 L989 431 Z','structure')
 s.p('steelShade','M0 604 V578 L131 547 L233 580 L262 604 Z','near')
 s.p('deep','M1120 558 L1043 534 L958 572 L930 604 H1120 Z','near')
 s.data.update(relay=['gun'],storyReferences=['design/narrative_0_13.json:world.heart_secret','assets/cinematics/E01-01.jpeg','assets/cinematics/E02-01.jpeg'],spoilerScope='stage100 map3 only; all ten lenses stay unlit until the existing epilogue')
 return s.data
