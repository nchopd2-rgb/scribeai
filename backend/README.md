# ScribeAI Backend

AI-powered medical scribe backend — real-time speech-to-text transcription for clinical documentation.

## Architecture

```
scribeai-backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings (env-based)
│   ├── database.py          # SQLAlchemy models + async DB session
│   ├── models.py            # Pydantic request/response schemas
│   ├── routers/
│   │   ├── transcription.py # /api/v1/transcribe endpoints
│   │   ├── sessions.py      # /api/v1/sessions endpoints
│   │   └── providers.py     # /api/v1/providers endpoints
│   ├── services/
│   │   └── stt.py           # OpenAI Whisper STT service
│   └── utils/
│       └── encryption.py    # Fernet AES-256 encryption for PHI at rest
├── data/                    # SQLite database directory
├── uploads/                 # Temp audio uploads (auto-deleted)
├── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment (optional — defaults work for dev)
cp .env.example .env
# Edit .env if needed (ENCRYPTION_KEY, WHISPER_MODEL, etc.)

# 3. Run the server
python -m app.main
```

Server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

## API Endpoints

### Transcription
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/transcribe` | Upload audio, get transcription |
| GET | `/api/v1/transcriptions` | List transcriptions |
| GET | `/api/v1/transcriptions/{id}` | Get single transcription |
| DELETE | `/api/v1/transcriptions/{id}` | Delete transcription |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sessions` | Create patient session |
| GET | `/api/v1/sessions` | List sessions |
| GET | `/api/v1/sessions/{id}` | Get session details |
| PATCH | `/api/v1/sessions/{id}/complete` | Mark session complete |

### Providers
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/providers` | Create provider |
| GET | `/api/v1/providers` | List providers |
| GET | `/api/v1/providers/{id}` | Get provider |
| DELETE | `/api/v1/providers/{id}` | Deactivate provider |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |

## Example: Transcribe Audio

```bash
# 1. Create a provider
curl -X POST http://localhost:8000/api/v1/providers \
  -H "Content-Type: application/json" \
  -d '{"name": "Dr. Sarah Chen"}'

# 2. Create a session (use the provider ID from above)
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"provider_id": "<provider-id>", "patient_anon_id": "P-38291"}'

# 3. Upload and transcribe audio
curl -X POST http://localhost:8000/api/v1/transcribe \
  -F "file=@sample.wav" \
  -F "session_id=<session-id>"
```

## HIPAA Compliance Design

- **Encryption at rest**: All PHI fields (provider names, emails) encrypted with AES-256 via Fernet
- **No PHI logging**: Transcripts are stored but never logged at DEBUG/INFO level
- **Auto-delete audio**: Uploaded audio files are deleted after transcription
- **Local processing**: Whisper runs locally — no audio data sent to external APIs
- **Patient anonymization**: Sessions use anonymous patient IDs, not real names/DOB

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/scribeai.db` | Database connection string |
| `ENCRYPTION_KEY` | (auto-generated) | Fernet key for PHI encryption |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `WHISPER_MODEL` | `tiny` | Whisper model size (tiny/base/small/medium/large) |
| `LOG_LEVEL` | `INFO` | Logging level |
| `AUTO_DELETE_AUDIO` | `True` | Delete audio after processing |
| `ENCRYPT_PHI` | `True` | Encrypt PHI in database |