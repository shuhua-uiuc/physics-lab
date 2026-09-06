"""登录 / 认证链路测试。"""


def test_login_success(client):
    resp = client.post("/api/auth/login", json={"username": "u-1", "password": "student123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["accessToken"]
    assert body["userId"] == "u-1"
    assert body["role"] == "student"
    assert body["groupId"] == "g-1"
    assert body["classId"] == "class-1"


def test_login_teacher(client):
    resp = client.post("/api/auth/login", json={"username": "teacher", "password": "teacher123"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "teacher"


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={"username": "u-1", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post("/api/auth/login", json={"username": "ghost", "password": "x"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token(client, auth):
    resp = client.get("/api/auth/me", headers=auth("u-1"))
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "u-1"
    assert body["groupId"] == "g-1"
    assert body["classId"] == "class-1"


def test_register_student(client):
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "username": "newstu",
            "password": "abc12345",
            "classId": "class-1",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["role"] == "student"
    assert body["classId"] == "class-1"
    assert body["accessToken"]


def test_register_short_password_rejected(client):
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "short@example.com",
            "username": "shortpw",
            "password": "123",
            "classId": "class-1",
        },
    )
    assert resp.status_code == 422


def test_change_password_success(client, auth):
    headers = auth("u-1")  # 初始密码 student123
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": "student123", "newPassword": "newpass123"},
        headers=headers,
    )
    assert resp.status_code == 200
    # 用新密码登录成功
    login = client.post("/api/auth/login", json={"username": "u-1", "password": "newpass123"})
    assert login.status_code == 200
    # 旧密码失效
    old_login = client.post("/api/auth/login", json={"username": "u-1", "password": "student123"})
    assert old_login.status_code == 401


def test_change_password_wrong_old(client, auth):
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": "wrongpass", "newPassword": "newpass123"},
        headers=auth("u-1"),
    )
    assert resp.status_code == 400


def test_change_password_requires_auth(client):
    resp = client.post(
        "/api/auth/change-password",
        json={"oldPassword": "student123", "newPassword": "newpass123"},
    )
    assert resp.status_code == 401
