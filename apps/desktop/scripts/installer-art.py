"""Draws the Windows installer pictures from the app icon, in Moom's pixel style.

    python apps/desktop/scripts/installer-art.py

Writes src-tauri/installer/sidebar.bmp (164x314, welcome and finish pages) and
header.bmp (150x57, every other page). NSIS wants 24-bit BMPs at exactly these sizes.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ICON = HERE.parent / "app-icon.png"
OUT = HERE.parent / "src-tauri" / "installer"

PAPER = (242, 234, 215)
PAPER2 = (230, 219, 194)
INK = (36, 30, 25)
TEAL = (47, 122, 106)
DOT = (222, 212, 189)

# 5x7 pixel letters, just the ones the pictures use.
GLYPHS = {
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    " ": ["00000"] * 7,
}


def pixel_grid(img: Image.Image, cells: int) -> Image.Image:
    """The icon's own pixels: one sample from the middle of each cell."""
    step = img.width / cells
    out = Image.new("RGBA", (cells, cells))
    for y in range(cells):
        for x in range(cells):
            out.putpixel((x, y), img.getpixel((int((x + 0.5) * step), int((y + 0.5) * step))))
    return out


def bird(scale: int) -> Image.Image:
    """The pigeon alone: icon grid minus its frame, background and ground, scaled up."""
    g = pixel_grid(Image.open(ICON).convert("RGBA"), 24)
    # Rows 4..19 and columns 3..18 hold the bird and its feet.
    crop = g.crop((3, 4, 19, 20))
    clean = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    for y in range(crop.height):
        for x in range(crop.width):
            c = crop.getpixel((x, y))
            near = lambda ref: sum(abs(a - b) for a, b in zip(c[:3], ref)) < 40
            if not (near(PAPER) or near(TEAL)):
                clean.putpixel((x, y), c)
    return clean.resize((crop.width * scale, crop.height * scale), Image.NEAREST)


def text(draw: ImageDraw.ImageDraw, x: int, y: int, s: str, scale: int, color) -> int:
    for ch in s:
        rows = GLYPHS[ch]
        for r, row in enumerate(rows):
            for c, bit in enumerate(row):
                if bit == "1":
                    draw.rectangle([x + c * scale, y + r * scale, x + (c + 1) * scale - 1, y + (r + 1) * scale - 1], fill=color)
        x += 6 * scale
    return x


def text_width(s: str, scale: int) -> int:
    return len(s) * 6 * scale - scale


def dots(img: Image.Image, every: int = 8):
    d = ImageDraw.Draw(img)
    for y in range(every // 2, img.height, every):
        for x in range(every // 2, img.width, every):
            d.point((x, y), fill=DOT)


def sidebar() -> Image.Image:
    w, h = 164, 314
    img = Image.new("RGB", (w, h), PAPER)
    dots(img)
    d = ImageDraw.Draw(img)
    ground = h - 70
    d.rectangle([0, ground, w, h], fill=TEAL)
    # Notched pixel frame, like the app's boxes.
    d.rectangle([3, 0, w - 4, 2], fill=INK)
    d.rectangle([3, h - 3, w - 4, h - 1], fill=INK)
    d.rectangle([0, 3, 2, h - 4], fill=INK)
    d.rectangle([w - 3, 3, w - 1, h - 4], fill=INK)
    b = bird(6)
    img.paste(b, ((w - b.width) // 2 + 6, ground - b.height + 18), b)
    word = "MOOM"
    text(d, (w - text_width(word, 5)) // 2, 34, word, 5, INK)
    sub = "DESKTOP"
    text(d, (w - text_width(sub, 2)) // 2, 34 + 7 * 5 + 12, sub, 2, TEAL)
    return img


def header() -> Image.Image:
    w, h = 150, 57
    img = Image.new("RGB", (w, h), PAPER)
    dots(img, 6)
    d = ImageDraw.Draw(img)
    d.rectangle([0, h - 3, w, h], fill=INK)
    b = bird(3)
    img.paste(b, (w - b.width - 6, h - 3 - b.height + 6), b)
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    sidebar().save(OUT / "sidebar.bmp")
    header().save(OUT / "header.bmp")
    if "--preview" in sys.argv:
        # Large copies to look at; not used by the installer.
        sidebar().resize((164 * 2, 314 * 2), Image.NEAREST).save(OUT / "preview-sidebar.png")
        header().resize((150 * 3, 57 * 3), Image.NEAREST).save(OUT / "preview-header.png")
    print("wrote", OUT)
