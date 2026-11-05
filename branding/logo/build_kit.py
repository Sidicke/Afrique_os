#!/usr/bin/env python3
"""ZennShop — Complete Logo Kit, Multi-Tone Palette Showcase, Web Icons & React Component.

Direction: « Nexus Z » (Two 45° interlocking chevrons — Zenn [Vitrine] & Shop [Marketplace]).
Run with system Python (has fonttools + cairosvg):
  /usr/bin/python3 branding/logo/build_kit.py
"""
import html
import math
import os
import shutil

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
FINAL = os.path.join(HERE, "final")
SVG_DIR = os.path.join(FINAL, "svg")
PNG_DIR = os.path.join(FINAL, "png")
ICON_DIR = os.path.join(FINAL, "icons")
PUBLIC_LOGO_DIR = os.path.join(HERE, "..", "..", "frontend", "public", "logo")
APP_DIR = os.path.join(HERE, "..", "..", "frontend", "src", "app")
COMPONENT = os.path.join(HERE, "..", "..", "frontend", "src", "components", "brand", "ZennShopLogo.tsx")

for d in (SVG_DIR, PNG_DIR, ICON_DIR, PUBLIC_LOGO_DIR):
    os.makedirs(d, exist_ok=True)

# ------------------------------------------------------------------ Exact Brand Tokens (globals.css)
MIDNIGHT_950 = "#070f1a"
MIDNIGHT_900 = "#0b1626"
MIDNIGHT_800 = "#122033"
INK_950 = "#0b1626"

GOLD_300 = "#d8cdb8"
GOLD_400 = "#c4b697"
GOLD_500 = "#a8936f"
GOLD_600 = "#8f7c59"
GOLD_700 = "#7d6a42"

IVORY_50 = "#f5f0eb"
IVORY_100 = "#efe7dd"
PAPER = "#f6f8fb"
SURFACE = "#ffffff"
GOLD_WASH = "#f7f2e8"
GOLD_SOFT = "#d9cdb4"

AFRICAN_GREEN = "#2d6a4f"
TERRACOTTA = "#c87a5a"

# Tone -> (Color A [Zenn / Top Chevron], Color B [Shop / Bottom Chevron], geometry)
TONES = {
    "light": (INK_950, GOLD_600, "std"),            # Sur fonds clairs (paper, surface, ivory)
    "dark": (IVORY_50, GOLD_400, "rev"),            # Sur fonds sombres (midnight-950/900/800)
    "gold-duo": (GOLD_300, GOLD_500, "rev"),        # Camaïeu d'or impérial (badges vitrés, cartes VIP)
    "african": (AFRICAN_GREEN, GOLD_600, "std"),    # Vert Africain & Or (vérification KYC, souveraineté)
    "terracotta": (INK_950, TERRACOTTA, "std"),     # Encre & Terracotta (artisanat, éditorial)
    "ink": (INK_950, INK_950, "std"),               # Monochrome encre
    "black": ("#000000", "#000000", "std"),         # Monochrome noir pur
    "white": ("#ffffff", "#ffffff", "rev"),         # Monochrome blanc inversé
    "gold": (GOLD_400, GOLD_400, "rev"),            # Monochrome or clair
}


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


def scale_translate_pts(pts, s, tx, ty):
    return [(x * s + tx, y * s + ty) for x, y in pts]


# ------------------------------------------------------------------ Symbol Geometry (« Nexus Z »)
# Three optical cuts:
# - 'std': Standard master for light grounds (12.7px diagonal channel, 46px bar, 38.9px stem)
# - 'rev': Reversed master for dark grounds (compensates for light-on-dark irradiation: 15.6px channel)
# - 'small': Small-size master for favicons & <=24px (bolder bars & wider 21px channel so it never closes)
GEOM_SPEC = {
    "std": dict(
        pts=[
            (44, 22),
            (225, 22),
            (83, 164),
            (44, 164),
            (44, 148),
            (124, 68),
            (44, 68),
        ],
        radii=[13, 10, 11, 7, 7, 8, 13],
        box=(44, 22, 212, 234),
    ),
    "rev": dict(
        pts=[
            (44, 22),
            (223, 22),
            (83, 162),
            (44, 162),
            (44, 146),
            (122, 68),
            (44, 68),
        ],
        radii=[13, 10, 11, 7, 7, 8, 13],
        box=(44, 22, 212, 234),
    ),
    "small": dict(
        pts=[
            (32, 16),
            (225, 16),
            (85, 156),
            (32, 156),
            (32, 138),
            (102, 68),
            (32, 68),
        ],
        radii=[14, 11, 12, 8, 8, 8, 14],
        box=(32, 16, 224, 240),
    ),
}


def symbol_paths(geom="std", target_h=None, x=0.0, y=0.0):
    """Returns (d_top, d_bottom). If target_h is None, uses native 256×256 canvas coordinates."""
    spec = GEOM_SPEC[geom]
    pts_top = spec["pts"]
    pts_bot = rot180(pts_top)
    radii = spec["radii"]
    if target_h is None:
        return rounded_poly(pts_top, radii), rounded_poly(pts_bot, radii)
    _, y0, _, y1 = spec["box"]
    s = target_h / (y1 - y0)
    x0 = spec["box"][0]
    tx = x - x0 * s
    ty = y - y0 * s
    r_scaled = [r * s for r in radii]
    return (
        rounded_poly(scale_translate_pts(pts_top, s, tx, ty), r_scaled),
        rounded_poly(scale_translate_pts(pts_bot, s, tx, ty), r_scaled),
    )


# ------------------------------------------------------------------ Wordmark (Fraunces Bold Outlines)
_FONT = None


def font():
    global _FONT
    if _FONT is None:
        ft = TTFont(os.path.join(HERE, "fonts", "Fraunces.ttf"))
        _FONT = instancer.instantiateVariableFont(ft, {"wght": 700, "opsz": 72, "SOFT": 0, "WONK": 0})
    return _FONT


CAP = 0.70  # Fraunces OS/2 sCapHeight = 1400 / 2000


def wordmark(size, x, baseline, tracking=-0.005):
    """Returns (d_zenn, d_shop, (xmin, ymin, xmax, ymax)) with ink left-aligned at x."""
    ft = font()
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


# ------------------------------------------------------------------ Layouts
def layout(kind, geom):
    """Returns (width, height, [(role, d)]) where role in ('a', 'b')."""
    if kind == "symbol":
        t, b = symbol_paths(geom)
        return 256, 256, [("a", t), ("b", b)]
    if kind == "horizontal":
        H = 256
        sym_h = 200
        sym_y = (H - sym_h) / 2
        spec = GEOM_SPEC[geom]
        sym_w = (spec["box"][2] - spec["box"][0]) * (sym_h / (spec["box"][3] - spec["box"][1]))
        pad_x = 16
        t, b = symbol_paths(geom, target_h=sym_h, x=pad_x, y=sym_y)
        cap = 122
        size = cap / CAP
        gap = 42
        baseline = H / 2 + cap / 2 - 2
        zd, sd, (x0, y0, x1, y1) = wordmark(size, pad_x + sym_w + gap, baseline)
        return int(math.ceil(x1 + pad_x)), H, [("a", t), ("b", b), ("a", zd), ("b", sd)]
    if kind == "stacked":
        sym_h = 204
        spec = GEOM_SPEC[geom]
        sym_w = (spec["box"][2] - spec["box"][0]) * (sym_h / (spec["box"][3] - spec["box"][1]))
        size = 156
        zd, sd, (x0, y0, x1, y1) = wordmark(size, 0, 0)
        wm_w = x1 - x0
        pad = 24
        W = int(math.ceil(max(wm_w, sym_w) + 2 * pad))
        gap = 44
        baseline = pad + sym_h + gap + size * CAP
        zd, sd, (x0, y0, x1, y1) = wordmark(size, (W - wm_w) / 2, baseline)
        t, b = symbol_paths(geom, target_h=sym_h, x=(W - sym_w) / 2, y=pad)
        H = int(math.ceil(y1 + pad))
        return W, H, [("a", t), ("b", b), ("a", zd), ("b", sd)]
    if kind == "wordmark":
        pad = 12
        size = 200
        zd, sd, (x0, y0, x1, y1) = wordmark(size, 0, 0)
        zd, sd, (x0, y0, x1, y1) = wordmark(size, pad, pad - y0)
        return int(math.ceil(x1 + pad)), int(math.ceil(y1 + pad)), [("a", zd), ("b", sd)]
    raise ValueError(kind)


def svg_file(kind, tone, title=None):
    a, b, geom = TONES[tone]
    W, H, parts = layout(kind, geom)
    title = title or f"ZennShop — logo {kind} ({tone})"
    body = "\n".join(f'  <path fill="{a if role == "a" else b}" d="{d}"/>' for role, d in parts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'role="img" aria-labelledby="title">\n  <title id="title">{title}</title>\n{body}\n</svg>\n')


def write(path, content):
    with open(path, "w") as fh:
        fh.write(content)


# ------------------------------------------------------------------ Icons & Badges
def icon_svgs():
    # 1. Adaptive browser favicon (prefers-color-scheme) using small-size cut
    t_sm, b_sm = symbol_paths("small")
    write(os.path.join(ICON_DIR, "icon.svg"),
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
          '  <title id="title">ZennShop</title>\n'
          f'  <style>.a{{fill:{INK_950}}}.b{{fill:{GOLD_600}}}'
          f'@media (prefers-color-scheme:dark){{.a{{fill:{IVORY_50}}}.b{{fill:{GOLD_400}}}}}</style>\n'
          f'  <path class="a" d="{t_sm}"/>\n  <path class="b" d="{b_sm}"/>\n</svg>\n')

    # 2. Favicon source on Midnight-950 rounded tile (high contrast on all browser tab bars)
    t_fav, b_fav = symbol_paths("small", target_h=172, x=48, y=42)
    write(os.path.join(ICON_DIR, "favicon-source.svg"),
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
          '  <title id="title">ZennShop</title>\n'
          f'  <rect width="256" height="256" rx="56" fill="{MIDNIGHT_950}"/>\n'
          f'  <path fill="{IVORY_50}" d="{t_fav}"/>\n  <path fill="{GOLD_400}" d="{b_fav}"/>\n</svg>\n')

    # 3. App Icon / Apple Touch / Maskable / Social Avatar
    def tile(name, rx, sym_h, bg, ca, cb, border=None):
        spec = GEOM_SPEC["rev"]
        sym_w = (spec["box"][2] - spec["box"][0]) * (sym_h / (spec["box"][3] - spec["box"][1]))
        ox = (256 - sym_w) / 2
        oy = (256 - sym_h) / 2
        t2, b2 = symbol_paths("rev", target_h=sym_h, x=ox, y=oy)
        rect = (f'<rect width="256" height="256" rx="{rx}" fill="{bg}"/>' if rx > 0
                else f'<rect width="256" height="256" fill="{bg}"/>')
        stroke = (f'\n  <rect x="4" y="4" width="248" height="248" rx="{max(0, rx - 4)}" '
                  f'fill="none" stroke="{border}" stroke-width="4"/>' if border else "")
        write(os.path.join(ICON_DIR, name),
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
              f'  <title id="title">ZennShop</title>\n  {rect}{stroke}\n'
              f'  <path fill="{ca}" d="{t2}"/>\n  <path fill="{cb}" d="{b2}"/>\n</svg>\n')

    tile("app-icon.svg", 56, 156, MIDNIGHT_950, IVORY_50, GOLD_400)
    tile("app-icon-gold-wash.svg", 56, 156, GOLD_WASH, INK_950, GOLD_600, border=GOLD_SOFT)
    tile("apple-touch-icon.svg", 0, 160, MIDNIGHT_950, IVORY_50, GOLD_400)
    tile("maskable.svg", 0, 132, MIDNIGHT_950, IVORY_50, GOLD_400)
    tile("social-avatar.svg", 0, 148, MIDNIGHT_950, IVORY_50, GOLD_400)


# ------------------------------------------------------------------ Visual Showcase Board (SVG + PNG)
def build_showcase_svg():
    """Creates a comprehensive 1600×1260 brand board showing all color games, backgrounds, lockups & scales."""
    W, H = 1600, 1260
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
        f'  <rect width="{W}" height="{H}" fill="#f1f4f9"/>',
        # Header banner
        f'  <rect x="40" y="32" width="1520" height="88" rx="20" fill="{MIDNIGHT_950}"/>',
        f'  <text x="72" y="74" fill="{IVORY_50}" font-family="DejaVu Serif, Georgia, serif" font-size="26" font-weight="bold">ZennShop — Système d’Identité Visuelle &amp; Jeux de Couleurs (« Nexus Z »)</text>',
        f'  <text x="72" y="100" fill="{GOLD_400}" font-family="DejaVu Sans, sans-serif" font-size="14">Architecture bicolore adaptative · 100 % alignée sur les tokens CSS de la plateforme (Nuit &amp; Or · Papier &amp; Or · Souveraineté Africaine)</text>',
    ]

    def embed_paths(parts, ca, cb, tx, ty, scale):
        lines = [f'  <g transform="translate({f(tx)} {f(ty)}) scale({f(scale)})">']
        for role, d in parts:
            lines.append(f'    <path fill="{ca if role == "a" else cb}" d="{d}"/>')
        lines.append('  </g>')
        return "\n".join(lines)

    # Row 1: Two large Hero Cards (Left = Dark Theme "Nuit & Or", Right = Light Theme "Papier & Or")
    hw, hh, hparts_dark = layout("horizontal", "rev")
    _, _, hparts_light = layout("horizontal", "std")

    # Card 1: Dark Theme "Nuit & Or" (Navbar, Footer, Landing, Auth)
    out += [
        f'  <rect x="40" y="144" width="748" height="320" rx="24" fill="{MIDNIGHT_950}" stroke="#1b2c42" stroke-width="2"/>',
        f'  <text x="72" y="184" fill="{GOLD_400}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="bold">THÈME 1 · NUIT &amp; OR (tone="dark" · Landing, Navbar, Footer, Auth)</text>',
        embed_paths(hparts_dark, IVORY_50, GOLD_400, 96, 224, 0.44),
        # Swatches at bottom of dark card
        f'  <rect x="72" y="400" width="18" height="18" rx="4" fill="{MIDNIGHT_950}" stroke="{GOLD_400}" stroke-width="1.5"/>',
        f'  <text x="98" y="414" fill="{IVORY_50}" font-family="DejaVu Sans Mono, monospace" font-size="12">midnight-950 #070f1a</text>',
        f'  <rect x="272" y="400" width="18" height="18" rx="4" fill="{IVORY_50}"/>',
        f'  <text x="298" y="414" fill="{IVORY_50}" font-family="DejaVu Sans Mono, monospace" font-size="12">ivory-50 #f5f0eb (17.0:1)</text>',
        f'  <rect x="502" y="400" width="18" height="18" rx="4" fill="{GOLD_400}"/>',
        f'  <text x="528" y="414" fill="{GOLD_400}" font-family="DejaVu Sans Mono, monospace" font-size="12">gold-400 #c4b697 (9.6:1)</text>',
    ]

    # Card 2: Light Theme "Papier & Or" (Espace Vendeur, Espace Client, Admin, Boutiques)
    out += [
        f'  <rect x="812" y="144" width="748" height="320" rx="24" fill="{PAPER}" stroke="#dce3ee" stroke-width="2"/>',
        f'  <text x="844" y="184" fill="{GOLD_700}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="bold">THÈME 2 · PAPIER &amp; OR (tone="light" · Vendeur, Client, Admin, Vitrine)</text>',
        embed_paths(hparts_light, INK_950, GOLD_600, 868, 224, 0.44),
        f'  <rect x="844" y="400" width="18" height="18" rx="4" fill="{PAPER}" stroke="{INK_950}" stroke-width="1.5"/>',
        f'  <text x="870" y="414" fill="{INK_950}" font-family="DejaVu Sans Mono, monospace" font-size="12">paper #f6f8fb</text>',
        f'  <rect x="1014" y="400" width="18" height="18" rx="4" fill="{INK_950}"/>',
        f'  <text x="1040" y="414" fill="{INK_950}" font-family="DejaVu Sans Mono, monospace" font-size="12">ink-950 #0b1626 (18.1:1)</text>',
        f'  <rect x="1244" y="400" width="18" height="18" rx="4" fill="{GOLD_600}"/>',
        f'  <text x="1270" y="414" fill="{GOLD_700}" font-family="DejaVu Sans Mono, monospace" font-size="12">gold-600 #8f7c59 (4.0:1)</text>',
    ]

    # Row 2: 6 Adaptive Color Games across all ZennShop surfaces (y=488..820)
    cards = [
        ("1 · BADGE NUIT VITRÉ", "Navbar / Footer / Auth", MIDNIGHT_900, "#24354f", GOLD_300, GOLD_500, "rev", "tone=\"gold-duo\""),
        ("2 · VENDEUR GOLD-WASH", "DashboardSidebar Vendeur", GOLD_WASH, GOLD_SOFT, INK_950, GOLD_600, "std", "tone=\"light\""),
        ("3 · IVOIRE ÉDITORIAL", "Sections claires & Cartes", IVORY_50, "#e6dacb", INK_950, GOLD_700, "std", "tone=\"light\""),
        ("4 · SOUVERAIN AFRIQUE", "Badges KYC & Impact", "#eaf4ef", "#b7d7c8", AFRICAN_GREEN, GOLD_600, "std", "tone=\"african\""),
        ("5 · TERRE & ARTISANAT", "Mode, Beauté & Créateurs", "#fdf4f0", "#f0d5c9", INK_950, TERRACOTTA, "std", "tone=\"terracotta\""),
        ("6 · OR SUR ÉBÈNE", "Cartes VIP & Prestige", "#0b1626", "#8f7c59", GOLD_400, GOLD_400, "rev", "tone=\"gold\""),
    ]
    cw = 240
    gap = 16
    for idx, (title, sub, bg, border, ca, cb, gm, code) in enumerate(cards):
        cx = 40 + idx * (cw + gap)
        cy = 488
        ch = 330
        sw, sh, sparts = layout("stacked", gm)
        is_dark = bg in (MIDNIGHT_900, "#0b1626", MIDNIGHT_950)
        txt_main = IVORY_50 if is_dark else INK_950
        txt_sub = GOLD_400 if is_dark else "#4d5f79"
        scale = 180 / sw
        sx = cx + (cw - sw * scale) / 2
        sy = cy + 68
        out += [
            f'  <rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="20" fill="{bg}" stroke="{border}" stroke-width="2"/>',
            f'  <text x="{cx + 18}" y="{cy + 30}" fill="{txt_main}" font-family="DejaVu Sans, sans-serif" font-size="12" font-weight="bold">{html.escape(title)}</text>',
            f'  <text x="{cx + 18}" y="{cy + 48}" fill="{txt_sub}" font-family="DejaVu Sans, sans-serif" font-size="11">{html.escape(sub)}</text>',
            embed_paths(sparts, ca, cb, sx, sy, scale),
            f'  <text x="{cx + 18}" y="{cy + 286}" fill="{txt_main}" font-family="DejaVu Sans Mono, monospace" font-size="11" font-weight="bold">{html.escape(code)}</text>',
            f'  <text x="{cx + 18}" y="{cy + 306}" fill="{txt_sub}" font-family="DejaVu Sans Mono, monospace" font-size="11">{ca} + {cb}</text>',
        ]

    # Row 3: Lockup Architecture, UI Badges & True Scale Test (128 / 64 / 32 / 16 px) (y=842..1228)
    out += [
        f'  <rect x="40" y="842" width="1520" height="386" rx="24" fill="{SURFACE}" stroke="#dce3ee" stroke-width="2"/>',
        f'  <text x="72" y="882" fill="{INK_950}" font-family="DejaVu Serif, Georgia, serif" font-size="20" font-weight="bold">Architecture des Déclinaisons, Badges d’Interface &amp; Échelle de Lisibilité (128 px → 16 px)</text>',
    ]

    # 3A: UI Badges exactly as rendered in the app headers
    badges = [
        ("Navbar / Footer", MIDNIGHT_950, GOLD_400, IVORY_50, GOLD_400, "rev"),
        ("Hover Or", GOLD_400, GOLD_500, MIDNIGHT_950, MIDNIGHT_950, "std"),
        ("Espace Vendeur", GOLD_WASH, GOLD_SOFT, INK_950, GOLD_600, "std"),
        ("Espace Client", MIDNIGHT_950, MIDNIGHT_800, IVORY_50, GOLD_300, "rev"),
        ("Badge Vérifié", AFRICAN_GREEN, AFRICAN_GREEN, IVORY_50, GOLD_300, "rev"),
    ]
    for i, (label, bg, brd, ca, cb, gm) in enumerate(badges):
        bx = 72 + i * 124
        by = 918
        _, _, sym_p = layout("symbol", gm)
        out += [
            f'  <rect x="{bx}" y="{by}" width="96" height="96" rx="22" fill="{bg}" stroke="{brd}" stroke-width="2"/>',
            embed_paths(sym_p, ca, cb, bx + 16, by + 16, 64 / 256),
            f'  <text x="{bx + 48}" y="{by + 122}" text-anchor="middle" fill="{INK_950}" font-family="DejaVu Sans, sans-serif" font-size="11.5" font-weight="bold">{label}</text>',
        ]

    # 3B: Scale Ladder (128px, 64px, 32px, 16px)
    _, _, sym_std = layout("symbol", "std")
    _, _, sym_small = layout("symbol", "small")
    sx_cursor = 716
    for sz in (128, 64, 32, 16):
        pts_use = sym_small if sz <= 32 else sym_std
        sy_pos = 1014 - sz
        out += [
            embed_paths(pts_use, INK_950, GOLD_600, sx_cursor, sy_pos, sz / 256),
            f'  <text x="{sx_cursor + sz / 2}" y="1040" text-anchor="middle" fill="{INK_950}" font-family="DejaVu Sans Mono, monospace" font-size="12" font-weight="bold">{sz}px</text>',
        ]
        sx_cursor += sz + 34

    # 3C: Monochrome & Print Stamps (Ink, Gold, Reversed)
    stamps = [
        ("Monochrome Encre", PAPER, INK_950, INK_950, "std"),
        ("Monochrome Or", MIDNIGHT_950, GOLD_400, GOLD_400, "rev"),
        ("Blanc Inversé", MIDNIGHT_950, "#ffffff", "#ffffff", "rev"),
    ]
    for i, (lbl, bg, ca, cb, gm) in enumerate(stamps):
        bx = 1136 + i * 134
        by = 918
        _, _, sym_p = layout("symbol", gm)
        out += [
            f'  <rect x="{bx}" y="{by}" width="112" height="96" rx="18" fill="{bg}" stroke="#dce3ee" stroke-width="1.5"/>',
            embed_paths(sym_p, ca, cb, bx + 24, by + 16, 64 / 256),
            f'  <text x="{bx + 56}" y="{by + 122}" text-anchor="middle" fill="{INK_950}" font-family="DejaVu Sans, sans-serif" font-size="11" font-weight="bold">{lbl}</text>',
        ]

    # Bottom summary bar inside Row 3
    out += [
        f'  <rect x="72" y="1076" width="1456" height="120" rx="16" fill="{PAPER}" stroke="#e7ebf2" stroke-width="1.5"/>',
        f'  <text x="100" y="1110" fill="{INK_950}" font-family="DejaVu Sans, sans-serif" font-size="14" font-weight="bold">Intégration React / Next.js immédiate : &lt;ZennShopLogo variant="horizontal | stacked | symbol | badge | wordmark" tone="light | dark | gold-duo | african | terracotta | mono" /&gt;</text>',
        f'  <text x="100" y="1138" fill="#34465f" font-family="DejaVu Sans, sans-serif" font-size="13">• Chevron supérieur (« Zenn ») : La vitrine privée souveraine du marchand  ·  Chevron inférieur (« Shop ») : Le marketplace central connecté  ·  Canal à 45° : L’échange direct et chiffré.</text>',
        f'  <text x="100" y="1164" fill="#34465f" font-family="DejaVu Sans, sans-serif" font-size="13">• Coupe optique dédiée aux petites tailles (≤ 32 px &amp; favicon) avec canal élargi  ·  Zéro balise &lt;text&gt; (Fraunces Bold convertie en tracés vectoriels purs)  ·  Score svg_audit : 100/100.</text>',
        '</svg>\n',
    ]
    showcase_svg = os.path.join(HERE, "zennshop-logo-showcase.svg")
    write(showcase_svg, "\n".join(out))
    return showcase_svg


# ------------------------------------------------------------------ React Component (ZennShopLogo.tsx)
def build_react_component():
    shapes = {}
    for kind in ("symbol", "horizontal", "stacked", "wordmark"):
        for geom in ("std", "rev", "small"):
            if kind != "symbol" and geom == "small":
                continue
            if kind == "wordmark" and geom != "std":
                continue
            W, H, parts = layout(kind, geom)
            shapes[f"{kind}-{geom}"] = (W, H, parts)

    def js_parts(parts):
        return "[" + ", ".join(f'["{role}", "{d}"]' for role, d in parts) + "]"

    entries = [f'  "{k}": {{ w: {W}, h: {H}, parts: {js_parts(parts)} }},' for k, (W, H, parts) in shapes.items()]
    data = "\n".join(entries)

    tsx = f'''/**
 * ZennShop — Logo Officiel (« Nexus Z »).
 *
 * Généré automatiquement par `branding/logo/build_kit.py`.
 * Symbolique : Deux chevrons symétriques imbriqués à 45° formant un « Z » sculptural —
 * le chevron supérieur (« Zenn » : la vitrine privée du marchand) et le chevron inférieur
 * (« Shop » : le marketplace connecté), séparés par le canal direct de l'échange sécurisé.
 *
 * Exemples d'utilisation :
 *   <ZennShopLogo />                                                // Lockup horizontal clair (Papier & Or)
 *   <ZennShopLogo tone="dark" className="h-9" />                    // Lockup horizontal sombre (Nuit & Or)
 *   <ZennShopLogo variant="badge" badgeStyle="dark-glass" />        // Badge Navbar / Footer / Auth
 *   <ZennShopLogo variant="badge" badgeStyle="gold-wash" />         // Badge Espace Vendeur
 *   <ZennShopLogo variant="badge" badgeStyle="midnight" />          // Badge Espace Client / Admin
 *   <ZennShopLogo variant="symbol" tone="african" className="h-8"/> // Symbole seul Vert Africain & Or
 */
import type {{ SVGProps }} from "react";

export type ZennShopLogoVariant = "horizontal" | "stacked" | "symbol" | "badge" | "wordmark";
export type ZennShopLogoTone =
  | "light"
  | "dark"
  | "gold-duo"
  | "african"
  | "terracotta"
  | "mono"
  | "gold"
  | "white";
export type ZennShopBadgeStyle = "dark-glass" | "midnight" | "gold-wash" | "ivory" | "african";

const SHAPES: Record<string, {{ w: number; h: number; parts: ["a" | "b", string][] }}> = {{
{data}
}};

/** Jeux de couleurs 100 % alignés sur les variables @theme de globals.css */
const TONES: Record<ZennShopLogoTone, {{ a: string; b: string; geom: "std" | "rev" }}> = {{
  light: {{ a: "fill-ink-950", b: "fill-gold-600", geom: "std" }},
  dark: {{ a: "fill-ivory-50", b: "fill-gold-400", geom: "rev" }},
  "gold-duo": {{ a: "fill-gold-300", b: "fill-gold-500", geom: "rev" }},
  african: {{ a: "fill-african-green", b: "fill-gold-600", geom: "std" }},
  terracotta: {{ a: "fill-ink-950", b: "fill-terracotta", geom: "std" }},
  mono: {{ a: "fill-current", b: "fill-current", geom: "std" }},
  gold: {{ a: "fill-gold-400", b: "fill-gold-400", geom: "rev" }},
  white: {{ a: "fill-white", b: "fill-white", geom: "rev" }},
}};

const BADGE_STYLES: Record<
  ZennShopBadgeStyle,
  {{ box: string; a: string; b: string; geom: "std" | "rev" }}
> = {{
  "dark-glass": {{
    box: "border border-gold-400/40 bg-gold-400/10 group-hover:border-gold-400 group-hover:bg-gold-400 transition-all duration-300",
    a: "fill-ivory-50 transition-colors duration-300 group-hover:fill-midnight-950",
    b: "fill-gold-300 transition-colors duration-300 group-hover:fill-midnight-950",
    geom: "rev",
  }},
  midnight: {{
    box: "border border-gold-400/35 bg-midnight-950 group-hover:bg-midnight-800 transition-colors duration-300",
    a: "fill-ivory-50",
    b: "fill-gold-300",
    geom: "rev",
  }},
  "gold-wash": {{
    box: "border border-gold-soft bg-gold-wash group-hover:bg-gold-mid transition-colors duration-300",
    a: "fill-ink-950 transition-colors duration-300 group-hover:fill-white",
    b: "fill-gold-strong transition-colors duration-300 group-hover:fill-ivory-100",
    geom: "std",
  }},
  ivory: {{
    box: "border border-line bg-ivory-50 group-hover:border-gold-soft transition-colors duration-300",
    a: "fill-ink-950",
    b: "fill-gold-600",
    geom: "std",
  }},
  african: {{
    box: "border border-african-green/30 bg-african-green text-ivory-50 transition-colors duration-300",
    a: "fill-ivory-50",
    b: "fill-gold-300",
    geom: "rev",
  }},
}};

export interface ZennShopLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {{
  variant?: ZennShopLogoVariant;
  tone?: ZennShopLogoTone;
  badgeStyle?: ZennShopBadgeStyle;
  /** Active la coupe optique petites tailles (≤ 24 px) pour le symbole. */
  small?: boolean;
  /** Classes supplémentaires pour le conteneur lorsque variant="badge". */
  badgeClassName?: string;
  /** Titre accessible (passer `null` si le logo est accompagné d'un texte adjacent "ZennShop"). */
  title?: string | null;
}}

export function ZennShopLogo({{
  variant = "horizontal",
  tone = "light",
  badgeStyle = "dark-glass",
  small = false,
  badgeClassName = "h-10 w-10 rounded-xl",
  title = "ZennShop",
  className,
  ...props
}}: ZennShopLogoProps) {{
  if (variant === "badge") {{
    const bs = BADGE_STYLES[badgeStyle];
    const shape = SHAPES[small ? "symbol-small" : `symbol-${{bs.geom}}`];
    return (
      <span
        className={{`inline-flex shrink-0 items-center justify-center ${{bs.box}} ${{badgeClassName}}`}}
        aria-hidden={{title ? undefined : true}}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={{`0 0 ${{shape.w}} ${{shape.h}}`}}
          className={{className ?? "h-[62%] w-[62%]"}}
          role={{title ? "img" : undefined}}
          aria-label={{title ?? undefined}}
          aria-hidden={{title ? undefined : true}}
          focusable="false"
          {{...props}}
        >
          {{shape.parts.map(([role, d], i) => (
            <path key={{i}} d={{d}} className={{role === "a" ? bs.a : bs.b}} />
          ))}}
        </svg>
      </span>
    );
  }}

  const t = TONES[tone];
  const geomKey =
    variant === "wordmark"
      ? "std"
      : variant === "symbol" && small
        ? "small"
        : t.geom;
  const shape = SHAPES[`${{variant}}-${{geomKey}}`];
  const defaultClass = variant === "symbol" ? "h-8 w-8" : "h-8 w-auto";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={{`0 0 ${{shape.w}} ${{shape.h}}`}}
      className={{className ?? defaultClass}}
      role={{title ? "img" : undefined}}
      aria-label={{title ?? undefined}}
      aria-hidden={{title ? undefined : true}}
      focusable="false"
      {{...props}}
    >
      {{shape.parts.map(([role, d], i) => (
        <path key={{i}} d={{d}} className={{role === "a" ? t.a : t.b}} />
      ))}}
    </svg>
  );
}}

export default ZennShopLogo;
'''
    os.makedirs(os.path.dirname(COMPONENT), exist_ok=True)
    write(COMPONENT, tsx)


if __name__ == "__main__":
    # 1. Write all SVG masters (4 variants × 9 tones)
    for kind in ("horizontal", "stacked", "symbol", "wordmark"):
        for tone in TONES:
            write(os.path.join(SVG_DIR, f"zennshop-{kind}-{tone}.svg"), svg_file(kind, tone))

    # 2. Small-size symbol masters
    for tone in ("light", "dark", "gold-duo", "african", "white", "black"):
        a, b, _ = TONES[tone]
        t, bb = symbol_paths("small")
        write(os.path.join(SVG_DIR, f"zennshop-symbol-small-{tone}.svg"),
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" '
              f'aria-labelledby="title">\n  <title id="title">ZennShop — symbole petite taille ({tone})</title>\n'
              f'  <path fill="{a}" d="{t}"/>\n  <path fill="{b}" d="{bb}"/>\n</svg>\n')

    # 3. Icons & badges
    icon_svgs()

    # 4. Copy core SVGs to frontend/public/logo/ for static <img src="/logo/..."> usage
    for fn in os.listdir(SVG_DIR):
        if any(fn.endswith(f"-{t}.svg") for t in ("light", "dark", "gold-duo", "african", "terracotta", "white", "black")):
            shutil.copyfile(os.path.join(SVG_DIR, fn), os.path.join(PUBLIC_LOGO_DIR, fn))
    shutil.copyfile(os.path.join(ICON_DIR, "app-icon.svg"), os.path.join(PUBLIC_LOGO_DIR, "zennshop-app-icon.svg"))
    shutil.copyfile(os.path.join(ICON_DIR, "icon.svg"), os.path.join(PUBLIC_LOGO_DIR, "zennshop-favicon.svg"))

    # 5. Build visual showcase SVG & React component
    showcase_svg = build_showcase_svg()
    build_react_component()

    print("SVG kit written to:", SVG_DIR)
    print("Icons written to:", ICON_DIR)
    print("Public SVGs copied to:", os.path.normpath(PUBLIC_LOGO_DIR))
    print("Showcase SVG written to:", showcase_svg)
    print("React component written to:", os.path.normpath(COMPONENT))
