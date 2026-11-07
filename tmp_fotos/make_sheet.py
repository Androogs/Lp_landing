#!/usr/bin/env python3
"""Genera hojas de contacto desde los thumbs.
Uso: python make_sheet.py <salida.jpg> <i1,i2,...> [cols]
"""
import os, sys
from PIL import Image, ImageDraw

THUMBS = r"C:\Users\USUARIO\Videos\Licores-Palmira-Panel\tmp_fotos\thumbs"
CELL = 400
LABEL = 26

out = sys.argv[1]
idxs = [int(x) for x in sys.argv[2].split(",") if x != ""]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
rows = (len(idxs) + cols - 1) // cols

sheet = Image.new("RGB", (cols * CELL, rows * (CELL + LABEL)), "white")
d = ImageDraw.Draw(sheet)
for n, i in enumerate(idxs):
    r, c = divmod(n, cols)
    x, y = c * CELL, r * (CELL + LABEL)
    d.text((x + 6, y + 3), f"#{i}", fill="red")
    p = os.path.join(THUMBS, f"{i:04d}.jpg")
    if os.path.exists(p):
        im = Image.open(p)
        sheet.paste(im, (x + (CELL - im.width) // 2, y + LABEL + (CELL - im.height) // 2))
    else:
        d.text((x + 6, y + 100), "NO THUMB", fill="red")
sheet.save(out, quality=82)
print(out, sheet.size)
