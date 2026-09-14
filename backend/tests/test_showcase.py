"""成果展览馆：教师编辑/下架，以及"学生改要重审、教师改不重审"的分歧。

预置数据见 conftest：u-1/u-2 属 g-1，u-3 属 g-2，teacher 为教师账号。
"""

from app.models import Group

teacher = lambda auth: auth("teacher", "teacher123")  # noqa: E731


def _create(client, auth, group_id="g-1", title="作品A"):
    resp = client.post(
        "/api/showcase",
        json={"title": title, "coverImage": "", "groupId": group_id, "description": "说明"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def _approve(client, auth, sid, coins=0):
    resp = client.post(
        f"/api/showcase/{sid}/review",
        json={"action": "approve", "coins": coins},
        headers=teacher(auth),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------- 编辑 ----------

def test_teacher_edit_keeps_approved_status(client, auth):
    """回归：教师改已通过的作品不得把它打回待审批。"""
    sid = _create(client, auth)
    _approve(client, auth, sid)

    resp = client.put(f"/api/showcase/{sid}", json={"title": "改过的标题"}, headers=teacher(auth))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "approved"
    assert body["title"] == "改过的标题"


def test_teacher_edit_can_change_cover_and_description(client, auth):
    sid = _create(client, auth)
    resp = client.put(
        f"/api/showcase/{sid}",
        json={"coverImage": "https://example.com/a.png", "description": "新说明"},
        headers=teacher(auth),
    )
    assert resp.status_code == 200
    assert resp.json()["coverImage"] == "https://example.com/a.png"
    assert resp.json()["description"] == "新说明"


def test_student_edit_still_resets_to_pending(client, auth):
    """学生改本组作品仍须重新送审（原有行为不能因教师改动而丢失）。"""
    sid = _create(client, auth)
    _approve(client, auth, sid)

    resp = client.put(f"/api/showcase/{sid}", json={"title": "学生改的"}, headers=auth("u-1"))
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


def test_non_owner_student_cannot_edit(client, auth):
    sid = _create(client, auth, group_id="g-1")
    resp = client.put(f"/api/showcase/{sid}", json={"title": "越权"}, headers=auth("u-3"))
    assert resp.status_code == 403


# ---------- 下架 ----------

def test_teacher_deletes_showcase(client, auth):
    sid = _create(client, auth)
    assert client.delete(f"/api/showcase/{sid}", headers=teacher(auth)).status_code == 200
    remaining = client.get("/api/showcase", headers=auth("u-1")).json()
    assert all(s["id"] != sid for s in remaining)


def test_student_cannot_delete(client, auth):
    sid = _create(client, auth)
    assert client.delete(f"/api/showcase/{sid}", headers=auth("u-1")).status_code == 403


def test_delete_unknown_is_404(client, auth):
    assert client.delete("/api/showcase/sc_nope", headers=teacher(auth)).status_code == 404


def test_delete_does_not_claw_back_awarded_coins(client, auth, db):
    """下架只删展示条目，已发出去的奖励能量币留在小组账上。"""
    sid = _create(client, auth)
    _approve(client, auth, sid, coins=50)
    db.expire_all()
    after_award = db.get(Group, "g-1").total_coins

    client.delete(f"/api/showcase/{sid}", headers=teacher(auth))
    db.expire_all()
    assert db.get(Group, "g-1").total_coins == after_award


def test_delete_pending_item(client, auth):
    sid = _create(client, auth)
    assert client.delete(f"/api/showcase/{sid}", headers=teacher(auth)).status_code == 200
