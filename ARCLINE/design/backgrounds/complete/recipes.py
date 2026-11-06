"""Authored landscape recipes. Opaque vector color fields, never raster art.

Edit new artwork here, inherited artwork in sources/, then run build.py.
All coordinates are decorative screen-space coordinates, never collision data.
"""
import copy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LAYERS = ['air', 'distance', 'structure-back', 'landscape', 'structure', 'near', 'veil']


class Scene:
    def __init__(self, ident, title, theme, concept, palette, kind='normal', stage=None, map_index=None):
        self.data = dict(schema='arcline.background-art/v3', id=ident, title=title,
                         themeIndex=theme, stageRange=[theme*5+1, theme*5+5],
                         kind=kind, approved=False, size=[1120, 604], palette=palette,
                         layerOrder=LAYERS[:], shapes=[], concept=concept,
                         contract=dict(opaque=True, screenSpace=True, collision=False,
                                       cameraLinked=False, animation=False,
                                       priority='behind terrain, mechanics, actors, aim, projectiles and HUD'))
        if stage is not None:
            self.data['stage'] = stage
        if map_index is not None:
            self.data['mapIndex'] = map_index
        self.i = 0

    def path(self, color, d, layer='landscape', role='landscape plane'):
        self.i += 1
        self.data['shapes'].append(dict(id=f'{self.data["id"]}-{self.i:03}', layer=layer,
                                       kind='path', fill=color, d=d, role=role))

    def poly(self, color, points, layer='landscape', role='landscape plane'):
        self.path(color, 'M'+' L'.join(f'{x:g} {y:g}' for x,y in points)+' Z', layer, role)

    def rect(self, color, x, y, w, h, layer='structure', role='architectural plane'):
        self.path(color, f'M{x:g} {y:g} h{w:g} v{h:g} h{-w:g} Z', layer, role)

    def ellipse(self, color, x,y,rx,ry,layer='structure',role='architectural plane'):
        self.i += 1
        self.data['shapes'].append(dict(id=f'{self.data["id"]}-{self.i:03}',layer=layer,
                                       kind='ellipse',fill=color,cx=x,cy=y,rx=rx,ry=ry,role=role))


def pal(sky, upper, air, far, mid, shade, deep, light, accent, water=None):
    return dict(sky=sky, upper=upper, air=air, far=far, mid=mid, shade=shade,
                deep=deep, light=light, accent=accent, water=water or mid)


def sky(s, horizon=365):
    s.rect('sky',0,0,1120,604,'air','matte sky base')
    s.path('upper','M0 0 H1120 V113 C918 140 779 99 590 115 C378 129 194 99 0 125 Z','air')
    s.path('air',f'M0 {horizon-61} C224 {horizon-83} 353 {horizon-40} 546 {horizon-55} C790 {horizon-75} 929 {horizon-48} 1120 {horizon-65} V604 H0 Z','air')


def water(s, y=432):
    s.path('water',f'M0 {y} C289 {y-8} 401 {y+10} 605 {y} C842 {y-8} 961 {y+9} 1120 {y-2} V604 H0 Z','distance')
    s.path('far',f'M0 {y+23} C217 {y+7} 364 {y+37} 558 {y+19} C791 {y+5} 948 {y+25} 1120 {y+17} V{y+41} C840 {y+34} 653 {y+39} 449 {y+40} C249 {y+50} 129 {y+31} 0 {y+43} Z','distance')
    s.path('mid','M0 563 C238 537 385 579 613 557 C829 541 980 562 1120 548 V604 H0 Z','near')


def hills(s):
    s.path('far','M0 404 C95 335 177 336 279 385 C384 432 468 398 552 407 C671 420 754 342 854 351 C990 361 1044 389 1120 371 V604 H0 Z','distance')
    s.path('mid','M0 473 C142 414 238 435 352 478 C507 525 662 461 778 448 C938 431 1039 469 1120 447 V604 H0 Z','landscape')


def block(s,x,y,w,h,front='mid',top='light',side='shade',layer='structure',depth=18):
    s.poly(front,[(x,y),(x+w,y),(x+w,y+h),(x,y+h)],layer)
    s.poly(top,[(x,y),(x+depth,y-depth),(x+w+depth,y-depth),(x+w,y)],layer)
    s.poly(side,[(x+w,y),(x+w+depth,y-depth),(x+w+depth,y+h-depth),(x+w,y+h)],layer)


def arch(s,x,y,w,h,front='mid',top='light',side='shade',layer='structure'):
    t=w*.17
    s.path(front,f'M{x} {y} V{y-h*.55} Q{x+w*.04} {y-h} {x+w*.5} {y-h} Q{x+w*.96} {y-h} {x+w} {y-h*.55} V{y} H{x+w-t} V{y-h*.55} Q{x+w-t} {y-h*.79} {x+w*.5} {y-h*.79} Q{x+t} {y-h*.79} {x+t} {y-h*.55} V{y} Z',layer)
    s.path(side,f'M{x+w-t} {y} V{y-h*.55} Q{x+w-t} {y-h*.79} {x+w*.5} {y-h*.79} L{x+w*.56} {y-h*.72} Q{x+w-t+8} {y-h*.70} {x+w-t+8} {y-h*.52} V{y} Z',layer)
    s.path(top,f'M{x} {y-h*.55} Q{x+w*.04} {y-h} {x+w*.5} {y-h} Q{x+w*.96} {y-h} {x+w} {y-h*.55} L{x+w-10} {y-h*.57} Q{x+w*.91} {y-h*.92} {x+w*.5} {y-h*.92} Q{x+w*.09} {y-h*.92} {x+8} {y-h*.55} Z',layer)


def crystal(s,x,y,w,h,layer='structure',front='light',side='shade',edge='accent'):
    s.poly(front,[(x,y),(x-w*.42,y-h*.24),(x-w*.28,y-h*.78),(x,y-h),(x+w*.4,y-h*.72),(x+w*.5,y-h*.23)],layer)
    s.poly(side,[(x,y-h),(x+w*.4,y-h*.72),(x+w*.5,y-h*.23),(x,y),(x+w*.04,y-h*.45)],layer)
    s.poly(edge,[(x-w*.28,y-h*.78),(x,y-h),(x-w*.06,y-h*.44),(x-w*.42,y-h*.24)],layer)


def ring(s,x,y,rx,ry,t,front='mid',side='shade',layer='structure'):
    # One annulus path, inner contour reverses winding. Never a target/actor.
    d=f'M{x-rx} {y} a{rx} {ry} 0 1 0 {2*rx} 0 a{rx} {ry} 0 1 0 {-2*rx} 0 Z M{x-rx+t} {y} a{rx-t} {ry-t} 0 1 1 {2*(rx-t)} 0 a{rx-t} {ry-t} 0 1 1 {-2*(rx-t)} 0 Z'
    s.path(front,d,layer,'fixed architectural ring, no interactive core')
    s.path(side,f'M{x-rx} {y} A{rx} {ry} 0 0 0 {x+rx} {y} L{x+rx-t} {y} A{rx-t} {ry-t} 0 0 1 {x-rx+t} {y} Z',layer)


def bridge_waterway():
    s=Scene('normal-02','吊り橋の水路',2,'深い水路の奥を横切る吊り橋。斜めの水路、左右の石積み、遠い橋を重ね、入江より内陸へ進む。',
            pal('#CCDCD4','#B6CEC6','#E1DDC8','#ADC1AF','#91A99B','#748F8A','#647D7C','#D7CFB5','#AD9A7E','#A7C3B3'))
    sky(s);hills(s);water(s,429)
    s.path('shade','M0 604 V350 L115 322 L227 364 L264 416 L211 457 L170 604 Z','near')
    s.path('light','M0 350 L115 322 L227 364 L211 379 L109 341 L0 370 Z','near')
    s.path('mid','M1120 604 V311 L1028 298 L950 344 L917 411 L957 448 L984 604 Z','near')
    s.path('light','M1120 311 L1028 298 L950 344 L943 363 L1027 318 L1120 330 Z','near')
    block(s,159,275,29,171,'far','light','shade','structure-back',9)
    block(s,906,266,27,182,'far','light','shade','structure-back',8)
    s.path('accent','M173 290 C384 368 692 368 919 281 L919 289 C687 380 386 379 173 298 Z','structure-back')
    s.path('shade','M155 383 L938 369 L943 381 L157 395 Z','structure-back')
    for x in [237,356,476,596,716,836]:
        y=302+60*math.sin((x-173)/746*math.pi)
        s.poly('far',[(x,y),(x+4,y),(x+4,382),(x,382)],'structure-back')
    s.path('water','M248 506 C406 473 631 493 840 469 C756 508 718 555 692 604 H283 C337 564 319 534 248 506 Z','near')
    return s


def ruins():
    s=Scene('normal-03','遺跡の入口',3,'草をかぶった石の門。欠けた柱と門の向こうの明るい盆地で、閉鎖ではなく発見の入口を描く。',
            pal('#D7DACB','#BAC9BE','#E9DBC0','#BBC4AD','#ACB29A','#8C9C8B','#6F837D','#DFCFAD','#B9A285'))
    sky(s);hills(s)
    s.path('light','M367 604 L449 426 L613 404 L782 604 Z','landscape')
    s.path('far','M0 420 L118 387 L275 426 L341 604 H0 Z','near')
    s.path('shade','M1120 387 L1010 401 L855 458 L813 604 H1120 Z','near')
    arch(s,108,493,265,330)
    block(s,91,431,64,125,'shade','light','deep')
    block(s,352,355,50,179,'mid','light','shade')
    s.poly('light',[(352,355),(375,331),(396,340),(402,355)],'structure')
    block(s,875,306,71,260,'mid','light','shade')
    block(s,846,284,125,34,'mid','light','shade')
    s.path('accent','M109 251 L158 213 L233 199 L299 218 L325 247 L293 238 L232 220 L172 234 L133 267 Z','structure')
    s.path('mid','M0 553 C101 529 172 555 258 541 C313 531 332 555 379 560 L363 604 H0 Z','near')
    s.path('far','M832 566 L908 521 L947 535 L980 524 L1069 552 L1120 541 V604 H832 Z','near')
    for x,y,w in [(428,460,42),(671,489,55),(776,554,83)]:block(s,x,y,w,23,'far','light','shade','near',8)
    return s


def cloud_airport():
    s=Scene('normal-05','雲の空港',5,'雲海に沈む停まった空の港。左奥の格納庫と右の管制塔、上空の大きな余白。',
            pal('#CBDDDD','#B0CDD2','#E9E2CE','#B1C7C7','#99B1B4','#7E989F','#6C868E','#DEDAC5','#B7A98B'))
    sky(s,320)
    s.path('far','M0 418 C137 360 227 403 319 379 C432 344 523 412 612 389 C782 346 910 402 1120 370 V604 H0 Z','distance')
    block(s,78,303,250,93,'far','light','shade','structure-back',37)
    s.path('shade','M96 396 V339 Q199 270 311 338 V396 H283 V348 Q199 307 125 349 V396 Z','structure-back')
    block(s,907,253,38,180,'mid','light','shade','structure-back',15)
    block(s,880,225,94,38,'mid','light','shade','structure-back',13)
    s.poly('far',[(890,228),(933,207),(978,216),(961,228)],'structure-back')
    s.path('mid','M0 427 L347 413 L420 435 L332 454 L0 466 Z','landscape')
    s.path('shade','M0 466 L332 454 L291 493 L31 498 L0 488 Z','landscape')
    s.path('far','M835 462 L1120 429 V488 L912 509 Z','landscape')
    s.path('light','M0 488 C112 459 163 512 292 491 C416 470 477 514 595 488 C769 449 831 499 950 476 C1032 461 1084 478 1120 468 V604 H0 Z','near')
    s.path('sky','M0 550 C156 515 249 566 379 541 C520 516 625 564 759 534 C915 503 1040 545 1120 522 V604 H0 Z','near')
    s.path('far','M0 593 C194 561 325 604 505 582 C750 559 910 600 1120 569 V604 H0 Z','veil')
    return s


def crystal_road():
    s=Scene('normal-06','水晶の反射路',6,'低い山裾から伸びる大きな鉱晶。角ばった自然石と淡い水面を重ね、城壁とは異なる自然の反射路。',
            pal('#D9DCE2','#C0CCD7','#E7DDD4','#BAC4CF','#A6B6C4','#8F9EAF','#718898','#D6DDD8','#BCCFD1','#AFC5CC'))
    sky(s);water(s,432)
    s.path('far','M0 358 L112 330 L201 375 L276 349 L371 416 L481 433 H0 Z','distance')
    s.path('far','M704 433 L773 360 L822 376 L907 302 L1016 356 L1120 337 V488 Z','distance')
    crystal(s,143,481,176,298)
    crystal(s,276,463,76,161,front='accent',side='mid',edge='light')
    crystal(s,970,479,180,217,front='accent',side='shade',edge='light')
    crystal(s,1078,508,102,329)
    s.path('shade','M0 513 L139 472 L246 498 L320 481 L392 529 L302 604 H0 Z','near')
    s.path('mid','M1120 508 L1042 495 L941 523 L850 521 L789 563 L861 604 H1120 Z','near')
    s.path('water','M316 553 C473 522 651 549 849 521 L802 549 C637 567 499 553 355 578 Z','near')
    crystal(s,69,604,92,109,'near','mid','deep','accent')
    return s


def prism_wall():
    s=Scene('normal-07','プリズム城壁',7,'淡い鉱石を組んだ段状の城壁。斜めに折れる壁面と空の開口で、鉱晶の野から人工の防壁へ移る。',
            pal('#D4D9DD','#BCC9D1','#E6DED0','#BDC5C7','#A4B5B7','#8D9EA9','#738797','#DEDCCB','#B8C9C4'))
    sky(s);hills(s)
    s.path('far','M0 350 L304 300 L430 370 L415 513 L0 557 Z','structure-back')
    s.path('light','M0 350 L304 300 L331 310 L25 367 Z','structure-back')
    s.path('shade','M304 300 L430 370 L415 513 L323 472 Z','structure-back')
    for x,y in [(69,322),(188,304),(302,301)]:block(s,x,y,32,75,'mid','light','shade','structure-back',11)
    s.path('mid','M1120 252 L980 276 L826 392 L841 604 H1120 Z','structure')
    s.path('light','M1120 252 L980 276 L826 392 L846 408 L992 293 L1120 273 Z','structure')
    s.path('shade','M980 276 L999 605 L841 604 L826 392 Z','structure')
    for x,y in [(1022,231),(916,282),(831,354)]:block(s,x,y,39,68,'mid','light','shade','structure',14)
    s.poly('accent',[(1028,336),(1062,307),(1084,365),(1054,410)],'structure')
    s.poly('light',[(1054,410),(1084,365),(1091,440),(1070,469)],'structure')
    s.path('far','M0 565 L211 504 L330 510 L474 604 H0 Z','near')
    s.path('light','M330 604 L466 444 L598 429 L795 604 Z','near')
    return s


def rising_mine():
    s=Scene('normal-08','上昇の坑道',8,'縦に開いた鉱山の吹抜け。遠い昇降機と天井の明かりを、左右の岩層が包む。',
            pal('#AEBABB','#95A5AA','#D1D0BA','#A8B4AF','#8F9F9C','#788C8D','#5D747B','#CEBCA1','#AD9A80'))
    sky(s,298)
    s.path('light','M463 0 H684 L657 180 L697 337 L605 471 L471 450 L425 296 L461 163 Z','distance')
    s.path('far','M0 0 H359 L321 161 L357 301 L309 447 L348 604 H0 Z','distance')
    s.path('mid','M1120 0 H802 L834 139 L790 299 L856 470 L795 604 H1120 Z','distance')
    s.path('shade','M0 0 H183 L158 153 L212 281 L163 452 L223 604 H0 Z','landscape')
    s.path('deep','M1120 0 H968 L927 170 L967 325 L929 478 L963 604 H1120 Z','near')
    s.path('light','M183 0 H218 L194 147 L245 281 L198 452 L248 604 H223 L163 452 L212 281 L158 153 Z','landscape')
    block(s,725,119,41,419,'mid','light','shade','structure-back',14)
    block(s,749,336,99,22,'shade','light','deep','structure-back',13)
    s.rect('accent',743,176,8,156,'structure-back')
    block(s,75,291,127,29,'mid','light','shade','structure',13)
    block(s,908,426,152,38,'shade','light','deep','structure',15)
    s.path('far','M236 604 L319 520 L414 493 L456 604 Z','near')
    s.path('shade','M1120 562 L995 526 L893 551 L803 604 H1120 Z','near')
    return s


def amber_engine():
    s=Scene('normal-09','琥珀の機関',9,'止まった昇降動力室。左の大きな機関輪と右上の琥珀色の採光窓を、穏やかな暗部がつなぐ。',
            pal('#AFA89E','#969C98','#C6B59D','#AFAF9F','#999E92','#7F8C85','#647A76','#D3BF9D','#BF9E76'))
    sky(s,275)
    s.path('far','M0 109 L339 78 L420 134 L382 604 H0 Z','structure-back')
    s.path('light','M806 0 H1045 L1002 249 L838 284 Z','distance')
    s.poly('accent',[(850,0),(883,0),(865,267),(833,278)],'distance')
    ring(s,110,352,246,240,59,'mid','shade')
    ring(s,110,352,157,155,23,'light','shade')
    s.poly('accent',[(-39,145),(2,139),(223,562),(182,570)],'structure')
    s.poly('shade',[(-100,418),(-95,382),(334,297),(338,331)],'structure')
    block(s,928,299,89,262,'mid','light','shade')
    block(s,883,283,179,38,'mid','light','deep')
    s.path('mid','M369 0 H413 V231 L462 254 V279 L373 250 Z','structure-back')
    s.path('far','M471 422 L752 396 L795 431 L795 470 L454 470 Z','structure-back')
    s.path('shade','M0 560 L262 514 L425 564 L473 604 H0 Z','near')
    s.path('mid','M1120 544 L929 512 L782 548 L733 604 H1120 Z','near')
    return s


def wind_observatory():
    s=Scene('normal-10','風の観測台',10,'風に磨かれた高原。左の低い観測棟と右の風見塔を離して、横へ流れる空を広く見せる。',
            pal('#CDDAD6','#AFCCD0','#E5DFCC','#B3C4B6','#9DAF9E','#82988D','#6C827D','#D8CBAE','#B2A181'))
    sky(s);hills(s)
    s.path('mid','M0 604 V410 L127 381 L263 409 L333 495 L401 604 Z','near')
    s.path('light','M0 410 L127 381 L263 409 L276 430 L124 403 L0 431 Z','near')
    block(s,87,325,130,75,'mid','light','shade','structure',21)
    s.path('shade','M62 324 L151 279 L246 318 L218 330 L98 341 Z','structure')
    s.path('far','M1120 604 V394 L1034 378 L923 431 L859 515 L811 604 Z','near')
    block(s,972,228,26,181,'mid','light','shade','structure',11)
    s.rect('shade',932,222,110,12)
    s.poly('accent',[(984,215),(936,189),(984,198),(1034,184),(998,211)],'structure')
    s.path('light','M0 202 C176 176 283 222 419 201 L445 212 C263 231 149 193 0 217 Z','air')
    s.path('far','M565 263 C760 223 939 263 1120 232 V245 C935 276 766 239 592 275 Z','air')
    return s


def frozen_gorge():
    s=Scene('normal-11','凍てつく峡谷',11,'青白い氷壁の間を抜ける狭い峡谷。左の雪庇と右の柱状氷、奥の明るい曲がり角。',
            pal('#D7E1E1','#C1D4DA','#EBE8D9','#BDCDD2','#A6BCC5','#8DA6B4','#748F9F','#E5E7D7','#C4D7D5'))
    sky(s);water(s,468)
    s.path('far','M0 307 L129 264 L243 337 L350 302 L452 414 L536 445 H0 Z','distance')
    s.path('mid','M0 187 L89 167 L150 194 L207 300 L187 382 L251 491 L228 604 H0 Z','landscape')
    s.path('light','M0 175 L89 155 L155 180 L166 210 L92 192 L0 214 Z','landscape')
    s.path('shade','M150 194 L207 300 L187 382 L251 491 L228 604 L170 604 L178 491 L144 382 L167 304 Z','landscape')
    s.path('mid','M1120 131 L1013 182 L977 279 L929 336 L945 427 L873 518 L883 604 H1120 Z','structure')
    s.path('light','M1120 131 L1013 182 L997 224 L1039 211 L1120 182 Z','structure')
    s.path('accent','M1013 182 L1028 206 L1006 299 L966 355 L981 435 L913 528 L925 604 H883 L873 518 L945 427 L929 336 L977 279 Z','structure')
    s.path('shade','M1120 284 L1065 339 L1080 431 L1031 517 L1052 604 H1120 Z','structure')
    s.path('light','M0 542 L104 509 L227 524 L298 563 L265 604 H0 Z','near')
    s.path('water','M283 604 C334 529 520 509 617 461 C687 428 775 439 829 451 C691 479 709 527 584 556 C496 577 491 591 475 604 Z','near')
    return s


def forge_corridor():
    s=Scene('normal-13','鍛冶の回廊',13,'炉からの残光が通る静かな鍛冶場。斜めの配管、奥行きのある煉瓦開口、冷えた大きな梁。',
            pal('#B6A99B','#9F9C96','#D7B59A','#BAA591','#9C968B','#81877F','#677A77','#D9B890','#C29D7B'))
    sky(s,280)
    arch(s,120,515,268,365,'far','light','shade','structure-back')
    arch(s,819,501,236,346,'mid','light','shade','structure-back')
    s.path('accent','M0 89 H1120 V125 L0 142 Z','structure-back')
    s.path('shade','M0 125 L1120 108 V147 L0 170 Z','structure-back')
    s.path('light','M0 140 L1120 117 V128 L0 151 Z','structure-back')
    block(s,38,207,64,347,'mid','light','shade')
    block(s,1018,189,72,373,'mid','light','deep')
    s.path('shade','M0 351 H192 V371 H0 Z','structure')
    s.path('light','M1120 335 H940 L908 369 V401 H930 V380 L951 357 H1120 Z','structure')
    s.path('mid','M0 551 L186 517 L365 560 L447 604 H0 Z','near')
    s.path('mid','M1120 547 L970 507 L805 548 L745 604 H1120 Z','near')
    block(s,142,477,125,44,'shade','light','deep','near',26)
    s.path('far','M388 604 L471 471 L645 451 L822 604 Z','near')
    s.path('light','M517 604 L554 477 L606 467 L655 604 Z','near')
    return s


def magnetic_mine():
    s=Scene('normal-14','磁石の採掘場',14,'露天の鉱石段丘。自然の鉱脈と離れた運搬架台で、炉から再び広い外へ抜ける。',
            pal('#D0D9D7','#B8CCCD','#E2D9C8','#B4BFBB','#9EACA9','#869A9B','#6C858C','#D0C6AA','#AD9E87'))
    sky(s)
    s.path('far','M0 419 L102 374 L231 396 L322 345 L448 418 L606 423 L719 371 L860 395 L974 334 L1120 375 V604 H0 Z','distance')
    s.path('mid','M0 379 L121 367 L208 407 L193 456 L286 488 L247 604 H0 Z','landscape')
    s.path('light','M0 379 L121 367 L208 407 L196 420 L117 387 L0 399 Z','landscape')
    s.path('shade','M0 457 L193 456 L286 488 L247 509 L0 485 Z','landscape')
    s.path('mid','M1120 333 L1007 347 L950 399 L970 458 L864 509 L882 604 H1120 Z','structure')
    s.path('light','M1120 333 L1007 347 L950 399 L966 413 L1015 370 L1120 359 Z','structure')
    s.path('shade','M1120 470 L970 458 L864 509 L883 527 L1120 494 Z','structure')
    for x,y,w,h in [(122,445,67,78),(974,459,81,105),(1024,550,106,88)]:crystal(s,x,y,w,h,'structure','shade','deep','accent')
    block(s,259,275,24,167,'far','light','shade','structure-back',9)
    block(s,796,257,23,171,'far','light','shade','structure-back',8)
    s.path('shade','M269 270 L815 252 V264 L269 282 Z','structure-back')
    block(s,663,286,48,35,'mid','light','shade','structure-back',7)
    s.rect('far',684,260,4,26,'structure-back')
    s.path('far','M241 604 L386 496 L613 482 L856 604 Z','near')
    return s


def polarity_lab():
    s=Scene('normal-15','極性の実験棟',15,'開放された古い実験棟。対になる磁気設備を左右に離し、中央の静かな空気を保つ。',
            pal('#CCD8D6','#B0C7CA','#DBDECF','#B0C0BC','#95AEAB','#7F9899','#677F87','#D2CFB5','#B5A78D'))
    sky(s)
    s.path('far','M0 118 L302 118 L358 167 V604 H0 Z','structure-back')
    s.path('far','M1120 94 H858 L803 159 V604 H1120 Z','structure-back')
    s.rect('light',0,116,301,16,'structure-back')
    s.rect('light',858,92,262,18,'structure-back')
    s.path('mid','M0 456 L333 429 L390 476 L327 604 H0 Z','landscape')
    s.path('mid','M1120 435 L829 420 L773 472 L824 604 H1120 Z','landscape')
    ring(s,145,303,116,123,30,'mid','shade')
    block(s,94,411,102,104,'shade','light','deep')
    ring(s,990,290,101,130,28,'mid','shade')
    block(s,947,413,88,96,'shade','light','deep')
    s.rect('accent',130,233,29,38)
    s.rect('light',976,317,27,40)
    block(s,307,155,31,263,'mid','light','shade','structure-back',12)
    block(s,796,151,27,258,'mid','light','shade','structure-back',10)
    s.path('light','M391 604 L472 451 L648 437 L767 604 Z','near')
    s.path('far','M517 604 L548 456 L583 450 L604 604 Z','near')
    return s


def sky_garden():
    s=Scene('normal-16','空中庭園',16,'雲上の水盤と緑の段丘。崩れた庭のアーチと流れる水が、鉱山の硬い形をやわらげる。',
            pal('#CCDCD3','#B4CEC8','#E6DFC9','#B5C6B1','#9DB397','#829E8C','#6D8980','#D8D2B3','#BDC3A1','#AFC7BC'))
    sky(s);hills(s)
    s.path('light','M0 485 C186 446 325 494 485 470 C684 442 865 485 1120 447 V604 H0 Z','distance')
    s.path('far','M0 545 C202 511 330 555 525 530 C760 504 945 544 1120 521 V604 H0 Z','distance')
    s.path('mid','M0 349 L144 323 L294 355 L331 396 L260 421 L36 418 L0 401 Z','structure')
    s.path('shade','M36 418 L260 421 L202 470 L104 461 Z','structure')
    s.path('accent','M0 349 L144 323 L294 355 L310 372 L155 349 L0 373 Z','structure')
    arch(s,83,345,104,167,'far','light','shade')
    s.path('mid','M1120 306 L987 312 L901 355 L928 394 L1084 402 L1120 390 Z','structure')
    s.path('shade','M928 394 L1084 402 L1036 449 L977 432 Z','structure')
    s.path('light','M1120 306 L987 312 L901 355 L919 368 L993 334 L1120 328 Z','structure')
    s.path('water','M1007 338 C1005 402 1018 448 1004 500 L1028 521 C1050 454 1031 406 1035 332 Z','structure')
    s.ellipse('shade',271,325,53,31)
    s.ellipse('accent',248,305,47,30)
    s.ellipse('mid',1001,283,59,32)
    s.ellipse('accent',1038,273,45,25)
    s.path('sky','M0 591 C210 548 399 597 570 575 C764 551 984 594 1120 570 V604 H0 Z','near')
    return s


def storm_carrier():
    s=Scene('normal-17','嵐の空母',17,'青灰の嵐雲を背にした遠い停泊空母。小さな艦橋と大きな船腹で質量を示し、手前は明るい雲海。',
            pal('#BAC9CB','#9AAFB8','#D4D5C5','#9EB3B5','#8DA3A8','#768E99','#627D8D','#C8C9B7','#B0A590'))
    sky(s,302)
    s.path('shade','M0 167 C141 99 245 168 340 143 C431 121 487 176 579 151 C774 101 942 188 1120 131 V248 C967 228 860 252 708 225 C465 252 280 207 0 265 Z','distance')
    s.path('far','M0 314 C145 274 219 324 343 298 C514 260 629 317 759 294 C928 263 1028 309 1120 287 V604 H0 Z','distance')
    s.path('mid','M160 369 L267 325 L778 318 L936 351 L873 390 L305 407 Z','structure-back','distant stationary hull, never the combat boss')
    s.path('light','M160 369 L267 325 L778 318 L936 351 L884 361 L286 350 Z','structure-back')
    s.path('shade','M160 369 L305 407 L873 390 L936 351 L884 361 L315 383 Z','structure-back')
    s.path('deep','M305 407 L873 390 L825 428 L408 443 Z','structure-back')
    block(s,713,263,58,69,'far','light','shade','structure-back',17)
    block(s,694,247,103,24,'mid','light','shade','structure-back',12)
    s.rect('shade',756,216,7,35,'structure-back')
    s.path('light','M0 457 C119 402 221 469 354 438 C503 405 614 464 756 429 C902 395 991 449 1120 414 V604 H0 Z','near')
    s.path('sky','M0 528 C192 481 329 548 506 514 C684 481 862 535 1120 496 V604 H0 Z','near')
    s.path('far','M0 592 C191 560 377 599 602 573 C812 550 989 590 1120 568 V604 H0 Z','veil')
    return s


def fortress_gates():
    s=Scene('normal-18','要塞の重層門',18,'幾重もの閉じた安全扉。入口ごとに色の距離を変え、真ん中の遠い採光部へ奥行きを集める。',
            pal('#C0C7C2','#A5B5B4','#DDD5BB','#AAB9AF','#92A59E','#798F8A','#617C7A','#D1C9AC','#B4A282'))
    sky(s,300)
    arch(s,382,496,356,278,'far','light','mid','structure-back')
    arch(s,207,555,706,451,'mid','light','shade')
    s.poly('shade',[(0,0),(146,0),(146,604),(0,604)],'near')
    s.poly('deep',[(1120,0),(998,0),(998,604),(1120,604)],'near')
    s.poly('light',[(146,0),(169,0),(169,604),(146,604)],'near')
    s.poly('mid',[(974,0),(998,0),(998,604),(974,604)],'near')
    s.path('accent','M236 138 H883 V156 H236 Z','structure')
    block(s,214,374,81,186,'shade','light','deep')
    block(s,827,366,77,192,'shade','light','deep')
    s.path('far','M146 604 L418 458 L690 458 L998 604 Z','near')
    s.path('light','M407 604 L502 458 H555 L533 604 Z','near')
    for x in [246,848]:
        s.rect('accent',x,267,21,47)
        s.rect('light',x+5,272,10,25)
    return s


def dawn_core():
    s=Scene('normal-19','夜明けの核',19,'中枢へ至る夜明けの連絡区。閉じた保全棟を左右に置き、暖かな空の開口へ向かう。正式名や帰還の灯りはまだ示さない。',
            pal('#D1D7CB','#B0C5C3','#E9DABD','#B8C1AE','#9EAEA2','#839B93','#6D8584','#DCD1B3','#BAA480'))
    sky(s)
    s.path('far','M0 393 L140 354 L216 371 L323 341 L435 403 L565 421 L752 371 L882 390 L1000 344 L1120 369 V604 H0 Z','distance')
    block(s,30,238,180,247,'mid','light','shade','structure-back',42)
    block(s,882,205,178,290,'mid','light','shade','structure-back',34)
    s.path('light','M0 496 L214 475 L379 500 L421 604 H0 Z','near')
    s.path('mid','M1120 492 L907 478 L752 512 L721 604 H1120 Z','near')
    s.path('far','M294 604 L443 431 L632 422 L838 604 Z','landscape')
    s.path('light','M411 604 L493 429 L541 427 L514 604 Z','landscape')
    arch(s,138,471,110,175,'far','light','shade','structure-back')
    arch(s,885,478,109,176,'far','light','shade','structure-back')
    s.path('shade','M0 312 H112 V328 H0 Z','structure')
    s.path('shade','M1120 295 H1027 V314 H1120 Z','structure')
    s.rect('accent',83,264,17,35)
    s.rect('accent',1004,239,18,37)
    s.data['selectionNote']='Shared theme fallback for 96-100; stage100 always selects its map-specific final scene.'
    return s


def tideclaw():
    s=Scene('boss-010','タイドクロー — 潮門の影',1,'鏡の岸壁の白い石と静水を受け継ぐ。手前の潮門と水圧のある狭い港口により、開けた入江から緊張へ。',
            pal('#C5D2CE','#ABBFC0','#DCD5C1','#A9BAB0','#96A9A1','#7C9490','#687F82','#D7C4A7','#B5A285','#9DB9B1'),'boss',10)
    sky(s);water(s,421)
    s.path('far','M0 299 L93 263 L145 282 L188 349 L169 418 H0 Z','distance')
    s.path('far','M1120 272 L1011 297 L960 357 L947 424 H1120 Z','distance')
    block(s,0,314,238,219,'mid','light','shade','structure',28)
    block(s,886,290,236,251,'mid','light','shade','structure',27)
    s.path('shade','M0 533 L238 533 L357 604 H0 Z','near')
    s.path('deep','M1120 541 H886 L783 604 H1120 Z','near')
    s.path('light','M0 314 L238 314 L267 300 L28 286 Z','structure')
    s.path('mid','M271 88 H310 V270 L334 295 H299 L271 273 Z','structure-back')
    s.path('mid','M827 77 H864 V274 L841 299 H806 L827 270 Z','structure-back')
    s.path('shade','M0 74 L1120 53 V87 L0 109 Z','near')
    s.path('accent','M0 74 L1120 53 V64 L0 85 Z','near')
    ring(s,109,432,57,58,17,'shade','deep')
    ring(s,1010,419,51,55,16,'shade','deep')
    s.path('water','M267 486 C417 460 612 488 854 461 L823 483 C634 512 449 488 300 513 Z','near')
    s.path('far','M364 556 C518 543 675 553 757 541 L744 553 C621 569 480 558 399 570 Z','near')
    return s


def gatekeeper():
    s=Scene('boss-020','ゲートキーパー — 閉鎖門',3,'遺跡の石色と草の余韻を残し、門柱を大きく寄せて閉鎖機構の重さを示す。ボスの砲や本体を背景へ複製しない。',
            pal('#C2C9BD','#A6B8AE','#DBCFB4','#ADB5A2','#979F8D','#7D8E81','#677B76','#D3C29F','#B4A080'),'boss',20)
    sky(s)
    arch(s,338,549,451,399,'far','light','mid','structure-back')
    block(s,0,171,260,434,'mid','light','shade','structure',34)
    block(s,861,130,259,474,'mid','light','deep','structure',28)
    s.poly('shade',[(260,171),(338,216),(338,604),(260,604)],'structure')
    s.poly('mid',[(789,177),(861,130),(861,604),(789,604)],'structure')
    s.path('shade','M0 79 H1120 V136 L0 174 Z','near')
    s.path('light','M0 79 H1120 V95 L0 132 Z','near')
    s.poly('accent',[(286,188),(314,204),(314,276),(286,260)],'structure')
    s.poly('accent',[(812,202),(840,183),(840,254),(812,273)],'structure')
    s.path('far','M260 604 L441 454 L650 446 L861 604 Z','near')
    s.path('light','M407 604 L476 455 L519 453 L506 604 Z','near')
    block(s,79,442,131,78,'shade','light','deep','near',18)
    block(s,926,418,123,92,'shade','light','deep','near',19)
    return s


def cloudray():
    s=Scene('boss-030','クラウドレイ — 雲上の閉鎖空域',5,'雲の空港と同じ港の建材を維持。雲が中央へ寄り、左右の係留塔を大きくして空域の圧力を高める。',
            pal('#B7CED0','#97B4BF','#D9D9C4','#9FB7BA','#8EA7AC','#74939E','#617E8B','#D1CEB5','#AFA184'),'boss',30)
    sky(s)
    s.path('shade','M0 206 C112 119 203 219 308 187 C372 170 421 185 454 213 L417 248 C282 229 173 260 0 254 Z','distance')
    s.path('far','M1120 155 C981 119 917 183 822 169 C748 158 712 177 681 206 L710 236 C891 210 984 248 1120 208 Z','distance')
    block(s,38,236,87,318,'mid','light','shade','structure',25)
    block(s,0,204,174,47,'mid','light','shade','structure',22)
    block(s,985,211,80,347,'mid','light','shade','structure',24)
    block(s,940,178,180,49,'mid','light','shade','structure',23)
    s.path('accent','M128 239 L289 316 L280 333 L125 267 Z','structure')
    s.path('shade','M986 227 L820 312 L831 331 L986 255 Z','structure')
    s.path('light','M0 500 C111 440 232 507 332 476 C404 452 435 485 459 512 C376 521 300 541 248 576 L0 604 Z','near')
    s.path('light','M1120 467 C981 414 898 484 795 469 C737 460 700 476 675 502 C780 528 843 544 896 591 L1120 604 Z','near')
    s.path('sky','M0 587 C211 542 369 604 537 568 C731 526 947 599 1120 553 V604 H0 Z','veil')
    return s


def prism_guardian():
    s=Scene('boss-040','プリズム・ガーディアン — 屈折の門廊',7,'プリズム城壁の切断面を受け継ぐ。左右の結晶建築と張り出す天井で、開いた城壁より密度のある門廊へ。',
            pal('#BDC8CE','#A2B5C1','#D8D4C4','#A9BAC1','#93A9B3','#7C94A5','#657F94','#D0D5C6','#B2C6C5'),'boss',40)
    sky(s)
    s.path('far','M0 0 H1120 V115 L862 158 L740 124 L383 143 L202 106 L0 164 Z','structure-back')
    s.path('shade','M0 0 H278 L233 125 L179 184 L0 203 Z','near')
    s.path('shade','M1120 0 H864 L887 123 L956 169 L1120 150 Z','near')
    crystal(s,129,557,281,414,'structure','mid','shade','light')
    crystal(s,1002,552,244,432,'structure','mid','shade','light')
    s.poly('accent',[(271,158),(313,137),(338,353),(290,433),(248,380)],'structure-back')
    s.poly('shade',[(313,137),(338,353),(290,433),(304,324)],'structure-back')
    s.poly('accent',[(828,147),(864,165),(891,369),(844,423),(805,354)],'structure-back')
    s.poly('light',[(828,147),(844,317),(805,354)],'structure-back')
    s.path('mid','M0 556 L243 517 L397 574 L421 604 H0 Z','near')
    s.path('shade','M1120 547 L902 509 L755 558 L724 604 H1120 Z','near')
    s.path('far','M383 604 L488 437 L632 425 L787 604 Z','landscape')
    return s


def dust_driller():
    s=Scene('boss-050','ダスト・ドリラー — 主掘削竪坑',9,'琥珀の機関の灯りを残し、坑道の土色と巨大な支保工を組む。天井が低く迫るが、中央の戦闘領域は静かに保つ。',
            pal('#B3ABA0','#969F99','#CEBBA0','#A9AF9E','#949F91','#7B8D83','#607870','#D0B68E','#B7A079'),'boss',50)
    sky(s)
    s.path('far','M0 0 H1120 V161 L963 181 L817 134 L693 175 L524 139 L360 186 L173 142 L0 171 Z','distance')
    s.path('shade','M0 0 H1120 V83 L966 113 L827 87 L680 115 L516 91 L348 124 L160 98 L0 125 Z','near')
    block(s,47,141,87,420,'mid','light','shade','structure',29)
    block(s,971,127,92,437,'mid','light','deep','structure',29)
    s.poly('accent',[(81,141),(111,128),(286,285),(263,303)],'structure')
    s.poly('accent',[(1004,127),(1035,142),(856,302),(833,283)],'structure')
    ring(s,25,450,109,118,35,'shade','deep')
    ring(s,1110,412,116,133,33,'shade','deep')
    s.path('mid','M0 537 L185 480 L330 531 L421 604 H0 Z','near')
    s.path('shade','M1120 529 L963 485 L823 526 L737 604 H1120 Z','near')
    s.path('far','M341 604 L442 457 L665 447 L811 604 Z','landscape')
    s.path('light','M499 604 L536 454 L584 450 L621 604 Z','landscape')
    return s


def whitehowl():
    s=Scene('boss-060','ホワイトハウル — 吹雪の狭門',11,'凍てつく峡谷の氷と雪を残し、風除けの大きな壁と斜めの吹雪色面で圧迫感を出す。粒子や細い風線は使わない。',
            pal('#BFCFD5','#A2BBC6','#DBDDD0','#AEC3CC','#96B0BE','#809CAB','#678697','#D9DFD2','#BCCDC9'),'boss',60)
    sky(s)
    s.path('far','M0 207 L153 193 L245 271 L320 404 L292 604 H0 Z','distance')
    s.path('mid','M1120 149 L979 194 L891 298 L861 445 L899 604 H1120 Z','structure')
    s.path('light','M1120 149 L979 194 L953 231 L1012 216 L1120 190 Z','structure')
    s.path('shade','M0 151 L113 177 L151 314 L131 474 L172 604 H0 Z','near')
    s.path('light','M0 151 L113 177 L130 218 L66 205 L0 191 Z','near')
    block(s,179,305,58,233,'mid','light','shade','structure',19)
    block(s,846,261,61,265,'mid','light','shade','structure',19)
    s.path('light','M0 325 C237 244 350 253 499 202 L547 204 C389 279 207 289 0 369 Z','veil')
    s.path('far','M601 372 C773 308 951 297 1120 223 V248 C930 329 766 347 650 397 Z','veil')
    s.path('light','M0 557 L179 516 L343 553 L436 604 H0 Z','near')
    s.path('mid','M1120 554 L931 517 L766 562 L728 604 H1120 Z','near')
    return s


def forge_titan():
    s=Scene('boss-070','フォージ・タイタン — 大炉の前庭',13,'鍛冶の回廊の煉瓦と残熱を継承し、両側の大炉と天井梁を太くする。熱は背景の広い単色面にとどめる。',
            pal('#AEA193','#96968E','#CCAD91','#AA9F8B','#959586','#7E887A','#62766D','#D1B38D','#B89A76'),'boss',70)
    sky(s,270)
    arch(s,0,557,321,367,'mid','light','shade')
    arch(s,828,555,292,378,'mid','light','shade')
    s.path('accent','M0 468 H66 V272 Q162 226 245 280 V468 H270 V290 Q167 197 39 274 V468 Z','structure')
    s.path('accent','M865 462 H890 V285 Q983 230 1060 280 V465 H1090 V271 Q980 200 865 276 Z','structure')
    s.path('shade','M0 0 H1120 V107 L0 132 Z','near')
    s.path('light','M0 96 L1120 71 V85 L0 112 Z','near')
    s.poly('mid',[(286,0),(331,0),(379,208),(346,221)],'structure')
    s.poly('mid',[(807,0),(852,0),(780,217),(747,203)],'structure')
    s.path('shade','M0 550 L261 517 L394 574 L416 604 H0 Z','near')
    s.path('deep','M1120 546 L910 508 L760 562 L726 604 H1120 Z','near')
    s.path('far','M327 604 L463 440 L651 429 L824 604 Z','landscape')
    s.path('light','M504 604 L546 437 L580 434 L605 604 Z','landscape')
    return s


def polaris_core():
    s=Scene('boss-080','ポラリス・コア — 極性収束室',15,'実験棟の対になる設備が近づき、上部の支持環と斜めの支柱が中央へ重みを集める。磁力線や点滅端子は背景へ描かない。',
            pal('#B3C6C6','#98B2BC','#D1D2BF','#A0B5B4','#8AA5A6','#74929A','#5F7D89','#C5C9B0','#ADA081'),'boss',80)
    sky(s)
    ring(s,563,-73,391,291,43,'far','mid','structure-back')
    s.path('mid','M0 0 H174 L240 604 H0 Z','structure')
    s.path('mid','M1120 0 H947 L887 604 H1120 Z','structure')
    s.path('light','M174 0 H194 L260 604 H240 Z','structure')
    s.path('shade','M927 0 H947 L887 604 H865 Z','structure')
    ring(s,127,339,109,151,33,'shade','deep')
    ring(s,998,325,107,150,34,'shade','deep')
    block(s,71,464,118,80,'shade','light','deep')
    block(s,943,449,115,93,'shade','light','deep')
    s.rect('accent',115,225,24,36)
    s.rect('light',985,394,25,36)
    s.path('far','M247 604 L445 449 L652 439 L876 604 Z','landscape')
    s.path('light','M442 604 L510 446 L550 443 L537 604 Z','landscape')
    return s


def skycarrier():
    s=Scene('boss-090','スカイキャリア — 嵐の係留域',17,'嵐の空母の空気色を受け継ぎ、係留柱と密な雲壁が迫る。背景にもう一隻の戦闘空母を置かず、戦うスカイキャリアの輪郭を守る。',
            pal('#AABFC5','#8EA8B5','#CED1BE','#93ACB2','#809CA5','#6F8B9A','#5C798D','#C4C6AE','#A79E85'),'boss',90)
    sky(s)
    s.path('shade','M0 142 C157 51 264 177 403 123 C487 91 570 137 636 111 C806 44 955 153 1120 92 V198 C962 178 843 208 700 188 C505 217 298 190 0 252 Z','distance')
    block(s,0,203,119,363,'mid','light','shade','structure',29)
    block(s,992,173,128,393,'mid','light','deep','structure',28)
    s.path('accent','M103 243 L269 326 L255 348 L103 269 Z','structure')
    s.path('shade','M995 214 L844 307 L856 328 L995 246 Z','structure')
    s.path('far','M0 433 C143 364 250 436 365 411 C413 401 449 424 460 453 C348 459 300 488 270 529 L0 566 Z','near')
    s.path('far','M1120 407 C972 340 867 418 779 397 C718 385 682 407 660 432 C787 448 858 477 891 518 L1120 553 Z','near')
    s.path('light','M0 542 C156 477 330 562 509 521 C718 473 934 564 1120 491 V604 H0 Z','veil')
    s.path('sky','M0 592 C191 554 371 604 575 575 C781 546 979 589 1120 561 V604 H0 Z','veil')
    return s


def final_scene(index):
    titles=['アークハート外殻 — 停止した保全門','アークハート内殻 — 空へ開いた搬送層',
            'アークハート核防護 — 岩盤の保全洞','アークハート中枢 — 最後の照合室']
    concepts=[
      '古い保全中枢の外周。太い配管、クリーム色の補強材、青緑の扉。まだ閉じた採光部と少数の真鍮色で、静かに待つ巨大施設を示す。',
      '保全棟の内殻が空へ開く搬送層。高い支持塔と空隙、遠い吊り構造、雲海。浮遊足場の実地形とは別の、空間そのものの広さを描く。',
      '古い中枢を支える自然岩盤の保全洞。連続する洞窟の天井と埋設配管。外殻と同じ建材を洞窟へつなぎ、核防護へ近づく。',
      '十機の帰還と安全記録を待つ保全中枢の照合室。巨大な支持環は画面端へ逃がし、中央を静かな一射の余白にする。帰還灯は未点灯のまま。'
    ]
    palettes=[
      pal('#9CB0AF','#819D9E','#C2C6B1','#97ACA3','#7E9A91','#69878A','#506F7A','#CCC3A5','#B5A078'),
      pal('#B8CFCC','#99BFC5','#DADBC3','#A0B9B2','#87A8A1','#739599','#5C7F89','#D5CCAD','#B7A27E'),
      pal('#96A6A3','#788F90','#B7B8A2','#91A69A','#79948B','#648184','#4C6C77','#C3B89A','#AE9773'),
      pal('#B7C8BB','#98B6B3','#E0D2B2','#A6B9A7','#8CA79A','#74968E','#5B7E80','#D7CAAA','#B6A17A')
    ]
    s=Scene(f'final-100-{index}',titles[index],19,concepts[index],palettes[index],'final',100,index)
    s.data['storyReferences']=['design/narrative_0_13.json:world.heart_secret',
                              'assets/cinematics/E01-01.jpeg','assets/cinematics/E02-01.jpeg',
                              'docs/change-requests/ARCLINE_FINAL_100_v0.21.3.md']
    s.data['spoilerScope']='stage100 only; no early name reveal, no return registration before victory'
    s.data['relay']=[['hana','koro','ban'],['sora','rico','hibari'],['mogu','rin','yui'],['gun']][index]
    sky(s,302 if index!=3 else 338)
    if index==0:
        s.path('far','M0 0 H1120 V121 L779 174 L588 137 L338 170 L0 126 Z','distance')
        arch(s,352,519,424,366,'far','light','mid','structure-back')
        block(s,0,73,192,531,'mid','light','shade','structure',32)
        block(s,927,57,193,547,'mid','light','deep','structure',31)
        s.path('shade','M0 227 H278 V259 H0 Z','structure')
        s.path('shade','M1120 206 H837 V240 H1120 Z','structure')
        s.path('accent','M0 223 H278 V232 H0 Z','structure')
        s.path('accent','M1120 202 H837 V212 H1120 Z','structure')
        s.poly('light',[(213,112),(241,123),(301,539),(275,544)],'structure')
        s.poly('light',[(887,102),(910,91),(849,542),(825,537)],'structure')
        s.path('deep','M0 0 H1120 V69 L0 100 Z','near')
        s.path('mid','M0 549 L233 512 L375 562 L421 604 H0 Z','near')
        s.path('shade','M1120 542 L904 506 L759 558 L728 604 H1120 Z','near')
    elif index==1:
        s.path('light','M0 451 C161 400 264 458 410 426 C617 382 751 456 915 412 C1011 391 1073 417 1120 401 V604 H0 Z','distance')
        s.path('far','M0 521 C220 484 356 543 555 505 C754 468 933 529 1120 491 V604 H0 Z','distance')
        s.path('mid','M0 0 H146 L169 180 L142 344 L182 500 H0 Z','structure')
        s.path('mid','M1120 0 H976 L954 172 L980 338 L940 499 H1120 Z','structure')
        s.path('light','M146 0 H165 L189 181 L162 344 L202 500 H182 L142 344 L169 180 Z','structure')
        s.path('shade','M976 0 H954 L930 175 L957 338 L917 499 H940 L980 338 L954 172 Z','structure')
        s.path('far','M235 95 H321 V299 L281 323 L240 293 Z','structure-back')
        s.path('light','M235 95 H251 V293 L281 309 L281 323 L240 293 Z','structure-back')
        s.path('far','M811 64 H888 V281 L850 306 L815 283 Z','structure-back')
        s.path('light','M811 64 H826 V277 L850 294 L850 306 L815 283 Z','structure-back')
        ring(s,562,-100,365,257,31,'far','mid','structure-back')
        s.poly('accent',[(79,0),(102,0),(285,185),(271,202)],'structure')
        s.poly('accent',[(1011,0),(1034,0),(852,182),(837,166)],'structure')
        s.path('sky','M0 585 C205 544 374 597 555 569 C772 535 950 588 1120 553 V604 H0 Z','veil')
    elif index==2:
        s.path('far','M0 0 H1120 V181 L1016 148 L937 203 L826 166 L704 211 L572 162 L465 207 L345 153 L224 195 L115 145 L0 191 Z','distance','continuous cave ceiling')
        s.path('shade','M0 0 H1120 V83 L994 121 L865 93 L742 136 L597 89 L459 133 L322 95 L193 130 L0 101 Z','near')
        s.path('mid','M0 0 H173 L213 165 L177 292 L223 437 L186 604 H0 Z','structure')
        s.path('deep','M1120 0 H953 L920 156 L954 309 L915 454 L947 604 H1120 Z','structure')
        s.path('light','M177 292 L196 274 L244 435 L207 604 H186 L223 437 Z','structure')
        s.path('mid','M0 189 H250 V215 H0 Z','structure')
        s.path('accent','M0 189 H250 V197 H0 Z','structure')
        s.path('shade','M1120 261 H871 L836 292 V361 H859 V302 L880 287 H1120 Z','structure')
        s.path('light','M1120 261 H871 L836 292 L844 300 L877 271 H1120 Z','structure')
        arch(s,252,468,112,179,'far','light','shade','structure-back')
        arch(s,764,452,110,169,'far','light','shade','structure-back')
        s.path('mid','M0 551 L189 511 L315 547 L409 604 H0 Z','near')
        s.path('shade','M1120 549 L939 514 L818 541 L739 604 H1120 Z','near')
        s.path('far','M320 604 L460 455 L650 447 L802 604 Z','landscape')
    else:
        s.path('light','M379 0 H759 L712 179 L756 380 L656 451 H465 L373 381 L416 174 Z','distance','matte daylight through the upper hall, no beam filter')
        arch(s,277,544,570,478,'far','light','mid','structure-back')
        ring(s,-25,277,277,291,55,'mid','shade')
        ring(s,1147,270,277,291,55,'mid','shade')
        s.poly('light',[(132,0),(172,0),(298,604),(259,604)],'structure')
        s.poly('light',[(953,0),(993,0),(863,604),(824,604)],'structure')
        s.path('shade','M0 333 H270 V362 H0 Z','structure')
        s.path('shade','M1120 328 H853 V358 H1120 Z','structure')
        s.path('accent','M0 330 H270 V339 H0 Z','structure')
        s.path('accent','M1120 325 H853 V334 H1120 Z','structure')
        block(s,23,409,150,82,'mid','light','shade','structure',15)
        # Ten dormant ports are environmental reference, never a live progress HUD.
        for y in [435,467]:
            for x in [37,62,87,112,137]:s.ellipse('shade',x,y,8,8,'structure','unlit maintenance port; static, no return progress')
        s.path('mid','M0 554 L221 521 L379 568 L417 604 H0 Z','near')
        s.path('shade','M1120 551 L910 517 L762 560 L724 604 H1120 Z','near')
        s.path('far','M320 604 L448 451 L657 446 L809 604 Z','landscape')
        s.path('light','M440 604 L505 451 L554 449 L540 604 Z','landscape')
    return s


def inherited(name,theme,title):
    data=json.loads((ROOT/'sources'/f'{name}.json').read_text())
    if name=='volcanic_rim':
        old=data
        data=dict(size=[1000,540],palette=old['palette'],layerOrder=[],shapes=[],approved=False,
                  concept=old['concept'],provenance=dict(pr=75,commit='37b4522535097fc544f00e84a3b27a02f501ed8e',
                  path='ARCLINE/design/backgrounds/061_065_volcanic_rim.json',status='positive review; approval not inferred'))
        for layer in old['layers']:
            data['layerOrder'].append(layer['id'])
            for obj in layer['objects']:
                s=dict(id=obj['id'],layer=layer['id'],kind='path',fill=obj['fill'])
                if obj['type']=='path':s['d']=obj['d']
                elif obj['type']=='rect':s['d']=f'M{obj["x"]} {obj["y"]} h{obj["w"]} v{obj["h"]} h{-obj["w"]} Z'
                elif obj['type']=='circle':s.update(kind='ellipse',cx=obj['cx'],cy=obj['cy'],rx=obj['r'],ry=obj['r'])
                else:raise ValueError(obj['type'])
                data['shapes'].append(s)
    data.update(schema='arcline.background-art/v3',id=f'normal-{theme:02}',themeIndex=theme,
                title=title,stageRange=[theme*5+1,theme*5+5],kind='normal')
    data.setdefault('concept', data.get('visualContract',{}).get('mood','承認済みの霧の谷。淡い月光、古い二つのアーチ、幾重もの不透明な霧。'))
    data.setdefault('provenance',dict(pr=100 if theme==0 else 101,scope='approved artwork retained'))
    return data


def polish(s):
    """Authored material faces and secondary silhouettes, never texture/noise."""
    def mix(a,b,t):
        a=s.data['palette'][a];b=s.data['palette'][b]
        return '#'+''.join(f'{round(int(a[i:i+2],16)*(1-t)+int(b[i:i+2],16)*t):02X}' for i in [1,3,5])
    s.data['palette'].update(softLight=mix('mid','light',.52),softShade=mix('mid','shade',.48),
                             farLight=mix('far','air',.44),nearLight=mix('shade','light',.36))
    ident=s.data['id']
    fields={
      'normal-02':[
       ('softShade','M0 393 L88 369 L172 399 L230 425 L211 457 L170 604 H124 L146 462 L101 423 L0 440 Z','near'),
       ('softLight','M1120 351 L1042 337 L979 376 L957 448 L990 455 L1008 392 L1066 367 L1120 381 Z','near'),
       ('farLight','M364 398 C479 392 581 405 724 390 L717 402 C578 416 469 403 392 412 Z','distance'),
       ('softShade','M173 302 L184 299 L195 381 L183 382 Z','structure-back')],
      'normal-03':[
       ('softShade','M134 372 L152 377 L152 478 L134 484 Z','structure'),
       ('softLight','M200 166 L226 161 L249 163 L253 181 L232 177 L208 184 Z','structure'),
       ('accent','M108 319 L126 310 L128 339 L111 346 Z','structure'),
       ('farLight','M641 402 L659 371 L679 375 L689 405 Z','distance'),
       ('softShade','M900 341 L927 336 V477 L899 486 Z','structure'),
       ('softLight','M21 564 C90 544 155 563 186 551 L205 559 L162 578 L63 574 Z','near')],
      'normal-05':[
       ('softShade','M80 304 L118 288 V368 L88 379 Z','structure-back'),
       ('farLight','M184 279 L251 278 L300 297 L284 302 L231 291 L191 293 Z','structure-back'),
       ('softLight','M898 231 L958 231 V242 L898 245 Z','structure-back'),
       ('shade','M902 237 L908 236 V243 L902 244 Z','structure-back'),
       ('softShade','M0 438 L318 426 L353 435 L311 444 L0 457 Z','landscape'),
       ('farLight','M358 460 C481 428 551 464 658 446 C751 428 821 446 877 433 L906 451 C756 477 679 450 570 472 C482 489 402 467 358 480 Z','near')],
      'normal-06':[
       ('softShade','M71 426 L86 350 L143 183 L122 319 L150 414 L143 481 Z','structure'),
       ('farLight','M361 411 L389 376 L416 409 L439 427 Z','distance'),
       ('softLight','M850 397 L877 357 L905 366 L918 425 L892 446 Z','structure-back'),
       ('shade','M0 546 L111 524 L208 551 L238 604 H0 Z','near'),
       ('accent','M430 467 C515 461 580 470 646 462 L630 474 L502 479 Z','near')],
      'normal-07':[
       ('softLight','M40 371 L151 351 L151 380 L40 401 Z','structure-back'),
       ('softShade','M178 349 L278 332 L285 365 L178 384 Z','structure-back'),
       ('softLight','M302 384 L339 400 L339 452 L304 435 Z','structure-back'),
       ('softShade','M884 380 L932 344 L936 404 L889 439 Z','structure'),
       ('softLight','M999 318 L1023 311 L1030 478 L1005 486 Z','structure'),
       ('farLight','M494 427 L520 397 L570 403 L604 426 Z','distance')],
      'normal-08':[
       ('softShade','M0 184 L157 153 L171 177 L0 210 Z','landscape'),
       ('softShade','M0 386 L174 352 L183 379 L0 421 Z','landscape'),
       ('softLight','M856 224 L930 187 L943 214 L849 255 Z','structure'),
       ('softLight','M864 446 L929 413 L942 442 L873 479 Z','structure'),
       ('farLight','M475 0 H508 L491 194 L461 279 L456 230 Z','distance'),
       ('accent','M98 238 L203 223 L207 242 L102 259 Z','structure')],
      'normal-09':[
       ('nearLight','M311 184 L378 203 L377 233 L306 217 Z','structure-back'),
       ('softShade','M947 316 L967 311 V498 L947 504 Z','structure'),
       ('accent','M926 417 L945 412 V447 L926 453 Z','structure'),
       ('farLight','M440 297 L780 276 V294 L440 318 Z','structure-back'),
       ('softShade','M551 432 L702 416 L726 435 V449 L550 461 Z','structure-back')],
      'normal-10':[
       ('softShade','M0 478 L129 440 L237 473 L303 538 L341 604 H298 L246 547 L168 495 L0 519 Z','near'),
       ('softLight','M948 468 L1029 427 L1120 440 V467 L1032 454 L938 504 Z','near'),
       ('farLight','M344 431 C446 417 489 434 562 424 L589 434 C508 449 417 433 363 445 Z','distance'),
       ('shade','M109 345 H130 V361 H109 Z','structure'),
       ('softLight','M978 249 H986 V380 H978 Z','structure')],
      'normal-11':[
       ('softLight','M13 220 L67 210 L75 275 L105 317 L90 378 L109 421 L85 473 L61 477 L68 421 L53 377 L69 320 L45 279 Z','landscape'),
       ('softShade','M1036 227 L1052 222 L1044 318 L1017 364 L1029 433 L1009 475 L992 474 L1009 430 L1000 364 L1022 310 Z','structure'),
       ('farLight','M320 396 L352 356 L389 396 L412 409 Z','distance'),
       ('softLight','M280 536 L391 505 L475 516 L426 533 L355 532 Z','near'),
       ('farLight','M634 471 C698 443 772 451 811 444 L791 454 C737 467 703 461 661 479 Z','near')],
      'normal-13':[
       ('softShade','M43 231 L61 226 V495 L43 502 Z','structure'),
       ('softLight','M1036 220 L1058 216 V492 L1036 499 Z','structure'),
       ('accent','M0 387 H197 V400 H0 Z','structure'),
       ('softShade','M162 222 L185 214 L185 237 L162 251 Z','structure-back'),
       ('softLight','M906 227 L927 211 L940 224 L920 240 Z','structure-back'),
       ('nearLight','M54 569 L165 550 L224 562 L285 555 L326 580 L293 595 L212 582 L130 591 Z','near'),
       ('softShade','M968 515 L1056 541 L1120 532 V566 L1048 576 L965 550 Z','near')],
      'normal-14':[
       ('softShade','M19 405 L109 398 L154 419 L145 440 L22 438 Z','landscape'),
       ('softLight','M1024 391 L1120 370 V394 L1031 420 L988 424 L992 409 Z','structure'),
       ('accent','M32 497 L94 481 L152 500 L175 525 L151 537 L95 517 L38 522 Z','near'),
       ('softShade','M987 534 L1065 515 L1120 525 V557 L1064 548 L1005 559 Z','near'),
       ('farLight','M337 400 L373 369 L422 395 L451 417 Z','distance')],
      'normal-15':[
       ('softLight','M27 145 H216 V159 H27 Z','structure-back'),
       ('softShade','M907 120 H1090 V143 H907 Z','structure-back'),
       ('softShade','M66 442 H112 V478 H66 Z','structure'),
       ('softLight','M969 449 H1002 V477 H969 Z','structure'),
       ('accent','M0 378 H46 V391 H0 Z','structure'),
       ('accent','M1120 359 H1080 V373 H1120 Z','structure')],
      'normal-16':[
       ('softShade','M37 384 L163 371 L255 392 L260 421 L185 427 L103 407 L36 418 Z','structure'),
       ('softLight','M1045 346 L1120 335 V353 L1041 369 L975 364 L949 379 L928 370 L975 347 Z','structure'),
       ('softShade','M145 407 C152 438 135 456 142 485 L155 479 C150 456 168 437 161 408 Z','structure'),
       ('softShade','M207 412 C226 438 213 454 228 471 L240 465 C228 449 240 429 224 413 Z','structure'),
       ('accent','M185 351 C181 324 193 305 208 304 C213 284 233 282 244 293 C264 282 287 292 290 309 C311 316 314 336 303 351 C274 357 225 358 185 351 Z','structure'),
       ('light','M200 325 C201 306 219 304 228 310 C239 292 261 300 262 314 C279 309 292 319 292 334 C261 328 228 342 200 325 Z','structure'),
       ('mid','M955 291 C954 270 971 256 990 262 C1005 241 1026 249 1036 262 C1058 251 1081 263 1081 283 C1063 300 985 305 955 291 Z','structure'),
       ('softLight','M970 275 C984 258 998 271 1005 263 C1021 254 1031 269 1035 279 C1007 278 989 289 970 275 Z','structure')],
      'normal-17':[
       ('softLight','M287 334 L774 328 L834 341 L305 343 Z','structure-back'),
       ('softShade','M372 376 L811 364 L843 372 L416 389 Z','structure-back'),
       ('farLight','M698 248 L795 248 L783 257 L705 259 Z','structure-back'),
       ('shade','M717 271 L753 269 V283 L717 285 Z','structure-back'),
       ('accent','M502 411 L533 409 L528 426 L506 429 Z','structure-back'),
       ('softShade','M627 405 L655 403 L651 419 L631 421 Z','structure-back')],
      'normal-18':[
       ('softLight','M225 254 L243 247 V349 L225 358 Z','structure'),
       ('softShade','M869 229 L889 240 V338 L869 326 Z','structure'),
       ('accent','M461 257 L476 248 L492 244 L495 258 L476 265 Z','structure-back'),
       ('softLight','M376 305 L392 290 L406 297 L393 314 Z','structure-back'),
       ('softLight','M731 297 L747 303 L754 325 L740 321 Z','structure-back'),
       ('softShade','M18 196 H118 V236 H18 Z','near'),
       ('mid','M1025 174 H1119 V219 H1025 Z','near')],
      'normal-19':[
       ('softShade','M53 257 L78 248 V420 L53 430 Z','structure-back'),
       ('softLight','M903 225 L928 218 V411 L903 421 Z','structure-back'),
       ('farLight','M257 394 L304 372 L348 388 L365 420 H257 Z','distance'),
       ('farLight','M721 410 L748 379 L785 388 L814 423 Z','distance'),
       ('softShade','M1 529 L153 509 L253 534 L280 562 L198 548 L69 564 L0 551 Z','near'),
       ('softLight','M923 528 L990 516 L1120 539 V558 L1012 539 L931 550 Z','near')],
      'boss-010':[
       ('light','M0 195 L73 166 L121 185 L139 238 L118 271 L135 309 L0 306 Z','distance'),
       ('softShade','M73 166 L121 185 L139 238 L118 271 L135 309 L96 310 L83 267 L98 234 Z','distance'),
       ('softLight','M1120 160 L1042 178 L1009 212 L1017 254 L978 288 H1120 Z','distance'),
       ('softShade','M1042 178 L1062 191 L1042 236 L1057 278 L1036 306 L1000 305 L1017 254 L1009 212 Z','distance'),
       ('far','M343 427 L378 420 L391 458 L369 487 L347 489 L356 459 Z','landscape'),
       ('far','M783 424 L812 422 L824 459 L795 492 L774 483 L794 453 Z','landscape'),
       ('softShade','M18 349 H211 V368 H18 Z','structure'),
       ('softLight','M909 322 H1117 V338 H909 Z','structure')],
      'boss-020':[
       ('softShade','M18 199 H47 V565 H18 Z','structure'),
       ('softLight','M890 181 H917 V558 H890 Z','structure'),
       ('nearLight','M97 202 L207 204 V237 H97 Z','structure'),
       ('softShade','M958 181 H1087 V215 H958 Z','structure'),
       ('light','M372 211 L389 193 L411 183 L419 196 L393 210 L380 225 Z','structure-back'),
       ('accent','M702 177 L723 185 L740 204 L729 211 L709 194 Z','structure-back')],
      'boss-030':[
       ('farLight','M0 276 C125 251 191 283 270 266 C355 245 380 274 402 295 C260 321 118 290 0 331 Z','distance'),
       ('softLight','M953 194 H1028 V207 H953 Z','structure'),
       ('softShade','M50 271 H67 V443 H50 Z','structure'),
       ('softShade','M1001 254 H1018 V445 H1001 Z','structure'),
       ('accent','M0 248 H37 V260 H0 Z','structure')],
      'boss-040':[
       ('softLight','M62 433 L87 296 L129 143 L112 313 L142 411 L129 557 Z','structure'),
       ('softShade','M1031 226 L1048 306 L1044 442 L1002 552 L1020 397 Z','structure'),
       ('farLight','M386 163 L431 149 L459 171 L438 190 L403 182 Z','structure-back'),
       ('softShade','M708 163 L735 151 L764 178 L745 199 L716 193 Z','structure-back')],
      'boss-050':[
       ('softLight','M64 187 H82 V435 H64 Z','structure'),
       ('softShade','M996 175 H1015 V431 H996 Z','structure'),
       ('accent','M0 293 H162 V308 H0 Z','structure'),
       ('accent','M1120 271 H947 V286 H1120 Z','structure'),
       ('nearLight','M71 555 L154 530 L237 553 L298 585 L215 573 L163 583 Z','near'),
       ('softShade','M942 543 L982 531 L1061 555 L1120 548 V579 L1053 591 L985 563 Z','near')],
      'boss-060':[
       ('softLight','M9 229 L64 242 L71 308 L52 376 L80 447 L65 513 L42 506 L56 449 L33 376 L52 307 Z','near'),
       ('softShade','M1025 241 L1051 224 L1040 315 L1014 383 L1033 459 L1007 516 L987 508 L1009 455 L990 379 L1018 310 Z','structure')],
      'boss-070':[
       ('softLight','M23 388 H45 V497 H23 Z','structure'),
       ('softShade','M1082 355 H1103 V497 H1082 Z','structure'),
       ('accent','M347 0 H369 L409 144 L393 158 Z','structure'),
       ('nearLight','M39 566 L139 549 L229 557 L313 593 L230 582 L149 594 Z','near'),
       ('softShade','M932 538 L1007 553 L1120 548 V575 L1006 583 L936 563 Z','near')],
      'boss-080':[
       ('softLight','M17 53 H39 L78 248 L61 248 Z','structure'),
       ('softShade','M1081 37 H1106 L1067 235 L1048 232 Z','structure'),
       ('accent','M303 111 L317 98 L350 134 L337 149 Z','structure-back'),
       ('light','M795 101 L811 112 L785 151 L771 138 Z','structure-back')],
      'boss-090':[
       ('softShade','M19 253 H42 V464 H19 Z','structure'),
       ('softLight','M1022 223 H1045 V452 H1022 Z','structure'),
       ('accent','M0 246 H82 V257 H0 Z','structure'),
       ('farLight','M333 306 C442 271 482 308 581 292 C678 275 714 305 766 300 L751 323 C616 345 471 315 354 334 Z','distance')]
    }
    for color,d,layer in fields.get(ident,[]):s.path(color,d,layer,'secondary matte material plane')
    if ident=='normal-09':
        for x,y in [(306,209),(321,450),(127,123)]:block(s,x,y,28,47,'softShade','light','shade','structure',9)
        ring(s,110,352,206,202,13,'softLight','shade')
    if ident=='normal-15':
        ring(s,145,303,82,86,8,'softLight','shade')
        ring(s,990,290,68,93,8,'softLight','shade')
    if ident=='normal-18':
        for x,y in [(333,230),(772,215)]:block(s,x,y,37,53,'softShade','light','shade','structure',8)
    if ident=='boss-060':
        replacements={
         'M0 325 C237 244 350 253 499 202 L547 204 C389 279 207 289 0 369 Z':
          'M0 246 C172 182 293 219 416 165 C476 138 523 147 547 161 C400 247 227 233 0 307 Z',
         'M601 372 C773 308 951 297 1120 223 V248 C930 329 766 347 650 397 Z':
          'M655 245 C793 190 934 225 1120 157 V221 C954 281 828 239 716 281 Z'}
        for shape in s.data['shapes']:
            if shape.get('d') in replacements:shape['d']=replacements[shape['d']]
    if ident.startswith('final-'):
        i=s.data['mapIndex']
        # Repeated construction language belongs to the same old maintenance site.
        # Only edge structures receive detail; the central shot corridor stays empty.
        for x,y,w,h in ([(28,273,51,101),(1025,255,55,118)] if i!=1 else [(33,250,51,98),(1030,230,52,111)]):
            block(s,x,y,w,h,'softShade','light','shade','structure',12)
            s.rect('accent',x+14,y+19,w-27,16,'structure','small steady maintenance light, never a combat marker')
        if i==0:
            s.path('softShade','M25 104 H48 V518 H25 Z','structure')
            s.path('nearLight','M960 90 H985 V512 H960 Z','structure')
            s.path('softLight','M338 168 L387 151 L413 165 L364 184 Z','structure-back')
            s.path('softShade','M708 151 L751 171 L730 186 L686 165 Z','structure-back')
            s.path('accent','M435 119 H701 V134 H435 Z','structure-back')
            s.path('mid','M474 143 H654 V166 H474 Z','structure-back')
            ring(s,-12,408,117,125,24,'softShade','shade')
            ring(s,1129,390,115,134,25,'softShade','deep')
            s.path('softLight','M226 305 L246 308 L270 459 L250 465 Z','structure')
            s.path('softShade','M865 298 L885 294 L858 462 L840 458 Z','structure')
        elif i==1:
            s.path('farLight','M327 0 H354 V188 L329 209 L309 191 V164 L327 175 Z','structure-back')
            s.path('farLight','M762 0 H788 V165 L810 149 V184 L785 208 L762 192 Z','structure-back')
            s.path('softLight','M242 115 H258 V273 L277 286 V303 L241 280 Z','structure-back')
            s.path('softShade','M849 78 H869 V268 L851 282 L835 273 L849 256 Z','structure-back')
            s.path('far','M0 420 C125 378 190 422 265 406 L287 421 C187 447 120 412 0 450 Z','near')
            s.path('far','M1120 400 C1002 371 951 406 887 390 L868 412 C963 431 1013 401 1120 429 Z','near')
            ring(s,562,-100,319,218,12,'softLight','mid','structure-back')
        elif i==2:
            s.path('softShade','M0 119 L133 164 L146 197 L0 162 Z','structure')
            s.path('softLight','M1120 140 L983 168 L970 194 L1120 169 Z','structure')
            s.path('accent','M243 0 L281 0 L316 160 L297 170 Z','structure-back')
            s.path('shade','M839 0 H870 L825 162 L805 153 Z','structure-back')
            s.path('nearLight','M18 446 L121 423 L174 449 L162 477 L123 454 L18 481 Z','structure')
            s.path('softShade','M956 432 L1014 405 L1120 439 V468 L1018 436 L958 461 Z','structure')
            s.path('farLight','M390 198 L442 181 L491 191 L503 212 L445 206 L407 222 Z','distance')
        else:
            ring(s,-25,277,208,220,22,'nearLight','shade')
            ring(s,1147,270,208,220,22,'nearLight','shade')
            s.path('softLight','M320 163 L337 147 L351 158 L334 176 Z','structure-back')
            s.path('accent','M397 83 L411 76 L423 99 L409 107 Z','structure-back')
            s.path('softShade','M713 77 L728 87 L716 112 L701 101 Z','structure-back')
            s.path('softLight','M789 147 L805 164 L790 181 L776 166 Z','structure-back')
            s.path('softShade','M215 403 H236 L266 543 L247 550 Z','structure')
            s.path('softLight','M886 397 H906 L876 544 L857 539 Z','structure')
            s.path('farLight','M449 41 H681 L659 74 H471 Z','distance')
            s.path('softLight','M0 346 H185 V356 H0 Z','structure')
            s.path('softLight','M1120 341 H934 V351 H1120 Z','structure')
        s.data['contract']['animation']=False
    return s


def all_scenes():
    scenes=[inherited('first_cove',0,'はじまりの入江'),inherited('mirror_cliffs',1,'鏡の岸壁'),
            inherited('mist_valley',4,'霧の谷'),inherited('volcanic_rim',12,'火山の外縁')]
    normal=[bridge_waterway,ruins,cloud_airport,crystal_road,prism_wall,rising_mine,amber_engine,
            wind_observatory,frozen_gorge,forge_corridor,magnetic_mine,polarity_lab,sky_garden,
            storm_carrier,fortress_gates,dawn_core]
    scenes += [polish(fn()).data for fn in normal]
    bosses=[tideclaw,gatekeeper,cloudray,prism_guardian,dust_driller,whitehowl,forge_titan,polaris_core,skycarrier]
    scenes += [polish(fn()).data for fn in bosses]
    scenes += [polish(final_scene(i)).data for i in range(4)]
    return sorted(scenes,key=lambda s:(s['themeIndex'],{'normal':0,'boss':1,'final':2}[s['kind']],s.get('mapIndex',0)))
