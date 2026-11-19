#!/usr/bin/env python3
"""staffonly.py - writes games/havenot/levels/staffonly.json: STAFF ONLY, the floor where everything is kept.

It is a test floor, and it is built from what exists: this script reads every kit and the game's defs and lays out
  - a room in every style of every kit, each kit in a wing of its own off one spine corridor,
  - one of every piece of furniture, in a room of its own kit, and one of every door,
  - one of every monster wandering, lounging or perched where it belongs; every robot in its station, open and shut,
  - every loot container, stocked; one of every item,
  - a gun range, and targets for what cannot walk to it,
  - a lift, a pit, a pool, ramps, balconies, a room over a room, a basement, windows, thin walls, cut corners,
    scanner arches, traps, lockers, caches, terminals, a blue card, a red card and a way out.
Everything in it is OFF DUTY ("off_duty": true): it talks, and shows what it does on a target, and does not fight.

Add a kit, a style, a model, a monster or an item and run this again: it finds a place for it. It stops with an error
if anything is left out, and the engine's self-test checks the same thing (--level=staffonly --selftest).

    python3 tools/levels/staffonly.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
GAME = os.path.join(ROOT, 'games', 'havenot')
load = lambda *p: json.load(open(os.path.join(*p)))

game = load(GAME, 'game.json')
actors = load(GAME, 'defs', 'actors.json')
actors = actors.get('actors', actors)
items = load(GAME, 'defs', 'items.json')['items']

# ------------------------------------------------------------------ what there is
KITS = {}                       # kit -> {'styles': [..], 'props': {id: meta}, 'doors': [..]}
for kid in game['kits']:
    kj = load(ROOT, 'kits', kid, 'kit.json')
    gp = os.path.join(ROOT, 'kits', kid, 'generated.json')
    models = dict(load(gp).get('models', {})) if os.path.exists(gp) else {}
    models.update(kj.get('models', {}))
    if not models and not kj.get('styles'):
        continue                # a kit that only borrows (omni)
    KITS[kid] = dict(name=kj.get('name', kid), styles=list(kj.get('styles', {}).keys()),
                     props={n: m for n, m in models.items() if m.get('type') == 'prop'},
                     doors=sorted(n for n, m in models.items() if m.get('type') == 'door'))
ALL_DOORS = [d for k in KITS.values() for d in k['doors']]
META = {n: m for k in KITS.values() for n, m in k['props'].items()}

# Models that are not furniture to stand in a room: the level uses them some other way.
NOT_FURNITURE = lambda n: n.startswith('trap_') or n == 'window_obs'        # traps and windows are things of their own
ARCHES = sorted(n for n, m in META.items() if m.get('arch'))
STATIONS = game['generator_params']['stations']                             # actor -> station model
HALLS = {'hightech': 'corridor', 'agency': 'white_hall', 'works': 'greaseway', 'bunker': 'bunker_hall', 'crypt': 'catacomb',
         'executive': 'ex_hall', 'megaplex': 'mp_concourse', 'hospital': 'hs_hall', 'basilica': 'bb_cloister', 'home': 'hm_hall', 'anomalous': 'an_hall'}
# Where each monster is at home (a style), and how it spends its time there. Anything not listed wanders the spine.
HOMES = {'monoid': 'BREAK', 'custodian': 'SPINE', 'eggbot': 'mp_concourse', 'dancer': 'mp_cinema', 'drone': 'showroom', 'defender': 'ex_office',
         'deadbot': 'bunker_hall', 'plodder': 'LOBBY', 'mourner': 'chapel', 'princess': 'bb_nave', 'grease_monkey': 'foundry',
         'turret': 'machine', 'sphinx': 'corridor', 'snapper': 'NEST', 'fouler': 'NEST', 'roach': 'NEST', 'glorexx': 'NEST'}
USES = {
    'health_station': {"type": "heal", "prompt": "Use the Kaveros WellPoint", "charges": 9, "amount": 35},
    'locker': {"type": "locker", "prompt": "Open the locker", "loot": [{"item": "keycard", "color": "blue"}, {"item": "health"}]},
    'locker_bad': {"type": "locker", "prompt": "Open the locker", "actor": "roach", "count": 2, "text": "Two of the night shift. They were asleep."},
    'cache': {"type": "cache", "prompt": "Open the cache", "loot": [{"item": "keycard", "color": "red"}, {"item": "fuel_cell"}]},
    'terminal_wall': {"type": "read", "prompt": "Read the notice", "kicker": "Staff notices", "title": "STAFF ONLY",
                      "text": "Breaks are fifteen minutes.\n\nEverything on this floor is off duty. Talk to it (E). Ask it to show you what it does: what can walk goes to the gun range, east off the spine; what cannot has a target where it stands.\n\nThe blue card is in a locker in the Locker Room. The red card is in the Vault, behind the blue door. The way out is behind the red one, north-east."},
    'ag_desk': {"type": "terminal", "prompt": "Ring for service", "kicker": "Anomalous Structure · Brand Experience", "title": "Welcome, valued demographic!",
                "text": "The showroom is closed for staff training. You may still WANT things.",
                "options": [{"label": "What is on offer?", "result": "Everything you can see. Nothing you can afford. That is the brand."},
                            {"label": "Ask for a sample", "result": "A sample has been dispensed to your account.", "effects": [{"type": "credits", "amount": 5}], "once": True}]},
    'ag_kiosk': {"type": "read", "prompt": "Read the kiosk", "kicker": "Anomalous Structure", "title": "This season: WANT", "text": "WANT MORE. WORK MORE. BE MORE.\n\nStaff are reminded that wanting is for customers."},
    'ag_pedestal': {"type": "cache", "prompt": "Lift the dome", "loot": [{"item": "statuette"}]},
    'cr_coffin': {"type": "locker", "prompt": "Push the lid", "loot": [{"item": "crystal"}]},
    'cr_plinth': {"type": "cache", "prompt": "Take what is on the plinth", "loot": [{"item": "chips"}]},
}
SEATS = {'terminal_desk': 'ht_chair_ops', 'holo_table': 'ht_chair_throne'}       # a chair that goes with a work station

# ------------------------------------------------------------------ the plan: a spine, and wings in bands off it
RW = 32                         # cells of rooms in a wing
SX = RW + 2                     # the spine: two columns, with a wall between it and the rooms either side
BAND = 9                        # wall, five rows of rooms, wall with the doors in it, two rows of corridor
kit_wings = [k for k in KITS if k in HALLS]
SPECIAL = ['SHAPES', 'EXIT', 'BREAK', 'RANGE', 'STORES', 'NEST', 'DEPOT']
unknown = [k for k in KITS if KITS[k]['styles'] and k not in HALLS]
for k in unknown:               # a new kit: its first style is its hall
    HALLS[k] = KITS[k]['styles'][0]
    kit_wings.append(k)
# west and east of the spine, north to south. The break room and the range are in the middle.
order = ['SHAPES', 'EXIT'] + kit_wings[:4] + ['BREAK', 'RANGE'] + kit_wings[4:] + ['STORES', 'NEST', 'DEPOT']
if len(order) % 2:
    order.append('SPARE')
NB = len(order) // 2
W, Hh = SX + 3 + RW + 1, NB * BAND + 1
g0 = [['#'] * W for _ in range(Hh)]
g1 = [['#'] * W for _ in range(Hh)]
gb = [['#'] * W for _ in range(Hh)]
rooms, rooms1, roomsb, T, legend = [], [], [], [], {'~': {'fluid': True}}
decks, ramps, diags, windows, walls = [], [], [], [], []
placed, styles_used, doors_used, actors_used, items_used = set(), set(), set(), set(), set()
door_i = [0]
letters = list('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')


def carve(g, x0, y0, w, h, ch='.'):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            g[y][x] = ch


def door(x, y, model=None, g=None, **more):
    """A door in the wall at x, y. Without a model, the next kind in turn, so every kind is somewhere."""
    if model is None:
        model = ALL_DOORS[door_i[0] % len(ALL_DOORS)]
        door_i[0] += 1
    spec = dict(door=model, **more)
    ch = next((c for c, v in legend.items() if v == spec), None)
    if ch is None:
        ch = letters.pop(0)
        legend[ch] = spec
    (g or g0)[y][x] = ch
    doors_used.add(model)


def room(name, x0, y0, w, h, style, height=1, into=None):
    (rooms if into is None else into).append({"name": name, "rect": [x0, y0, w, h], "style": style, "height": height})
    styles_used.add(style)


def sign(text, x, y, face='s', color=(0.4, 0.9, 1.0), size=44, yy=3.0, **more):
    T.append(dict(sign=text, face=face, color=list(color), size=size, y=yy, at=[x, y], **more))


FACE = {'n': 's', 's': 'n', 'w': 'e', 'e': 'w'}
VEC = {'n': (0, -1), 's': (0, 1), 'w': (-1, 0), 'e': (1, 0)}


def prop(pid, x, y, wall=None, **more):
    """One piece of furniture. `wall`: the wall it stands against (it faces away from it); none: the middle of the cell."""
    m = META.get(pid, {})
    e = {"prop": pid, "at": [x, y]}
    solid = m.get('solid')
    if wall:
        e["face"] = FACE[wall]
        if m.get('mount') != 'wall' and solid and solid[2] <= 1.7 and solid[0] <= 3.0:
            push = round(2.0 - solid[2] / 2 - 0.12, 2)
            e["offset"] = [VEC[wall][0] * push, 0, VEC[wall][1] * push]
            e["blocks"] = False
        elif m.get('mount') != 'wall':
            e["blocks"] = bool(solid)
    else:
        e["blocks"] = bool(solid) and max(solid[0], solid[2]) >= 1.4
    if pid in USES and 'use' not in more:
        e["use"] = json.loads(json.dumps(USES[pid]))
    if pid in SEATS and 'seat' not in more:
        e["seat"] = SEATS[pid]
        placed.add(SEATS[pid])
    if m.get('screen') and 'screen' not in more and pid.startswith('terminal'):
        e["screen"] = "STAFF\nONLY"
    e.update(more)
    T.append(e)
    placed.add(pid)
    if 'seat' in e:
        placed.add(e['seat'])
    return e


def actor(aid, x, y, **more):
    T.append(dict(actor=aid, at=[x, y], **more))
    actors_used.add(aid)


def item(iid, x, y, **more):
    T.append(dict(item=iid, at=[x, y], **more))
    items_used.add(iid)


def target(x, y, face, tag='spot'):
    T.append({"target": tag, "at": [x, y], "face": face})


def slots(x0, y0, w, h, door_xs):
    """Places for furniture in a room: against the north wall, the side walls, and the south wall away from the doors."""
    out = [((x, y0), 'n') for x in range(x0 + 1, x0 + w - 1, 2)]
    out += [((x0, y0 + 2), 'w'), ((x0 + w - 1, y0 + 2), 'e'), ((x0, y0 + 4), 'w'), ((x0 + w - 1, y0 + 4), 'e')]
    out += [((x, y0 + h - 1), 's') for x in range(x0 + 2, x0 + w - 2, 2) if all(abs(x - d) > 1 for d in door_xs)]
    return out


def middles(x0, y0, w, h):
    return [(x, y0 + 2) for x in range(x0 + 2, x0 + w - 2, 3)]


def wing_x(side):
    return 1 if side == 0 else SX + 3


def band_y(b):
    return b * BAND


# the spine
carve(g0, SX, BAND - 2, 2, Hh - 1 - (BAND - 2))
room("The Spine", SX, BAND - 2, 2, Hh - 1 - (BAND - 2), 'corridor')
wander_spots = {}               # style or place name -> [(x, y)] open floor for something to stand on
home_of = {}


def corridor(b, side, style, label):
    x0, y0 = wing_x(side), band_y(b)
    carve(g0, x0 if side == 0 else x0 - 1, y0 + 7, RW + 1, 2)             # through the wall beside the spine
    room("%s · hall" % label, x0 if side == 0 else x0 - 1, y0 + 7, RW + 1, 2, style)
    # the sign hangs over the mouth of the wing, read from the spine
    sign(label.upper(), SX - 1 if side == 0 else SX + 2, y0 + 7, 'e' if side == 0 else 'w', size=40, yy=3.1)
    wander_spots.setdefault(style, []).extend([(x0 + 3 + 6 * i, y0 + 8) for i in range(5)])
    return x0, y0


def split(n, total=RW):
    """n room widths that with the walls between them fill a wing."""
    free = total - (n - 1)
    w = [free // n] * n
    for i in range(free - sum(w)):
        w[i] += 1
    return w


# ------------------------------------------------------------------ a kit's wing: a room in each style, its furniture round the walls
def kit_wing(b, side, kid):
    k = KITS[kid]
    hall = HALLS[kid]
    x0, y0 = corridor(b, side, hall, k['name'])
    styles = [s for s in k['styles'] if s != hall] or [hall]
    widths = split(len(styles))
    furniture = sorted(n for n in k['props'] if not NOT_FURNITURE(n) and n not in ARCHES and not n.startswith(('rb_station', 'lt_')) and n not in SEATS.values()
                       and n not in ('holo_table', 'cache', 'locker', 'locker_bad', 'health_station', 'terminal_wall'))
    big = [n for n in furniture if (k['props'][n].get('solid') and (k['props'][n]['solid'][2] > 1.7 or k['props'][n]['solid'][0] > 3.0)) or n in ('pillar',)]
    small = [n for n in furniture if n not in big]
    all_slots, all_mid = [], []
    x = x0
    for i, st in enumerate(styles):
        w = widths[i]
        carve(g0, x, y0 + 1, w, 5)
        dx = x + w // 2
        own = [d for d in k['doors'] if d not in doors_used]
        special = {}
        if st == 'vault':
            special = dict(model='door_vault', lock='blue', tag='vault_door')
        door(dx, y0 + 6, **(special or (dict(model=own[0]) if own else {})))
        name = "%s · %s" % (k['name'], st)
        room(name, x, y0 + 1, w, 5, st)
        sign(st, dx, y0 + 5, 'n', size=30, yy=3.3, color=(0.8, 0.85, 0.9))
        all_slots.append(slots(x, y0 + 1, w, 5, [dx]))
        all_mid.append(middles(x, y0 + 1, w, 5))
        wander_spots.setdefault(st, []).extend([(x + 1, y0 + 4), (x + w - 2, y0 + 4), (x + w // 2, y0 + 4)])
        home_of[st] = (x, y0 + 1, w, 5)
        x += w + 1
    for i, n in enumerate(big):                       # big things stand out in a room, one room after another
        r = i % len(styles)
        if not all_mid[r]:
            r = max(range(len(styles)), key=lambda q: len(all_mid[q]))
        if not all_mid[r]:                           # a wing of many narrow rooms has no middles: it goes against a wall like the rest
            small.insert(0, n)
            continue
        cx, cy = all_mid[r].pop(0)
        prop(n, cx, cy)
    order_ = [s for row in zip(*[sl + [None] * 40 for sl in all_slots]) for s in row if s]      # round the rooms in turn
    for n in small:
        (cx, cy), wl = order_.pop(0)
        prop(n, cx, cy, wl)
    return x0, y0, order_


# ------------------------------------------------------------------ the wings
vault_free = []
for i, what in enumerate(order):
    b, side = i // 2, i % 2
    x0, y0 = wing_x(side), band_y(b)
    if what in KITS:
        _, _, left = kit_wing(b, side, what)
        if what == 'hightech':
            vault_free = left
            # the scanner arches and the traps: down the hall, never both lanes at once
            for j, a in enumerate(ARCHES):
                prop(a, x0 + 8 + 4 * j, y0 + 7 + j % 2, None, face='e', blocks=False)
            for j, tr in enumerate([{"trap": "laser", "cycle": [1.5, 1.3], "damage": 6}, {"trap": "shock", "period": 2.6, "damage": 6}, {"trap": "vent", "phase": 0.0, "damage": 4}]):
                T.append(dict(tr, at=[x0 + 10 + 4 * j, y0 + 8 - j % 2]))
            sign("ARCHES AND TRAPS\none lane is always clear", x0 + 6, y0 + 7, 'e', size=30, yy=3.2, color=(1.0, 0.7, 0.2))
    elif what == 'BREAK':
        corridor(b, side, 'white_hall', 'Break Room')
        wa, wb = split(2)
        carve(g0, x0, y0 + 1, wa, 5)
        carve(g0, x0 + wa + 1, y0 + 1, wb, 5)
        door(x0 + wa // 2, y0 + 6, 'door_split')
        door(x0 + wa + 1 + wb // 2, y0 + 6, 'door_split')
        room("Locker Room", x0, y0 + 1, wa, 5, 'barracks')
        room("Break Room", x0 + wa + 1, y0 + 1, wb, 5, 'white_hall')
        bx = x0 + wa + 1
        T.append({"start": True, "face": "s", "at": [bx + wb // 2, y0 + 3]})
        sign("STAFF ONLY\nbreaks are 15 minutes", bx + wb // 2, y0 + 1, 's', size=56)
        prop('terminal_wall', bx + wb // 2 + 2, y0 + 1, 'n', screen="READ\nME")
        for j, how in enumerate(['smoke', 'lean', 'sit']):
            actor('monoid', bx + 2 + 4 * j, y0 + 1 if how != 'sit' else y0 + 4, lounge=how, face='s')
        # the locker room: both lockers, the WellPoint, and one of everything you can carry
        prop('locker', x0 + 2, y0 + 1, 'n')
        prop('locker_bad', x0 + 4, y0 + 1, 'n', rattle=True)
        prop('health_station', x0 + 6, y0 + 1, 'n')
        sign("BLUE CARD: LOCKER 1", x0 + 2, y0 + 2, 's', size=26, yy=3.2, color=(0.3, 0.5, 1.0))
        carry = [n for n in items if n not in ('keycard',) and items[n].get('kind', '') != 'treasure' and 'credits' not in items[n]]
        for j, n in enumerate(sorted(items)):
            if n == 'keycard':
                continue
            item(n, x0 + 1 + j % (wa - 2), y0 + 4 + (j // (wa - 2)))
        items_used.add('keycard')
        wander_spots['BREAK'] = [(bx + 3, y0 + 4)]
    elif what == 'RANGE':
        corridor(b, side, 'bunker_hall', 'Gun Range')
        carve(g0, x0, y0 + 1, RW, 5)
        room("Gun Range", x0, y0 + 1, RW, 5, 'bunker_ops')
        for dx in (x0 + 3, x0 + 11, x0 + 19):
            door(dx, y0 + 6, 'door_bk_blast' if 'door_bk_blast' in ALL_DOORS else None)
        # a gallery along the north side behind glass, for whoever is watching
        for x in range(x0 + 2, x0 + RW):
            walls.append({"at": [x, y0 + 1], "side": "s", "kind": "window"})
        for j in range(4):
            target(x0 + RW - 2, y0 + 2 + j, 'w', 'range')
        sign("GUN RANGE\nwatch from behind the glass", x0 + 4, y0 + 1, 's', size=44, color=(1.0, 0.6, 0.2))
        mobile = sorted(a for a, d in actors.items() if d.get('behavior') != 'turret' and not d.get('mount') and d.get('attacks'))
        half = (len(mobile) + 1) // 2
        for j, part in enumerate((mobile[:half], mobile[half:])):
            opts = [{"label": "Call %s" % actors[a].get('name', a), "effects": [{"type": "drill", "actor": a, "tag": "range"}], "result": "Called. Give it a moment to walk here."} for a in part]
            opts.append({"label": "Cease fire", "effects": [{"type": "drill_stop"}], "result": "Range is cold."})
            prop('terminal_desk', x0 + 6 + 4 * j, y0 + 1, 'n', seat=['ht_chair_cockpit', 'ht_chair_command'][j], screen="RANGE\n%d" % (j + 1),
                 use={"type": "terminal", "prompt": "Range control %d" % (j + 1), "kicker": "Gun Range", "title": "Who is shooting?",
                      "text": "Pick somebody. The nearest one of that kind that is free walks to the range, shows what it does for a few seconds, and goes back to where it was.\n\nYou can also ask any of them yourself (E).", "options": opts})
    elif what == 'STORES':
        corridor(b, side, 'corridor', 'Stores')
        carve(g0, x0, y0 + 1, RW, 5)
        room("Stores", x0, y0 + 1, RW, 5, 'vault')
        for dx in (x0 + 5, x0 + 21):
            door(dx, y0 + 6)
        loot = sorted(n for n in META if n.startswith('lt_'))
        kinds = {v: [i for i, kk in game['generator_params']['loot_kinds'].items() if kk == v] for v in ('shelf', 'trophy', 'box')}
        spots = [((x, y0 + 1), 'n') for x in range(x0, x0 + RW)] + [((x, y0 + 5), 's') for x in range(x0, x0 + RW) if all(abs(x - d) > 1 for d in (x0 + 5, x0 + 21))]
        for j, n in enumerate(loot):
            (cx, cy), wl = spots[j]
            m = META[n]
            pool = kinds.get(m.get('holds'), ['fuel_cell', 'fuel_cell_big'])
            holds = [pool[(j + q) % len(pool)] for q in range(min(len(m.get('slots', [])), 3 if m.get('holds') != 'trophy' else 1))]
            items_used.update(holds)
            prop(n, cx, cy, wl, holds=holds)
        actor('sphinx', x0 + RW - 1, y0 + 8, face='w', still=True)
        target(x0 + RW - 6, y0 + 8, 'e')
        sign("STORES\nwhat loot is kept in", x0 + 13, y0 + 5, 'n', size=40)
    elif what == 'DEPOT':
        corridor(b, side, 'corridor', 'Robot Depot')
        carve(g0, x0, y0 + 1, RW, 5)
        room("Robot Depot", x0, y0 + 1, RW, 5, 'machine')
        for dx in (x0 + 7, x0 + 23):
            door(dx, y0 + 6)
        j = 0
        for a in sorted(STATIONS):                    # every robot's station twice: standing open, and shut over a hibernating one
            for shut in (False, True):
                if x0 + j >= x0 + RW:
                    sys.exit("staffonly.py: more stations than the Depot's wall holds; widen RW")
                T.append({"station": STATIONS[a], "actor": a, "at": [x0 + j, y0 + 1], "face": "s", "shut": shut, "blocks": True})
                placed.add(STATIONS[a])
                actors_used.add(a)
                j += 2
        sign("ROBOT DEPOT\nopen, and shut", x0 + 15, y0 + 5, 'n', size=40, color=(0.4, 1.0, 0.6))
    elif what == 'NEST':
        corridor(b, side, 'corridor', 'The Nest')
        carve(g0, x0, y0 + 1, RW, 5)
        room("The Nest", x0, y0 + 1, RW, 5, 'ruin', height=2)
        for dx in (x0 + 9, x0 + 25):
            door(dx, y0 + 6)
        for y in (y0 + 2, y0 + 3, y0 + 4):
            for x in range(x0 + 12, x0 + 19):
                g0[y][x] = '~'
        for x, how in ((x0 + 2, 'wall'), (x0 + 5, 'wall'), (x0 + 8, 'ceiling'), (x0 + 22, 'ceiling'), (x0 + 24, 'wall')):
            actor('roach', x, y0 + 1, perch=how)
        actor('roach', x0 + 3, y0 + 4, perch='floor')
        actor('glorexx', x0 + 27, y0 + 1, perch='wall')
        actor('glorexx', x0 + 15, y0 + 3, perch='floor', face='e', roam=2)
        actor('snapper', x0 + 30, y0 + 4, face='w')
        target(x0 + 28, y0 + 4, 'e')
        actor('fouler', x0 + 21, y0 + 4, roam=3)
        prop('nest', x0 + 1, y0 + 5, None, blocks=False) if 'nest' not in placed else None
        prop('debris', x0 + 10, y0 + 5, None, blocks=False) if 'debris' not in placed else None
        sign("THE NEST\nlook up", x0 + 15, y0 + 5, 'n', size=40, color=(0.5, 1.0, 0.3))
    elif what == 'EXIT':
        corridor(b, side, 'ex_hall' if 'ex_hall' in HALLS.values() else 'corridor', 'Way Out')
        wa, wb = split(2)
        carve(g0, x0, y0 + 1, wa, 5)
        carve(g0, x0 + wa + 1, y0 + 1, wb, 5)
        room("Security Lobby", x0, y0 + 1, wa, 5, 'bunker_ops')
        room("Way Out", x0 + wa + 1, y0 + 1, wb, 5, 'vault')
        door(x0 + wa // 2, y0 + 6)
        door(x0 + wa, y0 + 3, 'door_vault', lock='red', tag='exit_door')
        sign("RED CARD", x0 + wa - 1, y0 + 2, 'w', size=34, yy=3.2, color=(1.0, 0.2, 0.15))
        prop('holo_table', x0 + wa + 1 + wb // 2, y0 + 3, None, blocks=False,
             use={"type": "effects", "prompt": "Clock out", "effects": [{"type": "end", "title": "Clocked out", "text": "Everything is where it is kept, and none of it minded."}]})
        wander_spots['LOBBY'] = [(x0 + 3, y0 + 4), (x0 + wa - 3, y0 + 2)]
    elif what == 'SHAPES':
        corridor(b, side, 'corridor', 'Shapes')
        wa, wc, wd = 15, 8, 7                         # the atrium; a store with a loft over it; the lift lobby over a basement
        ax, cx, dx_ = x0, x0 + wa + 1, x0 + wa + 1 + wc + 1
        carve(g0, ax, y0 + 1, wa, 5)
        carve(g0, cx, y0 + 1, wc, 5)
        carve(g0, dx_, y0 + 1, wd, 5)
        room("Atrium", ax, y0 + 1, wa, 5, 'lab', height=2)
        room("Store under the Loft", cx, y0 + 1, wc, 5, 'machine')
        room("Lift Lobby", dx_, y0 + 1, wd, 5, 'lab')
        door(ax + 7, y0 + 6)
        door(cx + wc // 2, y0 + 6)
        door(dx_ + wd // 2, y0 + 6)
        decks.append({"rect": [ax, y0 + 1, wa, 1], "level": 1})                 # a balcony along the north side and down the east
        decks.append({"rect": [ax + wa - 1, y0 + 1, 1, 5], "level": 1})
        ramps.extend([{"at": [ax + 3, y0 + 3], "dir": "n", "from": 0, "to": 2}, {"at": [ax + 3, y0 + 2], "dir": "n", "from": 2, "to": 4}])
        diags.append({"at": [ax, y0 + 5], "corner": "sw"})
        windows.extend([[ax + wa, y0 + 2], [ax + wa, y0 + 4]])                   # windows from the atrium into the store
        carve(g1, cx, y0 + 1, wc, 5)                                             # the loft: a room over a room, its door off the balcony
        door(ax + wa, y0 + 3, 'door_split', g=g1)
        room("Loft", cx, y0 + 1, wc, 5, 'bunker_ops', into=rooms1)
        carve(gb, dx_, y0 + 1, wd, 5)                                            # the basement under the lift lobby
        room("Sump", dx_, y0 + 1, wd, 5, 'ruin', into=roomsb)
        T.append({"lift": [-1, 0], "at": [dx_ + wd - 1, y0 + 1], "home": 0})
        sign("LIFT", dx_ + wd - 1, y0 + 2, 's', size=48, color=(0.4, 1.0, 0.6))
        T.append({"trap": "pit", "at": [dx_ + 1, y0 + 2]})
        sign("MIND THE FLOOR", dx_ + 1, y0 + 1, 's', size=34, color=(1.0, 0.6, 0.2))
        for y in (y0 + 4, y0 + 5):
            for x in (dx_ + 3, dx_ + 4):
                pass
        item('health', dx_ + 3, y0 + 3, level=-1)
        item('cells', cx + 2, y0 + 3, level=1)
        sign("up the ramp, along the balcony,\nthrough the door to the Loft", ax + 7, y0 + 5, 'n', size=28, yy=3.2)
        wander_spots['SHAPES'] = [(ax + 8, y0 + 4)]

# ------------------------------------------------------------------ the rest of the furniture, the red card, the monsters
# the cache with the red card goes in the Vault, with whatever of the vault's wall is left
if vault_free:
    vs = [s for s in vault_free if home_of.get('vault') and home_of['vault'][0] <= s[0][0] < home_of['vault'][0] + home_of['vault'][2]] or vault_free
    (cx, cy), wl = vs[0]
    prop('cache', cx, cy, wl)
    sign("RED CARD", cx, cy, FACE[wl], size=26, yy=3.2, color=(1.0, 0.2, 0.15))
hx, hy = wing_x(order.index('hightech') % 2), band_y(order.index('hightech') // 2)
actor('sphinx', hx, hy + 7, face='e', still=True)           # at the dead end of the hightech hall, looking down it
target(hx + 4, hy + 7, 'w')
for aid in sorted(actors):
    if aid in ('monoid', 'roach', 'glorexx', 'snapper', 'fouler', 'sphinx'):
        continue                                  # placed with their rooms above
    home = HOMES.get(aid, 'SPINE')
    if home == 'SPINE' or home not in wander_spots or not wander_spots[home]:
        spot = (SX + (len(actors_used) % 2), BAND + 6 + 5 * (sorted(actors).index(aid) % 10))
    else:
        spot = wander_spots[home].pop(0)
    more = {}
    d = actors[aid]
    if d.get('behavior') == 'turret' or d.get('mount'):          # it cannot go to the range: it gets a target where it is
        tx = spot[0] + 3 if g0[spot[1]][min(W - 1, spot[0] + 3)] != '#' else spot[0] - 3
        target(tx, spot[1], 'w' if tx > spot[0] else 'e')
        more['face'] = 'e' if tx > spot[0] else 'w'
    if aid == 'princess':
        more['still'] = True
    if d.get('lounge'):
        more['lounge'] = 'none'                   # this one is up and about; the loungers are in the break room
    actor(aid, spot[0], spot[1], **more)

ONLY = os.environ.get('SO_ACTORS')                  # for looking at part of it: SO_ACTORS=monoid,sphinx keeps just those monsters
if ONLY is not None:
    keep = set(ONLY.split(','))
    T[:] = [t for t in T if t.get('actor', next(iter(keep), '')) in keep or ('station' in t and not t.pop('actor', None) and False) or 'actor' not in t]
    actors_used = set(actors)
# ------------------------------------------------------------------ is everything here?
missing = []
for kid, k in KITS.items():
    missing += ["style %s" % s for s in k['styles'] if s not in styles_used]
    missing += ["door %s" % d for d in k['doors'] if d not in doors_used]
    missing += ["prop %s" % n for n in k['props'] if n not in placed and not NOT_FURNITURE(n)]
missing += ["actor %s" % a for a in actors if a not in actors_used]
missing += ["item %s" % n for n in items if n not in items_used]
missing += ["station for %s" % a for a in STATIONS if STATIONS[a] not in placed]
if missing:
    sys.exit("staffonly.py: no place found for: " + ", ".join(missing))

rows = lambda g: [''.join(r) for r in g]
L = {"id": "staffonly", "name": "Staff Only (the test floor: every room, every thing, every monster, off duty)", "kit": "omni", "style": "corridor",
     "intro": "Everything on this floor is on its break. It will talk. It will show you what it does, on a target. It will not do it to you.",
     "ambient_energy": 0.75, "off_duty": True, "covers_all": True,
     "legend": legend, "map": rows(g0), "fluid": {"level": 0.7, "color": [0.12, 0.55, 0.35, 0.6], "glow": 0.35},
     "rooms": rooms, "decks": decks, "ramps": ramps, "diags": diags, "windows": windows, "walls": walls,
     "floors": [{"level": 1, "map": rows(g1), "rooms": rooms1}, {"level": -1, "map": rows(gb), "rooms": roomsb}],
     "things": T,
     "objectives": [{"text": "Blue card: locker 1, in the Locker Room (west of here)", "done": "key_blue"},
                    {"text": "Red card: the cache in the Vault, behind the blue door (high-tech wing)", "done": "key_red"},
                    {"text": "Clock out: behind the red door (Way Out, north-east)"}],
     "triggers": []}
out = os.path.join(GAME, 'levels', 'staffonly.json')
json.dump(L, open(out, 'w'), indent=1, ensure_ascii=False)
print('\n'.join(rows(g0)))
print("%d x %d cells, %d rooms, %d things: %d props, %d monsters (%d kinds), %d doors (%d kinds), %d styles" % (
    W, Hh, len(rooms) + len(rooms1) + len(roomsb), len(T), sum(1 for t in T if 'prop' in t or 'station' in t), sum(1 for t in T if 'actor' in t), len(actors_used),
    sum(r.count(c) for r in rows(g0) + rows(g1) for c in legend if c != '~'), len(doors_used), len(styles_used)))
