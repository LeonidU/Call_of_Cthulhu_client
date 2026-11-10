import os
import random
from datetime import datetime, timezone, timedelta
import string
import shutil
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

from database import Base, engine, get_db, SessionLocal
from models import User, Party, PartyMember, Skill, Character, CharacterSkill, Artifact, ActionLog, Encounter, EncounterParticipant, Spell, CharacterSpell
from schemas import (
    UserRegister, UserLogin, TokenResponse, UserOut,
    SkillOut, CharacterCreate, CharacterOut, CharacterSkillOut,
    PartyCreate, PartyOut, PartyMemberOut, PartyJoin,
    ArtifactOut, DiceRollRequest, DiceRollResult, ActionLogOut,
    CharacterStatUpdate, CharacterSkillUpdate, StatChangeEvent,
    EncounterCreate, EncounterOut, ParticipantOut, AddParticipants,
    ParticipantUpdate, ApplyDamage, NpcParticipant,
    AdminUserOut, AdminApproval, GameTimeUpdate, GameTimeAdvance,
    FirearmOut, FirearmShot, SetParticipantWeapon,
    SpellOut, CharacterSpellOut, LearnSpell, CastSpellRequest,
    MeleeAttack, ChaseSpeedCheck, ChaseHazardCheck,
    LanguageUpdate, TimerStart, TimerAdjust,
)
from auth import hash_password, verify_password, create_access_token, get_current_user, get_approved_user, get_admin_user, seed_admin
from seed_skills import seed_skills
from seed_spells import seed_spells
from firearms import FIREARMS, get_firearm, get_firearms_by_era
from weapons import WEAPONS, get_all_weapons, get_weapon, get_weapons_by_type

# ── Init ──────────────────────────────────────────

Base.metadata.create_all(bind=engine)
seed_skills()
seed_spells()

# Seed admin user
_init_db = SessionLocal()
seed_admin(_init_db)
_init_db.close()

app = FastAPI(title="Call of Cthulhu - Remote Play", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "artifacts"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ── WebSocket Manager ────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.rooms: dict[int, list[WebSocket]] = {}

    async def connect(self, party_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(party_id, []).append(ws)

    def disconnect(self, party_id: int, ws: WebSocket):
        if party_id in self.rooms:
            self.rooms[party_id] = [c for c in self.rooms[party_id] if c != ws]

    async def broadcast(self, party_id: int, message: dict):
        for conn in self.rooms.get(party_id, []):
            try:
                await conn.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# ── Auth Routes ───────────────────────────────────

@app.post("/api/auth/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        is_approved=False,  # admin must approve
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token, user_id=user.id,
        username=user.username, display_name=user.display_name,
        is_approved=user.is_approved, is_admin=user.is_admin,
        language=user.language or 'en',
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token, user_id=user.id,
        username=user.username, display_name=user.display_name,
        is_approved=user.is_approved, is_admin=user.is_admin,
        language=user.language or 'en',
    )


@app.get("/api/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


# ── Skills Routes ─────────────────────────────────

@app.get("/api/skills", response_model=list[SkillOut])
def list_skills(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Skill)
    if category:
        q = q.filter(Skill.category == category)
    return q.order_by(Skill.name).all()


# ── Party Routes ──────────────────────────────────

def _gen_invite_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@app.post("/api/parties", response_model=PartyOut)
def create_party(data: PartyCreate, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    party = Party(name=data.name, invite_code=_gen_invite_code(), created_by=user.id)
    db.add(party)
    db.flush()

    membership = PartyMember(user_id=user.id, party_id=party.id, role="master")
    db.add(membership)
    db.commit()
    db.refresh(party)

    return _party_to_out(party, db)


@app.post("/api/parties/join", response_model=PartyOut)
def join_party(data: PartyJoin, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    party = db.query(Party).filter(Party.invite_code == data.invite_code).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    existing = db.query(PartyMember).filter(
        PartyMember.user_id == user.id, PartyMember.party_id == party.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in this party")

    membership = PartyMember(user_id=user.id, party_id=party.id, role="player")
    db.add(membership)
    db.commit()
    db.refresh(party)

    return _party_to_out(party, db)


@app.get("/api/parties", response_model=list[PartyOut])
def list_my_parties(user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    memberships = db.query(PartyMember).filter(PartyMember.user_id == user.id).all()
    party_ids = [m.party_id for m in memberships]
    parties = db.query(Party).filter(Party.id.in_(party_ids)).all()
    return [_party_to_out(p, db) for p in parties]


@app.get("/api/parties/{party_id}", response_model=PartyOut)
def get_party(party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    _require_party_member(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return _party_to_out(party, db)


def _party_to_out(party: Party, db: Session) -> PartyOut:
    members = db.query(PartyMember).filter(PartyMember.party_id == party.id).all()
    member_outs = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        member_outs.append(PartyMemberOut(
            user_id=m.user_id, username=u.username if u else "",
            display_name=u.display_name if u else "", role=m.role,
        ))
    # Compute timer remaining
    remaining = None
    if party.timer_running and party.timer_ends_at:
        delta = (party.timer_ends_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
        remaining = max(0, int(delta))
    elif party.timer_paused_remaining is not None:
        remaining = party.timer_paused_remaining

    return PartyOut(
        id=party.id, name=party.name, invite_code=party.invite_code,
        created_by=party.created_by, is_active=party.is_active,
        game_time=party.game_time or "", game_era=party.game_era or "1920s",
        timer_label=party.timer_label,
        timer_total_seconds=party.timer_total_seconds,
        timer_remaining_seconds=remaining,
        timer_running=bool(party.timer_running),
        members=member_outs,
    )


def _require_party_member(user_id: int, party_id: int, db: Session) -> PartyMember:
    m = db.query(PartyMember).filter(
        PartyMember.user_id == user_id, PartyMember.party_id == party_id
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member of this party")
    return m


def _require_game_master(user_id: int, party_id: int, db: Session) -> PartyMember:
    m = _require_party_member(user_id, party_id, db)
    if m.role != "master":
        raise HTTPException(status_code=403, detail="Game Master only")
    return m


def _can_act_for_participant(user_id: int, participant: "EncounterParticipant", party_id: int, db: Session) -> bool:
    """
    Returns True if the user may roll for this participant:
    - Game Master can act for any participant (NPCs and PCs)
    - A player can only act for their OWN character
    """
    m = _require_party_member(user_id, party_id, db)
    if m.role == "master":
        return True
    # Player: participant must be their own character
    if participant.character_id:
        char = db.query(Character).filter(Character.id == participant.character_id).first()
        if char and char.user_id == user_id:
            return True
    return False


# ── Character Routes ──────────────────────────────

@app.post("/api/characters", response_model=CharacterOut)
def create_character(data: CharacterCreate, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    _require_party_member(user.id, data.party_id, db)

    existing = db.query(Character).filter(
        Character.user_id == user.id, Character.party_id == data.party_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a character in this party")

    hp = (data.con_stat + data.siz_stat) // 10
    mp = data.pow_stat // 5
    sanity = data.pow_stat

    char = Character(
        user_id=user.id, party_id=data.party_id, name=data.name,
        occupation=data.occupation, age=data.age,
        residence=data.residence, birthplace=data.birthplace,
        str_stat=data.str_stat, con_stat=data.con_stat, siz_stat=data.siz_stat,
        dex_stat=data.dex_stat, app_stat=data.app_stat, int_stat=data.int_stat,
        pow_stat=data.pow_stat, edu_stat=data.edu_stat, luck_stat=data.luck_stat,
        hp_max=hp, hp_current=hp, mp_max=mp, mp_current=mp,
        sanity_max=sanity, sanity_current=sanity,
        # Biography
        description=data.description, ideals=data.ideals,
        significant_people=data.significant_people,
        significant_places=data.significant_places,
        possessions=data.possessions, injuries_scars=data.injuries_scars,
        phobias=data.phobias,
        # Equipment — store full weapon data dicts
        equipment_weapons=[get_weapon(w) for w in (data.equipment_weapons or []) if get_weapon(w)] if data.equipment_weapons else None,
    )
    db.add(char)
    db.flush()

    # Add skills
    for s in data.skills:
        skill = db.query(Skill).filter(Skill.id == s.skill_id).first()
        if not skill:
            continue
        base = skill.base_value
        # Dynamic base values
        if skill.name == "Dodge":
            base = data.dex_stat // 2
        elif skill.name == "Language (Own)":
            base = data.edu_stat
        total = base + s.occupation_points + s.personal_points
        cs = CharacterSkill(
            character_id=char.id, skill_id=s.skill_id,
            base_value=base, occupation_points=s.occupation_points,
            personal_points=s.personal_points, total=total,
        )
        db.add(cs)

    db.commit()
    db.refresh(char)
    return _char_to_out(char, db)


@app.get("/api/characters/my/{party_id}", response_model=Optional[CharacterOut])
def get_my_character(party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    _require_party_member(user.id, party_id, db)
    char = db.query(Character).filter(
        Character.user_id == user.id, Character.party_id == party_id
    ).first()
    if not char:
        return None
    return _char_to_out(char, db)


@app.post("/api/characters/{char_id}/avatar")
def upload_avatar(
    char_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id, Character.user_id == user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"avatar_{char.id}{ext}"
    path = os.path.join(UPLOAD_DIR, "avatars", filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    char.avatar_path = f"/uploads/avatars/{filename}"
    db.commit()
    return {"avatar_path": char.avatar_path}


def _char_to_out(char: Character, db: Session) -> CharacterOut:
    char_skills = db.query(CharacterSkill).filter(CharacterSkill.character_id == char.id).all()
    skill_outs = []
    for cs in char_skills:
        skill = db.query(Skill).filter(Skill.id == cs.skill_id).first()
        skill_outs.append(CharacterSkillOut(
            skill_id=cs.skill_id,
            skill_name=skill.name if skill else "",
            skill_name_ru=skill.name_ru if skill else None,
            base_value=cs.base_value,
            occupation_points=cs.occupation_points,
            personal_points=cs.personal_points,
            total=cs.total,
        ))

    # Spells
    char_spells = db.query(CharacterSpell).filter(CharacterSpell.character_id == char.id).all()
    spell_outs = []
    for cs in char_spells:
        sp = db.query(Spell).filter(Spell.id == cs.spell_id).first()
        if sp:
            spell_outs.append(CharacterSpellOut(
                spell_id=sp.id, spell_name=sp.name, spell_name_ru=sp.name_ru,
                cost_mp=sp.cost_mp, cost_san=sp.cost_san, effect=sp.effect,
            ))

    return CharacterOut(
        id=char.id, name=char.name, occupation=char.occupation,
        avatar_path=char.avatar_path, age=char.age,
        residence=char.residence, birthplace=char.birthplace,
        str_stat=char.str_stat, con_stat=char.con_stat, siz_stat=char.siz_stat,
        dex_stat=char.dex_stat, app_stat=char.app_stat, int_stat=char.int_stat,
        pow_stat=char.pow_stat, edu_stat=char.edu_stat, luck_stat=char.luck_stat,
        hp_max=char.hp_max, hp_current=char.hp_current,
        mp_max=char.mp_max, mp_current=char.mp_current,
        sanity_max=char.sanity_max, sanity_current=char.sanity_current,
        skills=skill_outs,
        description=char.description, ideals=char.ideals,
        significant_people=char.significant_people,
        significant_places=char.significant_places,
        possessions=char.possessions, injuries_scars=char.injuries_scars,
        phobias=char.phobias,
        equipment_weapons=char.equipment_weapons,
        inventory=char.inventory,
        spells=spell_outs,
    )


# ── Artifact Routes (GM) ─────────────────────────

@app.post("/api/parties/{party_id}/artifacts", response_model=ArtifactOut)
def add_artifact(
    party_id: int,
    name: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)

    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"artifact_{party_id}_{random.randint(10000,99999)}{ext}"
    path = os.path.join(UPLOAD_DIR, "artifacts", filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    artifact = Artifact(
        party_id=party_id, name=name, description=description,
        image_path=f"/uploads/artifacts/{filename}", is_revealed=False,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


@app.post("/api/artifacts/{artifact_id}/reveal", response_model=ArtifactOut)
async def reveal_artifact(
    artifact_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    _require_game_master(user.id, artifact.party_id, db)

    artifact.is_revealed = True
    db.commit()
    db.refresh(artifact)

    await manager.broadcast(artifact.party_id, {
        "type": "artifact_revealed",
        "artifact": {"id": artifact.id, "name": artifact.name,
                     "description": artifact.description, "image_path": artifact.image_path},
    })
    return artifact


@app.get("/api/parties/{party_id}/artifacts", response_model=list[ArtifactOut])
def list_artifacts(party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db)):
    membership = _require_party_member(user.id, party_id, db)
    q = db.query(Artifact).filter(Artifact.party_id == party_id)
    if membership.role != "master":
        q = q.filter(Artifact.is_revealed == True)
    return q.all()


# ── Dice Roll ─────────────────────────────────────

@app.post("/api/dice/roll", response_model=DiceRollResult)
async def roll_dice(
    data: DiceRollRequest,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_party_member(user.id, data.party_id, db)

    # Parse dice string like "1d6", "2d10", "1d100"
    try:
        count_str, sides_str = data.dice.lower().split("d")
        count = int(count_str) if count_str else 1
        sides = int(sides_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid dice format. Use NdM (e.g. 1d100)")

    rolls = [random.randint(1, sides) for _ in range(count)]
    total = sum(rolls)

    skill_name = None
    skill_value = None
    success_level = None

    if data.skill_id:
        char = db.query(Character).filter(
            Character.user_id == user.id, Character.party_id == data.party_id
        ).first()
        if char:
            cs = db.query(CharacterSkill).filter(
                CharacterSkill.character_id == char.id, CharacterSkill.skill_id == data.skill_id
            ).first()
            if cs:
                skill_obj = db.query(Skill).filter(Skill.id == data.skill_id).first()
                skill_name = skill_obj.name if skill_obj else None
                skill_value = cs.total
                # Determine success level for d100 rolls
                if sides == 100 and count == 1:
                    success_level = _check_success(total, cs.total)

    result = DiceRollResult(
        roller=user.display_name, dice=data.dice, rolls=rolls, total=total,
        skill_name=skill_name, skill_value=skill_value, success_level=success_level,
    )

    # Log and broadcast
    log = ActionLog(
        party_id=data.party_id, user_id=user.id, action_type="dice_roll",
        payload=result.model_dump(),
    )
    db.add(log)
    db.commit()

    await manager.broadcast(data.party_id, {
        "type": "dice_roll", **result.model_dump(),
    })

    return result


def _check_success(roll: int, skill_value: int) -> str:
    if roll == 1:
        return "critical"
    if roll >= 96 and skill_value < 50:
        return "fumble"
    if roll == 100:
        return "fumble"
    if roll <= skill_value // 5:
        return "extreme"
    if roll <= skill_value // 2:
        return "hard"
    if roll <= skill_value:
        return "regular"
    return "fail"


# ── Action Log ────────────────────────────────────

@app.get("/api/parties/{party_id}/actions", response_model=list[ActionLogOut])
def get_action_log(
    party_id: int,
    limit: int = 50,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_party_member(user.id, party_id, db)
    logs = (
        db.query(ActionLog)
        .filter(ActionLog.party_id == party_id)
        .order_by(ActionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for log in logs:
        u = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        result.append(ActionLogOut(
            id=log.id, user_id=log.user_id, action_type=log.action_type,
            payload=log.payload, created_at=log.created_at,
            username=u.display_name if u else "System",
        ))
    return result


# ── GM: Add user to party ────────────────────────

@app.post("/api/parties/{party_id}/add-member")
def gm_add_member(
    party_id: int,
    username: str = Form(...),
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(PartyMember).filter(
        PartyMember.user_id == target.id, PartyMember.party_id == party_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in party")

    membership = PartyMember(user_id=target.id, party_id=party_id, role="player")
    db.add(membership)
    db.commit()
    return {"detail": f"{target.display_name} added to party"}


# ── Character Stat Editing ────────────────────────

@app.patch("/api/characters/{char_id}/stats", response_model=CharacterOut)
async def update_character_stats(
    char_id: int,
    data: CharacterStatUpdate,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    # Players can edit own character; GM can edit any in party
    is_owner = char.user_id == user.id
    is_gm = False
    try:
        _require_game_master(user.id, char.party_id, db)
        is_gm = True
    except HTTPException:
        pass

    if not is_owner and not is_gm:
        raise HTTPException(status_code=403, detail="Not authorized")

    changes = []
    for field in ["hp_current", "mp_current", "sanity_current", "luck_stat", "hp_max", "mp_max", "sanity_max"]:
        new_val = getattr(data, field)
        if new_val is not None:
            # Only GM can change max values
            if field in ("hp_max", "mp_max", "sanity_max") and not is_gm:
                continue
            old_val = getattr(char, field)
            if old_val != new_val:
                setattr(char, field, new_val)
                changes.append({"field": field, "old": old_val, "new": new_val})

    db.commit()
    db.refresh(char)

    # Broadcast changes
    if changes:
        for c in changes:
            event = StatChangeEvent(
                character_id=char.id, character_name=char.name,
                field=c["field"], old_value=c["old"], new_value=c["new"],
                changed_by=user.display_name,
            )
            await manager.broadcast(char.party_id, {
                "type": "stat_change", **event.model_dump(),
            })

        log = ActionLog(
            party_id=char.party_id, user_id=user.id, action_type="stat_change",
            payload={"character": char.name, "changes": changes},
        )
        db.add(log)
        db.commit()

    return _char_to_out(char, db)


@app.post("/api/characters/{char_id}/improve-skill", response_model=CharacterOut)
async def improve_skill(
    char_id: int,
    data: CharacterSkillUpdate,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    is_owner = char.user_id == user.id
    is_gm = False
    try:
        _require_game_master(user.id, char.party_id, db)
        is_gm = True
    except HTTPException:
        pass

    if not is_owner and not is_gm:
        raise HTTPException(status_code=403, detail="Not authorized")

    cs = db.query(CharacterSkill).filter(
        CharacterSkill.character_id == char.id,
        CharacterSkill.skill_id == data.skill_id,
    ).first()

    if cs:
        old_total = cs.total
        cs.personal_points += data.add_points
        cs.total = cs.base_value + cs.occupation_points + cs.personal_points
    else:
        # Create new skill entry
        skill = db.query(Skill).filter(Skill.id == data.skill_id).first()
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")
        base = skill.base_value
        if skill.name == "Dodge":
            base = char.dex_stat // 2
        elif skill.name == "Language (Own)":
            base = char.edu_stat
        old_total = base
        cs = CharacterSkill(
            character_id=char.id, skill_id=data.skill_id,
            base_value=base, occupation_points=0,
            personal_points=data.add_points, total=base + data.add_points,
        )
        db.add(cs)

    db.commit()

    skill_obj = db.query(Skill).filter(Skill.id == data.skill_id).first()
    await manager.broadcast(char.party_id, {
        "type": "skill_improve",
        "character_name": char.name,
        "skill_name": skill_obj.name if skill_obj else "Unknown",
        "old_value": old_total,
        "new_value": cs.total,
    })

    log = ActionLog(
        party_id=char.party_id, user_id=user.id, action_type="skill_improve",
        payload={
            "character": char.name,
            "skill": skill_obj.name if skill_obj else "Unknown",
            "old": old_total, "new": cs.total,
        },
    )
    db.add(log)
    db.commit()

    db.refresh(char)
    return _char_to_out(char, db)


@app.get("/api/parties/{party_id}/characters", response_model=list[CharacterOut])
def list_party_characters(
    party_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """List all characters in a party (for GM and party view)."""
    _require_party_member(user.id, party_id, db)
    chars = db.query(Character).filter(Character.party_id == party_id).all()
    return [_char_to_out(c, db) for c in chars]


# ── Encounter (Battle / Chase) System ─────────────

def _encounter_to_out(enc: Encounter, db: Session) -> EncounterOut:
    parts = []
    for p in enc.participants:
        char_name = None
        avatar = None
        if p.character_id:
            c = db.query(Character).filter(Character.id == p.character_id).first()
            if c:
                char_name = c.name
                avatar = c.avatar_path
        parts.append(ParticipantOut(
            id=p.id, character_id=p.character_id, npc_name=p.npc_name,
            character_name=char_name or p.npc_name, avatar_path=avatar,
            initiative=p.initiative, hp_current=p.hp_current, hp_max=p.hp_max,
            is_active=p.is_active, movement_points=p.movement_points, notes=p.notes,
            weapon=p.weapon, ammo_current=p.ammo_current, ammo_max=p.ammo_max,
        ))
    # Sort by initiative descending
    parts.sort(key=lambda x: x.initiative, reverse=True)
    return EncounterOut(
        id=enc.id, party_id=enc.party_id, name=enc.name,
        encounter_type=enc.encounter_type, status=enc.status,
        current_round=enc.current_round, current_turn_index=enc.current_turn_index,
        participants=parts,
    )


@app.post("/api/encounters", response_model=EncounterOut)
async def create_encounter(
    data: EncounterCreate,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_game_master(user.id, data.party_id, db)

    enc = Encounter(
        party_id=data.party_id, name=data.name,
        encounter_type=data.encounter_type,
    )
    db.add(enc)
    db.commit()
    db.refresh(enc)

    await manager.broadcast(data.party_id, {
        "type": "encounter_started",
        "encounter_type": data.encounter_type,
        "name": data.name,
        "encounter_id": enc.id,
    })

    log = ActionLog(
        party_id=data.party_id, user_id=user.id, action_type="encounter_started",
        payload={"name": data.name, "type": data.encounter_type},
    )
    db.add(log)
    db.commit()

    return _encounter_to_out(enc, db)


@app.get("/api/parties/{party_id}/encounters", response_model=list[EncounterOut])
def list_encounters(
    party_id: int,
    status: Optional[str] = "active",
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_party_member(user.id, party_id, db)
    q = db.query(Encounter).filter(Encounter.party_id == party_id)
    if status:
        q = q.filter(Encounter.status == status)
    encs = q.order_by(Encounter.created_at.desc()).all()
    return [_encounter_to_out(e, db) for e in encs]


@app.get("/api/encounters/{enc_id}", response_model=EncounterOut)
def get_encounter(
    enc_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    enc = db.query(Encounter).filter(Encounter.id == enc_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    _require_party_member(user.id, enc.party_id, db)
    return _encounter_to_out(enc, db)


@app.post("/api/encounters/{enc_id}/participants", response_model=EncounterOut)
async def add_participants(
    enc_id: int,
    data: AddParticipants,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    enc = db.query(Encounter).filter(Encounter.id == enc_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    _require_game_master(user.id, enc.party_id, db)

    # Add player characters
    for cid in data.character_ids:
        char = db.query(Character).filter(Character.id == cid).first()
        if not char:
            continue
        # Skip if already in encounter
        existing = db.query(EncounterParticipant).filter(
            EncounterParticipant.encounter_id == enc_id,
            EncounterParticipant.character_id == cid,
        ).first()
        if existing:
            continue

        init_stat = char.dex_stat if enc.encounter_type == "battle" else char.con_stat
        p = EncounterParticipant(
            encounter_id=enc_id, character_id=cid,
            initiative=init_stat,
            hp_current=char.hp_current, hp_max=char.hp_max,
        )
        db.add(p)

    # Add NPCs
    for npc in data.npcs:
        p = EncounterParticipant(
            encounter_id=enc_id, npc_name=npc.npc_name,
            initiative=npc.initiative,
            hp_current=npc.hp_max, hp_max=npc.hp_max,
            notes=npc.notes,
        )
        db.add(p)

    db.commit()
    db.refresh(enc)

    await manager.broadcast(enc.party_id, {
        "type": "encounter_updated", "encounter_id": enc.id,
    })

    return _encounter_to_out(enc, db)


@app.patch("/api/encounter-participants/{part_id}", response_model=ParticipantOut)
async def update_participant(
    part_id: int,
    data: ParticipantUpdate,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")
    enc = db.query(Encounter).filter(Encounter.id == part.encounter_id).first()
    _require_game_master(user.id, enc.party_id, db)

    for field in ["hp_current", "is_active", "initiative", "movement_points", "notes"]:
        val = getattr(data, field)
        if val is not None:
            setattr(part, field, val)

    db.commit()
    db.refresh(part)

    # Sync HP back to character if linked
    if part.character_id and data.hp_current is not None:
        char = db.query(Character).filter(Character.id == part.character_id).first()
        if char:
            char.hp_current = data.hp_current
            db.commit()

    await manager.broadcast(enc.party_id, {
        "type": "encounter_updated", "encounter_id": enc.id,
    })

    char_name = None
    avatar = None
    if part.character_id:
        c = db.query(Character).filter(Character.id == part.character_id).first()
        if c:
            char_name = c.name
            avatar = c.avatar_path
    return ParticipantOut(
        id=part.id, character_id=part.character_id, npc_name=part.npc_name,
        character_name=char_name or part.npc_name, avatar_path=avatar,
        initiative=part.initiative, hp_current=part.hp_current, hp_max=part.hp_max,
        is_active=part.is_active, movement_points=part.movement_points, notes=part.notes,
        weapon=part.weapon, ammo_current=part.ammo_current, ammo_max=part.ammo_max,
    )


@app.post("/api/encounter-participants/{part_id}/damage")
async def apply_damage_to_participant(
    part_id: int,
    data: ApplyDamage,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")
    enc = db.query(Encounter).filter(Encounter.id == part.encounter_id).first()
    _require_game_master(user.id, enc.party_id, db)

    old_hp = part.hp_current or 0
    new_hp = max(0, old_hp - data.amount)
    part.hp_current = new_hp

    if new_hp <= 0:
        part.is_active = False

    # Sync to character
    if part.character_id:
        char = db.query(Character).filter(Character.id == part.character_id).first()
        if char:
            char.hp_current = new_hp

    db.commit()

    name = part.npc_name or ""
    if part.character_id:
        c = db.query(Character).filter(Character.id == part.character_id).first()
        name = c.name if c else name

    action_word = "damaged" if data.amount > 0 else "healed"
    log = ActionLog(
        party_id=enc.party_id, user_id=user.id, action_type="damage",
        payload={
            "target": name, "amount": data.amount,
            "old_hp": old_hp, "new_hp": new_hp,
            "description": data.description,
        },
    )
    db.add(log)
    db.commit()

    await manager.broadcast(enc.party_id, {
        "type": "damage_applied",
        "target": name, "amount": data.amount,
        "old_hp": old_hp, "new_hp": new_hp,
        "description": data.description,
        "encounter_id": enc.id,
    })

    return {"target": name, "old_hp": old_hp, "new_hp": new_hp, "is_active": part.is_active}


@app.post("/api/encounters/{enc_id}/next-turn", response_model=EncounterOut)
async def next_turn(
    enc_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    enc = db.query(Encounter).filter(Encounter.id == enc_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    _require_game_master(user.id, enc.party_id, db)

    active = [p for p in enc.participants if p.is_active]
    if not active:
        enc.status = "finished"
        db.commit()
        await manager.broadcast(enc.party_id, {
            "type": "encounter_ended", "encounter_id": enc.id, "name": enc.name,
        })
        return _encounter_to_out(enc, db)

    # Sort active by initiative
    active.sort(key=lambda p: p.initiative, reverse=True)
    total_active = len(active)

    enc.current_turn_index += 1
    if enc.current_turn_index >= total_active:
        enc.current_turn_index = 0
        enc.current_round += 1

    db.commit()
    db.refresh(enc)

    # Who's up
    out = _encounter_to_out(enc, db)
    active_parts = [p for p in out.participants if p.is_active]
    current_name = active_parts[enc.current_turn_index].character_name if active_parts else "Unknown"

    await manager.broadcast(enc.party_id, {
        "type": "encounter_updated", "encounter_id": enc.id,
        "round": enc.current_round, "current_turn": current_name,
    })

    return out


@app.post("/api/encounters/{enc_id}/end", response_model=EncounterOut)
async def end_encounter(
    enc_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    enc = db.query(Encounter).filter(Encounter.id == enc_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    _require_game_master(user.id, enc.party_id, db)

    enc.status = "finished"
    db.commit()
    db.refresh(enc)

    await manager.broadcast(enc.party_id, {
        "type": "encounter_ended", "encounter_id": enc.id, "name": enc.name,
    })

    log = ActionLog(
        party_id=enc.party_id, user_id=user.id, action_type="encounter_ended",
        payload={"name": enc.name},
    )
    db.add(log)
    db.commit()

    return _encounter_to_out(enc, db)


# ── Admin Routes ──────────────────────────────────

@app.get("/api/admin/users", response_model=list[AdminUserOut])
def admin_list_users(user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@app.post("/api/admin/approve")
def admin_approve_user(data: AdminApproval, user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == data.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.is_admin:
        raise HTTPException(status_code=400, detail="Cannot modify admin user")

    if data.approved:
        target.is_approved = True
        db.commit()
        return {"detail": f"{target.display_name} approved"}
    else:
        # Reject = delete user and their data
        db.query(CharacterSkill).filter(
            CharacterSkill.character_id.in_(
                db.query(Character.id).filter(Character.user_id == target.id)
            )
        ).delete(synchronize_session=False)
        db.query(Character).filter(Character.user_id == target.id).delete()
        db.query(PartyMember).filter(PartyMember.user_id == target.id).delete()
        db.delete(target)
        db.commit()
        return {"detail": f"User rejected and removed"}


@app.post("/api/admin/toggle-admin")
def admin_toggle_admin(data: AdminApproval, user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Promote/demote a user to/from admin. data.approved=True means make admin."""
    target = db.query(User).filter(User.id == data.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    target.is_admin = data.approved
    if data.approved:
        target.is_approved = True  # admins are auto-approved
    db.commit()
    return {"detail": f"{target.display_name} admin={'yes' if data.approved else 'no'}"}


# ── Game Time Routes ──────────────────────────────

@app.patch("/api/parties/{party_id}/time", response_model=PartyOut)
async def set_game_time(
    party_id: int,
    data: GameTimeUpdate,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    old_time = party.game_time or ""
    party.game_time = data.game_time
    if data.game_era is not None:
        party.game_era = data.game_era
    db.commit()
    db.refresh(party)

    await manager.broadcast(party_id, {
        "type": "time_changed",
        "old_time": old_time,
        "new_time": party.game_time,
        "game_era": party.game_era,
    })

    log = ActionLog(
        party_id=party_id, user_id=user.id, action_type="time_changed",
        payload={"old": old_time, "new": party.game_time},
    )
    db.add(log)
    db.commit()

    return _party_to_out(party, db)


@app.post("/api/parties/{party_id}/time/advance", response_model=PartyOut)
async def advance_game_time(
    party_id: int,
    data: GameTimeAdvance,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """Quick advance time by amount+unit. Appends to current game_time string."""
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    old_time = party.game_time or ""
    unit_label = data.unit + ("s" if data.amount != 1 else "")
    advance_text = f"+{data.amount} {unit_label}"

    # If there's existing time, append the advance note
    if old_time:
        party.game_time = f"{old_time} ({advance_text})"
    else:
        party.game_time = advance_text

    db.commit()
    db.refresh(party)

    await manager.broadcast(party_id, {
        "type": "time_advanced",
        "advance": advance_text,
        "new_time": party.game_time,
    })

    log = ActionLog(
        party_id=party_id, user_id=user.id, action_type="time_advanced",
        payload={"advance": advance_text, "old": old_time, "new": party.game_time},
    )
    db.add(log)
    db.commit()

    return _party_to_out(party, db)


# ── Firearms Routes ───────────────────────────────

@app.get("/api/firearms", response_model=list[FirearmOut])
def list_firearms(era: Optional[str] = None):
    return get_firearms_by_era(era)


@app.post("/api/encounter-participants/{part_id}/weapon")
async def set_participant_weapon(
    part_id: int,
    data: SetParticipantWeapon,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")
    enc = db.query(Encounter).filter(Encounter.id == part.encounter_id).first()
    _require_game_master(user.id, enc.party_id, db)

    weapon = get_firearm(data.weapon_name)
    if not weapon:
        raise HTTPException(status_code=404, detail=f"Weapon '{data.weapon_name}' not found")

    part.weapon = weapon["name"]
    part.ammo_current = data.ammo_override if data.ammo_override is not None else weapon["ammo"]
    part.ammo_max = weapon["ammo"]
    db.commit()

    await manager.broadcast(enc.party_id, {
        "type": "encounter_updated", "encounter_id": enc.id,
    })

    return {"weapon": part.weapon, "ammo_current": part.ammo_current, "ammo_max": part.ammo_max}


@app.post("/api/encounter-participants/{part_id}/reload")
async def reload_weapon(
    part_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")
    enc = db.query(Encounter).filter(Encounter.id == part.encounter_id).first()
    # GM or the character's owner can reload
    is_gm = False
    try:
        _require_game_master(user.id, enc.party_id, db)
        is_gm = True
    except HTTPException:
        pass
    is_owner = part.character_id and db.query(Character).filter(
        Character.id == part.character_id, Character.user_id == user.id
    ).first() is not None

    if not is_gm and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not part.weapon:
        raise HTTPException(status_code=400, detail="No weapon equipped")

    part.ammo_current = part.ammo_max
    db.commit()

    name = part.npc_name or ""
    if part.character_id:
        c = db.query(Character).filter(Character.id == part.character_id).first()
        if c:
            name = c.name

    await manager.broadcast(enc.party_id, {
        "type": "weapon_reloaded",
        "participant": name,
        "weapon": part.weapon,
        "encounter_id": enc.id,
    })

    return {"ammo_current": part.ammo_current, "ammo_max": part.ammo_max}


@app.post("/api/firearms/shoot")
async def firearm_shoot(
    data: FirearmShot,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """
    Resolve a firearm attack: skill check, malfunction, damage, ammo consumption.
    GM rolls for NPCs; players roll for their own character.
    """
    enc = db.query(Encounter).filter(Encounter.id == data.encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    shooter = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.shooter_participant_id).first()
    target = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.target_participant_id).first()
    if not shooter or not target:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Permission: GM can fire with anyone; player only with their own character
    if not _can_act_for_participant(user.id, shooter, enc.party_id, db):
        raise HTTPException(status_code=403, detail="You can only fire with your own character")

    weapon = get_firearm(data.weapon_name)
    if not weapon:
        raise HTTPException(status_code=404, detail=f"Weapon '{data.weapon_name}' not found")

    # Check ammo
    shots = min(data.shots_fired, weapon["rate_of_fire"])
    if shooter.ammo_current is not None and shooter.ammo_current < shots:
        shots = shooter.ammo_current
        if shots <= 0:
            return {
                "result": "no_ammo",
                "message": f"Click! No ammunition remaining.",
                "shooter": _part_name(shooter, db),
                "target": _part_name(target, db),
            }

    # Consume ammo
    if shooter.ammo_current is not None:
        shooter.ammo_current = max(0, shooter.ammo_current - shots)

    # Get shooter's skill value
    skill_value = 20  # default for NPCs
    if shooter.character_id:
        char = db.query(Character).filter(Character.id == shooter.character_id).first()
        if char:
            # Find the matching firearms skill
            for cs in db.query(CharacterSkill).filter(CharacterSkill.character_id == char.id).all():
                sk = db.query(Skill).filter(Skill.id == cs.skill_id).first()
                if sk and sk.name == weapon["skill"]:
                    skill_value = cs.total
                    break

    # Range modifiers
    range_mod = {
        "point_blank": min(skill_value * 2, 99),  # double skill at point blank
        "normal": skill_value,
        "long": skill_value // 2,
        "extreme": skill_value // 5,
    }
    effective_skill = range_mod.get(data.range_category, skill_value)
    if data.called_shot:
        effective_skill = effective_skill // 2  # penalty die equivalent

    results = []
    total_damage = 0

    for shot_num in range(shots):
        roll = random.randint(1, 100)

        # Check malfunction first
        if roll >= weapon["malfunction"]:
            results.append({
                "shot": shot_num + 1,
                "roll": roll,
                "result": "malfunction",
                "message": "MALFUNCTION! Weapon jams.",
            })
            break  # weapon jams, no more shots

        # Determine success
        if roll == 1:
            success = "critical"
        elif roll <= effective_skill // 5:
            success = "extreme"
        elif roll <= effective_skill // 2:
            success = "hard"
        elif roll <= effective_skill:
            success = "regular"
        elif roll >= 96 and effective_skill < 50:
            success = "fumble"
        elif roll == 100:
            success = "fumble"
        else:
            success = "fail"

        # Calculate damage if hit
        damage = 0
        if success in ("critical", "extreme", "hard", "regular"):
            damage = _roll_damage(weapon["damage"])
            if success == "critical":
                damage = damage * 2  # max damage on critical
            if success == "extreme" and data.called_shot:
                damage = damage * 2  # impale on extreme + called shot

            # Apply damage to target
            if target.hp_current is not None:
                target.hp_current = max(0, target.hp_current - damage)
                if target.hp_current <= 0:
                    target.is_active = False

            total_damage += damage

        results.append({
            "shot": shot_num + 1,
            "roll": roll,
            "effective_skill": effective_skill,
            "result": success,
            "damage": damage,
        })

    # Sync target HP to character if linked
    if target.character_id and target.hp_current is not None:
        char = db.query(Character).filter(Character.id == target.character_id).first()
        if char:
            char.hp_current = target.hp_current

    db.commit()

    shooter_name = _part_name(shooter, db)
    target_name = _part_name(target, db)

    # Log
    log = ActionLog(
        party_id=enc.party_id, user_id=user.id, action_type="firearm_attack",
        payload={
            "shooter": shooter_name,
            "target": target_name,
            "weapon": weapon["name"],
            "range": data.range_category,
            "shots": shots,
            "results": results,
            "total_damage": total_damage,
        },
    )
    db.add(log)
    db.commit()

    # Broadcast
    await manager.broadcast(enc.party_id, {
        "type": "firearm_attack",
        "shooter": shooter_name,
        "target": target_name,
        "weapon": weapon["name"],
        "range": data.range_category,
        "shots": shots,
        "results": results,
        "total_damage": total_damage,
        "target_hp": target.hp_current,
        "target_active": target.is_active,
        "shooter_ammo": shooter.ammo_current,
        "encounter_id": enc.id,
    })

    return {
        "shooter": shooter_name,
        "target": target_name,
        "weapon": weapon["name"],
        "range": data.range_category,
        "shots": shots,
        "results": results,
        "total_damage": total_damage,
        "target_hp": target.hp_current,
        "target_active": target.is_active,
        "shooter_ammo": shooter.ammo_current,
    }


def _part_name(part: EncounterParticipant, db: Session) -> str:
    if part.character_id:
        c = db.query(Character).filter(Character.id == part.character_id).first()
        if c:
            return c.name
    return part.npc_name or "Unknown"


def _roll_damage(damage_str: str) -> int:
    """Parse and roll damage like '1d6', '2d6+4', '1d10+2', '4d6/2d6/1d6' (use first)."""
    # For shotguns with range-based damage, take the first value
    dmg = damage_str.split("/")[0].strip()

    total = 0
    # Parse NdM+B format
    parts = dmg.replace("-", "+-").split("+")
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if "d" in part.lower():
            count_str, sides_str = part.lower().split("d")
            count = int(count_str) if count_str else 1
            sides = int(sides_str)
            for _ in range(count):
                total += random.randint(1, sides)
        else:
            total += int(part)
    return max(0, total)


# ── Melee Attack Route ─────────────────────────────

def _calc_damage_bonus(str_stat: int, siz_stat: int) -> str:
    """CoC 7e damage bonus based on STR+SIZ."""
    total = str_stat + siz_stat
    if total <= 64:
        return "-2"
    elif total <= 84:
        return "-1"
    elif total <= 124:
        return "0"
    elif total <= 164:
        return "+1d4"
    elif total <= 204:
        return "+1d6"
    else:
        return "+2d6"


@app.post("/api/melee/attack")
async def melee_attack(
    data: MeleeAttack,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """Resolve a melee attack. GM rolls for NPCs; players roll for their own character."""
    enc = db.query(Encounter).filter(Encounter.id == data.encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    attacker = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.attacker_participant_id).first()
    defender = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.defender_participant_id).first()
    if not attacker or not defender:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Permission: GM can attack with anyone; player only with their own character
    if not _can_act_for_participant(user.id, attacker, enc.party_id, db):
        raise HTTPException(status_code=403, detail="You can only attack with your own character")

    weapon = get_weapon(data.weapon_name)
    weapon_damage = weapon["damage"] if weapon else "1d3+DB"
    weapon_name = weapon["name"] if weapon else data.weapon_name

    # Get attacker's skill value
    skill_value = data.attacker_skill_value
    if attacker.character_id:
        char = db.query(Character).filter(Character.id == attacker.character_id).first()
        if char and weapon:
            for cs in db.query(CharacterSkill).filter(CharacterSkill.character_id == char.id).all():
                sk = db.query(Skill).filter(Skill.id == cs.skill_id).first()
                if sk and sk.name == weapon["skill"]:
                    skill_value = cs.total
                    break

    # Get defender dodge
    dodge_value = data.defender_dodge_value
    if defender.character_id and dodge_value == 0:
        char = db.query(Character).filter(Character.id == defender.character_id).first()
        if char:
            dodge_value = char.dex_stat // 2
            for cs in db.query(CharacterSkill).filter(CharacterSkill.character_id == char.id).all():
                sk = db.query(Skill).filter(Skill.id == cs.skill_id).first()
                if sk and sk.name == "Dodge":
                    dodge_value = cs.total
                    break

    effective_skill = skill_value // 2 if data.called_shot else skill_value

    # Attack roll
    attack_roll = random.randint(1, 100)
    if attack_roll == 1:
        attack_level = "critical"
    elif attack_roll <= effective_skill // 5:
        attack_level = "extreme"
    elif attack_roll <= effective_skill // 2:
        attack_level = "hard"
    elif attack_roll <= effective_skill:
        attack_level = "regular"
    elif attack_roll >= 96 and effective_skill < 50:
        attack_level = "fumble"
    elif attack_roll == 100:
        attack_level = "fumble"
    else:
        attack_level = "fail"

    attack_success = attack_level in ("critical", "extreme", "hard", "regular")

    # Dodge roll (if defender attempts)
    dodge_roll = None
    dodge_level = None
    dodged = False
    if dodge_value > 0 and attack_success:
        dodge_roll = random.randint(1, 100)
        dodge_success = dodge_roll <= dodge_value
        if dodge_roll == 1:
            dodge_level = "critical"
        elif dodge_roll <= dodge_value // 5:
            dodge_level = "extreme"
        elif dodge_roll <= dodge_value // 2:
            dodge_level = "hard"
        elif dodge_roll <= dodge_value:
            dodge_level = "regular"
        else:
            dodge_level = "fail"

        # Compare success levels: defender must match or beat attacker
        levels = {"critical": 4, "extreme": 3, "hard": 2, "regular": 1, "fail": 0, "fumble": -1}
        if levels.get(dodge_level, 0) >= levels.get(attack_level, 0):
            dodged = True

    # Calculate damage
    damage = 0
    db_text = ""
    if attack_success and not dodged:
        # Calculate damage bonus
        attacker_str = 50
        attacker_siz = 50
        if attacker.character_id:
            achar = db.query(Character).filter(Character.id == attacker.character_id).first()
            if achar:
                attacker_str = achar.str_stat
                attacker_siz = achar.siz_stat

        db_text = _calc_damage_bonus(attacker_str, attacker_siz)

        # Parse weapon damage, replacing DB with actual bonus
        dmg_str = weapon_damage.replace("+DB", "").replace("DB", "").strip()
        if dmg_str:
            damage = _roll_damage(dmg_str)

        # Add damage bonus
        if db_text.startswith("+"):
            bonus_str = db_text[1:]
            if "d" in bonus_str:
                damage += _roll_damage(bonus_str)
            else:
                damage += int(bonus_str)
        elif db_text.startswith("-"):
            damage = max(0, damage + int(db_text))

        if attack_level == "critical":
            damage = damage * 2
        if attack_level == "extreme" and data.called_shot:
            damage = damage * 2

        # Apply damage
        if defender.hp_current is not None:
            defender.hp_current = max(0, defender.hp_current - damage)
            if defender.hp_current <= 0:
                defender.is_active = False

        # Sync to character
        if defender.character_id:
            dchar = db.query(Character).filter(Character.id == defender.character_id).first()
            if dchar:
                dchar.hp_current = defender.hp_current

    db.commit()

    attacker_name = _part_name(attacker, db)
    defender_name = _part_name(defender, db)

    result = {
        "attacker": attacker_name,
        "defender": defender_name,
        "weapon": weapon_name,
        "attack_roll": attack_roll,
        "attack_skill": effective_skill,
        "attack_level": attack_level,
        "attack_success": attack_success,
        "dodge_roll": dodge_roll,
        "dodge_skill": dodge_value,
        "dodge_level": dodge_level,
        "dodged": dodged,
        "damage": damage,
        "damage_bonus": db_text,
        "defender_hp": defender.hp_current,
        "defender_active": defender.is_active,
        "encounter_id": enc.id,
    }

    log = ActionLog(
        party_id=enc.party_id, user_id=user.id, action_type="melee_attack",
        payload=result,
    )
    db.add(log)
    db.commit()

    await manager.broadcast(enc.party_id, {"type": "melee_attack", **result})
    return result


# ── Chase Check Routes ────────────────────────────

@app.post("/api/chase/speed-check")
async def chase_speed_check(
    data: ChaseSpeedCheck,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """
    CON roll in a chase. Success = +1 movement, Fail = -1 movement.
    GM rolls for NPCs; players roll for their own character.
    """
    enc = db.query(Encounter).filter(Encounter.id == data.encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")

    if not _can_act_for_participant(user.id, part, enc.party_id, db):
        raise HTTPException(status_code=403, detail="You can only roll for your own character")

    # CON value: auto-detect for player characters, else use provided
    con_value = data.con_value
    if part.character_id:
        char = db.query(Character).filter(Character.id == part.character_id).first()
        if char:
            con_value = char.con_stat

    roll = random.randint(1, 100)
    success = roll <= con_value
    old_mov = part.movement_points
    new_mov = old_mov + 1 if success else max(0, old_mov - 1)
    part.movement_points = new_mov
    db.commit()

    name = _part_name(part, db)
    result = {
        "participant": name, "roll": roll, "con_value": con_value,
        "success": success, "old_mov": old_mov, "new_mov": new_mov,
        "encounter_id": enc.id,
    }
    log = ActionLog(party_id=enc.party_id, user_id=user.id, action_type="chase_speed", payload=result)
    db.add(log)
    db.commit()
    await manager.broadcast(enc.party_id, {"type": "chase_speed", **result})
    return result


@app.post("/api/chase/hazard-check")
async def chase_hazard_check(
    data: ChaseHazardCheck,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    """
    Obstacle/hazard/barrier check. GM rolls for NPCs; players for their own character.
    obstacle: fail = -1 mov. hazard: fail = -1 mov + 1d6 damage. barrier: fail = -1 mov (retry).
    """
    enc = db.query(Encounter).filter(Encounter.id == data.encounter_id).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    part = db.query(EncounterParticipant).filter(EncounterParticipant.id == data.participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")

    if not _can_act_for_participant(user.id, part, enc.party_id, db):
        raise HTTPException(status_code=403, detail="You can only roll for your own character")

    skill_base = data.skill_value
    diff_mod = {"regular": 1.0, "hard": 0.5, "extreme": 0.2}
    threshold = int(skill_base * diff_mod.get(data.difficulty, 1.0))

    roll = random.randint(1, 100)
    success = roll <= threshold

    old_mov = part.movement_points
    mov_change = 0 if success else -1
    hp_lost = 0
    if not success:
        part.movement_points = max(0, old_mov - 1)
        if data.hazard_type == "hazard":
            hp_lost = random.randint(1, 6)
            if part.hp_current is not None:
                part.hp_current = max(0, part.hp_current - hp_lost)
                if part.hp_current <= 0:
                    part.is_active = False
                if part.character_id:
                    char = db.query(Character).filter(Character.id == part.character_id).first()
                    if char:
                        char.hp_current = part.hp_current
    db.commit()

    name = _part_name(part, db)
    result = {
        "participant": name, "hazard_type": data.hazard_type, "difficulty": data.difficulty,
        "roll": roll, "threshold": threshold, "success": success,
        "mov_change": mov_change, "hp_lost": hp_lost,
        "new_mov": part.movement_points, "encounter_id": enc.id,
    }
    log = ActionLog(party_id=enc.party_id, user_id=user.id, action_type="chase_hazard", payload=result)
    db.add(log)
    db.commit()
    await manager.broadcast(enc.party_id, {"type": "chase_hazard", **result})
    return result


# ── Language Route ────────────────────────────────

@app.patch("/api/auth/language", response_model=UserOut)
def set_language(
    data: LanguageUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.language not in ("en", "ru"):
        raise HTTPException(status_code=400, detail="Unsupported language")
    user.language = data.language
    db.commit()
    db.refresh(user)
    return user


# ── Session Timer Routes ──────────────────────────

def _timer_payload(party: Party) -> dict:
    remaining = None
    if party.timer_running and party.timer_ends_at:
        delta = (party.timer_ends_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
        remaining = max(0, int(delta))
    elif party.timer_paused_remaining is not None:
        remaining = party.timer_paused_remaining
    return {
        "timer_label": party.timer_label,
        "timer_total_seconds": party.timer_total_seconds,
        "timer_remaining_seconds": remaining,
        "timer_running": bool(party.timer_running),
    }


@app.post("/api/parties/{party_id}/timer/start")
async def timer_start(
    party_id: int, data: TimerStart,
    user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    seconds = max(1, data.duration_seconds)
    party.timer_label = data.label
    party.timer_total_seconds = seconds
    party.timer_ends_at = datetime.now(timezone.utc) + timedelta(seconds=seconds)
    party.timer_paused_remaining = None
    party.timer_running = True
    db.commit()

    payload = _timer_payload(party)
    await manager.broadcast(party_id, {"type": "timer_update", **payload})
    return payload


@app.post("/api/parties/{party_id}/timer/pause")
async def timer_pause(
    party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    if party.timer_running and party.timer_ends_at:
        delta = (party.timer_ends_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
        party.timer_paused_remaining = max(0, int(delta))
    party.timer_running = False
    db.commit()

    payload = _timer_payload(party)
    await manager.broadcast(party_id, {"type": "timer_update", **payload})
    return payload


@app.post("/api/parties/{party_id}/timer/resume")
async def timer_resume(
    party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    remaining = party.timer_paused_remaining or 0
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Nothing to resume")
    party.timer_ends_at = datetime.now(timezone.utc) + timedelta(seconds=remaining)
    party.timer_paused_remaining = None
    party.timer_running = True
    db.commit()

    payload = _timer_payload(party)
    await manager.broadcast(party_id, {"type": "timer_update", **payload})
    return payload


@app.post("/api/parties/{party_id}/timer/adjust")
async def timer_adjust(
    party_id: int, data: TimerAdjust,
    user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    """Add or subtract time. Works while running or paused."""
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    if party.timer_running and party.timer_ends_at:
        new_end = party.timer_ends_at.replace(tzinfo=timezone.utc) + timedelta(seconds=data.delta_seconds)
        # Never go below "now"
        floor = datetime.now(timezone.utc)
        party.timer_ends_at = max(new_end, floor)
    elif party.timer_paused_remaining is not None:
        party.timer_paused_remaining = max(0, party.timer_paused_remaining + data.delta_seconds)
    else:
        raise HTTPException(status_code=400, detail="No active timer")

    # Keep total in sync so the bar scales sensibly
    if party.timer_total_seconds is not None and data.delta_seconds > 0:
        party.timer_total_seconds += data.delta_seconds
    db.commit()

    payload = _timer_payload(party)
    await manager.broadcast(party_id, {"type": "timer_update", **payload})
    return payload


@app.post("/api/parties/{party_id}/timer/reset")
async def timer_reset(
    party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    """Restart the timer at its original duration."""
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    if not party.timer_total_seconds:
        raise HTTPException(status_code=400, detail="No timer to reset")

    party.timer_ends_at = datetime.now(timezone.utc) + timedelta(seconds=party.timer_total_seconds)
    party.timer_paused_remaining = None
    party.timer_running = True
    db.commit()

    payload = _timer_payload(party)
    await manager.broadcast(party_id, {"type": "timer_update", **payload})
    return payload


@app.post("/api/parties/{party_id}/timer/clear")
async def timer_clear(
    party_id: int, user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    _require_game_master(user.id, party_id, db)
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    party.timer_label = None
    party.timer_total_seconds = None
    party.timer_ends_at = None
    party.timer_paused_remaining = None
    party.timer_running = False
    db.commit()
    await manager.broadcast(party_id, {"type": "timer_update", **_timer_payload(party)})
    return _timer_payload(party)


# ── Weapons Catalog Route ─────────────────────────

@app.get("/api/weapons")
def list_weapons(weapon_type: Optional[str] = None):
    if weapon_type:
        return get_weapons_by_type(weapon_type)
    return get_all_weapons()


# ── Spell Routes ──────────────────────────────────

@app.get("/api/spells", response_model=list[SpellOut])
def list_spells(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Spell)
    if category:
        q = q.filter(Spell.category == category)
    return q.order_by(Spell.name).all()


@app.post("/api/characters/{char_id}/learn-spell")
async def learn_spell(
    char_id: int,
    data: LearnSpell,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    is_owner = char.user_id == user.id
    is_gm = False
    try:
        _require_game_master(user.id, char.party_id, db)
        is_gm = True
    except HTTPException:
        pass
    if not is_owner and not is_gm:
        raise HTTPException(status_code=403, detail="Not authorized")

    spell = db.query(Spell).filter(Spell.id == data.spell_id).first()
    if not spell:
        raise HTTPException(status_code=404, detail="Spell not found")

    existing = db.query(CharacterSpell).filter(
        CharacterSpell.character_id == char.id,
        CharacterSpell.spell_id == data.spell_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Spell already known")

    cs = CharacterSpell(character_id=char.id, spell_id=data.spell_id)
    db.add(cs)

    san_cost = 0
    if spell.category in ("summon", "attack"):
        san_cost = max(1, spell.cost_san // 2)
        char.sanity_current = max(0, char.sanity_current - san_cost)

    db.commit()
    await manager.broadcast(char.party_id, {
        "type": "spell_learned", "character_name": char.name,
        "spell_name": spell.name, "san_cost": san_cost,
    })
    log = ActionLog(
        party_id=char.party_id, user_id=user.id, action_type="spell_learned",
        payload={"character": char.name, "spell": spell.name, "san_cost": san_cost},
    )
    db.add(log)
    db.commit()
    return {"detail": f"{char.name} learned {spell.name}", "san_cost": san_cost}


@app.delete("/api/characters/{char_id}/spells/{spell_id}")
def forget_spell(
    char_id: int, spell_id: int,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    try:
        _require_game_master(user.id, char.party_id, db)
    except HTTPException:
        if char.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    cs = db.query(CharacterSpell).filter(
        CharacterSpell.character_id == char.id,
        CharacterSpell.spell_id == spell_id,
    ).first()
    if cs:
        db.delete(cs)
        db.commit()
    return {"detail": "Spell forgotten"}


@app.post("/api/spells/cast")
async def cast_spell(
    data: CastSpellRequest,
    user: User = Depends(get_approved_user),
    db: Session = Depends(get_db),
):
    _require_party_member(user.id, data.party_id, db)

    spell = db.query(Spell).filter(Spell.id == data.spell_id).first()
    if not spell:
        raise HTTPException(status_code=404, detail="Spell not found")

    caster_name = data.npc_name or "Unknown"
    caster_pow = 50
    char = None

    if data.character_id:
        char = db.query(Character).filter(Character.id == data.character_id).first()
        if not char:
            raise HTTPException(status_code=404, detail="Character not found")
        is_gm = False
        try:
            _require_game_master(user.id, data.party_id, db)
            is_gm = True
        except HTTPException:
            pass
        if char.user_id != user.id and not is_gm:
            raise HTTPException(status_code=403, detail="Not your character")

        caster_name = char.name
        caster_pow = char.pow_stat

        if char.mp_current < spell.cost_mp:
            return {"success": False, "result": "insufficient_mp",
                    "message": f"{caster_name} doesn't have enough MP ({char.mp_current}/{spell.cost_mp}).",
                    "caster": caster_name, "spell": spell.name}

        char.mp_current = max(0, char.mp_current - spell.cost_mp)
        char.sanity_current = max(0, char.sanity_current - spell.cost_san)
    else:
        _require_game_master(user.id, data.party_id, db)

    roll = random.randint(1, 100)
    success = roll <= caster_pow
    if roll == 1:
        success_level = "critical"
    elif roll <= caster_pow // 5:
        success_level = "extreme"
    elif roll <= caster_pow // 2:
        success_level = "hard"
    elif roll <= caster_pow:
        success_level = "regular"
    elif roll >= 96:
        success_level = "fumble"
    else:
        success_level = "fail"

    if char:
        db.commit()

    result = {
        "success": success, "caster": caster_name, "spell": spell.name,
        "roll": roll, "pow": caster_pow, "success_level": success_level,
        "mp_cost": spell.cost_mp, "san_cost": spell.cost_san,
        "mp_remaining": char.mp_current if char else None,
        "san_remaining": char.sanity_current if char else None,
        "effect": spell.effect if success else "The spell fizzles.",
        "target": data.target_description,
    }
    log = ActionLog(party_id=data.party_id, user_id=user.id, action_type="spell_cast", payload=result)
    db.add(log)
    db.commit()
    await manager.broadcast(data.party_id, {"type": "spell_cast", **result})
    return result


@app.patch("/api/characters/{char_id}/biography")
async def update_biography(
    char_id: int, data: dict,
    user: User = Depends(get_approved_user), db: Session = Depends(get_db),
):
    char = db.query(Character).filter(Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    is_owner = char.user_id == user.id
    is_gm = False
    try:
        _require_game_master(user.id, char.party_id, db)
        is_gm = True
    except HTTPException:
        pass
    if not is_owner and not is_gm:
        raise HTTPException(status_code=403, detail="Not authorized")
    for field in ["description", "ideals", "significant_people", "significant_places",
                  "possessions", "injuries_scars", "phobias", "inventory"]:
        if field in data:
            setattr(char, field, data[field])
    if "equipment_weapons" in data:
        weapons = [get_weapon(w) for w in data["equipment_weapons"] if get_weapon(w)]
        char.equipment_weapons = weapons if weapons else None
    db.commit()
    return {"detail": "Biography updated"}


@app.websocket("/ws/{party_id}")
async def websocket_endpoint(websocket: WebSocket, party_id: int):
    await manager.connect(party_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(party_id, websocket)


# ── Health Check ──────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"}
