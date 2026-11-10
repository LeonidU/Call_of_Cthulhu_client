"""
Call of Cthulhu 7th Edition firearms data.
Each weapon has: name, skill (Firearms specialization), damage dice,
range (yards), rate_of_fire (shots per round), ammo_capacity,
malfunction_number (roll >= this on d100 = jam), era.
"""

FIREARMS = [
    # ── Handguns ──────────────────────────────────
    {
        "name": ".22 Short Derringer",
        "skill": "Firearms (Handgun)",
        "damage": "1d6",
        "range": 10,
        "rate_of_fire": 1,
        "ammo": 1,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".25 Automatic",
        "skill": "Firearms (Handgun)",
        "damage": "1d6+1",
        "range": 10,
        "rate_of_fire": 3,
        "ammo": 6,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".32 Revolver",
        "skill": "Firearms (Handgun)",
        "damage": "1d8",
        "range": 15,
        "rate_of_fire": 3,
        "ammo": 6,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".38 Revolver",
        "skill": "Firearms (Handgun)",
        "damage": "1d10",
        "range": 15,
        "rate_of_fire": 1,
        "ammo": 6,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".45 Automatic (M1911)",
        "skill": "Firearms (Handgun)",
        "damage": "1d10+2",
        "range": 15,
        "rate_of_fire": 1,
        "ammo": 7,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".44 Magnum",
        "skill": "Firearms (Handgun)",
        "damage": "1d10+4",
        "range": 15,
        "rate_of_fire": 1,
        "ammo": 6,
        "malfunction": 100,
        "era": "Modern",
    },
    {
        "name": "9mm Automatic (Glock)",
        "skill": "Firearms (Handgun)",
        "damage": "1d10",
        "range": 15,
        "rate_of_fire": 1,
        "ammo": 17,
        "malfunction": 99,
        "era": "Modern",
    },

    # ── Rifles / Shotguns ─────────────────────────
    {
        "name": ".30-06 Bolt-Action Rifle",
        "skill": "Firearms (Rifle/Shotgun)",
        "damage": "2d6+4",
        "range": 110,
        "rate_of_fire": 1,
        "ammo": 5,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": ".22 Rifle (Bolt-Action)",
        "skill": "Firearms (Rifle/Shotgun)",
        "damage": "1d6",
        "range": 50,
        "rate_of_fire": 1,
        "ammo": 6,
        "malfunction": 100,
        "era": "1920s",
    },
    {
        "name": "12-gauge Shotgun (double-barrel)",
        "skill": "Firearms (Rifle/Shotgun)",
        "damage": "4d6/2d6/1d6",
        "range": 10,
        "rate_of_fire": 2,
        "ammo": 2,
        "malfunction": 100,
        "era": "1920s",
        "notes": "Damage: 4d6 close / 2d6 medium / 1d6 long range",
    },
    {
        "name": "12-gauge Shotgun (pump)",
        "skill": "Firearms (Rifle/Shotgun)",
        "damage": "4d6/2d6/1d6",
        "range": 10,
        "rate_of_fire": 1,
        "ammo": 6,
        "malfunction": 100,
        "era": "1920s",
        "notes": "Damage: 4d6 close / 2d6 medium / 1d6 long range",
    },
    {
        "name": "Hunting Rifle (.308)",
        "skill": "Firearms (Rifle/Shotgun)",
        "damage": "2d6+4",
        "range": 110,
        "rate_of_fire": 1,
        "ammo": 5,
        "malfunction": 100,
        "era": "Modern",
    },

    # ── Submachine Guns ───────────────────────────
    {
        "name": "Thompson SMG",
        "skill": "Firearms (Submachine Gun)",
        "damage": "1d10+2",
        "range": 20,
        "rate_of_fire": 1,
        "ammo": 30,
        "malfunction": 96,
        "era": "1920s",
        "notes": "Full auto: spend 5 rounds, roll once, each additional success = extra hit",
    },
    {
        "name": "MP5",
        "skill": "Firearms (Submachine Gun)",
        "damage": "1d10",
        "range": 20,
        "rate_of_fire": 1,
        "ammo": 30,
        "malfunction": 99,
        "era": "Modern",
    },

    # ── Machine Guns ──────────────────────────────
    {
        "name": "Browning M1917 (water-cooled)",
        "skill": "Firearms (Machine Gun)",
        "damage": "2d6+4",
        "range": 130,
        "rate_of_fire": 1,
        "ammo": 250,
        "malfunction": 96,
        "era": "1920s",
        "notes": "Full auto: burst of 10 rounds",
    },

    # ── Heavy Weapons ─────────────────────────────
    {
        "name": "Dynamite Stick",
        "skill": "Throw",
        "damage": "5d6",
        "range": 0,
        "rate_of_fire": 1,
        "ammo": 1,
        "malfunction": 100,
        "era": "1920s",
        "notes": "5-yard blast radius. DEX roll to throw accurately.",
    },
]


from translations_ru import WEAPONS_RU
for _f in FIREARMS:
    _f["name_ru"] = WEAPONS_RU.get(_f["name"], _f["name"])


def get_firearm(name: str):
    for f in FIREARMS:
        if f["name"].lower() == name.lower():
            return f
    return None


def get_firearms_by_era(era: str = None):
    if not era:
        return FIREARMS
    return [f for f in FIREARMS if f["era"].lower() in (era.lower(), "both")]


def list_firearm_names():
    return [f["name"] for f in FIREARMS]
