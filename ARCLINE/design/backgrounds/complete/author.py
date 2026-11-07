"""Author and export exactly one scene, for review before the next scene."""
from pathlib import Path
import argparse, importlib, json, html

ROOT=Path(__file__).resolve().parent

def export_scene(scene):
    for directory in ['data','svg','png','review']:(ROOT/directory).mkdir(exist_ok=True)
    ident=scene['id']
    (ROOT/'data'/f'{ident}.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2)+'\n')
    w,h=scene['size']
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">',
         '<title id="title">'+html.escape(scene['title'])+'</title>',
         '<desc id="desc">'+html.escape(scene['concept'])+'</desc>']
    for layer in scene['layerOrder']:
        svg.append(f'<g id="{layer}">')
        for s in scene['shapes']:
            if s['layer']!=layer:continue
            attrs=f'id="{s["id"]}" fill="{scene["palette"][s["fill"]]}"'
            if s['kind']=='path':svg.append(f'<path {attrs} d="{html.escape(s["d"],quote=True)}"/>')
            else:svg.append(f'<ellipse {attrs} cx="{s["cx"]}" cy="{s["cy"]}" rx="{s["rx"]}" ry="{s["ry"]}"/>')
        svg.append('</g>')
    svg.append('</svg>')
    (ROOT/'svg'/f'{ident}.svg').write_text('\n'.join(svg)+'\n')
    return scene

def make(ident):
    return importlib.import_module('art_'+ident.replace('-','')).make()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('scene');args=parser.parse_args()
    s=export_scene(make(args.scene));print(args.scene,len(s['shapes']),'opaque shapes')
