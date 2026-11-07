from art_core import Scene,annulus

def make():
 s=Scene('final-100-0','アークハート外殻 — 保全設備壁',19,'古い保全中枢の外殻。左端へ続く巨大な支持環、厚いクリーム色の補強材、右の集合配管。青緑の設備壁を正面に見て、長く閉じた施設の重さを描く。',{
 'sky':'#A1B5B1','wall':'#92AAA2','wallLit':'#B5C1AD','wallShade':'#789890','deep':'#587A80','steel':'#6B8B8B','steelLit':'#9AAEA0','steelShade':'#4F737B',
 'cream':'#CFC7AC','creamLit':'#E4D8B9','creamShade':'#AAA990','brass':'#B59D70','brassLit':'#D1B889','brassShade':'#948A68',
 'pipe':'#7F9C94','pipeLit':'#ADC0AE','pipeShade':'#60848A','glass':'#A7C1BE','light':'#D9DED0','floor':'#9DAC9C','floorShade':'#7F998E','floorLit':'#BBC2A8'})
 s.base()
 s.p('wall','M0 0 H1120 V604 H0 Z','far')
 s.p('wallShade','M0 0 H377 L347 604 H0 Z','far')
 s.p('wallLit','M384 80 L759 57 L806 109 L799 475 L379 506 Z','far')
 s.p('wall','M404 104 L743 83 L780 118 L777 452 L399 482 Z','far')
 s.p('wallShade','M599 92 L614 92 L614 466 L599 467 Z','back-structure')
 s.p('creamShade','M404 104 L743 83 L780 118 L762 124 L739 103 L421 123 Z','back-structure')
 s.p('glass','M873 0 H989 L960 202 L863 224 Z','far')
 s.p('light','M900 0 H941 L915 213 L879 220 Z','far')
 s.p('steelShade','M851 0 H872 L862 226 L843 230 Z','back-structure')
 s.p('floor','M0 510 L297 470 L574 494 L855 449 L1120 477 V604 H0 Z','middle')
 s.p('floorShade','M0 581 L242 540 L489 565 L766 518 L1120 548 V604 H0 Z','middle')
 s.p('floorLit','M357 604 L511 551 L663 544 L787 511 L871 521 C729 567 607 563 507 604 Z','middle')
 # Only the environment's supporting ring is visible; there is no duplicate core.
 annulus(s,'steelShade',-133,284,355,365,55)
 annulus(s,'cream',-133,284,302,312,30)
 annulus(s,'brass',-133,284,267,277,14)
 s.p('cream','M124 0 H164 L268 604 H229 Z','structure')
 s.p('creamLit','M124 0 H138 L244 604 H229 Z','structure')
 s.p('creamShade','M164 0 H182 L286 604 H268 Z','structure')
 s.p('steelShade','M0 227 H178 L228 252 L197 279 H0 Z','structure')
 s.p('steelLit','M0 227 H178 L228 252 L209 260 L178 242 H0 Z','structure')
 s.p('steelShade','M0 386 H201 L234 413 L213 437 H0 Z','structure')
 s.p('brass','M0 385 H201 L223 403 L206 409 L197 398 H0 Z','structure')
 # Main pipe bundle follows the exterior equipment wall on the right.
 s.p('pipe','M1120 143 H909 C852 143 822 173 822 225 V301 H857 V224 C857 192 876 178 910 178 H1120 Z','structure')
 s.p('pipeLit','M1120 143 H909 C852 143 822 173 822 225 H834 C834 184 863 155 909 155 H1120 Z','structure')
 s.p('pipeShade','M1120 199 H949 C914 199 894 218 894 252 V352 H924 V252 C924 238 930 229 949 229 H1120 Z','structure')
 s.p('pipe','M1120 255 H1005 C966 255 943 278 943 319 V401 H972 V319 C972 297 983 284 1005 284 H1120 Z','structure')
 s.p('pipeLit','M1120 255 H1005 C966 255 943 278 943 319 H954 C954 285 973 267 1005 267 H1120 Z','structure')
 for x,y,h in [(1037,138,44),(1037,194,41),(1037,250,41)]:
  s.p('brass',f'M{x} {y} H{x+17} V{y+h} H{x} Z','structure')
  s.p('brassLit',f'M{x} {y} H{x+6} V{y+h} H{x} Z','structure')
 s.p('steel','M813 309 L869 300 L878 426 L824 439 Z','structure')
 s.p('steelLit','M813 309 L831 306 L842 435 L824 439 Z','structure')
 s.p('brass','M830 335 L858 330 L859 350 L832 356 Z','structure')
 s.p('pipe','M835 291 H851 V316 L836 319 Z','structure')
 s.p('steelShade','M892 339 L928 335 L936 464 L901 474 Z','structure','pipe manifold reaches the floor')
 s.p('steelLit','M892 339 L903 338 L912 470 L901 474 Z','structure')
 s.p('brassShade','M940 391 H975 L994 409 V429 L944 435 Z','structure','lower pipe joins the equipment footing')
 s.p('creamShade','M980 410 L1081 390 L1120 406 V506 L1012 526 L984 502 Z','structure')
 s.p('cream','M980 410 L1081 390 L1120 406 V420 L1082 409 L995 427 Z','structure')
 s.p('steelShade','M0 604 V575 L132 545 L233 579 L259 604 Z','near')
 s.p('deep','M1120 553 L1041 531 L960 568 L935 604 H1120 Z','near')
 s.data.update(kind='final',stage=100,mapIndex=0,relay=['hana','koro','ban'],storyReferences=['design/narrative_0_13.json:world.heart_secret','assets/cinematics/E01-01.jpeg'],spoilerScope='stage100 only; no returned-unit lights before victory')
 return s.data
