# HaveNot balance job lists: python3 mkjobs.py start|l2|levels|rooms TRIALS  ->  jobs-<which>.json
# start: the six starting builds against Threat 1-3 groups; l2: Level 2 characters with Level 3 gear;
# levels: a Level N character with Level N+1 gear on Threat N+1 (the per-level numbers), and each level-up
# improvement on its own (is any of them clearly the best pick?).
import json, sys
SK = dict(aimErr=0.12, lag=0.2, leadSkill=0.5, careless=0.3, dashSkill=0.15)
G = {
 'T1 roach x6': (1, ['hn-roach']*6),
 'T1 knife x3': (1, ['hn-knife']*3),
 'T1 maintbot x2': (1, ['hn-maintbot']*2),
 'T1 glorexx x2': (1, ['hn-glorexx']*2),
 'T1 mixed': (1, ['hn-roach']*3 + ['hn-knife']*2 + ['hn-maintbot']),
 'T2 chatter-a x6': (2, ['hn-chatter-a']*6),
 'T2 eggbot x4': (2, ['hn-eggbot']*4),
 'T2 slop-tread+2': (2, ['hn-slop-tread'] + ['hn-chatter-a']*2),
 'T2 turret x2+3': (2, ['hn-grime-turret']*2 + ['hn-chatter-a']*3),
 'T3 chatter-g x2': (3, ['hn-chatter-g']*2),
 'T3 grease monkey': (3, ['hn-grease-monkey']),
 'T3 eggbot x6': (3, ['hn-eggbot']*6),
 'T3 princess': (3, ['hn-princess']),
 'T1 deadbot x4': (1, ['hn-deadbot']*4),
 'T1 snapper x2': (1, ['hn-snapper']*2),
 'T2 dancer x3': (2, ['hn-dancer']*3),
 'T2 dancer x4': (2, ['hn-dancer']*4),
}
B = {
 'human handgun': dict(origin='human', gear='handgun'),
 'human scatter': dict(origin='human', gear='scatter'),
 'human gauss': dict(origin='human', gear='gauss'),
 'hyena handgun': dict(origin='hyena', gear='handgun'),
 'hyena scatter': dict(origin='hyena', gear='scatter'),
 'hyena gauss': dict(origin='hyena', gear='gauss'),
 'L2 human carbine+coat': dict(origin='human', gear='handgun', weapons=['hn-soot-carbine'], armor=['hn-sootcoat'], ammo={'rounds': 400}, level=2),
 'L2 human fouler+coat': dict(origin='human', gear='handgun', weapons=['hn-fouler'], armor=['hn-sootcoat'], ammo={'shells': 120}, level=2),
 'L2 human grease+coat': dict(origin='human', gear='handgun', weapons=['hn-grease-thrower'], armor=['hn-sootcoat'], ammo={'grease': 240}, level=2),
 'L2 human scatter+plate': dict(origin='human', gear='scatter', level=2),
 'L2 human gauss': dict(origin='human', gear='gauss', level=2),
}
which = sys.argv[1]; trials = int(sys.argv[2])
if which == 'rooms':
    # the room-function monsters: the six starting builds, and Level 1 with Level 2 gear
    NEW = ['T1 deadbot x4', 'T1 snapper x2', 'T2 dancer x3', 'T2 dancer x4']
    L1G = {'L1 arc carbine+vest': dict(origin='human', gear='handgun', weapons=['hn-arc-carbine'], armor=['hn-vest'], ammo={'cells': 300}, level=1)}
    jobs = []
    for bn, b in list(B.items())[:6] + list(L1G.items()):
        for gn in NEW:
            th, grp = G[gn]
            j = dict(name=bn + ' | ' + gn, group=grp, threat=th, level=1, trials=trials, maxT=90)
            j.update(SK); j.update(b)
            jobs.append(j)
    json.dump(jobs, open('jobs-rooms.json', 'w'))
    print(len(jobs))
    sys.exit(0)
if which == 'levels':
    AMMO = {'rounds': 600, 'shells': 200, 'cells': 300, 'grease': 300}
    L1 = {
     'L1 arc carbine+vest': dict(origin='human', gear='handgun', weapons=['hn-arc-carbine'], armor=['hn-vest'], ammo=AMMO, level=1),
     'L1 plasma musket+coltron': dict(origin='human', gear='handgun', weapons=['hn-plasma-musket'], armor=['hn-coltron'], ammo=AMMO, level=1),
    }
    L2 = {
     'L2 carbine+coat': dict(origin='human', gear='handgun', weapons=['hn-soot-carbine'], armor=['hn-sootcoat'], ammo=AMMO, level=2),
     'L2 fouler+coat': dict(origin='human', gear='handgun', weapons=['hn-fouler'], armor=['hn-sootcoat'], ammo=AMMO, level=2),
     'L2 grease+coat': dict(origin='human', gear='handgun', weapons=['hn-grease-thrower'], armor=['hn-sootcoat'], ammo=AMMO, level=2),
    }
    T2 = [g for g in G if g.startswith('T2')]
    T3 = ['T3 chatter-g x2', 'T3 grease monkey', 'T3 eggbot x6']
    jobs = []
    def add(name, b, gn, extra=None):
        th, grp = G[gn]
        j = dict(name=name + ' | ' + gn, group=grp, threat=th, level=1, trials=trials, maxT=90)
        j.update(SK); j.update(b)
        if extra: j.update(extra)
        jobs.append(j)
    for bn, b in L1.items():
        for gn in T2: add(bn, b, gn)
    for bn, b in L2.items():
        for gn in T3: add(bn, b, gn)
    for boon in ['none', 'tough', 'brawler', 'quick', 'senses', 'tinker', 'hide', 'hands', 'dash', 'medic']:
        for gn in T3: add('L2 carbine+coat +' + boon, L2['L2 carbine+coat'], gn, dict(boons={} if boon == 'none' else {boon: 1}))
    # a whole floor: the three Threat 3 groups back to back, no rest between (maxT covers all three)
    FLOOR = [G[gn][1] for gn in T3]
    for boon in ['none', 'tough', 'brawler', 'quick', 'hide', 'hands', 'dash', 'medic']:
        for bn in ['L2 carbine+coat', 'L2 fouler+coat']:
            j = dict(name=bn + ' +' + boon + ' | T3 floor (3 groups)', group=FLOOR[0], waves=FLOOR[1:], threat=3, level=1, trials=trials, maxT=200)
            j.update(SK); j.update(L2[bn]); j.update(boons={} if boon == 'none' else {boon: 1})
            jobs.append(j)
    for bn, b in L1.items():
        j = dict(name=bn + ' +none | T2 floor (3 groups)', group=G['T2 chatter-a x6'][1], waves=[G['T2 eggbot x4'][1], G['T2 slop-tread+2'][1]], threat=2, level=1, trials=trials, maxT=200)
        j.update(SK); j.update(b)
        jobs.append(j)
    json.dump(jobs, open('jobs-levels.json', 'w'))
    print(len(jobs))
    sys.exit(0)
jobs = []
for bn, b in B.items():
    if which == 'start' and bn.startswith('L2'): continue
    if which == 'l2' and not bn.startswith('L2'): continue
    for gn, (th, grp) in G.items():
        if which == 'l2' and th == 1: continue
        j = dict(name=bn + ' | ' + gn, group=grp, threat=th, level=1, trials=trials, maxT=120 if 'princess' in gn else 90)
        j.update(SK); j.update(b)
        jobs.append(j)
json.dump(jobs, open('jobs-%s.json' % which, 'w'))
print(len(jobs))
