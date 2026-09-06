from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Class, User
from ..schemas import ChangePassword, LoginRequest, RegisterRequest, TokenResponse, UserOut
from ..security import create_access_token, hash_password, verify_password
from ..services import gen_id

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token(subject=user.id, role=user.account_role)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=user.account_role,
        class_id=user.class_id,
        group_id=user.group_id,
        name=user.name,
    )


def _find_user_by_identifier(db: Session, identifier: str) -> User | None:
    """登录凭证可为用户名或邮箱（邮箱不区分大小写）。"""
    ident = identifier.strip()
    return (
        db.query(User)
        .filter(or_(User.username == ident, func.lower(User.email) == ident.lower()))
        .first()
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = _find_user_by_identifier(db, payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名/邮箱或密码错误")
    return _issue_token(user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """学生自助注册：邮箱 + 用户名 + 密码 + 班级。注册成功直接返回登录令牌。"""
    email = str(payload.email).strip().lower()
    username = payload.username.strip()

    klass = db.get(Class, payload.classId)
    if not klass:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="所选班级不存在")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被占用")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已被注册")

    display_name = (payload.name or "").strip() or username
    user = User(
        id=gen_id("u_"),
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
        account_role="student",
        name=display_name,
        avatar=f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}",
        class_id=klass.id,
        group_id=None,
        member_role="member",
        personal_coins=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/change-password")
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """用户修改本人密码：校验原密码后设置新密码。"""
    if not verify_password(payload.oldPassword, current.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码错误")
    current.password_hash = hash_password(payload.newPassword)
    db.commit()
    return {"ok": True}


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_oauth(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    """兼容 Swagger UI 的 OAuth2 密码流登录。"""
    user = _find_user_by_identifier(db, form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名/邮箱或密码错误")
    return _issue_token(user)


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current.id,
        name=current.name,
        avatar=current.avatar,
        class_id=current.class_id,
        group_id=current.group_id,
        role=current.member_role,
        personal_coins=current.personal_coins,
    )
