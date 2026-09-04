from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin, auth, coins, groups, projects, theory

# 与 config.py 中的开发默认值保持一致；使用默认密钥时启动阶段给出告警
_DEV_DEFAULT_JWT_SECRET = "physics-mission-control-dev-secret-change-me"

app = FastAPI(
    title="Physics Mission Control API",
    description="物理研究基地后端 —— 认证、小组、题库、项目、招募、能量币等业务接口",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    if settings.jwt_secret == _DEV_DEFAULT_JWT_SECRET:
        import logging

        logging.getLogger("uvicorn.error").warning(
            "JWT 密钥仍为开发默认值，任何人可伪造 token；请在 backend/.env 中配置 JWT_SECRET 后重启服务"
        )


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "service": "physics-mission-control"}


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(groups.router)
app.include_router(theory.router)
app.include_router(projects.router)
app.include_router(coins.router)
