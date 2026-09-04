"""分组链路测试：建组、按班筛选、学生加入小组、组长设置。"""


def test_teacher_create_group(client, auth):
    resp = client.post(
        "/api/groups",
        json={"name": "新小组", "initialCoins": 100, "classId": "class-1"},
        headers=auth("teacher", "teacher123"),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "新小组"
    assert body["totalCoins"] == 100
    assert body["classId"] == "class-1"


def test_create_group_invalid_class(client, auth):
    resp = client.post(
        "/api/groups",
        json={"name": "X", "initialCoins": 0, "classId": "nope"},
        headers=auth("teacher", "teacher123"),
    )
    assert resp.status_code == 400


def test_create_group_requires_teacher(client, auth):
    resp = client.post(
        "/api/groups",
        json={"name": "学生组", "initialCoins": 0, "classId": "class-1"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 403


def test_list_groups_filter_by_class(client, auth):
    resp = client.get("/api/groups", headers=auth("u-1"))
    assert resp.status_code == 200
    all_ids = {g["id"] for g in resp.json()}
    assert {"g-1", "g-2", "g-3"} <= all_ids

    resp = client.get("/api/groups", params={"class_id": "class-1"}, headers=auth("u-1"))
    assert {g["id"] for g in resp.json()} == {"g-1", "g-2"}


def test_student_join_group(client, auth):
    resp = client.post("/api/groups/g-2/join", headers=auth("u-4"))
    assert resp.status_code == 200
    assert resp.json()["groupId"] == "g-2"


def test_student_join_twice_rejected(client, auth):
    # u-3 已在 g-2，再次加入应被拒绝
    resp = client.post("/api/groups/g-1/join", headers=auth("u-3"))
    assert resp.status_code == 400


def test_student_join_cross_class_rejected(client, auth):
    # u-5 属于 class-2，不能加入 class-1 的小组
    resp = client.post("/api/groups/g-1/join", headers=auth("u-5"))
    assert resp.status_code == 403


def test_set_leader(client, auth, db):
    from app.models import User

    resp = client.put("/api/groups/g-1/leader/u-2", headers=auth("teacher", "teacher123"))
    assert resp.status_code == 200

    db.expire_all()
    roles = {u.id: u.member_role for u in db.query(User).filter(User.group_id == "g-1")}
    assert roles == {"u-1": "member", "u-2": "leader"}
