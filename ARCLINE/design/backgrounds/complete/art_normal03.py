from art_core import Scene

def make():
 s=Scene('normal-03','遺跡の入口',3,'砂色の空の下、焼けた赤土の段丘に残る石の入口。崩れた角形の門、欠けた階段、わずかに残る青緑の石装飾。森の水路から乾いた古代の風景へ移る。',{
 'sky':'#F0D7BB','air':'#F7E4C5','dust':'#E3C0AA','far':'#CBA9A1','farShade':'#B39398',
 'sand':'#E4BD8C','sandLight':'#F1D3A5','sandShade':'#C69C7D','earth':'#C58B65','earthShade':'#A57260',
 'stone':'#CA926C','stoneLit':'#E6B783','stoneLight':'#F0CAA0','stoneShade':'#A57465','stoneDeep':'#805E60',
 'cut':'#B88165','cutLight':'#D5A77C','teal':'#729C9B','tealLit':'#9BB8AA','tealDark':'#5D8389','scrub':'#A19768'})
 s.base()
 s.p('air','M0 96 C154 82 268 120 401 103 C572 79 681 122 818 100 C955 78 1047 109 1120 91 V259 C919 239 765 262 577 243 C338 264 186 234 0 260 Z','air')
 s.p('dust','M0 329 C140 298 280 333 422 307 C594 277 735 320 877 300 C981 284 1067 305 1120 296 V604 H0 Z','far')
 s.p('far','M0 371 L138 337 L225 348 L301 319 L371 346 L434 340 L528 392 L641 385 L745 338 L819 350 L891 318 L1006 359 L1120 337 V492 H0 Z','far')
 s.p('farShade','M641 385 L745 338 L766 363 L819 350 L860 386 L891 318 L918 367 L1006 359 L1056 402 L1120 386 V489 H602 Z','far')
 s.p('sand','M0 456 C195 431 309 458 456 431 C673 387 845 438 1120 412 V604 H0 Z','middle')
 s.p('sandLight','M370 604 C426 535 487 528 536 480 C573 447 625 446 701 443 C626 475 643 499 573 538 C517 566 503 586 493 604 Z','middle')
 s.p('sandShade','M0 523 C149 489 252 522 381 496 C344 526 303 537 234 539 L0 560 Z','middle')
 s.p('earth','M0 362 L93 344 L198 360 L304 337 L401 381 L416 427 L357 470 L308 504 L277 604 H0 Z','land')
 s.p('earthShade','M0 419 L92 398 L196 415 L305 390 L400 420 L357 470 L308 504 L277 604 H180 L217 510 L280 468 L186 451 L90 440 L0 462 Z','land')
 s.p('cutLight','M0 362 L93 344 L198 360 L304 337 L401 381 L388 396 L302 360 L198 381 L94 365 L0 385 Z','land')
 s.p('stone','M110 180 L167 164 L189 394 L138 410 Z','structure')
 s.p('stoneLit','M110 180 L132 174 L159 403 L138 410 Z','structure')
 s.p('stoneShade','M167 164 L183 177 L208 387 L189 394 Z','structure')
 s.p('stone','M322 190 L372 176 L386 375 L341 389 Z','structure')
 s.p('stoneShade','M372 176 L395 188 L410 370 L386 375 Z','structure')
 s.p('stoneLight','M322 190 L338 186 L356 383 L341 389 Z','structure')
 s.p('stoneLit','M82 158 L221 118 L411 155 L430 190 L289 179 L188 196 L93 193 Z','structure')
 s.p('stoneLight','M82 158 L221 118 L411 155 L396 166 L222 139 L105 174 Z','structure')
 s.p('stoneShade','M93 193 L188 196 L289 179 L430 190 L420 214 L291 204 L188 220 L99 218 Z','structure')
 s.p('cut','M222 139 L242 142 L238 186 L223 190 Z','structure')
 s.p('teal','M127 241 L148 235 L151 280 L132 286 Z','structure')
 s.p('tealLit','M129 243 L136 241 L141 281 L134 283 Z','structure')
 s.p('tealDark','M344 243 L364 237 L365 274 L347 280 Z','structure')
 s.p('stoneDeep','M170 350 L185 346 L188 380 L173 385 Z','structure')
 s.p('earth','M1120 319 L1036 333 L974 365 L902 363 L833 412 L851 463 L907 495 L914 604 H1120 Z','land')
 s.p('stoneLit','M1120 319 L1036 333 L974 365 L902 363 L833 412 L854 419 L912 386 L978 389 L1048 356 L1120 341 Z','land')
 s.p('stoneShade','M1120 414 L1056 398 L985 424 L925 420 L851 463 L907 495 L914 604 H1120 Z','land')
 s.p('cutLight','M1120 477 L1040 456 L979 475 L955 470 L917 494 L923 516 L980 499 L1042 484 L1120 502 Z','land')
 # Broken stair fragments turn with the right terrace, rather than framing a gate.
 for color,d in [('stone','M806 544 L849 521 L871 528 L831 551 Z'),('stoneLit','M806 544 V528 L848 506 L849 521 Z'),('stoneShade','M831 551 L871 528 V546 L833 568 Z'),
 ('stone','M850 504 L892 482 L914 489 L872 512 Z'),('stoneLit','M850 504 V488 L891 467 L892 482 Z'),('stoneShade','M872 512 L914 489 V507 L873 528 Z')]:s.p(color,d,'structure')
 s.p('stone','M600 456 L635 438 L672 456 L664 476 L613 483 Z','structure')
 s.p('stoneLight','M600 456 L635 438 L672 456 L650 463 L619 459 Z','structure')
 s.p('stoneShade','M650 463 L672 456 L664 476 L640 480 Z','structure')
 s.p('earthShade','M0 575 L81 534 L166 558 L214 604 H0 Z','near')
 s.p('stoneLit','M0 575 L81 534 L166 558 L142 567 L80 553 L0 595 Z','near')
 s.p('stoneDeep','M1120 580 L1047 537 L996 560 L969 604 H1120 Z','near')
 s.p('scrub','M74 344 L64 327 L79 332 L83 315 L90 335 L102 325 L98 345 Z','structure')
 s.p('scrub','M1020 345 L1009 327 L1025 334 L1030 318 L1038 335 L1052 327 L1046 342 Z','structure')
 s.p('air','M343 142 L373 147 L369 164 L352 160 Z','finish','missing upper corner of the weathered lintel')
 s.p('stoneDeep','M263 148 L274 150 L268 183 L257 185 Z','structure','one broad structural fracture')
 s.p('stone','M227 434 L258 416 L291 430 L289 452 L248 465 Z','structure')
 s.p('stoneLight','M227 434 L258 416 L291 430 L268 440 L246 437 Z','structure')
 s.p('stoneShade','M268 440 L291 430 L289 452 L263 461 Z','structure')
 return s.data
