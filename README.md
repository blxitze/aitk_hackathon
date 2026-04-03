# Smart City Almaty — управленческий дашборд

MVP веб-панели для мониторинга состояния города (Алматы) и поддержки решений: KPI, графики, сценарии, алерты и AI-анализ.  
Разработано командой **Bed Action Inc.** для хакатона AITK HACKATHON.

## Возможности

- **Направления:** транспорт (симуляция) и экология (реальные API с резервом на mock).
- **Визуализация:** KPI-карточки, графики по часам, цветовая индикация статусов, приоритетные алерты (высокий / средний / низкий).
- **Сценарии:** норма, час пик, аварийный — для демонстрации разных состояний.
- **AI:** краткий ответ на три вопроса — что происходит, насколько критично, какие действия (OpenAI или локальный Ollama).

## Архитектура

| Часть | Технологии |
|--------|------------|
| Backend | Python 3, FastAPI, Pydantic, httpx, OpenAI SDK |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Framer Motion |

Внешние данные: OpenWeatherMap (температура), WAQI (AQI). При ошибках API подставляются mock-значения.

## Структура репозитория

```
aitk_hackathon/
├── smart-city-backend/   # API: метрики, AI-анализ, health
├── smart-city-frontend/  # Next.js UI
├── AGENTS.md             # правила разработки и архитектура
├── CONTEXT.md            # продуктовый контекст
├── DESIGN.md             # UI-спецификация
└── API.md                # схемы эндпоинтов
```

## Требования

- Node.js 20+ (для фронтенда)
- Python 3.11+ (для бэкенда)
- Для AI через OpenAI — ключ `OPENAI_API_KEY`
- Для локального AI — [Ollama](https://ollama.com/) с моделью `qwen2.5:3b` (см. режим в UI)

## Быстрый старт

### 1. Backend

```bash
cd smart-city-backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Создайте файл `.env` в `smart-city-backend/`:

```env
OPENAI_API_KEY=
LLM_PROVIDER=openai
OPENWEATHER_API_KEY=
WAQI_TOKEN=
```

Запуск:

```bash
cd smart-city-backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Проверка: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`.

### 2. Frontend

```bash
cd smart-city-frontend
npm install
```

Создайте `smart-city-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Запуск в режиме разработки:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## API (кратко)

| Метод | Путь | Описание |
|--------|------|----------|
| GET | `/health` | Проверка работы сервиса |
| GET | `/api/metrics?scenario=normal\|rush_hour\|emergency` | Метрики, график, алерты, источники данных |
| POST | `/api/analyze` | AI-инсайт по переданным метрикам (язык `ru` / `kz`) |

Подробные схемы запросов и ответов — в [API.md](./API.md).

## Сборка продакшена (фронтенд)

```bash
cd smart-city-frontend
npm run build
npm run start
```

Укажите `NEXT_PUBLIC_API_URL` на URL развёрнутого backend.

## Лицензия и командная информация

Проект создан в рамках хакатона AITK Hackathon командой Bed Action Inc.

---
