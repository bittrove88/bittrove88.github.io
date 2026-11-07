"""Vector primitives only. There are no shared skies, hills, gates or palettes.

Each scene module owns its composition, colors, silhouettes and materials.
"""
import math

LAYERS=['air','far','middle','back-structure','land','structure','near','finish']

class Scene:
    def __init__(self, ident,title,theme,concept,colors,kind='normal',stage=None,map_index=None):
        self.data=dict(schema='arcline.background-art/v3',revision='2.0',id=ident,title=title,
            themeIndex=theme,stageRange=[theme*5+1,theme*5+5],kind=kind,approved=False,
            size=[1120,604],palette=colors,layerOrder=LAYERS[:],shapes=[],concept=concept,
            contract=dict(opaque=True,screenSpace=True,collision=False,cameraLinked=False,
                          animation=False,priority='behind terrain, mechanics, actors, aim, projectiles and HUD'))
        if stage is not None:self.data['stage']=stage
        if map_index is not None:self.data['mapIndex']=map_index
    def p(self,fill,d,layer='land',role='theme-specific opaque color plane'):
        self.data['shapes'].append(dict(id=f'{self.data["id"]}-{len(self.data["shapes"])+1:03}',
                                       kind='path',fill=fill,d=d,layer=layer,role=role))
    def poly(self,fill,points,layer='land',role='theme-specific opaque color plane'):
        self.p(fill,'M'+' L'.join(f'{x:g} {y:g}' for x,y in points)+' Z',layer,role)
    def r(self,fill,x,y,w,h,layer='structure',role='material face'):
        self.p(fill,f'M{x:g} {y:g} h{w:g} v{h:g} h{-w:g} Z',layer,role)
    def e(self,fill,x,y,rx,ry,layer='land',role='material face'):
        self.data['shapes'].append(dict(id=f'{self.data["id"]}-{len(self.data["shapes"])+1:03}',
            kind='ellipse',fill=fill,cx=x,cy=y,rx=rx,ry=ry,layer=layer,role=role))
    def base(self):self.r('sky',0,0,1120,604,'air','opaque base')

def annulus(s,fill,x,y,rx,ry,t,layer='structure'):
    s.p(fill,f'M{x-rx} {y} a{rx} {ry} 0 1 0 {2*rx} 0 a{rx} {ry} 0 1 0 {-2*rx} 0 Z M{x-rx+t} {y} a{rx-t} {ry-t} 0 1 1 {2*(rx-t)} 0 a{rx-t} {ry-t} 0 1 1 {-2*(rx-t)} 0 Z',layer,'architectural annulus; no target or actor')

def gear(s,fill,x,y,r,inner,teeth,layer='structure'):
    pts=[]
    for i in range(teeth*4):
        a=i*math.tau/(teeth*4);radius=r if i%4 in [1,2] else r*.87
        pts.append((x+math.cos(a)*radius,y+math.sin(a)*radius))
    d='M'+' L'.join(f'{a:.3f} {b:.3f}' for a,b in pts)+' Z'
    d+=f' M{x-inner} {y} a{inner} {inner} 0 1 0 {2*inner} 0 a{inner} {inner} 0 1 0 {-2*inner} 0 Z'
    s.p(fill,d,layer,'stationary industrial gear silhouette')
