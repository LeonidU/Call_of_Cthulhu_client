from sqlalchemy import (
    Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text, JSON,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)  # admin must approve new users
    language = Column(String(5), default="en")  # UI language: en, ru
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    characters = relationship("Character", back_populates="user")
    party_memberships = relationship("PartyMember", back_populates="user")


class Party(Base):
    __tablename__ = "parties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    invite_code = Column(String(20), unique=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    # In-game time management
    game_time = Column(String(200), nullable=True, default="")  # e.g. "March 15, 1925 — 3:00 PM"
    game_era = Column(String(50), nullable=True, default="1920s")  # 1890s, 1920s, Modern
    # Session timer (GM-controlled countdown shown to all players)
    timer_label = Column(String(200), nullable=True)
    timer_total_seconds = Column(Integer, nullable=True)     # original duration
    timer_ends_at = Column(DateTime, nullable=True)          # when it expires (UTC)
    timer_paused_remaining = Column(Integer, nullable=True)  # seconds left while paused
    timer_running = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User")
    members = relationship("PartyMember", back_populates="party")
    artifacts = relationship("Artifact", back_populates="party")
    action_logs = relationship("ActionLog", back_populates="party")


class PartyMember(Base):
    __tablename__ = "party_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    role = Column(String(20), nullable=False, default="player")  # "master" or "player"
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="party_memberships")
    party = relationship("Party", back_populates="members")

    __table_args__ = (
        UniqueConstraint("user_id", "party_id", name="uq_user_party"),
    )


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    name_ru = Column(String(150), nullable=True)
    base_value = Column(Integer, default=0)
    category = Column(String(20), default="standard")  # standard, uncommon, modern
    is_specialization = Column(Boolean, default=False)
    parent_skill_name = Column(String(100), nullable=True)


class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    name = Column(String(100), nullable=False)
    occupation = Column(String(100), nullable=True)
    avatar_path = Column(String(500), nullable=True)
    age = Column(Integer, nullable=True)
    residence = Column(String(200), nullable=True)
    birthplace = Column(String(200), nullable=True)

    # Core characteristics
    str_stat = Column(Integer, default=50)
    con_stat = Column(Integer, default=50)
    siz_stat = Column(Integer, default=50)
    dex_stat = Column(Integer, default=50)
    app_stat = Column(Integer, default=50)
    int_stat = Column(Integer, default=50)
    pow_stat = Column(Integer, default=50)
    edu_stat = Column(Integer, default=50)
    luck_stat = Column(Integer, default=50)

    # Derived
    hp_max = Column(Integer, default=10)
    hp_current = Column(Integer, default=10)
    mp_max = Column(Integer, default=10)
    mp_current = Column(Integer, default=10)
    sanity_max = Column(Integer, default=50)
    sanity_current = Column(Integer, default=50)

    # Biography
    description = Column(Text, nullable=True)       # character backstory
    ideals = Column(Text, nullable=True)             # beliefs, principles
    significant_people = Column(Text, nullable=True) # important NPCs
    significant_places = Column(Text, nullable=True) # meaningful locations
    possessions = Column(Text, nullable=True)        # equipment, treasured items
    injuries_scars = Column(Text, nullable=True)     # physical marks
    phobias = Column(Text, nullable=True)            # fears, manias
    equipment_weapons = Column(JSON, nullable=True)  # list of weapon dicts
    inventory = Column(Text, nullable=True)          # editable during play (player + GM)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="characters")
    skills = relationship("CharacterSkill", back_populates="character", cascade="all, delete-orphan")
    spells = relationship("CharacterSpell", back_populates="character", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "party_id", name="uq_user_party_char"),
    )


class CharacterSkill(Base):
    __tablename__ = "character_skills"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    base_value = Column(Integer, default=0)
    occupation_points = Column(Integer, default=0)
    personal_points = Column(Integer, default=0)
    total = Column(Integer, default=0)

    character = relationship("Character", back_populates="skills")
    skill = relationship("Skill")

    __table_args__ = (
        UniqueConstraint("character_id", "skill_id", name="uq_char_skill"),
    )


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(Integer, primary_key=True, index=True)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=False)
    is_revealed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    party = relationship("Party", back_populates="artifacts")


class Spell(Base):
    """A spell in the Cthulhu Mythos."""
    __tablename__ = "spells"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    name_ru = Column(String(250), nullable=True)
    cost_mp = Column(Integer, default=0)
    cost_san = Column(Integer, default=0)
    cast_time = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    effect = Column(Text, nullable=True)
    category = Column(String(50), default="other")


class CharacterSpell(Base):
    """A spell known by a character."""
    __tablename__ = "character_spells"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)
    spell_id = Column(Integer, ForeignKey("spells.id"), nullable=False)
    learned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="spells")
    spell = relationship("Spell")

    __table_args__ = (
        UniqueConstraint("character_id", "spell_id", name="uq_char_spell"),
    )


class Encounter(Base):
    """Tracks active battles and chases."""
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    name = Column(String(200), nullable=False)
    encounter_type = Column(String(20), nullable=False, default="battle")  # battle, chase
    status = Column(String(20), nullable=False, default="active")  # active, finished
    current_round = Column(Integer, default=1)
    current_turn_index = Column(Integer, default=0)  # index into sorted participants
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    party = relationship("Party")
    participants = relationship("EncounterParticipant", back_populates="encounter",
                                cascade="all, delete-orphan", order_by="EncounterParticipant.initiative.desc()")


class EncounterParticipant(Base):
    """A character or NPC in an encounter."""
    __tablename__ = "encounter_participants"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)  # null = NPC
    npc_name = Column(String(100), nullable=True)
    initiative = Column(Integer, default=0)  # DEX for battle, CON for chase
    hp_current = Column(Integer, nullable=True)  # track NPC HP here
    hp_max = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)  # false = dead/fled/KO
    movement_points = Column(Integer, default=0)  # for chases
    notes = Column(Text, nullable=True)
    # Firearm tracking
    weapon = Column(String(100), nullable=True)  # current weapon name
    ammo_current = Column(Integer, nullable=True)
    ammo_max = Column(Integer, nullable=True)

    encounter = relationship("Encounter", back_populates="participants")
    character = relationship("Character")


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True, index=True)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(50), nullable=False)  # dice_roll, artifact_reveal, gm_event
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    party = relationship("Party", back_populates="action_logs")
    user = relationship("User")
