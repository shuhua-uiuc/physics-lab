# Physics Mission Control — 后端服务

基于 **FastAPI + SQLAlchemy + SQLite** 的后端，为「物理研究基地」前端提供数据持久化、
账号密码 JWT 认证以及全部业务实体的 REST API。

## 技术栈

- FastAPI（Web 框架）
- SQLAlchemy 2.0（ORM）
- SQLite（默认数据库，零配置；可通过 `DATABASE_URL` 切换为 Postgres 等）
- python-jose（JWT）+ passlib[bcrypt]（密码哈希）

## 快速开始

```bash
cd backend

# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 初始化数据库并导入种子数据（把前端 mock 数据迁移进库）
python -m app.seed

# 4. 启动服务（默认 http://localhost:8000）
uvicorn app.main:app --reload --port 8000
```

启动后可访问交互式 API 文档：<http://localhost:8000/docs>

## 认证说明

- 教师账号：用户名 `teacher`，默认密码 `admin123`
- 学生账号：用户名为学生的登录名（见种子数据打印输出），默认密码 `student123`
- 登录接口 `POST /api/auth/login` 返回 JWT，前端在后续请求头 `Authorization: Bearer <token>` 中携带。

## 环境变量（可选）

在 `backend/` 下创建 `.env` 覆盖默认值：

```
DATABASE_URL=sqlite:///./physics_lab.db
JWT_SECRET=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=720
TEACHER_PASSWORD=admin123
STUDENT_DEFAULT_PASSWORD=student123
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```
