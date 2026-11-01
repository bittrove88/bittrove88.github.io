"""Compile individually authored5.0 terrain and its tactical design catalogue."""
from pathlib import Path
import json,copy,hashlib
root=Path(__file__).resolve().parents[2]
blueprints=json.loads((root/'design/expedition_013/stage_blueprints.json').read_text())
source=root/'design/runtime_campaign_20x5.json'
campaign=json.loads(source.read_text())
crew=json.loads((root/'design/expedition_013/crew.json').read_text())
verification_file=root/'design/expedition_013/stage_verification.json'
verification={r['stage']:r for r in json.loads(verification_file.read_text())['stages']} if verification_file.exists() else {}
def interpolate(points,x):
    for a,b in zip(points,points[1:]):
        if a[0]<=x<=b[0]:return round(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]),3)
    raise ValueError(x)
def band(n):return '入門' if n<=10 else '初級' if n<=30 else '中級' if n<=49 else '上級' if n<=79 else '超上級' if n<=89 else '最終試練'
def part(p,n,i):
    kind=p['kind'];x=p['x'];h=p['top']
    end=p.get('end',x+p.get('width',5));bottom=p.get('bottom',h-p.get('thickness',3))
    poly=p.get('poly',[[x,h],[end,h],[end,bottom],[x,bottom]])
    return {'id':f'{n:03d}-C{i:02d}','poly':poly,'destructible':kind=='wall' or p.get('breakable',False)}
records=[]
for bp,previous in zip(blueprints,campaign['levels']):
    n=bp['stage'];assert previous['id']==n
    level=copy.deepcopy(previous)
    for key in ['phaseFeatures','staticFeatures']:level.pop(key,None)
    level.update(name=bp['name'],nameEn=bp.get('nameEn',f'Route {n:02d}'),floors=[bp['floor']],components=[part(p,n,i+1) for i,p in enumerate(bp['parts'])],features=bp['features'],contentRevision='5.0',hold=2 if n<50 else 1,blink=[],skills={},actionLimit=12 if n<=30 else 16 if n<=79 else 20)
    if level.get('boss'):level['actionLimit']=24 if n<80 else 28
    if level.get('midboss'):level['actionLimit']=18 if n<50 else 24
    if bp.get('separatedFloors'):
        f=bp['floor'];level['floors']=[f[:2],f[-2:]]
    if bp.get('floorSegments'):level['floors']=copy.deepcopy(bp['floorSegments'])
    level['terrainRevision']=bp.get('terrainRevision','5.0')
    level['spawn']=[[x,interpolate(bp['floor'],x)] for x in bp['spawn']]
    if bp.get('enemyAirHeight'):level['spawn'][1][1]+=bp['enemyAirHeight']
    if n==100:level['phaseFeatures']=[bp['features'],[{'type':'C','v':[48,62,22,41]},{'type':'K','v':[69,33,28]}],[{'type':'W','v':[34,70,8]},{'type':'M','v':[58,26,12,1]}]]
    level['lesson']={1:'controls',2:'aim',3:'move',4:'teleport',6:'reflection',7:'destruction',8:'roof',10:'boss-core',23:'C',35:'K',37:'B',41:'U',51:'F',65:'V',71:'M',73:'terminal'}.get(n)
    # Supplies remain chapter stock; every theme has2 weapon placements.
    level['pickups']=[]
    slot=(n-1)%5+1
    if slot in [2,4]:
        ids=['W02','W04','W06','W07','W09','W12','W13','W14','W16','W17','W18','W19','W20']
        wid=ids[((n-1)//5*2+(slot==4))%len(ids)]
        x=bp['spawn'][0]+8;h=interpolate(bp['floor'],x)+7
        level['pickups'].append({'id':wid,'kind':'trial','weaponId':wid,'x':x,'h':h,'placementId':f'L{n:03d}:weapon:{wid}'})
    if n%10==7:
        sid=['S_GUARD','S_REPAIR','S_BREACH'][((n-1)//10)%3];x=bp['spawn'][0]+4
        level['pickups'].append({'id':f'SK{n:03d}','kind':'skill','skillId':sid,'amount':1,'x':x,'h':interpolate(bp['floor'],x)+9,'placementId':f'L{n:03d}:skill:{sid}'})
    level['enemyHp']=3 if n<=30 else 4 if n<=49 else 5 if n<=79 else 6 if n<=89 else 7;level['recommendedCharacter']=bp['recommended'];level['tacticalGoal']=bp['goal'];level['tacticalGoalEn']=bp.get('goalEn','Choose a firing position and prepare a clear route.');level['enemyProfile']=min(5,(n-1)//20)
    records.append({'stage':n,'difficultyBand':band(n),'theme':level['themeName'],'learningGoal':bp['goal'],'mainGimmicks':sorted(set(f['type'] for f in bp['features'])),'terrainIntent':bp['route'],'basicRoute':bp['route'],'alternativeRoute':'割れた遮蔽の除去、歩行できる射点、または広い棚への転移で通常弾の経路を作る。各面の実シミュレーション結果に具体的な操作列を保存する。','advantage':{'character':bp['recommended'],'reason':bp['goal']},'hint':bp['goal'],'enemyInteraction':{'spawn':level['spawn'][1],'movement':'守り手は固有の予告と機構、通常敵は既存の役割に沿って移動。弾の入力へ追従しない。','counterplay':'準備にも敵の手番が返る。遮蔽と射点を先に選ぶ。'},'actionBudget':level['actionLimit'],'expectedActions':[3,7] if n<=30 else [5,12] if n<80 else [7,18],'tolerance':'初級は角度±3°・出力±5を目標。以後も複数の近傍解と安全な準備を確保。','availableStoryCrew':[c['id'] for c in crew if c['stage']<n or c['stage']==0],'testResult':{'status':'pending','report':'stage_verification.json','stage':n}})
    record=records[-1]
    changes=[]
    if bp.get('separatedFloors') or bp.get('floorSegments'):changes.append('両岸を切り離した有限地形。歩行で越せない空間に中継棚を置く')
    heights=[p[1] for p in bp['floor']]
    if max(heights)>min(heights):changes.append(f'床の高低差{max(heights)-min(heights):g}。坂の肩と裾で砲口の高さと遮蔽が変わる')
    for kind,label in [('wall','割れた壁'),('roof','天井片'),('island','中継棚')]:
        parts=[p for p in bp['parts'] if p['kind']==kind]
        if parts:changes.append(f'{label}{len(parts)}箇所を独立配置')
    record['terrainIntent']='。'.join(changes+[bp['route']])+'。'
    notes={'gun':'耐久に余裕を持ち、通常弾の弧で経路を確かめられる。','hana':'時間差の三連射で広い足元を覆える。','koro':'床で走り、短い空隙では落下して再び接地する必殺が連続面を活かす。','ban':'着弾点から前方の扇状衝撃で、開口の先へ作用する。','sora':'高い弧の頂点から落下弾を広げ、山や遮蔽の裏へ届かせる。','hibari':'視線が通る相手の近くで炸裂し、窓からの距離の誤差を補える。','rico':'実際に鏡面で跳ねるたび強くなり、低い反射路を攻撃に変える。','mogu':'出力で前進間隔を変える連続爆破で、外す地形を選べる。','rin':'狭く速い精密弾を、破壊後に開いた長い射線へ通せる。','yui':'着弾地点への牽引と遅延圧縮で、次の射線へ相手を誘導できる。'}
    record['advantage']['reason']=notes[bp['recommended']]
    verified=verification.get(n)
    if verified and verified.get('blueprintSha256')==hashlib.sha256(json.dumps(bp,sort_keys=True,separators=(',',':')).encode()).hexdigest():
        record['testResult']={k:v for k,v in verified.items() if k not in ['normalWitness','recommendedWitness','featuredWitness']}
        record['basicRouteProof']=verified.get('featuredWitness') or verified.get('recommendedWitness')
        record['alternativeRoute']=verified['normalWitness']['description']
        record['alternativeRouteProof']=verified['normalWitness']
    campaign['levels'][n-1]=level
campaign['revision']='5.0';campaign['date']='2026-11-02'
source.write_text(json.dumps(campaign,ensure_ascii=False,indent=2)+'\n')
(root/'design/expedition_013/stage_design.json').write_text(json.dumps({'revision':'5.0','stages':records},ensure_ascii=False,indent=2)+'\n')
print('Compiled100 authored tactical designs;20 themes;40 weapon boxes;10 skill boxes')
