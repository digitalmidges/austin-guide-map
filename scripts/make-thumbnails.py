"""Regenerate bundled card thumbnails with Python 3 + Pillow (optional authoring tool)."""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
guide = json.loads((ROOT / 'src/data/guide.json').read_text())
catalog = json.loads((ROOT / 'src/lib/place-photos.json').read_text())
sources = {place.get('image') or catalog.get(place['id'], {}).get('src') for place in guide['places']}
thumbnails = {}
original_bytes = thumbnail_bytes = 0
for source in sorted(source for source in sources if source and source.startswith('/images/')):
    original = PUBLIC / source.lstrip('/')
    relative = Path(source.removeprefix('/images/')).with_suffix('.webp')
    target = PUBLIC / 'images/thumbnails' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((400, 300), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=76, method=6)
    thumbnails[source] = '/' + target.relative_to(PUBLIC).as_posix()
    original_bytes += original.stat().st_size
    thumbnail_bytes += target.stat().st_size
(ROOT / 'src/lib/photo-thumbnails.json').write_text(json.dumps(thumbnails, indent=2) + '\n')
print(f'{len(thumbnails)} photos: {original_bytes:,} original bytes → {thumbnail_bytes:,} card thumbnail bytes')
