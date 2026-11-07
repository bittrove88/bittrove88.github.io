from art_core import Scene,annulus

def make():
 s=Scene('boss-080','ポラリス・コア — 極性試験室',15,'実験棟の白い陶器と青紫の鋼材を引き継ぐ、大型の極性試験室。左の壁沿いの誘導環、右の太い絶縁柱、天井の支持軸で空間を近づける。中央に偽の核や磁力線を描かない。',{
 'sky':'#BAC3D8','wall':'#CFD3DF','wallShade':'#A4B0CB','wallLit':'#D5D9E2','steel':'#7484AA','steelLit':'#A4B2C9','steelShade':'#5D6F99','deep':'#4B5E88',
 'ceramic':'#DCD6BE','ceramicLit':'#F0E5CD','ceramicShade':'#B9B3A8','coil':'#C6A676','coilLit':'#E1C496','coilShade':'#A48B6F',
 'copper':'#B9877C','copperShade':'#99757A','floor':'#A2ADC5','floorLit':'#C4CBD8','floorShade':'#8595B4','wire':'#8690AA'})
 s.base()
 s.p('wall','M182 0 H983 V477 L752 516 L262 497 Z','far')
 s.p('wallLit','M328 74 L733 42 L845 80 V273 L326 291 Z','far')
 s.p('wallShade','M733 42 L845 80 V273 L741 278 Z','far')
 s.p('steelShade','M0 0 H1120 V65 L0 122 Z','back-structure')
 s.p('steelLit','M0 81 L1120 28 V40 L0 96 Z','back-structure')
 s.p('steel','M216 0 H242 L276 213 L256 226 Z','back-structure')
 s.p('steel','M901 0 H926 L875 213 L854 203 Z','back-structure')
 s.p('wire','M241 78 L304 160 L378 173 V190 L293 178 L229 95 Z','back-structure')
 s.p('wire','M901 69 L839 155 L765 172 V188 L852 174 L914 86 Z','back-structure')
 s.p('floor','M0 498 L261 467 L558 493 L836 447 L1120 479 V604 H0 Z','middle')
 s.p('floorLit','M363 604 L502 509 L674 490 L589 538 L504 604 Z','middle')
 s.p('floorShade','M0 578 L178 543 L326 568 L407 604 H0 Z','middle')
 annulus(s,'steelShade',-87,285,305,310,48)
 annulus(s,'coil',-87,285,263,269,25)
 annulus(s,'coilLit',-87,285,230,235,10)
 s.p('steel','M0 217 H158 L202 247 L164 267 H0 Z','structure')
 s.p('steelLit','M0 217 H158 L202 247 L185 253 L156 233 H0 Z','structure')
 s.p('steel','M0 371 H170 L201 391 L176 420 H0 Z','structure')
 s.p('steelShade','M0 420 H176 L187 465 L0 498 Z','structure')
 # One large ceramic support is tied to a heavy floor plinth.
 s.p('steel','M909 466 L1022 442 L1107 465 L993 500 Z','structure')
 s.p('steelShade','M909 466 L993 500 L1107 465 L1095 538 L993 573 L920 540 Z','structure')
 s.p('ceramicShade','M977 203 H1011 L1020 460 L986 471 Z','structure')
 for x,y,rx,ry in [(999,433,65,21),(996,382,63,20),(992,332,59,19),(988,282,55,18),(984,232,49,17)]:
  s.e('ceramicShade',x,y+10,rx,ry,'structure');s.e('ceramic',x,y,rx,ry,'structure');s.e('ceramicLit',x-9,y-4,rx*.72,ry*.62,'structure')
 s.e('copperShade',980,197,28,13,'structure');s.e('copper',980,191,28,11,'structure')
 s.p('wire','M974 191 L965 130 L1004 103 H1120 V117 H1008 L982 138 L989 192 Z','structure')
 s.p('deep','M0 604 V570 L127 542 L229 575 L260 604 Z','near')
 s.p('deep','M1120 561 L1045 540 L969 574 L943 604 H1120 Z','near')
 s.data.update(kind='boss',stage=80)
 return s.data
