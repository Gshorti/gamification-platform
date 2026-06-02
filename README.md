# Платформа геймификации

Полный стек: FastAPI + PostgreSQL + HTML/CSS/JS

## Стек

- **Frontend**: HTML, CSS, JavaScript (mobile-first)
- **Backend**: FastAPI (Python 3.11)
- **БД**: PostgreSQL 16 + SQLAlchemy ORM
- **Аутентификация**: JWT (OAuth2 Password Flow)
- **Запуск**: Docker Compose

## Быстрый старт

```bash
# 1. Клонируй / распакуй проект
cd project

# 2. Запусти
docker compose up --build

# Приложение доступно на http://localhost:8000
# Swagger UI: http://localhost:8000/api/docs
```

## Первый вход

После первого запуска автоматически создаётся аккаунт администратора:

| Поле | Значение |
|------|----------|
| Логин | `admin` |
| Пароль | `admin123` |

> ⚠️ Смени пароль в продакшене!

## Роли

| Роль | Доступ |
|------|--------|
| **admin** | Создание ПМ-аккаунтов, просмотр всех команд и рейтингов, управление призами |
| **pm** | Управление своей командой: участники, челленджи, дейли-задачи, начисление баллов |
| **Участник** | Не имеет аккаунта; данные хранятся в БД, прогресс виден через рейтинг |

## Структура проекта

```
project/
├── frontend/               # Статический фронтенд
│   ├── index.html          # Лендинг (публичный)
│   ├── css/main.css        # Стили (бренд ФР)
│   ├── js/
│   │   ├── main.js         # Общие утилиты + лендинг
│   │   ├── pm.js           # ПМ-кабинет
│   │   └── admin.js        # Админ-панель
│   └── pages/
│       ├── login.html      # Страница входа
│       ├── pm.html         # Кабинет проектного менеджера
│       └── admin.html      # Панель администратора
│
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI приложение
│   │   ├── core/
│   │   │   ├── config.py   # Настройки (env)
│   │   │   ├── database.py # SQLAlchemy сессии
│   │   │   └── security.py # JWT + bcrypt
│   │   ├── models/
│   │   │   └── models.py   # Модели БД
│   │   ├── schemas/
│   │   │   └── schemas.py  # Pydantic схемы
│   │   └── routers/
│   │       ├── deps.py     # Зависимости (auth guard)
│   │       ├── auth.py     # POST /api/auth/token
│   │       ├── teams.py    # /api/teams/my/members
│   │       ├── challenges.py # /api/challenges
│   │       ├── daily_tasks.py # /api/daily-tasks
│   │       ├── points.py   # /api/points/award
│   │       ├── prizes.py   # /api/prizes
│   │       └── admin.py    # /api/admin/*
│   ├── init_db.py          # Сидирование БД
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```

## API Endpoints

### Auth
- `POST /api/auth/token` — вход (form: username, password)

### ПМ (требует role=pm)
- `GET /api/teams/my/members` — список участников
- `POST /api/teams/my/members` — добавить участника
- `DELETE /api/teams/my/members/{id}` — удалить участника
- `GET /api/challenges/my` — список челленджей
- `POST /api/challenges/` — создать челлендж
- `DELETE /api/challenges/{id}` — удалить
- `GET /api/daily-tasks/my` — список дейли-задач
- `POST /api/daily-tasks/` — создать задачу
- `DELETE /api/daily-tasks/{id}` — удалить
- `POST /api/points/award` — начислить баллы участнику

### Призы (публичные GET, POST/DELETE только admin)
- `GET /api/prizes/` — каталог призов

### Админ (требует role=admin)
- `GET/POST /api/admin/pms` — управление ПМ-аккаунтами
- `DELETE /api/admin/pms/{id}`
- `GET /api/admin/teams` — все команды
- `GET /api/admin/members` — все участники
- `GET /api/admin/challenges` — все челленджи
- `POST/DELETE /api/prizes/` — управление призами

## Переменные окружения (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/gamification
SECRET_KEY=your-very-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## Механика баллов

| Действие | Баллы |
|----------|-------|
| LIGHT челлендж | +10 |
| MEDIUM челлендж | +25 |
| HARD челлендж | +50 |
| Дейли-задача | +5 (настраивается) |

## Призы

| Уровень | Приз | Стоимость |
|---------|------|-----------|
| LIGHT | Стикерпак | 10 pts |
| LIGHT+MEDIUM | Брелок | 35 pts |
| LIGHT+MEDIUM+HARD | Встреча с экспертом | 85 pts |
