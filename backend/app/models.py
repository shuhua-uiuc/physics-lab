"""SQLAlchemy 数据模型。

字段命名尽量对齐前端 TypeScript 类型（src/data/mockData.ts），
对于数组 / 嵌套对象采用 JSON 列存储，保证前后端数据结构一致、迁移零损耗。
"""

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Class(Base):
    """班级：一个班级下辖多个小组。学生先归属班级，再加入本班某个小组。"""

    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)

    groups: Mapped[list["Group"]] = relationship(back_populates="class_")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    logo: Mapped[str] = mapped_column(String, default="#0D47A1")
    total_coins: Mapped[int] = mapped_column(Integer, default=0)
    initial_coins: Mapped[int] = mapped_column(Integer, default=0)
    # 所属班级
    class_id: Mapped[str | None] = mapped_column(ForeignKey("classes.id"), index=True, nullable=True)
    # { userId: ratio } —— 组内贡献比例
    contribution_ratio: Mapped[dict] = mapped_column(JSON, default=dict)

    users: Mapped[list["User"]] = relationship(back_populates="group")
    class_: Mapped["Class | None"] = relationship(back_populates="groups")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # 登录凭证
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    # 邮箱（注册用户填写；预置账号可为空）。可作为登录凭证之一。
    email: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    # teacher / student
    account_role: Mapped[str] = mapped_column(String, default="student")

    name: Mapped[str] = mapped_column(String, nullable=False)
    avatar: Mapped[str] = mapped_column(String, default="")
    # 学生所属班级（注册时选择；未选组时也已归属班级）
    class_id: Mapped[str | None] = mapped_column(ForeignKey("classes.id"), index=True, nullable=True)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("groups.id"), nullable=True)
    # leader / member
    member_role: Mapped[str] = mapped_column(String, default="member")
    personal_coins: Mapped[int] = mapped_column(Integer, default=0)

    group: Mapped["Group | None"] = relationship(back_populates="users")


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    group_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False)  # challenge/project/recruit/teacher_set/penalty
    ref_id: Mapped[str] = mapped_column(String, default="")
    delta: Mapped[int] = mapped_column(Integer, default=0)
    balance_after: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    note: Mapped[str] = mapped_column(String, default="")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    # [{ chapter, points: [] }]
    outline: Mapped[list] = mapped_column(JSON, default=list)
    ai_material: Mapped[str] = mapped_column(Text, default="")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # single/multiple/judge
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, default=list)
    # 存储答案（number / number[] / bool），统一用 JSON
    answer: Mapped[object] = mapped_column(JSON)
    knowledge_point: Mapped[str] = mapped_column(String, default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    topic_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    safety_category: Mapped[str | None] = mapped_column(String, nullable=True)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    # 题目快照
    questions: Mapped[list] = mapped_column(JSON, default=list)
    user_answers: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    blind_points: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    creator_group_id: Mapped[str] = mapped_column(String, index=True)
    topic_id: Mapped[str] = mapped_column(String, index=True)
    question_ids: Mapped[list] = mapped_column(JSON, default=list)
    reward: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[datetime] = mapped_column(DateTime, default=_now)
    status: Mapped[str] = mapped_column(String, default="open")  # open/closed
    # [{ groupId, answers, accuracy, earned, submittedAt }]
    submissions: Mapped[list] = mapped_column(JSON, default=list)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, default="")
    owner_group_id: Mapped[str] = mapped_column(String, index=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=_now)
    due_date: Mapped[datetime] = mapped_column(DateTime, default=_now)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="planning")
    tech_points: Mapped[str] = mapped_column(Text, default="")
    difficulties: Mapped[str] = mapped_column(Text, default="")
    # [{ name, qty, category }]
    equipment_list: Mapped[list] = mapped_column(JSON, default=list)
    safety_category: Mapped[str] = mapped_column(String, default="mechanical")
    # { userId: bool }
    safety_passed: Mapped[dict] = mapped_column(JSON, default=dict)
    photos: Mapped[list] = mapped_column(JSON, default=list)
    results: Mapped[str] = mapped_column(Text, default="")
    reward_coins: Mapped[int] = mapped_column(Integer, default=200)


class Recruitment(Base):
    __tablename__ = "recruitments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    reward: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[datetime] = mapped_column(DateTime, default=_now)
    status: Mapped[str] = mapped_column(String, default="open")  # open/assigned/done/failed
    # [{ userId, skillDesc, hours, bidAt }]
    bids: Mapped[list] = mapped_column(JSON, default=list)
    assignee_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    result: Mapped[str | None] = mapped_column(String, nullable=True)  # success/partial/fail
    actual_pay: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ShowcaseItem(Base):
    __tablename__ = "showcase_items"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(String, default="")
    title: Mapped[str] = mapped_column(String, nullable=False)
    cover_image: Mapped[str] = mapped_column(String, default="")
    group_id: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    loves: Mapped[int] = mapped_column(Integer, default=0)
    loved_by: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ClassMeta(Base):
    __tablename__ = "class_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    initial_coins_per_group: Mapped[int] = mapped_column(Integer, default=500)
    term_name: Mapped[str] = mapped_column(String, default="")
