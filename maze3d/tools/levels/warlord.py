#!/usr/bin/env python3
"""warlord.py - writes games/havenot/levels/warlord_1.json: THE WARLORD'S BUNKER, LEVELS 1 AND 2, one level of two
floors laid out from a written programme (SPEC.md 6.3) as it is entered, a new bunker in every world, in furniture
borrowed from today's kits until the Age of War kit exists. The installation "warlord" (defs/installations.json).

Level 1, the Garrison (storey 0), where the soldiers lived and trained. On the spine, from the blast door: the
gatehouse (the way out), the decontamination tunnel, the motor pool and the drill hall (both sunk a storey: galleries and ramps
down to their floors), communications, and the lift lobby. Wings: two barracks blocks (bunk rooms with a latrine and
showers), the mess with its kitchen, the gym and the firing range, and the officers' wing (the briefing room, the map
room beside it, two offices beside that, the signals and cipher room, the quartermaster's store locked red with its
card in one of the offices). The way down: the lift bank is in lockdown. The stand-down order is pinned up in the map
room; read its code into the communications console and the lifts run.

Level 2, Command and Conditioning (storey -1), where the Marshal's people were patched up and made loyal again. The
lift lobby under the one above; Head Admin, an atrium of records two storeys tall with a gallery; the conditioning
theatre; the specimen hall. Wings: the infirmary (a ward and its pharmacy, the operating theatre, the morgue), Head
Admin's offices (the Chief Administrator's office and the archive through its door, and the administrators'), and the
conditioning wing (induction cells, an interview room, neurology). The way down: one of three key cards calls the lift
to Level 3 at the panel in the lobby, each found its own way: the Chief Administrator's safe (yellow; its code is in
the archive), the chief surgeon's body in the morgue (blue), and the loyalty test in the interview room (green).
Level 3 is not built yet, so the lift down ends the expedition, alive.

Ways in: the blast door (the gatehouse), the vehicle ramp (into the motor pool, on its floor), and a ventilation
shaft (into the gym). Its own test (warlord_1_test.gd) checks the rules, then plays it.

    python3 tools/levels/warlord.py
"""
import levelkit as lk


def room(id, name, style, size, things=(), **more):
    r = {"id": id, "name": name, "style": style, "size": size}
    if things:
        r["things"] = list(things)
    r.update(more)
    return r


def use(prop, prompt, title, text, options, **more):
    """A prop that opens a panel of options (a terminal), standing free on the floor."""
    t = {"prop": prop, "blocks": True,
         "use": {"type": "terminal", "prompt": prompt, "kicker": "The Warlord's Bunker", "title": title, "text": text,
                 "options": options}}
    t.update(more)
    return t


def say(text, kind="info", delay=0.0):
    e = {"type": "message", "text": text, "kind": kind}
    if delay:
        e["delay"] = delay
    return e


LOBBY = [3, 5]
LOCKDOWN = {"flag": "stand_down", "need": "the stand-down order: its code read into the communications console"}

# --- Level 1: the Garrison --------------------------------------------------------------------------------------

blast_door = {"prop": "bk_console", "blocks": True, "tag": "blast_door",
              "use": {"type": "effects", "prompt": "Leave by the blast door", "sound": "servo",
                      "effects": [{"type": "end", "title": "Out of the Warlord's Bunker",
                                   "text": "Back out into the red sand, with what you carried."}]}}

order_sheet = use("an_lectern", "Read the typed sheet", "Pinned to the lectern",
                  "A typed order on Marshal's paper, never sent: ALL UNITS STAND DOWN. AUTHORISATION 4-1-1-KESTREL. "
                  "Somebody has underlined the code twice and written NOT YET beside it.",
                  [{"label": "Remember the code: 4-1-1-KESTREL", "once": True, "close": True,
                    "effects": [{"type": "flag", "name": "stand_down_read"},
                                say("Stand-down code: 4-1-1-KESTREL. The communications console will take it.")]}],
                  tag="order_sheet")

comms_console = use("terminal_desk", "Use the communications console", "Communications",
                    "The console still holds the garrison's last state: LIFT BANK IN LOCKDOWN. AWAITING STAND-DOWN "
                    "AUTHORISATION.",
                    [{"label": "Read in 4-1-1-KESTREL", "when": "stand_down_read", "unless": "stand_down", "once": True,
                      "close": True, "effects": [{"type": "flag", "name": "stand_down"},
                                                  say("STAND-DOWN ACKNOWLEDGED. The lift bank comes out of lockdown.",
                                                      "good")]},
                     {"label": "Look at the lockdown", "unless": "stand_down",
                      "result": "Nothing goes down until somebody authorises the stand-down. The code was never sent."}],
                    tag="comms_console")

garrison = {
    "spine": {"gap": [1, 3]},
    "bank": "lobby",
    "bank_at": [56, 18],
    "rooms": [
        room("gate", "Gatehouse", "bunker_ops", [[4, 5], [4, 5]],
             [blast_door, {"item": "health"}], purpose="gatehouse"),     # no guard in the room you start in
        room("decon", "Decontamination Tunnel", "storage", [3, 3],
             [{"trap": "vent", "period": 4.0, "on": 1.2, "damage": 4}], purpose="decon"),
        room("motor", "Motor Pool", "bunker_hall", [[7, 8], [6, 7]],
             [{"actor": "roach", "count": 2}, {"actor": "deadbot"}, {"start": "ramp", "face": "e"}, {"item": "fuel_cell"}],
             purpose="motor_pool", down=1),
        room("drill", "Drill Hall", "bunker_hall", [[7, 8], [6, 7]],
             [{"actor": "plodder"}, {"actor": "monoid", "patrol": "room"}, {"item": "crystal"}], purpose="drill_hall", down=1),
        room("comms", "Communications", "bunker_ops", [[4, 5], [4, 5]], [comms_console], purpose="communications"),
        room("lobby", "Lift Lobby", "machine", LOBBY, purpose="lift_lobby"),
    ],
    "wings": [
        {"id": "barracks_a", "name": "First Barracks", "after": "gate", "side": "n", "rooms": [
            room("bunks_a1", "Bunk Room", "barracks", [[5, 6], [4, 5]], [{"actor": "roach"}], purpose="bunk_room"),
            room("latrine_a", "Latrine", "storage", [2, 3], door_to="bunks_a1", purpose="latrine"),
            room("bunks_a2", "Bunk Room", "barracks", [[5, 6], [4, 5]], [{"item": "chips"}], purpose="bunk_room"),
            room("showers_a", "Showers", "storage", [2, 3], door_to="bunks_a2", purpose="showers"),
        ]},
        {"id": "barracks_b", "name": "Second Barracks", "after": "gate", "side": "s", "rooms": [
            room("bunks_b1", "Bunk Room", "barracks", [[5, 6], [4, 5]], [{"actor": "roach", "count": 2}], purpose="bunk_room"),
            room("latrine_b", "Latrine", "storage", [2, 3], door_to="bunks_b1", purpose="latrine"),
            room("bunks_b2", "Bunk Room", "barracks", [[5, 6], [4, 5]], purpose="bunk_room"),
            room("showers_b", "Showers", "storage", [2, 3], door_to="bunks_b2", purpose="showers"),
        ]},
        {"id": "mess", "name": "Mess Wing", "after": "motor", "side": "any", "rooms": [
            room("mess_hall", "Mess Hall", "bunker_hall", [[6, 7], [5, 6]],
                 [{"actor": "custodian", "off_duty": True}, {"actor": "drone", "patrol": "room"}, {"item": "cookies"}],
                 purpose="mess_hall"),
            room("kitchen", "Kitchen", "storage", [[3, 4], [3, 4]], [{"actor": "custodian", "off_duty": True}],
                 door_to="mess_hall", purpose="kitchen"),
        ]},
        {"id": "training", "name": "Training Wing", "after": "drill", "side": "n", "rooms": [
            room("gym", "Gym", "bunker_hall", [[5, 6], [4, 5]], [{"start": "vent", "face": "s"}], purpose="gym"),
            room("range", "Firing Range", "bunker_hall", [[7, 8], [3, 4]], [{"item": "shells"}], purpose="firing_range"),
        ]},
        {"id": "officers", "name": "Officers' Wing", "after": "drill", "side": "s", "door": True, "rooms": [
            room("briefing", "Briefing Room", "bunker_ops", [[5, 6], [4, 5]], purpose="briefing_room"),
            room("map", "Map Room", "bunker_ops", [[4, 5], [4, 5]], [order_sheet], door_to="briefing", purpose="map_room"),
            room("office_1", "Officer's Office", "bunker_ops", [[3, 4], 3], [{"actor": "monoid", "off_duty": True}],
                 next_to="map", purpose="office"),
            room("office_2", "Officer's Office", "bunker_ops", [[3, 4], 3], next_to="office_1", purpose="office"),
            room("cipher", "Signals and Cipher Room", "lab", [[5, 6], [4, 5]], [{"item": "crystal"}], purpose="cipher_room"),
            room("stores", "Quartermaster's Store", "vault", [[4, 5], [4, 5]],
                 [{"item": "shells"}, {"item": "cells"}, {"item": "armor"}, {"item": "health"}], purpose="quartermaster"),
        ]},
    ],
    "locks": [{"room": "stores", "color": "red", "card": ["office_1", "office_2"]}],
    "lock_door": "door_vault",
}
garrison["rooms"][-1]["lifts"] = {"count": 3, "lock": LOCKDOWN}

# --- Level 2: Command and Conditioning --------------------------------------------------------------------------

def card(color):
    return {"item": "keycard", "color": color}


lift_panel = use("terminal_desk", "Call the lift to Level 3", "The lift to Level 3",
                 "THE ADMIRALTY. AUTHORISED PERSONNEL ONLY. Three slots: COMMAND, MEDICAL, LOYALTY.",
                 [{"label": "Swipe the Chief Administrator's card (COMMAND)", "when": "key_yellow", "close": True,
                   "effects": [{"type": "end", "title": "Down to Level 3",
                                "text": "The lift takes you down towards the Admiralty. (Level 3 is not built yet: the "
                                        "expedition ends here, alive.)"}]},
                  {"label": "Swipe the chief surgeon's card (MEDICAL)", "when": "key_blue", "close": True,
                   "effects": [{"type": "end", "title": "Down to Level 3",
                                "text": "The lift takes you down towards the Admiralty. (Level 3 is not built yet: the "
                                        "expedition ends here, alive.)"}]},
                  {"label": "Swipe the loyalty card (LOYALTY)", "when": "key_green", "close": True,
                   "effects": [{"type": "end", "title": "Down to Level 3",
                                "text": "The lift takes you down towards the Admiralty. (Level 3 is not built yet: the "
                                        "expedition ends here, alive.)"}]},
                  {"label": "Look at the slots", "result": "Any one of the three cards will call it."}], tag="lift_panel")

records = use("hs_cabinet", "Search the records", "Personnel records, Head Admin",
              "Drawer after drawer of loyalty assessments. One file is thicker than the rest: the Chief "
              "Administrator's own, with a safe combination clipped inside the cover, as a precaution.",
              [{"label": "Note the safe combination: 19-04-77", "once": True, "close": True,
                "effects": [{"type": "flag", "name": "admin_code"},
                            say("The Chief Administrator's safe: 19-04-77.")]}], tag="records")

safe = use("an_floorsafe", "Open the safe", "The Chief Administrator's safe",
           "A floor safe, the dial worn smooth at three numbers.",
           [{"label": "Dial 19-04-77", "when": "admin_code", "once": True, "close": True,
             "effects": [{"type": "drop", "items": [card("yellow"), "chips"]},
                         say("Inside: the Chief Administrator's key card, and his pay.", "good")]},
            {"label": "Try the dial", "unless": "admin_code", "result": "It does not open to guesses."}], tag="safe")

surgeon = use("an_body", "Search the chief surgeon", "The chief surgeon",
              "A skeleton in a surgeon's gown over a Marshal's uniform, on the last slab in the row. A key card on a "
              "lanyard round the neck bones.",
              [{"label": "Take the lanyard", "once": True, "close": True,
                "effects": [{"type": "drop", "items": [card("blue")]},
                            say("The chief surgeon's key card. The MEDICAL slot.", "good")]}],
              blocks=False, tag="surgeon")

loyalty = use("terminal_desk", "Take the loyalty test", "LOYALTY ASSESSMENT",
              "The conditioning programme's test still runs. A pleasant voice: answer three questions.",
              [{"label": "Q1: Whom do you serve? (the Marshal)", "unless": "loyal_1", "once": True,
                "effects": [{"type": "flag", "name": "loyal_1"}, say("CORRECT. Question two.")]},
               {"label": "Q2: What is doubt? (a wound the Marshal heals)", "when": "loyal_1", "unless": "loyal_2",
                "once": True, "effects": [{"type": "flag", "name": "loyal_2"}, say("CORRECT. Question three.")]},
               {"label": "Q3: When does the war end? (when the Marshal says)", "when": "loyal_2", "once": True,
                "close": True, "effects": [{"type": "drop", "items": [card("green")]},
                                           say("YOU ARE LOYAL. Your loyalty card is issued.", "good")]},
               {"label": "Answer honestly", "unless": "loyal_2", "close": True,
                "effects": [say("INCORRECT. Please report to Conditioning.", "warn"), {"type": "alarm", "radius": 24}]}],
              tag="loyalty")

command = {
    "spine": {"gap": [1, 3]},
    "rooms": [
        room("lobby", "Lower Lift Lobby", "machine", LOBBY, [lift_panel], purpose="lift_lobby"),
        room("atrium", "Head Admin", "lab", [[7, 8], [6, 7]],
             [{"actor": "mourner", "patrol": "room"}, {"item": "crystal"}], purpose="archive", height=2, door_above=False),
        room("theatre", "Conditioning Theatre", "lab", [[6, 8], [5, 6]], [{"actor": "heavy"}], purpose="theatre"),
        room("specimens", "Specimen Hall", "lab", [[6, 7], [5, 6]],
             [{"actor": "fouler"}, {"actor": "roach", "count": 2}, {"item": "statuette"}], purpose="lab"),
    ],
    "wings": [
        {"id": "infirmary", "name": "Infirmary", "after": "lobby", "side": "any", "rooms": [
            room("ward", "Ward", "lab", [[5, 6], [4, 5]], [{"actor": "eggbot", "off_duty": True}], purpose="ward"),
            room("pharmacy", "Pharmacy", "storage", [3, 3], [{"item": "health", "count": 2}], door_to="ward",
                 purpose="pharmacy"),
            room("surgery", "Operating Theatre", "lab", [[4, 5], [4, 5]], purpose="operating_theatre"),
            room("morgue", "Morgue", "storage", [[4, 5], [4, 5]], [surgeon, {"actor": "mourner"}], purpose="morgue"),
        ]},
        {"id": "admin", "name": "Head Admin's Offices", "after": "atrium", "side": "n", "rooms": [
            room("chief", "Chief Administrator's Office", "bunker_ops", [[4, 5], [3, 4]], [safe], purpose="office"),
            room("archive", "Archive", "storage", [[3, 4], [3, 4]], [records], door_to="chief", purpose="archive"),
            room("admin_1", "Administrator's Office", "bunker_ops", [[3, 4], 3], [{"actor": "monoid", "off_duty": True}],
                 purpose="office"),
            room("admin_2", "Administrator's Office", "bunker_ops", [[3, 4], 3], chance=0.6, purpose="office"),
        ]},
        {"id": "conditioning", "name": "Conditioning Wing", "after": "atrium", "side": "s", "rooms": [
            room("cell_1", "Induction Cell", "storage", [2, 3], [{"actor": "mourner"}], purpose="cell"),
            room("cell_2", "Induction Cell", "storage", [2, 3], next_to="cell_1", purpose="cell"),
            room("interview", "Interview Room", "bunker_ops", [[3, 4], [3, 4]], [loyalty], purpose="interview_room"),
            room("neuro", "Neurology", "lab", [[4, 5], [4, 5]], [{"item": "circuit"}], purpose="lab"),
        ]},
    ],
}
command["rooms"][0]["lifts"] = {"count": 3, "lock": LOCKDOWN}

programme = dict(garrison, below=command)

L = {"id": "warlord_1", "name": "The Warlord's Bunker: Levels 1 and 2", "kit": "omni", "style": "corridor",
     "intro": "The Warlord's Bunker. Level 1, the Garrison: the robots still keep the routine.", "ambient_energy": 0.7,
     "legend": {}, "programme": programme, "things": [],
     "objectives": [{"text": "Get the lift bank out of lockdown.", "done": "stand_down"},
                    {"text": "Level 2: find a card that calls the lift to Level 3.", "done": ["key_yellow", "key_blue", "key_green"]}],
     "triggers": []}
lk.write(L)
up = len(garrison["rooms"]) + sum(len(w["rooms"]) for w in garrison["wings"])
down = len(command["rooms"]) + sum(len(w["rooms"]) for w in command["wings"])
print("written: warlord_1 (%d rooms on Level 1, %d on Level 2)" % (up, down))
