"""Record only stage100's observed revalidation; retain the other99 histories."""
from pathlib import Path
import argparse,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);p.add_argument('--report-root',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2]
def read(name):
 d=json.loads((a.evidence/name).read_text());assert d['status']=='PASS' and all(r['stage']==100 and r['result']=='win' for r in d['rows']);return d
normal=read('AIRBORNE_MATCHES.json');tactical=read('TACTICAL_MATCHES.json');assert normal['matches']==3 and tactical['matches']==1
assert sorted(r['seedVariant'] for r in normal['rows'])==[1,2,3]
def witness(row,key,file):
 actions=row[key];out=[]
 for s in actions:
  if abs(s.get('walk',0))>.01:out.append(('右' if s['walk']>0 else '左')+f"へ{abs(s['walk'])/10:.1f}歩行")
  out.append({'attack':'通常','break':'破壊','teleport':'転移','special':'必殺'}[s['kind']]+f" {s['angle']:g}°/{s['power']:g}%")
 return {'character':row.get('id','gun'),'actions':len(actions),'description':' → '.join(out)+'。敵の手番を含む実戦の成立例。角度・出力は自動探索による検証値で、人の難易度測定ではない。','evidence':{'report':a.report_root+file,'stage':100,'seedVariant':row.get('seedVariant')}}
bp=json.loads((root/'design/expedition_013/stage_blueprints.json').read_text())[-1];counts=[len(r['actions']) for r in normal['rows']];t=tactical['rows'][0]
record={'stage':100,'status':'PASS','gunSeedWins':3,'gunActions':[min(counts),max(counts)],'recommendedCharacter':t['id'],'recommendedWin':True,'recommendedActions':len(t['steps']),'nativeActionLimit':normal['rows'][0]['actionLimit'],'minimumRemainingHp':min(r['remainingHp'] for r in normal['rows']),'normalWitness':witness(normal['rows'][0],'actions','AIRBORNE_MATCHES.json'),'recommendedWitness':witness(t,'steps','TACTICAL_MATCHES.json'),'featuredTechniqueVerified':False,'humanDifficulty':'未確認。自動探索による実戦成立を人の操作難易度や勝率と混同しない。','reports':[a.report_root+n for n in ['AIRBORNE_MATCHES.json','TACTICAL_MATCHES.json']],'blueprintSha256':hashlib.sha256(json.dumps(bp,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
p=root/'design/expedition_013/stage_verification.json';report=json.loads(p.read_text());assert report['stages'][-1]['stage']==100;report['stages'][-1]=record
report['partialRevalidation']={'stages':[100],'terrainRevision':bp['terrainRevision'],'matches':4,'scope':'Only stage100 rerun:3 Gun/no-special enemy seeds and1 recommended-machine match. The other99 records are retained historical evidence; their blueprints and runtime combat data are unchanged.','evidenceSha256':{n:hashlib.sha256((a.evidence/n).read_bytes()).hexdigest() for n in ['AIRBORNE_MATCHES.json','TACTICAL_MATCHES.json']}}
p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('Recorded4 observed stage100 wins;99 existing stage histories retained')
