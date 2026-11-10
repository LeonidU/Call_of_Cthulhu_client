# Call of Cthulhu — Remote Play

A web application for playing Call of Cthulhu 7th Edition remotely with friends.

## Features

- **Authentication** — Register/login with JWT tokens
- **Party Management** — Create parties, join via invite code, Game Master role
- **Character Creation** — 4-step wizard: identity → characteristics → skill allocation → review
- **Full Skill Set** — All CoC 7e skills seeded in DB, including specializations, uncommon, and modern era
- **Dice Roller** — d2 through d100, skill checks with success levels (critical/extreme/hard/regular/fail/fumble)
- **Artifacts** — GM uploads images, reveals them to players in real-time
- **Real-time Updates** — WebSocket broadcasts for dice rolls and artifact reveals
- **Action Log** — Full history of party actions
- **Game Master Panel** — Manage artifacts, add members, roll for NPCs

## Tech Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Backend   | FastAPI + SQLAlchemy + SQLite |
| Frontend  | React 18 + Vite + React Router |
| Auth      | JWT (python-jose) + bcrypt  |
| Real-time | WebSockets (native FastAPI) |
| Styling   | Custom CSS (Lovecraftian dark theme) |

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Or run separately:

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:8000`.

## Project Structure

```
cthulhu-app/
├── backend/
│   ├── main.py           # FastAPI app + all routes
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── database.py       # DB engine + session
│   ├── auth.py           # JWT + password hashing
│   ├── seed_skills.py    # All CoC 7e skills
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js               # API helper + auth token management
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PartiesPage.jsx
│   │   │   ├── CharacterCreatePage.jsx
│   │   │   └── GamePage.jsx
│   │   └── styles/global.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── uploads/              # Avatars + artifact images
├── start.sh
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `GET /api/auth/me` — Current user info

### Parties
- `POST /api/parties` — Create party (become GM)
- `POST /api/parties/join` — Join via invite code
- `GET /api/parties` — List your parties
- `GET /api/parties/{id}` — Party details

### Characters
- `POST /api/characters` — Create character
- `GET /api/characters/my/{party_id}` — Get your character
- `POST /api/characters/{id}/avatar` — Upload avatar image

### Skills
- `GET /api/skills` — List all skills (with optional `?category=` filter)

### Artifacts (GM)
- `POST /api/parties/{id}/artifacts` — Upload artifact
- `POST /api/artifacts/{id}/reveal` — Reveal to players
- `GET /api/parties/{id}/artifacts` — List artifacts

### Dice
- `POST /api/dice/roll` — Roll dice (broadcasts via WebSocket)

### WebSocket
- `WS /ws/{party_id}` — Real-time updates for a party
