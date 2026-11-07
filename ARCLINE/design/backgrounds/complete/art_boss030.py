from art_core import Scene

def make():
 s=Scene('boss-030','クラウドレイ — 雲港の閉鎖空域',5,'雲の空港の青空と赤い格納庫を継承し、係留塔の近くから閉鎖空域を望む。厚い白雲が奥の空を囲み、左に迫る港の設備が普段より狭い空間をつくる。',{
 'sky':'#A9C8DF','high':'#88ACCB','air':'#C5D9E6','cloud':'#EEE9D9','cloudLit':'#FAF1DC','cloudShade':'#C1CED8','cloudDark':'#9AB2C8',
 'coral':'#BD826E','coralLit':'#DBA17E','coralShade':'#986F66','steel':'#8198A8','steelLit':'#B4C0C2','steelShade':'#637E96',
 'deck':'#B5B39C','deckLit':'#D8CBAC','deckShade':'#939F9D','glass':'#698AA3','tower':'#C6AD80','towerShade':'#A08E73'})
 s.base()
 s.p('high','M0 0 H1120 V177 C971 165 845 191 720 172 C549 145 367 182 0 151 Z','air')
 s.p('cloudShade','M493 0 H1120 V100 C1060 127 1007 102 961 124 C902 152 854 119 812 140 C748 170 699 137 658 150 C587 159 555 113 504 115 C539 78 523 32 493 0 Z','air','low cloud ceiling closes the upper approach')
 s.p('air','M0 313 C221 273 407 321 574 285 C783 242 932 300 1120 264 V604 H0 Z','air')
 s.p('cloudShade','M0 322 C82 280 141 310 172 332 C218 293 277 322 288 352 C338 334 377 357 393 391 L378 456 H0 Z','far')
 s.p('cloud','M1120 195 C1072 162 1024 185 1004 213 C958 179 903 213 900 245 C853 235 825 264 826 292 C787 297 766 323 781 355 C892 365 1002 333 1120 357 Z','far')
 s.p('cloudLit','M1120 198 C1075 178 1043 193 1021 221 C988 211 959 228 948 251 C1018 257 1069 240 1120 254 Z','far')
 s.p('cloudDark','M0 440 C152 405 246 448 366 417 C542 373 690 431 837 396 C946 369 1057 398 1120 382 V604 H0 Z','middle')
 # Close left hangar eave and its airside service platform.
 s.p('coralShade','M0 170 L161 150 L231 195 L245 397 L0 430 Z','land')
 s.p('coral','M0 170 L161 150 L189 190 L195 410 L0 430 Z','land')
 s.p('coralLit','M0 149 L155 124 L255 177 L231 195 L161 169 L0 190 Z','structure')
 s.p('coralShade','M0 190 L161 169 L231 195 L235 214 L161 190 L0 213 Z','structure')
 s.p('glass','M0 253 L123 240 L126 278 L0 292 Z','structure')
 s.p('steel','M0 393 L194 371 L321 406 L286 442 L0 465 Z','structure')
 s.p('deckLit','M0 393 L194 371 L321 406 L298 417 L194 393 L0 417 Z','structure')
 s.p('deckShade','M0 465 L286 442 L276 472 L0 500 Z','structure')
 s.p('steelShade','M128 483 L150 480 L169 544 L148 550 Z','structure')
 # A far traffic-control mast, leaving the flying guardian's area empty.
 s.p('tower','M953 236 L975 232 L995 431 L974 438 Z','back-structure')
 s.p('towerShade','M975 232 L994 242 L1014 423 L995 431 Z','back-structure')
 s.p('steel','M920 211 L964 194 L1029 210 L1006 230 L941 234 Z','back-structure')
 s.p('steelLit','M920 211 L964 194 L1029 210 L1012 216 L964 207 L935 222 Z','back-structure')
 s.p('glass','M941 223 L1006 219 L1006 230 L941 234 Z','back-structure')
 s.p('deck','M916 429 L1000 410 L1073 432 L991 457 Z','back-structure')
 s.p('steelShade','M916 429 L991 457 L1073 432 L1042 477 L977 493 Z','back-structure')
 s.p('cloud','M0 529 C128 474 214 530 325 496 C461 455 573 514 691 482 C831 443 957 510 1120 463 V604 H0 Z','near')
 s.p('cloudLit','M0 527 C108 491 184 521 260 509 C338 491 379 510 407 525 C274 548 164 535 0 570 Z','near')
 s.p('cloudShade','M0 590 C198 546 366 597 526 559 C703 518 901 585 1120 533 V604 H0 Z','finish')
 s.data.update(kind='boss',stage=30)
 return s.data
