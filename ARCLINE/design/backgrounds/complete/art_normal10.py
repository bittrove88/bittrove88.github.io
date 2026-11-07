from art_core import Scene

def make():
 s=Scene('normal-10','風の観測台',10,'金色の草がなびく高原の観測所。低い白い観測棟と、空を測る三杯式の風速計。空を広く、地形を横長に取り、風を線や矢印ではなく草原と雲の大きな面で示す。',{
 'sky':'#D6E4DE','upper':'#B5D0CF','cloud':'#F5F0D9','cloudShade':'#DDE4D6','far':'#B0BFA5','farShade':'#98AA94',
 'grass':'#C4B77B','grassLit':'#E0D09A','grassSun':'#ECDCB0','grassShade':'#A79E6B','grassDeep':'#8C8F66',
 'rock':'#B5AE92','rockShade':'#939A84','house':'#E3DDC8','houseShade':'#BDBEAC','roof':'#879CA3','roofLight':'#A8B8B4','roofShade':'#6B838C',
 'glass':'#91ACAE','glassDark':'#708E98','steel':'#9A9D87','steelLit':'#C6C5A7','steelShade':'#777F73','red':'#B98B67'})
 s.base()
 s.p('upper','M0 0 H1120 V121 C987 149 869 117 749 132 C553 157 312 113 0 143 Z','air')
 s.p('cloudShade','M0 152 C113 116 214 148 307 130 C382 112 452 139 503 158 C577 142 661 163 700 188 C548 200 453 179 358 201 C223 228 109 190 0 225 Z','air')
 s.p('cloud','M0 149 C97 122 187 146 253 138 C330 124 393 135 430 154 C338 169 281 174 197 167 C106 161 50 187 0 183 Z','air')
 s.p('far','M0 385 C133 333 251 368 368 343 C498 316 600 372 724 341 C857 306 972 349 1120 319 V604 H0 Z','far')
 s.p('farShade','M0 421 C171 379 305 420 452 389 C609 358 734 412 895 378 C979 360 1058 378 1120 366 V604 H0 Z','far')
 s.p('grass','M0 465 C195 399 337 444 495 407 C691 361 865 417 1120 368 V604 H0 Z','land')
 s.p('grassLit','M0 462 C159 411 283 434 401 417 C522 401 566 388 642 393 C473 434 362 444 227 442 C129 439 69 463 0 481 Z','land')
 s.p('grassShade','M0 551 C194 479 329 534 487 492 C667 445 866 495 1120 435 V604 H0 Z','land')
 s.p('grassLit','M304 604 C406 542 536 548 648 502 C773 450 913 480 1120 432 V455 C929 511 789 483 684 528 C559 580 451 574 410 604 Z','land')
 s.p('grassDeep','M0 604 V588 C150 542 269 574 358 548 C309 581 211 587 186 604 Z','near')
 # A squat, weatherproof station; only one building mass on the ridge.
 s.p('house','M112 333 L244 316 L293 336 L292 403 L116 418 Z','structure')
 s.p('houseShade','M244 316 L293 336 L292 403 L248 415 Z','structure')
 s.p('roof','M91 329 L177 284 L321 319 L291 339 L244 327 L111 345 Z','structure')
 s.p('roofLight','M91 329 L177 284 L321 319 L303 326 L177 301 L111 336 Z','structure')
 s.p('roofShade','M111 345 L244 327 L291 339 L321 319 L319 333 L293 353 L244 342 L113 358 Z','structure')
 s.p('glass','M138 365 L180 360 V389 L140 394 Z','structure')
 s.p('glassDark','M208 356 L231 353 V393 L209 397 Z','structure')
 s.p('houseShade','M154 364 H160 V391 L154 392 Z','structure')
 s.p('rock','M93 418 L247 404 L310 421 L280 435 L114 445 Z','structure')
 s.p('house','M194 282 V242 C194 220 235 215 242 240 L249 298 Z','structure')
 s.p('houseShade','M225 225 C238 224 241 236 242 240 L249 298 L232 294 Z','structure')
 s.p('roof','M189 240 C188 209 242 206 247 237 L249 246 L190 252 Z','structure')
 # A scientific cup anemometer; no compass arrows or combat markers.
 s.p('steel','M889 199 L903 197 L923 396 L911 402 Z','structure')
 s.p('steelLit','M889 199 L894 198 L916 400 L911 402 Z','structure')
 s.p('steelShade','M845 189 L943 174 L946 182 L847 197 Z','structure')
 s.p('steelShade','M888 183 L914 214 L907 220 L882 191 Z','structure')
 s.e('steelShade',842,189,18,9,'structure')
 s.e('steelLit',842,186,18,7,'structure')
 s.e('steelShade',944,175,17,9,'structure')
 s.e('steelLit',944,172,17,6,'structure')
 s.e('steelShade',913,215,16,9,'structure')
 s.e('steelLit',913,211,16,6,'structure')
 s.p('rockShade','M883 405 L918 392 L943 403 L928 421 L895 424 Z','structure')
 s.p('grassSun','M44 514 C136 486 211 499 270 483 L297 486 C221 514 133 505 69 531 Z','near')
 s.p('grassSun','M798 567 C901 530 1000 547 1120 511 V525 C1007 566 911 549 839 580 Z','near')
 return s.data
