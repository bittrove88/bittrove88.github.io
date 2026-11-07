"""Collection index only. Every revised scene has its own art_*.py source.

The three inherited artworks are loaded without redesign. The 30 revised scenes
were each authored, rendered, visually reviewed, improved and re-rendered before
the next scene was started. build.py only collects these completed sources.
"""
from pathlib import Path
import json
from author import make

ROOT=Path(__file__).resolve().parent

def inherited(name,theme,title):
    src=json.loads((ROOT/'sources'/f'{name}.json').read_text())
    if name=='volcanic_rim':
        original=src
        src=dict(size=[1000,540],palette=original['palette'],layerOrder=[],shapes=[],approved=False,
                 concept=original['concept'],provenance=dict(pr=75,status='positive review; formal approval not inferred',
                 commit='37b4522535097fc544f00e84a3b27a02f501ed8e',path='ARCLINE/design/backgrounds/061_065_volcanic_rim.json'))
        for layer in original['layers']:
            src['layerOrder'].append(layer['id'])
            for obj in layer['objects']:
                s=dict(id=obj['id'],layer=layer['id'],kind='path',fill=obj['fill'])
                if obj['type']=='path':s['d']=obj['d']
                elif obj['type']=='rect':s['d']=f'M{obj["x"]} {obj["y"]} h{obj["w"]} v{obj["h"]} h{-obj["w"]} Z'
                elif obj['type']=='circle':s.update(kind='ellipse',cx=obj['cx'],cy=obj['cy'],rx=obj['r'],ry=obj['r'])
                else:raise ValueError(obj['type'])
                src['shapes'].append(s)
    src.update(schema='arcline.background-art/v3',id=f'normal-{theme:02}',title=title,kind='normal',
               themeIndex=theme,stageRange=[theme*5+1,theme*5+5])
    src.setdefault('concept',src.get('visualContract',{}).get('mood','淡い月光、古い二つのアーチ、幾重もの霧。PR #75の承認済み構図を継承。'))
    src.setdefault('provenance',dict(pr=100 if theme==0 else 75,status='inherited artwork'))
    return src

def all_scenes():
    scenes=[inherited('first_cove',0,'はじまりの入江'),inherited('mist_valley',4,'霧の谷'),inherited('volcanic_rim',12,'火山の外縁')]
    scenes += [make(f'normal-{i:02}') for i in range(20) if i not in [0,4,12]]
    scenes += [make(f'boss-{i:03}') for i in range(10,100,10)]
    scenes += [make(f'final-100-{i}') for i in range(4)]
    return sorted(scenes,key=lambda s:(s['themeIndex'],{'normal':0,'boss':1,'final':2}[s['kind']],s.get('mapIndex',0)))
