# AgentFlow — AI Workforce Platform

Build your personal AI workforce. Create agents, assign tasks, get results — **free forever** for basic use.

---

## What's inside

```
agentflow/
├── backend/        FastAPI + SQLite + CrewAI + LangChain
└── frontend/       React + Vite + Tailwind
```

---

## Quick start (local development)

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env — add your GROQ_API_KEY (free at console.groq.com)

# Run the server
python main.py
# → Running on http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start dev server
npm run dev
# → Running on http://localhost:5173
```

Open http://localhost:5173 → Register → Browse templates → Clone ShopWise → Run a task.

---

## Free API keys you need

| Service | Free tier | Get key at |
|---------|-----------|------------|
| **Groq** (recommended) | 30 req/min, fast llama3 | https://console.groq.com |
| HuggingFace (optional) | ~100 req/day | https://huggingface.co/settings/tokens |
| Google Gemini (optional) | 15 req/min, 1M context | https://makersuite.google.com |

---

## Deploy for free

### Backend → Render

1. Push to GitHub
2. New Web Service on https://render.com
3. Connect repo, set root to `backend/`
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add env var: `GROQ_API_KEY=your_key`

### Frontend → Vercel

1. Push to GitHub  
2. Import project on https://vercel.com
3. Set root to `frontend/`
4. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
5. Deploy

**Total cost: $0/month**

---

## API endpoints

```
POST /api/v1/auth/register       Register new user
POST /api/v1/auth/login          Login
GET  /api/v1/auth/me             Get current user

GET  /api/v1/agents/             List your agents
POST /api/v1/agents/             Create agent
GET  /api/v1/agents/{id}         Get agent
PATCH /api/v1/agents/{id}        Update agent
DELETE /api/v1/agents/{id}       Archive agent

POST /api/v1/agents/{id}/runs/           Run a task
GET  /api/v1/agents/{id}/runs/{runId}    Poll run status
GET  /api/v1/agents/{id}/runs/           Run history
POST /api/v1/agents/{id}/runs/{id}/feedback  Rate a run

GET  /api/v1/templates/          Browse templates (public)
POST /api/v1/templates/{id}/clone  Clone to workspace

GET  /api/v1/dashboard/          Dashboard stats
GET  /health                     Health check
```

---

## Free tier limits

- 5 active agents per user
- 10 task runs per day (resets at midnight)
- All 6 templates included
- All free AI models (Groq, HuggingFace, Gemini, Ollama)

---

## Roadmap

- [x] Phase 1 — Foundation (auth, agents, tasks, templates)
- [ ] Phase 2 — More templates (HR, legal, finance, coding)
- [ ] Phase 3 — Multi-agent teams (planner + workers)
- [ ] Phase 4 — Public marketplace + sharing
- [ ] Phase 5 — Premium tier (GPT-4, Claude, unlimited runs)
