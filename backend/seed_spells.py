"""Seed spells for Call of Cthulhu 7th Edition."""
from database import SessionLocal, engine, Base
from models import Spell
from translations_ru import SPELLS_RU

SPELLS = [
    # ── Attack Spells ─────────────────────────────
    {"name": "Shrivelling", "cost_mp": 1, "cost_san": 1, "cast_time": "1 action",
     "category": "attack", "description": "Causes skin to wither and peel from the target.",
     "effect": "Costs variable MP. Each MP spent deals 1d6 damage. POW vs POW opposed roll to hit."},
    {"name": "Wrath of God", "cost_mp": 8, "cost_san": 1, "cast_time": "1 round",
     "category": "attack", "description": "Calls a bolt of lightning from the sky.",
     "effect": "Deals 1d10+4 electrical damage. Outdoors only. Requires storm or dark clouds."},
    {"name": "Fist of Yog-Sothoth", "cost_mp": 3, "cost_san": 1, "cast_time": "1 action",
     "category": "attack", "description": "An invisible force strikes the target.",
     "effect": "Deals 1d6 damage and knocks target back 3 yards. POW vs POW to hit."},
    {"name": "Blast of Decay", "cost_mp": 4, "cost_san": 2, "cast_time": "1 action",
     "category": "attack", "description": "A wave of entropy accelerates rot in living tissue.",
     "effect": "Deals 2d6 damage to one target within 20 yards. POW vs POW."},
    {"name": "Mental Suggestion", "cost_mp": 3, "cost_san": 1, "cast_time": "1 action",
     "category": "attack", "description": "Implants a short command in the target's mind.",
     "effect": "Target must resist with POW vs POW or obey a single brief command."},

    # ── Summon / Contact Spells ───────────────────
    {"name": "Call/Dismiss Byakhee", "cost_mp": 4, "cost_san": 3, "cast_time": "10 minutes",
     "category": "summon", "description": "Summons a Byakhee from interstellar space.",
     "effect": "Requires a visible star. The Byakhee serves for one task, then departs."},
    {"name": "Summon/Bind Dimensional Shambler", "cost_mp": 6, "cost_san": 4, "cast_time": "1 hour",
     "category": "summon", "description": "Opens a rift and pulls a Dimensional Shambler through.",
     "effect": "Binding requires POW vs POW. Unbound Shambler is hostile."},
    {"name": "Contact Ghoul", "cost_mp": 3, "cost_san": 1, "cast_time": "30 minutes",
     "category": "summon", "description": "Sends a psychic call to local ghouls.",
     "effect": "1d4 ghouls arrive within 1d6 hours. Negotiation is separate."},
    {"name": "Summon Star Vampire", "cost_mp": 8, "cost_san": 5, "cast_time": "5 rounds",
     "category": "summon", "description": "Calls an invisible Star Vampire from the void.",
     "effect": "Extremely dangerous. The Star Vampire attacks the nearest source of blood."},
    {"name": "Call Yog-Sothoth", "cost_mp": 0, "cost_san": 10, "cast_time": "1 hour",
     "category": "summon", "description": "The ultimate forbidden summoning.",
     "effect": "Costs 1d10 SAN and all current MP. Success is catastrophic. The Opener of the Way appears."},

    # ── Enchantment Spells ────────────────────────
    {"name": "Create Elder Sign", "cost_mp": 10, "cost_san": 2, "cast_time": "4 hours",
     "category": "enchant", "description": "Inscribes a protective Elder Sign on a surface.",
     "effect": "Wards an area against Mythos entities. Permanent until physically destroyed."},
    {"name": "Enchant Weapon", "cost_mp": 5, "cost_san": 1, "cast_time": "1 hour",
     "category": "enchant", "description": "Imbues a weapon with power to harm Mythos creatures.",
     "effect": "Weapon deals full damage to normally immune entities for 24 hours."},
    {"name": "Brew Space Mead", "cost_mp": 4, "cost_san": 2, "cast_time": "3 hours",
     "category": "enchant", "description": "Creates a potion allowing survival in the vacuum of space.",
     "effect": "Drinker can survive in space/underwater for 1d6 hours. Tastes abominable."},
    {"name": "Create Barrier of Naach-Tith", "cost_mp": 6, "cost_san": 2, "cast_time": "2 rounds",
     "category": "enchant", "description": "Creates a shimmering barrier that blocks passage.",
     "effect": "Creates a 10-foot radius invisible barrier. Lasts 1d4+1 rounds."},

    # ── Divination Spells ─────────────────────────
    {"name": "Augury", "cost_mp": 2, "cost_san": 1, "cast_time": "10 minutes",
     "category": "divination", "description": "Reads omens to predict the near future.",
     "effect": "Keeper provides a cryptic yes/no answer about an immediate plan."},
    {"name": "Contact Deity (Nyarlathotep)", "cost_mp": 8, "cost_san": 5, "cast_time": "1 hour",
     "category": "divination", "description": "Reaches out to the Crawling Chaos.",
     "effect": "Nyarlathotep may answer 1d3 questions. Answers are often misleading."},
    {"name": "See Through Time", "cost_mp": 5, "cost_san": 3, "cast_time": "1 round",
     "category": "divination", "description": "Briefly perceives events at another time.",
     "effect": "Viewer sees 1d6 rounds of activity at a chosen location in the past or future."},
    {"name": "Voorish Sign", "cost_mp": 1, "cost_san": 0, "cast_time": "1 action",
     "category": "divination", "description": "A hand gesture that reveals the invisible.",
     "effect": "Makes invisible Mythos creatures visible for 1d6 rounds within 30 yards."},

    # ── Other / Utility Spells ────────────────────
    {"name": "Body Warping of Gorgoroth", "cost_mp": 6, "cost_san": 3, "cast_time": "5 rounds",
     "category": "other", "description": "Grotesquely reshapes the caster's or target's body.",
     "effect": "STR and SIZ increase by 1d6 each for 1d6 hours. APP drops to 0. 1d6 SAN loss to witnesses."},
    {"name": "Flesh Ward", "cost_mp": 3, "cost_san": 1, "cast_time": "2 rounds",
     "category": "other", "description": "Hardens skin to resist physical damage.",
     "effect": "Provides 2 points of armor for 1d6+1 rounds."},
    {"name": "Cloud Memory", "cost_mp": 2, "cost_san": 1, "cast_time": "1 action",
     "category": "other", "description": "Erases the last few minutes from a target's memory.",
     "effect": "Target loses memory of the last 1d6+1 minutes. POW vs POW to resist."},
    {"name": "Dominate", "cost_mp": 1, "cost_san": 2, "cast_time": "1 action",
     "category": "other", "description": "Exerts mental control over a target.",
     "effect": "Costs 1 MP per round to maintain. Target obeys commands. POW vs POW each round."},
    {"name": "Healing", "cost_mp": 3, "cost_san": 0, "cast_time": "1 round",
     "category": "other", "description": "Mends wounds through Mythos energy.",
     "effect": "Restores 1d6 HP to target. Cannot restore severed limbs or raise the dead."},
]


def seed_spells():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(Spell).count()
    if existing > 0:
        print(f"Spells already seeded ({existing} found). Skipping.")
        db.close()
        return

    for s in SPELLS:
        spell = Spell(**s, name_ru=SPELLS_RU.get(s['name']))
        db.add(spell)

    db.commit()
    print(f"Seeded {len(SPELLS)} spells.")
    db.close()


if __name__ == "__main__":
    seed_spells()
