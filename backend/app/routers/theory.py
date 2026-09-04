import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..deps import get_current_user
from ..models import Challenge, Group, Question, QuizSession, Topic, User
from ..schemas import (
    ChallengeCreate,
    ChallengeOut,
    ChallengeSubmit,
    QuestionOut,
    QuizAnswerRequest,
    QuizSessionOut,
    QuizStartRequest,
    TopicOut,
)

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
