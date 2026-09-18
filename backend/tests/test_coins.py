"""金币结算链路测试：教师调整、组间转账、挑战结算、项目完成结算、招募结算。"""

from app.models import CoinTransaction, User

DEADLINE = "2030-01-01T00:00:00Z"


def _balances(client, auth) -> dict:
    resp = client.get("/api/groups", headers=auth("u-1"))
    assert resp.status_code == 200
    return {g["id"]: g["totalCoins"] for g in resp.json()}


def _personal(db, user_id: str) -> int:
    db.expire_all()
    return db.get(User, user_id).personal_coins


# ---------- 教师调整 ----------

def test_teacher_adjust_coins(client, auth, db):
    resp = client.post("/api/groups/g-1/coins", json={"delta": 100}, headers=auth("teacher", "teacher123"))
    assert resp.status_code == 200
    assert resp.json()["balanceAfter"] == 600

    db.expire_all()
    tx = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.group_id == "g-1")
        .order_by(CoinTransaction.created_at.desc())
        .first()
    )
    assert tx.source == "teacher_set" and tx.delta == 100


def test_student_cannot_adjust_coins(client, auth):
    resp = client.post("/api/groups/g-1/coins", json={"delta": 100}, headers=auth("u-1"))
    assert resp.status_code == 403


# ---------- 调币理由（会写进流水，学生可见） ----------

def _last_tx(db, group_id="g-1"):
    db.expire_all()
    return (
        db.query(CoinTransaction)
        .filter(CoinTransaction.group_id == group_id)
        .order_by(CoinTransaction.created_at.desc())
        .first()
    )


def test_group_award_stores_reason(client, auth, db):
    client.post(
        "/api/groups/g-1/coins",
        json={"delta": 100, "note": "实验完成质量高"},
        headers=auth("teacher", "teacher123"),
    )
    tx = _last_tx(db)
    assert tx.note == "实验完成质量高"
    assert tx.source == "teacher_set"


def test_group_deduction_stores_reason_and_marks_penalty(client, auth, db):
    client.post(
        "/api/groups/g-1/coins",
        json={"delta": -30, "note": "器材未按时归还"},
        headers=auth("teacher", "teacher123"),
    )
    tx = _last_tx(db)
    assert tx.note == "器材未按时归还"
    assert tx.source == "penalty" and tx.delta == -30


def test_group_adjust_without_reason_falls_back(client, auth, db):
    client.post("/api/groups/g-1/coins", json={"delta": 50}, headers=auth("teacher", "teacher123"))
    assert _last_tx(db).note == "教师调整能量币"

    client.post("/api/groups/g-1/coins", json={"delta": -50}, headers=auth("teacher", "teacher123"))
    assert _last_tx(db).note == "教师扣除能量币"


def test_blank_reason_is_treated_as_missing(client, auth, db):
    """只打了空格不算理由，回退到中性文案，避免流水里出现空 note。"""
    client.post(
        "/api/groups/g-1/coins",
        json={"delta": 50, "note": "   "},
        headers=auth("teacher", "teacher123"),
    )
    assert _last_tx(db).note == "教师调整能量币"


def test_personal_adjust_stores_reason(client, auth, db):
    client.post(
        "/api/users/u-1/coins",
        json={"delta": 20, "note": "课堂表现优秀"},
        headers=auth("teacher", "teacher123"),
    )
    tx = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == "u-1")
        .order_by(CoinTransaction.created_at.desc())
        .first()
    )
    assert tx is not None and tx.note == "课堂表现优秀"


# ---------- 组间转账 ----------

def test_transfer_success(client, auth, db):
    resp = client.post(
        "/api/coins/transfer",
        json={"sourceGroupId": "g-1", "targetGroupId": "g-2", "amount": 50, "note": "借调设备"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sourceBalanceAfter"] == 450
    assert body["targetBalanceAfter"] == 350

    # 收支两笔流水共享同一 refId
    db.expire_all()
    txs = db.query(CoinTransaction).filter(CoinTransaction.ref_id == body["refId"]).all()
    assert {t.delta for t in txs} == {50, -50}
    assert {t.source for t in txs} == {"transfer"}


def test_transfer_from_other_group_rejected(client, auth):
    # u-1 属于 g-1，不能以 g-2 名义转出
    resp = client.post(
        "/api/coins/transfer",
        json={"sourceGroupId": "g-2", "targetGroupId": "g-1", "amount": 10},
        headers=auth("u-1"),
    )
    assert resp.status_code == 403


def test_transfer_insufficient_rejected(client, auth):
    resp = client.post(
        "/api/coins/transfer",
        json={"sourceGroupId": "g-2", "targetGroupId": "g-1", "amount": 5000},
        headers=auth("u-3"),
    )
    assert resp.status_code == 400


def test_transfer_same_group_rejected(client, auth):
    resp = client.post(
        "/api/coins/transfer",
        json={"sourceGroupId": "g-1", "targetGroupId": "g-1", "amount": 10},
        headers=auth("u-1"),
    )
    assert resp.status_code == 400


def test_transfer_zero_amount_rejected(client, auth):
    resp = client.post(
        "/api/coins/transfer",
        json={"sourceGroupId": "g-1", "targetGroupId": "g-2", "amount": 0},
        headers=auth("u-1"),
    )
    assert resp.status_code == 422


# ---------- 挑战结算 ----------

def _set_rates(client, auth, easy: int, medium: int, hard: int):
    """教师设置挑战奖励单价（奖励由服务端按题目难度算，不能由客户端传）。"""
    resp = client.put(
        "/api/class-meta",
        json={"coinEasy": easy, "coinMedium": medium, "coinHard": hard},
        headers=auth("teacher", "teacher123"),
    )
    assert resp.status_code == 200, resp.text


def _create_challenge(client, auth, user: str = "u-1") -> str:
    """建挑战。奖励由服务端按难度算——conftest 里 q-1/q-2 都是难度 1。"""
    resp = client.post(
        "/api/challenges",
        json={
            "title": "力学挑战",
            "topicId": "t-1",
            "questionIds": ["q-1", "q-2"],
            "deadline": DEADLINE,
        },
        headers=auth(user),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_challenge_settle_all_correct(client, auth):
    # 单价 50/50/50 × 两道简单题 = 奖励 100：g-1 500 → 400
    _set_rates(client, auth, 50, 50, 50)
    challenge_id = _create_challenge(client, auth)
    assert _balances(client, auth)["g-1"] == 400

    # g-2 学生全部答对：解题组得 100 + 20% 奖励，出题组无退款
    resp = client.post(
        f"/api/challenges/{challenge_id}/submit",
        json={"answers": {"q-1": 2, "q-2": 1}},
        headers=auth("u-3"),
    )
    assert resp.status_code == 200

    balances = _balances(client, auth)
    assert balances["g-1"] == 400
    assert balances["g-2"] == 420  # 300 + 120


def test_challenge_settle_all_wrong(client, auth):
    _set_rates(client, auth, 50, 50, 50)
    challenge_id = _create_challenge(client, auth)

    resp = client.post(
        f"/api/challenges/{challenge_id}/submit",
        json={"answers": {"q-1": 999, "q-2": 999}},
        headers=auth("u-3"),
    )
    assert resp.status_code == 200

    balances = _balances(client, auth)
    assert balances["g-1"] == 500  # 预扣 100 后全额退回
    assert balances["g-2"] == 300  # 未答对，无收益


# ---------- 项目完成结算 ----------

def test_project_done_settle(client, auth, db):
    # u-1（g-1）创建项目，奖励 200
    resp = client.post(
        "/api/projects",
        json={"title": "单摆测重力加速度", "topic": "力学", "rewardCoins": 200},
        headers=auth("u-1"),
    )
    assert resp.status_code == 200, resp.text
    project_id = resp.json()["id"]

    # 教师设置贡献比：u-1 60 / u-2 40
    resp = client.put(
        "/api/groups/g-1/contribution",
        json={"ratioRecord": {"u-1": 60, "u-2": 40}},
        headers=auth("teacher", "teacher123"),
    )
    assert resp.status_code == 200

    resp = client.post(f"/api/projects/{project_id}/done", headers=auth("u-1"))
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"

    assert _balances(client, auth)["g-1"] == 700  # 500 + 200
    assert _personal(db, "u-1") == 120
    assert _personal(db, "u-2") == 80


# ---------- 招募结算 ----------

def _create_recruitment(client, auth, project_id: str, reward: int) -> str:
    resp = client.post(
        "/api/recruitments",
        json={
            "projectId": project_id,
            "title": "招募传感器调试",
            "description": "",
            "skills": ["电路"],
            "reward": reward,
            "deadline": DEADLINE,
        },
        headers=auth("u-1"),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def _project_for(client, auth) -> str:
    resp = client.post(
        "/api/projects",
        json={"title": "招募用项目", "topic": "力学"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 200
    return resp.json()["id"]


def test_recruitment_settle_success(client, auth):
    rec_id = _create_recruitment(client, auth, _project_for(client, auth), reward=50)
    resp = client.put(f"/api/recruitments/{rec_id}/assign", json={"userId": "u-3"}, headers=auth("u-1"))
    assert resp.status_code == 200

    resp = client.put(f"/api/recruitments/{rec_id}/resolve", json={"result": "success"}, headers=auth("u-1"))
    assert resp.status_code == 200

    # 承接方 u-3 所在组 g-2 得到全额报酬
    assert _balances(client, auth)["g-2"] == 350
    assert _balances(client, auth)["g-1"] == 500


def test_recruitment_settle_fail_refund_owner(client, auth):
    rec_id = _create_recruitment(client, auth, _project_for(client, auth), reward=50)
    client.put(f"/api/recruitments/{rec_id}/assign", json={"userId": "u-3"}, headers=auth("u-1"))

    resp = client.put(f"/api/recruitments/{rec_id}/resolve", json={"result": "fail"}, headers=auth("u-1"))
    assert resp.status_code == 200

    # 失败：报酬退回项目归属组 g-1
    assert _balances(client, auth)["g-1"] == 550
    assert _balances(client, auth)["g-2"] == 300


def test_challenge_cannot_resubmit(client, auth):
    cid = _create_challenge(client, auth)
    ok = client.post(f"/api/challenges/{cid}/submit", json={"answers": {"q-1": 2, "q-2": 1}}, headers=auth("u-3"))
    assert ok.status_code == 200
    resp = client.post(f"/api/challenges/{cid}/submit", json={"answers": {"q-1": 2, "q-2": 1}}, headers=auth("u-3"))
    assert resp.status_code == 400


def test_challenge_creator_cannot_self_submit(client, auth):
    cid = _create_challenge(client, auth)
    resp = client.post(f"/api/challenges/{cid}/submit", json={"answers": {"q-1": 2, "q-2": 1}}, headers=auth("u-1"))
    assert resp.status_code == 403


def test_create_challenge_insufficient_balance(client, auth):
    # 奖励由服务端按难度算（默认单价 × 两道简单题 = 2 币），所以先把 g-2 压到不够
    client.post("/api/groups/g-2/coins", json={"delta": -299}, headers=auth("teacher", "teacher123"))
    resp = client.post(
        "/api/challenges",
        json={"title": "买不起的挑战", "topicId": "t-1", "questionIds": ["q-1", "q-2"], "deadline": DEADLINE},
        headers=auth("u-3"),
    )
    assert resp.status_code == 400


def test_group_coins_cannot_go_negative(client, auth):
    # g-1 初始 500，扣 999 → 能量归 0，不为负
    resp = client.post("/api/groups/g-1/coins", json={"delta": -999}, headers=auth("teacher", "teacher123"))
    assert resp.status_code == 200
    assert resp.json()["balanceAfter"] == 0
