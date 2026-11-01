"""Record observed native matches, keeping human playability explicitly separate."""
from pathlib import Path
import argparse,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2]
def read(name):
    data=json.loads((a.evidence/name).read_text());assert data['status']=='PASS',name
    return data
normal=read('CAMPAIGN_MATCHES.json');featured=read('FEATURED_ROUTES.json');tactical=read('TACTICAL_MATCHES.json')
assert normal['matches']==300 and featured['matches']==16 and tactical['matches']==100
def witness(row,field):
    actions=row[field];operations=[]
    for step in actions:
        movement=step.get('walk',0)
        if abs(movement)>.01:operations.append(('右' if movement>0 else '左')+f'へ{abs(movement)/10:.1f}歩行')
        mode={'attack':'通常','break':'破壊','teleport':'転移','special':'必殺'}[step['kind']]
        operations.append(f"{mode} {step['angle']:g}°/{step['power']:g}%")
    reference='FEATURED_ROUTES.json' if row in featured['rows'] else 'TACTICAL_MATCHES.json' if field=='steps' else 'CAMPAIGN_MATCHES.json'
    return {'character':row.get('id','gun'),'actions':len(actions),'description':' → '.join(operations)+'。敵の手番を含む実戦の成立例。座標は設計スケール、角度はその時点の車体正面から。','evidence':{'report':'../../evidence/expedition-013/'+reference,'stage':row['stage'],'seedVariant':row.get('seedVariant')}}
rows=[]
for n in range(1,101):
    matches=[r for r in normal['rows'] if r['stage']==n];assert len(matches)==3 and all(r['result']=='win' for r in matches)
    t=next(r for r in tactical['rows'] if r['stage']==n);assert t['result']=='win'
    f=next((r for r in featured['rows'] if r['stage']==n),None)
    counts=[len(r['actions']) for r in matches]
    result={'stage':n,'status':'PASS','gunSeedWins':3,'gunActions':[min(counts),max(counts)],'recommendedCharacter':t['id'],'recommendedWin':True,'recommendedActions':len(t['steps']),'nativeActionLimit':matches[0]['actionLimit'],'minimumRemainingHp':min(r['remainingHp'] for r in matches),'normalWitness':witness(matches[0],'actions'),'recommendedWitness':witness(t,'steps'),'featuredTechniqueVerified':bool(f),'humanDifficulty':'未確認。自動探索は人の狙いやすさ・楽しさ・勝率の測定ではない。','reports':['../../evidence/expedition-013/CAMPAIGN_MATCHES.json','../../evidence/expedition-013/TACTICAL_MATCHES.json']}
    if f:result['featuredWitness']=witness(f,'steps');result['reports'].append('../../evidence/expedition-013/FEATURED_ROUTES.json')
    rows.append(result)
report={'campaignRevision':'5.0','status':'PASS','nativeMatches':416,'method':'300 Gun/no-special full matches with3 enemy seeds +100 recommended-machine full matches +16 featured-technique full matches. Actual HP, damage, walking limits, supplies and enemy turns. No synthetic victories.','limits':['全100面×全10機体の完走は未確認（安全な初期配置1000組は別途確認）。','スマートフォン実端末での操作難易度・全100面の人による通しプレイは未確認。','16の加入後見せ場は固有イベントを検査。他の複合面について、全ての意図した手順・全ての解法を証明するものではない。'],'evidenceSha256':{name:hashlib.sha256((a.evidence/name).read_bytes()).hexdigest() for name in ['CAMPAIGN_MATCHES.json','TACTICAL_MATCHES.json','FEATURED_ROUTES.json']},'stages':rows}
(root/'design/expedition_013/stage_verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Recorded416 native wins;100 per-stage witnesses; human difficulty remains unverified')
