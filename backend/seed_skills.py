"""Seed all Call of Cthulhu 7th Edition skills into the database."""

from database import SessionLocal, engine, Base
from models import Skill
from translations_ru import SKILLS_RU


SKILLS = [
    # (name, base_value, category, is_specialization, parent_skill_name)
    ("Accounting", 5, "standard", False, None),
    ("Animal Handling", 5, "uncommon", False, None),
    ("Anthropology", 1, "standard", False, None),
    ("Appraise", 5, "standard", False, None),
    ("Archaeology", 1, "standard", False, None),

    # Art and Craft specializations
    ("Art and Craft (Acting)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Barber)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Carpentry)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Cooking)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Dancing)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Fine Art)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Forgery)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Photography)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Singing)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Writing)", 5, "standard", True, "Art and Craft"),
    ("Art and Craft (Other)", 5, "standard", True, "Art and Craft"),

    ("Artillery", 1, "uncommon", False, None),
    ("Charm", 15, "standard", False, None),
    ("Climb", 20, "standard", False, None),
    ("Computer Use", 5, "modern", False, None),
    ("Credit Rating", 0, "standard", False, None),
    ("Cthulhu Mythos", 0, "standard", False, None),
    ("Demolitions", 1, "uncommon", False, None),
    ("Disguise", 5, "standard", False, None),
    ("Diving", 1, "uncommon", False, None),
    ("Dodge", 0, "standard", False, None),  # base = DEX/2, set dynamically
    ("Drive Auto", 20, "standard", False, None),
    ("Electrical Repair", 10, "standard", False, None),
    ("Electronics", 1, "modern", False, None),
    ("Fast Talk", 5, "standard", False, None),

    # Fighting specializations
    ("Fighting (Brawl)", 25, "standard", True, "Fighting"),
    ("Fighting (Chainsaw)", 10, "standard", True, "Fighting"),
    ("Fighting (Flail)", 10, "standard", True, "Fighting"),
    ("Fighting (Garrote)", 15, "standard", True, "Fighting"),
    ("Fighting (Spear)", 20, "standard", True, "Fighting"),
    ("Fighting (Sword)", 20, "standard", True, "Fighting"),
    ("Fighting (Whip)", 5, "standard", True, "Fighting"),
    ("Fighting (Axe)", 15, "standard", True, "Fighting"),

    # Firearms specializations
    ("Firearms (Handgun)", 20, "standard", True, "Firearms"),
    ("Firearms (Heavy Weapons)", 10, "standard", True, "Firearms"),
    ("Firearms (Flamethrower)", 10, "standard", True, "Firearms"),
    ("Firearms (Machine Gun)", 10, "standard", True, "Firearms"),
    ("Firearms (Rifle/Shotgun)", 25, "standard", True, "Firearms"),
    ("Firearms (Submachine Gun)", 15, "standard", True, "Firearms"),

    ("First Aid", 30, "standard", False, None),
    ("History", 5, "standard", False, None),
    ("Hypnosis", 1, "uncommon", False, None),
    ("Intimidate", 15, "standard", False, None),
    ("Jump", 20, "standard", False, None),

    # Language specializations
    ("Language, Other (French)", 1, "standard", True, "Language, Other"),
    ("Language, Other (German)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Latin)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Spanish)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Arabic)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Chinese)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Japanese)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Russian)", 1, "standard", True, "Language, Other"),
    ("Language, Other (Other)", 1, "standard", True, "Language, Other"),

    ("Language (Own)", 0, "standard", False, None),  # base = EDU, set dynamically
    ("Law", 5, "standard", False, None),
    ("Library Use", 20, "standard", False, None),
    ("Listen", 20, "standard", False, None),
    ("Locksmith", 1, "standard", False, None),

    # Lore specializations (uncommon)
    ("Lore (Dream)", 1, "uncommon", True, "Lore"),
    ("Lore (Necronomicon)", 1, "uncommon", True, "Lore"),
    ("Lore (UFO)", 1, "uncommon", True, "Lore"),
    ("Lore (Vampires)", 1, "uncommon", True, "Lore"),
    ("Lore (Other)", 1, "uncommon", True, "Lore"),

    ("Mechanical Repair", 10, "standard", False, None),
    ("Medicine", 1, "standard", False, None),
    ("Natural World", 10, "standard", False, None),
    ("Navigate", 10, "standard", False, None),
    ("Occult", 5, "standard", False, None),
    ("Operate Heavy Machinery", 1, "standard", False, None),
    ("Persuade", 10, "standard", False, None),

    # Pilot specializations
    ("Pilot (Aircraft)", 1, "standard", True, "Pilot"),
    ("Pilot (Boat)", 1, "standard", True, "Pilot"),
    ("Pilot (Other)", 1, "standard", True, "Pilot"),

    ("Psychoanalysis", 1, "standard", False, None),
    ("Psychology", 10, "standard", False, None),
    ("Read Lips", 1, "uncommon", False, None),
    ("Ride", 5, "standard", False, None),

    # Science specializations
    ("Science (Astronomy)", 1, "standard", True, "Science"),
    ("Science (Biology)", 1, "standard", True, "Science"),
    ("Science (Botany)", 1, "standard", True, "Science"),
    ("Science (Chemistry)", 1, "standard", True, "Science"),
    ("Science (Cryptography)", 1, "standard", True, "Science"),
    ("Science (Engineering)", 1, "standard", True, "Science"),
    ("Science (Forensics)", 1, "standard", True, "Science"),
    ("Science (Geology)", 1, "standard", True, "Science"),
    ("Science (Mathematics)", 1, "standard", True, "Science"),
    ("Science (Meteorology)", 1, "standard", True, "Science"),
    ("Science (Pharmacy)", 1, "standard", True, "Science"),
    ("Science (Physics)", 1, "standard", True, "Science"),
    ("Science (Zoology)", 1, "standard", True, "Science"),

    ("Sleight of Hand", 10, "standard", False, None),
    ("Spot Hidden", 25, "standard", False, None),
    ("Stealth", 20, "standard", False, None),

    # Survival specializations
    ("Survival (Arctic)", 10, "standard", True, "Survival"),
    ("Survival (Desert)", 10, "standard", True, "Survival"),
    ("Survival (Sea)", 10, "standard", True, "Survival"),
    ("Survival (Other)", 10, "standard", True, "Survival"),

    ("Swim", 20, "standard", False, None),
    ("Throw", 20, "standard", False, None),
    ("Track", 10, "standard", False, None),
]


def seed_skills():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(Skill).count()
    if existing > 0:
        print(f"Skills already seeded ({existing} found). Skipping.")
        db.close()
        return

    for name, base_val, category, is_spec, parent in SKILLS:
        skill = Skill(
            name=name,
            name_ru=SKILLS_RU.get(name),
            base_value=base_val,
            category=category,
            is_specialization=is_spec,
            parent_skill_name=parent,
        )
        db.add(skill)

    db.commit()
    print(f"Seeded {len(SKILLS)} skills.")
    db.close()


if __name__ == "__main__":
    seed_skills()
