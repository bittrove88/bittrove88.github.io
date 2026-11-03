"""Record only the thirty revised maps; never reuse a route on different terrain."""
from pathlib import Path
import json,hashlib,argparse
p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[2]
bps=json.loads((root/'design/expedition_013/stage_blueprints.json').read_text());targets={r['stage'] for r in json.loads((root/'docs/change-requests/ARCLINE_MAP_VARIETY_BOSS_DIFFICULTY_BLUEPRINTS_v0.22.0.json').read_text())}
def read(name):
 r=json.loads((a.evidence/name).read_text());assert r['status']=='PASS';assert all(x['result']=='win' and x['complete'] and x['enemies'] and all(s['walkUsed']<=140.000001 for s in x['actions']) for x in r['rows']);return r['rows']
normal=read('CAMPAIGN_MATCHES.json');recommended=read('RECOMMENDED_MATCHES.json');relay=read('FINAL100_MATCHES.json');terminal=read('TERMINAL_ROUTE.json');assert len(normal)==87 and len(recommended)==29 and len(relay)==4 and len(terminal)==1
reports=['CAMPAIGN_MATCHES.json','RECOMMENDED_MATCHES.json','FINAL100_MATCHES.json','TERMINAL_ROUTE.json'];prefix='../../evidence/map-revision-0220/'
def witness(row,report):
 ops=[]
 for s in row['actions']:
  movement=s['moves'][0]['moved'];label='転移' if s['teleport'] else '必殺' if s['weaponId'].startswith('S_') else '通常'
  ops.append((('右' if movement>0 else '左')+f'へ{abs(movement):g}px歩行→' if abs(movement)>.01 else '')+s['id']+f':{label} {s["angle"]:g}°/{s["power"]:g}%')
 return dict(character=row['id'] if row['stage']!=100 else 'team',actions=len(row['actions']),description=' → '.join(ops)+'。新地形・通常難易度・敵反撃を含む実エンジンの成立例。人の難易度測定ではない。',evidence=dict(report=prefix+report,stage=row['stage'],seed=row['seed'],strategy=row['strategy']))
p=root/'design/expedition_013/stage_verification.json';data=json.loads(p.read_text())
for n in sorted(targets):
 if n==100:
  matches=[r for r in relay if not r['allowSpecial']];rec=next(r for r in relay if r['allowSpecial']);assert len(matches)==3 and all(len(r['entries'])==10 and set(r['teamDamage'].values())=={5} for r in relay)
  result=dict(stage=n,status='PASS',teamSeedWins=3,teamActions=[min(r['shots'] for r in matches),max(r['shots'] for r in matches)],order=bps[-1]['finalBattle']['order'],requiredDamage=100,fixedHp=70,minSpawnDistance=800,worldWidth=3000,maps=4,recommendedCharacter='team',recommendedWin=True,recommendedActions=rec['shots'],nativeActionLimit=80,normalWitness=witness(matches[0],'FINAL100_MATCHES.json'),recommendedWitness=witness(rec,'FINAL100_MATCHES.json'))
 else:
  matches=[r for r in normal if r['stage']==n];assert len(matches)==3;rec=next(r for r in recommended if r['stage']==n);assert rec['id']==bps[n-1]['recommended']
  result=dict(stage=n,status='PASS',gunSeedWins=3,gunActions=[min(r['shots'] for r in matches),max(r['shots'] for r in matches)],recommendedCharacter=rec['id'],recommendedWin=True,recommendedActions=rec['shots'],nativeActionLimit=matches[0]['limit'],normalWitness=witness(matches[0],'CAMPAIGN_MATCHES.json'),recommendedWitness=witness(rec,'RECOMMENDED_MATCHES.json'))
 result.update(minimumRemainingHp=min(r['remainingHp'] for r in matches),featuredTechniqueVerified=n==80,humanDifficulty='未確認。自動探索の成立と、人の操作難易度・初見理解・勝率を区別する。',reports=[prefix+r for r in reports],blueprintSha256=hashlib.sha256(json.dumps(bps[n-1],sort_keys=True,separators=(',',':')).encode()).hexdigest())
 if n==80:result['featuredWitness']=witness(terminal[0],'TERMINAL_ROUTE.json')
 data['stages'][n-1]=result
data.setdefault('historicalMethod',dict(nativeMatches=data.get('nativeMatches'),method=data.get('method')))
data['nativeMatches']=121;data['method']='Scoped 0.22.0 verification:121 current matches for30 changed maps. Unchanged70 stages retain historical proof records; they were not replayed.'
previous=data.get('partialRevalidation');data.setdefault('revalidationHistory',[]).append(previous) if previous and previous.get('terrainRevision')!='5.4' else None
data['partialRevalidation']=dict(stages=sorted(targets),terrainRevision='5.4',matches=121,scope='Thirty revised maps: three normal-only enemy seeds and one recommended-machine route each; final relay uses three normal-only and one special route. Additional stage80 polarity route. Other70 histories retained verbatim. Human difficulty unverified.',evidenceSha256={name:hashlib.sha256((a.evidence/name).read_bytes()).hexdigest() for name in reports})
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Recorded121 current native matches for30 stages; preserved70 histories')
