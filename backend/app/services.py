"""业务服务层：能量币结算、答题判分等核心逻辑。

算法逐条对齐前端 store（coinStore.ts / theoryStore.ts），确保迁移后结算结果一致。
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import models


def gen_id(prefix: str = "") -> str:
    core = uuid.uuid4().hex[:12]
    return f"{prefix}{core}" if prefix else core


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- 能量币 ----------
def add_tx(
    db: Session,
    group_id: str,
    *,
    source: str,
    ref_id: str,
    delta: int,
    note: str,
    user_id: str | None = None,
) -> models.CoinTransaction:
    group = db.get(models.Group, group_id)
    if group is None:
        raise ValueError(f"小组不存在: {group_id}")
    # 能量币不允许为负：扣减最多扣到 0，同步修正记账 delta
    new_total = group.total_coins + delta
    if new_total < 0:
        delta = -group.total_coins
        new_total = 0
    group.total_coins = new_total
    tx = models.CoinTransaction(
        id=gen_id("tx_"),
        group_id=group_id,
        user_id=user_id,
        source=source,
        ref_id=ref_id,
        delta=delta,
        balance_after=group.total_coins,
        created_at=_now(),
        note=note,
    )
    db.add(tx)
    return tx


def settle_challenge(db: Session, challenge: models.Challenge, solver_group_id: str, accuracy: float) -> dict:
    reward = int(challenge.reward * accuracy)
    bonus = int(challenge.reward * 0.2) if accuracy >= 0.95 else 0
    solver_reward = reward + bonus
    creator_refund = challenge.reward - reward

    add_tx(
        db,
        solver_group_id,
        source="challenge",
        ref_id=challenge.id,
        delta=solver_reward,
        note=f"挑战「{challenge.title}」答对奖励" + ("(含卓越加成)" if accuracy >= 0.95 else ""),
    )
    if creator_refund > 0:
        add_tx(
            db,
            challenge.creator_group_id,
            source="challenge",
            ref_id=challenge.id,
            delta=creator_refund,
            note=f"挑战「{challenge.title}」剩余能量币回收",
        )
    return {"solverReward": solver_reward, "creatorRefund": creator_refund}


def settle_recruitment(db: Session, recruitment: models.Recruitment, result: str) -> dict:
    assignee = db.get(models.User, recruitment.assignee_user_id) if recruitment.assignee_user_id else None
    assignee_group_id = assignee.group_id if assignee else None

    assignee_pay = 0
    owner_refund = 0
    if result == "success":
        assignee_pay = recruitment.reward
    elif result == "partial":
        assignee_pay = int(recruitment.reward * 0.5)
        owner_refund = recruitment.reward - assignee_pay
    else:
        owner_refund = recruitment.reward

    if assignee_pay > 0 and assignee_group_id:
        add_tx(
            db,
            assignee_group_id,
            source="recruit",
            ref_id=recruitment.id,
            delta=assignee_pay,
            note=f"招募「{recruitment.title}」{'全额' if result == 'success' else '部分'}酬劳",
            user_id=recruitment.assignee_user_id,
        )

    if owner_refund > 0:
        project = db.get(models.Project, recruitment.project_id)
        owner_group_id = project.owner_group_id if project else None
        if owner_group_id:
            add_tx(
                db,
                owner_group_id,
                source="recruit",
                ref_id=recruitment.id,
                delta=owner_refund,
                note=f"招募「{recruitment.title}」{'失败' if result == 'fail' else '部分完成'}回收",
            )
    return {"assigneePay": assignee_pay, "ownerRefund": owner_refund}


def settle_project_done(db: Session, project: models.Project) -> dict:
    group = db.get(models.Group, project.owner_group_id)
    earnings: dict[str, int] = {}
    if group is None:
        return earnings

    members = db.query(models.User).filter(models.User.group_id == project.owner_group_id).all()
    total_reward = project.reward_coins
    ratio_map = group.contribution_ratio or {}

    # 只有比例表确实覆盖到本组成员时才按比例分。历史遗留的失效 id（如 u-01 对不上现在的
    # u_xxxxxx）会让每个人的比例都是 0——那样项目做完了却谁都拿不到个人能量，是静默失败。
    # 因此这里加均分兜底：比例表用不上时，奖励按人头平分给组员。
    ratios = {m.id: ratio_map.get(m.id, 0) for m in members}
    if members and sum(ratios.values()) > 0:
        for member in members:
            earning = int(total_reward * ratios[member.id] / 100)
            if earning > 0:
                earnings[member.id] = earning
                member.personal_coins = member.personal_coins + earning
    elif members:
        # 余数依次补给靠前的成员，保证分出去的总额恰好等于奖励
        share, remainder = divmod(total_reward, len(members))
        for i, member in enumerate(members):
            earning = share + (1 if i < remainder else 0)
            if earning > 0:
                earnings[member.id] = earning
                member.personal_coins = member.personal_coins + earning

    add_tx(
        db,
        project.owner_group_id,
        source="project",
        ref_id=project.id,
        delta=total_reward,
        note=f"项目「{project.title}」完成奖励",
    )
    return earnings


# ---------- 答题判分 ----------
def is_answer_correct(question: dict, user_answer) -> bool:
    qtype = question.get("type")
    answer = question.get("answer")
    if qtype == "multiple":
        correct = ",".join(str(x) for x in sorted(answer)) if isinstance(answer, list) else ""
        user = ",".join(str(x) for x in sorted(user_answer)) if isinstance(user_answer, list) else ""
        return correct == user
    if qtype == "judge":
        return bool(user_answer) == bool(answer)
    try:
        return int(user_answer) == int(answer)
    except (TypeError, ValueError):
        return False
