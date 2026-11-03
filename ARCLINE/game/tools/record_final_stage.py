"""Record stage100's real ten-machine matches; retain the other99 histories."""
from pathlib import Path
import argparse,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);p.add_argument('--report-root',required=True);a=p.parse_args();root=Path(__file__).resolve().parents[2]
file='TEAM_MATCHES.json';data=json.loads((a.evidence/file).read_text());assert data['status']=='PASS' and data['matches']==4
rows=data['rows'];assert all(r['result']=='win' and r['complete'] and r['last']=='gun' and len(r['entries'])==10 for r in rows)
bp=json.loads((root/'design/expedition_013/stage_blueprints.json').read_text())[-1];normal=rows[:3];counts=[len(r['actions']) for r in normal]
def witness(row):
 parts=[]
 for s in row['actions']:
  parts.append(s['id']+':'+s['kind']+f" {s['angle']:g}°/{s['power']:g}%")
 return {'character':'team','actions':len(row['actions']),'description':' → '.join(parts)+'。10機の自動交代と敵の手番を含む実戦成立例。数値は自動探索値で、人の難易度評価ではない。','evidence':{'report':a.report_root+file,'stage':100,'seed':row['seed']}}
record={'stage':100,'status':'PASS','teamSeedWins':3,'teamActions':[min(counts),max(counts)],'order':bp['finalBattle']['order'],'requiredDamage':10,'durabilityScale':.7,'worldWidth':3000,'maps':4,'recommendedCharacter':'team','recommendedWin':True,'recommendedActions':len(rows[3]['actions']),'nativeActionLimit':36,'normalWitness':witness(normal[0]),'recommendedWitness':witness(rows[3]),'featuredTechniqueVerified':False,'humanDifficulty':'未確認。自動探索の成立と人の操作難易度・勝率は区別。','reports':[a.report_root+file],'blueprintSha256':hashlib.sha256(json.dumps(bp,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
p=root/'design/expedition_013/stage_verification.json';report=json.loads(p.read_text());report['stages'][-1]=record;report['partialRevalidation']={'stages':[100],'terrainRevision':bp['terrainRevision'],'matches':4,'scope':'Stage100 ten-machine relay:three normal-only seeds and one signature-enabled match with real enemy turns. Other99 retained historical records.','evidenceSha256':{file:hashlib.sha256((a.evidence/file).read_bytes()).hexdigest()}};p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('Recorded4 ten-machine stage100 wins; other99 histories retained')
