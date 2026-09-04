from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..deps import get_current_user
from ..models import Project, Recruitment, ShowcaseItem, User
from ..schemas import (
    AssignRequest,
    BidCreate,
    ProjectCreate,
    ProjectOut,
    ProjectProgressUpdate,
    ProjectStatusUpdate,
    RecruitmentCreate,
    RecruitmentOut,
    ResolveRequest,
    ShowcaseCreate,
    ShowcaseOut,
)

router = APIRouter(prefix="/api", tags=["projects"])

_CATEGORY_MAP = {
    "electric": "electric",
    "thermal": "thermal",
    "optical": "optical",
    "mechanical": "mechanical",
    "radiation": "radiation",
    "chemical": "chemical",
}


def _infer_safety_category(equipment_list: list[dict]) -> str:
    cats = {_CATEGORY_MAP.get(e.get("category")) for e in equipment_list}
    cats.discard(None)
    if not cats:
        return "mechanical"
    if len(cats) == 1:
        return next(iter(cats))
    return "combined"


def _group_id(current: User) -> str:
    if not current.group_id:
        raise HTTPException(status_code=400, detail="当前用户未归属小组")
    return current.group_id


# ---------- Projects ----------
@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Project).all()


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    return p


@router.post("/projects", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    equip = [e.model_dump() for e in payload.equipmentList]
    now = datetime.now(timezone.utc)
    project = Project(
        id=services.gen_id("proj_"),
        title=payload.title,
        topic=payload.topic,
        owner_group_id=_group_id(current),
        start_date=now,
        due_date=payload.dueDate or (now + timedelta(days=30)),
        progress=0,
        status="planning",
        tech_points=payload.techPoints or "",
        difficulties=payload.difficulties or "",
        equipment_list=equip,
        safety_category=_infer_safety_category(equip),
        safety_passed={},
        photos=[],
        results="",
        reward_coins=payload.rewardCoins or 200,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/projects/{project_id}/status", response_model=ProjectOut)
def update_status(
    project_id: str,
    payload: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    p.status = payload.status
    db.commit()
    db.refresh(p)
    return p


@router.put("/projects/{project_id}/progress", response_model=ProjectOut)
def update_progress(
    project_id: str,
    payload: ProjectProgressUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    p.progress = max(0, min(100, payload.progress))
    db.commit()
    db.refresh(p)
    return p


@router.post("/projects/{project_id}/done", response_model=ProjectOut)
def mark_done(project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    p.status = "done"
    p.progress = 100
    services.settle_project_done(db, p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/projects/{project_id}/safety-pass", response_model=ProjectOut)
def mark_safety_pass(project_id: str, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    passed = dict(p.safety_passed)
    passed[current.id] = True
    p.safety_passed = passed
    db.commit()
    db.refresh(p)
    return p


# ---------- Recruitments ----------
@router.get("/recruitments", response_model=list[RecruitmentOut])
def list_recruitments(
    project_id: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Recruitment)
    if project_id:
        q = q.filter(Recruitment.project_id == project_id)
    return q.all()


@router.post("/recruitments", response_model=RecruitmentOut)
def create_recruitment(payload: RecruitmentCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = Recruitment(
        id=services.gen_id("rec_"),
        project_id=payload.projectId,
        title=payload.title,
        description=payload.description,
        skills=payload.skills,
        reward=payload.reward,
        deadline=payload.deadline,
        status="open",
        bids=[],
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/recruitments/{rec_id}/bid", response_model=RecruitmentOut)
def place_bid(rec_id: str, payload: BidCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = db.get(Recruitment, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="招募不存在")
    bid = {
        "userId": payload.userId,
        "skillDesc": payload.skillDesc,
        "hours": payload.hours,
        "bidAt": datetime.now(timezone.utc).isoformat(),
    }
    rec.bids = list(rec.bids) + [bid]
    db.commit()
    db.refresh(rec)
    return rec


@router.put("/recruitments/{rec_id}/assign", response_model=RecruitmentOut)
def assign(rec_id: str, payload: AssignRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = db.get(Recruitment, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="招募不存在")
    rec.status = "assigned"
    rec.assignee_user_id = payload.userId
    db.commit()
    db.refresh(rec)
    return rec


@router.put("/recruitments/{rec_id}/resolve", response_model=RecruitmentOut)
def resolve(rec_id: str, payload: ResolveRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rec = db.get(Recruitment, rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="招募不存在")
    if payload.result not in ("success", "partial", "fail"):
        raise HTTPException(status_code=400, detail="非法的结算结果")
    services.settle_recruitment(db, rec, payload.result)
    rec.result = payload.result
    rec.status = "failed" if payload.result == "fail" else "done"
    rec.actual_pay = (
        rec.reward if payload.result == "success" else int(rec.reward * 0.5) if payload.result == "partial" else 0
    )
    db.commit()
    db.refresh(rec)
    return rec


# ---------- Showcase ----------
@router.get("/showcase", response_model=list[ShowcaseOut])
def list_showcase(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ShowcaseItem).all()


@router.post("/showcase", response_model=ShowcaseOut)
def create_showcase(payload: ShowcaseCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = ShowcaseItem(
        id=services.gen_id("showcase_"),
        project_id=payload.projectId or "",
        title=payload.title,
        cover_image=payload.coverImage,
        group_id=payload.groupId,
        description=payload.description or "",
        loves=0,
        loved_by=[],
        created_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/showcase/{showcase_id}/love", response_model=ShowcaseOut)
def toggle_love(showcase_id: str, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    item = db.get(ShowcaseItem, showcase_id)
    if not item:
        raise HTTPException(status_code=404, detail="展示不存在")
    uid = str(current.id)
    loved_by = list(item.loved_by)
    if uid in loved_by:
        loved_by.remove(uid)
        item.loves = max(0, item.loves - 1)
    else:
        loved_by.append(uid)
        item.loves = item.loves + 1
    item.loved_by = loved_by
    db.commit()
    db.refresh(item)
    return item
