# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

物理实验室（Physics Mission Control）——面向高中物理教学的**游戏化沉浸式学习平台**。三种角色：**学生**（`/dashboard`）、**教师**（`/teacher/overview`）、**管理员**（`/admin`），三者路由**都挂在同一个布局 `MissionShell`** 上（`AppShell`/`Sidebar`/`Topbar` 已不存在）。教师路由有 6 个：overview / groups / projects / roster / question-bank / safety。深度设计细节在 `docs/DESIGN.md`（权威文档；当代码与文档不一致时以代码为准并同步更新它）。

单仓库：根目录为 Vite React 前端，`backend/` 为 FastAPI 后端。

## 常用命令

前端（仓库根目录）：
```bash
npm run dev       # Vite 开发服务器 → http://localhost:5173
npm run check     # tsc -b --noEmit（提交前必须通过）
npm run build     # tsc -b && vite build（已配置 vendor 分包）
npm run lint      # eslint
```

后端（必须用 venv——系统 Python 缺 jose/bcrypt）：
```bash
cd backend
.venv/bin/uvicorn app.main:app --port 8000
.venv/bin/python -m pytest tests/ -q                        # 全部测试
.venv/bin/python -m pytest tests/test_projects.py -q        # 单个文件
.venv/bin/python -m pytest "tests/test_projects.py::test_update_project_partial_fields_keep_others" -q   # 单个测试
```

登录名：教师 `teacher`、管理员 `admin`、学生 `u-01` 起（实际名单见启动时种子输出）。**密码不要从本文档推断**——按加载来源优先级为：本地跑 → `backend/.env`；Docker 部署 → 仓库根 `.env`；两者都没配 → `backend/app/config.py` 的兜底默认值（`TEACHER_PASSWORD`/`ADMIN_PASSWORD`/`STUDENT_DEFAULT_PASSWORD`）。改密只需改对应 `.env` 并重启后端。

## 架构

### 前端数据流
`pages → Zustand stores（单一数据源）→ lib/apiService → lib/apiClient（fetch + Bearer）`。TS 领域类型与离线种子数据在 `src/data/mockData.ts`。

由 `VITE_API_BASE_URL` 控制两种模式：
- **离线**（未配置 base URL）：store 只读写 `localStorage`。
- **在线**（配置了 base URL）：写操作为**乐观更新**——先改 store + 写 localStorage，再 fire-and-forget 调 `syncToApi(task, label)`（`lib/syncQueue.ts`）。登录/刷新时 `bootstrapFromApi()` 拉取全量数据，`lib/reviveDates.ts` 按字段名把 ISO 字符串转回 `Date`。

### 前后端契约
后端 Pydantic `CamelModel`（`alias_generator=to_camel`、`populate_by_name`）把 snake_case 字段序列化成 camelCase，与前端 TS 类型对齐。前端始终发 camelCase 键。**未**继承 `CamelModel` 的请求模型（如 `ProjectCreate`/`ProjectUpdate`）用字面 camelCase 字段名，并在路由里手工映射。

### 金币经济——结算只归后端（重要契约）
`src/store/coinStore.ts` 明确约定：`addTx` / `settleChallenge` / `settleRecruitment` / `settleProjectDone` 只是**本地乐观 UI 更新**，不得向后端推送裸金币变动。真正的记账只发生在后端业务端点：`POST /projects/{id}/done`、`POST /challenges/{id}/submit`、`PUT /recruitments/{id}/resolve`、`POST /coins/transfer`。这些操作完成后需重拉 groups/users/coinTxs 对齐（`src/store/projectStore.ts` 的 `refetchAfterSettlement`）。

> ⚠️ 已知问题（来自全量代码审查）：多个结算端点缺少授权/幂等校验，且 `addTx→updateGroupCoins` 可能额外推送 `groupsApi.adjustCoins`，导致重复记账/刷币。改动结算相关代码时，切勿重新引入裸金币推送。

### 设计系统
Tailwind + 语义色 token（`mission/energy/growth/nova/alert/danger/ink`）。卡片 `glass-card`、徽章 `chip-*`、按钮 `btn-*`。Markdown 必须包在 `.prose-safety` 内渲染。所有可交互元素需显式绑定 `onClick`（无功能时给 toast 或跳转）。页面中禁止硬编码业务数据——一律从 store 取。

## 易踩坑的规则

- **刷新丢数据**：只调 `initAuth()` 不会恢复分组/学生数据，必须 `bootstrapFromApi()`。教师总览用 `bootstrapFromApi(true)` 强制拉最新。
- `coinTxs` 必须**时间正序**存储；展示"最近 N 条"用 `reverse` + `slice`。
- **后端测试必须用 `backend/.venv/bin/python`**（系统 Python 缺依赖）。
- 改 `schemas.py`/`models.py` 后需重启 uvicorn（dev 服务器未开 `--reload`）；重启若 `jwt_secret` 变更会使旧 token 失效。
- `/theory/challenge`（无 `s`）和 `/theory/challenges`（带 `s`）**是两个不同页面，都还挂着**：前者渲染 `KnowledgeGalaxy`（知识星系），后者渲染 `TheoryChallenge`（挑战大厅）。不是新旧拼写关系。
- **判断页面是否被使用，不能只 grep `src/App.tsx`**——页面之间会互相引用（如 `ClassComposition.tsx` 由 `AdminConsole.tsx` 以 tab 形式内嵌，不经过路由）。要删页面先全仓库 grep 组件名，否则会误删。
- 改导航/路由前先读 `src/App.tsx`（唯一路由表）；`src/pages/` 里可能留有没被任何路由引用的文件。
- 后端测试共 **61 个用例**，`pytest tests/ -q` 约 1 秒跑完，改完随手跑一次很划算。

## 部署

见 `DEPLOY.md`。要点：Docker Compose 双服务（`web` 用 nginx 托管 `dist` 并**同源代理 `/api` 到 backend**，因此不涉及 CORS）；`VITE_API_BASE_URL` 是**构建期烘焙**进前端的，改端口/域名/IP 必须 `docker compose up -d --build` 重建，否则前端连不上后端。首次启动由 `docker-entrypoint.sh` 跑幂等的 `python -m app.seed`。
