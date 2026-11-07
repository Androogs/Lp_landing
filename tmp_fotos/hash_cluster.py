#!/usr/bin/env python3
"""Agrupa fotos de productos por similitud perceptual (dHash 16x16)."""
import os, sys, json
from PIL import Image

SRC = r"C:\Users\USUARIO\Desktop\MOTOS FOTOS"
THUMBS = r"C:\Users\USUARIO\Videos\Licores-Palmira-Panel\tmp_fotos\thumbs"
OUT = r"C:\Users\USUARIO\Videos\Licores-Palmira-Panel\tmp_fotos\clusters.json"

HASH_W, HASH_H = 17, 16          # dHash -> 256 bits
THUMB = 400
WINDOW = 10                      # comparar con los 10 archivos anteriores
THRESH = 0.14                    # fracción de bits distintos para considerar "mismo producto"

def dhash(img):
    g = img.convert("L").resize((HASH_W, HASH_H), Image.LANCZOS)
    px = list(g.getdata())
    bits = []
    for y in range(HASH_H):
        row = px[y*HASH_W:(y+1)*HASH_W]
        for x in range(HASH_W-1):
            bits.append(1 if row[x] > row[x+1] else 0)
    return bits

def hamming(a, b):
    d = 0
    for x, y in zip(a, b):
        if x != y:
            d += 1
    return d / len(a)

files = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".jpg", ".jpeg", ".png")))
print(f"{len(files)} archivos")

parent = list(range(len(files)))
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra

hashes = []
for i, f in enumerate(files):
    path = os.path.join(SRC, f)
    try:
        img = Image.open(path)
        img.load()
    except Exception as e:
        print("ERR", f, e)
        hashes.append(None)
        continue
    # thumbnail para hojas de contacto
    th = img.copy()
    th.thumbnail((THUMB, THUMB))
    th.convert("RGB").save(os.path.join(THUMBS, f"{i:04d}.jpg"), quality=80)
    hashes.append(dhash(img))
    if i % 50 == 0:
        print(i, f)

# unión por ventana consecutiva
for i in range(len(files)):
    if hashes[i] is None:
        continue
    for j in range(max(0, i-WINDOW), i):
        if hashes[j] is None:
            continue
        if hamming(hashes[i], hashes[j]) < THRESH:
            union(i, j)

clusters = {}
for i in range(len(files)):
    clusters.setdefault(find(i), []).append(i)

groups = sorted(clusters.values(), key=lambda g: g[0])
result = []
for g in groups:
    result.append({
        "rep": g[0],
        "files": [files[i] for i in g],
        "idx": g,
        "size": len(g),
    })
with open(OUT, "w") as fh:
    json.dump(result, fh, indent=1)

sizes = {}
for g in result:
    sizes[g["size"]] = sizes.get(g["size"], 0) + 1
print("clusters:", len(result))
print("dist tamaños:", sizes)
