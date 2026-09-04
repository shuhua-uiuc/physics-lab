from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

# SQLite 需要 check_same_thread=False 以配合 FastAPI 的多线程访问
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：提供一个请求级数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """建表（如不存在）。"""
    from . import models  # noqa: F401  确保模型已注册

    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()


def _run_lightweight_migrations() -> None:
    """针对已存在的表补充新增列（SQLite 场景）。

    create_all 不会为已存在的表添加新列，这里用 PRAGMA 检查后按需 ALTER TABLE，
    保证老数据库升级后可直接使用（无需 drop 重建）。
    """
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "email" not in user_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
    if "class_id" not in user_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN class_id VARCHAR"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_class_id ON users (class_id)"))

    if "groups" in inspector.get_table_names():
        group_columns = {col["name"] for col in inspector.get_columns("groups")}
        if "class_id" not in group_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE groups ADD COLUMN class_id VARCHAR"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_groups_class_id ON groups (class_id)"))
