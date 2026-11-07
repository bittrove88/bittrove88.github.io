from art_core import Scene

def make():
 s=Scene('normal-16','空中庭園',16,'雲の上に残る花の庭。左の大きな花木、丸い水盤、芝の段丘から落ちる細い滝。土の島は片側へ寄せ、桃色の花と白い雲で採掘場や森とは異なる柔らかな高所を描く。',{
 'sky':'#D9E7D6','high':'#C0D9D0','cloud':'#F6F0DE','cloudShade':'#DDE5D8','far':'#BDCCB3','grass':'#A0BC89','grassLit':'#C1D19B','grassDeep':'#7D9E78',
 'earth':'#AD9F80','earthLit':'#CBB895','earthShade':'#8A8C73','root':'#8E8A6B','stone':'#DFD3B7','stoneLit':'#F3E4C7','stoneShade':'#B9B6A0',
 'water':'#94BDB0','waterLit':'#D2E5D1','waterShade':'#76A89F','trunk':'#B4987B','trunkShade':'#8F806B',
 'leaf':'#9DB78A','leafShade':'#7F9C7B','leafLight':'#BACC9C','flower':'#D8B5BC','flowerLit':'#EDD2CF','flowerShade':'#BB9BAE'})
 s.base()
 s.p('high','M0 0 H1120 V149 C946 170 776 134 613 155 C433 179 220 140 0 165 Z','air')
 s.p('cloudShade','M0 380 C121 329 200 382 309 349 C471 300 594 365 733 330 C904 287 1003 355 1120 318 V604 H0 Z','far')
 s.p('cloud','M0 457 C181 414 297 465 434 432 C571 400 712 453 856 409 C989 371 1068 410 1120 393 V604 H0 Z','far')
 s.p('far','M828 304 L887 278 L979 291 L1029 313 L976 341 L876 340 Z','middle')
 s.p('earthShade','M876 340 L976 341 L937 385 L904 374 Z','middle')
 s.p('grassLit','M828 304 L887 278 L979 291 L1029 313 L1006 320 L889 300 L849 316 Z','middle')
 s.p('grass','M0 396 L149 354 L325 367 L508 344 L674 390 L711 429 L649 475 L412 497 L207 475 L0 492 Z','land')
 s.p('grassLit','M0 396 L149 354 L325 367 L508 344 L674 390 L686 410 L507 369 L326 391 L148 379 L0 422 Z','land')
 s.p('grassDeep','M0 461 L203 437 L411 459 L650 440 L711 429 L649 475 L412 497 L207 475 L0 492 Z','land')
 s.p('earth','M0 492 L207 475 L412 497 L649 475 L587 541 L473 565 L407 604 L241 567 L134 593 L0 549 Z','land')
 s.p('earthLit','M0 492 L207 475 L412 497 L649 475 L622 500 L414 521 L207 499 L0 517 Z','land')
 s.p('earthShade','M207 499 L414 521 L622 500 L587 541 L473 565 L407 604 L326 572 L346 540 L236 531 Z','land')
 s.p('root','M137 540 C179 553 159 582 182 604 H167 C144 580 161 567 122 557 Z','near')
 s.p('root','M484 555 C480 580 453 586 457 604 H443 C436 584 464 578 469 559 Z','near')
 s.p('water','M559 387 C592 405 621 400 645 411 L663 421 L646 485 C647 529 628 560 629 604 H609 C601 558 625 523 622 483 L631 426 C601 418 581 424 559 411 Z','structure')
 s.p('waterLit','M635 422 L645 426 L631 488 C635 532 615 566 617 604 H609 C601 558 625 523 622 483 Z','structure')
 s.p('water','M427 390 C480 378 523 399 559 387 L562 411 C510 419 474 395 434 406 Z','structure','basin overflow channel physically joins the garden waterfall')
 # The tree is rooted in the garden terrace, not in a foreground frame.
 s.p('trunk','M175 386 L198 286 L169 220 L182 203 L217 255 L245 200 L261 206 L228 291 L211 383 Z','structure')
 s.p('trunkShade','M198 286 L207 288 L194 383 L175 386 Z','structure')
 s.p('leafShade','M57 222 C37 178 70 145 111 151 C113 117 164 110 188 138 C218 109 265 128 270 157 C317 146 345 177 334 210 C308 243 252 232 219 246 C172 231 120 251 87 234 Z','structure')
 s.p('leaf','M65 196 C55 168 84 145 112 153 C132 127 165 134 181 151 C219 125 252 145 260 167 C290 154 320 174 321 195 C281 220 232 207 200 225 C151 208 108 231 65 212 Z','structure')
 s.p('flower','M64 177 C51 147 83 121 110 131 C116 103 154 96 175 119 C195 95 232 109 243 130 C274 117 305 139 302 163 C341 173 342 204 319 219 C291 209 265 224 240 207 C209 223 187 203 167 210 C130 228 100 204 77 205 Z','structure')
 s.p('flowerLit','M71 151 C81 131 101 130 116 137 C134 113 157 116 171 130 C192 110 220 126 222 141 C195 153 171 145 149 163 C120 155 102 173 78 168 Z','structure')
 s.p('flowerShade','M221 167 C258 144 296 159 302 177 C329 185 332 204 319 219 C291 209 265 224 240 207 C226 199 213 190 221 167 Z','structure')
 # A round water basin, drawn as material planes rather than an ornamental arch.
 s.e('stoneShade',382,403,75,26,'structure')
 s.p('stone','M307 396 C320 444 441 446 457 396 L446 409 C422 422 342 426 320 409 Z','structure')
 s.e('stoneLit',382,390,75,24,'structure')
 s.e('water',382,389,59,15,'structure')
 s.e('waterLit',373,386,39,8,'structure')
 s.p('stoneShade','M368 425 L393 426 L401 452 L361 455 Z','structure')
 s.p('stoneLit','M355 453 L402 449 L420 458 L365 468 Z','structure')
 s.p('stone','M889 289 V228 L906 224 V287 Z','middle')
 s.p('stoneShade','M973 301 V238 L988 241 V310 Z','middle')
 s.p('stoneLit','M874 227 L920 210 L1000 234 L986 245 L918 228 L887 237 Z','middle')
 s.p('leafShade','M861 229 C866 205 893 198 910 211 C931 192 959 207 962 223 C987 211 1003 230 999 245 C967 240 944 250 921 237 C899 247 880 231 861 239 Z','middle')
 s.p('flower','M899 212 C911 194 934 201 939 214 C954 205 972 217 971 229 C944 237 926 222 903 231 Z','middle')
 s.p('cloudShade','M690 563 C782 523 852 564 927 539 C1014 509 1071 546 1120 530 V604 H681 Z','near')
 s.p('cloud','M719 593 C834 552 934 598 1044 566 C1079 555 1105 565 1120 562 V604 H712 Z','near')
 return s.data
