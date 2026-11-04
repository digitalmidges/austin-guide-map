"""Make public/og-image.jpg, the preview shown when the link is shared.

Optional authoring tool: needs Python 3 + Pillow, and a heavy system font (macOS Avenir Next by default).
Run it again after changing the guide title, intro, or top picks.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FONT = '/System/Library/Fonts/Avenir Next.ttc'  # index 8 = Heavy, 2 = Demi Bold
INK, MUTED, GOLD, GOLD_EDGE = (14, 47, 63), (77, 99, 112), (255, 216, 61), (185, 141, 0)
W, H = 1200, 630

guide = json.loads((ROOT / 'src/data/guide.json').read_text())
settings = guide['settings']
photos = [p['photo']['src'] for p in guide['places'] if p['top'] and p.get('photo') and not p['photo']['src'].startswith('http')]


def font(size, heavy=True):
    return ImageFont.truetype(FONT, size, index=8 if heavy else 2)


def wrap(draw, text, face, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=face) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line] if line else lines


def rounded_photo(path, size, radius=30, border=8):
    with Image.open(PUBLIC / path) as image:
        photo = ImageOps.fit(ImageOps.exif_transpose(image).convert('RGB'), size, Image.Resampling.LANCZOS)
    framed = Image.new('RGBA', (size[0] + border * 2, size[1] + border * 2), (0, 0, 0, 0))
    ImageDraw.Draw(framed).rounded_rectangle([0, 0, *framed.size], radius + border, fill='white')
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *size], radius, fill=255)
    framed.paste(photo, (border, border), mask)
    return framed


canvas = Image.new('RGB', (W, H))
top, bottom = (246, 252, 254), (214, 238, 245)
for y in range(H):
    t = y / H
    ImageDraw.Draw(canvas).line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
draw = ImageDraw.Draw(canvas)

# Photos on the right.
slots = [((640, 52), (470, 300)), ((640, 380), (222, 190)), ((888, 380), (222, 190))]
for path, (xy, size) in zip(photos, slots):
    canvas.paste(rounded_photo(path, size), xy, rounded_photo(path, size))

# Brand mark: gold rounded square with a navy pin.
x0, y0 = 64, 64
draw.rounded_rectangle([x0, y0 + 6, x0 + 72, y0 + 78], 20, fill=GOLD_EDGE)
draw.rounded_rectangle([x0, y0, x0 + 72, y0 + 72], 20, fill=GOLD)
draw.ellipse([x0 + 20, y0 + 14, x0 + 52, y0 + 46], fill=INK)
draw.polygon([(x0 + 22, y0 + 36), (x0 + 50, y0 + 36), (x0 + 36, y0 + 60)], fill=INK)
draw.ellipse([x0 + 30, y0 + 24, x0 + 42, y0 + 36], fill=GOLD)

y = 176
for line in wrap(draw, settings['title'], font(84), 540):
    draw.text((64, y), line, font=font(84), fill=INK)
    y += 92
y += 14
for line in wrap(draw, settings['intro'], font(32, heavy=False), 520)[:4]:
    draw.text((64, y), line, font=font(32, heavy=False), fill=MUTED)
    y += 44
caption = f"{len(guide['places'])} SPOTS IN AUSTIN, TEXAS"
draw.text((64, H - 84), caption, font=font(24), fill=MUTED, spacing=4)

canvas.save(PUBLIC / 'og-image.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
print('Wrote public/og-image.jpg')
