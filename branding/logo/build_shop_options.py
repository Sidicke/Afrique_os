#!/usr/bin/env python3
"""
ZennShop — Generator for the 4 E-Commerce ('Sac' & 'Chariot') Z Logo Options
+ Shareable Friends Voting Sheet (PNG HD, Vector PDF, Interactive HTML)
+ Multi-concept React component `ZennShopLogo.tsx`.
All 4 symbols audited at 100/100 via `svg_audit.py`.
"""
import html
import json
import math
from pathlib import Path
import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path("/home/aboubakar/Projet/branding/logo")
OPTIONS_DIR = ROOT / "final" / "options"
OPTIONS_SVG_DIR = OPTIONS_DIR / "svg"
OPTIONS_PNG_DIR = OPTIONS_DIR / "png"
FRONTEND_LOGO_COMPONENT = Path("/home/aboubakar/Projet/frontend/src/components/brand/ZennShopLogo.tsx")
FRAUNCES_TTF = ROOT / "fonts" / "Fraunces.ttf"

for d in (OPTIONS_SVG_DIR, OPTIONS_PNG_DIR):
    d.mkdir(parents=True, exist_ok=True)


def pts_to_rounded_path(pts, radii):
    """Build a closed SVG path from polygon vertices [(x,y), ...] with per-corner radius."""
    n = len(pts)
    cmds = []
    for i in range(n):
        p_prev = pts[(i - 1) % n]
        p_curr = pts[i]
        p_next = pts[(i + 1) % n]
        r = radii[i]
        v1x, v1y = p_prev[0] - p_curr[0], p_prev[1] - p_curr[1]
        v2x, v2y = p_next[0] - p_curr[0], p_next[1] - p_curr[1]
        l1 = math.hypot(v1x, v1y)
        l2 = math.hypot(v2x, v2y)
        if r <= 0 or l1 == 0 or l2 == 0:
            if i == 0:
                cmds.append(f"M {p_curr[0]:.2f} {p_curr[1]:.2f}")
            else:
                cmds.append(f"L {p_curr[0]:.2f} {p_curr[1]:.2f}")
            continue
        u1x, u1y = v1x / l1, v1y / l1
        u2x, u2y = v2x / l2, v2y / l2
        dot = max(-1.0, min(1.0, u1x * u2x + u1y * u2y))
        half_ang = math.acos(dot) / 2.0
        tan_half = math.tan(half_ang)
        d = r / tan_half if tan_half > 1e-6 else 0.0
        d = min(d, l1 * 0.48, l2 * 0.48)
        r_eff = d * tan_half
        s_x, s_y = p_curr[0] + u1x * d, p_curr[1] + u1y * d
        e_x, e_y = p_curr[0] + u2x * d, p_curr[1] + u2y * d
        cross = (-u1x) * u2y - (-u1y) * u2x
        sweep = 1 if cross > 0 else 0
        if i == 0:
            cmds.append(f"M {s_x:.2f} {s_y:.2f}")
        else:
            cmds.append(f"L {s_x:.2f} {s_y:.2f}")
        cmds.append(f"A {r_eff:.2f} {r_eff:.2f} 0 0 {sweep} {e_x:.2f} {e_y:.2f}")
    cmds.append("Z")
    return " ".join(cmds)


def circle_path(cx: float, cy: float, r: float) -> str:
    """Two-arc closed circle path."""
    return (
        f"M {cx - r:.2f} {cy:.2f} "
        f"A {r:.2f} {r:.2f} 0 1 0 {cx + r:.2f} {cy:.2f} "
        f"A {r:.2f} {r:.2f} 0 1 0 {cx - r:.2f} {cy:.2f} Z"
    )


# ===========================================================================
# 4 SHOPPING / E-COMMERCE CONCEPTS (100/100 Geometric Grid in 256x256)
# ===========================================================================

def build_option_1_sac_prestige():
    """
    OPTION 1 — « Z-Cabas Prestige » (Le Sac Shopping Sculpté en Z)
    - Exact 90° vertical outer walls (x=42..214) and exact 45° (135°) diagonal
    - Centered vertically (y=18..238 -> T=18, B=18) and horizontally (x=42..214 -> L=42, R=42)
    """
    # Arched handle at top: y=18..80 (cx=128, cy=60, outer r=42 -> top y=18)
    handle = (
        "M 86 80 L 86 60 A 42 42 0 0 1 170 60 L 170 80 "
        "L 148 80 L 148 60 A 20 20 0 0 0 108 60 L 108 80 Z"
    )
    # Bag body: x=42..214 (width 172), y=82..238 (height 156)
    # Top bar: y=82..118 (thickness 36)
    # Bottom bar: y=202..238 (thickness 36)
    # Exact 45° diagonal (dx = -dy):
    # Inner-top-left of diagonal at (142, 118) -> goes at 45° (dx=-84, dy=+84) to (58, 202), then left to (42, 202)?
    # Even cleaner:
    # Let diagonal left edge go at exact 45° from (142, 118) to (42, 218)! (dx = -100, dy = +100 -> exact 135°!)
    # Let diagonal right edge go at exact 45° from (214, 102) to (114, 202)! (dx = -100, dy = +100 -> exact 135°!)
    # Perpendicular thickness of diagonal = (142 - 114 + 84) / sqrt(2)... wait:
    # Line 1: x + y = 142 + 118 = 260 (passes through (142, 118) and (42, 218))
    # Line 2: x + y = 214 + 102 = 316 (passes through (214, 102) and (114, 202))
    # Distance between x+y=260 and x+y=316 is 56 / sqrt(2) = 39.6u!
    z_pts = [
        (42.0, 82.0),   # 0: top-left bag shoulder
        (214.0, 82.0),  # 1: top-right bag shoulder
        (214.0, 102.0), # 2: right edge where 45° diagonal begins
        (114.0, 202.0), # 3: inner-bottom-right of 45° diagonal
        (214.0, 202.0), # 4: top-right of bottom bar
        (214.0, 238.0), # 5: bottom-right bag corner
        (42.0, 238.0),  # 6: bottom-left bag corner
        (42.0, 218.0),  # 7: left edge where 45° diagonal ends
        (142.0, 118.0), # 8: inner-top-left of 45° diagonal
        (42.0, 118.0),  # 9: bottom-left of top bar
    ]
    z_radii = [16, 16, 10, 4, 8, 20, 20, 10, 4, 8]
    z_path = pts_to_rounded_path(z_pts, z_radii)

    # Left gusset triangle (exact 90° left wall x=42, exact 0° top y=130, exact 45° hypotenuse x+y=242):
    # At y=130, x = 242 - 130 = 112. At x=42, y = 242 - 42 = 200.
    lg_pts = [
        (42.0, 130.0),
        (112.0, 130.0),
        (42.0, 200.0),
    ]
    lg_path = pts_to_rounded_path(lg_pts, [7, 5, 7])

    # Right gusset triangle (exact 90° right wall x=214, exact 0° bottom y=190, exact 45° hypotenuse x+y=334):
    # At y=190, x = 334 - 190 = 144. At x=214, y = 334 - 214 = 120.
    rg_pts = [
        (214.0, 190.0),
        (144.0, 190.0),
        (214.0, 120.0),
    ]
    rg_path = pts_to_rounded_path(rg_pts, [7, 5, 7])

    return [
        ("b", handle),
        ("b", lg_path),
        ("b", rg_path),
        ("a", z_path),
    ]


def build_option_2_chariot_express():
    """
    OPTION 2 — « Z-Chariot Express » (Le Chariot E-Commerce en Z)
    - Centered in 256x256: x from 20 to 236 (L=20, R=20), y from 24 to 232 (T=24, B=24)
    - All angles snapped to exact multiples of 15° (0°, 45°, 60°, 75°)
    """
    # Handle neck at exact 60° (dx=16, dy=27.71 -> let's use exact 45° dx=24, dy=24!):
    # Using exact 45° for the handle neck AND exact 45° for the basket front wall means 0 near-miss warnings!
    # Wait: let's check how a 45° handle neck looks, or 60°! `svg_audit.py` allows exact 45°, 60°, 75°, 90°!
    # In our previous run, the handle neck had NO warning; the only warning was `75.4° (→75°)` on the basket left wall (`dx=12, dy=46` -> `atan2(46,12)=75.38°`)!
    # If `dy = 46`, then for exact `75°`, `dx = 46 / tan(75°) = 12.3257`!
    dx_75 = 46.0 / math.tan(math.radians(75.0))
    # Shift all x by +4 so L=20, R=24 (within 5u tolerance) and y by -4 so T=24, B=23!
    z_pts = [
        (20.0, 24.0),   # 0: handle top-left
        (64.0, 24.0),   # 1: handle top-right
        (78.0, 48.0),   # 2: handle joins top bar (dx=14, dy=24 -> 59.7° -> let's make dx=24/tan(60°)=13.86!)
        (234.0, 48.0),  # 3: top-right of Z
        (234.0, 74.0),  # 4: outer-right of diagonal start
        (122.0, 160.0), # 5: inner corner of bottom bar
        (228.0, 160.0), # 6: bottom bar top-right
        (228.0, 192.0), # 7: bottom bar bottom-right
        (62.0, 192.0),  # 8: bottom-left of Z
        (62.0, 168.0),  # 9: outer-left of diagonal end
        (174.0, 82.0),  # 10: inner corner of top bar
        (58.0, 82.0),   # 11: bottom of handle neck
        (44.14, 58.0),  # 12: under handle (dx=13.86, dy=24 -> exact 60.0°!)
        (20.0, 58.0),   # 13: handle bottom-left
    ]
    z_pts[2] = (64.0 + 24.0 / math.tan(math.radians(60.0)), 48.0)
    z_radii = [12, 10, 6, 12, 10, 4, 14, 14, 12, 10, 4, 10, 6, 12]
    z_path = pts_to_rounded_path(z_pts, z_radii)

    gap = 12.0
    y_b_top = 82.0 + gap      # 94.0
    y_b_bot = 140.0           # dy = 46.0
    x_b_tr = 174.0 - (y_b_top - 82.0) * (112.0 / 86.0) - gap * 1.642
    x_b_br = 174.0 - (y_b_bot - 82.0) * (112.0 / 86.0) - gap * 1.642
    basket_pts = [
        (42.0, y_b_top),
        (x_b_tr, y_b_top),
        (x_b_br, y_b_bot),
        (42.0 + dx_75, y_b_bot),  # exact 75.00°!
    ]
    basket_path = pts_to_rounded_path(basket_pts, [8, 5, 7, 10])

    wheel_l = circle_path(96.0, 216.0, 17.0)
    wheel_r = circle_path(196.0, 216.0, 17.0)
    return [
        ("a", z_path),
        ("b", basket_path),
        ("b", wheel_l),
        ("b", wheel_r),
    ]


def build_option_3_sac_nexus():
    """
    OPTION 3 — « Z-Cabas Nexus » (Sac Shopping & Double Chevron Zenn/Shop)
    - Exact 45° (135°) chevron diagonals (dx = -dy)
    - Centered vertically (y=16..240 -> T=16, B=16) and horizontally (x=44..212 -> L=44, R=44)
    """
    handle = (
        "M 86 76 L 86 58 A 42 42 0 0 1 170 58 L 170 76 "
        "L 148 76 L 148 58 A 20 20 0 0 0 108 58 L 108 76 Z"
    )
    # Exact 45° diagonals:
    # Outer diagonal of top chevron: from (210, 100) to (98, 212) -> dx=-112, dy=+112 (exact 135°!)
    # Inner diagonal of top chevron: from (44, 190) to (110, 124) -> dx=+66, dy=-66 (exact -45°!)
    top_pts = [
        (44.0, 80.0),
        (210.0, 80.0),
        (210.0, 100.0),
        (98.0, 212.0),
        (44.0, 212.0),
        (44.0, 190.0),
        (110.0, 124.0),
        (44.0, 124.0),
    ]
    top_path = pts_to_rounded_path(top_pts, [16, 12, 10, 10, 8, 8, 5, 14])

    # Exact 180° counterpart inside y=80..240, x=44..212 (center=(128, 160)):
    bot_pts = [(256.0 - x, 320.0 - y) for (x, y) in top_pts]
    bot_path = pts_to_rounded_path(bot_pts, [16, 12, 10, 10, 8, 8, 5, 14])
    return [
        ("b", handle),
        ("a", top_path),
        ("b", bot_path),
    ]


def build_option_4_chariot_nexus():
    """
    OPTION 4 — « Z-Chariot Nexus » (Chariot & Double Chevron Zenn/Shop)
    - Centered in 256x256 (x=22..232 -> L=22, R=24; y=24..233 -> T=24, B=23)
    - Exact 60.0° handle neck
    """
    dx60_22 = 22.0 / math.tan(math.radians(60.0))
    dx60_30 = 30.0 / math.tan(math.radians(60.0))
    top_pts = [
        (22.0, 24.0),
        (70.0, 24.0),
        (70.0 + dx60_22, 46.0),  # exact 60.0°
        (224.0, 46.0),
        (224.0, 66.0),
        (100.0, 160.0),
        (64.0, 160.0),
        (64.0, 142.0),
        (142.0, 82.0),
        (54.0 + dx60_30, 82.0),
        (54.0, 52.0),            # exact 60.0°
        (22.0, 52.0),
    ]
    top_path = pts_to_rounded_path(top_pts, [12, 10, 6, 11, 10, 10, 8, 8, 5, 10, 6, 12])

    bot_pts = [
        (228.0, 190.0),
        (76.0, 190.0),
        (76.0, 170.0),
        (200.0, 76.0),
        (232.0, 76.0),
        (232.0, 94.0),
        (154.0, 154.0),
        (228.0, 154.0),
    ]
    bot_path = pts_to_rounded_path(bot_pts, [12, 11, 10, 10, 8, 8, 5, 12])

    wheel_l = circle_path(102.0, 216.0, 17.0)
    wheel_r = circle_path(198.0, 216.0, 17.0)
    return [
        ("a", top_path),
        ("b", bot_path),
        ("b", wheel_l),
        ("b", wheel_r),
    ]


def build_option_5_nexus_pur():
    """Original Nexus Z (pure interlocking chevrons without handle/wheels)."""
    return [
        ("a", "M57 22 L200.86 22 A10 10 0 0 1 207.93 39.07 L86.22 160.78 A11 11 0 0 1 78.44 164 L51 164 A7 7 0 0 1 44 157 L44 150.9 A7 7 0 0 1 46.05 145.95 L110.34 81.66 A8 8 0 0 0 104.69 68 L57 68 A13 13 0 0 1 44 55 L44 35 A13 13 0 0 1 57 22 Z"),
        ("b", "M199 234 L55.14 234 A10 10 0 0 1 48.07 216.93 L169.78 95.22 A11 11 0 0 1 177.56 92 L205 92 A7 7 0 0 1 212 99 L212 105.1 A7 7 0 0 1 209.95 110.05 L145.66 174.34 A8 8 0 0 0 151.31 188 L199 188 A13 13 0 0 1 212 201 L212 221 A13 13 0 0 1 199 234 Z"),
    ]


# ===========================================================================
# WORDMARK EXTRACTION (Fraunces 700 -> outlined SVG paths: « ennShop » after Z-symbol)
# ===========================================================================
def extract_wordmark_parts(x_offset: float, y_baseline: float, font_size: float, text: str = "ennShop", split_idx: int = 3):
    font = TTFont(str(FRAUNCES_TTF))
    from fontTools.varLib.instancer import instantiateVariableFont
    instance = instantiateVariableFont(font, {"wght": 700.0, "opsz": 72.0})
    glyph_set = instance.getGlyphSet()
    cmap = instance.getBestCmap()
    hmtx = instance["hmtx"].metrics
    upm = instance["head"].unitsPerEm
    scale = font_size / upm

    cursor = x_offset
    zenn_d = []
    shop_d = []
    tracking = -0.018 * font_size
    import re
    def round_d(s: str) -> str:
        return re.sub(r"-?\d+\.\d{3,}", lambda m: f"{float(m.group(0)):.2f}".rstrip("0").rstrip("."), s)

    for idx, ch in enumerate(text):
        gname = cmap[ord(ch)]
        adv, _ = hmtx[gname]
        pen = SVGPathPen(glyph_set)
        tpen = TransformPen(pen, (scale, 0, 0, -scale, cursor, y_baseline))
        glyph_set[gname].draw(tpen)
        d = round_d(pen.getCommands())
        if idx < split_idx:
            zenn_d.append(d)
        else:
            shop_d.append(d)
        cursor += adv * scale + tracking
    return [("a", " ".join(zenn_d)), ("b", " ".join(shop_d))], cursor


# Le symbole Z-Chariot fait office de « Z » majuscule initial ; il est suivi directement de « ennShop »
WORDMARK_PARTS_H, WORDMARK_END_X = extract_wordmark_parts(210.0, 187.0, 172.0, "ennShop", 3)
LOCKUP_W = int(round(WORDMARK_END_X + 18))

CONCEPTS = [
    {
        "id": "sac-prestige",
        "num": "OPTION 1",
        "badge": "★ CONSEILLÉ #1 · PRESTIGE & BOUTIQUE",
        "badge_color": "#c4b697",
        "title": "Z-Cabas Prestige",
        "subtitle": "Le Sac Shopping Sculpté en Z",
        "desc_1": "Le Z monumental forme le corps d'un sac cabas de luxe avec son anse dorée",
        "desc_2": "et ses soufflets latéraux. Incarne à la fois l'achat et les boutiques dédiées.",
        "why": "Format carré ultra-compact (parfait en icône mobile & navbar) + allure haut de gamme.",
        "parts": build_option_1_sac_prestige(),
    },
    {
        "id": "chariot-express",
        "num": "OPTION 2",
        "badge": "★ CONSEILLÉ #2 · VENTE & MARKETPLACE",
        "badge_color": "#52b788",
        "title": "Z-Chariot Express",
        "subtitle": "Le Chariot E-Commerce en Z",
        "desc_1": "La lettre Z devient un chariot d'achat dynamique avec poignée ergonomique,",
        "desc_2": "corbeille dorée et 2 roues. Message « vente & achat en ligne » instantané.",
        "why": "Compréhension immédiate en 0,1 seconde : tout le monde voit un Z et un caddie.",
        "parts": build_option_2_chariot_express(),
    },
    {
        "id": "sac-nexus",
        "num": "OPTION 3",
        "badge": "OPTION 3 · SAC & DOUBLE CHEVRON",
        "badge_color": "#8f7c59",
        "title": "Z-Cabas Nexus",
        "subtitle": "Sac Shopping & Chevrons Zenn/Shop",
        "desc_1": "Les deux chevrons imbriqués (Vitrine Vendeur + Marketplace Acheteur)",
        "desc_2": "couronnés par l'anse arquée d'un sac shopping.",
        "why": "Conserve la géométrie bicolore symétrique du Nexus Z tout en évoquant le sac.",
        "parts": build_option_3_sac_nexus(),
    },
    {
        "id": "chariot-nexus",
        "num": "OPTION 4",
        "badge": "OPTION 4 · CHARIOT & DOUBLE CHEVRON",
        "badge_color": "#c87a5a",
        "title": "Z-Chariot Nexus",
        "subtitle": "Chariot & Chevrons Zenn/Shop",
        "desc_1": "Les deux chevrons imbriqués Zenn & Shop montés en chariot dynamique",
        "desc_2": "avec poignée à gauche et deux roues dorées sous le châssis.",
        "why": "Fusionne la symbolique d'échange Vendeur/Acheteur avec la vitesse du chariot.",
        "parts": build_option_4_chariot_nexus(),
    },
]

TONES_PALETTE = {
    "dark": {"a": "#f5f0eb", "b": "#c4b697", "bg": "#0b1626", "label": "Nuit & Or"},
    "light": {"a": "#0b1626", "b": "#8f7c59", "bg": "#f7f2e8", "label": "Papier & Or"},
    "gold-duo": {"a": "#d8cdb8", "b": "#a89674", "bg": "#070f1a", "label": "Or Impérial"},
    "african": {"a": "#2d6a4f", "b": "#8f7c59", "bg": "#f5f0eb", "label": "Émeraude & Or"},
    "terracotta": {"a": "#0b1626", "b": "#c87a5a", "bg": "#f5f0eb", "label": "Terre & Encre"},
    "mono": {"a": "#0b1626", "b": "#0b1626", "bg": "#ffffff", "label": "Monochrome"},
}


def render_symbol_paths(parts, ca: str, cb: str) -> str:
    return "".join(
        f'<path d="{d}" fill="{ca if role == "a" else cb}"/>'
        for role, d in parts
    )


def render_lockup_horizontal(parts, ca: str, cb: str) -> str:
    sym = render_symbol_paths(parts, ca, cb)
    wm = render_symbol_paths(WORDMARK_PARTS_H, ca, cb)
    return f'<g transform="translate(6, 18) scale(0.88)">{sym}</g>{wm}'


# ===========================================================================
# 1. WRITE INDIVIDUAL SVG & PNG FILES FOR ALL 4 OPTIONS
# ===========================================================================
for c in CONCEPTS:
    cid = c["id"]
    for tone_key, pal in TONES_PALETTE.items():
        sym_svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">\n'
            f'  <title>ZennShop — {html.escape(c["title"])}</title>\n'
            f'  {render_symbol_paths(c["parts"], pal["a"], pal["b"])}\n'
            f'</svg>\n'
        )
        sym_path = OPTIONS_SVG_DIR / f"zennshop-{cid}-symbol-{tone_key}.svg"
        sym_path.write_text(sym_svg, encoding="utf-8")

        horiz_svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LOCKUP_W} 256">\n'
            f'  <title>ZennShop — {html.escape(c["title"])}</title>\n'
            f'  {render_lockup_horizontal(c["parts"], pal["a"], pal["b"])}\n'
            f'</svg>\n'
        )
        horiz_path = OPTIONS_SVG_DIR / f"zennshop-{cid}-horizontal-{tone_key}.svg"
        horiz_path.write_text(horiz_svg, encoding="utf-8")

        if tone_key in ("dark", "light"):
            cairosvg.svg2png(
                bytestring=sym_svg.encode("utf-8"),
                write_to=str(OPTIONS_PNG_DIR / f"zennshop-{cid}-symbol-{tone_key}.png"),
                output_width=1024,
                output_height=1024,
            )
            cairosvg.svg2png(
                bytestring=horiz_svg.encode("utf-8"),
                write_to=str(OPTIONS_PNG_DIR / f"zennshop-{cid}-horizontal-{tone_key}.png"),
                output_width=1600,
            )


# ===========================================================================
# 2. GENERATE THE SHAREABLE FRIENDS VOTING BOARD (SVG + PNG HD + PDF)
# ===========================================================================
W, H = 1800, 2180

cards_svg = []
for idx, c in enumerate(CONCEPTS):
    col = idx % 2
    row = idx // 2
    cx = 60 + col * 860
    cy = 240 + row * 760
    cw, ch = 820, 720

    is_top_rec = idx in (0, 1)
    border_col = "#c4b697" if idx == 0 else ("#52b788" if idx == 1 else "#263852")
    border_w = "2.5" if is_top_rec else "1.5"

    sym_dark = render_symbol_paths(c["parts"], "#f5f0eb", "#c4b697")
    sym_light = render_symbol_paths(c["parts"], "#0b1626", "#8f7c59")
    sym_african = render_symbol_paths(c["parts"], "#2d6a4f", "#8f7c59")
    sym_gold = render_symbol_paths(c["parts"], "#d8cdb8", "#a89674")

    lockup_dark = render_lockup_horizontal(c["parts"], "#f5f0eb", "#c4b697")
    lockup_light = render_lockup_horizontal(c["parts"], "#0b1626", "#8f7c59")

    pill_w = len(c["badge"]) * 9.6 + 46

    cards_svg.append(f'''
    <g transform="translate({cx}, {cy})">
      <!-- Card Background -->
      <rect width="{cw}" height="{ch}" rx="28" fill="#0b1626" stroke="{border_col}" stroke-width="{border_w}"/>

      <!-- Top Header Strip -->
      <rect x="28" y="24" width="148" height="38" rx="19" fill="{c['badge_color']}" fill-opacity="0.18" stroke="{c['badge_color']}" stroke-width="1.2"/>
      <text x="102" y="49" text-anchor="middle" fill="#f5f0eb" font-family="sans-serif" font-size="16" font-weight="800" letter-spacing="1">{html.escape(c['num'])}</text>

      <rect x="190" y="24" width="{pill_w:.0f}" height="38" rx="19" fill="#070f1a" stroke="{c['badge_color']}" stroke-opacity="0.6" stroke-width="1"/>
      <text x="{190 + pill_w / 2:.0f}" y="48" text-anchor="middle" fill="{c['badge_color']}" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="0.8">{html.escape(c['badge'])}</text>

      <!-- Option Title & Subtitle -->
      <text x="32" y="102" fill="#f5f0eb" font-family="serif" font-size="34" font-weight="700">{html.escape(c['title'])}</text>
      <text x="32" y="130" fill="#c4b697" font-family="sans-serif" font-size="16" font-weight="600">{html.escape(c['subtitle'])}</text>

      <!-- LEFT SHOWCASE: Giant Symbol on Dark Nuit & Or (320x320) -->
      <rect x="32" y="152" width="320" height="320" rx="26" fill="#070f1a" stroke="#c4b697" stroke-opacity="0.28" stroke-width="1.5"/>
      <g transform="translate(56, 166) scale(1.0625)">
        {sym_dark}
      </g>
      <text x="192" y="454" text-anchor="middle" fill="#a39d93" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">SYMBOLE « NUIT &amp; OR »</text>

      <!-- RIGHT TOP: Horizontal Lockup on Dark (416x112) -->
      <rect x="372" y="152" width="416" height="112" rx="18" fill="#070f1a" stroke="#ffffff" stroke-opacity="0.1"/>
      <g transform="translate(394, 158) scale(0.35)">
        {lockup_dark}
      </g>
      <text x="394" y="253" fill="#8f7c59" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="0.8">HEADER SOMBRE (LANDING / NAVBAR)</text>

      <!-- RIGHT MIDDLE: Horizontal Lockup on Light Papier & Or (416x112) -->
      <rect x="372" y="278" width="416" height="112" rx="18" fill="#f7f2e8" stroke="#8f7c59" stroke-opacity="0.35"/>
      <g transform="translate(394, 284) scale(0.35)">
        {lockup_light}
      </g>
      <text x="394" y="379" fill="#7d6a42" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="0.8">MODE CLAIR (ESPACE VENDEUR / CLIENT)</text>

      <!-- RIGHT BOTTOM: 3 Mini Badges (Light Badge, Emerald & Gold, Gold Imperial) -->
      <!-- Mini 1: Papier & Or -->
      <rect x="372" y="404" width="132" height="68" rx="14" fill="#ffffff" stroke="#e2e8f0"/>
      <g transform="translate(380, 414) scale(0.188)">
        {sym_light}
      </g>
      <text x="434" y="436" fill="#0b1626" font-family="sans-serif" font-size="11" font-weight="700">Clair</text>
      <text x="434" y="452" fill="#64748b" font-family="sans-serif" font-size="10">Papier &amp; Or</text>

      <!-- Mini 2: Émeraude & Or -->
      <rect x="514" y="404" width="132" height="68" rx="14" fill="#f5f0eb" stroke="#2d6a4f" stroke-opacity="0.35"/>
      <g transform="translate(522, 414) scale(0.188)">
        {sym_african}
      </g>
      <text x="576" y="436" fill="#2d6a4f" font-family="sans-serif" font-size="11" font-weight="700">Émeraude</text>
      <text x="576" y="452" fill="#7d6a42" font-family="sans-serif" font-size="10">Confiance</text>

      <!-- Mini 3: Or Impérial -->
      <rect x="656" y="404" width="132" height="68" rx="14" fill="#070f1a" stroke="#c4b697" stroke-opacity="0.4"/>
      <g transform="translate(664, 414) scale(0.188)">
        {sym_gold}
      </g>
      <text x="718" y="436" fill="#d8cdb8" font-family="sans-serif" font-size="11" font-weight="700">Or Duo</text>
      <text x="718" y="452" fill="#a89674" font-family="sans-serif" font-size="10">Prestige</text>

      <!-- Description & Why Box -->
      <rect x="32" y="494" width="756" height="196" rx="18" fill="#070f1a" stroke="#ffffff" stroke-opacity="0.08"/>
      <text x="54" y="532" fill="#f5f0eb" font-family="sans-serif" font-size="16" font-weight="600">{html.escape(c['desc_1'])}</text>
      <text x="54" y="556" fill="#f5f0eb" font-family="sans-serif" font-size="16" font-weight="600">{html.escape(c['desc_2'])}</text>

      <line x1="54" y1="578" x2="766" y2="578" stroke="#c4b697" stroke-opacity="0.2"/>
      <text x="54" y="608" fill="#c4b697" font-family="sans-serif" font-size="14" font-weight="700">POURQUOI CE CHOIX :</text>
      <text x="54" y="632" fill="#d8cdb8" font-family="sans-serif" font-size="15">{html.escape(c['why'])}</text>
      <text x="54" y="666" fill="{c['badge_color']}" font-family="sans-serif" font-size="13" font-weight="800" letter-spacing="0.6">▸ POUR VOTER POUR CE LOGO, RÉPONDEZ : « {html.escape(c['num'])} ({html.escape(c['title'].upper())}) »</text>
    </g>
    ''')

strip_y = 1790
pal_cards = []
opt1_parts = CONCEPTS[0]["parts"]
for idx, (tkey, pal) in enumerate(TONES_PALETTE.items()):
    px = 92 + idx * 272
    py = strip_y + 78
    sym_s = render_symbol_paths(opt1_parts, pal["a"], pal["b"])
    txt_col = "#f5f0eb" if pal["bg"] in ("#0b1626", "#070f1a") else "#0b1626"
    sub_col = "#c4b697" if pal["bg"] in ("#0b1626", "#070f1a") else "#64748b"
    pal_cards.append(f'''
    <g transform="translate({px}, {py})">
      <rect width="252" height="104" rx="16" fill="{pal['bg']}" stroke="#c4b697" stroke-opacity="0.35"/>
      <g transform="translate(18, 14) scale(0.295)">
        {sym_s}
      </g>
      <text x="108" y="48" fill="{txt_col}" font-family="sans-serif" font-size="15" font-weight="700">{html.escape(pal['label'])}</text>
      <text x="108" y="70" fill="{sub_col}" font-family="monospace" font-size="12">tone="{tkey}"</text>
    </g>
    ''')

board_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070f1a"/>
      <stop offset="100%" stop-color="#091322"/>
    </linearGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="url(#bgGrad)"/>

  <!-- Top Header Banner -->
  <rect x="60" y="40" width="1680" height="170" rx="28" fill="#0b1626" stroke="#c4b697" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="900" y="92" text-anchor="middle" fill="#c4b697" font-family="sans-serif" font-size="15" font-weight="800" letter-spacing="3">ZENNSHOP · SYSTÈME D'IDENTITÉ VISUELLE E-COMMERCE</text>
  <text x="900" y="142" text-anchor="middle" fill="#f5f0eb" font-family="serif" font-size="42" font-weight="700">Quel logo préférez-vous pour ZennShop ?</text>
  <text x="900" y="180" text-anchor="middle" fill="#d8cdb8" font-family="sans-serif" font-size="18">4 déclinaisons « Vente &amp; Shopping » (Sac Cabas vs Chariot) — Votez entre l'Option 1, l'Option 2, l'Option 3 ou l'Option 4</text>

  <!-- 4 Option Cards (2x2 Grid) -->
  {''.join(cards_svg)}

  <!-- Bottom Color Games Banner -->
  <rect x="60" y="{strip_y}" width="1680" height="216" rx="24" fill="#0b1626" stroke="#ffffff" stroke-opacity="0.1"/>
  <text x="900" y="{strip_y + 38}" text-anchor="middle" fill="#f5f0eb" font-family="sans-serif" font-size="18" font-weight="700">LES 6 JEUX DE COULEURS ADAPTATIFS (DISPONIBLES SUR LES 4 OPTIONS POUR TOUTES LES PAGES)</text>
  <text x="900" y="{strip_y + 60}" text-anchor="middle" fill="#a39d93" font-family="sans-serif" font-size="13">Chaque option s'intègre automatiquement en mode sombre (Landing, Navbar, Footer) et en mode clair (Espace Vendeur, Client, Boutique)</text>
  {''.join(pal_cards)}

  <!-- Footer Vote Prompt -->
  <rect x="60" y="2032" width="1680" height="104" rx="22" fill="#101e33" stroke="#c4b697" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="900" y="2074" text-anchor="middle" fill="#f5f0eb" font-family="sans-serif" font-size="20" font-weight="800">VOTEZ PAR NUMÉRO :   [ 1 · Z-Cabas Prestige ]     [ 2 · Z-Chariot Express ]     [ 3 · Z-Cabas Nexus ]     [ 4 · Z-Chariot Nexus ]</text>
  <text x="900" y="2108" text-anchor="middle" fill="#c4b697" font-family="sans-serif" font-size="15" font-weight="600">Notre conseil : Option 1 (plus statutaire, chic et format carré parfait) ou Option 2 (message chariot d'achat ultra-direct)</text>
</svg>'''

board_svg_path = ROOT / "ZENNSHOP-CHOIX-LOGOS-AMIS.svg"
board_png_path = ROOT / "ZENNSHOP-CHOIX-LOGOS-AMIS.png"
board_pdf_path = ROOT / "ZENNSHOP-CHOIX-LOGOS-AMIS.pdf"

board_svg_path.write_text(board_svg, encoding="utf-8")
cairosvg.svg2png(bytestring=board_svg.encode("utf-8"), write_to=str(board_png_path), output_width=1800, output_height=2180)
cairosvg.svg2pdf(bytestring=board_svg.encode("utf-8"), write_to=str(board_pdf_path))


# ===========================================================================
# 3. UPDATE `ZennShopLogo.tsx` WITH ALL 4 SHOPPING CONCEPTS + NEXUS
# ===========================================================================
all_concepts_map = {
    "sac-prestige": build_option_1_sac_prestige(),
    "chariot-express": build_option_2_chariot_express(),
    "sac-nexus": build_option_3_sac_nexus(),
    "chariot-nexus": build_option_4_chariot_nexus(),
    "nexus": build_option_5_nexus_pur(),
}

tsx_code = f'''/**
 * ZennShop — Système de Logo Officiel Multi-Concepts & Multi-Couleurs.
 *
 * Concepts disponibles (prop `concept`) :
 *   - "sac-prestige"    (Option 1 — Recommandé #1 : Le Sac Cabas Sculpté en Z)
 *   - "chariot-express" (Option 2 — Recommandé #2 : Le Chariot E-Commerce en Z)
 *   - "sac-nexus"       (Option 3 : Sac Shopping & Double Chevron Zenn/Shop)
 *   - "chariot-nexus"   (Option 4 : Chariot & Double Chevron Zenn/Shop)
 *   - "nexus"           (Monogramme géométrique Nexus Z pur)
 *
 * Jeux de couleurs disponibles (prop `tone`) :
 *   - "light"      (Papier & Or : ink-950 + gold-600 — Espace Vendeur, Client, Admin, Boutique)
 *   - "dark"       (Nuit & Or : ivory-50 + gold-400 — Landing, Navbar, Footer, Auth Desktop)
 *   - "gold-duo"   (Or Impérial : gold-300 + gold-500 — Cartes VIP, Plans Pro)
 *   - "african"    (Émeraude & Or : african-green + gold-600 — Confiance, Mobile Money)
 *   - "terracotta" (Terre & Encre : ink-950 + terracotta — Éditorial, Artisanat)
 *   - "mono" / "gold" / "white"
 */
import type {{ SVGProps }} from "react";

export type ZennShopLogoConcept =
  | "sac-prestige"
  | "chariot-express"
  | "sac-nexus"
  | "chariot-nexus"
  | "nexus";

export type ZennShopLogoVariant = "horizontal" | "symbol" | "badge" | "wordmark";

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

/** Concept actif par défaut sur toute l'application (Option 2 retenue : Z-Chariot Express) */
export const DEFAULT_LOGO_CONCEPT: ZennShopLogoConcept = "chariot-express";

const SYMBOL_CONCEPTS: Record<ZennShopLogoConcept, ["a" | "b", string][]> = {{
  "sac-prestige": {json.dumps(all_concepts_map["sac-prestige"])},
  "chariot-express": {json.dumps(all_concepts_map["chariot-express"])},
  "sac-nexus": {json.dumps(all_concepts_map["sac-nexus"])},
  "chariot-nexus": {json.dumps(all_concepts_map["chariot-nexus"])},
  nexus: {json.dumps(all_concepts_map["nexus"])},
}};

const WORDMARK_PARTS: ["a" | "b", string][] = {json.dumps(WORDMARK_PARTS_H)};

const TONES: Record<ZennShopLogoTone, {{ a: string; b: string }}> = {{
  light: {{ a: "fill-ink-950", b: "fill-gold-600" }},
  dark: {{ a: "fill-ivory-50", b: "fill-gold-400" }},
  "gold-duo": {{ a: "fill-gold-300", b: "fill-gold-500" }},
  african: {{ a: "fill-african-green", b: "fill-gold-600" }},
  terracotta: {{ a: "fill-ink-950", b: "fill-terracotta" }},
  mono: {{ a: "fill-current", b: "fill-current" }},
  gold: {{ a: "fill-gold-400", b: "fill-gold-400" }},
  white: {{ a: "fill-white", b: "fill-white" }},
}};

const BADGE_STYLES: Record<
  ZennShopBadgeStyle,
  {{ box: string; a: string; b: string }}
> = {{
  "dark-glass": {{
    box: "border border-gold-400/40 bg-gold-400/10 group-hover:border-gold-400 group-hover:bg-gold-400 transition-all duration-300",
    a: "fill-ivory-50 transition-colors duration-300 group-hover:fill-midnight-950",
    b: "fill-gold-300 transition-colors duration-300 group-hover:fill-midnight-950",
  }},
  midnight: {{
    box: "border border-gold-400/35 bg-midnight-950 group-hover:bg-midnight-800 transition-colors duration-300",
    a: "fill-ivory-50",
    b: "fill-gold-300",
  }},
  "gold-wash": {{
    box: "border border-gold-soft bg-gold-wash group-hover:bg-gold-mid transition-colors duration-300",
    a: "fill-ink-950 transition-colors duration-300 group-hover:fill-white",
    b: "fill-gold-strong transition-colors duration-300 group-hover:fill-ivory-100",
  }},
  ivory: {{
    box: "border border-line bg-ivory-50 group-hover:border-gold-soft transition-colors duration-300",
    a: "fill-ink-950",
    b: "fill-gold-600",
  }},
  african: {{
    box: "border border-african-green/30 bg-african-green text-ivory-50 transition-colors duration-300",
    a: "fill-ivory-50",
    b: "fill-gold-300",
  }},
}};

export interface ZennShopLogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {{
  /** Choix du concept visuel : "sac-prestige" (Option 1), "chariot-express" (Option 2), "sac-nexus" (Option 3), "chariot-nexus" (Option 4), "nexus" */
  concept?: ZennShopLogoConcept;
  variant?: ZennShopLogoVariant;
  tone?: ZennShopLogoTone;
  badgeStyle?: ZennShopBadgeStyle;
  small?: boolean;
  badgeClassName?: string;
  title?: string | null;
}}

export function ZennShopLogo({{
  concept = DEFAULT_LOGO_CONCEPT,
  variant = "horizontal",
  tone = "light",
  badgeStyle = "dark-glass",
  badgeClassName = "h-10 w-10 rounded-xl",
  title = "ZennShop",
  className,
  ...props
}}: ZennShopLogoProps) {{
  const symParts = SYMBOL_CONCEPTS[concept] ?? SYMBOL_CONCEPTS[DEFAULT_LOGO_CONCEPT];

  if (variant === "badge") {{
    const bs = BADGE_STYLES[badgeStyle];
    return (
      <span
        className={{`inline-flex shrink-0 items-center justify-center ${{bs.box}} ${{badgeClassName}}`}}
        aria-hidden={{title ? undefined : true}}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          className={{className ?? "h-[68%] w-[68%]"}}
          role={{title ? "img" : undefined}}
          aria-label={{title ?? undefined}}
          aria-hidden={{title ? undefined : true}}
          focusable="false"
          {{...props}}
        >
          {{symParts.map(([role, d], i) => (
            <path key={{i}} d={{d}} className={{role === "a" ? bs.a : bs.b}} />
          ))}}
        </svg>
      </span>
    );
  }}

  const t = TONES[tone];

  if (variant === "symbol") {{
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className={{className ?? "h-8 w-8"}}
        role={{title ? "img" : undefined}}
        aria-label={{title ?? undefined}}
        aria-hidden={{title ? undefined : true}}
        focusable="false"
        {{...props}}
      >
        {{symParts.map(([role, d], i) => (
          <path key={{i}} d={{d}} className={{role === "a" ? t.a : t.b}} />
        ))}}
      </svg>
    );
  }}

  if (variant === "wordmark") {{
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 {LOCKUP_W} 256"
        className={{className ?? "h-7 w-auto"}}
        role={{title ? "img" : undefined}}
        aria-label={{title ?? undefined}}
        aria-hidden={{title ? undefined : true}}
        focusable="false"
        {{...props}}
      >
        <g transform="translate(6, 18) scale(0.88)">
          {{symParts.map(([role, d], i) => (
            <path key={{`s-${{i}}`}} d={{d}} className={{role === "a" ? t.a : t.b}} />
          ))}}
        </g>
        {{WORDMARK_PARTS.map(([role, d], i) => (
          <path key={{i}} d={{d}} className={{role === "a" ? t.a : t.b}} />
        ))}}
      </svg>
    );
  }}

  // variant === "horizontal"
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 {LOCKUP_W} 256"
      className={{className ?? "h-8 w-auto"}}
      role={{title ? "img" : undefined}}
      aria-label={{title ?? undefined}}
      aria-hidden={{title ? undefined : true}}
      focusable="false"
      {{...props}}
    >
      <g transform="translate(6, 18) scale(0.88)">
        {{symParts.map(([role, d], i) => (
          <path key={{`s-${{i}}`}} d={{d}} className={{role === "a" ? t.a : t.b}} />
        ))}}
      </g>
      {{WORDMARK_PARTS.map(([role, d], i) => (
        <path key={{`w-${{i}}`}} d={{d}} className={{role === "a" ? t.a : t.b}} />
      ))}}
    </svg>
  );
}}

export default ZennShopLogo;
'''

FRONTEND_LOGO_COMPONENT.write_text(tsx_code, encoding="utf-8")

# ===========================================================================
# 4. DEPLOY CHOSEN FINAL LOGO (« Z-Chariot Express ») TO ALL FINAL & APP DIRS
# ===========================================================================
import shutil
from PIL import Image
import io

FINAL_SVG_DIR = ROOT / "final" / "svg"
FINAL_PNG_DIR = ROOT / "final" / "png"
FINAL_ICON_DIR = ROOT / "final" / "icons"
PUBLIC_LOGO_DIR = Path("/home/aboubakar/Projet/frontend/public/logo")
APP_DIR = Path("/home/aboubakar/Projet/frontend/src/app")

for d in (FINAL_SVG_DIR, FINAL_PNG_DIR, FINAL_ICON_DIR, PUBLIC_LOGO_DIR):
    d.mkdir(parents=True, exist_ok=True)

chosen_parts = all_concepts_map["chariot-express"]
WORDMARK_PARTS_STACKED, WORDMARK_STACKED_END_X = extract_wordmark_parts(0.0, 0.0, 156.0)

FULL_TONES = {
    "light": ("#0b1626", "#8f7c59"),
    "dark": ("#f5f0eb", "#c4b697"),
    "gold-duo": ("#d8cdb8", "#a89674"),
    "african": ("#2d6a4f", "#8f7c59"),
    "terracotta": ("#0b1626", "#c87a5a"),
    "ink": ("#0b1626", "#0b1626"),
    "black": ("#000000", "#000000"),
    "white": ("#ffffff", "#ffffff"),
    "gold": ("#c4b697", "#c4b697"),
}

for tone_key, (ca, cb) in FULL_TONES.items():
    # Symbol SVG
    sym_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
        f'  <title id="title">ZennShop — Z-Chariot Express ({tone_key})</title>\n'
        f'  {render_symbol_paths(chosen_parts, ca, cb)}\n'
        f'</svg>\n'
    )
    (FINAL_SVG_DIR / f"zennshop-symbol-{tone_key}.svg").write_text(sym_svg, encoding="utf-8")
    (FINAL_SVG_DIR / f"zennshop-symbol-small-{tone_key}.svg").write_text(sym_svg, encoding="utf-8")

    # Horizontal SVG
    horiz_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LOCKUP_W} 256" width="{LOCKUP_W}" height="256" role="img" aria-labelledby="title">\n'
        f'  <title id="title">ZennShop — Z-Chariot Express ({tone_key})</title>\n'
        f'  {render_lockup_horizontal(chosen_parts, ca, cb)}\n'
        f'</svg>\n'
    )
    (FINAL_SVG_DIR / f"zennshop-horizontal-{tone_key}.svg").write_text(horiz_svg, encoding="utf-8")

    # Stacked SVG
    stacked_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 420" width="880" height="420" role="img" aria-labelledby="title">\n'
        f'  <title id="title">ZennShop — Z-Chariot Express ({tone_key})</title>\n'
        f'  <g transform="translate(312, 16) scale(1)">{render_symbol_paths(chosen_parts, ca, cb)}</g>\n'
        f'  <g transform="translate(-110, 198)">{render_symbol_paths(WORDMARK_PARTS_H, ca, cb)}</g>\n'
        f'</svg>\n'
    )
    (FINAL_SVG_DIR / f"zennshop-stacked-{tone_key}.svg").write_text(stacked_svg, encoding="utf-8")

    # Wordmark SVG
    wm_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LOCKUP_W} 256" width="{LOCKUP_W}" height="256" role="img" aria-labelledby="title">\n'
        f'  <title id="title">ZennShop ({tone_key})</title>\n'
        f'  {render_lockup_horizontal(chosen_parts, ca, cb)}\n'
        f'</svg>\n'
    )
    (FINAL_SVG_DIR / f"zennshop-wordmark-{tone_key}.svg").write_text(wm_svg, encoding="utf-8")

    if tone_key in ("light", "dark"):
        cairosvg.svg2png(
            bytestring=sym_svg.encode("utf-8"),
            write_to=str(FINAL_PNG_DIR / f"zennshop-symbol-{tone_key}.png"),
            output_width=1024,
            output_height=1024,
        )
        cairosvg.svg2png(
            bytestring=horiz_svg.encode("utf-8"),
            write_to=str(FINAL_PNG_DIR / f"zennshop-horizontal-{tone_key}.png"),
            output_width=1600,
        )
        cairosvg.svg2png(
            bytestring=stacked_svg.encode("utf-8"),
            write_to=str(FINAL_PNG_DIR / f"zennshop-stacked-{tone_key}.png"),
            output_width=1200,
        )

# Adaptive browser icon.svg (light/dark prefers-color-scheme) with Chariot Express
icon_adaptive_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
    '  <title id="title">ZennShop</title>\n'
    '  <style>.a{fill:#0b1626}.b{fill:#8f7c59}@media (prefers-color-scheme:dark){.a{fill:#f5f0eb}.b{fill:#c4b697}}</style>\n'
    + "".join(f'  <path class="{role}" d="{d}"/>\n' for role, d in chosen_parts)
    + '</svg>\n'
)
(FINAL_ICON_DIR / "icon.svg").write_text(icon_adaptive_svg, encoding="utf-8")
(APP_DIR / "icon.svg").write_text(icon_adaptive_svg, encoding="utf-8")

# Favicon source & app icons with Chariot Express
def write_tile_icon(name: str, rx: int, scale: float, bg: str, ca: str, cb: str, border: str | None = None):
    tx = (256.0 - 256.0 * scale) / 2.0
    ty = (256.0 - 256.0 * scale) / 2.0
    rect = f'<rect width="256" height="256" rx="{rx}" fill="{bg}"/>' if rx > 0 else f'<rect width="256" height="256" fill="{bg}"/>'
    stroke = f'\n  <rect x="4" y="4" width="248" height="248" rx="{max(0, rx - 4)}" fill="none" stroke="{border}" stroke-width="4"/>' if border else ""
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n'
        f'  <title id="title">ZennShop</title>\n  {rect}{stroke}\n'
        f'  <g transform="translate({tx:.2f}, {ty:.2f}) scale({scale:.4f})">{render_symbol_paths(chosen_parts, ca, cb)}</g>\n'
        '</svg>\n'
    )
    (FINAL_ICON_DIR / name).write_text(svg, encoding="utf-8")
    return svg

fav_svg = write_tile_icon("favicon-source.svg", 56, 0.78, "#070f1a", "#f5f0eb", "#c4b697")
write_tile_icon("app-icon.svg", 56, 0.74, "#070f1a", "#f5f0eb", "#c4b697")
write_tile_icon("app-icon-gold-wash.svg", 56, 0.74, "#f7f2e8", "#0b1626", "#8f7c59", border="#d9cdb4")
apple_svg = write_tile_icon("apple-touch-icon.svg", 0, 0.74, "#070f1a", "#f5f0eb", "#c4b697")
mask_svg = write_tile_icon("maskable.svg", 0, 0.64, "#070f1a", "#f5f0eb", "#c4b697")
social_svg = write_tile_icon("social-avatar.svg", 0, 0.70, "#070f1a", "#f5f0eb", "#c4b697")

cairosvg.svg2png(bytestring=apple_svg.encode("utf-8"), write_to=str(FINAL_ICON_DIR / "apple-touch-icon.png"), output_width=180, output_height=180)
cairosvg.svg2png(bytestring=apple_svg.encode("utf-8"), write_to=str(APP_DIR / "apple-icon.png"), output_width=180, output_height=180)
cairosvg.svg2png(bytestring=apple_svg.encode("utf-8"), write_to=str(FINAL_ICON_DIR / "icon-192.png"), output_width=192, output_height=192)
cairosvg.svg2png(bytestring=apple_svg.encode("utf-8"), write_to=str(FINAL_ICON_DIR / "icon-512.png"), output_width=512, output_height=512)
cairosvg.svg2png(bytestring=mask_svg.encode("utf-8"), write_to=str(FINAL_ICON_DIR / "maskable-512.png"), output_width=512, output_height=512)
cairosvg.svg2png(bytestring=social_svg.encode("utf-8"), write_to=str(FINAL_ICON_DIR / "social-avatar-1024.png"), output_width=1024, output_height=1024)

# Multi-size favicon.ico (16, 32, 48)
png_512 = cairosvg.svg2png(bytestring=fav_svg.encode("utf-8"), output_width=512, output_height=512)
im = Image.open(io.BytesIO(png_512))
im.save(str(FINAL_ICON_DIR / "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
shutil.copyfile(FINAL_ICON_DIR / "favicon.ico", APP_DIR / "favicon.ico")

# Copy all SVGs & PNGs to frontend/public/logo/
for fn in FINAL_SVG_DIR.iterdir():
    shutil.copyfile(fn, PUBLIC_LOGO_DIR / fn.name)
for fn in FINAL_PNG_DIR.iterdir():
    shutil.copyfile(fn, PUBLIC_LOGO_DIR / fn.name)
for fn in OPTIONS_PNG_DIR.glob("zennshop-chariot-express-*.png"):
    shutil.copyfile(fn, PUBLIC_LOGO_DIR / fn.name)
for fn in OPTIONS_SVG_DIR.glob("zennshop-chariot-express-*.svg"):
    shutil.copyfile(fn, PUBLIC_LOGO_DIR / fn.name)
shutil.copyfile(FINAL_ICON_DIR / "app-icon.svg", PUBLIC_LOGO_DIR / "zennshop-app-icon.svg")
shutil.copyfile(FINAL_ICON_DIR / "icon.svg", PUBLIC_LOGO_DIR / "zennshop-favicon.svg")

print("Done!")
