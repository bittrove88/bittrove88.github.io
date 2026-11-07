from art_core import Scene,annulus

def make():
 s=Scene('final-100-1','アークハート内殻 — 空の搬送層',19,'外殻の奥で、搬送層が大きく空へ開く。見上げる楕円の搬送環、天井から下がる保全構造、はるか下の雲。浮遊戦場のために床を描かず、空隙と高さを主役にする。',{
 'sky':'#BFDDDA','high':'#98BFC9','air':'#D6E7DE','cloud':'#EEEAD8','cloudShade':'#C5DBD5','cloudBlue':'#A8C7CE',
 'far':'#A4C3BB','steel':'#7EA49B','steelLit':'#A9C2AE','steelShade':'#5E8990','deep':'#4F7887',
 'cream':'#D5D0B2','creamLit':'#E9E1C3','creamShade':'#B1B79E','brass':'#B59D70','brassLit':'#D1B889','glass':'#C8DDD1'},kind='final',stage=100,map_index=1)
 s.base()
 s.p('high','M0 0 H1120 V115 C954 139 811 101 655 126 C441 158 218 113 0 148 Z','air')
 s.p('air','M0 293 C153 257 308 301 469 274 C673 238 883 284 1120 245 V604 H0 Z','air')
 s.p('far','M0 0 H89 L119 195 L92 384 L142 552 H0 Z','far')
 s.p('far','M1120 0 H1042 L1010 187 L1037 361 L992 540 H1120 Z','far')
 s.p('cloudShade','M0 478 C145 437 265 488 404 452 C589 407 767 470 916 426 C1002 401 1069 424 1120 409 V604 H0 Z','middle')
 s.p('cloud','M0 549 C163 508 295 557 450 519 C636 472 815 544 1120 482 V604 H0 Z','middle')
 s.p('cloudBlue','M0 599 C175 564 307 608 493 574 C713 533 924 595 1120 552 V604 H0 Z','middle')
 # Perspective changes: a shallow ellipse overhead, rather than a standing door.
 annulus(s,'steelShade',550,22,429,151,25,'back-structure')
 annulus(s,'cream',550,18,387,125,15,'back-structure')
 s.p('brass','M219 103 L240 113 L228 134 L209 124 Z','structure')
 s.p('brass','M854 105 L875 94 L886 115 L865 127 Z','structure')
 s.p('steel','M0 0 H67 L178 137 L157 151 L43 22 H0 Z','structure')
 s.p('creamLit','M43 0 H66 L178 137 L166 145 L52 17 Z','structure')
 s.p('steel','M1120 0 H1049 L931 140 L953 154 L1066 23 H1120 Z','structure')
 s.p('cream','M1049 0 H1072 L943 148 L931 140 Z','structure')
 # Distant suspended maintenance members, clearly tied to the roof.
 s.p('steel','M268 0 H317 L327 234 L326 259 L277 271 L276 241 Z','structure')
 s.p('cream','M268 0 H282 L290 236 L290 266 L277 271 L276 241 Z','structure')
 s.p('steelShade','M317 0 H329 L340 229 L338 254 L326 259 L327 234 Z','structure')
 s.p('steelLit','M288 81 L322 80 V96 L289 98 Z','structure')
 s.p('steelLit','M293 168 L325 165 V182 L294 187 Z','structure')
 s.p('steel','M831 0 H876 L870 198 L870 221 L828 232 L827 204 Z','structure')
 s.p('creamLit','M831 0 H843 L839 199 L840 229 L828 232 L827 204 Z','structure')
 s.p('steelShade','M876 0 H887 L882 194 L881 217 L870 221 L870 198 Z','structure')
 s.p('steelLit','M833 88 L875 86 V101 L833 103 Z','structure')
 # The close corner structure leaves a continuous open drop in the middle.
 s.p('steelShade','M0 251 L108 275 L153 423 L110 456 L0 438 Z','near')
 s.p('steel','M0 251 L108 275 L110 293 L0 272 Z','near')
 s.p('cream','M104 275 L118 278 L166 425 L153 423 Z','near')
 s.p('steelShade','M1120 236 L1024 260 L979 407 L1015 439 L1120 423 Z','near')
 s.p('steel','M1120 236 L1024 260 L1020 278 L1120 257 Z','near')
 s.p('cream','M1024 260 L1011 263 L966 409 L979 407 Z','near')
 s.p('brass','M25 310 L87 322 L92 338 L25 327 Z','near')
 s.p('brass','M1120 298 L1054 311 L1048 327 L1120 315 Z','near')
 s.data.update(relay=['sora','rico','hibari'],storyReferences=['assets/cinematics/E01-01.jpeg','docs/change-requests/ARCLINE_FINAL_100_v0.21.3.md'],spoilerScope='stage100 map1 only; no registered-return lights')
 return s.data
