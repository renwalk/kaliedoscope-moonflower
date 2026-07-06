"""
Kaleidoscope DrawBot Script
────────────────────────────
Draws a kaleidoscope by capturing a user-defined shape as an ImageObject,
then stamping it around a center point with rotation and mirror reflection.

Parameters
----------
COLOR_1      : (r, g, b) primary fill color
COLOR_2      : (r, g, b) accent / secondary fill color
SHAPE        : "star" | "circle" | "triangle" | "hexagon"
ANGLE        : additional rotation offset applied to the whole pattern (degrees)
REFLECTIONS  : number of segments (even numbers produce true mirror symmetry)
RINGS        : number of concentric rings (tiles scale up with each ring)
RING_SCALE   : multiplicative scale factor applied per ring (e.g. 1.4 = 40% larger each ring)
"""

import math

# ─── Parameters ───────────────────────────────────────────────────────────────

COLOR_1     = (0.9, 0.2, 0.5)    # primary color  (r, g, b)
COLOR_2     = (0.1, 0.5, 0.3)   # accent color   (r, g, b)
SHAPE       = "star"              # "star" | "circle" | "triangle" | "hexagon"
ANGLE       = 10                  # global rotation offset in degrees
REFLECTIONS = 20                  # mirror segments — even numbers look best
RINGS       = 5                   # number of concentric rings
RING_SCALE  = 1.75                # tile size multiplier per ring (>1 = grows outward)

# ─── Canvas ───────────────────────────────────────────────────────────────────

W, H           = 600, 600
CX, CY         = W / 2, H / 2
BASE_TILE_SIZE = 60               # tile size for the innermost ring
BASE_RADIUS    = 90               # ring-1 center-to-tile distance
RING_SPACING   = 1.125              # radius multiplier per ring (spreads rings outward)

# ─── Shape drawing (written into an ImageObject) ──────────────────────────────

def make_tile(shape, color1, color2, size):
    """
    Return a DrawBot ImageObject containing the base shape,
    centered on (size/2, size/2) within a (size × size) canvas.
    """
    img = ImageObject()

    with img:
        newPage(size, size)
        # transparent background
        fill(0, 0, 0, 0)
        rect(0, 0, size, size)

        cx, cy = size / 2, size / 2

        if shape == "star":
            r_out = size * 0.24
            r_in  = size * 0.15
            pts   = []
            for i in range(6):
                r = r_out if i % 2 == 0 else r_in
                a = math.radians(i * 36 - 90)
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
            fill(*color1)
            stroke(None)
            polygon(*pts)
            # inner circle accent
            fill(*color2, 0.8)
            oval(cx - r_in, cy - r_in, r_in * 2, r_in * 2)

        elif shape == "circle":
            r = size * 0.22
            fill(*color1)
            stroke(None)
            oval(cx - r, cy - r, r * 2, r * 2)
            fill(*color2, 0.75)
            oval(cx - r * 0.5, cy - r * 0.5, r, r)

        elif shape == "triangle":
            r = size * 0.2
            pts = [
                (cx + r * math.cos(math.radians(90  + i * 120)),
                 cy + r * math.sin(math.radians(90  + i * 120)))
                for i in range(3)
            ]
            fill(*color1)
            stroke(None)
            polygon(*pts)
            # inner inverted triangle
            r2  = r * 0.45
            pts2 = [
                (cx + r2 * math.cos(math.radians(270 + i * 120)),
                 cy + r2 * math.sin(math.radians(270 + i * 120)))
                for i in range(3)
            ]
            fill(*color2, 0.8)
            polygon(*pts2)

        elif shape == "hexagon":
            r = size * 0.44
            pts = [
                (cx + r * math.cos(math.radians(i * 60)),
                 cy + r * math.sin(math.radians(i * 60)))
                for i in range(6)
            ]
            fill(*color1)
            stroke(None)
            polygon(*pts)
            r2   = r * 0.5
            pts2 = [
                (cx + r2 * math.cos(math.radians(i * 60 + 30)),
                 cy + r2 * math.sin(math.radians(i * 60 + 30)))
                for i in range(6)
            ]
            fill(*color2, 0.8)
            polygon(*pts2)

        else:
            raise ValueError(f"Unknown shape '{shape}'. Choose: star, circle, triangle, hexagon")

    return img


# ─── Kaleidoscope renderer ────────────────────────────────────────────────────

def draw_kaleidoscope(color1, color2, shape, angle_offset, reflections, rings, ring_scale):
    seg_angle = 360 / reflections

    # Pre-build one tile image per ring so size is baked into the ImageObject
    tile_sizes = [BASE_TILE_SIZE * (ring_scale ** r) for r in range(rings)]
    tiles      = [make_tile(shape, color1, color2, int(size)) for size in tile_sizes]

    for r in range(rings):
        tile      = tiles[r]
        tile_size = tile_sizes[r]
        half      = tile_size / 2

        # Each ring's radius grows proportionally so tiles don't overlap
        radius = BASE_RADIUS * (RING_SPACING ** r)

        # Alternate rings are rotated by half a segment for a woven look
        ring_offset = angle_offset + (seg_angle / 2 if r % 2 == 1 else 0)

        for i in range(reflections):
            with savedState():
                translate(CX, CY)
                rotate(i * seg_angle + ring_offset)
                translate(radius, 0)

                # Mirror every other segment for true kaleidoscope symmetry
                if i % 2 == 1:
                    scale(-1, 1)

                image(tile, (-half, -half))

    # Center jewel ─ small layered circles using both colors
    with savedState():
        translate(CX, CY)
        for radius, color, alpha in [
            (25, color1, 0.9),
            (16, color2, 1.0),
            ( 6, color1, 1.0),
        ]:
            fill(*color, alpha)
            stroke(None)
            oval(-radius, -radius, radius * 2, radius * 2)


# ─── Render ───────────────────────────────────────────────────────────────────

newPage(W, H)
# fill(1)
# rect(0, 0, W, H)
blendMode('overlay')

draw_kaleidoscope(
    color1      = COLOR_1,
    color2      = COLOR_2,
    shape       = SHAPE,
    angle_offset= ANGLE,
    reflections = REFLECTIONS,
    rings       = RINGS,
    ring_scale  = RING_SCALE,
)