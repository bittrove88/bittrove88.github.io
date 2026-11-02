"""Optional preparation step; regular builds consume the reviewed alpha PNGs.

Install opencv-python-headless==5.0.0.93 in an isolated environment, then run
this script with --output /tmp/player-alpha. Compare the masks before adoption.
Only segmentation alpha is saved; this never writes an approved RGB original.
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('--output', required=True, type=Path)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
for row in json.loads((ROOT/'design/ending-roll-preparation/player-masks.json').read_text())['rows']:
    image = Image.open(ROOT/f"assets/characters/unlock/{row['id']}.png").convert('RGB')
    mask = Image.new('L', image.size)
    draw = ImageDraw.Draw(mask)
    for poly in row['polygons']:
        draw.polygon([tuple(pt) for pt in poly], fill=255)
    for poly in row['holes']:
        draw.polygon([tuple(pt) for pt in poly], fill=0)
    inside = np.array(mask)
    foreground = cv2.erode(inside, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(49,49)))
    outside = cv2.dilate(inside, cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    segmentation = np.where(inside>0,cv2.GC_PR_FGD,cv2.GC_BGD).astype('uint8')
    segmentation[(outside>0)&(inside==0)] = cv2.GC_PR_BGD
    segmentation[foreground>0] = cv2.GC_FGD
    keep = Image.new('L', image.size)
    draw = ImageDraw.Draw(keep)
    for poly in row['keepPolygons']:
        draw.polygon([tuple(pt) for pt in poly], fill=255)
    segmentation[np.array(keep)>0] = cv2.GC_FGD
    cv2.setRNGSeed(0)
    cv2.grabCut(np.array(image),segmentation,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
    alpha = np.where((segmentation==cv2.GC_FGD)|(segmentation==cv2.GC_PR_FGD),255,0).astype('uint8')
    output = args.output/f"{row['id']}.png"
    Image.fromarray(alpha).save(output)
    print(row['id'], cv2.__version__, hashlib.sha256(output.read_bytes()).hexdigest())
