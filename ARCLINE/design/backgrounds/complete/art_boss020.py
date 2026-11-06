from art_core import Scene

def make():
 s=Scene('boss-020','ゲートキーパー — 赤土の封鎖門',3,'遺跡の入口の赤土と砂岩を引き継ぎ、右側へ大きく寄せた閉鎖門へ近づく。厚い石の縁と青緑の古い装飾、低く下りた扉が、開いた遺跡より少し重い空気をつくる。',{
 'sky':'#E5C5AC','air':'#F0D9B7','dust':'#D6B09A','far':'#BA9491','farShade':'#A07D82',
 'sand':'#D4AC82','sandLit':'#E7C89C','sandShade':'#B58B72','stone':'#BD835F','stoneLit':'#DDA675','stoneLight':'#E9BE8B',
 'stoneShade':'#995F55','deep':'#7C5453','door':'#9F7461','doorShade':'#845B54','doorEdge':'#BC916D','teal':'#688D8D','tealLight':'#93B2A5','dry':'#9F8A64'})
 s.base()
 s.p('air','M0 167 C207 127 347 183 525 152 C689 124 895 172 1120 131 V604 H0 Z','air')
 s.p('dust','M0 329 C172 299 311 341 474 311 C671 275 844 318 1120 284 V604 H0 Z','far')
 s.p('far','M0 390 L143 353 L254 376 L348 347 L456 390 L567 369 L692 414 L827 385 L976 412 L1120 387 V604 H0 Z','far')
 s.p('farShade','M0 439 L144 403 L252 429 L361 397 L507 443 L631 416 L795 457 L940 428 L1120 451 V604 H0 Z','far')
 s.p('sand','M0 484 L194 451 L398 478 L602 450 L824 471 L1120 431 V604 H0 Z','middle')
 s.p('sandLit','M0 604 C165 539 305 569 447 521 C552 487 656 490 753 459 L789 468 C663 511 570 502 473 541 C317 599 181 566 109 604 Z','middle')
 s.p('stone','M0 224 L114 197 L224 219 L241 433 L194 483 L0 465 Z','land')
 s.p('stoneLit','M0 224 L114 197 L224 219 L228 243 L115 222 L0 249 Z','land')
 s.p('stoneShade','M114 222 L228 243 L241 433 L194 483 L164 347 Z','land')
 s.p('deep','M0 314 L105 294 L118 410 L0 427 Z','structure')
 s.p('teal','M25 259 L69 251 L70 278 L27 288 Z','structure')
 s.p('stoneShade','M0 478 L170 455 L266 493 L292 604 H0 Z','near')
 # The close gate stands on the right and exits the frame: one massive closed leaf.
 s.p('stone','M743 159 L867 123 L1120 164 V604 H740 Z','land')
 s.p('stoneLit','M743 159 L867 123 L1120 164 V186 L867 148 L760 179 Z','land')
 s.p('deep','M810 225 L1028 207 L1120 221 V510 L817 548 Z','structure')
 s.p('door','M831 244 L1030 227 L1120 241 V489 L837 524 Z','structure')
 s.p('doorShade','M1029 227 L1060 231 V497 L1036 500 Z','structure')
 s.p('doorShade','M914 237 L937 235 L940 512 L919 514 Z','structure')
 s.p('doorEdge','M831 244 L1030 227 L1120 241 V253 L1031 241 L833 259 Z','structure')
 s.p('doorEdge','M835 337 L1033 320 L1120 332 V350 L1034 338 L836 356 Z','structure')
 s.p('doorEdge','M837 437 L1037 417 L1120 429 V447 L1038 437 L837 456 Z','structure')
 s.p('stoneShade','M743 159 L770 172 L783 604 H740 Z','structure')
 s.p('stoneLight','M770 172 L788 166 L802 604 H783 Z','structure')
 s.p('stoneLight','M719 141 L859 99 L1120 138 V164 L867 123 L743 159 Z','structure')
 s.p('stoneShade','M719 141 L743 159 L1120 164 V182 L744 178 L721 159 Z','structure')
 s.p('teal','M781 288 L801 284 L805 351 L785 356 Z','structure')
 s.p('tealLight','M781 288 L788 287 L792 354 L785 356 Z','structure')
 s.p('stoneShade','M677 521 L790 495 L876 519 L854 604 H700 Z','structure','gate foundation reaches the ground rather than floating as a step')
 s.p('stoneLit','M677 521 L790 495 L876 519 L855 528 L791 513 L694 537 Z','structure')
 s.p('sandShade','M0 573 L133 533 L236 562 L287 604 H0 Z','near')
 s.p('dry','M144 458 L134 441 L148 446 L153 430 L160 449 L173 439 L168 457 Z','structure')
 s.data.update(kind='boss',stage=20)
 return s.data
