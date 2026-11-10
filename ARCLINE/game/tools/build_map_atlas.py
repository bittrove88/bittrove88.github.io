"""Refresh every atlas map and theme from canonical runtime/design data."""
from pathlib import Path
import json,re,hashlib
from release import CONFIG
root=Path(__file__).resolve().parents[2]
p=root/'design/expedition_013/arcline_100_maps_atlas.html'
text=p.read_text()
text=re.sub(r'<!-- ATLAS_NATIVE_START -->.*?<!-- ATLAS_NATIVE_END -->', '', text, flags=re.S)
levels=json.loads((root/'design/runtime_campaign_20x5.json').read_text())['levels']
design=json.loads((root/'design/expedition_013/stage_design.json').read_text())['stages']
def payload(tag):return json.loads(re.search(r'<script id="'+tag+r'" type="application/json">(.*?)</script>',text,re.S)[1])
rows=payload('payload');themes=payload('themePayload')
# Never silently skip an added, removed or reordered level: zip() otherwise masks stale maps.
assert len(levels)==len(design)==len(rows)==100, 'All 100 atlas maps must match runtime/design records'
assert len(themes)==20, 'The atlas must contain all 20 themes'
for i,(l,d,row) in enumerate(zip(levels,design,rows),1):
    assert l['id']==d['stage']==row['id']==i, f'Stage {i}: source/atlas ordering mismatch'
    geometry={k:l[k] for k in ['floors','components','features','spawn']}
    if l.get('worldWidth'):geometry['worldWidth']=l['worldWidth']
    if l.get('finalBattle'):geometry['relayMaps']=l['finalBattle']['maps']
    row.update(name=l['name'],theme=l['themeName'],themeGoal=l['themeGoal'],kind='大ボス' if l['boss'] else '中ボス' if l['midboss'] else '通常',difficulty=d['difficultyBand'],goal=d['learningGoal'],terrainIntent=d['terrainIntent'],mainGimmicks=d['mainGimmicks'],geometry=geometry,actions=d['expectedActions'],limit=l['actionLimit'],tolerance=d['tolerance'],route=d['basicRoute'],alternative=d['alternativeRoute'],verified=d['testResult']['status'],recommendedActions=d['testResult'].get('recommendedActions'))
    for key in ['gunActions','teamActions']:
        if key in d['testResult']:row[key]=d['testResult'][key]
        else:row.pop(key,None)
for index,t in enumerate(themes,1):
    assert t['id']==index, f'Theme {index}: source/atlas ordering mismatch'
    first=(index-1)*5;ld=levels[first:first+5];dd=design[first:first+5]
    assert len(ld)==len(dd)==5, f'Theme {index}: incomplete group'
    components=[c for l in ld for m in l.get('finalBattle',{}).get('maps',[l]) for c in m['components']]
    t.update(name=ld[0]['themeName'],goal=ld[0]['themeGoal'],difficulty='・'.join(dict.fromkeys(d['difficultyBand'] for d in dd)),range=[first+1,first+5],features=sorted({f for d in dd for f in d['mainGimmicks']}),actionMin=min(d['expectedActions'][0] for d in dd),actionMax=max(d['expectedActions'][1] for d in dd),obstacles=len(components),destructible=sum(c['destructible'] for c in components),goals=[d['learningGoal'] for d in dd],terrains=[d['terrainIntent'] for d in dd])
for tag,data in [('payload',rows),('themePayload',themes)]:
    pattern=r'(<script id="'+tag+r'" type="application/json">).*?(</script>)'
    text=re.sub(pattern,lambda m:m[1]+json.dumps(data,ensure_ascii=False,separators=(',',':'))+m[2],text,count=1,flags=re.S)
text=re.sub(r'ARCLINE v\d+\.\d+\.\d+ / Campaign',f'ARCLINE v{CONFIG["version"]} / Campaign',text)
# The standalone atlas embeds the exact current game modules, with no game boot,
# save manager, network assets or copied approximation of the art renderer.
modules=['i18n','levels','attack-catalog','combat','battle-catalog','skills','weapons','geometry','physics','inventory','crew','crew-usage','final-team','encounters','enemy-attacks','enemy-position','boss-actions','enemy-actions','engine','visual-style','visual-registry','characters','aim-guide','effects','actor-bodies','visual-art','charge-camera','enemy-camera','backgrounds','component-art','render','map-camera']
sources=[f'game/dist/{name}.js' for name in modules]
sources+=['game/tools/atlas_viewer.css','game/tools/atlas_viewer.js','site/secondary.css','site/frame.css','site/navigation.js']
manifest={'version':CONFIG['version'],'stages':100,'uniqueMaps':103,'backgroundScenes':33,'sources':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in sources}}
block=['<!-- ATLAS_NATIVE_START -->','<script id="atlasNativeManifest" type="application/json">'+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'</script>']
css=(root/'game/tools/atlas_viewer.css').read_text()
block.append('<style data-atlas-source="game/tools/atlas_viewer.css">\n'+css+'\n</style>')
block.append('<style data-atlas-source="site/secondary.css">\n'+(root/'site/secondary.css').read_text()+'\n</style>')
block.append('<style data-atlas-source="site/frame.css">\n'+(root/'site/frame.css').read_text()+'\n</style>')
for name in ['site/navigation.js',*[f'game/dist/{name}.js' for name in modules],'game/tools/atlas_viewer.js']:
    code=(root/name).read_text()
    code=re.sub(r'</script',r'<\\/script',code,flags=re.I)
    block.append('<script data-atlas-source="'+name+'">\n'+code+'\n</script>')
block.append('<!-- ATLAS_NATIVE_END -->')
text=text.replace('</body>', ''.join(block)+'</body>')
p.write_text(text)
print('Updated standalone atlas:100 current maps,20 themes,all4 final arenas and exact native background/component rendering')
