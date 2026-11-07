"""11–15: a timber suspension bridge across a wooded, running waterway."""
from art_core import Scene
import math

def make():
 s=Scene('normal-02','吊り橋の水路',2,
  '木立の深い水路を横切る、蜂蜜色の木と赤茶の鉄の吊り橋。橋は奥へ斜めに渡り、その下を青緑の川が曲がって流れる。森の陰と木材の暖かさで描く内陸の風景。',{
  'sky':'#E6E4CB','farAir':'#D2DDC2','farWood':'#A3B79A','farDark':'#8AA58B',
  'wood':'#627F65','woodLight':'#829B6D','woodSun':'#A1AF77','woodShade':'#496C5C',
  'nearLeaf':'#3F6253','leafLit':'#718956','leafGold':'#A4A66C','trunk':'#6B6550','trunkLit':'#938365',
  'rock':'#798875','rockLit':'#A5AC87','rockShade':'#5D766A','moss':'#899D70','mossSun':'#B7BB84',
  'water':'#619D95','waterFar':'#91BAB0','waterDeep':'#498880','waterLit':'#B2CFC0','waterMid':'#80ADA0',
  'timber':'#BE955A','timberLit':'#D8B77C','timberShade':'#9A754A','iron':'#886B50',
  'ironShade':'#6C6551','rope':'#A98757','hut':'#B59C77','roof':'#A77B57','roofShade':'#876B50'})
 s.base()
 s.p('farAir','M0 211 C168 143 261 218 387 189 C524 153 658 183 774 167 C920 147 1038 195 1120 162 V604 H0 Z','far')
 s.p('farWood','M0 162 C74 122 108 153 147 139 C194 101 231 132 253 151 C299 128 333 148 352 184 C401 157 441 184 460 216 L489 327 H0 Z','far')
 s.p('farWood','M1120 142 C1059 102 1001 144 966 132 C928 110 893 145 878 173 C829 146 786 179 778 211 C744 186 713 215 713 252 L675 343 H1120 Z','far')
 s.p('farDark','M0 274 C112 225 161 277 229 246 C308 214 379 264 430 247 L488 341 H0 Z','middle')
 s.p('farDark','M1120 236 C1032 211 984 246 932 230 C869 204 829 247 788 231 L729 345 H1120 Z','middle')
 s.p('farWood','M0 332 L638 314 C616 370 505 374 485 425 C469 484 297 531 267 604 H0 Z','middle')
 s.p('rockLit','M1120 319 L771 349 C745 391 655 396 626 431 C584 475 689 518 724 604 H1120 Z','middle')
 s.p('moss','M1120 373 C1049 349 936 385 858 372 C780 359 721 388 684 412 C779 392 824 422 893 401 C971 379 1058 412 1120 397 Z','middle')
 s.p('waterFar','M638 314 C728 295 773 320 771 349 C745 391 655 396 626 431 C584 475 689 518 724 604 H267 C297 531 469 484 485 425 C505 374 616 370 638 314 Z','middle')
 s.p('water','M702 345 C708 378 619 397 590 428 C550 476 622 521 622 604 H319 C365 536 510 479 526 425 C542 386 643 367 658 340 Z','middle')
 s.p('waterDeep','M745 356 C684 396 627 403 612 435 C596 467 651 518 689 604 H589 C617 558 556 486 565 450 C570 401 680 388 716 355 Z','middle')
 s.p('waterMid','M474 463 C465 514 362 554 337 604 H465 C467 551 546 518 550 474 L527 451 Z','middle')
 s.p('waterLit','M621 388 C655 363 698 365 719 350 L736 353 C707 379 667 379 650 395 Z','middle')
 s.p('waterLit','M456 546 C498 512 546 494 562 470 L571 476 C553 510 510 531 483 556 Z','middle')
 s.p('rock','M0 272 L95 239 L201 271 L271 330 L309 410 L272 484 L196 540 L166 604 H0 Z','land')
 s.p('rockLit','M0 272 L95 239 L201 271 L232 307 L127 285 L53 306 L0 302 Z','land')
 s.p('rockShade','M201 271 L271 330 L309 410 L272 484 L196 540 L166 604 H110 L136 525 L224 466 L240 407 L220 355 Z','land')
 s.p('moss','M0 267 L94 231 L200 261 L234 298 L204 296 L125 278 L57 299 L0 295 Z','land')
 s.p('rock','M1120 277 L1014 298 L944 353 L897 414 L887 490 L919 548 L957 604 H1120 Z','land')
 s.p('rockLit','M1120 277 L1014 298 L944 353 L963 361 L1024 322 L1120 307 Z','land')
 s.p('rockShade','M1014 298 L1024 322 L991 385 L1014 455 L975 509 L997 604 H957 L919 548 L887 490 L897 414 L944 353 Z','land')
 s.p('mossSun','M1120 272 L1012 290 L941 346 L947 358 L1021 307 L1120 289 Z','land')
 # The bridge is a perspective span, not a horizontal platform across the scene.
 s.p('ironShade','M164 301 L909 337 L922 348 L174 320 Z','back-structure')
 s.p('timber','M165 291 L910 328 L909 337 L164 301 Z','back-structure')
 s.p('timberLit','M165 291 L179 282 L921 320 L910 328 Z','back-structure')
 s.p('timberShade','M174 320 L922 348 L905 356 L183 333 Z','back-structure')
 for i in range(1,12):
  x=172+i*61;y=291+(x-165)*37/745
  s.poly('timberShade',[(x,y),(x+4,y+.2),(x+18,y-8),(x+14,y-8.2)],'back-structure')
 s.p('rope','M147 184 C349 310 648 317 936 242 L937 250 C648 328 345 321 147 194 Z','structure')
 s.p('iron','M160 204 C366 315 664 328 921 258 L922 264 C659 337 363 326 160 212 Z','structure')
 for x,y,end in [(233,233,294),(339,276,300),(450,296,306),(566,301,313),(683,289,319),(800,270,324),(891,253,328)]:
  s.poly('rope',[(x,y),(x+4,y),(x+4,end),(x,end)],'structure')
 s.p('timber','M128 173 L155 170 L171 322 L149 334 Z','structure')
 s.p('timberLit','M128 173 L137 166 L164 164 L155 170 Z','structure')
 s.p('timberShade','M155 170 L164 164 L181 315 L171 322 Z','structure')
 s.p('timber','M907 229 L928 228 L938 357 L920 364 Z','structure')
 s.p('timberLit','M907 229 L914 223 L935 221 L928 228 Z','structure')
 s.p('timberShade','M928 228 L935 221 L947 349 L938 357 Z','structure')
 s.p('ironShade','M127 199 L160 197 L161 211 L129 214 Z','structure')
 s.p('ironShade','M909 253 L934 251 L935 263 L910 265 Z','structure')
 # Broad foliage groups belong to this forest, never shared hill silhouettes.
 s.p('woodShade','M0 199 C49 154 100 174 112 207 C151 186 186 220 182 247 C221 235 239 264 230 292 L200 307 L133 289 L58 308 L0 298 Z','structure')
 s.p('woodLight','M0 189 C40 161 70 174 81 193 C116 176 142 196 146 216 C173 204 198 219 199 241 C151 234 111 254 69 238 C42 227 23 245 0 239 Z','structure')
 s.p('woodSun','M19 184 C51 167 71 181 82 194 C100 184 118 187 127 197 C98 211 76 207 55 209 L15 219 Z','structure')
 s.p('woodShade','M1120 214 C1082 182 1046 209 1032 229 C1002 203 967 225 966 249 C931 242 910 268 921 295 L1020 308 L1120 289 Z','structure')
 s.p('woodLight','M1120 203 C1084 183 1059 204 1046 218 C1021 203 994 223 993 242 C1037 253 1080 231 1120 247 Z','structure')
 s.p('trunk','M0 0 H43 C20 117 44 217 62 311 L44 320 C21 217 17 115 0 84 Z','near')
 s.p('trunkLit','M23 0 H43 C20 117 44 217 62 311 L54 314 C34 203 11 110 23 0 Z','near')
 s.p('nearLeaf','M0 0 H334 C306 35 270 29 244 48 C208 75 177 59 157 70 C127 96 94 76 66 104 C42 115 20 109 0 122 Z','near')
 s.p('leafLit','M69 0 H273 C249 24 216 16 188 39 C160 62 128 45 105 61 C80 79 52 72 35 81 L29 53 C43 27 64 28 69 0 Z','near')
 s.p('leafGold','M99 0 H190 C175 16 155 15 138 28 C117 42 100 33 80 44 L70 30 Z','near')
 s.p('nearLeaf','M1120 0 H971 C958 46 1004 72 998 100 C975 132 1003 165 1031 164 C1042 194 1081 197 1120 174 Z','near')
 s.p('leafLit','M1120 0 H1023 C1012 24 1040 42 1037 63 C1030 89 1052 107 1076 104 C1094 123 1110 122 1120 118 Z','near')
 s.p('nearLeaf','M0 562 C53 518 102 546 132 534 C167 513 201 537 213 562 C241 551 266 572 271 604 H0 Z','near')
 s.p('leafLit','M0 562 C45 535 82 554 106 550 C132 538 161 547 172 567 C110 560 74 579 29 575 Z','near')
 s.p('nearLeaf','M1120 511 C1077 478 1036 504 1028 529 C984 508 956 540 965 565 C935 565 918 584 919 604 H1120 Z','near')
 s.p('leafLit','M1120 510 C1086 489 1063 506 1053 529 C1080 540 1101 529 1120 541 Z','near')
 return s.data
