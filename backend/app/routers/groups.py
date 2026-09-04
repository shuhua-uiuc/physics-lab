from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_teacher
from ..models import Class, Group, User
from ..schemas import (
    ClassOut,
    ContributionUpdate,
    GroupCreate,
    GroupOut,
    GroupRename,
    UserAvatarUpdate,
    UserGroupAssign,
    UserOut,
)
from ..services import gen_id

router = APIRouter(prefix="/api", tags=["groups"])


def user_to_out(u: User) -> UserOut:
    """模型 member_role -> 前端 role 字段。"""
    return UserOut(
        id=u.id,
        name=u.name,
        avatar=u.avatar,
        class_id=u.class_id,
        group_id=u.group_id,
        role=u.member_role,
        personal_coins=u.personal_coins,
    )


# ---------- Classes ----------
@router.get("/classes", response_model=list[ClassOut])
def list_classes(db: Session = Depends(get_db)):
    """公开：注册页需要在登录前拉取班级列表供选择。"""
    return db.query(Class).all()


# ---------- Groups ----------
@router.get("/groups", response_model=list[GroupOut])
def list_groups(
    class_id: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Group)
    if class_id:
        q = q.filter(Group.class_id == class_id)
    return q.all()


@router.post("/groups", response_model=GroupOut)
def create_group(payload: GroupCreate, db: Session = Depends(get_db), _: User = Depends(require_teacher)):
    if payload.classId and not db.get(Class, payload.classId):
        raise HTTPException(status_code=400, detail="所选班级不存在")
    group = Group(
        id=gen_id("g_"),
        name=payload.name,
        logo="#0D47A1",
        total_coins=payload.initialCoins,
        initial_coins=payload.initialCoins,
        class_id=payload.classId,
        contribution_ratio={},
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.patch("/groups/{group_id}", response_model=GroupOut)
def rename_group(
    group_id: str,
    payload: GroupRename,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="小组不存在")
    group.name = payload.name.strip()
    db.commit()
    db.refresh(group)
    return group


@router.delete("/groups/{group_id}")
def delete_group(group_id: str, db: Session = Depends(get_db), _: User = Depends(require_teacher)):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="小组不存在")
    db.query(User).filter(User.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    return {"ok": True}


@router.put("/groups/{group_id}/contribution", response_model=GroupOut)
def update_contribution(
    group_id: str,
    payload: ContributionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    total = sum(payload.ratioRecord.values())
    if total != 100:
        raise HTTPException(status_code=400, detail=f"贡献比例之和必须为 100，当前为 {total}")
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="小组不存在")
    group.contribution_ratio = dict(payload.ratioRecord)
    db.commit()
    db.refresh(group)
    return group


@router.put("/groups/{group_id}/leader/{user_id}")
def set_leader(group_id: str, user_id: str, db: Session = Depends(get_db), _: User = Depends(require_teacher)):
    members = db.query(User).filter(User.group_id == group_id).all()
    if not members:
        raise HTTPException(status_code=404, detail="小组无成员")
    for m in members:
        m.member_role = "leader" if m.id == user_id else "member"
    db.commit()
    return {"ok": True}


@router.post("/groups/{group_id}/join", response_model=UserOut)
def join_group(
    group_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """学生自助加入某小组（仅在自己尚未分配小组、且小组属于本班时允许）。"""
    if current.account_role != "student":
        raise HTTPException(status_code=403, detail="仅学生可加入小组")
    if current.group_id:
        raise HTTPException(status_code=400, detail="你已在某小组中，请联系教师调整")
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="小组不存在")
    # 学生只能加入自己所在班级的小组
    if current.class_id and group.class_id and group.class_id != current.class_id:
        raise HTTPException(status_code=403, detail="只能加入本班的小组")
    current.group_id = group_id
    # 补齐班级归属（防止历史数据缺失）
    if not current.class_id and group.class_id:
        current.class_id = group.class_id
    current.member_role = "member"
    db.commit()
    db.refresh(current)
    return user_to_out(current)


# ---------- Users ----------
@router.get("/users", response_model=list[UserOut])
def list_users(
    group_id: str | None = None,
    class_id: str | None = None,
    unassigned: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(User).filter(User.account_role == "student")
    if class_id:
        q = q.filter(User.class_id == class_id)
    if unassigned:
        q = q.filter(User.group_id.is_(None))
    elif group_id:
        q = q.filter(User.group_id == group_id)
    return [user_to_out(u) for u in q.all()]


@router.put("/users/{user_id}/group", response_model=UserOut)
def assign_user_group(
    user_id: str,
    payload: UserGroupAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    """教师把学生分配/移动到某小组，或移出（groupId 为 null）。

    分配到某组时，学生的班级归属会随目标小组的班级同步（跨班调组也随之更新）。
    """
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    if u.account_role != "student":
        raise HTTPException(status_code=400, detail="只能对学生分组")
    if payload.groupId:
        group = db.get(Group, payload.groupId)
        if not group:
            raise HTTPException(status_code=404, detail="目标小组不存在")
        u.group_id = payload.groupId
        if group.class_id:
            u.class_id = group.class_id
        u.member_role = "leader" if payload.role == "leader" else "member"
    else:
        # 移出小组：清空组归属并降级为普通成员（保留班级归属）
        u.group_id = None
        u.member_role = "member"
    db.commit()
    db.refresh(u)
    return user_to_out(u)


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user_to_out(u)


@router.put("/users/{user_id}/avatar", response_model=UserOut)
def update_avatar(
    user_id: str,
    payload: UserAvatarUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.account_role != "teacher" and current.id != user_id:
        raise HTTPException(status_code=403, detail="只能修改本人头像")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    u.avatar = payload.avatar
    db.commit()
    db.refresh(u)
    return user_to_out(u)
