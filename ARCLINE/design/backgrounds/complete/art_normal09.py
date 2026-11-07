from art_core import Scene,gear,annulus
import math

def make():
 s=Scene('normal-09','琥珀の機関',9,'琥珀色の採光窓を持つ古い動力室。左の大きな青銅のはずみ車、横へ伸びる伝動軸、右の丸い圧力槽。暖かな金属と深い青緑の影で、静止した機関の質量を描く。',{
 'sky':'#7D9292','wall':'#98A49A','wallDark':'#647C80','wallLight':'#B0B5A0','window':'#E4BD76','windowLit':'#F3D79B',
 'bronze':'#B38B54','bronzeLit':'#D9B16A','bronzeShade':'#8C7351','bronzeDeep':'#6E6651','iron':'#5F7779','ironDeep':'#4D656C',
 'ironLit':'#9EAB9F','copper':'#B5906A','copperLit':'#D2B27C','copperShade':'#8E795E','pipe':'#8D9A8E','pipeLight':'#B6B99F',
 'floor':'#9F9A7E','floorLit':'#C5B489','floorShade':'#7E897C','edge':'#D5C18C','glass':'#B5B998'})
 s.base()
 s.p('wall','M222 0 H1023 L987 357 L841 490 H231 Z','far')
 s.p('wallDark','M0 0 H1120 V72 L786 104 L508 69 L0 108 Z','far')
 s.p('window','M701 0 H953 L905 263 L737 287 Z','far')
 s.p('windowLit','M770 0 H843 L810 279 L748 285 Z','far')
 s.p('wallDark','M727 0 H745 L724 288 L706 290 Z','back-structure')
 s.p('wallDark','M843 0 H860 L827 278 L810 280 Z','back-structure')
 s.p('wallLight','M711 290 L903 261 L889 289 L715 314 Z','far')
 s.p('wallDark','M294 112 L604 139 V157 L294 135 Z','back-structure')
 s.p('pipe','M451 0 H483 V199 L557 231 V259 L455 221 Z','back-structure')
 s.p('pipeLight','M451 0 H462 V212 L557 244 V259 L455 221 Z','back-structure')
 s.p('floor','M0 485 L262 439 L546 465 L815 425 L1120 453 V604 H0 Z','middle')
 s.p('floorLit','M559 604 L611 465 L833 430 L793 472 L716 604 Z','middle')
 s.p('floorShade','M0 575 L312 517 L479 547 L546 604 H0 Z','middle')
 # A flywheel is deliberately the only large toothed circle in this environment.
 gear(s,'bronzeShade',117,304,247,151,12)
 gear(s,'bronze',106,293,247,151,12)
 annulus(s,'bronzeLit',106,293,208,208,18)
 for a in [0,.785,1.571,2.356,3.142,3.927,4.712,5.498]:
  x,y=106+math.cos(a)*150,293+math.sin(a)*150
  dx,dy=-math.sin(a)*14,math.cos(a)*14
  s.poly('bronze',[(106+dx,293+dy),(x+dx,y+dy),(x-dx,y-dy),(106-dx,293-dy)],'structure')
 s.e('bronzeShade',106,293,61,61,'structure')
 s.e('bronzeLit',100,286,46,47,'structure')
 s.e('iron',103,289,25,27,'structure')
 s.p('iron','M101 277 L431 336 L434 368 L106 308 Z','structure')
 s.p('ironLit','M101 277 L431 336 L425 346 L104 289 Z','structure')
 s.p('ironDeep','M304 343 L352 352 L365 485 L319 494 Z','structure')
 s.p('ironLit','M304 343 L320 347 L334 490 L319 494 Z','structure')
 s.p('copper','M951 163 C940 113 1027 99 1061 132 C1078 151 1070 179 1074 218 L1084 409 C1084 450 982 465 972 424 Z','structure')
 s.p('copperLit','M951 163 C940 113 1027 99 1061 132 C1015 115 976 139 975 171 L991 432 L972 424 Z','structure')
 s.p('copperShade','M1047 126 C1072 136 1069 171 1074 218 L1084 409 C1086 437 1041 450 1027 448 L1011 158 Z','structure')
 s.e('copperLit',1009,151,56,21,'structure')
 s.e('copperShade',1009,151,36,12,'structure')
 s.p('iron','M960 232 L1075 213 L1076 235 L962 254 Z','structure')
 s.p('iron','M970 380 L1082 363 L1083 385 L971 403 Z','structure')
 s.p('pipe','M1120 313 H1067 L1038 334 V383 H1057 V346 L1074 336 H1120 Z','structure')
 s.p('pipeLight','M1120 313 H1067 L1038 334 V347 L1073 326 H1120 Z','structure')
 s.p('floorShade','M0 604 V560 L181 534 L288 570 L326 604 Z','near')
 s.p('ironDeep','M1120 540 L1001 521 L916 549 L885 604 H1120 Z','near')
 s.p('edge','M917 549 L1001 521 L1120 540 V552 L1002 538 L932 562 Z','near')
 return s.data
