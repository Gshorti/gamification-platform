from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import engine, Base
from app.routers import auth, teams, challenges, daily_tasks, points, prizes, admin

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Фабрика Решений — API",
    description="API платформы геймификации",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(challenges.router, prefix="/api")
app.include_router(daily_tasks.router, prefix="/api")
app.include_router(points.router, prefix="/api")
app.include_router(prizes.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Serve frontend static files
app.mount("/", StaticFiles(directory="/app/frontend", html=True), name="frontend")
