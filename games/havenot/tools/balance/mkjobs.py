# HaveNot balance job lists: python3 mkjobs.py start|l2 TRIALS  ->  jobs-start.json / jobs-l2.json
# start: the six starting builds against Threat 1-3 groups; l2: Level 2 characters with Level 3 gear.
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
