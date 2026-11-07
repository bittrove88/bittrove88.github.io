from art_core import Scene

def make():
 s=Scene('normal-14','磁石の採掘場',14,'赤錆色の露天採掘場。黒い鉄鉱石の段丘、片持ちの運搬架台、奥に吊られた大きな馬蹄形磁石。自然石の黒と酸化した鉄の赤、青緑の古い機械を描き分ける。',{
 'sky':'#DCCBC6','air':'#EBD6C5','far':'#BA9F9A','farShade':'#A08788','dust':'#C5A48F',
 'earth':'#B67E60','earthLit':'#D39B70','earthShade':'#94685B','earthDeep':'#7A5959','ore':'#73717A','oreLit':'#96919B','oreDark':'#575E6D',
 'oreRust':'#A77966','steel':'#78968B','steelLit':'#A6B2A0','steelShade':'#5F7E78','steelDeep':'#526C70','cable':'#8E8A7A',
 'floor':'#C3A185','floorLit':'#D8B69A','floorShade':'#AA8D7C'})
 s.base()
 s.p('air','M0 223 C201 192 365 228 561 209 C745 190 937 215 1120 187 V604 H0 Z','air')
 s.p('far','M0 369 L132 341 L264 356 L349 321 L467 364 L574 352 L681 388 L795 357 L913 373 L1037 330 L1120 350 V604 H0 Z','far')
 s.p('farShade','M0 411 L159 382 L291 402 L417 369 L529 411 L679 393 L814 424 L946 393 L1120 413 V604 H0 Z','far')
 s.p('floor','M0 467 L251 433 L439 466 L624 437 L840 469 L1120 426 V604 H0 Z','middle')
 s.p('floorLit','M407 604 C467 548 600 543 688 500 C778 460 921 467 1016 439 L1071 454 C968 489 830 486 752 520 C636 571 573 559 528 604 Z','middle')
 s.p('earth','M0 281 L131 259 L237 290 L263 340 L325 359 L341 414 L401 454 L369 497 L273 529 L241 604 H0 Z','land')
 s.p('earthLit','M0 281 L131 259 L237 290 L250 313 L130 285 L0 308 Z','land')
 s.p('earthShade','M0 348 L155 320 L263 340 L275 361 L160 344 L0 372 Z','land')
 s.p('earthDeep','M0 416 L213 382 L341 414 L350 439 L214 408 L0 444 Z','land')
 s.p('earthLit','M0 496 L243 448 L401 454 L369 477 L247 473 L0 520 Z','land')
 s.p('earth','M1120 361 L1013 347 L944 384 L899 435 L919 472 L1042 495 L1120 486 Z','land')
 s.p('earthShade','M1120 425 L1050 403 L971 423 L919 472 L1042 495 L1120 486 Z','land')
 # Massive dull ore, without crystal points or luminous magnetic field lines.
 ores=[('ore','M24 274 L67 217 L137 202 L185 232 L192 286 L125 300 Z'),('oreLit','M24 274 L67 217 L137 202 L110 246 L61 259 Z'),
 ('oreDark','M137 202 L185 232 L192 286 L125 300 L110 246 Z'),('oreRust','M83 254 L105 245 L125 300 L108 301 Z'),
 ('ore','M198 365 L222 326 L267 313 L305 347 L295 390 L245 402 Z'),('oreLit','M198 365 L222 326 L267 313 L247 351 Z'),
 ('oreDark','M267 313 L305 347 L295 390 L245 402 L247 351 Z'),('ore','M999 432 L1022 394 L1077 383 L1120 409 V456 L1054 467 Z'),
 ('oreLit','M999 432 L1022 394 L1077 383 L1056 424 Z'),('oreDark','M1077 383 L1120 409 V456 L1054 467 L1056 424 Z')]
 for c,d in ores:s.p(c,d,'structure')
 # One cantilever machine and a suspended horseshoe, receding into the right pit.
 s.p('steelShade','M640 189 L659 185 L683 435 L664 441 Z','back-structure')
 s.p('steelLit','M640 189 L646 188 L670 438 L664 441 Z','back-structure')
 s.p('steel','M617 180 L1077 137 L1094 154 L636 201 Z','back-structure')
 s.p('steelLit','M617 180 L634 167 L1088 126 L1077 137 Z','back-structure')
 s.p('steelShade','M640 198 L892 285 L887 301 L643 216 Z','back-structure')
 s.p('steelShade','M886 285 L1055 158 L1067 162 L895 301 Z','back-structure')
 s.r('cable',1004,155,5,57,'back-structure')
 s.r('cable',1039,152,5,58,'back-structure')
 s.p('steel','M980 249 C954 185 1064 163 1084 226 L1093 270 L1067 278 L1057 233 C1047 206 1002 212 1009 238 L1021 281 L995 290 Z','structure')
 s.p('steelLit','M980 249 C954 185 1064 163 1084 226 L1074 231 C1058 184 976 202 991 246 L1004 286 L995 290 Z','structure')
 s.p('steelDeep','M1009 238 L1021 281 L1004 286 L993 244 C984 205 1048 199 1062 232 L1067 278 L1057 233 C1047 206 1002 212 1009 238 Z','structure')
 s.p('oreRust','M995 290 L1021 281 L1026 298 L999 308 Z','structure')
 s.p('oreRust','M1067 278 L1093 270 L1099 287 L1071 296 Z','structure')
 s.p('earthDeep','M0 604 V572 L126 543 L220 569 L261 604 Z','near')
 s.p('earthLit','M0 572 L126 543 L220 569 L205 579 L128 561 L0 593 Z','near')
 s.p('oreDark','M1120 563 L1047 537 L968 563 L926 604 H1120 Z','near')
 return s.data
