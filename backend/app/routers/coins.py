from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..deps import get_current_user, require_teacher
from ..models import ClassMeta, CoinTransaction, Group, User
from ..schemas import (
    ClassMetaOut,
    CoinDelta,
    CoinTransfer,
    GroupRankRow,
    PersonalRankRow,
    RankingsOut,
)

router = APIRouter(prefix="/api", tags=["coins"])


@router.get("/coin-transactions")
def list_transactions(
    group_id: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(CoinTransaction)
    if group_id:
        q = q.filter(CoinTransaction.group_id == group_id)
    txs = q.order_by(CoinTransaction.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "groupId": t.group_id,
            "userId": t.user_id,
            "source": t.source,
            "refId": t.ref_id,
            "delta": t.delta,
            "balanceAfter": t.balance_after,
            "createdAt": t.created_at.isoformat(),
            "note": t.note,
        }
        for t in txs
    ]


@router.get("/rankings", response_model=RankingsOut)
def rankings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    groups = db.query(Group).all()
    users = db.query(User).filter(User.account_role == "student").all()

    group_ranking = [
        GroupRankRow(group_id=g.id, name=g.name, total_coins=g.total_coins, rank=idx + 1)
        for idx, g in enumerate(sorted(groups, key=lambda x: x.total_coins, reverse=True))
    ]
    personal_ranking = [
        PersonalRankRow(
            user_id=u.id,
            name=u.name,
            personal_coins=u.personal_coins,
            group_id=u.group_id or "",
            rank=idx + 1,
        )
        for idx, u in enumerate(sorted(users, key=lambda x: x.personal_coins, reverse=True))
    ]
    return RankingsOut(group_ranking=group_ranking, personal_ranking=personal_ranking)


@router.post("/groups/{group_id}/coins")
def teacher_adjust_coins(
    group_id: str,
    payload: CoinDelta,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="小组不存在")
    tx = services.add_tx(
        db,
        group_id,
        source="teacher_set" if payload.delta >= 0 else "penalty",
        ref_id="teacher_adjust",
        delta=payload.delta,
        note="教师调整能量币" if payload.delta >= 0 else "教师扣除能量币",
    )
    db.commit()
    return {"balanceAfter": tx.balance_after}


@router.post("/coins/transfer")
def transfer_coins(
    payload: CoinTransfer,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """组间能量币转账（学生发起，后端原子记账，收支两笔共享同一 refId）。"""
    if payload.source_group_id == payload.target_group_id:
        raise HTTPException(status_code=400, detail="不能转账给自己小组")
    src = db.get(Group, payload.source_group_id)
    tgt = db.get(Group, payload.target_group_id)
    if not src or not tgt:
        raise HTTPException(status_code=404, detail="小组不存在")
    # 学生只能从自己所在小组转出；教师/管理员可代任意小组操作
    if user.account_role == "student" and user.group_id != src.id:
        raise HTTPException(status_code=403, detail="只能从自己所在小组转出")
    if src.total_coins < payload.amount:
        raise HTTPException(status_code=400, detail="小组能量币不足")

    ref_id = services.gen_id("tr_")
    note = payload.note.strip()
    tx_out = services.add_tx(
        db,
        src.id,
        source="transfer",
        ref_id=ref_id,
        delta=-payload.amount,
        note=f"转账给「{tgt.name}」" + (f"：{note}" if note else ""),
        user_id=user.id,
    )
    tx_in = services.add_tx(
        db,
        tgt.id,
        source="transfer",
        ref_id=ref_id,
        delta=payload.amount,
        note=f"收到「{src.name}」转账" + (f"：{note}" if note else ""),
    )
    db.commit()
    return {
        "refId": ref_id,
        "sourceBalanceAfter": tx_out.balance_after,
        "targetBalanceAfter": tx_in.balance_after,
    }


@router.get("/class-meta", response_model=ClassMetaOut)
def get_class_meta(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    meta = db.get(ClassMeta, 1)
    if not meta:
        raise HTTPException(status_code=404, detail="班级信息未初始化")
    return meta
