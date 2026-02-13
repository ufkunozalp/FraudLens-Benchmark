# FraudLens Benchmark

FraudLens Benchmark is a full-stack AI workbench for insurance claim-image workflows: synthetic image generation, evidence editing/inpainting, and multi-model fraud detection/benchmarking.

## Creators

- Ufkun Özalp  
  Technical University Munich  
  Munich, Germany  
  Email: ufkun.oezalp@tum.de
- Efecan Murat Öksüz  
  Technical University Munich  
  Munich, Germany  
  Email: efecan.oeksuez@tum.de
- Nicolas Siebold  
  Technical University Munich  
  Munich, Germany  
  Email: ge64duf@mytum.de

## 1) Project Overview

### What this project does
FraudLens provides an analyst-facing interface to:
- Generate claim-like images (for benchmarking and adversarial testing).
- Edit/inpaint regions of images.
- Run multiple fraud/deepfake detectors in parallel.
- Store and review detection history with confidence, explanation, and latency.

### Core features
- Multi-engine image generation (Google and third-party providers).
- Local and cloud inpainting paths.
- Detector orchestration across:
  - browser-local Transformers.js models,
  - backend exact-detector execution via Python worker,
  - external SaaS detector APIs,
  - forensic algorithmic checks (ELA + histogram).
- Hybrid detector mode (majority-vote style across selected exact detectors).
- Image deduplication (hash-based upload) and thumbnail optimization.
- Cloud/local storage mode switching per user profile.

### Intended use case
- Fraud analytics, benchmarking, and quality evaluation for claim-image analysis pipelines.
- Internal demo/testbed for adjusters, SIU analysts, and ML/engineering teams.

### High-level architecture overview

```text
+---------------------------+        +--------------------------------+
| Frontend (React + Vite)   |        | External AI APIs               |
| pages/*, services/ai/*    |<------>| Google GenAI / Sightengine /  |
| services/api.ts           |        | Reality Defender / AI-or-Not   |
+-------------+-------------+        +--------------------------------+
              |
              | HTTP (localhost:3001/api)
              v
+-------------+---------------------------------------------------------+
| Backend (Node.js + Express)                                           |
| - API routes: users, data, images, settings, detect-exact             |
| - DB routing: cloud/local MongoDB by user storageType                 |
| - Exact worker bridge: server/lib/exactWorker.js                      |
+-------------+---------------------------------------------------------+
              |                                    |
              | Mongoose                           | stdin/stdout JSON RPC
              v                                    v
+------------------------------+         +------------------------------+
| MongoDB (Atlas + optional    |         | Python exact detector worker |
| local MongoDB)               |         | transformers + torch + PIL   |
+------------------------------+         +------------------------------+
```

### Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS (CDN config), Recharts, Lucide |
| Frontend AI SDK | `@google/genai`, `@xenova/transformers` |
| Backend | Node.js, Express 5, CORS, dotenv |
| Database | MongoDB (Atlas required, local optional), Mongoose 9 |
| Worker | Python 3, `transformers`, `torch`, `pillow`, `huggingface_hub` |

### Model Runtime Details

This section explains how each model type is executed in code.

#### Generators

| Model ID(s) | Runtime Type | How it runs |
|---|---|---|
| `imagen-4.0-generate-001` | Cloud API (Google) | `services/ai/generation.ts` calls `ai.models.generateImages(...)` and returns base64 image bytes. |
| `gemini-2.5-flash-image`, `gemini-3-pro-image-preview` | Cloud API (Google) | `generateContent(...)` returns inline image data from candidates. |
| `gemini-flash-cctv`, `gemini-flash-doc` | Cloud API (Google) | Same Gemini generation path, but with prompt presets for CCTV/document style output. |
| `flux-pollinations`, `sdxl-pollinations` | External API | Direct `fetch(...)` request to Pollinations image endpoint; response blob is converted to base64 in browser. |

#### Inpaintors (Editors)

| Model ID(s) | Runtime Type | How it runs |
|---|---|---|
| `cv-inpaint-local` | Local browser (Canvas algorithm) | Classical inpainting in `services/ai/editing.ts`: masked pixels are filled from neighbors over multiple passes, then blended with light noise. |
| `gemini-2.5-flash-image`, `gemini-3-pro-image-preview` | Cloud API (Google) | Sends source image + optional mask + instruction prompt to `generateContent(...)` and returns edited image bytes. |

#### Detectors

| Detector ID(s) | Runtime Type | How it runs |
|---|---|---|
| `hybrid-detector` | Backend API + Python worker | Runs 3 exact detectors (`ateeqq-detector`, `umm-maybe-detector`, `univfd-clip`) through `/api/detect-exact`, then majority-vote with thresholds in frontend. |
| `univfd-clip`, `ateeqq-detector`, `deepfake-v1-siglip`, `umm-maybe-detector`, `umm-maybe`, `dima806-detector`, `dima` | Backend API + Python worker | Frontend calls `POST /api/detect-exact`; Node bridges to `server/exact_detector_worker.py` via stdin/stdout JSON. Worker uses Hugging Face pipelines/torch (special UnivFD path uses CLIP embeddings + classifier weights). |
| `clip-local`, `vit-local`, `resnet-local`, `defake-detector`, `detr-local`, `depth-local` | Local browser (`@xenova/transformers`) | Executed with `pipeline(...)` from `@xenova/transformers` in browser; model pipelines are cached in-memory (`getPipeline`). |
| `ela-algo`, `histogram-algo` | Local browser (algorithmic) | Pure pixel/forensic analysis in `services/ai/analysis.ts` (no external model call). |
| `sightengine`, `reality-defender`, `ai-or-not` | External API | Direct HTTP calls from frontend using provider-specific payload/auth format. |
| `gemini-lite`, `gemini`, `gemini-pro` | Cloud API (Google) | Routed to Gemini detector prompt flow (`generateContent`) that parses JSON-like output (`label`, `confidence`, `explanation`). |
| `distil-dire`, `gramnet-detector`, `npr-r50`, `hive-det` | Not executable (in current build) | Routed to predefined “unavailable exact detector” messages and returns `UNKNOWN` result path. |


---

## 2) System Requirements

### Supported operating systems
- macOS (Homebrew-based setup)
- Linux (Debian/Ubuntu with `apt-get`)
- Windows (manual dependency installation only; `setup.sh` is not supported)

### Required runtimes (minimum)
- Node.js **20.x or newer**
- npm **10.x or newer**
- Python **3.10+**
- pip (via `python3 -m pip`)

### Required system tools
- `git`
- `curl`
- `bash`
- `python3`
- `node` / `npm`
- MongoDB Atlas connection string (required)

### Optional tools
- Local MongoDB server (`mongod`) if you want to use `storageType=local`

### Hardware assumptions
- Minimum: 4 CPU cores, 8 GB RAM
- Recommended: 8+ CPU cores, 16 GB RAM (for heavier detector usage)
- Disk: at least 5 GB free for dependencies/model caches
- Internet access: required for cloud/external models and package installs

---

## 3) Dependencies

### 3.1 System-level dependencies

| Dependency | Required | Purpose | Installed by `setup.sh` |
|---|---|---|---|
| Node.js 20+ | Yes | Frontend + backend runtime | Yes |
| npm | Yes | JavaScript package management | Yes |
| Python 3.10+ | Yes | Exact detector worker runtime | Yes |
| pip | Yes | Python package install | Yes |
| git | Yes | Repository operations | Yes |
| MongoDB Atlas URI | Yes | Primary cloud DB connection | Config only |
| Local MongoDB server | Optional | Local storage mode users | Not auto-installed by default |

### 3.2 Package-level dependencies

#### Root (`/package.json`)
- Runtime:
  - `@google/genai`
  - `@xenova/transformers`
  - `idb-keyval`
  - `lucide-react`
  - `react`
  - `react-dom`
  - `recharts`
- Dev:
  - `@vitejs/plugin-react`
  - `typescript`
  - `vite`
  - `concurrently`
  - `@types/node`

#### Server (`/server/package.json`)
- `express`
- `cors`
- `dotenv`
- `mongoose`

#### Python worker packages
- `transformers`
- `torch`
- `pillow`
- `huggingface_hub`

`setup.sh` validates and installs all missing JS/Python package dependencies.
It is supported on macOS and Linux only.

---

## 4) Environment Configuration

Runtime env files:
- `/.env` (frontend default)
- `/.env.local` (frontend optional override)
- `/server/.env` (backend)

| Variable | File | Required |
|---|---|---|
| `GEMINI_API_KEY` | `/.env` or `/.env.local` | Yes |
| `MONGODB_URI` | `/server/.env` | Yes |
| `LOCAL_MONGODB_URI` | `/server/.env` | No |
| `PORT` | `/server/.env` | No (default: `3001`) |
| `EXACT_PYTHON` | `/server/.env` | No |
| `HF_API_TOKEN` | `/server/.env` | No (legacy/manual path) |

Repository templates:
- `/.env.example`
- `/server/.env.example`

Real secrets are not stored in Git-tracked files.

---

## 🔐 Environment & Grading Instructions

Real credentials are intentionally excluded from this repository.

Professor/grader flow:

1) Create env files from templates:
```bash
cp .env.example .env
cp server/.env.example server/.env
```

2) Paste the private `key=value` pairs into:
- `/.env`
- `/server/.env`

3) Run setup:
```bash
chmod +x setup.sh
./setup.sh
```

4) Start in development mode:
```bash
npm run dev
```

5) Start in production-style mode:
```bash
node server/index.js
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

If required env values are missing or placeholders, `setup.sh` prints missing variable names and exits safely.

---

## 5) Installation Guide (From Zero)

1) Clone:
```bash
git clone [<YOUR_REPO_URL>](https://github.com/ufkunozalp/FraudLens-Benchmark.git) fraudlens-benchmark
cd fraudlens-benchmark
```

2) Create env files:
```bash
cp .env.example .env
cp server/.env.example server/.env
```
Paste the real values from the private export file.

3) Bootstrap machine + project:
```bash
chmod +x setup.sh
./setup.sh
```
`setup.sh` works on macOS and Linux. On Windows, install dependencies manually (Node.js, npm, Python, pip, project npm packages, and Python worker packages).

4) (Optional) Manual installs:
```bash
npm ci
cd server && npm ci && cd ..
python3 -m pip install --user --upgrade transformers torch pillow huggingface_hub
```

5) Start local MongoDB only if you use `LOCAL_MONGODB_URI`:
```bash
brew services start mongodb-community
```
```bash
sudo systemctl start mongod
```

6) Verify:
```bash
node -v
npm -v
python3 --version
npm run build
npm run dev
curl http://localhost:3001/api/health
```

---

## 6) How to Run the Application

> **Default command (use this ~90% of the time):** `npm run dev`

| Purpose | Command |
|---|---|
| **Dev (frontend + backend, recommended default)** | **`npm run dev`** |
| Dev frontend only | `npm run client` |
| Dev backend only | `npm run server` |
| Production-style API | `node server/index.js` |
| Production-style frontend | `npm run build && npm run preview -- --host 0.0.0.0 --port 4173` |
| Build | `npm run build` |
| Type check | `npx tsc --noEmit` |
| JS syntax check | `node --check server/index.js && node --check server/lib/exactWorker.js` |
| Python worker syntax check | `python3 -m py_compile server/exact_detector_worker.py` |
| API health | `curl http://localhost:3001/api/health` |

Docker is not configured in this repo (`Dockerfile`/`docker-compose.yml` are not present).
Exact Python worker starts automatically when `/api/detect-exact` is used.
No migration framework is configured (Mongoose auto-creates collections on write).

---

## 7) Project Structure

- `pages/`: app screens (`Generate`, `Edit`, `Detect`, `Compare`, `Dashboard`, `Registry`)
- `services/ai/`: generation, editing, detection, and forensic analysis pipelines
- `services/api.ts`: frontend API client
- `services/storageService.ts`: thumbnail/hash/dedup storage flow
- `context/GlobalContext.tsx`: app-wide state (user, theme, gallery, history)
- `server/index.js`: Express API entrypoint
- `server/lib/db.js`, `server/lib/schemas.js`: DB connections + schemas
- `server/lib/exactWorker.js`: Python worker process bridge
- `server/exact_detector_worker.py`: exact detector runtime
- `setup.sh`: setup automation script

---

## 8) Troubleshooting

1) Backend unreachable (`localhost:3001`):
```bash
npm run server
```

2) Setup fails with missing env values:
```bash
./setup.sh
```
`setup.sh` prints the missing variable names (for example `GEMINI_API_KEY` or `MONGODB_URI`). Fill those keys in `/.env` (or `/.env.local`) and `/server/.env`, then re-run.

3) MongoDB connection error:
```bash
cat server/.env
```
Check that `MONGODB_URI` is a real URI, not a placeholder.

4) Local storage mode fails:
```bash
brew services start mongodb-community
# or
sudo systemctl start mongod
```

5) Exact detector missing Python deps:
```bash
python3 -m pip install --user --upgrade transformers torch pillow huggingface_hub
```

6) Port conflict (`3000`/`3001`):
```bash
lsof -i :3000 -i :3001
```

