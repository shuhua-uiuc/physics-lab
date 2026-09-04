"""关键链路测试环境：独立内存 SQLite（StaticPool 共享连接），与 physics_lab.db 完全隔离。

预置数据：
- class-1 / class-2 两个班级
- g-1（class-1, 500 币）、g-2（class-1, 300 币）、g-3（class-2, 200 币）
- teacher（teacher123）；u-1/u-2 在 g-1，u-3 在 g-2，u-4 无组（class-1），u-5 无组（class-2）；学生统一 student123
- t-1 主题与 q-1（答案 2）、q-2（答案 1）两道单选题
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Class, ClassMeta, Group, Question, Topic, User

# 测试专用低轮次哈希（与生产同为 bcrypt，仅降低轮次）；
# 模块级只计算一次，避免每个测试种子阶段重复哈希拖慢套件
import bcrypt


def _fast_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=4)).decode("utf-8")


STUDENT_HASH = _fast_hash("student123")
TEACHER_HASH = _fast_hash("teacher123")

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


def _seed(db) -> None:
    db.add_all(
        [
            Class(id="class-1", name="一班"),
            Class(id="class-2", name="二班"),
            Group(id="g-1", name="牛顿组", total_coins=500, initial_coins=500, class_id="class-1", contribution_ratio={}),
            Group(id="g-2", name="爱因斯坦组", total_coins=300, initial_coins=300, class_id="class-1", contribution_ratio={}),
            Group(id="g-3", name="居里组", total_coins=200, initial_coins=200, class_id="class-2", contribution_ratio={}),
            User(
                id="teacher",
                username="teacher",
                password_hash=TEACHER_HASH,
                account_role="teacher",
                name="王老师",
            ),
            User(id="u-1", username="u-1", password_hash=STUDENT_HASH, account_role="student", name="学生一", class_id="class-1", group_id="g-1", member_role="leader"),
            User(id="u-2", username="u-2", password_hash=STUDENT_HASH, account_role="student", name="学生二", class_id="class-1", group_id="g-1", member_role="member"),
            User(id="u-3", username="u-3", password_hash=STUDENT_HASH, account_role="student", name="学生三", class_id="class-1", group_id="g-2", member_role="leader"),
            User(id="u-4", username="u-4", password_hash=STUDENT_HASH, account_role="student", name="学生四", class_id="class-1", group_id=None),
            User(id="u-5", username="u-5", password_hash=STUDENT_HASH, account_role="student", name="学生五", class_id="class-2", group_id=None),
            Topic(id="t-1", title="力学基础", outline=[], ai_material=""),
            Question(id="q-1", type="single", stem="问题一", options=["A", "B", "C", "D"], answer=2, topic_id="t-1", knowledge_point="基础", difficulty=1),
            Question(id="q-2", type="single", stem="问题二", options=["A", "B", "C", "D"], answer=1, topic_id="t-1", knowledge_point="光学", difficulty=1),
            ClassMeta(id=1),
        ]
    )
    db.commit()


@pytest.fixture()
def db():
    """每个测试独立的内存库（建表 + 种子数据），结束后销毁。"""
    Base.metadata.create_all(bind=engine)
    session = TestSessionLocal()
    _seed(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    # 不使用上下文管理器，避免触发真实 init_db 的 startup 事件
    return TestClient(app)


@pytest.fixture()
def auth(client):
    """登录并返回 Authorization 请求头；学生默认密码 student123。"""

    def _login(username: str, password: str = "student123") -> dict:
        resp = client.post("/api/auth/login", json={"username": username, "password": password})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['accessToken']}"}

    return _login
