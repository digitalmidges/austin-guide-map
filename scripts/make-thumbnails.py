"""Make card-size thumbnails for photos in public/images (optional authoring tool).

Needs Python 3 + Pillow. For every place whose photo is a local file, this writes
public/images/thumbnails/<same path>.webp and points the place's photo.thumb at it.
Photos uploaded from the editor already come with their own thumbnail.
"""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
GUIDE = ROOT / 'src/data/guide.json'

guide = json.loads(GUIDE.read_text())
made = 0
for place in guide['places']:
    photo = place.get('photo')
    if not photo or not photo['src'].startswith('images/') or photo['src'].startswith('images/thumbnails/'):
        continue
    if photo['thumb'] != photo['src']:
        continue  # Already has a thumbnail.
    relative = Path(photo['src'].removeprefix('images/')).with_suffix('.webp')
    target = PUBLIC / 'images/thumbnails' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(PUBLIC / photo['src']) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((480, 360), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=76, method=6)
    photo['thumb'] = target.relative_to(PUBLIC).as_posix()
    made += 1

GUIDE.write_text(json.dumps(guide, indent=2, ensure_ascii=False) + '\n')
print(f'Made {made} thumbnails.')
