from art_core import Scene

def make():
 s=Scene('final-100-2','アークハート核防護 — 岩盤の保全洞',19,'空の搬送層から、古い中枢の土台にある保全洞へ。横に連なる岩盤天井と、地中に埋まった青緑の配管。暖かな石の土色と小さな保全灯で、深部へ進む静かな緊張を描く。',{
 'sky':'#AAA58E','wall':'#979C87','wallLit':'#B9AE91','wallShade':'#808E7D','rock':'#8F8D76','rockLit':'#B2A17F','rockShade':'#727D6C','rockDeep':'#5B6E67',
 'pipe':'#7A9B8F','pipeLit':'#A7BAA5','pipeShade':'#5D837F','steel':'#6B8D87','steelLit':'#9FAF99','deep':'#4F7477',
 'cream':'#CBC1A2','creamShade':'#A5A78D','brass':'#B59D70','light':'#D4B780','lightLit':'#E4CC9A','floor':'#9C9C7E','floorLit':'#BCAD87','dust':'#B1A385'},kind='final',stage=100,map_index=2)
 s.base()
 s.p('wall','M0 0 H1120 V604 H0 Z','far')
 s.p('wallLit','M259 194 L397 152 L575 195 L704 167 L908 215 L890 451 L677 489 L418 469 L244 503 Z','far')
 s.p('wallShade','M575 195 L704 167 L908 215 L890 451 L677 489 L610 389 L649 287 Z','far')
 s.p('rock','M0 0 H1120 V193 L1055 182 L1014 153 L948 171 L902 222 L821 194 L770 220 L694 199 L603 240 L561 200 L503 223 L432 180 L323 201 L269 159 L194 189 L126 161 L79 180 L0 176 Z','land')
 s.p('rockShade','M0 0 H1120 V89 L1044 103 L971 87 L903 141 L807 115 L741 145 L672 127 L536 159 L409 111 L303 134 L259 103 L143 124 L0 83 Z','land')
 s.p('rockLit','M0 83 L143 124 L259 103 L303 134 L409 111 L536 159 L514 174 L409 135 L305 158 L259 126 L144 147 L0 107 Z','land')
 s.p('rock','M0 177 L95 196 L160 272 L140 353 L184 425 L160 521 L213 604 H0 Z','land')
 s.p('rockShade','M0 266 L63 287 L81 363 L59 432 L83 519 L58 604 H0 Z','land')
 s.p('rockLit','M95 196 L112 198 L179 271 L159 352 L202 424 L180 522 L230 604 H213 L160 521 L184 425 L140 353 L160 272 Z','land')
 s.p('rock','M1120 193 L1021 207 L966 287 L984 364 L937 441 L971 527 L944 604 H1120 Z','land')
 s.p('rockShade','M1120 279 L1068 265 L1036 350 L1057 425 L1026 505 L1061 604 H1120 Z','land')
 s.p('rockLit','M1021 207 L1035 218 L985 289 L1000 364 L956 441 L990 528 L964 604 H944 L971 527 L937 441 L984 364 L966 287 Z','land')
 s.p('floor','M0 532 L258 493 L494 522 L727 482 L946 511 L1120 486 V604 H0 Z','middle')
 s.p('floorLit','M363 604 C435 559 513 566 592 537 L740 506 L810 520 C671 568 586 559 501 604 Z','middle')
 # The same green pipe material as the outer shell is now embedded in bedrock.
 s.p('pipeShade','M0 240 H159 C214 240 247 274 247 330 V492 H212 V330 C212 296 193 275 159 275 H0 Z','structure')
 s.p('pipe','M0 240 H159 C214 240 247 274 247 330 H235 C235 281 209 253 159 253 H0 Z','structure')
 s.p('pipeLit','M0 244 H158 C206 244 230 268 236 309 L224 309 C219 277 199 257 158 257 H0 Z','structure')
 s.p('steel','M192 474 L254 461 L266 500 L204 516 Z','structure')
 s.p('cream','M192 474 L254 461 L266 477 L204 491 Z','structure')
 s.p('brass','M49 235 H67 V279 H49 Z','structure')
 s.p('pipe','M1120 307 H1009 C964 307 942 334 942 378 V482 H972 V378 C972 351 985 336 1009 336 H1120 Z','structure')
 s.p('pipeLit','M1120 307 H1009 C964 307 942 334 942 378 H954 C954 342 971 320 1009 320 H1120 Z','structure')
 s.p('brass','M1057 301 H1074 V341 H1057 Z','structure')
 s.p('creamShade','M908 457 L975 443 L993 475 L927 493 Z','structure')
 s.p('steel','M313 252 L358 245 L367 348 L322 358 Z','back-structure')
 s.p('steelLit','M313 252 L328 250 L337 355 L322 358 Z','back-structure')
 s.p('light','M330 277 L353 273 L354 292 L331 298 Z','back-structure')
 s.p('lightLit','M333 280 L348 277 L349 288 L334 292 Z','back-structure')
 s.p('dust','M185 573 C337 539 424 571 538 547 C678 515 769 553 878 530 C829 571 717 579 620 570 C464 591 322 573 185 595 Z','near')
 s.p('rockDeep','M0 604 V575 L113 537 L224 574 L253 604 Z','near')
 s.p('deep','M1120 556 L1044 526 L952 570 L926 604 H1120 Z','near')
 s.data.update(relay=['mogu','rin','yui'],storyReferences=['assets/cinematics/E01-01.jpeg','docs/change-requests/ARCLINE_FINAL_100_v0.21.3.md'],spoilerScope='stage100 map2 only; background remains a continuous cave, no return indicators')
 return s.data
