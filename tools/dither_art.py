"""Dither Duke's own game frames (web/shots) into the 1-bit alpha masks the landing tints and cuts with scanlines (web/art).
games.png: nine columns, one per game, in the --strip order, so each column takes its own game's colour (the closer).
stitch.png: Stitch, the trainer from Duke's Sapphire run, at his native GBA pixels (the Duolingo band art).
Bayer ordered dither, the old-console kind, never noise. Run from the repo root."""
from PIL import Image, ImageOps
ORDER = ['duolingo', 'factorio', 'gdt', 'fez', 'papers', 'oni', 'pokemon', 'mirage', 'pikmin']
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bayer(g, keep=None):
    """L image to a 0/255 mask by 4x4 ordered dither; pixels outside `keep` (a 0/255 L mask) stay off."""
    out = Image.new('L', g.size); px, o = g.load(), out.load(); k = keep.load() if keep else None
    for y in range(g.height):
        for x in range(g.width):
            if k and not k[x, y]: continue
            o[x, y] = 255 if px[x, y] / 255 * 16 > BAYER[y % 4][x % 4] + .5 else 0
    return out


def la(mask, scale):
    a = mask.resize((mask.width * scale, mask.height * scale), Image.NEAREST)
    return Image.merge('LA', (Image.new('L', a.size, 0), a))


def column(name, w, h):
    im = Image.open(f'web/shots/{name}.jpg').convert('RGB')
    s = h / im.height; im = im.resize((round(im.width * s), h), Image.LANCZOS)
    x = max(0, (im.width - w) // 2); return im.crop((x, 0, x + w, h))


DOT = 6   # one dither dot is 6 output pixels: chunky, like the games
W, H = 1920, 1080; cw = W // 9
mosaic = Image.new('RGB', (W // DOT, H // DOT))
for i, n in enumerate(ORDER): mosaic.paste(column(n, cw // DOT + 1, H // DOT), (i * cw // DOT, 0))
games = la(bayer(ImageOps.autocontrast(mosaic.convert('L'), cutoff=2)), DOT); games.save('web/art/games.png', optimize=True)

# Stitch: the shot is the GBA frame at 3x, so a box filter by 3 gives back his real pixels; keep what isn't grass.
src = Image.open('web/shots/pokemon.jpg').convert('RGB').crop((325, 185, 400, 271))
src = src.resize((src.width // 3, src.height // 3), Image.BOX); grass = (204, 246, 192)
keep = Image.new('L', src.size); kp, sp = keep.load(), src.load()
for y in range(src.height):
    for x in range(src.width): kp[x, y] = 255 if sum(abs(a - b) for a, b in zip(sp[x, y], grass)) > 70 else 0
for _ in range(2):   # JPEG speckle in the grass: drop kept pixels with fewer than three kept neighbours
    k2 = keep.copy(); k2p = k2.load()
    for y in range(src.height):
        for x in range(src.width):
            if kp[x, y] and sum(kp[x + i, y + j] > 0 for i in (-1, 0, 1) for j in (-1, 0, 1) if (i or j) and 0 <= x + i < src.width and 0 <= y + j < src.height) < 3: k2p[x, y] = 0
    keep, kp = k2, k2p
lum = ImageOps.invert(src.convert('L'))   # dark pixels draw solid, light ones (his white hair) half-tone
lum = lum.point(lambda v: max(v, 110))   # nothing inside him drops out entirely
stitch = la(bayer(lum, keep), 40); stitch.save('web/art/stitch.png', optimize=True)

if __name__ == '__main__':
    for m, size in ((games, (W, H)), (stitch, None)):
        a = m.getchannel('A').histogram()
        assert m.mode == 'LA' and (size is None or m.size == size) and 0 < a[255] < m.width * m.height
    print('ok', stitch.size)
