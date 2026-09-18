"""密码：登录时报告「是否还在用初始密码」、教师重置学生密码、改密端点。

conftest 里所有学生的密码都是 `student123`，所以测试把
`settings.student_default_password` 也指到同一个值，才能模拟"还在用初始密码"。
"""

import pytest

from app.config import settings
from app.models import User


@pytest.fixture()
def default_pw(monkeypatch):
    """把「初始密码」指成 conftest 里学生实际用的密码。"""
    monkeypatch.setattr(settings, "student_default_password", "student123")
    return "student123"


def _login(client, username, password):
    return client.post("/api/auth/login", json={"username": username, "password": password})


# ---------- 登录响应里的「还在用初始密码」标记 ----------

def test_login_flags_default_password(client, default_pw):
    body = _login(client, "u-1", default_pw).json()
    assert body["isDefaultPassword"] is True


def test_login_clears_flag_after_password_change(client, auth, default_pw):
    headers = auth("u-1")  # 默认密码 student123
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": default_pw, "newPassword": "newpass123"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert _login(client, "u-1", "newpass123").json()["isDefaultPassword"] is False


def test_flag_false_for_teacher(client, default_pw):
    """教师密码不走这套初始密码，恒为 false。"""
    body = _login(client, "teacher", "teacher123").json()
    assert body["isDefaultPassword"] is False


def test_flag_false_when_password_differs(client, auth, default_pw):
    """密码与初始密码不同就不能误报。"""
    headers = auth("u-1")
    client.post(
        "/api/auth/change-password",
        json={"oldPassword": default_pw, "newPassword": "abcdef123"},
        headers=headers,
    )
    assert _login(client, "u-1", "abcdef123").json()["isDefaultPassword"] is False


# ---------- 教师重置学生密码 ----------

def test_teacher_resets_student_password(client, auth, db, default_pw):
    # 先改成别的密码，模拟"学生自己改过"
    client.post(
        "/api/auth/change-password",
        json={"oldPassword": default_pw, "newPassword": "forgotten9"},
        headers=auth("u-1"),
    )
    assert _login(client, "u-1", "forgotten9").status_code == 200

    resp = client.post("/api/students/u-1/password/reset", headers=auth("teacher", "teacher123"))
    assert resp.status_code == 200, resp.text
    assert resp.json()["password"] == default_pw

    # 重置后：初始密码能登、旧密码不能登
    after = _login(client, "u-1", default_pw)
    assert after.status_code == 200
    assert after.json()["isDefaultPassword"] is True
    assert _login(client, "u-1", "forgotten9").status_code == 401


def test_student_cannot_reset_anyone(client, auth, default_pw):
    assert client.post("/api/students/u-2/password/reset", headers=auth("u-1")).status_code == 403


def test_cannot_reset_teacher_account(client, auth, default_pw):
    assert client.post("/api/students/teacher/password/reset", headers=auth("teacher", "teacher123")).status_code == 400


def test_reset_unknown_student_is_404(client, auth, default_pw):
    assert client.post("/api/students/u_nope/password/reset", headers=auth("teacher", "teacher123")).status_code == 404


def test_reset_requires_configured_default(client, auth, monkeypatch):
    monkeypatch.setattr(settings, "student_default_password", "")
    resp = client.post("/api/students/u-1/password/reset", headers=auth("teacher", "teacher123"))
    assert resp.status_code == 500


def test_reset_does_not_touch_other_fields(client, auth, db, default_pw):
    before = db.get(User, "u-1")
    group_id, name = before.group_id, before.name
    client.post("/api/students/u-1/password/reset", headers=auth("teacher", "teacher123"))
    db.expire_all()
    after = db.get(User, "u-1")
    assert (after.group_id, after.name, after.account_role) == (group_id, name, "student")


# ---------- 改密端点（防回归） ----------

def test_change_password_rejects_wrong_old(client, auth):
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": "wrong-old", "newPassword": "whatever123"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 400


def test_change_password_rejects_short_new(client, auth):
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": "student123", "newPassword": "abc"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 422
