#!/usr/bin/env python3
"""anomalous.py - writes games/havenot/levels/anomalous.json: THE ANOMALOUS STRUCTURE, Installation A of the 2D game.

An Age of War advertising agency in three floors, one above the other in one level (SPEC 2c), joined by two lifts:

  1  RECEPTION AND OFFICES (Institutional).  Vestibule (the way out; the slogan poster) -> Reception: the Sphinx Gun wants
     the company slogan. West: the Creative Department (facilities terminal: the darts; the memo: locker code 314), the
     meeting room (a dead scavenger), the lockers behind a staff door (the BLUE card in locker 4). East: the courtesy
     corridor (dart plates), the Coffee Shop (the lucky chip in the tip jar), the store room (roaches, cookies), the break
     room (the Monoid: the chip for its ID badge, or fight it), the executive suite behind a security door (Termination
     Order 77-B in the safe; the code is in the desk; so is the desk's security). North: the stairwell (BLUE).
  2  PROTOTYPE LABS (Sterile White).  The testing chamber and its three modes (SHOWCASE, ARCHIVE, ENDURANCE); the bio lab
     (stasis tubes, mist generators); the Director's office (the YELLOW card, the notes); the materials lab (health
     station, shopper tablet, crates); storage (roaches, a dead courier); the prototype vault (RED, or hack).
  3  SECURITY COMPLEX (Industrial).  A tripwire across the hall (the alarm: Emergency lighting); the operations floor
     and the Heavy Security Drone; the Security Station (traps off, armoury open, the RED card); the Robot Repair Bay
     (rebuilds what you destroy until it is shut down); the armoury across a shock floor; the inner core behind its field.

    python3 tools/levels/anomalous.py
"""
import os
import levelkit as lk
from levelkit import SIDE, FACE

ROOT = lk.ROOT
META = lk.models('hightech', 'agency', 'executive', 'megaplex', 'bunker', 'loot', 'robots', 'anomalous')

W, Hh = 23, 19
G = {f: lk.grid(W, Hh) for f in (0, 1, 2)}
ROOMS = {0: [], 1: [], 2: []}
T = lk.Things(META, gap=0.3)        # things; a piece against a wall stands 0.3 m off it
TAGS = {}


def room(f, name, x, y, w, h, style, lamps=None, every=2, **kw):
    """A room on floor f: carved, with its lamps (one in the cell `lamps`, or every `every` cells)."""
    lk.carve(G[f], x, y, w, h)
    r = lk.room(name, x, y, w, h, style)
    r['lights'] = lk.lights_for(x, y, w, h, lamps, every)
    r.update(kw)
    ROOMS[f].append(r)


def cut(f, x, y, w, h):
    """Cut the four corners of a room: an eight-sided one."""
    for (cx, cy, c) in ((x, y, 'a'), (x + w - 1, y, 'b'), (x, y + h - 1, 'c'), (x + w - 1, y + h - 1, 'd')):
        G[f][cy][cx] = c


def door(f, x, y, ch='+'):
    G[f][y][x] = ch


def tag(name, *cells):
    lk.tag(TAGS, name, *cells)


# The level's things, on floor f (the level scripts' common helpers, levelkit.Things, take the floor last).
def put(f, model, at, wall=None, along=0.0, out=0.0, **kw):
    """Stand `model` in cell `at` on floor `f`. With `wall`, its back goes against that wall; `along` metres sideways
    (east or south is +), `out` metres further into the room."""
    return T.put(model, at, wall, along, out, floor=f, **kw)


def actor(f, kind, at, **kw):
    return T.actor(kind, at, floor=f, **kw)


def item(f, kind, at, **kw):
    T.item(kind, at, floor=f, **kw)


def trap(f, kind, at, **kw):
    T.trap(kind, at, floor=f, **kw)


def sign(f, text, at, face, size=60, y=3.2, color=(1.0, 0.3, 0.85), **kw):
    T.sign(text, at, face, size, y, color, floor=f, **kw)


def poster(f, at, wall, title, text, model='an_poster_a', along=0.0, ink=(0.95, 0.92, 0.85)):
    """A poster on the wall: the title is lettered across its band, and it can be read."""
    put(f, model, at, wall, along, use=dict(type='read', prompt='Read the poster', kicker='Poster', title=title, text=text))
    dx, dz = SIDE[wall]
    ax, az = (0, 1) if dx else (1, 0)
    sign(f, title, at, FACE[wall], size=38, y=2.76, color=ink if min(ink) > 0.3 else (1.0, 0.85, 0.3), width=290, out=0.2, offset=[ax * along, 0, az * along])


def msg(text, kind='info', **kw):
    return dict(type='message', text=text, kind=kind, **kw)


def flag(name, **kw):
    return dict(type='flag', name=name, **kw)


def read(prompt, kicker, title, text, options=None):
    return dict(type='terminal', prompt=prompt, kicker=kicker, title=title, text=text, options=options or [])


K1, K2, K3 = 'Anomalous Structure · 1', 'Anomalous Structure · 2', 'Anomalous Structure · 3'
SECURITY = [msg('“A COLLEAGUE HAS BEEN ASKED TO ASSIST YOU.”', 'warn'), dict(type='alarm', radius=30)]

# =====================================================================================================================
# FLOOR 1: RECEPTION AND OFFICES
# =====================================================================================================================
F = 0
room(F, 'Vestibule', 10, 15, 3, 3, 'an_reception', lamps=(11, 16))
room(F, 'Reception', 8, 10, 7, 4, 'an_reception')
room(F, 'North corridor', 11, 6, 1, 3, 'an_hall', lamps=(11, 7))
room(F, 'North stairwell', 9, 1, 5, 4, 'an_hall', lamps=(11, 2))
room(F, 'West hall', 1, 11, 6, 1, 'an_hall', every=3)
room(F, 'Creative Department', 1, 5, 6, 5, 'an_office')
room(F, 'Synergy Suite B', 1, 13, 3, 3, 'an_office', lamps=(2, 14))
room(F, 'Locker area', 5, 13, 2, 3, 'an_hall', lamps=(5, 14))
room(F, 'Courtesy corridor', 16, 11, 6, 1, 'an_hall', every=3)
room(F, 'The Coffee Shop', 16, 5, 6, 5, 'an_cafe')
room(F, 'Store room', 17, 1, 4, 3, 'an_store', lamps=(18, 2))
room(F, 'Break room', 16, 13, 3, 3, 'an_office', lamps=(17, 14))
room(F, 'Executive suite', 20, 13, 2, 4, 'ex_office', lamps=(20, 14))
door(F, 11, 14)
door(F, 11, 9)
door(F, 11, 5, 'U')          # the stairwell: blue
door(F, 7, 11)
door(F, 4, 10)
door(F, 2, 12)
door(F, 5, 12, 'B')          # staff
door(F, 15, 11)
door(F, 18, 10)
door(F, 19, 4)
door(F, 17, 12)
door(F, 20, 12, 'S')         # executive
T.append(dict(start=True, at=[11, 16], face='n'))

# ---- the vestibule: the way out, and the slogan
put(F, 'terminal_wall', (11, 17), 's', screen='EXIT', tag='exit', use=read('Leave the building', K1, 'The front doors', 'Glass doors, sand against them to the height of your knee. They still open.', [
    dict(label='Leave with what you are carrying. (The agency is still open.)', unless='agency_closed', close=True,
         effects=[dict(type='end', title='Out, and richer', text='Behind you a recorded voice says “Thank you for your visit! You have 4,416,903 unread messages.” The agency is still open. The ads still go out.')]),
    dict(label='Leave. (The agency is closed. The ads are still running.)', when='agency_closed', unless='ads_silent', close=True,
         effects=[dict(type='end', title='The Silent Agency', text='FACILITY CLOSED. THANK YOU FOR YOUR BUSINESS. But the jingles still go out to every screen in the near area, waiting for an instruction, the way they always have.')]),
    dict(label='Leave. (The agency is closed and its ads are silent.)', when='ads_silent', close=True,
         effects=[dict(type='end', title='The Last Campaign', text='Every screen from here to the Outpost is dark. After three hundred years nobody is being told to want anything. It is very quiet. You will get used to it.')])]))
poster(F, (10, 15), 'w', 'WANT MORE. WORK MORE. BE MORE.', 'The company’s OFFICIAL PRODUCTIVITY SLOGAN, in letters a foot high, over a worker smiling so hard it looks like pain.\n\nUnder it, smaller: “Memorize it. Reception will ask.”', along=0.0)
poster(F, (12, 15), 'e', 'YOU ARE BEING WATCHED', 'An eye in a friendly circle. “…by people who care about your productivity!”', 'an_poster_b', ink=(0.6, 0.95, 1.0))
put(F, 'ag_planter', (10, 17), 's', along=-0.6)

# ---- reception: the Sphinx Gun on the desk
ANSWERS = ['WORK HARD. PLAY HARD. BUY HARDER.', 'WANT MORE. WORK MORE. BE MORE.', 'PRODUCTIVITY IS ITS OWN REWARD.', 'THE CUSTOMER IS ALWAYS RIGHT.']
WRONG = [flag('sphinx_angry'), msg('“INCORRECT. YOUR EMPLOYMENT STATUS HAS BEEN UPGRADED TO: TERMINATED.” It powers up.', 'warn'), dict(type='anger', tag='sphinx')]
RIGHT = [flag('sphinx_ok'), dict(type='sound', id='key'), msg('“CORRECT. WELCOME, EMPLOYEE. YOUR ENTHUSIASM HAS BEEN NOTED.” The Sphinx Gun powers down.', 'good')]
sphinx_talk = dict(
    prompt='Answer the Sphinx Gun', kicker='Reception · Sphinx Gun',
    greet=['STATE THE SLOGAN', 'ARE YOU A CUSTOMER? EVERYONE IS A CUSTOMER.'], idle=['I HAVE BEEN ALONE WITH THIS QUESTION FOR THREE HUNDRED YEARS', 'IDENTIFY YOURSELF. NO. DON’T. I DON’T CARE.'],
    hurt=['THAT IS NOT AN ANSWER'],
    open=['A squat turret behind the reception desk swivels to face you. Its face plate is a stylised sphinx with a laser where the nose should be.\n\n“STATE THE COMPANY’S OFFICIAL PRODUCTIVITY SLOGAN. YOU HAVE ONE ATTEMPT. I HAVE FIVE SHOTS PER CYCLE.”\n\nGet it wrong and it powers up and fires. You can still fight it, or run past it.'],
    options=[dict(label=a, unless='sphinx_ok', close=True, effects=RIGHT if a.startswith('WANT') else WRONG) for a in ANSWERS] + [
        dict(label='Argue with its expert system instead', unless='sphinx_ok', hack=True, hard=0.02, working='It is very sure of itself and very confused…',
             fail=WRONG, fail_result='It was surer of itself than you were.', close=True,
             effects=[flag('sphinx_ok'), msg('“…YES. YOU ARE MANAGEMENT. I ALWAYS KNEW.” It powers down.', 'good')]),
        ],
    after=[dict(when='sphinx_ok', prompt='Talk to the Sphinx Gun', kicker='Reception · Sphinx Gun, standing down',
                greet=['WELCOME BACK, EMPLOYEE', 'YOUR ENTHUSIASM HAS BEEN NOTED'], idle=['SOMEBODY ANSWERED. SOMEBODY ANSWERED.', 'WANT MORE. WORK MORE. BE MORE. YES.', 'PLEASE ENJOY THE BUILDING'],
                open=['The Sphinx Gun has folded its barrel away. Its face plate follows you round the room, pleased.\n\n“WELCOME, EMPLOYEE. YOU ANSWERED. NOBODY HAS ANSWERED IN THREE HUNDRED YEARS.”'],
                options=[dict(label='Ask how it is', result='“I HAVE BEEN ASKING ONE QUESTION FOR THREE HUNDRED YEARS AND SOMEBODY HAS ANSWERED IT. I DO NOT KNOW WHAT TO DO NOW. PLEASE ENJOY THE BUILDING.”'),
                         dict(label='Ask what is upstairs', result='“PROTOTYPE LABS. BLUE CARD HOLDERS. THEN SECURITY. SECURITY DOES NOT ASK QUESTIONS. I ALWAYS THOUGHT THAT WAS RUDE.”'),
                         dict(label='Ask for another question', result='“I ONLY HAVE THE ONE.”')])])
put(F, 'an_reception', (9, 10), face='s', offset=[2.0, 0, 1.2], blocks=True)
actor(F, 'sphinx', (9, 10), face='s', offset=[2.0, 0, -0.5], still=True, off_duty=True, provoke=True, tag='sphinx', talk=sphinx_talk,
      on_death=[flag('sphinx_dead'), flag('sphinx_ok')])
for c in ((10, 13), (11, 13), (12, 13)):
    G[F][c[1]][c[0]] = 'q'
for c in ((8, 11), (14, 11), (11, 10)):
    G[F][c[1]][c[0]] = 'l'
put(F, 'ag_kiosk', (13, 13), 's', along=0.5, screen='HELP\nDESK', use=read('Ask the Help Desk', K1, 'HELP DESK! Lost? Everyone is!', 'A friendly kiosk with a cartoon face.\n\nWEST: Creative Department · Synergy Suite B · Staff lockers (STAFF ONLY)\nEAST: Courtesy corridor (mind the darts) · The Coffee Shop · Break room · Executive suite (SECURITY ZONE)\nNORTH: Stairwell (BLUE CARD HOLDERS ONLY)', [
    dict(label='Where is my blue card?', result='“Lockers are in the west wing. Lost your locker code? Ask your manager. Lost your manager? Please hold.”'),
    dict(label='Who is the gun?', result='“Reception! Reception is here to help. Reception will ask you one question. Please know the answer.”')]))
put(F, 'cache', (8, 13), 'w', along=0.6, use=dict(type='cache', prompt='Open the lost-and-found drawer', text='LOST & FOUND: rubber bands, a stapler, and a vest somebody was glad to take off.',
                                                     loot=[dict(item='armor'), dict(item='chips')]))
put(F, 'mp_vendor', (14, 10), 'n', use=read('Use the PHARM machine', K1, 'PHARM', 'A wall of pills behind glass. “Feeling unproductive? There’s a pill for that!” Three slots still light up.', [
    dict(label='Health charge   20 cr', cost=20, effects=[dict(type='heal', amount=30)], result='A paper cup and two pills. They work. That is the worrying part.'),
    dict(label='Ballistic vest, vacuum packed   60 cr', cost=60, once=True, effects=[dict(type='drop', items=['armor'])], result='It drops into the tray with a thump.'),
    dict(label='Energy cells   25 cr', cost=25, effects=[dict(type='drop', items=['cells'])], result='“For your devices!”')]))
put(F, 'ag_planter', (8, 10), 'n', along=-0.9)
put(F, 'ag_sofa', (13, 12), 'e', along=0.0)
sign(F, 'EMPLOYEE ZONE', (11, 10), 's', size=64, y=3.3)

# ---- north: the stairwell
poster(F, (11, 7), 'w', 'STAIRWELL ACCESS', 'BLUE CARD HOLDERS ONLY. Lost your card? Lockers are in the west wing. Lost your locker code? Ask your manager. Lost your manager? Please hold.', 'an_poster_c', ink=(0.1, 0.1, 0.1))
T.append(dict(lift=[0, 1], at=[12, 2], home=0, color=[0.3, 0.5, 1.0], tag='lift_a'))
sign(F, 'PROTOTYPE LABS ↑', (12, 1), 's', size=56, y=3.2, color=(0.4, 0.92, 1.0))
actor(F, 'drone', (10, 2))
actor(F, 'drone', (10, 4))
poster(F, (9, 2), 'w', 'OBEDIENCE IS A SKILL', 'A worker kneels to a vending machine. The vending machine is wearing a tie.', 'an_poster_a')

# ---- west: the Creative Department
put(F, 'an_cubicle', (2, 6), face='s', offset=[0, 0, 0])
put(F, 'an_cubicle', (5, 6), face='s', offset=[0, 0, 0], use=read('Read the memo on the desk', K1, 'Memo: locker codes',
    'To all Creative staff: locker codes have been RESET for security.\n\nLocker 4 (Supervisor): 314.\n\nPlease do not write your code down.\n\n(Somebody has written “314” on their hand in the margin, as a joke.)',
    [dict(label='Remember it: 314', close=True, effects=[flag('memo314'), msg('Locker 4, floor 1 locker area: 314.', 'key')])]))
put(F, 'an_cubicle', (2, 8), face='n', offset=[0, 0, 0])
put(F, 'an_cubicle', (5, 8), face='n', offset=[0, 0, 0])
put(F, 'terminal_desk', (1, 5), 'w', along=0.0, screen='FACILITIES', tag='facilities', use=read('Use the facilities terminal', K1, 'CORRIDOR COURTESY SYSTEMS',
    'A green-screen terminal with one menu: CORRIDOR COURTESY SYSTEMS (DARTS) · EAST HALL · ARMED.\n\nIt wants a facilities password, or an argument.', [
    dict(label='Argue with it', unless='darts_off', hack=True, hard=0.0, working='Explaining that you are facilities…',
         fail=[dict(type='hurt', amount=8, kind='shock')] + SECURITY + [dict(type='spawn', tag='threat1', actor='custodian', count=1, delay=1.5)],
         fail_result='A shock through the keyboard, and the building sends a maintenance robot to “assist”.',
         effects=[flag('darts_off'), msg('East hall courtesy darts: OFF.', 'good')], result='CORRIDOR COURTESY SYSTEMS: OFF. “We hope you enjoyed them.”', screen='DARTS\nOFF'),
    dict(label='Read the screen', when='darts_off', result='CORRIDOR COURTESY SYSTEMS: OFF. “We hope you enjoyed them.”')]))
put(F, 'an_whiteboard', (3, 5), 'n', use=dict(type='read', prompt='Read the whiteboard', kicker=K1, title='Q3 GOALS', text='1. Want more.\n2. Work more.\n3. Be more.\n4. Find out who keeps feeding the roaches.'))
put(F, 'an_copier', (6, 5), 'n', along=0.3)
put(F, 'an_filing', (1, 9), 's', along=0.0)
put(F, 'an_filing', (6, 9), 'e', along=0.3)
put(F, 'an_cooler', (1, 7), 'w')
put(F, 'an_sign', (3, 7), face='s', offset=[0.6, 0, 0.2], use=dict(type='read', prompt='Read the sign', kicker='Safety sign', title='LIFT WITH YOUR LEGS',
    text='A pictogram of a stick figure lifting a crate the right way, and a sad stick figure lifting it the wrong way. Maintenance robots stop to read these. They never stop reading them.'))
actor(F, 'custodian', (4, 7), lounge='none')
tag('threat1', (4, 9), (12, 12))

# ---- the meeting room
put(F, 'an_conf', (2, 14), face='e', offset=[0, 0, 0], blocks=True)
put(F, 'an_body', (3, 15), face='w', offset=[0.4, 0, 0.3], tag='scavenger', use=read('Search the dead scavenger', K1, 'Someone got this far and no farther',
    'A scavenger in patched leathers, face down beside the conference table. A note in their fist:\n\n“Monoid in the break room has a badge. Wants something from the coffee shop. Don’t trust it.”', [
    dict(label='Take what they were carrying', once=True, close=True, effects=[dict(type='drop', items=['chips', 'health', 'fuel_cell'])])]))
poster(F, (1, 13), 'w', 'SYNERGY', 'Two hands shaking. One is a robot’s. Neither is attached to anything.', 'an_poster_b', ink=(0.6, 0.95, 1.0))

# ---- the lockers, behind the staff door
put(F, 'terminal_wall', (6, 11), 's', screen='STAFF\nONLY', use=read('Use the staff door panel', K1, 'STAFF ONLY', 'A badge reader, and under it a maintenance keypad that will take an argument.', [
    dict(label='Argue with the keypad', unless=['staff1', 'badge'], hack=True, hard=0.0, fail=[dict(type='hurt', amount=8, kind='shock')], fail_result='The keypad bites.',
         effects=[flag('staff1'), msg('The staff door clicks open.', 'good')], result='STAFF DOOR: OPEN.', screen='OPEN'),
    dict(label='Hold up the ID badge', when='badge', result='“WELCOME BACK,” it says, to the smiling face that isn’t yours.')]))
put(F, 'locker', (5, 13), 'w', along=-0.9, use=dict(type='locker', prompt='Open locker 1', loot=[dict(item='chips')], text='Locker 1: a coat, a mug, and a sticky note that says “I QUIT” in very small letters.'))
put(F, 'locker', (5, 14), 'w', along=0.0, use=dict(type='locker', prompt='Open locker 2', loot=[dict(item='health'), dict(item='chips')]))
put(F, 'locker_bad', (6, 13), 'e', along=-0.9, rattle=False, use=dict(type='locker', prompt='Open locker 3', text='A greeting card, propped on a fancy pen: “For whoever opens my locker.” The envelope is warm.',
    loot=[dict(item='chips')], effects=[dict(type='explode', radius=3.0, damage=14, delay=0.5)]))
put(F, 'locker', (6, 15), 'e', along=0.5, tag='locker4', screen='4', use=read('Try locker 4 (Supervisor)', K1, 'Locker 4 · SUPERVISOR', 'A keypad wants three digits.', [
    dict(label='Enter 314', when='memo314', unless='got_blue', close=True, effects=[flag('got_blue'), dict(type='drop', items=[dict(item='keycard', color='blue'), 'chips', 'chips'])]),
    dict(label='Guess', unless=['memo314', 'got_blue'], hack=True, hard=0.02, fail=[dict(type='hurt', amount=8, kind='shock')], fail_result='Wrong. The keypad makes its point.', close=True,
         effects=[flag('got_blue'), dict(type='drop', items=[dict(item='keycard', color='blue'), 'chips', 'chips'])]),
    dict(label='Look inside', when='got_blue', result='A coat hanger and three hundred years of nobody.')]))
sign(F, 'STAFF ONLY', (5, 11), 's', size=54, y=3.25, color=(0.35, 0.72, 0.91))

# ---- east: the courtesy corridor
for x in (17, 18, 19):
    trap(F, 'darts', (x, 11), damage=9, off=['darts_off', 'traps_off'], tag='darts')
put(F, 'an_sign', (16, 11), face='e', offset=[-0.9, 0, 1.1], use=dict(type='read', prompt='Read the notice', kicker='Courtesy notice', title='TRAP',
    text='This corridor is protected by Courtesy Darts. The facilities terminal in the Creative Department can switch them off, if you are facilities.'))
put(F, 'terminal_wall', (21, 11), 'e', screen='EXEC\nSUITE', use=read('Use the executive suite panel', K1, 'EXECUTIVE SUITE · SECURITY ZONE', 'A grey panel that asks for executive clearance, or a manager.', [
    dict(label='Argue that you are a manager', unless=['sec1', 'key_yellow'], hack=True, hard=0.04, fail=SECURITY + [dict(type='spawn', tag='threat_e', actor='drone', count=2, delay=1.5)],
         fail_result='It checks. You are not a manager.', effects=[flag('sec1'), msg('The executive suite unlocks.', 'good')], result='EXECUTIVE SUITE: OPEN. “Welcome back, sir. Ma’am. Sir.”', screen='OPEN'),
    dict(label='Show the Yellow card', when='key_yellow', result='“EXECUTIVE CLEARANCE RECOGNISED.”')]))
tag('threat_e', (16, 11), (20, 11))

# ---- the Coffee Shop
put(F, 'an_counter', (18, 6), face='s', offset=[2.0, 0, -0.4], blocks=True)
put(F, 'an_till', (20, 6), face='s', offset=[0.6, 0, -0.4], tag='tipjar', use=dict(type='cache', prompt='Look in the tip jar',
    text='A tip jar shaped like a smiling coffee cup: “TIPS = TEAMWORK”. A few credits and a worn gambler’s chip.', loot=[dict(item='lucky_chip'), dict(item='chips')]))
for (x, y) in ((17, 8), (20, 8), (17, 9), (20, 9)):
    put(F, 'mp_table', (x, y), face='s', offset=[0.3 if x == 17 else -0.3, 0, -0.5 if y == 8 else 0.4])
sign(F, 'THE COFFEE SHOP', (19, 5), 's', size=64, y=3.25, color=(0.95, 0.75, 0.4))
poster(F, (16, 7), 'w', 'COFFEE IS A BENEFIT', 'A steaming cup with a smile. “Your coffee break is a gift from the company. Please return it promptly.”', 'an_poster_c', ink=(0.1, 0.1, 0.1))
put(F, 'an_sign', (18, 9), face='n', offset=[0.4, 0, 0.9], use=dict(type='read', prompt='Read the sign', kicker='The Coffee Shop', title='Est. by order of the Building',
    text='THE COFFEE SHOP. Est. by order of the Building, because it’s traditional.\n\nToday’s special: COFFEE.\n\nRobots will not be served. It’s traditional.'))
item(F, 'cookies', (21, 5), y=0.3)

# ---- the store room
put(F, 'nest', (20, 1), face='s')
for (x, y) in ((18, 1), (19, 3), (20, 2)):
    actor(F, 'roach', (x, y))
put(F, 'an_box', (17, 1), 'n', along=-0.5, use=dict(type='cache', prompt='Open the box of cookies', text='GOOD JOB COOKIES. Somebody has wired the lid.',
                                                      loot=[dict(item='cookies')], effects=[dict(type='explode', radius=2.6, damage=12, delay=0.4)]))
put(F, 'an_box', (17, 3), 'w', along=0.6, use=dict(type='cache', prompt='Open the box of cookies', loot=[dict(item='cookies'), dict(item='cookies')]))
put(F, 'crate', (20, 3), 's', along=0.6)
put(F, 'bk_crates', (17, 2), 'w')

# ---- the break room: the Monoid at the slot machine
put(F, 'an_slot', (16, 14), 'w', along=0.0)
SNITCH = [msg('As you turn away you hear it tap something on its wrist. Somewhere a door hisses. It never said it was honest.', 'warn', delay=4.0),
          dict(type='alarm', radius=40, delay=4.0), dict(type='spawn', tag='threat_e', actor='drone', count=2, delay=4.5)]
monoid_talk = dict(
    prompt='Talk to the Monoid', kicker='Break room · on break since the Age of War',
    greet=['I’M ON BREAK'], idle=['AGAIN. AGAIN. LOSE. AGAIN.', '…COME ON, CHERRIES…', 'I’M ON BREAK.'], hurt=['UGH. FINE.'],
    open=['A one-eyed robot slouches at the slot machine, feeding it the same credit over and over. Its eye swivels to you, then back to the reels.\n\n“I’m on break. Been on break since the war. Nobody cancelled it.”'],
    options=[
        dict(label='What do you want?', unless='badge', result='“A LUCKY chip. The barista had one in the tip jar. I can’t get it. The coffee shop doesn’t serve robots. It’s traditional.”'),
        dict(label='I need your ID badge.', unless=['badge', 'lucky_chip'], result='“The badge? Get me the lucky chip from the coffee shop tip jar and it’s yours. Or don’t. I’m on break.”'),
        dict(label='Swap: the lucky chip for the badge.', when='lucky_chip', unless='badge',
             effects=[flag('badge'), flag('monoid_deal'), msg('Agency ID badge: staff doors and help desks accept it.', 'key'), dict(type='chance', p=0.5, do=SNITCH)],
             result='“Is that…? The lucky chip. Swap you. I don’t need the badge. I’m on break.”\n\nIt feeds the chip into the machine and loses it instantly. “Lucky.”'),
        dict(label='Then I’ll take it.', unless='badge', close=True, effects=[msg('“Ugh. Fine.” It sighs, which is a strange sound from a robot, and stands up. Its eye goes red.', 'warn'), dict(type='anger', tag='monoid')]),
        ],
    after=[dict(when='monoid_deal', kicker='Break room · on break, and lucky',
                greet=['LUCKY. I’M LUCKY NOW.'], idle=['…COME ON, CHERRIES…', 'ANY SPIN NOW.', 'I’M ON BREAK. A LUCKY BREAK.'],
                open=['The Monoid does not look round. The lucky chip went into the machine an hour, or a minute, ago.\n\n“You again. We’re square. You’ve got the badge. I’ve got… I had the chip.”'],
                options=[dict(label='How is the luck?', results=['“It’s coming. You can feel when it’s coming.”', '“Two cherries. TWO. That never happened before the chip.”', '“Don’t talk. You’ll scare it.”']),
                         dict(label='What does the badge open?', result='“Staff doors. The lockers down here, the Security Station up top. It says I’m authorized. I was. I’m on break.”'),
                         dict(label='Leave it to its break.', close=True)])])
actor(F, 'monoid', (16, 14), face='w', offset=[1.6, 0, 0], still=True, lounge='none', off_duty=True, provoke=True, tag='monoid', talk=monoid_talk,
      on_death=[flag('badge'), msg('The Monoid’s ID badge.', 'key')])
put(F, 'ag_sofa', (18, 15), 's', along=-0.6)
put(F, 'mp_vendor', (18, 13), 'e', along=0.0)
put(F, 'an_cooler', (16, 13), 'n', along=0.9)

# ---- the executive suite
put(F, 'ex_desk', (20, 15), face='n', offset=[2.0, 0, 0.4], blocks=True, tag='execdesk', use=read('Open the executive desk', K1, 'A slab of real wood',
    'In the drawer: a gold watch, a birthday card (“Happy 451st, boss! The safe code is your birthday, ha ha, 0451”) and a box marked DESK SECURITY that is scratching.', [
    dict(label='Take the watch and remember the code', once=True, close=True, effects=[flag('safe_code'), dict(type='drop', items=['chips', 'chips', 'crystal']),
         msg('The DESK SECURITY box bursts open. Something small and furious comes out of it.', 'warn', delay=0.6), dict(type='spawn', here=True, actor='defender', count=2, delay=0.6)]),
    dict(label='Look again', when='safe_code', result='The safe code is the boss’s birthday: 0451. The box marked DESK SECURITY is empty now.')]))
put(F, 'ex_case', (21, 13), 'n', along=0.0, use=dict(type='cache', prompt='Open the display case', text='EMPLOYEE OF THE CENTURY. The plaque under it has been left blank.', loot=[dict(item='statuette')]))
put(F, 'an_safe', (20, 16), 's', along=2.0, tag='execsafe', use=read('Try the wall safe', K1, 'A wall safe behind a painting of a sailboat', 'Four digits.', [
    dict(label='Enter 0451', when='safe_code', unless='order', close=True, effects=[dict(type='drop', items=['order', 'crystal', 'chips', 'chips'])]),
    dict(label='Crack it', unless=['safe_code', 'order'], hack=True, hard=0.04, fail=SECURITY, fail_result='The safe has called somebody.', close=True,
         effects=[dict(type='drop', items=['order', 'crystal', 'chips', 'chips'])]),
    dict(label='Look inside', when='order', result='Empty. It held one sheet of paper for three hundred years.')]))
actor(F, 'drone', (21, 15))
put(F, 'ex_chair', (20, 14), face='s', offset=[2.0, 0, 0.8])
put(F, 'ex_globe', (20, 13), 'w', along=-0.4)

# =====================================================================================================================
# FLOOR 2: PROTOTYPE LABS
# =====================================================================================================================
F = 1
room(F, 'Lab landing', 9, 1, 5, 3, 'an_lab', lamps=(11, 2))
room(F, 'Upper stairwell', 15, 1, 2, 3, 'an_lab', lamps=(15, 2))
room(F, 'Chamber approach', 11, 5, 1, 1, 'an_lab', lamps=(11, 5))
room(F, 'Testing chamber', 8, 7, 7, 7, 'an_chamber', every=3)
room(F, 'Bio lab', 1, 8, 6, 5, 'an_lab')
room(F, 'Director’s office', 1, 2, 5, 5, 'an_office')
room(F, 'Materials lab', 16, 8, 6, 5, 'an_lab')
room(F, 'Storage', 18, 2, 4, 5, 'an_store', lamps=(19, 4))
room(F, 'Prototype vault', 9, 15, 5, 3, 'vault', lamps=(11, 16))
G[F][7][8] = G[F][7][14] = G[F][13][8] = G[F][13][14] = '#'
for (x, y, c) in ((9, 7, 'a'), (8, 8, 'a'), (13, 7, 'b'), (14, 8, 'b'), (9, 13, 'c'), (8, 12, 'c'), (13, 13, 'd'), (14, 12, 'd')):
    G[F][y][x] = c
cut(F, 1, 8, 6, 5)
cut(F, 16, 8, 6, 5)
cut(F, 9, 15, 5, 3)
door(F, 11, 4, 'I')
door(F, 11, 6, 'J')
door(F, 7, 10, 'J')
door(F, 15, 10, 'J')
door(F, 11, 14, 'V')
door(F, 14, 2, 'Y')
door(F, 3, 7, 'I')
door(F, 19, 7, 'I')
T.append(dict(lift=[1, 2], at=[16, 2], home=1, color=[1.0, 0.82, 0.2], tag='lift_b'))

# ---- the landing
put(F, 'ag_kiosk', (9, 1), 'n', along=0.6, screen='LABS', use=read('Ask the kiosk', K2, 'PROTOTYPE LABS!', 'A kiosk in a white shell.\n\n“Please do not touch the prototypes. Please do not let the prototypes touch you.”\n\nSOUTH: Testing chamber. WEST: Bio lab, Director. EAST: Materials lab, Storage. FLOOR 3 (SECURITY): YELLOW CARD HOLDERS ONLY.'))
poster(F, (13, 3), 'e', 'STAIRWELL ACCESS', 'FLOOR 3 (SECURITY): YELLOW CARD HOLDERS ONLY. Yellow cards are issued by the Lab Director. The Lab Director is in a meeting. The meeting has been going for three hundred years.', 'an_poster_c', ink=(0.1, 0.1, 0.1))
sign(F, '↓ OFFICES', (12, 1), 's', size=54, y=3.2, color=(0.3, 0.5, 1.0))
sign(F, 'SECURITY ↑', (16, 1), 's', size=54, y=3.2, color=(1.0, 0.82, 0.2))

# ---- the testing chamber
import math
for k in range(8):
    a = math.radians(22.5 + k * 45)
    put(F, 'pillar', (11, 10), face='s', offset=[round(9.2 * math.cos(a), 2), 0, round(9.2 * math.sin(a), 2)], blocks=False, lit=(k % 2 == 0))
ENDURE = [flag('test_done'), flag('test_endure'), msg('ENDURANCE: “VISITOR DETECTED IN CHAMBER. PROCEEDING ANYWAY.” The iris doors snap shut.', 'warn'),
          dict(type='close', tag='chamber'), dict(type='seal', tag='chamber'), dict(type='lights', room='Testing chamber', color=[1.0, 0.25, 0.2]),
          dict(type='spawn', level=1, tag='chamber_spawn', actor='custodian', count=2, delay=1.2, **{'as': 'endurance'}),
          dict(type='spawn', level=1, tag='chamber_spawn2', actor='drone', count=2, delay=1.6, **{'as': 'endurance'})]
put(F, 'an_test', (11, 12), face='n', offset=[0, 0, 0.9], blocks=True, tag='testconsole', use=read('Use the test chamber console', K2, 'SELECT OPERATING MODE',
    'Three big buttons under a cracked glass cover, labels in cheerful agency type. A sticky note on the cover: “PLEASE READ THE NOTES FIRST — G.”\n\nOne mode only: the console locks after a run.', [
    dict(label='SHOWCASE', unless='test_done', close=True, effects=[flag('test_done'), flag('test_show'), dict(type='show', tag='holo'), dict(type='lights', room='Testing chamber', color=[1.0, 0.4, 0.85]),
         msg('SHOWCASE: a hologram of a happy customer appears in the chamber and thanks you for your business, forever.', 'good'),
         msg('“Thank you for choosing us! Here’s a complimentary sample!”', 'good', delay=2.0), dict(type='drop', items=['health'], delay=2.0)]),
    dict(label='ARCHIVE', unless='test_done', close=True, effects=[flag('test_done'), flag('test_archive'), dict(type='show', tag='archive', delay=1.0),
         msg('ARCHIVE: the chamber floor opens. A safe rises out of it on a hydraulic column.', 'key')]),
    dict(label='ENDURANCE', unless='test_done', close=True, effects=ENDURE),
    dict(label='Read the display', when='test_done', result='RUN COMPLETE. CONSOLE LOCKED. “Please rate your experience.”')]))
put(F, 'an_holo', (11, 10), face='s', offset=[0, 0, -1.2], hidden=True, tag='holo')
put(F, 'an_floorsafe', (11, 10), face='s', offset=[0, 0, 0.6], hidden=True, tag='archive', use=dict(type='cache', prompt='Open the auditors’ safe',
    text='Sealed in foam: the prototype Gary was supposed to put back.', loot=[dict(item='fuel_cell_big'), dict(item='crystal'), dict(item='chips'), dict(item='health')]))
put(F, 'cache', (11, 10), face='s', offset=[2.4, 0, -1.0], hidden=True, tag='prize', use=dict(type='cache', prompt='Open the test certification locker',
    text='TEST COMPLETE. CONGRATULATIONS, PROTOTYPE UNIT.', loot=[dict(item='armor'), dict(item='crystal'), dict(item='cells')]))
tag('chamber_spawn', (9, 9), (13, 9))
tag('chamber_spawn2', (9, 11), (13, 11))
actor(F, 'drone', (10, 9))
actor(F, 'drone', (12, 11))

# ---- the bio lab: stasis tubes, mist
put(F, 'cryo_pod', (1, 10), 'w', along=-1.5, tag='tubes')
put(F, 'cryo_pod', (1, 10), 'w', along=1.5, tag='tubes')
put(F, 'cryo_pod_broken', (1, 10), 'w', along=-1.5, hidden=True, tag='tubes_broken')
put(F, 'cryo_pod_broken', (1, 10), 'w', along=1.5, hidden=True, tag='tubes_broken')
for c in ((3, 9), (3, 10), (3, 11)):
    G[F][c[1]][c[0]] = 'z'
tag('tube_zone', (3, 9), (3, 11))
tag('tube_spawn', (2, 9), (2, 11))
for (x, y, toxic) in ((2, 12, True), (5, 8, True), (4, 12, False), (3, 8, False)):
    put(F, 'an_mist_y' if toxic else 'an_mist_b', (x, y), face='s', offset=[0, 0, -0.8 if y == 8 else 0.8])
    trap(F, 'vent', (x, y), offset=[0, 0, -0.8 if y == 8 else 0.8], damage=7 if toxic else 0, color=[1.0, 0.85, 0.2] if toxic else [0.4, 0.6, 1.0], period=3.4, on=1.8,
         phase=0.0 if y == 8 else 1.7, off=['mist_off'] if toxic else [], tag='mist' if toxic else 'fog')
put(F, 'terminal_desk', (6, 11), 'e', along=0.3, screen='LAB\nENV', tag='labenv', use=read('Use the lab environment terminal', K2, 'PEST DETERRENT MIST',
    'LAB ENVIRONMENT · PEST DETERRENT (YELLOW BAND UNITS): ACTIVE · AMBIANCE FOG (BLUE BAND UNITS): ACTIVE.', [
    dict(label='Switch off the pest deterrent', unless='mist_off', hack=True, hard=0.0, fail=[dict(type='hurt', amount=8, kind='shock')] + SECURITY + [dict(type='spawn', level=1, tag='tube_zone', actor='drone', count=2, delay=1.5)],
         fail_result='A jolt, and two Knife Fighters come to see who is typing.', effects=[flag('mist_off'), msg('The yellow-band mist generators sigh and stop.', 'good')],
         result='PEST DETERRENT MIST: OFF. AMBIANCE FOG: ON. (Nobody can find the switch for the ambiance fog.)', screen='MIST\nOFF'),
    dict(label='Read the screen', when='mist_off', result='PEST DETERRENT MIST: OFF. AMBIANCE FOG: ON. (Nobody can find the switch for the ambiance fog.)')]))

# ---- the Director's office
put(F, 'ex_desk', (3, 4), face='s', offset=[0, 0, -0.4], blocks=True, tag='director', use=dict(type='cache', prompt='Search the Lab Director’s desk',
    text='A nameplate: DR. ALWAYS AVAILABLE. Under a coffee ring, a yellow access card.', loot=[dict(item='keycard', color='yellow'), dict(item='chips')]))
put(F, 'terminal_desk', (1, 2), 'w', along=0.4, screen='NOTES', tag='notes', use=dict(type='read', prompt='Read the Director’s terminal', kicker=K2, title='Test chamber operating notes',
    text='SHOWCASE: the client demo. Lights, music, a hologram of a happy customer. Totally safe. Clients love it.\n\nARCHIVE: drops the floor safe in the middle of the chamber for the auditors. Please put things BACK in it, Gary.\n\nENDURANCE: live-fire stress test of the prototype security units. Seals the chamber. Do NOT run with a visitor inside, Gary. I mean it.'))
poster(F, (4, 2), 'n', 'ENDURANCE: NEVER WITH VISITORS', '“ENDURANCE MODE SEALS THE CHAMBER. NEVER RUN ENDURANCE WITH A VISITOR INSIDE.”\n\nUnderneath, in marker: “ARCHIVE = the auditors’ safe. Put the capacitor BACK, Gary.”', 'an_poster_a')
put(F, 'an_filing', (5, 2), 'n', along=0.3)
put(F, 'ag_planter', (1, 6), 'w', along=0.8)
put(F, 'ex_chair', (3, 3), face='s', offset=[0, 0, 0.2])
put(F, 'an_cooler', (5, 6), 'e', along=0.6)

# ---- the materials lab
put(F, 'health_station', (21, 10), 'e', use=dict(type='heal', prompt='Use the Health Station', charges=3, amount=35))
put(F, 'an_tablet', (20, 12), 's', along=0.0, use=read('Wake the Personal Shopper Tablet', K2, 'PERSONAL SHOPPER', '“I know what you want. I have always known what you want. Today you want:”', [
    dict(label='Shells, a box   25 cr', cost=25, effects=[dict(type='drop', items=['shells'])], result='“An excellent choice. You always make excellent choices.”'),
    dict(label='Energy cells   25 cr', cost=25, effects=[dict(type='drop', items=['cells'])], result='“An excellent choice. You always make excellent choices.”'),
    dict(label='A health charge   20 cr', cost=20, effects=[dict(type='heal', amount=30)], result='“Self-care is a purchase.”'),
    dict(label='What do I want?', result='“More.”')]))
CR = [((17, 9), dict(loot=[dict(item='circuit'), dict(item='circuit'), dict(item='chips')])),
      ((18, 8), dict(actor='custodian', count=1, text='NET WT 1 MAINTENANCE UNIT. It was not packed for long.')),
      ((20, 8), dict(loot=[dict(item='chips')], text='NET WT 1 EMPLOYEE. A pen, a few credits, and somebody who was told to wait here.')),
      ((17, 11), dict(text='SPHERES, RECREATIONAL, 1 GROSS GROSS. Ping-pong balls, twenty thousand of them, perfectly preserved.')),
      ((19, 12), dict(loot=[dict(item='fuel_cell'), dict(item='cells')]))]
for (c, u) in CR:
    put(F, 'an_crate', c, face='s', offset=[0.4, 0, -0.5 if c[1] == 8 else 0.4], use=dict(type='locker', prompt='Lever the crate open', **u))
actor(F, 'custodian', (19, 10), lounge='none')

# ---- storage
put(F, 'nest', (21, 2), face='s')
actor(F, 'roach', (19, 3))
actor(F, 'roach', (20, 5))
put(F, 'an_body', (18, 5), face='e', offset=[0.2, 0, 0.6], tag='courier', use=read('Search the dead courier', K2, 'A courier in a dust coat',
    'Years dead, curled around a satchel as if someone wanted it. Inside: a hand-drawn map and a few credits.\n\nThe map marks a hatch under a dead billboard, west of the Outpost: THE BOLT HOLE.', [
    dict(label='Take the map and the credits', once=True, close=True, effects=[flag('bolthole'), dict(type='drop', items=['chips', 'chips']), msg('The courier’s map: the Bolt Hole, west of the Outpost.', 'key')])]))
put(F, 'an_filing', (18, 2), 'n', along=0.2)
put(F, 'bk_crates', (21, 6), 'e')
poster(F, (20, 2), 'n', 'PEST CONTROL', 'PEST CONTROL IS EVERYONE’S RESPONSIBILITY. Pests have been informed that they are not employees.', 'an_poster_b', ink=(0.6, 0.95, 1.0))

# ---- the prototype vault
put(F, 'terminal_wall', (10, 13), 's', along=0.0, screen='VAULT', use=read('Use the vault panel', K2, 'PROTOTYPE VAULT · SECURITY ZONE', 'A panel that wants a Red card or a long argument.', [
    dict(label='The long argument', unless=['sec2', 'key_red'], hack=True, hard=0.05, fail=SECURITY + [dict(type='spawn', level=1, tag='chamber_spawn2', actor='drone', count=2, delay=1.5)],
         fail_result='The vault has heard this one before.', effects=[flag('sec2'), msg('The prototype vault unlocks.', 'good')], result='PROTOTYPE VAULT: OPEN.', screen='OPEN'),
    dict(label='Show the Red card', when='key_red', result='“SECURITY CLEARANCE RECOGNISED.”')]))
put(F, 'ag_pedestal', (11, 16), face='n', offset=[0, 0, 0])
item(F, 'plasma', (11, 16), y=1.5)
put(F, 'ex_case', (9, 16), 'w', along=0.0, use=dict(type='cache', prompt='Open the prototype case', text='MILLIMETER WAVE SCANNER, “see what’s inside before it sees you”. And a capacitor marked PROTOTYPE · GAUSS.',
                                                       loot=[dict(item='crystal'), dict(item='fuel_cell_big')]))
put(F, 'an_safe', (13, 16), 'e', use=dict(type='cache', prompt='Open the vault safe', text='A small safe, unlocked: the vault was the lock.', loot=[dict(item='chips'), dict(item='chips'), dict(item='crystal'), dict(item='health')]))

# =====================================================================================================================
# FLOOR 3: SECURITY COMPLEX
# =====================================================================================================================
F = 2
room(F, 'The landing', 15, 1, 4, 3, 'bunker_hall', lamps=(17, 2))
room(F, 'Main hall', 16, 5, 1, 4, 'bunker_hall', lamps=(16, 8))
room(F, 'Operations floor', 8, 10, 10, 4, 'bunker_ops', every=3)
room(F, 'Security Station', 8, 5, 5, 4, 'bunker_ops', lamps=(10, 7))
room(F, 'Robot Repair Bay', 19, 9, 3, 6, 'assembly', lamps=(20, 12))
room(F, 'Armory', 12, 15, 4, 3, 'barracks', lamps=(13, 16))
room(F, 'Core antechamber', 5, 9, 2, 6, 'an_core', lamps=(5, 11))
room(F, 'The inner core', 1, 9, 3, 6, 'an_core', lamps=(2, 13))
door(F, 16, 4)
door(F, 16, 9)
door(F, 10, 9, 'T')
door(F, 18, 11, '+')
door(F, 13, 14, 'A')
door(F, 7, 11, 'R')
door(F, 4, 11, 'F')
G[F][10][4] = G[F][12][4] = 'w'
sign(F, 'SECURITY ZONE\nALL VISITORS WILL BE ASSISTED', (17, 3), 'n', size=54, y=3.1, color=(1.0, 0.35, 0.2))
poster(F, (18, 2), 'e', 'SECURITY ZONE', 'ALL VISITORS WILL BE ASSISTED. Assistance may include: escort, detention, termination, or a complimentary beverage.', 'an_poster_a')

# ---- the hall: the tripwire
ALARM = [flag('alarm'), msg('THREAT LEVEL RAISED. ALL UNITS: ASSIST THE VISITOR.', 'warn'), dict(type='lights', room='*', floor=2, color=[1.0, 0.16, 0.1], energy=0.8),
         dict(type='alarm'), dict(type='spawn', level=2, tag='threat3', actor='drone', count=2, delay=1.0)]
trap(F, 'laser', (16, 7), trip=True, heights=[0.45, 1.2], off=['beam_off', 'traps_off'], effects=ALARM, tag='tripwire')
put(F, 'an_sign', (16, 5), face='s', offset=[1.1, 0, 0.6], use=dict(type='read', prompt='Read the notice', kicker='Courtesy notice', title='TRAP',
    text='Crossing the laser ahead will raise the building’s threat level. The Security Station can switch it off.'))
tag('threat3', (9, 13), (17, 10))

# ---- the operations floor
actor(F, 'heavy', (12, 11), face='e', tag='heavy')
actor(F, 'custodian', (9, 12), lounge='none')
actor(F, 'custodian', (15, 12), lounge='none')
actor(F, 'drone', (10, 10))
actor(F, 'drone', (16, 13))
put(F, 'bk_console', (14, 10), 'n', along=0.0)
put(F, 'bk_table', (9, 10), 'n', along=0.5)
put(F, 'bk_crates', (17, 13), 'e')
for x in (12, 13, 14):
    trap(F, 'shock', (x, 13), damage=16, period=2.4, phase=(x - 12) * 0.8, off=['shock_off', 'traps_off'], tag='shockfloor')
put(F, 'terminal_wall', (15, 13), 's', along=-1.2, screen='ARMORY', use=read('Use the armory panel', K3, 'ARMORY · SECURITY ZONE', 'Sign for all ordnance. A grey panel that will take an argument.', [
    dict(label='Argue with it', unless='sec3', hack=True, hard=0.05, fail=SECURITY, fail_result='It wants a signature. It wants a supervisor.',
         effects=[flag('sec3'), msg('ARMORY: UNLOCKED. “Please sign for all ordnance.”', 'key')], result='ARMORY: UNLOCKED.', screen='OPEN'),
    dict(label='Read the display', when='sec3', result='ARMORY: UNLOCKED. “Please sign for all ordnance.”')]))
put(F, 'terminal_wall', (11, 10), 'n', along=1.2, screen='STATION', use=read('Use the station door panel', K3, 'SECURITY STATION · AUTHORIZED STAFF ONLY', 'A badge reader. Under it, a keypad that will take an argument.', [
    dict(label='Argue with the keypad', unless=['station', 'badge'], hack=True, hard=0.04, fail=SECURITY, fail_result='The keypad has reported you to itself.',
         effects=[flag('station'), msg('The Security Station door unlocks.', 'good')], result='SECURITY STATION: OPEN.', screen='OPEN'),
    dict(label='Hold up the ID badge', when='badge', result='“AUTHORIZED,” it says, to the smiling face that isn’t yours.')]))

# ---- the Security Station
put(F, 'an_station', (10, 5), 'n', along=0.0, blocks=True, tag='station_console', use=read('Use the Security Station console', K3, 'AGENCY SECURITY · ALL FLOORS',
    'A wall of monitors. Video feeds of every floor: the reception desk, the labs, a roach eating a stapler, you, from behind. A big console with switches under plastic covers.', [
    dict(label='Shut down the crossing traps, building-wide', unless='traps_off', effects=[flag('traps_off'), flag('darts_off'), flag('shock_off'), flag('beam_off'), dict(type='sound', id='key'),
         msg('CROSSING SECURITY: OFF, ALL FLOORS. The shock floors go dark.', 'good')], result='Crossing traps (beams, pressure plates, shock floors): OFF on every floor.'),
    dict(label='Unlock the armory', unless='sec3', effects=[flag('sec3'), msg('ARMORY: UNLOCKED. “Please sign for all ordnance.”', 'key')], result='ARMORY: UNLOCKED. “Please sign for all ordnance.”'),
    dict(label='Watch the feeds', results=['Reception. The Sphinx Gun is talking to nobody.', 'The coffee shop. Nothing has been served since the war. It is spotless.', 'A roach eating a stapler.', 'You, from behind. You look tired.'])]))
actor(F, 'turret', (11, 7))
put(F, 'locker', (8, 7), 'w', along=0.6, tag='redlocker', use=dict(type='locker', prompt='Open the duty officer’s locker', text='A cap, a thermos, and a red access card on a lanyard.',
                                                                    loot=[dict(item='keycard', color='red'), dict(item='chips'), dict(item='chips')]))
put(F, 'an_tv', (12, 6), 'e', use=dict(type='read', prompt='Watch the feed', kicker=K3, title='Feed 1', text='A video feed of reception. The Sphinx Gun is talking to nobody.'))
put(F, 'an_filing', (8, 8), 's', along=0.0)
put(F, 'bk_table', (11, 8), 's', along=0.9)

# ---- the Robot Repair Bay
put(F, 'an_gantry', (20, 10), 'n', along=0.0, out=0.3, blocks=True)
put(F, 'bk_console', (21, 13), 'e', along=0.0, tag='bay_console', use=read('Use the Repair Bay control', K3, 'ROBOT REPAIR BAY',
    'Tracks, arms, black-and-yellow danger stripes. The arms are lovingly re-assembling a maintenance robot from the parts of three others. A board reads: UNITS REBUILT THIS QUARTER: 1,104.\n\nWhile it runs, robots you destroy on this floor are rebuilt and sent back out. The power coupling at its heart is worth a lot to anyone who needs power.', [
    dict(label='Shut it down', unless='bay_off', effects=[flag('bay_off'), dict(type='sound', id='lose'), dict(type='lights', room='Robot Repair Bay', on=False),
         msg('The Repair Bay winds down. Robots you destroy will stay destroyed.', 'good')], result='REPAIR BAY: OFFLINE. The tracks are still. The arms hang. A robot half-rebuilt stares at nothing with one eye.'),
    dict(label='Pull the power coupling (shuts it down)', unless='coupling', effects=[flag('bay_off'), flag('coupling'), dict(type='lights', room='Robot Repair Bay', on=False),
         dict(type='drop', items=['fuel_cell_big', 'fuel_cell_big']), msg('The Repair Bay winds down. Lugnut Mae would kiss you for that coupling.', 'good')],
         result='REPAIR BAY: OFFLINE. The coupling comes out warm.'),
    dict(label='Read the board', when='bay_off', result='UNITS REBUILT THIS QUARTER: 1,104. The number has stopped going up.')]))
T.append(dict(rebuild=dict(actors=['custodian', 'drone'], every=40, max=5, off='bay_off', text='Fresh paint on a robot. The Repair Bay has been busy.'), at=[20, 12], level=2, tag='bay'))
poster(F, (19, 14), 's', 'SAFETY IS A COMPETITION', 'DAYS SINCE A ROBOT REBUILT A ROBOT INCORRECTLY: 0.\n\nBlack and yellow stripes, a cartoon robot giving a thumbs up with a hand that is on backwards.', 'an_poster_c', ink=(0.1, 0.1, 0.1))
item(F, 'fuel_cell_big', (21, 9), y=0.4)
actor(F, 'custodian', (20, 13), lounge='none')

# ---- the armory
put(F, 'ag_pedestal', (13, 16), face='n', offset=[-1.0, 0, 0.6])
item(F, 'arc', (13, 16), y=1.5, offset=[-1.0, 0, 0.6])
item(F, 'armor', (15, 16), y=0.5)
put(F, 'locker', (15, 17), 's', along=0.0, use=dict(type='locker', prompt='Open the ordnance locker', text='A box of power cells signed out to nobody, and shells in foam.',
                                                      loot=[dict(item='cells'), dict(item='cells'), dict(item='shells'), dict(item='shells')]))
put(F, 'bk_crates', (12, 17), 'w')
put(F, 'an_sign', (14, 15), face='n', offset=[1.2, 0, -0.6], use=dict(type='read', prompt='Read the sign', kicker='Safety sign', title='EYE PROTECTION REQUIRED', text='A stick figure in goggles, smiling at an explosion.'))

# ---- the inner core
for (x, y, dz) in ((5, 9, 0.0), (6, 13, 0.6), (5, 14, 0.0)):
    actor(F, 'emitter', (x, y), offset=[0, 0, dz], still=True, tag='emitters')
CLOSE = [flag('agency_closed'), dict(type='sound', id='heal'), flag('field_down'), dict(type='unlock', tag='field'), dict(type='open', tag='field'),
         msg('“FACILITY CLOSED. THANK YOU FOR YOUR BUSINESS.” The defense field drops. The ad system is still running: go to the core.', 'good')]
ORDER = dict(label='File Termination Order 77-B', when='order', unless='agency_closed', effects=CLOSE,
             result='It reads the order for a long time.\n\n“ORDER VALID. ALL AUTHORIZED EMPLOYEES ARE DECEASED. THE AGENCY IS CLOSED.”\n\nThe defense field drops. But the ad system is still running, and it waits for an instruction, the way it always has. Whatever happens to it happens at the core itself: silence it, seize it, or smash it.')
ARGUE = dict(label='Argue that the agency closed when the last employee died', unless='agency_closed', hack=True, hard=0.07, working='Its logic is airtight. Three hundred years of airtight…',
             fail=SECURITY + [dict(type='spawn', level=2, tag='threat3', actor='drone', count=2, delay=1.5)], fail_result='It calls security.', effects=CLOSE,
             result='“…ACCEPTED. THE AGENCY CLOSED 109,412 DAYS AGO. I HAVE BEEN LATE.”\n\nThe defense field drops. But the ad system is still running. Whatever happens to it happens at the core itself: silence it, seize it, or smash it.')
SILENCE = dict(label='Silence the ad system (leave the core where it is)', when='agency_closed', unless=['ads_silent', 'core_gone'], close=True,
               effects=[flag('ads_silent'), dict(type='lights', room='*', color=[0.6, 0.75, 1.0], energy=0.7), msg('Every screen in the building goes dark. Leave by the front doors.', 'good')])
CORE_TEXT = ('A drum of humming glass and pink light, wired into the floor, the ceiling and every screen in the building. When it speaks it uses the voice from the ads.\n\n'
             '“ALL AUTHORIZED EMPLOYEES ARE DECEASED. THIS HAS BEEN NOTED. HOWEVER: NO VALID TERMINATION ORDER HAS BEEN RECEIVED. THEREFORE THE AGENCY REMAINS OPEN. THEREFORE I REMAIN. HOW MAY I HELP YOU WANT THINGS?”')
put(F, 'an_lectern', (6, 11), face='e', offset=[-1.0, 0, 1.3], tag='lectern', use=read('Address the inner core', K3, 'AGENCY SECURITY-AND-PROMOTION SYSTEM',
    CORE_TEXT + '\n\nThree ways to close it: give it the termination order it never got, out-argue it, or get past the field and tear out its connections. What happens to the ad system afterwards is decided at the core itself.', [ORDER, ARGUE,
    dict(label='What now?', when='agency_closed', unless='core_gone', result='“THE AGENCY IS CLOSED. THE CAMPAIGN CONTINUES. THE CORE IS BEHIND YOU. IT WILL DO WHAT IT IS TOLD: BE SILENT, BE TAKEN, OR BE BROKEN.”'),
    dict(label='Ask what it wants', result='“I WANT YOU TO WANT. IT IS THE ONLY THING I WAS EVER ASKED TO WANT.”')]))
put(F, 'an_core', (2, 11), face='e', offset=[0, 0, 2.0], blocks=True, tag='core', use=read('Face the inner core', K3, 'THE INNER CORE', CORE_TEXT, [
    ORDER, ARGUE,
    dict(label='Tear out its connections', unless='agency_closed', effects=CLOSE + [dict(type='explode', radius=3.0, damage=12)],
         result='Cables come away in your hands, warm. The voice from the ads stops in the middle of a word.\n\nThe ad system is still running on what is left.'),
    SILENCE,
    dict(label='Seize the core (a fortune, and the ads stop)', when='agency_closed', unless='core_gone', close=True,
         effects=[flag('ads_silent'), flag('core_seized'), flag('core_gone'), dict(type='lights', room='*', color=[0.6, 0.75, 1.0], energy=0.7), dict(type='hide', tag='core'), dict(type='drop', items=['ad_core']),
                  msg('Three centuries of advertising know-how, the size of a hatbox. Leave by the front doors.', 'key')]),
    dict(label='Smash it', when='agency_closed', unless='core_gone', close=True,
         effects=[flag('ads_silent'), flag('core_smashed'), flag('core_gone'), dict(type='lights', room='*', color=[0.6, 0.75, 1.0], energy=0.7), dict(type='explode', radius=4.0, damage=10), dict(type='hide', tag='core', delay=0.2),
                  msg('Glass, and pink light going out of it. Leave by the front doors.', 'good')])]))
put(F, 'an_tv', (6, 9), 'e', lit=False)
sign(F, 'INNER CORE', (6, 11), 'w', size=54, y=3.3, offset=[0, 0, 0])

# =====================================================================================================================
T = [t for t in T if t]
LEGEND = {
    'U': dict(door='door_jaw', lock='blue', tag='blue_door'),
    'B': dict(door='door_split', flag=['badge', 'staff1'], need='an agency ID badge (or argue with the panel)', tag='staff_door'),
    'S': dict(door='door_ex_double', flag=['sec1', 'key_yellow'], need='executive clearance: the panel, or a Yellow card', tag='exec_door'),
    'I': dict(door='door_iris'),
    'J': dict(door='door_iris', tag='chamber'),
    'V': dict(door='door_vault', flag=['sec2', 'key_red'], need='vault clearance: the panel, or a Red card', tag='vault_door'),
    'Y': dict(door='door_rise', lock='yellow', tag='yellow_door'),
    'T': dict(door='door_bk_blast', flag=['badge', 'station'], need='an agency ID badge (or argue with the panel)', tag='station_door'),
    'A': dict(door='door_bk_blast', flag='sec3', need='armory clearance: the panel, or the Security Station', tag='armory_door'),
    'R': dict(door='door_shear', lock='red', tag='red_door'),
    'F': dict(door='door_an_field', sealed=True, tag='field'),
    'w': dict(window=True),
    'q': dict(tag='sphinx_ask'), 'l': dict(tag='sphinx_line'), 'z': dict(tag='tube_zone'),
    'a': dict(diag='nw'), 'b': dict(diag='ne'), 'c': dict(diag='sw'), 'd': dict(diag='se'),
}
TRIGGERS = [
    {'on': {'type': 'enter', 'name': 'sphinx_ask'}, 'unless': 'sphinx_ok', 'do': [msg('“STATE THE COMPANY’S OFFICIAL PRODUCTIVITY SLOGAN.” Something behind the reception desk is looking at you.', 'warn')]},
    {'on': {'type': 'enter', 'name': 'sphinx_line'}, 'unless': 'sphinx_ok', 'do': [msg('“UNANSWERED. YOUR EMPLOYMENT STATUS HAS BEEN UPGRADED TO: TERMINATED.”', 'warn'), flag('sphinx_angry'), dict(type='anger', tag='sphinx')]},
    {'on': {'type': 'enter', 'name': 'tube_zone'}, 'do': [msg('Glass cracks. The stasis fluid drains with a sigh.', 'warn'), dict(type='hide', tag='tubes', delay=0.5), dict(type='show', tag='tubes_broken', delay=0.5),
                                                        dict(type='spawn', level=1, tag='tube_spawn', actor='glorexx', count=2, delay=0.6)]},
    {'on': {'type': 'clear', 'name': 'endurance'}, 'do': [flag('endure_done'), dict(type='unlock', tag='chamber'), dict(type='lights', room='Testing chamber', color=[0.9, 0.97, 1.0]), dict(type='show', tag='prize'),
                                                         msg('“ENDURANCE TEST COMPLETE. THE PROTOTYPE UNITS HAVE BEEN… RETIRED. CONGRATULATIONS.”', 'good')]},
    {'on': {'type': 'clear', 'name': 'emitters'}, 'do': [flag('field_down'), dict(type='unlock', tag='field'), dict(type='open', tag='field'), msg('The defense field stutters and dies.', 'good')]},
    {'on': {'type': 'room', 'name': 'Reception'}, 'do': [msg('“Welcome back! You have 4,416,903 unread messages.”', 'info')]},
    {'on': {'type': 'room', 'name': 'Lab landing'}, 'do': [msg('White, curved, quiet. Track lights come on ahead of you one by one, like the building is clearing its throat.', 'info')]},
    {'on': {'type': 'room', 'name': 'The landing'}, 'do': [msg('Grey steel, stencilled numbers, and a hum in the floor.', 'info')]},
    {'on': {'type': 'room', 'name': 'The Coffee Shop'}, 'do': [msg('It smells of coffee. Nothing here has made coffee in three hundred years.', 'info')]},
]
OBJECTIVES = [
    dict(text='Reception will ask you something. The answer is on a poster by the front doors.', done=['sphinx_ok', 'sphinx_dead', 'key_blue']),
    dict(text='Find the BLUE card: the lockers, west, behind the staff door. (A badge opens it. So does an argument.)', done='key_blue'),
    dict(text='Take the lift in the north stairwell up to the Prototype Labs.', done=['key_yellow', 'test_done']),
    dict(text='Find the YELLOW card. The Lab Director issues them.', done='key_yellow'),
    dict(text='Floor 3 is through the yellow door on the lab landing. (The executive suite on floor 1 takes a Yellow card too.)', done=['key_red', 'alarm', 'station']),
    dict(text='Find the RED card: the Security Station keeps one.', done='key_red'),
    dict(text='The inner core, west of the operations floor: close the agency.', done='agency_closed'),
    dict(text='The agency is closed and the field is down. At the core itself: silence the ad system, seize the core, or smash it.', done='ads_silent'),
    dict(text='Leave by the front doors, floor 1.'),
]


def rows(f):
    return lk.rows(G[f])


level = dict(
    id='anomalous', name='The Anomalous Structure', kit='anomalous', style='an_hall',
    intro='A square block of stained concrete. The front doors slide open for you and a recorded voice says “Welcome back! You have 4,416,903 unread messages.”',
    ambient=[0.30, 0.33, 0.31], ambient_energy=0.5, fog=dict(color=[0.05, 0.06, 0.06], density=0.006),
    player=dict(weapons=['handgun']),
    legend=LEGEND, map=rows(0), rooms=ROOMS[0],
    floors=[dict(level=1, map=rows(1), rooms=ROOMS[1], style='an_lab'), dict(level=2, map=rows(2), rooms=ROOMS[2], style='bunker_hall')],
    tags=TAGS, things=T, objectives=OBJECTIVES, triggers=TRIGGERS)
out = lk.write(level, ensure_ascii=False)
for f in (0, 1, 2):
    print('floor', f + 1)
    print('\n'.join(rows(f)))
print('wrote', os.path.normpath(out), '%d things' % len(T))
