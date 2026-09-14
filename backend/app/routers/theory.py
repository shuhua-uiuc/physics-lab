import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..deps import get_current_user, require_teacher
from ..models import Challenge, Group, Question, QuizSession, SafetyRecord, Topic, User
from ..schemas import (
    ChallengeCreate,
    ChallengeOut,
    ChallengeSubmit,
    QuestionOut,
    QuizAnswerRequest,
    QuizSessionOut,
    QuizStartRequest,
    SafetyImportRequest,
    SafetyQuestionInput,
    SafetyQuestionUpdate,
    SafetyRecordCreate,
    SafetyRecordOut,
    TopicOut,
)
from ..safety_builtin import build_safety_questions

router = APIRouter(prefix="/api", tags=["theory"])


def _question_dict(q: Question) -> dict:
    return {
        "id": q.id,
        "type": q.type,
        "stem": q.stem,
        "options": q.options,
        "answer": q.answer,
        "knowledgePoint": q.knowledge_point,
        "difficulty": q.difficulty,
        "topicId": q.topic_id,
        "safetyCategory": q.safety_category,
    }


def _require_group(current: User) -> str:
    if not current.group_id:
        raise HTTPException(status_code=400, detail="当前用户未归属小组")
    return current.group_id


# ---------- Topics / Questions ----------
@router.get("/topics", response_model=list[TopicOut])
def list_topics(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Topic).all()


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(
    topic_id: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Question)
    if topic_id:
        q = q.filter(Question.topic_id == topic_id)
    return q.all()


# ---------- Safety question bank（教师维护；与理论题共用 questions 表，靠 safety_category 区分） ----------
def _new_safety_question(payload: SafetyQuestionInput) -> Question:
    return Question(
        id=f"sq_{services.gen_id()}",
        type=payload.type,
        stem=payload.stem,
        options=list(payload.options),
        answer=payload.answer,
        knowledge_point=payload.knowledgePoint or "",
        difficulty=payload.difficulty or 1,
        topic_id=None,  # 安全题不属于任何理论主题
        safety_category=payload.safetyCategory,
    )


@router.get("/safety/questions", response_model=list[QuestionOut])
def list_safety_questions(
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """安全题库。登录即可读——学生安全考核据此出题，教师端据此维护。"""
    q = db.query(Question).filter(Question.safety_category.isnot(None))
    if category:
        q = q.filter(Question.safety_category == category)
    return q.all()


@router.post("/safety/questions", response_model=QuestionOut, status_code=201)
def create_safety_question(
    payload: SafetyQuestionInput,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    item = _new_safety_question(payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# 注意：/import 与 /reset 必须声明在 /{question_id} 之前，否则会被路径参数吞掉
@router.post("/safety/questions/import")
def import_safety_questions(
    payload: SafetyImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    """批量导入。merge=按题干去重后追加；replace=清空现有安全题后整体写入。"""
    if payload.mode == "replace":
        db.query(Question).filter(Question.safety_category.isnot(None)).delete(synchronize_session=False)
        existing_stems: set[str] = set()
    else:
        existing_stems = {s for (s,) in db.query(Question.stem).filter(Question.safety_category.isnot(None))}

    imported = 0
    for q in payload.questions:
        if q.stem in existing_stems:
            continue
        db.add(_new_safety_question(q))
        existing_stems.add(q.stem)
        imported += 1
    db.commit()
    total = db.query(Question).filter(Question.safety_category.isnot(None)).count()
    return {"imported": imported, "total": total}


@router.post("/safety/questions/reset", response_model=list[QuestionOut])
def reset_safety_questions(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    """恢复内置题库：清空现有安全题后重新灌入内置的 35 道。"""
    db.query(Question).filter(Question.safety_category.isnot(None)).delete(synchronize_session=False)
    for raw in build_safety_questions():
        db.add(
            Question(
                id=raw["id"],
                type=raw["type"],
                stem=raw["stem"],
                options=list(raw["options"]),
                answer=raw["answer"],
                knowledge_point=raw.get("knowledgePoint", ""),
                difficulty=raw.get("difficulty", 1),
                topic_id=None,
                safety_category=raw["safetyCategory"],
            )
        )
    db.commit()
    return db.query(Question).filter(Question.safety_category.isnot(None)).all()


@router.patch("/safety/questions/{question_id}", response_model=QuestionOut)
def update_safety_question(
    question_id: str,
    payload: SafetyQuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    item = db.get(Question, question_id)
    if not item or item.safety_category is None:
        raise HTTPException(status_code=404, detail="安全题不存在")
    if payload.type is not None:
        item.type = payload.type
    if payload.stem is not None:
        item.stem = payload.stem
    if payload.options is not None:
        item.options = list(payload.options)
    if payload.answer is not None:
        item.answer = payload.answer
    if payload.knowledgePoint is not None:
        item.knowledge_point = payload.knowledgePoint
    if payload.difficulty is not None:
        item.difficulty = payload.difficulty
    if payload.safetyCategory is not None:
        item.safety_category = payload.safetyCategory
    db.commit()
    db.refresh(item)
    return item


@router.delete("/safety/questions/{question_id}")
def delete_safety_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    item = db.get(Question, question_id)
    if not item or item.safety_category is None:
        raise HTTPException(status_code=404, detail="安全题不存在")
    db.delete(item)
    db.commit()
    return {"ok": True}


# ---------- Quiz ----------
@router.post("/quiz/start", response_model=QuizSessionOut)
def start_quiz(payload: QuizStartRequest, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    topic_questions = db.query(Question).filter(Question.topic_id == payload.topicId).all()
    if not topic_questions:
        raise HTTPException(status_code=404, detail="该主题暂无题目")

    # 按知识点均匀抽题，逻辑对齐前端 theoryStore.startQuiz
    kp_map: dict[str, list[Question]] = {}
    for q in topic_questions:
        kp_map.setdefault(q.knowledge_point, []).append(q)
    kps = list(kp_map.keys())
    picked: list[Question] = []
    per_kp = max(1, 10 // len(kps))
    for kp in kps:
        pool = kp_map[kp][:]
        random.shuffle(pool)
        picked.extend(pool[: min(per_kp, len(pool))])
    while len(picked) < 10 and len(topic_questions) > len(picked):
        remain = [q for q in topic_questions if q not in picked]
        picked.append(random.choice(remain))
    final = picked[:10]

    session = QuizSession(
        id=services.gen_id("qs_"),
        topic_id=payload.topicId,
        user_id=current.id,
        questions=[_question_dict(q) for q in final],
        user_answers={},
        score=0,
        passed=False,
        blind_points=[],
        created_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/quiz/{session_id}/answer", response_model=QuizSessionOut)
def submit_answer(
    session_id: str,
    payload: QuizAnswerRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    session = db.get(QuizSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="答题会话不存在")
    answers = dict(session.user_answers)
    answers[payload.qid] = payload.answer
    session.user_answers = answers
    db.commit()
    db.refresh(session)
    return session


@router.post("/quiz/{session_id}/grade", response_model=QuizSessionOut)
def grade_quiz(session_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    session = db.get(QuizSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="答题会话不存在")
    correct = 0
    blind: set[str] = set()
    for q in session.questions:
        ua = session.user_answers.get(q["id"])
        if ua is not None and services.is_answer_correct(q, ua):
            correct += 1
        else:
            blind.add(q.get("knowledgePoint", ""))
    total = len(session.questions) or 1
    session.score = round(correct / total * 100)
    session.passed = session.score >= 80
    session.blind_points = list(blind)
    db.commit()
    db.refresh(session)
    return session


# ---------- Challenges ----------
@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Challenge).all()


@router.post("/challenges", response_model=ChallengeOut)
def create_challenge(payload: ChallengeCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    group_id = _require_group(current)
    if payload.reward < 0:
        raise HTTPException(status_code=400, detail="奖励不能为负数")
    group = db.get(Group, group_id)
    if group is None or group.total_coins < payload.reward:
        raise HTTPException(status_code=400, detail="能量币不足，无法创建挑战")
    # 创建挑战预扣能量币
    services.add_tx(
        db,
        group_id,
        source="challenge",
        ref_id=f"pre_{services.gen_id()}",
        delta=-payload.reward,
        note=f"创建挑战「{payload.title}」预扣能量币",
    )
    challenge = Challenge(
        id=services.gen_id("ch_"),
        title=payload.title,
        creator_group_id=group_id,
        topic_id=payload.topicId,
        question_ids=payload.questionIds,
        reward=payload.reward,
        deadline=payload.deadline,
        status="open",
        submissions=[],
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("/challenges/{challenge_id}/questions", response_model=list[QuestionOut])
def accept_challenge(challenge_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="挑战不存在")
    if challenge.question_ids:
        qs = db.query(Question).filter(Question.id.in_(challenge.question_ids)).all()
        if qs:
            return qs
    # 回退：取该主题前 10 题
    return db.query(Question).filter(Question.topic_id == challenge.topic_id).limit(10).all()


@router.post("/challenges/{challenge_id}/submit", response_model=ChallengeOut)
def submit_challenge(
    challenge_id: str,
    payload: ChallengeSubmit,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    group_id = _require_group(current)
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="挑战不存在")
    if challenge.status != "open":
        raise HTTPException(status_code=400, detail="挑战已关闭，无法提交")
    if challenge.creator_group_id == group_id:
        raise HTTPException(status_code=403, detail="不能作答自己创建的挑战")
    if any(s.get("groupId") == group_id for s in challenge.submissions):
        raise HTTPException(status_code=400, detail="本小组已作答过该挑战")

    if challenge.question_ids:
        qs = db.query(Question).filter(Question.id.in_(challenge.question_ids)).all()
    else:
        qs = []
    if not qs:
        qs = db.query(Question).filter(Question.topic_id == challenge.topic_id).limit(10).all()

    correct = 0
    for q in qs:
        ua = payload.answers.get(q.id)
        if ua is not None and services.is_answer_correct(_question_dict(q), ua):
            correct += 1
    total = len(qs) or 1
    accuracy = correct / total

    result = services.settle_challenge(db, challenge, group_id, accuracy)
    submission = {
        "groupId": group_id,
        "answers": payload.answers,
        "accuracy": accuracy,
        "earned": result["solverReward"],
        "submittedAt": datetime.now(timezone.utc).isoformat(),
    }
    challenge.submissions = list(challenge.submissions) + [submission]
    db.commit()
    db.refresh(challenge)
    return challenge


# ---------- Safety exam records ----------
@router.post("/safety/records", response_model=SafetyRecordOut)
def create_safety_record(
    payload: SafetyRecordCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """记录一次安全科目考核结果（用于安全实验室按真实记录算通过率）。"""
    rec = SafetyRecord(
        id=services.gen_id("srec_"),
        user_id=current.id,
        category=payload.category,
        score=payload.score,
        passed=payload.passed,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/safety/records", response_model=list[SafetyRecordOut])
def list_safety_records(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """当前用户的安全考核记录（按时间倒序）。"""
    return (
        db.query(SafetyRecord)
        .filter(SafetyRecord.user_id == current.id)
        .order_by(SafetyRecord.created_at.desc())
        .all()
    )
