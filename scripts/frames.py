"""
Video frames, cut from the full-page captures that scripts/shoot.sh makes.

    python scripts/frames.py

A full-page capture is one very tall picture, and a video wants 16:9. So each
frame here is one part of a page: the band it covers is cut out, padded with
the page's own background to 16:9, and scaled to 1920x1080. A band narrower
than the screen is framed tighter, so the words come out bigger than they are
on a 1920-wide window, which is what makes them readable in a video.

The three diagrams are padded onto white the same way.

The bands are page coordinates measured at 1920 wide with the example factory
loaded (that adds a 42px banner under the nav). If the landing page changes,
measure again: in a browser at 1920x1080,

    [...document.querySelectorAll('section')].map(s => s.getBoundingClientRect().top + scrollY)

Needs Pillow, which is not a dependency of the app.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "submission" / "screenshots"
DIAGRAMS = ROOT / "submission" / "diagrams"

OUT_W, OUT_H = 1920, 1080
CONTENT_LEFT, CONTENT_RIGHT = 327, 1593  # the 1320px container, at 1920 wide
SIDE = 80  # room either side of the content
PAD = 56  # room above and below a band


def frame(src: Image.Image, top: int, bottom: int) -> Image.Image:
    """Cut [top, bottom) of a page, pad to 16:9 in its own colour, scale to 1080p."""
    bg = src.getpixel((8, max(top, 0) + 4))[:3]
    h = bottom - top + PAD * 2
    w = max(CONTENT_RIGHT - CONTENT_LEFT + SIDE * 2, round(h * 16 / 9))
    w = min(w, src.width)
    h = max(h, round(w * 9 / 16))
    cx = (CONTENT_LEFT + CONTENT_RIGHT) // 2
    x0 = max(0, min(cx - w // 2, src.width - w))

    canvas = Image.new("RGB", (w, h), bg)
    band = src.crop((x0, top, x0 + w, bottom)).convert("RGB")
    canvas.paste(band, (0, (h - band.height) // 2))
    return canvas.resize((OUT_W, OUT_H), Image.LANCZOS)


def on_white(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    k = min((OUT_W - 160) / im.width, (OUT_H - 140) / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    canvas = Image.new("RGB", (OUT_W, OUT_H), (255, 255, 255))
    canvas.paste(im, ((OUT_W - im.width) // 2, (OUT_H - im.height) // 2))
    return canvas


def save(im: Image.Image, name: str) -> None:
    im.save(SHOTS / f"{name}.png", optimize=True)
    print(f"  {name}")


def main() -> None:
    landing = Image.open(SHOTS / "20-landing-full.png")
    landing_dark = Image.open(SHOTS / "21-landing-full-dark.png")
    notice = Image.open(SHOTS / "27-notice-impact-full.png")

    print("diagrams")
    save(on_white(DIAGRAMS / "01-system.png"), "30-diagram-system")
    save(on_white(DIAGRAMS / "02-notice.png"), "31-diagram-notice")
    save(on_white(DIAGRAMS / "03-memory.png"), "32-diagram-memory")

    print("the worked example, from the landing page")
    save(frame(landing, 5450 + 90, 6112), "40-worked-01-a-letter-arrives")
    save(frame(landing, 6112, 6585), "41-worked-02-what-it-breaks")
    save(frame(landing, 6585, 6996), "42-worked-03-parts-ranked")
    save(frame(landing, 6996, 7469), "43-worked-04-products-at-risk")
    save(frame(landing, 7469, 7791), "44-worked-05-ask-with-sources")

    print("the same notice, in the app")
    save(frame(notice, 150, 840), "45-notice-the-numbers")
    save(frame(notice, 850, 1860), "46-notice-what-breaks")
    save(frame(notice, 1860, 2660), "47-notice-the-order")

    print("landing sections")
    save(frame(landing, 1615 + 40, 2182 - 40), "49-landing-the-problem")
    save(frame(landing, 8480 + 40, 9056 - 40), "50-landing-cost")
    save(frame(landing_dark, 9056 + 40, 9581 - 40), "51-landing-close-dark")


if __name__ == "__main__":
    main()
