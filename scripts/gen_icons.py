from PIL import Image, ImageDraw
import math, os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG1 = (26, 15, 46)   # deep violet
BG2 = (91, 33, 82)   # wine
GOLD = (212, 175, 100)

def draw_glass(size, padding_ratio=0.18, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG1)
    else:
        d.rounded_rectangle([0, 0, size, size], radius=size * 0.22, fill=BG1)

    # radial-ish gradient effect via concentric circles
    cx, cy = size / 2, size / 2
    for i in range(size // 2, 0, -2):
        t = i / (size / 2)
        r = int(BG1[0] + (BG2[0] - BG1[0]) * (1 - t) * 0.6)
        g = int(BG1[1] + (BG2[1] - BG1[1]) * (1 - t) * 0.6)
        b = int(BG1[2] + (BG2[2] - BG1[2]) * (1 - t) * 0.6)
        d.ellipse([cx - i, cy - i, cx + i, cy + i], outline=(r, g, b), width=3)

    pad = size * (padding_ratio + (0.08 if maskable else 0))
    gw = size - 2 * pad
    gh = gw * 1.15

    top = pad + size * 0.02
    bottom = top + gh
    left = pad
    right = size - pad
    bowl_bottom = top + gh * 0.55
    stem_bottom = bottom - gh * 0.12
    base_y = bottom

    # martini/coupe glass bowl (triangle-ish with curve)
    bowl = [
        (left, top),
        (right, top),
        (cx, bowl_bottom),
    ]
    d.polygon(bowl, fill=GOLD)

    # liquid inside (slightly smaller, warmer tone)
    liquid_top = top + gh * 0.12
    liquid = [
        (left + gw * 0.08, liquid_top),
        (right - gw * 0.08, liquid_top),
        (cx, bowl_bottom - gh * 0.02),
    ]
    d.polygon(liquid, fill=(230, 140, 90))

    # stem
    stem_w = max(2, size * 0.018)
    d.line([(cx, bowl_bottom), (cx, stem_bottom)], fill=GOLD, width=int(stem_w * 2))

    # base
    base_w = gw * 0.5
    d.line([(cx - base_w / 2, stem_bottom), (cx + base_w / 2, stem_bottom)], fill=GOLD, width=int(stem_w * 2))

    # garnish dot (olive/cherry)
    r = size * 0.035
    d.ellipse([cx - r, top - r * 0.3, cx + r, top + r * 1.7], fill=(150, 40, 60))

    return img

for size in [72, 96, 128, 144, 152, 180, 192, 256, 384, 512]:
    img = draw_glass(size, maskable=False)
    img.save(os.path.join(OUT, f"icon-{size}.png"))

# maskable (safe-zone aware, more padding)
for size in [192, 512]:
    img = draw_glass(size, padding_ratio=0.22, maskable=True)
    img.save(os.path.join(OUT, f"maskable-{size}.png"))

# apple touch icon
draw_glass(180, maskable=False).save(os.path.join(OUT, "apple-touch-icon.png"))

# favicon
draw_glass(64, maskable=False).save(os.path.join(OUT, "favicon-64.png"))

print("done")
