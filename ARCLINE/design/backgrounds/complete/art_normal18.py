from art_core import Scene

def make():
 s=Scene('normal-18','要塞の重層門',18,'黒青の石と鈍い真鍮の要塞。右手前の巨大な角門から左奥へ、閉鎖された扉が段階的に重なる。丸い遺跡の門ではなく、鋭い切断面と厚い引き戸で防護機構の重さを描く。',{
 'sky':'#C4CDD7','air':'#DFDECF','far':'#A6B1C0','farShade':'#8D9CAC','stone':'#7C8C9F','stoneLit':'#A8B4BC','stoneShade':'#65798F','deep':'#526A82',
 'edge':'#C3B89B','edgeLit':'#DDD0AE','iron':'#637689','ironLit':'#8F9EAA','ironShade':'#485E78','door':'#82929E','doorShade':'#6B7D8C',
 'floor':'#A3ABB0','floorLit':'#C6C7BA','floorShade':'#7E909E','wall':'#96A4AE'})
 s.base()
 s.p('air','M0 207 L418 149 L558 222 L0 425 Z','air')
 s.p('far','M0 385 L112 348 L232 367 L321 330 L429 376 L553 349 L663 395 L847 359 L1120 388 V604 H0 Z','far')
 s.p('floor','M0 491 L336 450 L661 470 L1120 420 V604 H0 Z','middle')
 s.p('floorShade','M0 572 L301 518 L478 555 L782 517 L1120 545 V604 H0 Z','middle')
 # Far closed door, then a middle frame, then the close right-side bastion.
 s.p('wall','M315 213 L567 179 L734 235 L740 499 L328 522 Z','back-structure','continuous fortress wall anchors the far closed gate')
 s.p('wall','M371 260 L575 233 L644 270 V484 L375 506 Z','back-structure')
 s.p('doorShade','M405 290 L573 269 L574 473 L407 490 Z','back-structure')
 s.p('door','M414 300 L566 283 V463 L415 478 Z','back-structure')
 s.p('ironShade','M482 291 L493 290 V471 L482 473 Z','back-structure')
 s.p('ironLit','M415 350 L565 333 V347 L415 364 Z','back-structure')
 s.p('ironLit','M415 415 L565 399 V412 L415 430 Z','back-structure')
 s.p('edge','M371 260 L575 233 L644 270 L621 278 L573 253 L386 278 Z','back-structure')
 s.p('stone','M248 169 L291 163 L303 507 L260 520 Z','structure')
 s.p('stoneShade','M291 163 L317 179 L328 493 L303 507 Z','structure')
 s.p('stoneLit','M248 169 L262 167 L276 515 L260 520 Z','structure')
 s.p('stone','M657 189 L698 177 L715 484 L675 494 Z','structure')
 s.p('deep','M698 177 L724 192 L740 470 L715 484 Z','structure')
 s.p('stoneLit','M657 189 L671 185 L690 490 L675 494 Z','structure')
 s.p('stoneLit','M224 154 L490 118 L748 165 L728 190 L490 148 L247 180 Z','structure')
 s.p('stoneShade','M247 180 L490 148 L728 190 L727 211 L490 172 L249 201 Z','structure')
 s.p('edge','M247 180 L490 148 L728 190 L727 198 L490 158 L248 189 Z','structure')
 s.p('stone','M914 0 L1120 37 V604 H875 L846 208 Z','near')
 s.p('deep','M1023 23 L1120 37 V604 H1013 L974 256 Z','near')
 s.p('stoneLit','M914 0 L940 5 L873 215 L902 604 H875 L846 208 Z','near')
 s.p('edge','M0 0 H1120 V65 L899 48 L873 114 L855 108 L876 42 L0 82 Z','near')
 s.p('stoneShade','M0 82 L876 42 L855 108 L0 133 Z','near')
 s.p('edgeLit','M0 0 H1120 V18 L884 16 L0 52 Z','near')
 s.p('iron','M36 119 L87 110 L105 551 L54 565 Z','structure')
 s.p('ironShade','M87 110 L111 122 L128 536 L105 551 Z','structure')
 s.p('ironLit','M36 119 L50 116 L69 561 L54 565 Z','structure')
 s.p('edge','M48 265 L100 258 L101 279 L50 288 Z','structure')
 s.p('edge','M60 422 L106 414 L107 438 L61 447 Z','structure')
 for c,d in [('floorLit','M735 568 L870 535 L948 551 L813 591 Z'),('floorShade','M813 591 L948 551 V572 L815 604 Z'),
 ('floorLit','M778 530 L876 505 L937 519 L838 548 Z'),('floorShade','M838 548 L937 519 V537 L840 565 Z'),
 ('floorLit','M819 495 L882 478 L925 489 L862 509 Z'),('floorShade','M862 509 L925 489 V507 L864 524 Z')]:s.p(c,d,'structure')
 return s.data
