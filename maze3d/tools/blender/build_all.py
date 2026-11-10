"""Rebuild every generated model of the high-tech kit and the monsters.

  blender -b -P tools/blender/build_all.py            (or: python3 build_all.py with `pip install bpy`)
  ... build_all.py -- wall_pipes roach                rebuild only these

Writes kits/hightech/models/*.glb, kits/hightech/generated.json, kits/hightech/materials.json
and actors/*.glb. Hand-made models are never touched: put them beside these and list them in
kits/hightech/kit.json (see SPEC.md)."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mz, palette, tiles, props, actors

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
KIT = os.path.join(ROOT, 'kits', 'hightech')
only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def g(v):
    """Blender (x, y, z) -> Godot (x, z, -y)."""
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]


TILE_META = {
    'ceil_light': dict(light=dict(color=[1.0, 0.95, 0.86], energy=2.0, range=12, at=[0, -0.5, 0])),
    'ceil_truss': dict(light=dict(color=[1.0, 0.66, 0.3], energy=2.0, range=13, at=[0, -0.4, 0])),
    'wall_light': dict(light=dict(color=[0.9, 0.95, 1.0], energy=1.4, range=7, at=[0, 2.0, 0.6])),
    'wall_screen': dict(light=dict(color=[0.2, 0.9, 0.8], energy=0.6, range=4.5, at=[0, 2.0, 0.7])),
    'floor_grate': dict(light=dict(color=[1.0, 0.55, 0.12], energy=0.5, range=3.5, at=[0, 0.3, 0])),
    'pillar': dict(solid=[1.5, 4.0, 1.5], light=dict(color=[0.2, 0.9, 1.0], energy=0.9, range=5, at=[0, 2.0, 0])),
}


def conv_meta(meta):
    out = dict(meta)
    if 'parts' in out:
        parts = {}
        for k, p in out['parts'].items():
            q = dict(p)
            if 'move' in q:
                q['move'] = g(q['move'])
            if 'rot_axis' in q:
                q['rot_axis'] = g(q['rot_axis'])
            parts[k] = q
        out['parts'] = parts
    for key in ('screen', 'light'):
        if out.get(key):
            d = dict(out[key])
            d['at'] = g(d['at'])
            if 'color' in d:
                d['color'] = list(d['color'])
            out[key] = d
        elif key in out:
            del out[key]
    if 'muzzle' in out:
        out['muzzle'] = g(out['muzzle'])
    if 'solid' in out:
        out['solid'] = list(out['solid'])
    if 'solids' in out:          # [x, z(up), y, w, h, d] given as Blender x, height-centre, y -> Godot centre + size
        out['solids'] = [[b[0], b[1], -b[2], b[3], b[4], b[5]] for b in out['solids']]
    return out


def build_kit(kit_id, tile_fns, prop_fns, tile_meta, materials):
    kit = os.path.join(ROOT, 'kits', kit_id)
    os.makedirs(os.path.join(kit, 'models'), exist_ok=True)
    gen_path = os.path.join(kit, 'generated.json')
    gen = json.load(open(gen_path)) if os.path.exists(gen_path) else {'tiles': {}, 'models': {}}
    for name, fn in tile_fns.items():
        kind = 'pillar' if name == 'pillar' else name.split('_')[0]
        kind = {'ceil': 'ceiling'}.get(kind, kind)
        if not only or name in only:
            mz.reset()
            ob = fn().to_object()
            ob.name = name
            mz.export(os.path.join(kit, 'models', name + '.glb'))
            print('tile', kit_id, name)
        if kind == 'pillar':
            gen['models'][name] = dict(model='models/%s.glb' % name, type='prop', **tile_meta.get(name, {}))
        else:
            gen['tiles'][name] = dict(model='models/%s.glb' % name, kind=kind, **tile_meta.get(name, {}))
    for name, fn in prop_fns.items():
        if only and name not in only and name in gen['models']:
            continue
        mz.reset()
        r = fn()
        mz.export(os.path.join(kit, 'models', name + '.glb'))
        gen['models'][name] = dict(model='models/%s.glb' % name, **conv_meta(r['meta']))
        print('model', kit_id, name)
    json.dump(gen, open(gen_path, 'w'), indent=1, sort_keys=True)
    mats = {}
    for k, v in materials.items():
        mats[k] = {a: (list(b) if isinstance(b, tuple) else b) for a, b in v.items()}
    json.dump(mats, open(os.path.join(kit, 'materials.json'), 'w'), indent=1, sort_keys=True)


def main():
    import agency
    mz.define_materials(palette.MATERIALS)
    mz.define_materials(agency.MATERIALS)
    build_kit('hightech', tiles.TILES, props.PROPS, TILE_META, palette.MATERIALS)
    build_kit('agency', agency.TILES, agency.PROPS, agency.TILE_META, agency.MATERIALS)
    os.makedirs(os.path.join(ROOT, 'actors'), exist_ok=True)
    for name, fn in actors.ACTORS.items():
        if only and name not in only:
            continue
        mz.reset()
        fn()
        mz.export(os.path.join(ROOT, 'actors', name + '.glb'))
        print('actor', name)
    print('done')


main()
