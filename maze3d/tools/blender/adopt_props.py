"""Every outside furniture model, in one table: run this to (re)make them all and write their entries into each kit's
kit.json ("models"). Sources live in kits/<kit>/source/ (kept out of the project zip).
    python3 adopt_props.py [id ...]
Add a line per new model: (kit, id, source file, name shown by Identify, options for adopt_prop.adopt)."""
import sys, os, json
import adopt_prop

ROOT = adopt_prop.ROOT
PROPS = [
    # the Kaveros chairs (Tripo, Nov 12): all four ride a floor rail and face the engine's front as delivered
    ('hightech', 'ht_chair_ops',     'chair_ops.glb',     "Operator's Chair", dict(height=1.45)),
    ('hightech', 'ht_chair_command', 'chair_command.glb', 'Command Chair',    dict(height=1.6)),
    ('hightech', 'ht_chair_cockpit', 'chair_cockpit.glb', 'Cockpit Chair',    dict(height=1.5)),
    ('hightech', 'ht_chair_throne',  'chair_throne.glb',  'Throne Chair',     dict(height=1.75)),
    # the wall terminals (Tripo, Nov 22; Eric's replacements for the made one): hung on a wall by their backs, the
    # screen text set where each model's screen is. Delivered at 1.9 million triangles and 4K textures each; the
    # sources kept here are thinned to 200k with 2K textures, and the game's copies to 12k with 1K.
    ('hightech', 'terminal_wall',   'terminal_scifi.glb', 'Wall Terminal',    dict(height=1.9, yaw=90, tris=12000, tex=1024, wall=True,
        meta={'screen': {'at': [0, 1.36, 0.8], 'size': [0.55, 0.42], 'tilt': 20}})),
    ('hightech', 'terminal_wall_b', 'terminal_tall.glb',  'Tall Wall Terminal', dict(height=2.1, yaw=-90, tris=12000, tex=1024, wall=True,
        meta={'screen': {'at': [0.02, 1.53, 0.6], 'size': [0.3, 0.28], 'tilt': 10}})),
]

if __name__ == '__main__':
    only = sys.argv[1:]
    for kit, pid, src, name, opt in PROPS:
        if only and pid not in only:
            continue
        args = {k: v for k, v in opt.items() if k != 'meta'}
        entry = adopt_prop.adopt(os.path.join(ROOT, 'kits', kit, 'source', src), kit, pid, **args)
        entry['name'] = name
        entry.update(opt.get('meta', {}))
        p = os.path.join(ROOT, 'kits', kit, 'kit.json')
        k = json.load(open(p))
        k.setdefault('models', {})[pid] = entry
        json.dump(k, open(p, 'w'), indent=1)
