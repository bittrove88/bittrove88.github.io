from art_core import Scene

def make():
 s=Scene('normal-17','嵐の空母',17,'雨雲の切れ間を背に、巨大な空母の船腹が雲海へ沈む。青い鋼材、重い灰色の雲、左奥に残る鈍い琥珀の空。空港の晴れた風景とは異なる、嵐の中の質量と距離。',{
 'sky':'#ACB6C0','gap':'#D9CAAF','gapLit':'#EAD9B9','cloudFar':'#93A4B6','cloudMid':'#7C91A9','cloudDark':'#607B98','cloudDeep':'#506D8C',
 'deck':'#9BAFB7','deckLit':'#BCC4BC','deckShade':'#8096A6','hull':'#7890A5','hullShade':'#607C96','keel':'#4F6E8B',
 'bridge':'#8BA2AE','bridgeLit':'#A9B7B8','bridgeShade':'#6B879E','glass':'#566F89','brass':'#B5AA8C','underCloud':'#BCC6CA','cloudLight':'#DDD7C8'})
 s.base()
 s.p('gap','M0 100 C172 73 273 133 399 101 C531 74 613 122 729 108 C566 169 494 189 431 251 C250 279 149 257 0 297 Z','air')
 s.p('gapLit','M0 169 C145 136 265 184 366 156 C451 133 514 144 558 159 C457 202 416 219 378 250 L0 274 Z','air')
 s.p('cloudFar','M0 337 C161 286 282 334 402 302 C586 253 716 309 877 268 C992 240 1061 274 1120 250 V604 H0 Z','far')
 s.p('cloudMid','M0 417 C142 366 240 407 371 376 C563 331 721 381 866 345 C1008 312 1078 351 1120 337 V604 H0 Z','middle')
 # The hull belongs to the environment, with no weapons or active boss features.
 s.p('hull','M263 360 L389 317 L891 270 L1120 299 V383 L932 419 L478 438 L324 407 Z','back-structure')
 s.p('deck','M263 360 L389 317 L891 270 L1120 299 V316 L900 294 L411 339 L309 371 Z','back-structure')
 s.p('deckLit','M263 360 L389 317 L891 270 L1120 299 V305 L893 284 L400 330 L286 366 Z','back-structure')
 s.p('hullShade','M324 407 L478 438 L932 419 L1120 383 V357 L915 391 L474 411 L304 383 Z','back-structure')
 s.p('keel','M478 438 L932 419 L1120 383 V415 L952 455 L604 479 Z','back-structure')
 s.p('deckShade','M455 347 L856 309 L997 318 L991 330 L853 324 L479 360 Z','back-structure')
 s.p('bridge','M849 227 L910 212 L957 230 L963 289 L863 300 Z','structure')
 s.p('bridgeLit','M849 227 L910 212 L957 230 L938 236 L910 226 L864 238 Z','structure')
 s.p('bridgeShade','M910 212 L957 230 L963 289 L919 294 Z','structure')
 s.p('deck','M824 207 L896 186 L972 209 L953 228 L846 231 Z','structure')
 s.p('deckLit','M824 207 L896 186 L972 209 L954 214 L895 201 L841 218 Z','structure')
 s.p('glass','M846 218 L952 212 L953 228 L846 231 Z','structure')
 s.p('bridgeLit','M869 217 H876 V230 H869 Z','structure')
 s.p('bridgeLit','M914 215 H921 V229 H914 Z','structure')
 s.p('bridgeShade','M925 186 L921 144 L936 138 L944 199 Z','structure')
 s.p('brass','M921 144 L936 138 L941 151 L925 156 Z','structure')
 s.p('bridgeShade','M700 305 L751 293 L774 306 L779 324 L711 331 Z','back-structure')
 s.p('bridgeLit','M700 305 L751 293 L774 306 L755 312 L715 318 Z','back-structure')
 s.p('hullShade','M483 381 L682 369 L731 378 L527 394 Z','back-structure','integrated broad hull plate')
 s.p('deckShade','M813 346 L1028 324 L1077 332 L857 358 Z','back-structure','matte structural hull face')
 s.p('cloudDark','M0 0 H1120 V147 C1060 129 1034 149 1003 145 C970 170 936 164 908 159 C851 194 815 172 785 163 C733 191 689 166 649 176 C580 178 535 137 494 145 C430 149 406 119 366 130 C273 144 228 92 167 115 C96 137 47 104 0 128 Z','near')
 s.p('cloudDeep','M0 0 H1120 V84 C1044 66 974 104 913 80 C830 54 781 102 705 77 C615 46 548 100 472 76 C384 47 328 76 243 55 C143 28 77 77 0 51 Z','near')
 s.p('underCloud','M0 510 C111 462 178 518 259 486 C344 451 412 497 477 478 C560 451 625 490 683 483 C766 441 825 481 893 456 C995 418 1066 470 1120 448 V604 H0 Z','near')
 s.p('cloudLight','M0 505 C99 474 154 512 235 490 C298 470 352 488 390 511 C257 539 143 521 0 553 Z','near')
 s.p('cloudFar','M0 579 C170 542 302 584 458 554 C623 522 797 576 949 540 C1021 523 1070 541 1120 529 V604 H0 Z','finish')
 return s.data
