"""adopt.py - take a rigged .glb made somewhere else (Tripo, Meshy, by hand) and give it clips.

    import adopt
    a = adopt.Adopted('actors/source/thing.glb', rename={'tripo::Root': 'root', ...})
    a.clip('walk-loop', 0.3, {'leg_l1_a': [(0, (0, 0, 20)), (0.15, (0, 0, -20)), (0.3, (0, 0, 20))]})
    a.export('actors/thing.glb')

Keys are the same as mz.Rig.clip: {bone: [(seconds, (rx, ry, rz) degrees about the MODEL's axes, optional (dx, dy, dz))]}.
The model's axes are whatever the file has: look at it first (tools/inspect_model.py, a.preview()).
Nothing here changes the mesh, the weights or the textures."""
import bpy, math
from mathutils import Vector, Quaternion, Euler, Matrix
import mz


class Adopted:
    def __init__(self, path, rename=None, world_axes=False):
        self.world_axes = world_axes
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        for o in list(bpy.data.objects):                 # importers leave a bone-shape sphere behind
            if o.type == 'MESH' and not o.vertex_groups and o.name.lower().startswith('icosphere'):
                bpy.data.objects.remove(o)
        self.ob = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
        self.meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        if self.ob.animation_data:                       # whatever came with it is replaced
            self.ob.animation_data_clear()
        for old, new in (rename or {}).items():
            b = self.ob.data.bones.get(old)
            if b is None:
                raise KeyError('no bone called %r' % old)
            b.name = new                                  # vertex groups follow the bone's new name
        for pb in self.ob.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        bpy.context.view_layer.objects.active = self.ob
        self.names = []

    def decimate(self, ratio):
        """Thin the mesh to ratio of its triangles. Weights and UVs survive; do it before writing clips."""
        for m in self.meshes:
            bpy.context.view_layer.objects.active = m
            mod = m.modifiers.new('thin', 'DECIMATE')
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            # the armature modifier must stay last
            while m.modifiers[0].name != 'thin':
                bpy.ops.object.modifier_move_up(modifier='thin')
            bpy.ops.object.modifier_apply(modifier='thin')
        bpy.context.view_layer.objects.active = self.ob

    def bones(self):
        return [b.name for b in self.ob.data.bones]

    def rerig(self, bones, assign):
        """Throw the skeleton away and build a new one. For machines, where every part is rigid.
        bones: [(name, parent or None, head, tail)] in world space. assign(world position, set of old bone names the
        vertex followed) -> the new bone it follows, wholly. The mesh is baked to world space, so afterwards the
        model's axes are the world's and clips need no world_axes."""
        import bmesh
        old = self.ob
        for m in self.meshes:
            names = [g.name for g in m.vertex_groups]
            wm = m.matrix_world.copy()
            pick = []
            for v in m.data.vertices:
                followed = {names[g.group] for g in v.groups if g.weight > 0.25}
                pick.append(assign(wm @ v.co, followed))
            for mod in list(m.modifiers):
                if mod.type == 'ARMATURE':
                    m.modifiers.remove(mod)
            m.parent = None
            m.data.transform(wm)
            m.matrix_world = Matrix.Identity(4)
            m.vertex_groups.clear()
            groups = {}
            for i, b in enumerate(pick):
                groups.setdefault(b, []).append(i)
            for b, ids in groups.items():
                m.vertex_groups.new(name=b).add(ids, 1.0, 'REPLACE')
            self.counts = {b: len(ids) for b, ids in groups.items()}
        for o in list(bpy.data.objects):
            if o.type in ('ARMATURE', 'EMPTY'):
                bpy.data.objects.remove(o)
        arm = bpy.data.armatures.new('rig')
        ob = bpy.data.objects.new('rig', arm)
        bpy.context.scene.collection.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT')
        for (name, parent, head, tail) in bones:
            eb = arm.edit_bones.new(name)
            eb.head, eb.tail = Vector(head), Vector(tail)
            if parent:
                eb.parent = arm.edit_bones[parent]
        bpy.ops.object.mode_set(mode='OBJECT')
        for m in self.meshes:
            m.parent = ob
            m.modifiers.new('Armature', 'ARMATURE').object = ob
        for pb in ob.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        self.ob = ob
        self.world_axes = False

    def split_off(self, name, parent, pick, head, tail):
        """Give some of the mesh a bone of its own (a saw blade, a wheel): every vertex for which pick(world position)
        is true follows the new bone and nothing else. head and tail are in world space; the bone spins about that line."""
        inv = self.ob.matrix_world.inverted()
        bpy.context.view_layer.objects.active = self.ob
        bpy.ops.object.mode_set(mode='EDIT')
        eb = self.ob.data.edit_bones.new(name)
        eb.head = inv @ Vector(head)
        eb.tail = inv @ Vector(tail)
        eb.parent = self.ob.data.edit_bones[parent]
        bpy.ops.object.mode_set(mode='OBJECT')
        n = 0
        for m in self.meshes:
            ids = [v.index for v in m.data.vertices if pick(m.matrix_world @ v.co)]
            if not ids:
                continue
            for g in m.vertex_groups:
                g.remove(ids)
            m.vertex_groups.new(name=name).add(ids, 1.0, 'REPLACE')
            n += len(ids)
        self.ob.pose.bones[name].rotation_mode = 'QUATERNION'
        return n

    def clip(self, name, length, keys, fps=30):
        if self.world_axes:                          # the armature sits crooked in the file: keys are in world axes
            M = self.ob.matrix_world.to_3x3().normalized()
            Mi = M.inverted()
            conv = {}
            for b, ks in keys.items():
                out = []
                for k in ks:
                    R = Euler([math.radians(x) for x in k[1]], 'XYZ').to_matrix()
                    e = (Mi @ R @ M).to_euler('XYZ')
                    kk = (k[0], tuple(math.degrees(x) for x in e))
                    if len(k) > 2:
                        kk += (tuple(Mi @ Vector(k[2])),)
                    out.append(kk)
                conv[b] = out
            keys = conv
        mz.Rig.clip(self, name, length, keys, fps)
        self.names.append(name)

    def export(self, path):
        mz.export(path)

    def preview(self, path, clip, t, look_from=(1.6, -1.6, 1.0), look_at=(0, 0, 0.3), res=(560, 420)):
        """A picture of one moment of one clip."""
        ad = self.ob.animation_data
        for tr in ad.nla_tracks:                     # only this clip: the others must not leak into the picture
            tr.mute = True
        for pb in self.ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.location = (0, 0, 0)
        ad.action = bpy.data.actions[clip]
        try:
            ad.action_slot = ad.action.slots[0]
        except Exception:
            pass
        bpy.context.scene.frame_set(int(round(t * bpy.context.scene.render.fps)))
        bpy.context.view_layer.update()
        sc = bpy.context.scene
        sc.view_settings.view_transform = 'Standard'
        mz.preview(path, look_from, look_at, res, 16)
        sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.82, 0.86, 1)
        ad.action = None
        for pb in self.ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.location = (0, 0, 0)
        for tr in ad.nla_tracks:
            tr.mute = False
        bpy.context.scene.frame_set(0)
