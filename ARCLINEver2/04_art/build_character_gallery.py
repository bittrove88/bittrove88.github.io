"""Build the one-page gallery from the numbered planning archive; never alter artwork."""
from pathlib import Path
from collections import Counter
import hashlib, html, json, os, re
from PIL import Image

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
ROOT = PROJECT.parent
ARCHIVE = HERE / 'CHARACTER_PLANNING_ARCHIVE.md'

def plain(value):
    value = re.sub(r'<br\s*/?>', '\n', value)
    value = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', value)
    return html.unescape(re.sub(r'<[^>]+>', '', value)).replace('`', '').strip()

def image_info(path):
    with Image.open(path) as im:
        return im.size

def study_region(path, col, count):
    """Read pixels to choose a viewport. No cropped image is created or saved."""
    with Image.open(path) as im:
        im = im.convert('RGB')
        width,height = im.size
        # Ignore column separators and number labels below the main artwork.
        left,right = int(width*(col-1)/count)+9, int(width*col/count)-9
        top,bottom = int(height*.018),int(height*.845)
        pixels=im.load(); xs=[];ys=[]
        for y in range(top,bottom,3):
            for x in range(left,right,3):
                r,g,b=pixels[x,y]
                if min(r,g,b)<135 and max(r,g,b)-min(r,g,b)>8:
                    xs.append(x);ys.append(y)
        if not xs:return [(col-1)/count,.02,1/count,.82]
        x0=max(int(width*(col-1)/count),min(xs)-16)
        x1=min(int(width*col/count),max(xs)+16)
        y0=max(0,min(ys)-18);y1=min(height,max(ys)+18)
        return [x0/width,y0/height,(x1-x0)/width,(y1-y0)/height]

def build():
    records=[]; dimensions={};hashes={}
    jobs=json.loads((PROJECT/'02_jobs/jobs.json').read_text())['jobs']
    for line in ARCHIVE.read_text().splitlines():
        if not re.match(r'^\| C\d{4} \|',line):continue
        cells=[x.strip() for x in line.split('|')[1:-1]]
        assert len(cells)==8
        number,name,phase,category,idea,shape,review,image_cell=cells
        names=plain(name).split('\n',1);phases=plain(phase).split('\n',1)
        src=re.search(r'<img[^>]+src="([^"]+)"',image_cell)
        image_path=(HERE/src.group(1)).resolve() if src else None
        image=os.path.relpath(image_path,PROJECT) if image_path else None
        position=plain(image_cell).split('・',1)[-1] if src else ''
        legacy=names[1] if len(names)>1 else ''
        phase_name=phases[0]; state=phases[1] if len(phases)>1 else ''
        if legacy.startswith('ARC /'): role='ARC・ジョブ'
        elif category.startswith('自機'):role='旧自機'
        elif '通常敵' in phase_name or category=='通常敵':role='通常敵'
        elif '中ボス' in phase_name or category=='中ボス':role='中ボス'
        elif '大ボス' in phase_name or category=='大ボス':role='大ボス'
        elif number<='C0162':role='強敵の比較案'
        else:role='未生成の発想'
        if '現行' in legacy or '継続候補' in state or '改訂候補' in state:stage='現行候補'
        elif '没案' in state or '除外' in state or '不採用' in state:stage='没案・除外'
        elif '中間' in state or '旧案' in state:stage='旧案・中間案'
        else:stage='参考・検討'
        record=dict(id=number,name=names[0],legacy=legacy,role=role,phase=phase_name,status=state,stage=stage,category=plain(category),idea=plain(idea),shape=plain(shape),review=plain(review),image=image,position=position,region=[0,0,1,1],width=1,height=1,sourceLinks=[])
        for label,link in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',review):
            if link.startswith('http'):continue
            target=(HERE/link).resolve()
            if target.is_file():record['sourceLinks'].append(dict(label=label,path=os.path.relpath(target,PROJECT)))
        prev=re.search(r'前の版：(C\d{4})',record['review'])
        record['previous']=prev.group(1) if prev else None
        if image_path:
            assert image_path.is_file(),image_path
            if image not in dimensions:
                dimensions[image]=image_info(image_path)
                hashes[image]=hashlib.sha256(image_path.read_bytes()).hexdigest()
            record['width'],record['height']=dimensions[image]
            col=re.search(r'左から第(\d)列',record['position'])
            if 'ver2-first-proposal/' in image and col:
                c=int(col.group(1))-1
                left=max(0,c/3-.012);right=min(1,(c+1)/3+.002)
                record['region']=[left,.205,right-left,.435]
            elif 'strong-enemy' in image and col:
                record['region']=study_region(image_path,int(col.group(1)),5)
            elif '/design/sheets/' in image:
                row=re.search(r'(\d)段目',record['position'])
                if col and row:
                    c=int(col.group(1))-1;r=int(row.group(1))-1
                    if 'S05' in legacy:record['region']=[c/4,.115+r*.275,.25,.145]
                    elif 'S01' in legacy:record['region']=[c/5,.12+r*.43,.2,.215]
                    else:record['region']=[c/5,.12+r*.455,.2,.2]
        if role=='ARC・ジョブ':
            record['uploadSlot']='base' if '基本形態' in legacy else 'jobs'
            record['expectedImage']='assets/ARC_BASE_ORIGINAL_REFERENCE.png' if record['uploadSlot']=='base' else 'assets/ARC_12_JOBS_FIXED_LINEUP.png'
            if (PROJECT/record['expectedImage']).is_file():
                record['image']=record['expectedImage'];record['width'],record['height']=image_info(PROJECT/record['image'])
                dimensions[record['image']]=(record['width'],record['height'])
                hashes[record['image']]=hashlib.sha256((PROJECT/record['image']).read_bytes()).hexdigest()
            match=re.search(r'JOB (\d+)',legacy)
            if match:
                job=jobs[int(match.group(1))-1]
                record['job']=job
                index=int(match.group(1))-1
                record['region']=[.251+(index%4)*.187,.12+(index//4)*.277,.184,.162]
                record['sourceLinks'].append(dict(label='現行のジョブ仕様',path='02_jobs/JOB_CATALOG.md'))
            else:
                record['region']=[.205,.17,.38,.39]
                record['sourceLinks'].append(dict(label='主人公の設定',path='01_protagonist/ARC_BASE.md'))
        records.append(record)
    assert [r['id'] for r in records]==[f'C{i:04}' for i in range(1,232)]
    by_id={r['id']:r for r in records}
    for r in records:
        if r['previous']:assert r['previous'] in by_id
    data=dict(updated='2026-11-08',records=records,stats=dict(records=len(records),withImages=sum(bool(r['image']) for r in records),originalImages=len(dimensions),arcMissing=sum(r['role']=='ARC・ジョブ' and not r['image'] for r in records)),roleCounts=dict(Counter(r['role'] for r in records)))
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    template=(HERE/'character-gallery.html.template').read_text()
    assert template.count('%%CHARACTER_DATA%%')==1
    output=template.replace('%%CHARACTER_DATA%%',encoded)
    (PROJECT/'index.html').write_text(output)
    return data,hashes

if __name__=='__main__':
    data,_=build()
    print(json.dumps(data['stats'],ensure_ascii=False))
