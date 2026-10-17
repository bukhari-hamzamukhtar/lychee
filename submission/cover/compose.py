"""Put the real marks into the ChatGPT cover: it was asked to leave those spaces empty."""
from pathlib import Path
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent
A = HERE.parent / "assets"
im = Image.open(HERE / "cover-raw.png").convert("RGBA")

def paste(file, box_w, box_h, cx, cy):
    lg = Image.open(A / file).convert("RGBA")
    k = min(box_w / lg.width, box_h / lg.height)
    lg = lg.resize((round(lg.width * k), round(lg.height * k)), Image.LANCZOS)
    im.alpha_composite(lg, (round(cx - lg.width / 2), round(cy - lg.height / 2)))

# the faint empty square it drew where the mark goes, painted out first
# The square cut into the faint corner circle. Redraw that patch pixel by
# pixel: circle colour inside the circle, page colour outside. The circle is
# fitted through three points on its edge, read off the raw image.
def circle_through(a, b, c):
    (x1, y1), (x2, y2), (x3, y3) = a, b, c
    d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
    ux = ((x1**2 + y1**2) * (y2 - y3) + (x2**2 + y2**2) * (y3 - y1) + (x3**2 + y3**2) * (y1 - y2)) / d
    uy = ((x1**2 + y1**2) * (x3 - x2) + (x2**2 + y2**2) * (x1 - x3) + (x3**2 + y3**2) * (x2 - x1)) / d
    return ux, uy, ((x1 - ux) ** 2 + (y1 - uy) ** 2) ** 0.5

cx, cy, r = circle_through((270, 10), (232, 60), (0, 205))
inside, outside = im.getpixel((20, 100)), im.getpixel((300, 100))
px = im.load()
for y in range(80, 230):
    for x in range(60, 214):  # stop short of the "L" in LastBuy
        d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
        if abs(d - r) < 1:  # soft edge
            t = (d - r + 1) / 2
            px[x, y] = tuple(round(inside[i] * (1 - t) + outside[i] * t) for i in range(4))
        else:
            px[x, y] = inside if d < r else outside
paste("logo-white.png", 118, 108, 140, 158)

# the three empty cards: AMD, Gemma, Evolus
for file, cx, w, h in [("logo-amd.png", 201, 150, 44), ("logo-gemma.png", 467, 150, 54), ("logo-evolus.png", 733, 170, 50)]:
    paste(file, w, h, cx, 666)

paste("vigil-white.png", 200, 200, 1490, 735)

out = im.convert("RGB")
out.save(HERE / "LastBuy-cover.png", optimize=True)
out.resize((1920, 1080), Image.LANCZOS).save(HERE / "LastBuy-cover-1920.png", optimize=True)
print("ok", out.size)
