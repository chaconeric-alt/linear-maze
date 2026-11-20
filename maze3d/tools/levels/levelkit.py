"""levelkit.py - what the level scripts in tools/levels have in common.

Each script lays one level out in Python and writes it as an ordinary level file (SPEC section 4). They all need the
same few things: a map grid to carve rooms into, room entries, the model list of the kits (for how deep a piece is and
whether it hangs on a wall), things stood against walls, monsters, items, traps and signs, tags, door letters in the
legend, and the file written out. Those live here; the scripts keep only their own layout.

    from levelkit import Things, grid, carve, rows, room, write
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
GAME = os.path.join(ROOT, 'games', 'havenot')
SIDE = {'n': (0, -1), 'e': (1, 0), 's': (0, 1), 'w': (-1, 0)}     # where a wall of the cell is, from its middle
FACE = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}                 # something standing against that wall faces this way


def load(*parts):
    return json.load(open(os.path.join(*parts)))


def models(*kits):
    """The models of these kits (their generated.json), later kits winning: id -> meta (solid, mount, ...)."""
    meta = {}
    for k in kits:
        meta.update(load(ROOT, 'kits', k, 'generated.json')['models'])
    return meta


def grid(w, h, ch='#'):
    """A map w cells wide and h high, all `ch` (solid rock)."""
    return [[ch] * w for _ in range(h)]


def carve(g, x, y, w, h, ch='.'):
    """Open a rectangle of the map (floor, unless `ch` says otherwise)."""
    for j in range(y, y + h):
        for i in range(x, x + w):
            g[j][i] = ch


def rows(g):
    """The map as the level file has it: one string per row."""
    return [''.join(r) for r in g]


def room(name, x, y, w, h, style, height=1, **kw):
    """A room entry (it does not carve the map)."""
    return dict(name=name, rect=[x, y, w, h], style=style, height=height, **kw)


def lights_for(x, y, w, h, lamp=None, every=2):
    """A room's ceiling lamps. The engine lights a cell when (x + ox) % every == 0 and (y + oy) % every == 0, so: with
    `lamp`, one lamp in that cell; otherwise every `every` cells, lined up on the room's middle."""
    if lamp:
        return dict(every=50, ox=50 - lamp[0], oy=50 - lamp[1])
    return dict(every=every, ox=(every - (x + (w - 1) // 2) % every) % every, oy=(every - (y + (h - 1) // 2) % every) % every)


def tag(tags, name, *cells):
    """Add cells to a tag (for spawns, triggers and effects)."""
    tags.setdefault(name, []).extend([list(c) for c in cells])


def wall_offset(meta, wall, along=0.0, out=0.0, gap=0.3):
    """How far to move a piece standing against `wall` of its cell: its back `gap` metres off the wall (by its depth,
    from the model's `solid`), `along` metres sideways (east or south is +), `out` metres further into the room. A
    wall-mounted model only moves sideways. None: it stays in the middle of the cell."""
    dx, dz = SIDE[wall]
    ax, az = (0, 1) if dx else (1, 0)
    if meta.get('mount') != 'wall':
        depth = meta.get('solid', [1, 1, 1])[2]
        d = 2.0 - depth / 2 - gap - out
        return [round(dx * d + ax * along, 2), 0, round(dz * d + az * along, 2)]
    if along:
        return [ax * along, 0, az * along]
    return None


class Things(list):
    """A level's things. Every helper adds one entry and returns it; `floor` (a storey) becomes its "level"."""

    def __init__(self, meta=None, gap=0.3):
        super().__init__()
        self.meta = meta or {}
        self.gap = gap                      # how far a piece's back stands off the wall it is put against

    def add(self, e, floor=0, **kw):
        if floor:
            e['level'] = floor
        e.update(kw)
        self.append(e)
        return e

    def put(self, model, at, wall=None, along=0.0, out=0.0, floor=0, **kw):
        """Stand `model` in cell `at`. With `wall`, its back goes against that wall (wall_offset)."""
        e = dict(prop=model, at=list(at), blocks=False)
        if floor:
            e['level'] = floor
        m = self.meta[model]
        if wall:
            e['face'] = FACE[wall]
            off = wall_offset(m, wall, along, out, self.gap)
            if off is not None:
                e['offset'] = off
        e.update(kw)
        self.append(e)
        return e

    def actor(self, kind, at, floor=0, **kw):
        return self.add(dict(actor=kind, at=list(at)), floor, **kw)

    def item(self, kind, at, floor=0, **kw):
        return self.add(dict(item=kind, at=list(at)), floor, **kw)

    def trap(self, kind, at, floor=0, **kw):
        return self.add(dict(trap=kind, at=list(at)), floor, **kw)

    def sign(self, text, at, face, size=60, y=3.2, color=(1.0, 0.3, 0.85), floor=0, **kw):
        """Lettering on the wall behind the cell (on a monitor of its own unless "plain")."""
        return self.add(dict(sign=text, at=list(at), face=face, size=size, y=y, color=list(color)), floor, **kw)


class Legend(dict):
    """A map legend that hands out a letter for each different door (or anything else) asked for."""
    LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.free = list(self.LETTERS)

    def letter(self, spec):
        """The letter for this entry: the one it already has, or the next free one."""
        ch = next((c for c, v in self.items() if v == spec), None)
        if ch is None:
            ch = self.free.pop(0)
            self[ch] = spec
        return ch


def write(level, ensure_ascii=True):
    """Write the level to games/havenot/levels/<id>.json; returns the path."""
    out = os.path.join(GAME, 'levels', level['id'] + '.json')
    json.dump(level, open(out, 'w'), indent=1, ensure_ascii=ensure_ascii)
    return out
