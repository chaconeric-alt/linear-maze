"""check_layers.py - finds z-fighting waiting to happen in built models: faces of different materials that lie in the
same plane (or within 2 mm), face the same way and overlap. Only axis-aligned planes are looked at, which is where the
tiles' layers are. Faces that point into a wall or under a floor are listed too; they cannot be seen and do not matter.

    python3 tools/blender/check_layers.py 'kits/*/models/*.glb'        (needs: pip install shapely numpy)

mz.py's Mesh._unfight() separates such layers when a model is built, so this should list little that faces the room.
"""
import json,struct,glob,sys,os
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
def load(f):
    b=open(f,'rb').read(); n=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+n]); bin_=b[20+n+8:]
    def acc(i):
        a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]; off=bv.get('byteOffset',0)+a.get('byteOffset',0)
        comp={5126:('f4',4),5123:('u2',2),5125:('u4',4),5121:('u1',1)}[a['componentType']]; nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        stride=bv.get('byteStride',comp[1]*nc)
        if stride==comp[1]*nc: return np.frombuffer(bin_,dtype=comp[0],count=a['count']*nc,offset=off).reshape(-1,nc)
        return np.array([np.frombuffer(bin_,dtype=comp[0],count=nc,offset=off+k*stride) for k in range(a['count'])])
    out=[]
    # node transforms: apply simple TRS of mesh nodes (no hierarchy)
    for node in j.get('nodes',[]):
        if 'mesh' not in node: continue
        t=np.array(node.get('translation',[0,0,0])); 
        for p in j['meshes'][node['mesh']]['primitives']:
            pos=acc(p['attributes']['POSITION']).astype(float)+t
            idx=acc(p['indices']).reshape(-1,3) if 'indices' in p else np.arange(len(pos)).reshape(-1,3)
            mat=j['materials'][p['material']]['name'] if 'material' in p else '?'
            out.append((mat,pos,idx))
    return out
def check(f):
    planes={}
    for mat,pos,idx in load(f):
        tri=pos[idx]; nrm=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); ar=np.linalg.norm(nrm,axis=1); ok=ar>1e-7
        tri=tri[ok]; nrm=nrm[ok]/ar[ok][:,None]
        for t,n in zip(tri,nrm):
            ax=int(np.argmax(np.abs(n)))
            if abs(n[ax])<0.999: continue          # axis-aligned planes only: where the tiles' layers are
            d=round(float(t[0][ax])*500)/500       # 2 mm
            key=(ax,int(np.sign(n[ax])),d)
            o=[k for k in range(3) if k!=ax]
            planes.setdefault(key,{}).setdefault(mat,[]).append(Polygon(t[:,o]))
    bad=[]
    keys=sorted(planes)
    for key in keys:
        # same plane, or within 2 mm in front/behind with the same facing
        mats=dict(planes[key])
        for key2 in keys:
            if key2[:2]==key[:2] and 0<abs(key2[2]-key[2])<=0.0021 and key2>key:
                for m,v in planes[key2].items(): mats.setdefault(m+'@%.3f'%key2[2],[]).extend(v)
        names=list(mats)
        if len(names)<2: continue
        un={m:unary_union([p for p in mats[m] if p.is_valid and p.area>0]) for m in names}
        for a in range(len(names)):
            for b in range(a+1,len(names)):
                area=un[names[a]].intersection(un[names[b]]).area
                if area>0.01: bad.append((round(area,3),'xyz'[key[0]],key[1],key[2],names[a],names[b]))
    return bad
tot=0
for f in sorted(glob.glob(sys.argv[1])):
    bad=check(f)
    if bad:
        tot+=1
        print(os.path.relpath(f), sum(b[0] for b in bad).__round__(2),'m2:', sorted(bad,reverse=True)[:3])
print(tot,'models with layers fighting')
