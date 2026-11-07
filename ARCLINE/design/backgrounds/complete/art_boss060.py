from art_core import Scene

def make():
 s=Scene('boss-060','ホワイトハウル — 吹雪の風除け',11,'凍てつく峡谷の白と青緑の氷を受け継ぐ吹雪の吹き溜まり。右上から迫る雪雲、左の厚い雪庇、雪に埋もれた風除け。細い風線や粒子を使わず、広い雪の面で圧力を描く。',{
 'sky':'#B9D1DD','air':'#D5E5E7','cloud':'#A3BDCD','cloudShade':'#8EAABE','snow':'#EBF1E6','snowLit':'#F7F6ED','snowShade':'#C4DCE0','snowBlue':'#ACCBD6',
 'ice':'#86B9CB','iceLit':'#B3D7DD','iceShade':'#6F9FB9','iceDeep':'#5E87A6','far':'#9AB9CF','fence':'#A8B5B8','fenceLit':'#D0D4CA','fenceShade':'#839DAA'})
 s.base()
 s.p('air','M0 215 C203 171 367 216 537 184 C737 145 936 193 1120 153 V604 H0 Z','air')
 s.p('cloud','M546 0 H1120 V214 C1044 196 992 224 938 201 C868 176 823 205 765 187 C691 168 647 201 583 178 C623 126 584 66 546 0 Z','air')
 s.p('cloudShade','M780 0 H1120 V135 C1053 111 988 140 927 116 C867 92 837 119 791 105 Z','air')
 s.p('far','M212 415 L330 334 L424 368 L512 298 L608 382 L709 341 L822 401 L944 356 L1120 389 V604 H183 Z','far')
 s.p('snowBlue','M0 495 C168 456 308 487 444 451 C652 401 815 464 1120 412 V604 H0 Z','middle')
 s.p('snow','M0 545 C152 493 268 532 412 501 C606 458 794 515 1120 455 V604 H0 Z','middle')
 s.p('snowShade','M0 596 C194 544 359 592 531 548 C725 500 897 554 1120 511 V604 H0 Z','middle')
 s.p('ice','M0 125 L89 94 L154 126 L181 215 L163 303 L201 405 L174 526 L207 604 H0 Z','land')
 s.p('iceLit','M0 125 L89 94 L107 112 L88 230 L105 315 L79 424 L104 604 H55 L38 419 L66 313 L49 227 Z','land')
 s.p('iceShade','M107 112 L154 126 L181 215 L163 303 L201 405 L174 526 L207 604 H147 L132 521 L152 406 L133 304 L147 219 Z','land')
 s.p('snow','M0 91 C74 54 128 90 172 78 C218 105 240 140 219 176 L160 199 L82 184 L0 211 Z','structure')
 s.p('snowLit','M0 91 C74 54 128 90 172 78 C191 89 204 104 214 119 C137 115 91 133 0 126 Z','structure')
 s.p('snowBlue','M0 211 L82 184 L160 199 L219 176 L202 211 L162 228 L81 211 L0 239 Z','structure')
 s.p('ice','M1120 288 L1021 265 L951 310 L938 404 L984 478 L1120 486 Z','land')
 s.p('iceShade','M1120 342 L1057 324 L1028 370 L1045 431 L1022 487 L1120 510 Z','land')
 s.p('snow','M1120 275 C1074 257 1044 279 1019 259 L951 296 L944 329 L970 337 L1026 295 L1120 313 Z','structure')
 # A weathered windbreak partly buried in the snow, not another guardian fan.
 s.p('fenceShade','M0 396 L309 449 V465 L0 411 Z','structure')
 s.p('fenceShade','M0 447 L309 494 V508 L0 462 Z','structure')
 for x,y in [(19,366),(87,377),(155,391),(225,403),(289,416)]:
  s.p('fence',f'M{x} {y} L{x+13} {y+2} L{x+22} {y+100} L{x+8} {y+104} Z','structure')
  s.p('fenceLit',f'M{x} {y} L{x+5} {y+1} L{x+15} {y+102} L{x+8} {y+104} Z','structure')
 s.p('snow','M0 501 C108 461 183 502 264 486 C311 480 354 500 380 523 C248 532 167 558 0 560 Z','near')
 s.p('snowLit','M0 502 C96 474 151 494 210 490 C159 508 94 508 0 535 Z','near')
 s.p('snowShade','M1120 535 C1002 493 917 536 846 518 C799 503 763 518 736 540 C847 552 916 584 930 604 H1120 Z','near')
 s.p('snow','M0 214 C115 180 199 221 291 195 C375 172 451 193 502 221 C399 251 323 231 228 253 C138 273 65 250 0 281 Z','finish')
 s.data.update(kind='boss',stage=60)
 return s.data
