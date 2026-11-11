"""mz.py - the modelling library behind every generated model in maze3d.

Runs in Blender (Scripting tab, or `blender -b -P build_all.py`) or with the `bpy`
Python module. It builds meshes from simple parts, binds them to bones, keys
animation clips and writes .glb files the Godot project imports.

Conventions (the engine relies on these; hand-made models must follow them too):
  * Blender units are metres, Z is up. Models FACE Blender's front view (-Y).
  * Materials are looked up BY NAME in the kit's materials.json, so a model only
    has to use the kit's material names. Colours given here are fallbacks.
  * Animation clips are NLA tracks. A clip whose name ends in "-loop" loops.
"""
import bpy, bmesh, math, random
from mathutils import Matrix, Vector, Euler, Quaternion

PALETTE = {}   # name -> dict(color=(r,g,b), metal=, rough=, emit=(r,g,b), energy=, alpha=)


def define_materials(table):
    PALETTE.update(table)


def T(x=0, y=0, z=0):
    return Matrix.Translation((x, y, z))


def R(rx=0, ry=0, rz=0):
    return Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_matrix().to_4x4()


def S(x=1, y=None, z=None):
    y = x if y is None else y
    z = x if z is None else z
    return Matrix.Diagonal((x, y, z, 1))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    p = PALETTE.get(name, {})
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    c = p.get('color', (0.5, 0.5, 0.5))
    b.inputs['Base Color'].default_value = (*c, 1)
    b.inputs['Metallic'].default_value = p.get('metal', 0.0)
    b.inputs['Roughness'].default_value = p.get('rough', 0.6)
    if 'emit' in p:
        b.inputs['Emission Color'].default_value = (*p['emit'], 1)
        b.inputs['Emission Strength'].default_value = p.get('energy', 2.0)
    if p.get('alpha', 1) < 1:
        b.inputs['Alpha'].default_value = p['alpha']
        m.surface_render_method = 'BLENDED'
    return m


class Mesh:
    """Accumulates parts into one mesh. `m.bone = 'name'` binds what follows to a bone."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.mats = []
        self.groups = []
        self.bone = None
        self.M = Matrix()
        self._stack = []

    # --- transform stack
    def push(self, M):
        self._stack.append(self.M)
        self.M = self.M @ M
        return self

    def pop(self):
        self.M = self._stack.pop()
        return self

    # --- internals
    def _mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def _gi(self, name):
        if name not in self.groups:
            self.groups.append(name)
        return self.groups.index(name)

    def _done(self, verts, mat, smooth=False, weights=None):
        mi = self._mi(mat)
        faces = set()
        for v in verts:
            if not v.is_valid:
                continue
            for f in v.link_faces:
                faces.add(f)
            if weights is None and self.bone:
                v[self.dl][self._gi(self.bone)] = 1.0
        for f in faces:
            f.material_index = mi
            f.smooth = smooth
        return verts

    def _bevel(self, verts, amount, seg=1):
        edges = set()
        for v in verts:
            for e in v.link_edges:
                edges.add(e)
        r = bmesh.ops.bevel(self.bm, geom=list(edges), offset=amount, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
        return r['verts']

    # --- primitives (all centred on `at`)
    def box(self, size, at=(0, 0, 0), rot=(0, 0, 0), mat='hull', bevel=0.0, smooth=False):
        M = self.M @ T(*at) @ R(*rot) @ S(*size)
        vs = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)['verts']
        if bevel > 0:
            vs = self._bevel(vs, bevel)
        return self._done(vs, mat, smooth)

    def cyl(self, r, h, at=(0, 0, 0), rot=(0, 0, 0), mat='hull', seg=16, r2=None, smooth=True, caps=True):
        M = self.M @ T(*at) @ R(*rot)
        vs = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)['verts']
        self._done(vs, mat, smooth)
        for v in vs:
            for f in v.link_faces:
                if len(f.verts) > 4:
                    f.smooth = False
        return vs

    def ball(self, r, at=(0, 0, 0), mat='hull', seg=16, scale=(1, 1, 1), rot=(0, 0, 0)):
        M = self.M @ T(*at) @ R(*rot) @ S(*scale)
        vs = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r, matrix=M)['verts']
        return self._done(vs, mat, True)

    def prism(self, pts, depth, at=(0, 0, 0), rot=(0, 0, 0), mat='hull', bevel=0.0):
        """Extrude a flat polygon (pts in XY, counter-clockwise) by `depth` along +Z."""
        M = self.M @ T(*at) @ R(*rot)
        lo = [self.bm.verts.new(M @ Vector((p[0], p[1], 0))) for p in pts]
        hi = [self.bm.verts.new(M @ Vector((p[0], p[1], depth))) for p in pts]
        n = len(pts)
        self.bm.faces.new(list(reversed(lo)))
        self.bm.faces.new(hi)
        for i in range(n):
            j = (i + 1) % n
            self.bm.faces.new([lo[i], lo[j], hi[j], hi[i]])
        vs = lo + hi
        if bevel > 0:
            vs = self._bevel(vs, bevel)
        return self._done(vs, mat, False)

    def lathe(self, profile, at=(0, 0, 0), rot=(0, 0, 0), mat='hull', seg=20, smooth=True):
        """Spin a profile [(radius, z), ...] round Z."""
        M = self.M @ T(*at) @ R(*rot)
        rings = []
        for (r, z) in profile:
            rings.append([self.bm.verts.new(M @ Vector((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z))) for i in range(seg)])
        for a, b in zip(rings, rings[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                self.bm.faces.new([a[i], a[j], b[j], b[i]])
        if profile[0][0] > 1e-5:
            self.bm.faces.new(list(reversed(rings[0])))
        if profile[-1][0] > 1e-5:
            self.bm.faces.new(rings[-1])
        vs = [v for r in rings for v in r]
        self._done(vs, mat, smooth)
        for v in rings[0] + rings[-1]:
            for f in v.link_faces:
                if len(f.verts) > 4:
                    f.smooth = False
        return vs

    def tube(self, path, radius, mat='hull', seg=8, bones=None, cap=True, smooth=True):
        """Sweep a circle along a polyline. `radius` is a number or a function of t (0..1).
        `bones` is a list of bone names spread along the path (weights blend between them)."""
        pts = [self.M @ Vector(p) for p in path]
        n = len(pts)
        rings = []
        up = Vector((0, 0, 1))
        prev_n = None
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)])
            if d.length < 1e-9:
                d = Vector((0, 0, 1))
            d.normalize()
            if prev_n is None:
                a = up if abs(d.dot(up)) < 0.95 else Vector((1, 0, 0))
                nx = d.cross(a).normalized()
            else:
                nx = (prev_n - d * prev_n.dot(d))
                nx = nx.normalized() if nx.length > 1e-6 else d.orthogonal().normalized()
            prev_n = nx
            ny = d.cross(nx)
            t = i / max(1, n - 1)
            r = radius(t) if callable(radius) else radius
            ring = [self.bm.verts.new(p + (nx * math.cos(2 * math.pi * k / seg) + ny * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)]
            if bones:
                f = t * (len(bones) - 1)
                b0 = int(min(math.floor(f), len(bones) - 1))
                b1 = min(b0 + 1, len(bones) - 1)
                w1 = f - b0
                w1 = w1 * w1 * (3 - 2 * w1)
                for v in ring:
                    if w1 < 0.999:
                        v[self.dl][self._gi(bones[b0])] = 1 - w1
                    if w1 > 0.001 and b1 != b0:
                        v[self.dl][self._gi(bones[b1])] = w1
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                self.bm.faces.new([a[i], a[j], b[j], b[i]])
        if cap:
            self.bm.faces.new(list(reversed(rings[0])))
            self.bm.faces.new(rings[-1])
        vs = [v for r in rings for v in r]
        self._done(vs, mat, smooth, weights=True if bones else None)
        return vs

    def ring(self, R_, r, at=(0, 0, 0), rot=(0, 0, 0), mat='hull', seg=24, tseg=8):
        self.push(T(*at) @ R(*rot))
        path = [(R_ * math.cos(2 * math.pi * i / seg), R_ * math.sin(2 * math.pi * i / seg), 0) for i in range(seg)]
        # closed tube: build manually so the seam joins
        pts = [self.M @ Vector(p) for p in path]
        c = self.M @ Vector((0, 0, 0))
        axis = (self.M.to_3x3() @ Vector((0, 0, 1))).normalized()
        rings = []
        for p in pts:
            out = (p - c).normalized()
            rings.append([self.bm.verts.new(p + (out * math.cos(2 * math.pi * k / tseg) + axis * math.sin(2 * math.pi * k / tseg)) * r) for k in range(tseg)])
        for i in range(seg):
            a, b = rings[i], rings[(i + 1) % seg]
            for k in range(tseg):
                j = (k + 1) % tseg
                self.bm.faces.new([a[k], b[k], b[j], a[j]])
        self.pop()
        return self._done([v for r_ in rings for v in r_], mat, True)

    # --- finish
    def to_object(self, collection=None, origin=None):
        """Make the Blender object. `origin` puts the object's pivot there (doors, lids, spinners)."""
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        if origin is not None:
            bmesh.ops.translate(self.bm, verts=self.bm.verts, vec=-Vector(origin))
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for n in self.mats:
            me.materials.append(material(n))
        ob = bpy.data.objects.new(self.name, me)
        (collection or bpy.context.scene.collection).objects.link(ob)
        for g in self.groups:
            ob.vertex_groups.new(name=g)
        if origin is not None:
            ob.location = origin
        return ob


class Rig:
    """An armature. Bones are given head and tail in model space."""

    def __init__(self, name):
        self.name = name
        self.bones = []

    def bone(self, name, head, tail, parent=None, connect=False):
        self.bones.append((name, head, tail, parent, connect))
        return name

    def chain(self, prefix, pts, parent=None):
        names = []
        for i in range(len(pts) - 1):
            n = '%s%d' % (prefix, i + 1)
            self.bone(n, pts[i], pts[i + 1], parent if i == 0 else names[-1])
            names.append(n)
        return names

    def build(self, mesh_obj):
        arm = bpy.data.armatures.new(self.name)
        ob = bpy.data.objects.new(self.name, arm)
        bpy.context.scene.collection.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT')
        for (name, head, tail, parent, connect) in self.bones:
            b = arm.edit_bones.new(name)
            b.head, b.tail = head, tail
            if parent:
                b.parent = arm.edit_bones[parent]
                b.use_connect = connect
        bpy.ops.object.mode_set(mode='OBJECT')
        have = {g.name for g in mesh_obj.vertex_groups}
        for (name, *_r) in self.bones:
            if name not in have:
                mesh_obj.vertex_groups.new(name=name)
        mesh_obj.parent = ob
        mod = mesh_obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = ob
        for pb in ob.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        self.ob = ob
        return ob

    def clip(self, name, length, keys, fps=30):
        """keys: {bone: [(time_s, (rx,ry,rz) degrees in model space, optional (dx,dy,dz), optional (wide, wide2, long))...]}
        The fourth item is a scale in the bone's own terms: across it twice, and along its length (for squash and stretch)."""
        ob = self.ob
        bpy.context.scene.render.fps = fps
        if not ob.animation_data:
            ob.animation_data_create()
        act = bpy.data.actions.new(name)
        ob.animation_data.action = act
        for pb in ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)
        for bone, ks in keys.items():
            pb = ob.pose.bones[bone]
            rest = pb.bone.matrix_local.to_3x3()
            inv = rest.inverted()
            for k in ks:
                t, rot = k[0], k[1]
                Rw = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix()
                pb.rotation_quaternion = (inv @ Rw @ rest).to_quaternion()
                f = t * fps
                pb.keyframe_insert('rotation_quaternion', frame=f)
                if len(k) > 2 and k[2] is not None:
                    pb.location = inv @ Vector(k[2])
                    pb.keyframe_insert('location', frame=f)
                if len(k) > 3:
                    pb.scale = (k[3][0], k[3][2], k[3][1])
                    pb.keyframe_insert('scale', frame=f)
        slot = ob.animation_data.action_slot
        ob.animation_data.action = None
        tr = ob.animation_data.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 0, act)
        try:
            if slot is not None:
                st.action_slot = slot
        except Exception:
            pass
        st.action_frame_end = max(1.0, length * fps)
        for pb in ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.location = (0, 0, 0)


def export(path, objects=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objects or bpy.context.scene.objects):
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_yup=True,
                              export_skins=True, export_materials='EXPORT', export_force_sampling=True,
                              export_optimize_animation_size=True, export_cameras=False, export_lights=False)


def preview(path, look_from=(6, -7, 4), look_at=(0, 0, 1.5), res=(640, 480), samples=12):
    """A quick Cycles picture of the scene, for checking a model without opening Blender."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = res
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.location = look_from
    d = Vector(look_at) - Vector(look_from)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.25, 0.27, 0.3, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sc.world = w
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sc.collection.objects.link(sun)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in (cam, sun):
        bpy.data.objects.remove(o)
