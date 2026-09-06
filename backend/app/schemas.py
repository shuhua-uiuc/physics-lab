"""Pydantic schemas。

对外 JSON 使用 camelCase（对齐前端 TS 类型），内部用 snake_case，
通过 alias + populate_by_name 完成映射。
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    """学生注册：邮箱 + 用户名 + 密码 + 班级（可选显示名，默认取用户名）。"""

    email: EmailStr
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=6, max_length=64)
    name: str | None = Field(default=None, max_length=32)
    classId: str


class ChangePassword(BaseModel):
    """用户修改本人密码（需校验原密码）。"""

    oldPassword: str
    newPassword: str = Field(min_length=6, max_length=64)


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str  # teacher / student
    class_id: str | None = None
    group_id: str | None = None
    name: str


# ---------- Class ----------
class ClassOut(CamelModel):
    id: str
    name: str


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class ClassRename(BaseModel):
    name: str = Field(min_length=1, max_length=40)


# ---------- Teacher management ----------
class TeacherCreate(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=6, max_length=64)
    name: str | None = Field(default=None, max_length=32)


class TeacherOut(CamelModel):
    id: str
    username: str
    name: str
    avatar: str


class PasswordReset(BaseModel):
    password: str = Field(min_length=6, max_length=64)


class GroupClassMove(BaseModel):
    """将小组移动到另一班级（同时更新组内学生的班级归属）。"""
    classId: str


class StudentBatchItem(BaseModel):
    """单个学生上传项。"""
    name: str = Field(min_length=1, max_length=32)
    username: str | None = Field(default=None, min_length=2, max_length=32)
    password: str | None = Field(default=None, min_length=6, max_length=64)


class StudentBatchUpload(BaseModel):
    """批量上传学生名单。"""
    students: list[StudentBatchItem] = Field(min_length=1, max_length=30)


# ---------- Group / User ----------
class GroupOut(CamelModel):
    id: str
    name: str
    logo: str
    total_coins: int
    initial_coins: int
    class_id: str | None = None
    contribution_ratio: dict[str, int]


class GroupCreate(BaseModel):
    name: str
    initialCoins: int = 500
    classId: str | None = None


class GroupRename(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class UserGroupAssign(BaseModel):
    """把学生分配 / 移动到某小组，或移出（groupId 为 null）。可同时指定成员角色。"""

    groupId: str | None = None
    role: str = "member"  # leader / member


class ContributionUpdate(BaseModel):
    ratioRecord: dict[str, int]


class UserOut(CamelModel):
    id: str
    name: str
    avatar: str
    class_id: str | None = None
    group_id: str | None = None
    role: str  # leader / member（对齐前端 User.role）
    personal_coins: int


class UserAvatarUpdate(BaseModel):
    avatar: str


class CoinDelta(BaseModel):
    delta: int


class CoinTransfer(CamelModel):
    """组间能量币转账：两笔交易共享同一 ref_id，由后端原子记账。"""

    source_group_id: str
    target_group_id: str
    amount: int = Field(ge=1)
    note: str = Field(default="", max_length=100)


# ---------- Topic / Question ----------
class TopicOut(CamelModel):
    id: str
    title: str
    outline: list[dict[str, Any]]
    ai_material: str


class QuestionOut(CamelModel):
    id: str
    type: str
    stem: str
    options: list[str]
    answer: Any
    knowledge_point: str
    difficulty: int
    topic_id: str | None = None
    safety_category: str | None = None


# ---------- Quiz ----------
class QuizStartRequest(BaseModel):
    topicId: str


class QuizAnswerRequest(BaseModel):
    qid: str
    answer: Any


class QuizSessionOut(CamelModel):
    id: str
    topic_id: str
    questions: list[dict[str, Any]]
    user_answers: dict[str, Any]
    score: int
    passed: bool
    blind_points: list[str]
    created_at: datetime


# ---------- Challenge ----------
class ChallengeCreate(BaseModel):
    title: str
    topicId: str
    questionIds: list[str] = []
    reward: int
    deadline: datetime


class ChallengeSubmit(BaseModel):
    answers: dict[str, Any]


class ChallengeOut(CamelModel):
    id: str
    title: str
    creator_group_id: str
    topic_id: str
    question_ids: list[str]
    reward: int
    deadline: datetime
    status: str
    submissions: list[dict[str, Any]]


# ---------- Project ----------
class EquipmentItem(BaseModel):
    name: str
    qty: int
    category: str


class ProjectCreate(BaseModel):
    title: str
    topic: str
    techPoints: str | None = ""
    difficulties: str | None = ""
    equipmentList: list[EquipmentItem] = []
    dueDate: datetime | None = None
    rewardCoins: int | None = 200
    # 教师/管理员代建时指定所属小组；学生创建由后端绑定本人小组
    ownerGroupId: str | None = None


class ProjectUpdate(BaseModel):
    """项目信息更新（技术要点/难点、标题、课题、器材、截止日期、成果、照片、奖励币）。

    所有字段可选，仅更新传入的字段；与 ProjectCreate 一样直接使用 camelCase 键。
    """

    title: str | None = Field(default=None, min_length=1, max_length=100)
    topic: str | None = Field(default=None, max_length=100)
    techPoints: str | None = None
    difficulties: str | None = None
    equipmentList: list[EquipmentItem] | None = None
    dueDate: datetime | None = None
    results: str | None = None
    photos: list[str] | None = None
    rewardCoins: int | None = Field(default=None, ge=0)
    status: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)


class ProjectStatusUpdate(BaseModel):
    status: str


class ProjectProgressUpdate(BaseModel):
    progress: int


class ProjectOut(CamelModel):
    id: str
    title: str
    topic: str
    owner_group_id: str
    start_date: datetime
    due_date: datetime
    progress: int
    status: str
    tech_points: str
    difficulties: str
    equipment_list: list[dict[str, Any]]
    safety_category: str
    safety_passed: dict[str, bool]
    photos: list[str]
    results: str
    reward_coins: int


# ---------- Recruitment ----------
class RecruitmentCreate(BaseModel):
    projectId: str
    title: str
    description: str
    skills: list[str] = []
    reward: int
    deadline: datetime


class BidCreate(BaseModel):
    userId: str
    skillDesc: str
    hours: int


class AssignRequest(BaseModel):
    userId: str


class ResolveRequest(BaseModel):
    result: str  # success / partial / fail


class RecruitmentOut(CamelModel):
    id: str
    project_id: str
    title: str
    description: str
    skills: list[str]
    reward: int
    deadline: datetime
    status: str
    bids: list[dict[str, Any]]
    assignee_user_id: str | None = None
    result: str | None = None
    actual_pay: int | None = None


# ---------- Showcase ----------
class ShowcaseCreate(BaseModel):
    projectId: str | None = ""
    title: str
    coverImage: str
    groupId: str
    description: str | None = ""


class ShowcaseOut(CamelModel):
    id: str
    project_id: str
    title: str
    cover_image: str
    group_id: str
    description: str
    loves: int
    loved_by: list[str]
    created_at: datetime


# ---------- Rankings / Meta ----------
class GroupRankRow(CamelModel):
    group_id: str
    name: str
    total_coins: int
    rank: int


class PersonalRankRow(CamelModel):
    user_id: str
    name: str
    personal_coins: int
    group_id: str
    rank: int


class RankingsOut(CamelModel):
    group_ranking: list[GroupRankRow]
    personal_ranking: list[PersonalRankRow]


class ClassMetaOut(CamelModel):
    initial_coins_per_group: int
    term_name: str
