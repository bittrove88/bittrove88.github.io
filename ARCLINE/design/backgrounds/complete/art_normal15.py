from art_core import Scene

def make():
 s=Scene('normal-15','極性の実験棟',15,'白い陶器と青紫の鋼材を使った古い実験棟。左の積層絶縁柱、右の横長コイル、上部の高い採光窓。異なる形の設備を対にし、磁力線や発光する記号は描かない。',{
 'sky':'#CDD4E1','wall':'#DFE0E4','wallShade':'#B5BED4','window':'#EDF0EB','steel':'#7F8BAE','steelLit':'#ADB8C8','steelShade':'#656F98','deep':'#565F87',
 'ceramic':'#E6DFC4','ceramicLit':'#F7ECD3','ceramicShade':'#C3BAA9','coil':'#D4B57D','coilLit':'#EBD2A0','coilShade':'#B29470',
 'copper':'#C68E7D','copperLit':'#E0B09A','copperShade':'#A77F7A','floor':'#B2B7CB','floorLit':'#D0D2DC','floorShade':'#939DBA','wire':'#8E91A3'})
 s.base()
 s.p('wall','M239 0 H1120 V604 H239 Z','far')
 s.p('wallShade','M0 0 H239 L277 604 H0 Z','far')
 s.p('window','M714 0 H1059 L1008 240 L706 262 Z','far')
 s.p('steelLit','M804 0 H819 L783 257 L769 258 Z','back-structure')
 s.p('steelLit','M947 0 H962 L916 246 L902 247 Z','back-structure')
 s.p('steel','M689 0 H715 L705 263 L682 265 Z','back-structure')
 s.p('steelShade','M0 74 L1120 29 V59 L0 106 Z','back-structure')
 s.p('steelLit','M0 74 L1120 29 V39 L0 85 Z','back-structure')
 s.p('floor','M0 478 L309 442 L598 465 L867 420 L1120 441 V604 H0 Z','middle')
 s.p('floorLit','M314 604 L516 476 L704 452 L599 513 L506 604 Z','middle')
 s.p('floorShade','M0 582 L182 543 L335 565 L412 604 H0 Z','middle')
 # Left: ceramic insulator stack on a blue steel foot.
 s.p('steel','M58 438 L193 413 L246 435 L111 469 Z','structure')
 s.p('steelShade','M58 438 L111 469 L246 435 L241 484 L113 516 L61 485 Z','structure')
 s.p('steelLit','M58 438 L193 413 L246 435 L220 441 L191 429 L85 450 Z','structure')
 s.p('ceramicShade','M127 218 H163 L169 434 L134 444 Z','structure')
 for x,y,rx,ry in [(143,402,65,18),(141,361,61,18),(138,320,57,17),(136,280,52,16),(133,240,46,15)]:
  s.e('ceramicShade',x,y+9,rx,ry,'structure')
  s.e('ceramic',x,y,rx,ry,'structure')
  s.e('ceramicLit',x-8,y-4,rx*.73,ry*.63,'structure')
 s.e('copperShade',131,209,26,12,'structure')
 s.e('copperLit',131,204,26,10,'structure')
 s.p('wire','M126 203 L117 121 L151 94 L254 85 V98 L155 108 L133 126 L139 204 Z','structure')
 # Right: a horizontal induction coil, distinct from the ceramic column.
 s.p('steelShade','M1042 269 L1075 278 L1092 311 L1098 392 L1074 388 L1064 380 L1065 289 Z','structure','rear endplate attached to the induction coil')
 s.p('coil','M886 308 C853 344 866 395 905 407 L1064 380 C1103 355 1101 308 1065 289 Z','structure')
 s.p('coilShade','M1065 289 C1101 308 1103 355 1064 380 L1036 385 C1072 359 1068 319 1040 295 Z','structure')
 s.p('coilLit','M886 308 C875 321 870 338 872 351 L1047 322 C1045 311 1042 304 1040 295 Z','structure')
 for x,y in [(915,303),(957,296),(1000,288)]:
  s.p('copper',f'M{x} {y} C{x-25} {y+23} {x-18} {y+64} {x+12} {y+86} L{x+26} {y+83} C{x-3} {y+59} {x-9} {y+23} {x+13} {y-2} Z','structure')
 s.p('steel','M894 408 L920 403 L929 476 L901 484 Z','structure')
 s.p('steel','M1050 381 L1076 375 L1083 453 L1057 461 Z','structure')
 s.p('steelShade','M881 478 L1059 446 L1111 468 L930 507 Z','structure')
 s.p('steelLit','M881 478 L1059 446 L1111 468 L1088 475 L1057 463 L906 491 Z','structure')
 s.p('wallShade','M395 350 L580 333 L636 347 L448 372 Z','back-structure')
 s.p('steelLit','M448 372 L636 347 V363 L449 388 Z','back-structure')
 s.p('steel','M405 383 L419 380 L427 451 L414 455 Z','back-structure')
 s.p('steel','M612 363 L626 360 L633 426 L620 431 Z','back-structure')
 s.p('deep','M0 604 V571 L122 548 L223 580 L251 604 Z','near')
 s.p('steelShade','M1120 557 L1044 542 L975 573 L946 604 H1120 Z','near')
 return s.data
