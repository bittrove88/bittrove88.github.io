from art_core import Scene

def make():
 s=Scene('boss-010','タイドクロー — 青い潮門',1,'鏡の岸壁と同じ青い板状岩の港口。左に沈んだ旧桟橋、右に大きな潮門の巻上げ部。銀紫の水面は少し深い藍色になり、狭い港口を守るタイドクローの場へ変わる。',{
 'sky':'#C8CBDF','cloud':'#B0B8CF','air':'#DBD4E1','far':'#9CAAC5','farShade':'#8598BA',
 'rock':'#6D80A0','rockLit':'#A2B0CC','rockShade':'#536D93','rockDeep':'#415C83','stone':'#A7ACC0','stoneLit':'#C1C5D3','stoneShade':'#7E8EAC',
 'water':'#7790B2','waterLit':'#A3B2CB','waterDark':'#5F7CA4','waterNear':'#4E6D96','iron':'#6C7F9C','ironLit':'#96A4BA','ironShade':'#4F6588','salt':'#BAC0D1'})
 s.base()
 s.p('cloud','M0 0 H1120 V184 C972 196 863 161 724 180 C567 202 405 163 254 189 C144 208 64 183 0 199 Z','air')
 s.p('air','M0 297 C214 270 387 303 551 279 C774 247 949 281 1120 259 V604 H0 Z','air')
 s.p('far','M0 360 L119 319 L216 342 L322 313 L412 366 L528 352 L648 385 L767 348 L854 372 L961 333 L1120 364 V491 H0 Z','far')
 s.p('farShade','M119 319 L158 370 L216 342 L260 390 L322 313 L349 378 L412 366 L467 406 L648 385 L767 348 L797 401 L854 372 L961 333 L995 394 L1120 383 V491 H0 Z','far')
 s.p('water','M0 426 C209 409 364 433 547 414 C767 391 941 426 1120 404 V604 H0 Z','middle')
 s.p('waterLit','M359 450 C497 431 632 457 758 435 L845 441 C707 480 550 465 397 489 Z','middle')
 s.p('waterDark','M0 530 C184 507 335 548 509 521 C701 492 905 537 1120 498 V604 H0 Z','middle')
 s.p('waterNear','M0 588 C217 554 398 597 597 569 C797 541 953 579 1120 548 V604 H0 Z','middle')
 s.p('rock','M0 200 L61 168 L127 184 L152 251 L139 310 L180 374 L173 451 L0 465 Z','land')
 s.p('rockLit','M0 200 L61 168 L86 176 L66 273 L80 353 L62 462 L0 465 Z','land')
 s.p('rockShade','M86 176 L127 184 L152 251 L139 310 L180 374 L173 451 L122 456 L125 373 L105 311 L114 258 Z','land')
 s.p('rock','M1120 177 L1047 199 L1009 280 L1018 342 L976 403 L988 472 H1120 Z','land')
 s.p('rockLit','M1120 177 L1047 199 L1009 280 L1024 289 L1064 220 L1120 205 Z','land')
 s.p('rockDeep','M1064 220 L1091 233 L1063 303 L1082 377 L1053 454 L1062 489 H1120 V220 Z','land')
 # A damaged old quay, perpendicular to the open water.
 s.p('stone','M0 442 L166 418 L324 449 L298 474 L82 492 L0 481 Z','structure')
 s.p('stoneLit','M0 442 L166 418 L324 449 L300 456 L166 438 L0 462 Z','structure')
 s.p('stoneShade','M0 481 L82 492 L298 474 L288 506 L87 525 L0 513 Z','structure')
 s.p('ironShade','M83 523 L106 520 L112 569 L91 574 Z','structure')
 s.p('ironShade','M245 509 L268 506 L261 556 L240 562 Z','structure')
 s.p('iron','M975 260 L1011 249 L1031 448 L1000 459 Z','structure')
 s.p('ironLit','M975 260 L986 257 L1009 455 L1000 459 Z','structure')
 s.p('ironShade','M1011 249 L1034 264 L1050 438 L1031 448 Z','structure')
 s.p('iron','M947 242 L1004 224 L1059 243 L1034 264 L976 274 Z','structure')
 s.p('ironLit','M947 242 L1004 224 L1059 243 L1043 250 L1006 238 L964 253 Z','structure')
 s.p('stone','M886 443 L1005 419 L1120 440 V506 L926 513 Z','structure')
 s.p('stoneLit','M886 443 L1005 419 L1120 440 V453 L1008 439 L903 457 Z','structure')
 s.p('ironShade','M1000 293 L1021 287 L1027 345 L1007 352 Z','structure')
 s.e('ironShade',1008,359,29,34,'structure','tidegate winch drum')
 s.e('ironLit',1003,354,20,24,'structure')
 s.e('ironShade',1004,355,8,10,'structure')
 s.p('ironShade','M1049 275 L1062 272 L1084 426 L1072 429 Z','structure','heavy tidegate chain at the outer edge')
 s.p('water','M0 563 C142 547 239 569 352 547 L342 561 C225 586 130 562 0 578 Z','finish')
 s.p('waterLit','M483 520 C578 501 676 521 751 501 L778 508 C682 534 592 517 514 534 Z','finish')
 s.data.update(kind='boss',stage=10)
 return s.data
