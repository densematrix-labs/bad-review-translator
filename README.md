# AI 差评翻译器 (Bad Review Translator)

差评的两面：用户想说的 vs 老板听到的

Input a bad review, AI translates it into two perspectives:
- 🗣️ What the user REALLY means (the unfiltered truth)
- 👔 What the boss hears (the delusional optimistic spin)

## Tech Stack

- Frontend: React + Vite (TypeScript) + react-i18next
- Backend: Python FastAPI
- AI: LLM via llm-proxy.densematrix.ai
- Deployment: Docker → langsheng

## Supported Languages

🇺🇸 English | 🇨🇳 中文 | 🇯🇵 日本語 | 🇩🇪 Deutsch | 🇫🇷 Français | 🇰🇷 한국어 | 🇪🇸 Español

## Development

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Docker
docker compose up -d --build
```

## Testing

```bash
# Backend
cd backend && pytest --cov=main

# Frontend
cd frontend && npm run test:coverage
```

## License

MIT
