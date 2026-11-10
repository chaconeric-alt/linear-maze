#!/usr/bin/env python3
"""inspect_model.py - what is in a .glb before it goes into the game.

    python3 tools/inspect_model.py path/to/monster.glb

Reads the file directly (no Blender needed) and reports: size and where the feet are, which way is
long, triangle count, materials and textures, the skeleton (bone count, the chains it found, bones that
no vertex follows, vertices that follow nothing), and the clips with their lengths. It ends with a list
of things to fix or to tell the engine (scale, model_yaw, clip names). Meant for models that come from
Tripo, Meshy or anywhere else; the game's own models pass it too.
"""
import json, struct, sys, math, re

TYPES = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    d = open(path, 'rb').read()
    if d[:4] != b'glTF':
        sys.exit('Not a binary glTF (.glb). Export GLB, or FBX and tell Claude to convert it.')
    n = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + n])
    rest = d[20 + n:]
    binary = rest[8:8 + struct.unpack('<I', rest[:4])[0]] if len(rest) >= 8 else b''
    return j, binary, len(d)


def read(j, binary, idx):
    a = j['accessors'][idx]
    if 'bufferView' not in a:
        return []
    bv = j['bufferViews'][a['bufferView']]
    fmt, size = TYPES[a['componentType']]
    nc = NCOMP[a['type']]
    stride = bv.get('byteStride', size * nc)
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    out = []
    for i in range(a['count']):
        out.append(struct.unpack_from('<' + fmt * nc, binary, off + i * stride))
    return out


def main(path):
    j, binary, nbytes = load(path)
    nodes = j.get('nodes', [])
    notes = []
    print('%s  (%.1f MB)' % (path, nbytes / 1e6))

    # ---- geometry
    tris = verts = 0
    mn, mx = [1e9] * 3, [-1e9] * 3
    unweighted = 0
    used_joints = set()
    skinned_prims = 0
    for m in j.get('meshes', []):
        for p in m['primitives']:
            at = p['attributes']
            pa = j['accessors'][at['POSITION']]
            verts += pa['count']
            tris += (j['accessors'][p['indices']]['count'] if 'indices' in p else pa['count']) // 3
            if 'min' in pa:
                mn = [min(a, b) for a, b in zip(mn, pa['min'])]
                mx = [max(a, b) for a, b in zip(mx, pa['max'])]
            if 'JOINTS_0' in at and 'WEIGHTS_0' in at:
                skinned_prims += 1
                J = read(j, binary, at['JOINTS_0'])
                Wt = read(j, binary, at['WEIGHTS_0'])
                wscale = {5121: 255.0, 5123: 65535.0}.get(j['accessors'][at['WEIGHTS_0']]['componentType'], 1.0)
                for jj, ww in zip(J, Wt):
                    s = sum(ww) / wscale
                    if s < 0.01:
                        unweighted += 1
                    for a, b in zip(jj, ww):
                        if b / wscale > 0.01:
                            used_joints.add(a)
    size = [b - a for a, b in zip(mn, mx)]
    print('\nGEOMETRY')
    print('  triangles %d   vertices %d' % (tris, verts))
    print('  size  x %.2f   y(up) %.2f   z %.2f   (file units, before any node scale)' % tuple(size))
    print('  lowest point y = %.2f' % mn[1])
    roots = [nodes[i] for i in j.get('scenes', [{}])[0].get('nodes', [])] if j.get('scenes') else []
    for r in roots:
        if 'scale' in r and any(abs(s - 1) > 0.01 for s in r['scale']):
            notes.append('Root node "%s" is scaled %s: sizes above are before that scale.' % (r.get('name', '?'), [round(s, 3) for s in r['scale']]))
    if tris > 60000:
        notes.append('%d triangles is heavy for something that appears in groups. Ask the generator for a low-poly / retopologised version (15-40k), or Claude can decimate it.' % tris)
    if abs(mn[1]) > 0.05 * max(size[1], 0.01):
        notes.append('The feet are not at y = 0 (lowest point %.2f). Set "model_y" in the actor def, or Claude re-origins it.' % mn[1])
    if size[1] > 0 and not (0.3 <= size[1] <= 6):
        notes.append('It is %.2f units tall. The game works in metres: set "scale" in the actor def (for 1.8 m: %.3f).' % (size[1], 1.8 / size[1]))

    # ---- materials
    print('\nMATERIALS')
    for m in j.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        tex = [k for k, v in (('colour', pbr.get('baseColorTexture')), ('metal/rough', pbr.get('metallicRoughnessTexture')), ('normal', m.get('normalTexture')), ('emission', m.get('emissiveTexture'))) if v]
        print('  %-24s textures: %s' % (m.get('name', '(unnamed)'), ', '.join(tex) or 'none (flat colour)'))
    for im in j.get('images', []):
        bv = j['bufferViews'][im['bufferView']] if 'bufferView' in im else None
        if bv and binary:
            b = binary[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + 32]
            if b[:8] == b'\x89PNG\r\n\x1a\n':
                w, h = struct.unpack('>II', b[16:24])
                print('  image %-18s PNG %dx%d  %.1f MB' % (im.get('name', '?'), w, h, bv['byteLength'] / 1e6))
                if max(w, h) > 2048:
                    notes.append('Texture %s is %dx%d. 2048 is plenty; Claude can shrink it.' % (im.get('name', '?'), w, h))
            else:
                print('  image %-18s %s  %.1f MB' % (im.get('name', '?'), im.get('mimeType', '?'), bv['byteLength'] / 1e6))
    if not j.get('materials'):
        notes.append('No materials at all: it will be grey. Export with textures.')

    # ---- skeleton
    print('\nSKELETON')
    skins = j.get('skins', [])
    if not skins:
        print('  none')
        notes.append('No skeleton. It needs rigging before it can move (Tripo: Rig, then export GLB; or Claude rigs it).')
    for sk in skins:
        joints = sk['joints']
        names = [nodes[i].get('name', 'bone%d' % i) for i in joints]
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get('children', []):
                parent[c] = i
        kids = {}
        for jn in joints:
            kids.setdefault(parent.get(jn), []).append(jn)
        leaves = [jn for jn in joints if not [c for c in kids.get(jn, []) if c in joints]]
        print('  %d bones, %d end bones (limb tips)' % (len(joints), len(leaves)))
        # chains from each tip back to a branching bone
        chains = []
        for lf in leaves:
            ch = [lf]
            p = parent.get(lf)
            while p in joints and len([c for c in kids.get(p, []) if c in joints]) == 1:
                ch.append(p)
                p = parent.get(p)
            chains.append([nodes[c].get('name', '?') for c in reversed(ch)])
        for ch in sorted(chains, key=lambda c: c[0]):
            print('    %-22s %d bones%s' % (ch[0], len(ch), '  -> ' + ch[-1] if len(ch) > 1 else ''))
        low = ' '.join(names).lower()
        found = [w for w in ('jaw', 'tail', 'head', 'neck', 'wing', 'mandible', 'antenna', 'hand', 'finger', 'eye') if w in low]
        print('  named parts found: %s' % (', '.join(found) or 'none by name'))
        idle = [names[i] for i in range(len(joints)) if i not in used_joints]
        if skinned_prims and idle:
            print('  bones nothing follows (%d): %s%s' % (len(idle), ', '.join(idle[:8]), ' ...' if len(idle) > 8 else ''))
        if 'jaw' not in low and 'mand' not in low:
            notes.append('No jaw or mandible bone by name. If it should bite or open its mouth, Claude adds one.')
        if len(joints) > 120:
            notes.append('%d bones is a lot; fingers and face bones can go.' % len(joints))
    if skins and unweighted:
        notes.append('%d vertices follow no bone: they will be left behind when it moves. Claude repaints them.' % unweighted)
    if skins and not skinned_prims:
        notes.append('There is a skeleton but the mesh is not skinned to it.')

    # ---- clips
    print('\nCLIPS')
    anims = j.get('animations', [])
    if not anims:
        print('  none')
        notes.append('No animations. The engine wants at least idle, walk, attack, hurt, die. Add presets in the generator, or Claude writes them.')
    have = set()
    for a in anims:
        length = 0.0
        for s in a['samplers']:
            acc = j['accessors'][s['input']]
            length = max(length, (acc.get('max') or [0])[0])
        nm = a.get('name', '(unnamed)')
        have.add(re.sub(r'[-_ ]?loop$', '', nm.lower()))
        print('  %-28s %.2f s   %d bones keyed' % (nm, length, len({c['target'].get('node') for c in a['channels']})))
    want = ['idle', 'walk', 'attack', 'hurt', 'die']
    missing = [w for w in want if not any(w in h for h in have)]
    if anims and missing:
        notes.append('Missing the clips: %s. If they exist under other names, map them in the actor def: "clips": {"walk": "TheirName"}.' % ', '.join(missing))

    print('\nTO DO')
    for n in notes or ['Nothing stands out. Try it in the game.']:
        print('  - ' + n)
    print('\nEngine reminders: models should face +Z in Godot (-Y in Blender); if it walks backwards or sideways set "model_yaw": 180 / 90 / -90 in the actor def.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
