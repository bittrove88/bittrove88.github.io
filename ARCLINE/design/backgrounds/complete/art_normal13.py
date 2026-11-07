from art_core import Scene

def make():
 s=Scene('normal-13','鍛冶の回廊',13,'赤い煉瓦と冷えた鉄骨の鍛冶回廊。左の大きな炉口、上部の排気ダクト、右の金床と吊り具。熱は小さな炉の内面に留め、巨大な設備と静かな作業場を描く。',{
 'sky':'#A47F7B','wall':'#BB9285','wallLit':'#CDA897','wallShade':'#8F7275','brick':'#B47965','brickLit':'#D39878','brickShade':'#925F5D',
 'furnace':'#C78969','furnaceLit':'#E4AA7D','furnaceShade':'#9C6C5F','mouth':'#74565D','heat':'#DDA36C','heatLit':'#EBC08A',
 'iron':'#6B7377','ironLit':'#929B95','ironShade':'#525C65','pipe':'#8E8980','pipeLit':'#B9A68C',
 'floor':'#AE9179','floorLit':'#CCAB85','floorShade':'#907C70','near':'#6E6464','chain':'#777975'})
 s.base()
 s.p('wall','M0 73 L1120 11 V604 H0 Z','far')
 s.p('wallLit','M418 102 L857 67 V247 L418 262 Z','far')
 s.p('wallShade','M0 0 H1120 V70 L0 138 Z','back-structure')
 s.p('ironShade','M0 58 L1120 0 V31 L0 92 Z','back-structure')
 s.p('ironLit','M0 58 L1120 0 V9 L0 70 Z','back-structure')
 s.p('brickShade','M347 109 L379 107 V474 L347 484 Z','back-structure')
 s.p('brick','M601 86 L634 83 V452 L601 463 Z','back-structure')
 s.p('brickLit','M601 86 L610 85 V458 L601 463 Z','back-structure')
 s.p('pipe','M740 0 H775 V149 L815 171 L881 168 V197 L804 202 L743 172 Z','back-structure')
 s.p('pipeLit','M740 0 H751 V166 L809 189 L881 184 V197 L804 202 L743 172 Z','back-structure')
 s.p('floor','M0 482 L308 449 L578 475 L848 435 L1120 463 V604 H0 Z','middle')
 s.p('floorLit','M0 487 L252 462 C383 492 474 506 548 553 L449 576 C284 540 178 554 0 592 Z','middle','broad warm floor plane connected to the furnace')
 s.p('floorShade','M0 581 L211 546 L423 580 L608 561 L796 604 H0 Z','middle')
 # A squat refractory furnace with a broad, rectangular heat chamber.
 s.p('furnace','M0 192 L188 166 L289 209 L310 428 L249 484 L0 469 Z','structure')
 s.p('furnaceLit','M0 192 L188 166 L289 209 L267 218 L186 190 L0 217 Z','structure')
 s.p('furnaceShade','M188 166 L289 209 L310 428 L249 484 L227 280 Z','structure')
 s.p('mouth','M0 285 L183 266 L201 396 L0 414 Z','structure')
 s.p('heat','M0 313 L155 298 L164 371 L0 389 Z','structure')
 s.p('heatLit','M0 357 L160 341 L164 371 L0 389 Z','structure')
 s.p('iron','M0 272 L181 254 L193 268 L0 289 Z','structure')
 s.p('ironShade','M0 410 L204 388 L209 410 L0 434 Z','structure')
 s.p('iron','M57 180 L53 92 L120 73 L163 93 L168 173 Z','structure')
 s.p('ironLit','M53 92 L120 73 L163 93 L148 102 L115 89 L64 103 Z','structure')
 s.p('ironShade','M120 73 L163 93 L168 173 L133 178 Z','structure')
 s.p('brickShade','M0 232 L72 224 V240 L0 248 Z','structure')
 s.p('brickShade','M104 221 L185 212 L188 230 L106 240 Z','structure')
 s.p('pipe','M0 476 L93 464 L121 488 V535 L99 540 V499 L87 487 L0 498 Z','structure')
 s.p('pipeLit','M0 476 L93 464 L121 488 L109 492 L88 477 L0 489 Z','structure')
 # The working anvil sits to the right, clear of the center of the image.
 s.p('iron','M857 391 L970 369 L1066 382 L1027 411 L955 427 L881 416 Z','structure')
 s.p('ironLit','M857 391 L970 369 L1066 382 L1043 391 L968 386 L877 403 Z','structure')
 s.p('ironShade','M881 416 L955 427 L1027 411 L1005 450 L971 456 L986 485 L928 498 L942 464 L902 449 Z','structure')
 s.p('furnaceShade','M886 493 L973 474 L1018 492 L995 536 L897 544 Z','structure')
 s.p('furnaceLit','M886 493 L973 474 L1018 492 L993 505 L923 514 Z','structure')
 s.r('chain',915,0,9,185,'structure')
 s.p('ironShade','M915 182 H924 V215 C924 238 955 239 957 215 L968 218 C965 257 913 255 913 221 Z','structure')
 s.p('iron','M1120 274 L1066 255 L1040 269 V437 L1120 462 Z','structure')
 s.p('ironLit','M1040 269 L1066 255 L1075 273 L1055 284 V442 L1040 437 Z','structure')
 s.p('near','M0 604 V566 L167 539 L286 574 L320 604 Z','near')
 s.p('ironShade','M1120 554 L1049 535 L976 563 L942 604 H1120 Z','near')
 return s.data
