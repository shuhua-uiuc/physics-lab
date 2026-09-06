# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

物理实验室（Physics Mission Control）——面向高中物理教学的**游戏化沉浸式学习平台**。三种角色：**学生**（`/dashboard`，布局 `MissionShell`）、**教师**（`/teacher/overview`，布局 `AppShell` 含 5 个侧边栏项）、**管理员**（`/admin`）。深度设计细节在 `docs/DESIGN.md`（权威文档；当代码与文档不一致时以代码为准并同步更新它）。

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

默认账号：教师 `teacher`/`teacher123`，管理员 `admin`，学生默认 `student123`。可通过 `backend/.env`（`TEACHER_PASSWORD`/`ADMIN_PASSWORD`/`STUDENT_DEFAULT_PASSWORD`）或 `backend/app/config.py` 中的环境变量覆盖。

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
- 挑战大厅路由是 `/theory/challenges`（带 `s`），旧拼写 `/theory/challenge` 已废弃。
- 部分页面已不再挂载（`src/pages/Home.tsx`、`TheoryTopics.tsx`、`CoinRank.tsx`、`Showcase.tsx`、`GroupCenter.tsx`、`ProjectKanban.tsx`、`RecruitMarket.tsx`，以及 `AppShell`/`Sidebar`/`Topbar`）。改导航前先查 `src/App.tsx` 确认真正挂载的路由。
