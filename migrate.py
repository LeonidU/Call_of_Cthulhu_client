#!/usr/bin/env python3
"""
Migration script: upgrades old cthulhu.db to the new schema.
Preserves all existing users, parties, characters, artifacts, and action logs.

Usage:
  1. Stop the server
  2. Back up your DB:  cp cthulhu.db cthulhu.db.backup
  3. Run:  python migrate.py
  4. Start the server
"""
import sqlite3
import sys
import os
import shutil

DB_PATH = os.path.join(os.path.dirname(__file__), "cthulhu.db")


def get_columns(cursor, table):
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def get_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} not found. Run this from the backend/ directory.")
        sys.exit(1)

    # Back up first
    backup = DB_PATH + ".pre_migration_backup"
    if not os.path.exists(backup):
        shutil.copy2(DB_PATH, backup)
        print(f"✓ Backup created: {backup}")
    else:
        print(f"  Backup already exists: {backup}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = get_tables(cur)
    changes = 0

    # ─── 1. Users: add is_admin, is_approved ──────────────
    if "users" in tables:
        cols = get_columns(cur, "users")
        if "is_admin" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
            print("  + users.is_admin")
            changes += 1
        if "is_approved" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0")
            # Approve ALL existing users (they were created before the approval system)
            cur.execute("UPDATE users SET is_approved = 1")
            print("  + users.is_approved (all existing users auto-approved)")
            changes += 1

    # ─── 2. Parties: add game_time, game_era ──────────────
    if "parties" in tables:
        cols = get_columns(cur, "parties")
        if "game_time" not in cols:
            cur.execute("ALTER TABLE parties ADD COLUMN game_time TEXT DEFAULT ''")
            print("  + parties.game_time")
            changes += 1
        if "game_era" not in cols:
            cur.execute("ALTER TABLE parties ADD COLUMN game_era TEXT DEFAULT '1920s'")
            print("  + parties.game_era")
            changes += 1

    # ─── 3. Encounters table ──────────────────────────────
    if "encounters" not in tables:
        cur.execute("""
            CREATE TABLE encounters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                party_id INTEGER NOT NULL REFERENCES parties(id),
                name VARCHAR(200) NOT NULL,
                encounter_type VARCHAR(20) NOT NULL DEFAULT 'battle',
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                current_round INTEGER DEFAULT 1,
                current_turn_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + encounters table created")
        changes += 1

    # ─── 4. Encounter participants table ──────────────────
    if "encounter_participants" not in tables:
        cur.execute("""
            CREATE TABLE encounter_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                encounter_id INTEGER NOT NULL REFERENCES encounters(id),
                character_id INTEGER REFERENCES characters(id),
                npc_name VARCHAR(100),
                initiative INTEGER DEFAULT 0,
                hp_current INTEGER,
                hp_max INTEGER,
                is_active BOOLEAN DEFAULT 1,
                movement_points INTEGER DEFAULT 0,
                notes TEXT,
                weapon VARCHAR(100),
                ammo_current INTEGER,
                ammo_max INTEGER
            )
        """)
        print("  + encounter_participants table created")
        changes += 1
    else:
        # Table exists but may lack weapon columns
        cols = get_columns(cur, "encounter_participants")
        if "weapon" not in cols:
            cur.execute("ALTER TABLE encounter_participants ADD COLUMN weapon VARCHAR(100)")
            print("  + encounter_participants.weapon")
            changes += 1
        if "ammo_current" not in cols:
            cur.execute("ALTER TABLE encounter_participants ADD COLUMN ammo_current INTEGER")
            print("  + encounter_participants.ammo_current")
            changes += 1
        if "ammo_max" not in cols:
            cur.execute("ALTER TABLE encounter_participants ADD COLUMN ammo_max INTEGER")
            print("  + encounter_participants.ammo_max")
            changes += 1

    # ─── 5. Seed admin user ───────────────────────────────
    cur.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cur.fetchone():
        import bcrypt
        password = "6KGcjEYlWDPjgFSm/42bdg=="
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cur.execute(
            "INSERT INTO users (username, password_hash, display_name, is_admin, is_approved) VALUES (?, ?, ?, 1, 1)",
            ("admin", hashed, "Administrator"),
        )
        print("  + admin user seeded")
        changes += 1
    else:
        # Make sure existing admin has the flags
        cur.execute("UPDATE users SET is_admin = 1, is_approved = 1 WHERE username = 'admin'")
        print("  ✓ admin user already exists")

    # ─── 6. Character biography columns ───────────────
    if "characters" in tables:
        cols = get_columns(cur, "characters")
        bio_cols = {
            "description": "TEXT", "ideals": "TEXT",
            "significant_people": "TEXT", "significant_places": "TEXT",
            "possessions": "TEXT", "injuries_scars": "TEXT", "phobias": "TEXT",
            "equipment_weapons": "TEXT", "inventory": "TEXT",
        }
        for col, typ in bio_cols.items():
            if col not in cols:
                cur.execute(f"ALTER TABLE characters ADD COLUMN {col} {typ}")
                print(f"  + characters.{col}")
                changes += 1

    # ─── 7. Spells table ─────────────────────────────
    if "spells" not in tables:
        cur.execute("""
            CREATE TABLE spells (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(200) NOT NULL UNIQUE,
                cost_mp INTEGER DEFAULT 0,
                cost_san INTEGER DEFAULT 0,
                cast_time VARCHAR(100),
                description TEXT,
                effect TEXT,
                category VARCHAR(50) DEFAULT 'other'
            )
        """)
        print("  + spells table created")
        changes += 1

    # ─── 8. Character spells table ────────────────────
    if "character_spells" not in tables:
        cur.execute("""
            CREATE TABLE character_spells (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL REFERENCES characters(id),
                spell_id INTEGER NOT NULL REFERENCES spells(id),
                learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(character_id, spell_id)
            )
        """)
        print("  + character_spells table created")
        changes += 1

    # ─── 9. Seed spells if empty ──────────────────────
    tables = get_tables(cur)  # refresh
    if "spells" in tables:
        cur.execute("SELECT COUNT(*) FROM spells")
        if cur.fetchone()[0] == 0:
            from seed_spells import SPELLS
            for s in SPELLS:
                cur.execute(
                    "INSERT INTO spells (name, cost_mp, cost_san, cast_time, description, effect, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (s["name"], s["cost_mp"], s["cost_san"], s.get("cast_time"), s.get("description"), s.get("effect"), s.get("category", "other")),
                )
            print(f"  + seeded {len(SPELLS)} spells")
            changes += 1

    # ─── 10. Language column on users ─────────────────
    if "users" in tables:
        ucols = get_columns(cur, "users")
        if "language" not in ucols:
            cur.execute("ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'en'")
            print("  + users.language")
            changes += 1

    # ─── 11. Timer columns on parties ─────────────────
    if "parties" in tables:
        pcols = get_columns(cur, "parties")
        timer_cols = {
            "timer_label": "VARCHAR(200)",
            "timer_total_seconds": "INTEGER",
            "timer_ends_at": "TIMESTAMP",
            "timer_paused_remaining": "INTEGER",
            "timer_running": "BOOLEAN DEFAULT 0",
        }
        for col, typ in timer_cols.items():
            if col not in pcols:
                cur.execute(f"ALTER TABLE parties ADD COLUMN {col} {typ}")
                print(f"  + parties.{col}")
                changes += 1

    # ─── 12. Russian names on skills & spells ─────────
    from translations_ru import SKILLS_RU, SPELLS_RU
    if "skills" in tables:
        scols = get_columns(cur, "skills")
        if "name_ru" not in scols:
            cur.execute("ALTER TABLE skills ADD COLUMN name_ru VARCHAR(150)")
            print("  + skills.name_ru")
            changes += 1
        n = 0
        for en, ru in SKILLS_RU.items():
            cur.execute("UPDATE skills SET name_ru = ? WHERE name = ? AND (name_ru IS NULL OR name_ru = '')", (ru, en))
            n += cur.rowcount
        if n:
            print(f"  + translated {n} skills to Russian")
            changes += 1

    if "spells" in tables:
        spcols = get_columns(cur, "spells")
        if "name_ru" not in spcols:
            cur.execute("ALTER TABLE spells ADD COLUMN name_ru VARCHAR(250)")
            print("  + spells.name_ru")
            changes += 1
        n = 0
        for en, ru in SPELLS_RU.items():
            cur.execute("UPDATE spells SET name_ru = ? WHERE name = ? AND (name_ru IS NULL OR name_ru = '')", (ru, en))
            n += cur.rowcount
        if n:
            print(f"  + translated {n} spells to Russian")
            changes += 1

    conn.commit()

    # ─── Summary ──────────────────────────────────────────
    # Count data
    cur.execute("SELECT COUNT(*) FROM users")
    n_users = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM parties")
    n_parties = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM characters")
    n_chars = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM artifacts")
    n_artifacts = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM skills")
    n_skills = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM action_logs")
    n_logs = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM spells")
    n_spells_db = cur.fetchone()[0]

    conn.close()

    print()
    print("════════════════════════════════════════════════")
    print("  Migration complete!")
    print(f"  {changes} schema changes applied")
    print()
    print(f"  Preserved data:")
    print(f"    Users:       {n_users}")
    print(f"    Parties:     {n_parties}")
    print(f"    Characters:  {n_chars}")
    print(f"    Artifacts:   {n_artifacts}")
    print(f"    Skills:      {n_skills}")
    print(f"    Action logs: {n_logs}")
    print(f"    Spells:      {n_spells_db}")
    print()
    print("  All existing users have been auto-approved.")
    print("  Admin login:  admin / 6KGcjEYlWDPjgFSm/42bdg==")
    print("════════════════════════════════════════════════")


if __name__ == "__main__":
    migrate()
