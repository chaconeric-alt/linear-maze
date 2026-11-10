"""adopt.py - take a rigged .glb made somewhere else (Tripo, Meshy, by hand) and give it clips.

    import adopt
    a = adopt.Adopted('actors/source/thing.glb', rename={'tripo::Root': 'root', ...})
    a.clip('walk-loop', 0.3, {'leg_l1_a': [(0, (0, 0, 20)), (0.15, (0, 0, -20)), (0.3, (0, 0, 20))]})
    a.export('actors/thing.glb')

Keys are the same as mz.Rig.clip: {bone: [(seconds, (rx, ry, rz) degrees about the MODEL's axes, optional (dx, dy, dz))]}.
The model's axes are whatever the file has: look at it first (tools/inspect_model.py, a.preview()).
Nothing here changes the mesh, the weights or the textures."""
import bpy, math
from mathutils import Vector, Quaternion, Euler
import mz


class Adopted:
    def __init__(self, path, rename=None):
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

    def bones(self):
        return [b.name for b in self.ob.data.bones]

    def clip(self, name, length, keys, fps=30):
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
