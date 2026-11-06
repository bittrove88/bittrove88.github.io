from art_core import Scene

def make():
 s=Scene('normal-19','夜明けの核',19,'夜明けの光が差す、古い中枢施設の外周。左の縦長の送気設備、遠い保全棟、奥へ曲がる連絡路。桃色の空と鈍い青緑の金属が、最後の室内へ入る前の静けさをつくる。',{
 'sky':'#E5BFB4','upper':'#C6AEB9','air':'#F2D9B6','horizon':'#F6E5C8','far':'#C2B6AD','farShade':'#A9A5A4',
 'land':'#ADACA0','landLit':'#C6BEA4','landShade':'#929C94','path':'#DED0AA','pathShade':'#BEB59A',
 'wall':'#A0B2A5','wallLit':'#C4CEB8','wallShade':'#7F9B94','deep':'#68858A','pipe':'#8EA79B','pipeLit':'#BAC5AD',
 'stone':'#D4CCAF','stoneShade':'#A5AD9B','roof':'#94A59E','roofLit':'#BFC3AB','glass':'#789A9B','brass':'#BDAB80'})
 s.base()
 s.p('upper','M0 0 H1120 V104 C913 130 755 95 571 117 C367 143 184 101 0 125 Z','air')
 s.p('air','M0 233 C165 202 329 238 477 211 C672 175 851 218 1120 177 V604 H0 Z','air')
 s.p('horizon','M0 324 C153 299 300 329 472 305 C679 278 892 309 1120 280 V449 H0 Z','air')
 s.p('far','M0 413 L147 379 L256 400 L365 375 L493 411 L612 393 L751 415 L879 378 L1017 397 L1120 373 V604 H0 Z','far')
 s.p('farShade','M0 460 L179 425 L292 447 L419 417 L579 458 L722 431 L851 459 L992 420 L1120 435 V604 H0 Z','far')
 s.p('land','M0 504 C197 459 326 495 504 464 C706 432 889 474 1120 439 V604 H0 Z','middle')
 s.p('path','M0 604 C151 540 306 561 449 518 C565 482 634 457 759 453 L832 464 C653 476 611 509 481 548 C331 594 235 573 161 604 Z','middle')
 s.p('pathShade','M0 604 C151 540 306 561 449 518 C565 482 634 457 759 453 L772 456 C629 468 570 493 455 532 C311 575 171 556 58 604 Z','middle')
 s.p('landShade','M1120 511 L958 489 L827 534 L742 604 H1120 Z','land')
 s.p('landLit','M827 534 L958 489 L1120 511 V526 L961 508 L848 548 Z','land')
 # An off-center cluster of distant maintenance buildings, without core imagery.
 s.p('wall','M703 350 L818 328 L847 342 L848 423 L708 444 Z','back-structure')
 s.p('wallShade','M818 328 L847 342 L848 423 L823 427 Z','back-structure')
 s.p('roof','M686 345 L750 311 L865 334 L848 352 L818 343 L701 363 Z','back-structure')
 s.p('roofLit','M686 345 L750 311 L865 334 L849 340 L752 326 L702 352 Z','back-structure')
 s.p('glass','M731 384 L772 377 V399 L733 406 Z','back-structure')
 s.p('stone','M880 314 L917 306 L938 316 L943 419 L887 428 Z','back-structure')
 s.p('stoneShade','M917 306 L938 316 L943 419 L924 422 Z','back-structure')
 s.p('roof','M865 300 L906 284 L951 299 L938 316 L880 317 Z','back-structure')
 s.p('brass','M896 333 L912 329 V352 L897 356 Z','back-structure')
 # Close air ducts and the facility's massive blue-green outer wall.
 s.p('wall','M0 0 H211 L252 604 H0 Z','structure')
 s.p('wallShade','M131 0 H211 L252 604 H174 Z','structure')
 s.p('wallLit','M0 0 H32 L73 604 H0 Z','structure')
 s.p('pipe','M71 0 H103 L124 318 L163 343 V373 L93 341 Z','structure')
 s.p('pipeLit','M71 0 H81 L103 333 L163 359 V373 L93 341 Z','structure')
 s.p('deep','M201 163 L317 182 L325 214 L204 196 Z','structure')
 s.p('pipeLit','M201 163 L317 182 L320 192 L202 175 Z','structure')
 s.p('stone','M303 463 L521 431 L603 448 L400 483 Z','structure','low retaining masonry connects to the outer approach')
 s.p('stoneShade','M303 463 L400 483 L603 448 V467 L400 504 L303 484 Z','structure')
 s.p('wallShade','M0 604 V571 L144 547 L236 579 L262 604 Z','near')
 s.p('wallLit','M0 571 L144 547 L236 579 L221 588 L145 563 L0 588 Z','near')
 return s.data
