"""Compile owned UI/style sources and resource blocks from game/runtime.json."""
import json,re
from release import ROOT,CONFIG,validate

def resource_block(text,kind,content,pattern):
    start=f'<!-- runtime:{kind}:start -->';end=f'<!-- runtime:{kind}:end -->'
    block=start+'\n'+content+'\n'+end
    if start in text:
        return re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end),lambda _:block,text,count=1)
    matches=list(re.finditer(pattern,text))
    assert matches,kind
    return text[:matches[0].start()]+block+text[matches[-1].end():]

def build():
    dist=ROOT/'game/dist';cache=CONFIG['cacheVersion'];version=CONFIG['version']
    for name,source in CONFIG['generated'].items():
        banner=('/* Generated from game/'+source+'. Edit the source. */\n')
        (dist/name).write_text(banner+(ROOT/'game'/source).read_text())
    metadata={k:CONFIG[k] for k in ['version','cacheVersion','campaignVersion','saveSchema','resetVersion']}
    (dist/'release-info.js').write_text('/* Generated from game/runtime.json. */\n(function(root){const data=Object.freeze('+json.dumps(metadata,separators=(',',':'))+');if(typeof module!=="undefined")module.exports=data;else root.ArcRelease=data;})(globalThis);\n')
    validate()
    p=dist/'index.html';text=p.read_text()
    text=resource_block(text,'styles','\n'.join(f'<link rel="stylesheet" href="{n}?v={cache}">' for n in CONFIG['styles']),r'<link rel="stylesheet" href="[^"]+">')
    text=resource_block(text,'scripts','\n'.join(f'<script src="{n}?v={cache}"></script>' for n in CONFIG['scripts']),r'<script src="[^"]+"></script>')
    p.write_text(text)
    p=dist/'app.webmanifest';data=json.loads(p.read_text());data['start_url']='./?v='+version;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    p=ROOT/'index.html';text=p.read_text();text=re.sub(r'(game/dist/[^"?]*\?v=)\d+\.\d+\.\d+',lambda m:m[1]+(version if m[1].startswith('game/dist/?') else cache),text);text=re.sub(r'updates/\d+\.\d+\.\d+/',f'updates/{version}/',text);p.write_text(text)
    print('Compiled runtime',version,'/',cache,':',len(CONFIG['scripts']),'scripts and',len(CONFIG['styles']),'styles')
if __name__=='__main__':build()
