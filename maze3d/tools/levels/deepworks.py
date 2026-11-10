"""Writes games/havenot/levels/deepworks.json: Kaveros Deepworks, Sublevel 1.
Laying a level out in a script keeps the map and the things on it in step; the output is an
ordinary level file and can be edited by hand afterwards.   python3 tools/levels/deepworks.py"""
import json, os

W, Hh = 31, 27
g = [['#'] * W for _ in range(Hh)]
rooms, things, tags = [], [], {}
legend = {
    'A': {'door': 'door_rise'}, 'S': {'door': 'door_split'}, 'J': {'door': 'door_jaw', 'jammed': True}, 'X': {'door': 'door_shear'},
    'B': {'door': 'door_jaw', 'lock': 'blue', 'tag': 'blue_door'},
    'I': {'door': 'door_iris', 'flag': 'reactor_open', 'need': 'power rerouted from the server hall', 'tag': 'reactor_door'},
    'R': {'door': 'door_vault', 'lock': 'red', 'tag': 'vault_door'},
}


def room(name, x, y, w, h, style, height=1, **kw):
    for j in range(y, y + h):
        for i in range(x, x + w):
            g[j][i] = '.'
    rooms.append(dict(name=name, rect=[x, y, w, h], style=style, height=height, **kw))


def hall(cells):
    for (x, y) in cells:
        g[y][x] = '.'


def put(_x, _y, **e):
    e['at'] = [_x, _y]
    things.append(e)


room('Service Airlock', 14, 23, 3, 3, 'corridor')
room('Concourse', 11, 15, 9, 7, 'lab')
room('Specimen Garden', 1, 14, 5, 9, 'ruin')
room('Fabrication', 24, 14, 6, 9, 'machine')
room('Server Hall', 11, 3, 9, 5, 'lab', lights=dict(oy=1))
room('Reactor Hall', 23, 1, 7, 9, 'machine', height=2)
room('Prototype Vault', 2, 2, 6, 7, 'vault')
hall([(7, 18), (8, 18), (9, 18), (21, 18), (22, 18), (15, 9), (15, 10), (15, 11), (15, 12), (15, 13), (21, 5), (22, 5), (8, 5), (9, 5)])
for (x, y, ch) in ((15, 22, 'A'), (10, 18, 'S'), (6, 18, 'J'), (20, 18, 'X'), (23, 18, 'S'), (15, 14, 'S'), (15, 8, 'B'), (20, 5, 'I'), (10, 5, 'R')):
    g[y][x] = ch

# ---- Service Airlock
put(15, 24, start=True, face='n')
put(14, 25, prop='debris')
put(16, 23, item='health')
put(14, 23, sign='KAVEROS DEEPWORKS\nSUBLEVEL 1', face='s', color=[1.0, 0.6, 0.2], size=72, y=3.2)

# ---- Concourse
for (x, y) in ((12, 16), (18, 16), (12, 20), (18, 20)):
    put(x, y, prop='pillar', blocks=True)
put(15, 18, prop='terminal_desk', face='s', screen='KAVEROS\nWELCOME, VISITOR\n> _', use=dict(
    type='terminal', prompt='Use the front desk', kicker='Kaveros Deepworks · Front desk', title='Welcome, valued visitor',
    text='Your host has been notified. Your host has been notified. Your host has been notified.\n\nWaiting time: 109,573 days.',
    options=[
        dict(label='Directory', result='SPECIMEN GARDEN .... west. Closed for pruning.\nFABRICATION ........ east. Hard hats.\nSERVER HALL ........ north. BLUE card.\nREACTOR HALL ....... via Server Hall. Power must be routed.\nPROTOTYPE VAULT .... RED card. Do not ask about the vault.'),
        dict(label='Where is my host?', result='Your host, DR. A. KAVEROS, last badged in at the Specimen Garden.\nShe signed out a BLUE card and did not sign it back in.\nKaveros Applied Wonders reminds you that cards are company property.', effects=[dict(type='flag', name='knows_blue')]),
        dict(label='Complain', result='Your feedback is important.\nIt has been filed under: SPILLS.', effects=[dict(type='spawn', tag='concourse_spawn', actor='roach', count=2)], once=True),
    ]))
put(11, 17, prop='health_station', face='e', use=dict(type='heal', prompt='Use the Kaveros WellPoint', charges=3, amount=35))
put(19, 16, prop='holo_table')
put(13, 21, prop='crate', hp=20, loot=[dict(item='chips')])
put(17, 21, prop='crate', hp=20, loot=[dict(item='cookies')])
put(14, 16, actor='roach')
put(17, 19, actor='roach')
put(12, 18, actor='roach')
put(14, 15, sign='WANT MORE.\nWORK MORE.\nBE MORE.', face='s', y=3.0)
put(19, 20, sign='SPECIMEN GARDEN  ◂\nFABRICATION  ▸', face='w', color=[0.3, 0.9, 1.0], size=56)
tags['concourse_spawn'] = [[13, 15], [17, 15]]

# ---- Specimen Garden (west): the blue card
put(8, 18, prop='debris', solid=False)
for i, y in enumerate((14, 16, 18, 20, 22)):
    put(1, y, prop='cryo_pod_broken' if i in (1, 2, 4) else 'cryo_pod', blocks=True, offset=[-0.6, 0, 0])
put(3, 16, prop='nest')
put(4, 21, prop='nest')
put(5, 14, prop='terminal_wall', face='w', screen='SPECIMEN LOG\nG-7 "GLOREXX"\nSTATUS: OUT', use=dict(
    type='read', prompt='Read the specimen log', kicker='Specimen Garden', title='Line G: Glorexx',
    text='Purpose: executive protection.\nDiet: executives.\n\nNote from Dr. Kaveros: it has learned to open the pods from inside. I am keeping my card on me from now on. If you are reading this, check the cache by pod five.'))
put(2, 22, prop='cache', face='n', use=dict(type='cache', prompt='Open the cache', loot=[dict(item='keycard', color='blue'), dict(item='fuel_cell'), dict(item='shells')]))
put(3, 15, actor='roach', still=True)
put(4, 17, actor='roach')
put(2, 19, actor='roach')
put(5, 20, actor='roach')
put(3, 20, actor='glorexx', still=True, face='n')
put(4, 18, trap='vent', phase=0.0)
put(2, 16, trap='vent', phase=2.0)
put(5, 22, item='crystal')
put(3, 14, item='health')

# ---- Fabrication (east): the scattergun, and the switch for the corridor grid
put(27, 15, prop='fabricator', face='s', blocks=True)
put(29, 18, prop='server_rack', face='w')
put(29, 20, prop='server_rack', face='w')
put(25, 22, prop='crate', hp=20, loot=[dict(item='shells')])
put(26, 22, prop='crate', hp=20)
put(24, 14, prop='barrel', hp=12, explode=dict(radius=5.5, damage=70))
put(28, 21, prop='barrel', hp=12, explode=dict(radius=5.5, damage=70), offset=[0.8, 0, 0])
put(28, 21, prop='barrel', hp=12, explode=dict(radius=5.5, damage=70), offset=[-0.6, 0, 0.7], solid=True)
put(29, 14, prop='cache', face='w', use=dict(type='cache', prompt='Open the tool locker', loot=[dict(item='scattergun'), dict(item='shells'), dict(item='circuit')]))
put(24, 20, prop='terminal_wall', face='e', screen='SECURITY GRID\nNORTH PASSAGE\nARMED', tag='grid_terminal', use=dict(
    type='terminal', prompt='Use the maintenance terminal', kicker='Fabrication · Maintenance', title='North passage security grid',
    text='Beam fence: ARMED.\nFloor conductors: ARMED.\n\nReason: "interns".',
    options=[dict(label='Stand the grid down (bypass, 3 s)', hack=3.0, working='Convincing it you are not an intern…', unless='grid_off', screen='SECURITY GRID\nNORTH PASSAGE\nSTANDING DOWN',
                  result='Grid standing down. The system notes that this is exactly what an intern would do.', effects=[dict(type='flag', name='grid_off'), dict(type='message', text='North passage grid: off.', kind='good')])]))
put(26, 18, actor='custodian', face='w')
put(28, 16, actor='custodian', still=True, face='w')
put(25, 16, actor='roach')
put(27, 20, item='fuel_cell')
put(24, 22, item='armor')

# ---- North passage: beams and a live floor
put(15, 12, trap='laser', cycle=[1.5, 1.3], off='grid_off', damage=14)
put(15, 10, trap='shock', period=2.6, off='grid_off', damage=18)
put(15, 13, sign='AUTHORISED STAFF\nINTERNS: NO', face='e', color=[1.0, 0.2, 0.1], size=56, y=3.3)

# ---- Server Hall (north): reroute the power
for x in (12, 14, 16, 18):
    put(x, 4, prop='server_rack', face='s', blocks=False, offset=[0, 0, -0.9])
    put(x, 6, prop='server_rack', face='n', blocks=False, offset=[0, 0, 0.9])
put(15, 3, prop='terminal_wall', face='s', screen='POWER ROUTING\nREACTOR HALL\nISOLATED', use=dict(
    type='terminal', prompt='Use the routing console', kicker='Server Hall · Power routing', title='Reactor hall is isolated',
    text='The reactor hall was isolated on the last day anyone worked here.\nIts door will not open without power.\n\nThe Monoid on duty would like you to know it has logged your face.',
    options=[dict(label='Route power to the reactor hall (bypass, 4 s)', hack=4.0, working='Rerouting…', unless='reactor_open', screen='POWER ROUTING\nREACTOR HALL\nLIVE',
                  result='Power routed. The iris door east of here is live.\n\nA reminder: the RED card for the Prototype Vault is kept with the reactor, "where nobody will go".',
                  effects=[dict(type='flag', name='reactor_open'), dict(type='message', text='Reactor hall door: powered.', kind='good'), dict(type='quake', strength=0.4)])]))
put(13, 5, actor='monoid', face='s')
put(17, 5, actor='turret')
put(19, 7, actor='roach')
put(11, 3, item='crystal')
put(19, 3, item='cells')
put(11, 7, item='health')

# ---- Reactor Hall (north-east, two storeys): the red card
put(26, 5, prop='reactor', blocks=True)
put(24, 2, actor='turret')
put(28, 8, actor='turret')
put(25, 8, actor='custodian', face='n')
put(28, 3, actor='monoid', face='w')
put(29, 1, prop='cache', face='w', tag='red_cache', use=dict(type='cache', prompt='Open the reactor safe', loot=[dict(item='keycard', color='red', flag='got_red'), dict(item='plasma'), dict(item='cells')]))
put(23, 9, prop='barrel', hp=12, explode=dict(radius=5.5, damage=70))
put(29, 9, prop='crate', hp=20, loot=[dict(item='cells')])
put(26, 2, trap='vent', color=[1.0, 0.6, 0.2], damage=9, phase=0.0)
put(26, 8, trap='vent', color=[1.0, 0.6, 0.2], damage=9, phase=2.0)
put(24, 6, item='fuel_cell_big')
put(23, 1, item='health')
put(26, 1, sign='REACTOR 1 OF 1\nDAYS SINCE INCIDENT: 109,573', face='s', color=[1.0, 0.6, 0.2], size=56, y=5.5)
tags['reactor_spawn'] = [[23, 3], [23, 7], [24, 5]]

# ---- Prototype Vault (north-west): the way out
put(4, 5, prop='pillar', blocks=True)
put(2, 5, prop='terminal_wall', face='e', screen='FREIGHT LIFT\nCALL', use=dict(
    type='terminal', prompt='Call the freight lift', kicker='Prototype Vault', title='Freight lift to the surface',
    text='The lift is at this level. It has been at this level for three hundred years. It is delighted to see you.',
    options=[dict(label='Ride it up with whatever you can carry', close=True, effects=[dict(type='end', title='Out, and richer', text='The lift doors close on Sublevel 1. Something knocks, politely, from Sublevel 2.')])]))
put(3, 3, actor='glorexx', still=True, face='e')
put(6, 7, actor='glorexx', still=True, face='n')
put(5, 2, actor='turret')
put(2, 2, item='statuette')
put(7, 2, item='crystal')
put(2, 8, item='fuel_cell_big')
put(7, 8, item='chips')
put(4, 8, item='circuit')
put(5, 4, prop='cryo_pod', blocks=True)
put(4, 2, sign='PROTOTYPES\nLOOK. DO NOT WANT.', face='s', y=3.0, size=64)

level = dict(
    id='deepworks', name='Kaveros Deepworks · Sublevel 1', kit='hightech', style='corridor',
    intro='Kaveros Deepworks. Nobody has signed the visitor book in three hundred years.',
    ambient=[0.22, 0.28, 0.36], ambient_energy=0.6, fog=dict(color=[0.08, 0.12, 0.15], density=0.014),
    legend=legend, map=[''.join(r) for r in g], rooms=rooms, tags=tags, things=things,
    objectives=[
        dict(text='Look round. The front desk in the Concourse may know something.', done=['knows_blue', 'key_blue']),
        dict(text='Find the BLUE card. Dr. Kaveros took it to the Specimen Garden, west.', done='key_blue'),
        dict(text='Go north through the blue door to the Server Hall. (Fabrication, east, controls the passage grid.)', done=['reactor_open']),
        dict(text='The reactor hall is powered. The RED card is kept with the reactor.', done='key_red'),
        dict(text='Open the Prototype Vault, west of the Server Hall, and find a way out.'),
    ],
    triggers=[
        dict(on=dict(type='flag', name='got_red'), do=[
            dict(type='message', text='REACTOR SAFE OPENED. Housekeeping has been informed.', kind='warn', delay=0.6),
            dict(type='alarm', delay=0.6),
            dict(type='spawn', tag='reactor_spawn', actor='roach', count=5, delay=1.5),
            dict(type='spawn', tag='reactor_spawn', actor='glorexx', count=1, delay=3.0)]),
        dict(on=dict(type='room', name='Prototype Vault'), do=[dict(type='message', text='Something in here has been waiting a long time to protect an executive.', kind='warn')]),
    ],
)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'games', 'havenot', 'levels', 'deepworks.json')
json.dump(level, open(out, 'w'), indent=1)
print('\n'.join(level['map']))
print(len(things), 'things')
