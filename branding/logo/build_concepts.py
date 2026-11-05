#!/usr/bin/env python3
"""Generate the 3 ZennShop logo concepts (SVG masters + lockups) — run with /usr/bin/python3."""
import math
import os

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "concepts")
os.makedirs(OUT, exist_ok=True)

INK = "#0b1626"
GOLD = "#8f7c59"


def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def rounded_poly(pts, radii):
    """Closed polygon with per-vertex corner radius (exact circular arcs)."""
    if isinstance(radii, (int, float)):
        radii = [radii] * len(pts)
    n = len(pts)
    segs = []
    for i in range(n):
        r = radii[i]
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        if r <= 0:
            segs.append((p1, p1, 0, 0))
            continue
        v1 = (p0[0] - p1[0], p0[1] - p1[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1, u2 = (v1[0] / l1, v1[1] / l1), (v2[0] / l2, v2[1] / l2)
        cosang = max(-1.0, min(1.0, u1[0] * u2[0] + u1[1] * u2[1]))
        ang = math.acos(cosang)
        tdist = min(r / math.tan(ang / 2), l1 * 0.48, l2 * 0.48)
        r_eff = tdist * math.tan(ang / 2)
        a = (p1[0] + u1[0] * tdist, p1[1] + u1[1] * tdist)
        b = (p1[0] + u2[0] * tdist, p1[1] + u2[1] * tdist)
        cross = u1[0] * u2[1] - u1[1] * u2[0]
        sweep = 0 if cross > 0 else 1
        segs.append((a, b, r_eff, sweep))
    d = f"M{f(segs[0][1][0])} {f(segs[0][1][1])}"
    for i in range(1, n + 1):
        a, b, r_eff, sweep = segs[i % n]
        d += f" L{f(a[0])} {f(a[1])}"
        if r_eff > 0:
            d += f" A{f(r_eff)} {f(r_eff)} 0 0 {sweep} {f(b[0])} {f(b[1])}"
    return d + " Z"


def rot180(pts):
    return [(256 - x, 256 - y) for x, y in pts]


# ------------------------------------------------------------------
# Concept A — NEXUS Z (Recommended: Two 45° interlocking chevrons, exact optical alignment)
def concept_nexus():
    pts_top = [
        (44, 22),
        (225, 22),
        (83, 164),
        (44, 164),
        (44, 148),
        (124, 68),
        (44, 68),
    ]
    radii = [13, 10, 11, 7, 7, 8, 13]
    return rounded_poly(pts_top, radii), rounded_poly(rot180(pts_top), radii)


# ------------------------------------------------------------------
# Concept B — PONT D'OR (Gold diagonal beam of light + two architectural storefront wings)
def concept_pont_dor():
    beam = [
        (164, 28),
        (228, 28),
        (228, 92),
        (92, 228),
        (28, 228),
        (28, 164),
    ]
    top_wing = [
        (28, 28),
        (144, 28),
        (92, 80),
        (68, 80),
        (68, 104),
        (28, 104),
    ]
    bot_wing = rot180(top_wing)
    a_d = rounded_poly(top_wing, [14, 10, 12, 6, 10, 10]) + " " + rounded_poly(bot_wing, [14, 10, 12, 6, 10, 10])
    b_d = rounded_poly(beam, [12, 18, 12, 12, 18, 12])
    return a_d, b_d


# ------------------------------------------------------------------
# Concept C — AUVENT ROYAL (Architectural Z whose top bar carries a market stall valance)
def concept_auvent():
    t, n, x0, x1, sag = 36, 3, 40, 216, 16
    w = x1 - x0
    d = t / math.sin(math.radians(45))
    run = w - d
    total = 2 * t + run
    y0 = (256 - total) / 2
    y_bar = y0 + t
    xs = x1 - d
    seg = (xs - x0) / n
    rr = (seg * seg / 4 + sag * sag) / (2 * sag)
    top = f"M{f(x0)} {f(y0)} H{f(x1)} V{f(y_bar)} H{f(xs)}"
    for i in range(n):
        xa = xs - seg * i
        top += f" A{f(rr)} {f(rr)} 0 0 1 {f(xa - seg)} {f(y_bar)}"
    top += " Z"
    yb = y_bar + run
    diag_bot = (f"M{f(x1 - d)} {f(y_bar)} L{f(x1)} {f(y_bar)} L{f(x0 + d)} {f(yb)} "
                f"H{f(x1)} V{f(yb + t)} H{f(x0)} V{f(yb)} Z")
    return top, diag_bot


# ------------------------------------------------------------------ Wordmark (Fraunces Bold outlines)
_FONT = None


def fraunces():
    global _FONT
    if _FONT is None:
        ft = TTFont(os.path.join(HERE, "fonts", "Fraunces.ttf"))
        _FONT = instancer.instantiateVariableFont(ft, {"wght": 700, "opsz": 72, "SOFT": 0, "WONK": 0})
    return _FONT


def wordmark_paths(size, x, baseline, tracking=-0.005):
    ft = fraunces()
    gs, cmap, upm = ft.getGlyphSet(), ft.getBestCmap(), ft["head"].unitsPerEm
    s = size / upm

    def run(text, x0, pen):
        cur = x0
        for ch in text:
            g = cmap[ord(ch)]
            gs[g].draw(TransformPen(pen, (s, 0, 0, -s, cur, baseline)))
            cur += ft["hmtx"][g][0] * s + tracking * size
        return cur

    bp = BoundsPen(gs)
    run("ZennShop", 0, bp)
    shift = x - bp.bounds[0]
    pz, ps = SVGPathPen(gs), SVGPathPen(gs)
    mid = run("Zenn", shift, pz)
    run("Shop", mid, ps)
    bp2 = BoundsPen(gs)
    run("ZennShop", shift, bp2)
    return pz.getCommands(), ps.getCommands(), bp2.bounds


def write_symbol(path, a_d, b_d, title):
    content = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" '
               f'role="img" aria-labelledby="title">\n  <title id="title">{title}</title>\n'
               f'  <path fill="{INK}" d="{a_d}"/>\n'
               f'  <path fill="{GOLD}" d="{b_d}"/>\n</svg>\n')
    with open(path, "w") as fh:
        fh.write(content)


def write_lockup(path, a_d, b_d, title):
    sym_h = 192
    k = sym_h / 256
    oy = (256 - sym_h) / 2
    cap = 120
    size = cap / 0.70
    gap = 40
    zd, sd, (x0, y0, x1, y1) = wordmark_paths(size, sym_h + gap, 128 + cap / 2)
    width = int(math.ceil(x1 + 8))
    content = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 256" width="{width}" height="256" '
               f'role="img" aria-labelledby="title">\n  <title id="title">{title}</title>\n'
               f'  <g transform="translate(0 {f(oy)}) scale({f(k)})">\n'
               f'    <path fill="{INK}" d="{a_d}"/>\n'
               f'    <path fill="{GOLD}" d="{b_d}"/>\n'
               f'  </g>\n'
               f'  <path fill="{INK}" d="{zd}"/>\n'
               f'  <path fill="{GOLD}" d="{sd}"/>\n</svg>\n')
    with open(path, "w") as fh:
        fh.write(content)


if __name__ == "__main__":
    items = [
        ("a-nexus", "ZennShop — Nexus Z", concept_nexus()),
        ("b-pont-dor", "ZennShop — Pont d'Or", concept_pont_dor()),
        ("c-auvent", "ZennShop — Auvent Royal", concept_auvent()),
    ]
    for slug, title, (a_d, b_d) in items:
        write_symbol(os.path.join(OUT, f"{slug}.svg"), a_d, b_d, title)
        write_lockup(os.path.join(OUT, f"{slug}-lockup.svg"), a_d, b_d, f"{title} (lockup)")
    print("written 3 concepts to", OUT)
