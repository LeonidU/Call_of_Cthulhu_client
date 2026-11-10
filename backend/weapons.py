"""All weapons available for character equipment in CoC 7e."""

WEAPONS = [
    # ── Melee Weapons ─────────────────────────────
    {"name": "Fist/Punch", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d3+DB", "era": "Any",
     "notes": "DB = damage bonus based on STR+SIZ"},
    {"name": "Kick", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+DB", "era": "Any"},
    {"name": "Head Butt", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+DB", "era": "Any"},
    {"name": "Knife/Dagger", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+2+DB", "era": "Any"},
    {"name": "Large Knife/Bowie", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d6+DB", "era": "Any"},
    {"name": "Switchblade", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+DB", "era": "Any",
     "notes": "Concealable"},
    {"name": "Hatchet", "type": "melee", "skill": "Fighting (Axe)", "damage": "1d6+DB", "era": "Any"},
    {"name": "Fire Axe", "type": "melee", "skill": "Fighting (Axe)", "damage": "1d8+1+DB", "era": "Any"},
    {"name": "Wood Axe", "type": "melee", "skill": "Fighting (Axe)", "damage": "1d8+2+DB", "era": "Any"},
    {"name": "Rapier/Épée", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d6+1+DB", "era": "Any"},
    {"name": "Saber/Cutlass", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d8+DB", "era": "Any"},
    {"name": "Broadsword", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d8+1+DB", "era": "Any"},
    {"name": "Spear", "type": "melee", "skill": "Fighting (Spear)", "damage": "1d8+1+DB", "era": "Any",
     "notes": "Can be thrown"},
    {"name": "Javelin", "type": "melee", "skill": "Throw", "damage": "1d6+DB", "era": "Any",
     "notes": "Thrown weapon"},
    {"name": "Club/Baton", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d6+DB", "era": "Any"},
    {"name": "Baseball Bat", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d8+DB", "era": "Any"},
    {"name": "Sledgehammer", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d10+3+DB", "era": "Any",
     "notes": "Two-handed, slow"},
    {"name": "Bullwhip", "type": "melee", "skill": "Fighting (Whip)", "damage": "1d3+1", "era": "Any",
     "notes": "Can entangle. No damage bonus"},
    {"name": "Garrote", "type": "melee", "skill": "Fighting (Garrote)", "damage": "1d6", "era": "Any",
     "notes": "Requires surprise. Ongoing strangulation"},
    {"name": "Bayonet (on rifle)", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d8+2+DB", "era": "1920s"},
    {"name": "Chainsaw", "type": "melee", "skill": "Fighting (Chainsaw)", "damage": "2d8", "era": "Modern",
     "notes": "Noisy. No damage bonus"},
    {"name": "Brass Knuckles", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d3+1+DB", "era": "Any"},
    {"name": "Torch (lit)", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d6+fire", "era": "Any",
     "notes": "May ignite flammable targets"},
    {"name": "Katana", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d10+DB", "era": "Any",
     "notes": "Two-handed. Elegant and deadly"},
    {"name": "Wakizashi", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d8+DB", "era": "Any",
     "notes": "Short companion sword. One-handed"},
    {"name": "Machete", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d8+DB", "era": "Any",
     "notes": "Utility blade, common in tropical regions"},
    {"name": "Cavalry Saber", "type": "melee", "skill": "Fighting (Sword)", "damage": "1d8+1+DB", "era": "1920s",
     "notes": "Military issue, curved blade"},
    {"name": "Stiletto", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+DB", "era": "Any",
     "notes": "Concealable thrusting blade. Can impale"},
    {"name": "Crowbar", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d8+DB", "era": "Any",
     "notes": "Also useful for prying open doors and crates"},
    {"name": "Shovel", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d6+DB", "era": "Any"},
    {"name": "Broken Bottle", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d4+DB", "era": "Any",
     "notes": "Improvised. Can cause bleeding"},
    {"name": "Staff/Quarterstaff", "type": "melee", "skill": "Fighting (Brawl)", "damage": "1d8+DB", "era": "Any",
     "notes": "Two-handed. Can parry"},

    # ── Handguns ──────────────────────────────────
    {"name": ".22 Short Derringer", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d6", "range": 10, "rate_of_fire": 1, "ammo": 1, "era": "1920s"},
    {"name": ".25 Automatic", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d6+1", "range": 10, "rate_of_fire": 3, "ammo": 6, "era": "1920s"},
    {"name": ".32 Revolver", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d8", "range": 15, "rate_of_fire": 3, "ammo": 6, "era": "1920s"},
    {"name": ".38 Revolver", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d10", "range": 15, "rate_of_fire": 1, "ammo": 6, "era": "1920s"},
    {"name": ".45 Automatic (M1911)", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d10+2", "range": 15, "rate_of_fire": 1, "ammo": 7, "era": "1920s"},
    {"name": ".44 Magnum", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d10+4", "range": 15, "rate_of_fire": 1, "ammo": 6, "era": "Modern"},
    {"name": "9mm Automatic (Glock)", "type": "handgun", "skill": "Firearms (Handgun)",
     "damage": "1d10", "range": 15, "rate_of_fire": 1, "ammo": 17, "era": "Modern"},

    # ── Rifles / Shotguns ─────────────────────────
    {"name": ".22 Rifle (Bolt-Action)", "type": "rifle", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "1d6", "range": 50, "rate_of_fire": 1, "ammo": 6, "era": "1920s"},
    {"name": ".30-06 Bolt-Action Rifle", "type": "rifle", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "2d6+4", "range": 110, "rate_of_fire": 1, "ammo": 5, "era": "1920s"},
    {"name": "12-gauge Shotgun (double-barrel)", "type": "shotgun", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "4d6/2d6/1d6", "range": 10, "rate_of_fire": 2, "ammo": 2, "era": "1920s",
     "notes": "4d6 close / 2d6 medium / 1d6 long"},
    {"name": "12-gauge Shotgun (pump)", "type": "shotgun", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "4d6/2d6/1d6", "range": 10, "rate_of_fire": 1, "ammo": 6, "era": "1920s",
     "notes": "4d6 close / 2d6 medium / 1d6 long"},
    {"name": "Hunting Rifle (.308)", "type": "rifle", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "2d6+4", "range": 110, "rate_of_fire": 1, "ammo": 5, "era": "Modern"},
    {"name": "AR-15 / M16", "type": "rifle", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "2d6+1", "range": 90, "rate_of_fire": 1, "ammo": 30, "era": "Modern",
     "notes": "Semi-auto. Full auto with burst fire rules"},
    {"name": "AK-47", "type": "rifle", "skill": "Firearms (Rifle/Shotgun)",
     "damage": "2d6+1", "range": 100, "rate_of_fire": 1, "ammo": 30, "era": "Modern",
     "notes": "Highly reliable"},

    # ── Submachine Guns ───────────────────────────
    {"name": "Thompson SMG", "type": "smg", "skill": "Firearms (Submachine Gun)",
     "damage": "1d10+2", "range": 20, "rate_of_fire": 1, "ammo": 30, "era": "1920s",
     "notes": "Full auto: burst of 5 rounds"},
    {"name": "MP5", "type": "smg", "skill": "Firearms (Submachine Gun)",
     "damage": "1d10", "range": 20, "rate_of_fire": 1, "ammo": 30, "era": "Modern"},
    {"name": "Uzi", "type": "smg", "skill": "Firearms (Submachine Gun)",
     "damage": "1d10", "range": 15, "rate_of_fire": 1, "ammo": 32, "era": "Modern",
     "notes": "Compact, concealable"},

    # ── Thrown / Other ────────────────────────────
    {"name": "Dynamite Stick", "type": "explosive", "skill": "Throw",
     "damage": "5d6", "range": 0, "rate_of_fire": 1, "ammo": 1, "era": "1920s",
     "notes": "5-yard blast radius"},
    {"name": "Molotov Cocktail", "type": "explosive", "skill": "Throw",
     "damage": "1d6+fire", "range": 0, "rate_of_fire": 1, "ammo": 1, "era": "Any",
     "notes": "Area fire damage, ongoing"},
]

# Attach Russian names
from translations_ru import WEAPONS_RU
for _w in WEAPONS:
    _w["name_ru"] = WEAPONS_RU.get(_w["name"], _w["name"])

WEAPON_TYPES = ["melee", "handgun", "rifle", "shotgun", "smg", "explosive"]

def get_all_weapons():
    return WEAPONS

def get_weapons_by_type(wtype):
    return [w for w in WEAPONS if w["type"] == wtype]

def get_weapon(name):
    for w in WEAPONS:
        if w["name"].lower() == name.lower():
            return w
    return None
