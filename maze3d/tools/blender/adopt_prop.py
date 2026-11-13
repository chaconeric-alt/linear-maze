"""Bring an outside model (Tripo, Meshy) in as furniture for a kit. It keeps its own textures.
    python3 adopt_prop.py <source.glb> <kit> <id> --height 1.4 [--yaw 180] [--tris 9000] [--tex 2048]
                          [--depth-limit 1.2] [--preview out.png] [--emit 2.0]
Writes kits/<kit>/models/ext/<id>.glb and prints the "models" entry for kits/<kit>/kit.json (use adopt_props.py to do
a batch and write the entries). What it does:
  - joins the meshes, stands the model on the ground at its middle, turns it by --yaw so its front faces -Y (the engine's
    front), and scales it so it is --height metres tall (or --width / --fit W D H: the largest size that fits a box)
  - thins the mesh to about --tris triangles
  - shrinks the textures to --tex pixels and re-saves them as JPEG (normal maps too): a 4K Tripo export is 10 MB, this is ~1
  - measures the box round it: the "solid" the player and monsters collide with
A model's material is left alone by the engine because the kit has no material of that name (LM.dress), so the textures
it came with are what you see. --emit N turns the base colour into a glow of that strength where the texture is bright
and saturated (screens, lamps): crude, but it lights indicator panels without touching the rest."""
import sys, os, math, argparse
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))


def adopt(src, kit, pid, height=None, width=None, fit=None, yaw=0.0, tris=9000, tex=2048, preview=None, views=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in bpy.data.objects:
        o.select_set(o.type == 'MESH')
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.parent = None if ob.parent is None else ob.parent
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.data.objects):
        if o != ob:
            bpy.data.objects.remove(o)
    ob.name = pid
    ob.data.name = pid
    # thin it
    n = len(ob.data.polygons)
    count = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if count > tris * 1.15:
        mod = ob.modifiers.new('thin', 'DECIMATE')
        mod.ratio = tris / count
        bpy.ops.object.modifier_apply(modifier='thin')
    # turn, stand on the ground at its middle, scale
    ob.matrix_world = Matrix.Rotation(math.radians(yaw), 4, 'Z')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    co = [v.co.copy() for v in ob.data.vertices]
    lo = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co)))
    hi = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
    size = hi - lo
    if fit:
        k = min(fit[0] / size.x, fit[1] / size.y, fit[2] / size.z)
    elif width:
        k = width / size.x
    else:
        k = (height or 1.0) / size.z
    mid = (lo + hi) / 2
    ob.matrix_world = Matrix.Scale(k, 4) @ Matrix.Translation((-mid.x, -mid.y, -lo.z))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    size = size * k
    # smaller textures
    for im in bpy.data.images:
        if im.size[0] > tex or im.size[1] > tex:
            im.scale(min(tex, im.size[0]), min(tex, im.size[1]))
    out = os.path.join(ROOT, 'kits', kit, 'models', 'ext', pid + '.glb')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if preview:
        sys.path.insert(0, HERE)
        import mz
        for nm, frm in (views or (('q', (1.9, -2.6, 1.7)),)):
            mz.preview(preview.replace('.png', '_%s.png' % nm), frm, (0, 0, size.z * 0.5), (380, 420), 10)
            bpy.context.scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.7, 0.72, 0.76, 1)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85, export_apply=True, export_yup=True,
                              export_animations=False, export_skins=False)
    recode(out)
    entry = {'model': 'models/ext/%s.glb' % pid, 'type': 'prop', 'solid': [round(size.x * 0.9, 2), round(size.z, 2), round(size.y * 0.9, 2)],
             'source': os.path.basename(src)}
    print('adopted prop %s/%s  %.2f x %.2f x %.2f m (w d h)  %d tris  %.1f MB' % (kit, pid, size.x, size.y, size.z,
          sum(len(p.vertices) - 2 for p in ob.data.polygons), os.path.getsize(out) / 1048576))
    return entry


def recode(path, quality=88):
    """Re-save every image in a .glb as a plain baseline JPEG. Blender's own JPEGs of scaled images are ones Godot's
    loader refuses (the model then comes out white), so they are written again with Pillow and the file repacked."""
    import json, struct, io
    from PIL import Image
    f = open(path, 'rb')
    f.read(12)
    n, _ = struct.unpack('<I4s', f.read(8))
    j = json.loads(f.read(n))
    n2, _ = struct.unpack('<I4s', f.read(8))
    b = f.read(n2)
    f.close()
    img_views = {im['bufferView']: im for im in j.get('images', []) if 'bufferView' in im}
    out = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        d = b[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        if i in img_views:
            im = Image.open(io.BytesIO(d)).convert('RGB')
            buf = io.BytesIO()
            im.save(buf, 'JPEG', quality=quality, subsampling=0 if 'normal' in img_views[i].get('name', '').lower() else 2, progressive=False, optimize=False)
            d = buf.getvalue()
            img_views[i]['mimeType'] = 'image/jpeg'
        while len(out) % 4:
            out.append(0)
        bv['byteOffset'] = len(out)
        bv['byteLength'] = len(d)
        out += d
    while len(out) % 4:
        out.append(0)
    j['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    with open(path, 'wb') as g:
        g.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)))
        g.write(struct.pack('<I4s', len(js), b'JSON'))
        g.write(js)
        g.write(struct.pack('<I4s', len(out), b'BIN\0'))
        g.write(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('kit'); ap.add_argument('id')
    ap.add_argument('--height', type=float); ap.add_argument('--width', type=float); ap.add_argument('--fit', type=float, nargs=3)
    ap.add_argument('--yaw', type=float, default=0.0); ap.add_argument('--tris', type=int, default=9000); ap.add_argument('--tex', type=int, default=2048)
    ap.add_argument('--preview')
    a = ap.parse_args()
    import json
    print(json.dumps(adopt(a.src, a.kit, a.id, a.height, a.width, a.fit, a.yaw, a.tris, a.tex, a.preview)))
