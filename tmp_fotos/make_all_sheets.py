#!/usr/bin/env python3
"""Genera todas las hojas de contacto (24 celdas 4x6 por hoja)."""
import os
from PIL import Image, ImageDraw

THUMBS = r"C:\Users\USUARIO\Videos\Licores-Palmira-Panel\tmp_fotos\thumbs"
OUT = r"C:\Users\USUARIO\Videos\Licores-Palmira-Panel\tmp_fotos\sheets"
CELL, LABEL, COLS = 400, 26, 4
PER = 24

os.makedirs(OUT, exist_ok=True)
n = len([f for f in os.listdir(THUMBS) if f.endswith(".jpg")])
print(n, "thumbs")
for s in range(0, n, PER):
    idxs = list(range(s, min(s + PER, n)))
    rows = (len(idxs) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * CELL, rows * (CELL + LABEL)), "white")
    d = ImageDraw.Draw(sheet)
    for k, i in enumerate(idxs):
        r, c = divmod(k, COLS)
        x, y = c * CELL, r * (CELL + LABEL)
        d.rectangle([x, y, x + CELL - 1, y + LABEL + CELL - 1], outline="#cccccc")
        d.text((x + 6, y + 3), f"#{i}", fill="red")
        p = os.path.join(THUMBS, f"{i:04d}.jpg")
        if os.path.exists(p):
            im = Image.open(p)
            sheet.paste(im, (x + (CELL - im.width) // 2, y + LABEL + (CELL - im.height) // 2))
        else:
            d.text((x + 8, y + 100), "NO", fill="red")
    out = os.path.join(OUT, f"sheet_{s:04d}.jpg")
    sheet.save(out, quality=85)
print("sheets:", (n + PER - 1) // PER)
