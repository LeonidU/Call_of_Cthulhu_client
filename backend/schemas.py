from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    display_name: str
    is_approved: bool = False
    is_admin: bool = False
    language: str = "en"


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    is_approved: bool = False
    is_admin: bool = False
    language: str = "en"

    class Config:
        from_attributes = True


# ── Skills ────────────────────────────────────────

class SkillOut(BaseModel):
    id: int
    name: str
    name_ru: Optional[str] = None
    base_value: int
    category: str
    is_specialization: bool
    parent_skill_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Character ─────────────────────────────────────

class CharacterSkillIn(BaseModel):
    skill_id: int
    occupation_points: int = 0
    personal_points: int = 0


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    party_id: int
    occupation: Optional[str] = None
    age: Optional[int] = None
    residence: Optional[str] = None
    birthplace: Optional[str] = None

    str_stat: int = Field(default=50, ge=15, le=90)
    con_stat: int = Field(default=50, ge=15, le=90)
    siz_stat: int = Field(default=40, ge=40, le=90)
    dex_stat: int = Field(default=50, ge=15, le=90)
    app_stat: int = Field(default=50, ge=15, le=90)
    int_stat: int = Field(default=50, ge=40, le=90)
    pow_stat: int = Field(default=50, ge=15, le=90)
    edu_stat: int = Field(default=50, ge=40, le=90)
    luck_stat: int = Field(default=50, ge=15, le=90)

    skills: list[CharacterSkillIn] = []

    # Biography
    description: Optional[str] = None
    ideals: Optional[str] = None
    significant_people: Optional[str] = None
    significant_places: Optional[str] = None
    possessions: Optional[str] = None
    injuries_scars: Optional[str] = None
    phobias: Optional[str] = None

    # Equipment/Weapons — list of weapon name strings
    equipment_weapons: Optional[list[str]] = None


class CharacterSkillOut(BaseModel):
    skill_id: int
    skill_name: str = ""
    skill_name_ru: Optional[str] = None
    base_value: int
    occupation_points: int
    personal_points: int
    total: int

    class Config:
        from_attributes = True


class CharacterOut(BaseModel):
    id: int
    name: str
    occupation: Optional[str]
    avatar_path: Optional[str]
    age: Optional[int]
    residence: Optional[str]
    birthplace: Optional[str]
    str_stat: int
    con_stat: int
    siz_stat: int
    dex_stat: int
    app_stat: int
    int_stat: int
    pow_stat: int
    edu_stat: int
    luck_stat: int
    hp_max: int
    hp_current: int
    mp_max: int
    mp_current: int
    sanity_max: int
    sanity_current: int
    skills: list[CharacterSkillOut] = []

    # Biography
    description: Optional[str] = None
    ideals: Optional[str] = None
    significant_people: Optional[str] = None
    significant_places: Optional[str] = None
    possessions: Optional[str] = None
    injuries_scars: Optional[str] = None
    phobias: Optional[str] = None

    # Equipment
    equipment_weapons: Optional[list] = None
    inventory: Optional[str] = None

    # Spells
    spells: list['CharacterSpellOut'] = []

    class Config:
        from_attributes = True


# ── Spells ────────────────────────────────────────

class SpellOut(BaseModel):
    id: int
    name: str
    name_ru: Optional[str] = None
    cost_mp: int
    cost_san: int
    cast_time: Optional[str]
    description: Optional[str]
    effect: Optional[str]
    category: str

    class Config:
        from_attributes = True


class CharacterSpellOut(BaseModel):
    spell_id: int
    spell_name: str = ""
    spell_name_ru: Optional[str] = None
    cost_mp: int = 0
    cost_san: int = 0
    effect: Optional[str] = None

    class Config:
        from_attributes = True


class LearnSpell(BaseModel):
    character_id: int
    spell_id: int


class CastSpellRequest(BaseModel):
    party_id: int
    spell_id: int
    character_id: Optional[int] = None   # null = NPC/monster
    npc_name: Optional[str] = None       # used when character_id is null
    target_description: str = ""         # free text: "at the Deep One" etc.


# ── Party ─────────────────────────────────────────

class PartyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class PartyMemberOut(BaseModel):
    user_id: int
    username: str = ""
    display_name: str = ""
    role: str

    class Config:
        from_attributes = True


class PartyOut(BaseModel):
    id: int
    name: str
    invite_code: str
    created_by: int
    is_active: bool
    game_time: Optional[str] = ""
    game_era: Optional[str] = "1920s"
    timer_label: Optional[str] = None
    timer_total_seconds: Optional[int] = None
    timer_remaining_seconds: Optional[int] = None
    timer_running: bool = False
    members: list[PartyMemberOut] = []

    class Config:
        from_attributes = True


class PartyJoin(BaseModel):
    invite_code: str


# ── Artifacts ─────────────────────────────────────

class ArtifactOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    image_path: str
    is_revealed: bool

    class Config:
        from_attributes = True


# ── Dice ──────────────────────────────────────────

class DiceRollRequest(BaseModel):
    party_id: int
    skill_id: Optional[int] = None
    dice: str = "1d100"  # e.g. "1d6", "1d100", "2d6"


class DiceRollResult(BaseModel):
    roller: str
    dice: str
    rolls: list[int]
    total: int
    skill_name: Optional[str] = None
    skill_value: Optional[int] = None
    success_level: Optional[str] = None  # critical, extreme, hard, regular, fail, fumble


# ── Action Log ────────────────────────────────────

class ActionLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action_type: str
    payload: Optional[dict]
    created_at: datetime
    username: Optional[str] = None

    class Config:
        from_attributes = True


# ── Character Update ──────────────────────────────

class CharacterStatUpdate(BaseModel):
    """Update current HP, MP, Sanity, Luck (player or GM)."""
    hp_current: Optional[int] = None
    mp_current: Optional[int] = None
    sanity_current: Optional[int] = None
    luck_stat: Optional[int] = None
    # GM can also update max values
    hp_max: Optional[int] = None
    mp_max: Optional[int] = None
    sanity_max: Optional[int] = None


class CharacterSkillUpdate(BaseModel):
    """Add points to a skill (skill improvement after session)."""
    skill_id: int
    add_points: int = 0  # additional points to add to total


class StatChangeEvent(BaseModel):
    """Broadcast payload for stat changes."""
    character_id: int
    character_name: str
    field: str
    old_value: int
    new_value: int
    changed_by: str  # display name of who changed it


# ── Encounters (Battle / Chase) ───────────────────

class EncounterCreate(BaseModel):
    party_id: int
    name: str = Field(min_length=1, max_length=200)
    encounter_type: str = "battle"  # battle or chase


class NpcParticipant(BaseModel):
    npc_name: str
    initiative: int = 0
    hp_max: int = 10
    notes: Optional[str] = None


class AddParticipants(BaseModel):
    character_ids: list[int] = []
    npcs: list[NpcParticipant] = []


class ParticipantOut(BaseModel):
    id: int
    character_id: Optional[int]
    npc_name: Optional[str]
    character_name: Optional[str] = None
    avatar_path: Optional[str] = None
    initiative: int
    hp_current: Optional[int]
    hp_max: Optional[int]
    is_active: bool
    movement_points: int
    notes: Optional[str]
    weapon: Optional[str] = None
    ammo_current: Optional[int] = None
    ammo_max: Optional[int] = None

    class Config:
        from_attributes = True


class EncounterOut(BaseModel):
    id: int
    party_id: int
    name: str
    encounter_type: str
    status: str
    current_round: int
    current_turn_index: int
    participants: list[ParticipantOut] = []

    class Config:
        from_attributes = True


class ParticipantUpdate(BaseModel):
    """GM updates a participant mid-encounter."""
    hp_current: Optional[int] = None
    is_active: Optional[bool] = None
    initiative: Optional[int] = None
    movement_points: Optional[int] = None
    notes: Optional[str] = None


class ApplyDamage(BaseModel):
    """Apply damage to a participant (positive = damage, negative = heal)."""
    amount: int
    description: str = ""


# ── Admin ─────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: int
    username: str
    display_name: str
    is_approved: bool
    is_admin: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminApproval(BaseModel):
    user_id: int
    approved: bool  # True = approve, False = reject/delete


# ── Game Time ─────────────────────────────────────

class GameTimeUpdate(BaseModel):
    game_time: str = ""  # e.g. "March 15, 1925 — 3:00 PM"
    game_era: Optional[str] = None


class GameTimeAdvance(BaseModel):
    """Advance time by a specified amount."""
    amount: int = 1
    unit: str = "hour"  # minute, hour, day, week, month


# ── Firearms Combat ───────────────────────────────

class FirearmOut(BaseModel):
    name: str
    skill: str
    damage: str
    range: int
    rate_of_fire: int
    ammo: int
    malfunction: int
    era: str
    notes: Optional[str] = None


class FirearmShot(BaseModel):
    """GM resolves a firearm attack."""
    encounter_id: int
    shooter_participant_id: int
    target_participant_id: int
    weapon_name: str
    range_category: str = "normal"  # point_blank, normal, long, extreme
    called_shot: bool = False  # aim for specific body part = penalty die
    shots_fired: int = 1


class SetParticipantWeapon(BaseModel):
    weapon_name: str
    ammo_override: Optional[int] = None  # override starting ammo


class MeleeAttack(BaseModel):
    """GM resolves a melee attack between two participants."""
    encounter_id: int
    attacker_participant_id: int
    defender_participant_id: int
    weapon_name: str = "Fist/Punch"
    attacker_skill_value: int = 25  # GM sets this for NPCs
    defender_dodge_value: int = 0   # 0 = no dodge attempt
    called_shot: bool = False


class ChaseSpeedCheck(BaseModel):
    """A CON roll in a chase to gain/lose movement."""
    encounter_id: int
    participant_id: int
    con_value: int = 50  # GM sets for NPCs; auto-detected for player characters


class ChaseHazardCheck(BaseModel):
    """An obstacle/hazard/barrier check in a chase."""
    encounter_id: int
    participant_id: int
    hazard_type: str = "obstacle"   # obstacle, hazard, barrier
    difficulty: str = "regular"     # regular, hard, extreme
    skill_value: int = 50           # GM sets for NPCs; auto-detected default for PCs


# ── Language ──────────────────────────────────────

class LanguageUpdate(BaseModel):
    language: str = "en"  # en or ru


# ── Session Timer ─────────────────────────────────

class TimerStart(BaseModel):
    duration_seconds: int = 300
    label: Optional[str] = None


class TimerAdjust(BaseModel):
    delta_seconds: int = 60  # positive adds time, negative subtracts
