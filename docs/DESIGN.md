# 物理实验室（Physics Mission Control）设计文档

> 本文档是项目的**唯一权威设计文档**，供后续 Agent / 开发者快速理解全貌并继续开发。
> 最后更新：2026-09-10。如代码与本文档冲突，以代码为准并请同步更新本文档。

---

## 1. 项目概述

**定位**：面向高中/特色班物理教学的**游戏化沉浸式学习平台**。学生以"科研小组"为单位，在"物理任务指挥中心（Mission Control）"氛围中完成学习、实验、挑战、协作；教师/管理员在控制台进行分组、题库、项目、安全认证与班级管理。

**设计基调**：Apple + Notion + Duolingo + NASA Mission Control 融合风格。
**严禁**：传统 ERP / OA / Admin Dashboard 风格（密集表格、堆叠菜单、灰色后台）。

**三类角色**：

| 角色 | role 值 | 入口 | 核心功能 |
|---|---|---|---|
| 学生 | `student` | `/dashboard` | 学习路径、答题挑战、项目实验、招募市场、组间转账、成就 |
| 教师 | `teacher` | `/teacher/overview` | 总览数据台、分组管理、学生名册、题库审核、安全题库维护 |
| 管理员 | `admin` | `/admin` | 班级/教师/学生账户管理 |

**硬规则**：每班最多 30 名学生；学生不能自行建组（教师建组或直接分配）；小组名/班级名可由教师修改。

---

## 2. 技术栈

### 前端（`/`，Vite 工程）
- React 18 + TypeScript 5.8（严格模式）
- Vite 6 + `vite-tsconfig-paths`（路径别名 `@/` → `src/`）
- 状态管理：Zustand 5
- 路由：react-router-dom 7
- 样式：TailwindCSS 3.4 + PostCSS（自定义设计 token 见 §10）
- 动效：framer-motion 11
- 图表：recharts 2（已拆入 vendor chunk）
- Markdown：react-markdown 9（内容渲染必须包 `.prose-safety`）
- 图标：lucide-react

### 后端（`/backend`，FastAPI 工程）
- FastAPI + Uvicorn（Python 3.13，依赖装在 `backend/.venv`）
- SQLAlchemy ORM + SQLite（`backend/physics_lab.db`）
- 鉴权：python-jose（JWT，HS256，有效期 12h）+ bcrypt 密码哈希
- 配置：pydantic-settings（`backend/.env` 或环境变量覆盖）
- 测试：pytest（`backend/tests/`，61 个用例，4 个文件）

---

## 3. 目录结构

```
Physics_lab/
├── src/
│   ├── App.tsx                  # 路由表 + 角色守卫 + 全局 Toast 桥
│   ├── main.tsx                 # 入口（bootstrapFromApi() 恢复状态）
│   ├── index.css                # Tailwind + 设计 token + 动画/玻璃卡片等组件类
│   ├── data/
│   │   └── mockData.ts          # 全部 TS 领域类型 + LS_KEYS + 离线种子数据
│   ├── store/                   # Zustand stores（见 §7）
│   │   ├── authStore.ts         # 登录态/token/当前用户
│   │   ├── groupStore.ts        # 班级/小组/用户/排名（核心数据源）
│   │   ├── projectStore.ts      # 项目/招募/展示墙
│   │   ├── coinStore.ts         # 能量币流水/转账/结算动作
│   │   ├── theoryStore.ts       # 知识主题/题目/测验/挑战
│   │   ├── safetyStore.ts       # 安全认证题库（localStorage，内置 35 题）
│   │   ├── questionBankStore.ts # 题库审核（学生提交 + 教师上传，localStorage）
│   │   └── uiStore.ts           # toast 通知等 UI 状态
│   ├── lib/
│   │   ├── apiClient.ts         # fetch 封装：自动附 Bearer token、401 处理
│   │   ├── apiService.ts        # 业务 API 集合（classesApi/groupsApi/projectsApi…）
│   │   ├── bootstrap.ts         # 启动/刷新时并发拉取后端数据填充各 store
│   │   ├── reviveDates.ts       # JSON 日期字符串 → Date 对象（按字段名递归）
│   │   ├── syncQueue.ts         # 离线写操作队列（乐观更新 + 后台同步）
│   │   └── utils.ts             # cn() 等工具
│   ├── components/
│   │   ├── layout/MissionShell.tsx  # 全局唯一布局（学生/教师/管理员共用；含侧边栏+顶栏+通知铃铛）
│   │   ├── ui/                  # Checkbox/CoinBadge/Dialog/ProgressRing/StatCard…
│   │   └── project/             # KanbanColumn/Timeline 等项目页组件
│   └── pages/                   # 见 §6 页面清单
├── backend/
│   ├── .venv/                   # Python 虚拟环境（必须用它跑后端/测试）
│   ├── app/
│   │   ├── main.py              # FastAPI 应用、CORS、启动时种子数据
│   │   ├── config.py            # Settings（jwt_secret、默认密码、cors_origins…）
│   │   ├── database.py          # SQLAlchemy engine/SessionLocal/Base
│   │   ├── deps.py              # get_db / get_current_user / 角色依赖
│   │   ├── models.py            # 13 张表的 ORM 模型
│   │   ├── schemas.py           # Pydantic 请求/响应模型（camelCase 序列化）
│   │   └── routers/             # auth/admin/groups/theory/projects/coins（6 个）
│   ├── tests/                   # pytest（test_auth/test_groups/test_coins/test_projects）
│   ├── requirements.txt / requirements-dev.txt
│   └── physics_lab.db           # SQLite 数据文件
├── docs/DESIGN.md               # 本文档
└── package.json / vite.config.ts / tailwind.config.js
```

---

## 4. 快速开始

```bash
# 前端
npm install
npm run dev        # http://localhost:5173
npm run check      # tsc 类型检查（提交前必跑）
npm run build      # 生产构建（已配置 vendor 分包）

# 后端（必须使用项目自带 venv）
cd backend
.venv/bin/uvicorn app.main:app --port 8000          # 启动
.venv/bin/python -m pytest tests/ -q                # 跑测试

# 联调
# 前端配置 VITE_API_BASE_URL=http://localhost:8000 后进入在线模式；
# 未配置时自动降级为离线模式（localStorage 种子数据，见 §8）。
```

**默认账号**（生产环境请改密）：登录名 教师 `teacher`、管理员 `admin`、学生 `u-01` 起。
密码按加载来源决定：本地跑读 `backend/.env`，Docker 部署读仓库根 `.env`，都没有则回退 `backend/app/config.py` 默认值（`TEACHER_PASSWORD` / `ADMIN_PASSWORD` / `STUDENT_DEFAULT_PASSWORD`）。改密后重启后端生效。

---

## 5. 系统架构与数据流

```
┌─────────────────────────── 浏览器 ───────────────────────────┐
│  页面组件 (pages/*)                                            │
│      │  读状态（useStore selector） / 调 action                │
│      ▼                                                         │
│  Zustand Stores（单一数据源）                                   │
│   groupStore / projectStore / coinStore / theoryStore / …     │
│      │ 在线模式写操作：先乐观更新 UI + localStorage 持久化       │
│      │            再经 syncQueue 后台同步（失败可重试）          │
│      ▼                                                         │
│  lib/apiService（业务 API） → apiClient（fetch + Bearer）      │
│      │ bootstrap.ts：登录/刷新时并发拉取全量数据 → reviveDates  │
│      ▼  填回各 store（coinTxs 归一化为时间正序）                 │
└──────┼────────────────────────────────────────────────────────┘
       │ HTTP / JSON（camelCase）
┌──────▼──────────────────── 后端 ──────────────────────────────┐
│  FastAPI routers → deps（JWT 鉴权/角色校验） → Pydantic schemas │
│       → SQLAlchemy models → SQLite                             │
│  能量币结算只允许后端业务端点完成（防双花/重复记账）              │
└───────────────────────────────────────────────────────────────┘
```

**关键数据流约定**：
1. **JWT**：登录成功后 token 存 localStorage；`apiClient` 每次请求附 `Authorization: Bearer <token>`；401 时清登录态并跳转登录页。
2. **状态恢复**：仅 `initAuth()` 不够；页面刷新/再次进入时必须调用 `bootstrapFromApi()`（教师总览等用 `bootstrapFromApi(true)` 强制拉最新）拉取后端数据填充 `groupStore` 等，否则分组/学生数据为空。
3. **乐观更新**：写操作先改 store（UI 即时响应）+ 写 localStorage，再异步同步后端；同步任务进 `syncQueue`。
4. **金币结算归属后端**：项目完成、挑战结算、招募结算、转账均由后端业务端点记账，前端不直接拼装金币流水。
5. **日期反序列化**：后端返回 ISO 字符串，前端统一经 `reviveDates(txs, ['createdAt'])` 按字段名转 `Date`。
6. **流水顺序**：后端交易记录最新在前，bootstrap 时归一化为**时间正序**；展示"最近 N 条"时先 reverse 再 slice。

---

## 6. 路由与页面清单（src/App.tsx）

学生端（默认登录后进入）：

| 路径 | 页面文件 | 说明 |
|---|---|---|
| `/dashboard` | Dashboard.tsx | 主控台（教师/管理员访问自动重定向到各自入口） |
| `/theory/topics` | LearningHub.tsx | 知识星系/学习路径（阶段进度按 completedTasks 动态计算） |
| `/theory/quiz/:sessionId` | QuizPage.tsx（`mode="quiz"`） | 章节测验 |
| `/theory/challenge` | KnowledgeGalaxy.tsx | 知识星系挑战入口 |
| `/theory/challenge/:id/accept` | QuizPage.tsx（`mode="challenge"`） | 接受挑战 |
| `/theory/challenges` | TheoryChallenge.tsx | 挑战大厅 + "我的题目"（学生提交题 + 查看审核反馈） |
| `/projects` | ProjectCenter.tsx | 项目中心（看板） |
| `/projects/:id/safety` | SafetyExam.tsx | 项目安全考核入口 |
| `/safety-lab` | SafetyLab.tsx | 安全实验室 |
| `/safety-exam/:category` | SafetyExam.tsx | 安全认证考试 |
| `/projects/:id/recruit/:rid` | ResearchMarketplace.tsx | 招募投标详情 |
| `/recruit/market` | ResearchMarketplace.tsx | 招募市场 |
| `/coins` | ResearchLeague.tsx | 能量币/排行榜与流水 |
| `/showcase` | AchievementHall.tsx | 成就殿堂（分类 tab 动态过滤） |
| `/communicator` | GroupCommunicator.tsx | 小组通讯（挑战系统、专家招募、能量币转账） |
| `/profile` | ResearchProfile.tsx | 个人资料 |
| `/login` | Login.tsx | 登录/注册 |

重定向路由：`/` → `/dashboard`；`/theory/topics/:id` → `/theory/topics`；`/projects/:id` → `/projects`；`/group` → `/communicator`；未匹配 → NotFound。

> `/theory/challenge`（无 `s`）与 `/theory/challenges`（带 `s`）是**两个不同页面**，都在使用，不是新旧拼写关系。

教师端（`MissionShell`，侧边栏 6 项）：

| 路径 | 页面文件 | 说明 |
|---|---|---|
| `/teacher/overview` | TeacherOverview.tsx | 指挥总控台（见 §6.1） |
| `/teacher/groups` | TeacherGroups.tsx | 分组管理（按班级分区，组内按能量币降序；建组/分配/改名） |
| `/teacher/projects` | TeacherProjects.tsx | 项目管理（审批/冻结/编辑项目） |
| `/teacher/roster` | StudentRoster.tsx | 学生名册（按班级分区展示、按班级批量选择） |
| `/teacher/question-bank` | TeacherQuestionBank.tsx | 题库审核中心（学生提交审核 + 教师上传/导入/导出） |
| `/teacher/safety` | TeacherSafety.tsx | 安全题库维护（增删改、JSON 批量导入/导出、恢复内置 35 题） |

管理员端：`/admin` → AdminConsole.tsx（班级、教师账户、学生账户管理；`ClassComposition.tsx` 由它以 tab 形式内嵌，不单独占路由）。

### 6.1 教师总览页数据来源（TeacherOverview.tsx，已全部真实化）

| 区块 | 数据源 | 备注 |
|---|---|---|
| 6 个统计卡片 | groupStore.users/groups、projectStore.projects | 全部可点击：人数→`/teacher/roster`，小组→`/teacher/groups`，项目类→`/projects` |
| 小组能量币对比柱状图 | groups + users | 仅含有组员（≥1）的小组，按 totalCoins 降序；tooltip 含组员数 |
| 项目状态分布饼图 | projects | 6 状态计数，只显示 >0 的状态；空态提示 |
| Top 20 能量币流水 | coinStore.coinTxs | 最近 20 条，时间智能格式化（今天/昨天/MM-DD） |
| 冻结项目预警 | projects(status=frozen) | 显示项目名+所属组；空态绿色提示；提醒按钮有 toast |
| 待审核题库 | questionBankStore.questions | 仅 pending（学生提交）；通过即 approve；详情弹窗可跳审核中心做驳回/修改 |
| 招募异常超时 | projectStore.recruitments | status=open 且 deadline 已过；逾期天数实时计算 |

---

## 7. 前端状态管理（Zustand Stores）

| Store | 持久化 | 核心状态 | 核心 actions |
|---|---|---|---|
| authStore | localStorage | token、role、currentUserId | login/register/logout、initAuth |
| groupStore | localStorage + 后端 | classes、groups、users、rankings | joinGroup、updateGroupCoins、建组/分配/改名（经 API） |
| projectStore | localStorage + 后端 | projects、recruitments、showcaseItems | createProject、**updateProject（PUT /api/projects/{id}）**、updateStatus、markProjectDone、createRecruitment、bidRecruitment、resolveRecruitment |
| coinStore | localStorage + 后端 | coinTxs | addTx、transferCoins、settleChallenge/Recruit/Project（调后端端点） |
| theoryStore | localStorage + 后端 | topics、questions、quizSessions、challenges | 测验/挑战作答与提交 |
| safetyStore | localStorage 键 `plab_safety_questions` | 安全题库 | 增删改、导入/导出/重置（**尚未接后端**） |
| questionBankStore | localStorage 键 `plab_review_questions` | ReviewableQuestion[] | submitQuestion（学生→pending）、uploadQuestion（教师→approved）、approveQuestion、rejectQuestion（须填理由）、editQuestion（标记 edited）、setFeedback、deleteQuestion、importTeacherQuestions |
| uiStore | 不持久化 | toasts | pushToast/removeToast（5 秒自动消失，铃铛显示未读数） |

**Store 编码约定**：
- 写 action 命名用动词（`updateProject`、`approveQuestion`）；只读派生数据放组件内 `useMemo`，不进 store。
- 每个 action 内部：先算 next state → `persist()` 写 localStorage → `set()` → `syncToApi()` 后台同步。
- 组件订阅 store 用 selector：`const projects = useProjectStore((s) => s.projects);`

### 核心 TS 类型（src/data/mockData.ts）

- `ProjectStatus = 'planning' | 'progress' | 'review' | 'done' | 'failed' | 'frozen'`
- `SafetyCategory = 'electric' | 'thermal' | 'optical' | 'mechanical' | 'radiation' | 'chemical' | 'combined'`
- `CoinSource = 'challenge' | 'project' | 'recruit' | 'teacher_set' | 'penalty' | 'transfer'`
- `ReviewStatus = 'pending' | 'approved' | 'rejected'`
- `Project`：id/title/topic/techPoints/difficulties/equipmentList(EquipmentItem[])/safetyCategory/status/ownerGroupId/rewardCoins/depositCoins/startDate/dueDate/progress{total,done}/results/photos
- `CoinTransaction`：id/groupId/userId?/source/refId/delta/balanceAfter/createdAt(Date)/note
- `Recruitment`：id/projectId/title/description/skills/reward/deadline/status('open'|'assigned'|'done'|'failed')/bids/assigneeUserId?/result?/actualPay?
- `ReviewableQuestion extends Question`：submittedBy(string|null，null=教师上传)、submittedByName、submittedAt(ISO)、reviewStatus、teacherFeedback?、edited?

---

## 8. API 层设计

### 8.1 apiClient（src/lib/apiClient.ts）
- 导出 `api.get/post/put/patch/delete`；baseURL 取 `VITE_API_BASE_URL`。
- 未配置 baseURL → **离线模式**：直接抛错或走本地种子数据（stores 以 localStorage 为源）。
- 请求自动附 `Authorization: Bearer <token>`；401 → 清 authStore 并跳 `/login`。

### 8.2 apiService 业务集合（src/lib/apiService.ts）
`classesApi、teachersApi、groupsApi、adminGroupsApi、usersApi、theoryApi、projectsApi、recruitmentsApi、showcaseApi、coinsApi`。
命名即资源；返回值均为 Promise<camelCase 模型>。

### 8.3 后端端点全表（前缀 `/api`）

**鉴权**：`POST /auth/login`、`POST /auth/register`、`GET /auth/me`

**班级/用户/教师（管理）**：
- `GET/POST /classes`、`PATCH/DELETE /classes/{id}`、`GET /classes/{id}/students`、`POST /classes/{id}/students/batch`
- `GET /users`、`GET /users/{id}`、`PUT /users/{id}/group`、`PUT /users/{id}/avatar`、`DELETE /students/{id}`
- `GET/POST /teachers`、`DELETE /teachers/{id}`、`PATCH /teachers/{id}/password`

**小组**：
- `GET/POST /groups`、`PATCH/DELETE /groups/{id}`、`PATCH /groups/{id}/class`
- `POST /groups/{id}/join`、`PUT /groups/{id}/leader/{user_id}`
- `PATCH /groups/{id}/coins`（教师调币）、`PUT /groups/{id}/contribution`（贡献分配）

**项目/招募**：
- `GET/POST /projects`、`GET /projects/{id}`、**`PUT /projects/{id}`（项目信息更新：techPoints/difficulties/标题/课题/器材/成果/照片/rewardCoins；教师可改任意项目，学生仅本组；改器材自动重判 safetyCategory）**
- `PUT /projects/{id}/status`、`PUT /projects/{id}/progress`
- `POST /projects/{id}/done`（结题结算金币）、`POST /projects/{id}/safety-pass`
- `GET/POST /recruitments`、`POST /recruitments/{id}/bid`、`PUT /recruitments/{id}/assign`、`PUT /recruitments/{id}/resolve`

**金币**：
- `GET /coin-transactions`（最新在前）、`POST /coins/transfer`（组间转账，原子记账，收支共享 refId）
- `GET /rankings`、`GET /class-meta`

**理论/挑战/展示**：
- `GET /topics`、`GET /questions`、`POST /quiz/start`、`POST /quiz/{id}/answer`、`POST /quiz/{id}/grade`
- `GET/POST /challenges`、`GET /challenges/{id}/questions`、`POST /challenges/{id}/submit`
- `GET/POST /showcase`、`POST /showcase/{id}/love`

**其他**：`GET /health`

### 8.4 后端分层
- `deps.py`：`get_db`（请求级 Session）、`get_current_user`（解 JWT）、角色依赖（teacher/admin）。
- `schemas.py`：Pydantic 模型，配置 `alias_generator`/`populate_by_name` 实现 camelCase 出入参。
- `models.py`：13 张表 —— classes、groups、users、coin_transactions、topics、questions、quiz_sessions、challenges、projects、recruitments、showcase_items、class_meta、safety_records。
- `main.py`：CORS（默认允许 5173/5174）、启动时建表并灌入种子数据（教师/管理员账户、班级、示例小组与题目）。

---

## 9. 后端测试

```bash
cd backend && .venv/bin/python -m pytest tests/ -q     # 61 个用例，约 1 秒
```
- `tests/test_auth.py`：注册/登录/鉴权
- `tests/test_groups.py`：建组/加入/改名/分配
- `tests/test_coins.py`：转账原子性、流水、余额
- `tests/test_projects.py`：创建、`PUT` 更新（部分字段保留、器材改类、跨组 403、教师可改、404/401）

**注意**：系统 Python 环境缺少 jose 等依赖，必须使用 `backend/.venv/bin/python`。

---

## 10. 设计系统（视觉规范）

### 色彩 token（tailwind.config.js + index.css）

| 名称 | 主色 | 语义 |
|---|---|---|
| mission（蓝） | `#4F7CFF` | 主色/任务/导航 |
| energy（橙） | `#FF8A34` | 能量/活力/警示渐变端 |
| growth（绿） | `#22C55E` | 成功/成长/完成 |
| nova（紫） | `#8B5CF6` | 挑战/新意 |
| alert（琥珀） | `#F59E0B` | 警告/超时 |
| danger（红） | `#F04438` | 危险/扣罚/冻结 |
| ink（灰蓝） | `#1E293B` 系 | 文本 |

文字颜色必须用语义变量（`text-mission-700`、`text-growth-700`、`text-danger-700` 等），**禁止**自造未定义变量名（如 physics/lab/risk）。

### 字体
HarmonyOS Sans、Inter、PingFang SC（font-family 栈见 index.css）。

### 核心组件类（index.css）
- 卡片：`glass-card`、`glass-card-hover`、`planet-card`、`shield-card`
- 徽章：`chip-mission`、`chip-nova`、`chip-growth`、`chip-energy`、`chip-alert`、`chip-danger`、`chip-pill`、`mission-label`
- 按钮：`btn-mission`、`btn-growth`、`btn-energy`、`btn-ghost`、`btn-ghost-mission`
- 名次：`podium-gold/silver/bronze`、`node-badge`
- Markdown：`.prose-safety`（正文 `#1E293B`、标题 `#0F172A`、链接 `#4F7CFF`）
- 动画：`animate-orbit`、`animate-pulseRing`、`animate-floatY`、`animate-shimmer`、`animate-countUp`、`animate-flowDash`、`orbit-ring`

### 布局硬约束
- 12 栅格（`grid grid-cols-12`），页面最大宽度 1440px
- 所有按钮/卡片等可交互元素**必须**显式绑定 `onClick`（无功能时给 toast 反馈或跳转）
- 数字滚动用 `NumTicker`/`ticker` 类；列表空态必须有明确提示，不留空白

---

## 11. 开发约定与禁忌（Checklist）

开发新功能前逐条核对：

1. 禁止硬编码业务数据：小组名、能量币、项目状态、流水、题目一律来自 store/后端。
2. 任务完成状态完全由 `completedTasks` 驱动；勾选/取消同时联动总进度与阶段进度条；阶段文案/图标按真实完成度（✅已完成 / 🛰️进行中）。
3. 学习路径进度按用户行为动态计算，不写死。
4. 成就殿堂分类 tab 切换必须动态过滤内容。
5. toast：5 秒自动收起，铃铛显示未读数；**按角色区分内容**（教师看项目进度/安全认证提醒；学生看挑战邀请/能量币通知）。
6. 通知中心订阅 uiStore 渲染业务 toast（转账成功、挑战发起、投标等）。
7. 组间通讯必须包含：挑战系统、专家招募、能量币转账。
8. 前端数据：配置了 `VITE_API_BASE_URL` 走后端；否则 localStorage 离线模式。写操作用乐观更新 + syncQueue。
9. 金币结算只走后端业务端点，禁止前端重复记账。
10. 项目技术点/难点等编辑走 `PUT /api/projects/{id}`（已实现）；题库类（safetyStore、questionBankStore）目前 localStorage 持久化。
11. 后端时间字段返回 ISO；前端过 `reviveDates`。
12. 后端中间件用原生 Koa？——本项目后端是 **FastAPI**（旧有 koa-connect 教训：不要引入 ctx 泄漏的包装层）。
13. 集成后端采用**增量接入**：先保留 store 接口与 UI，内部加同步，避免大面积改 store 签名导致页面崩溃。
14. 提交前跑 `npm run check`（前端）与 `pytest`（后端）。

---

## 12. 待办与扩展点（Backlog）

| 项 | 现状 | 下一步 |
|---|---|---|
| 安全题库多端共享 | 题库仍在 `safetyStore`（localStorage）；但考试记录 `safety_records` 已接后端（`POST/GET /api/safety/records`，见 SafetyLab/ResearchProfile/Dashboard） | 建后端题库表 + CRUD 端点（参考 questionBank 流程） |
| 题库审核多端共享 | questionBankStore 仅 localStorage + 种子数据 | 后端建 review_questions 表；学生提交→教师审核全链路持久化 |
| 题目示意图 | 学生/教师提交题无 image 字段 | ReviewableQuestion 增加可选 imageUrl |
| 冻结项目原因/冻结天数 | 后端 Project 无 freezeReason/frozenAt | 加字段与教师冻结操作端点 |
| 超时招募自动结算 | 前端仅预警展示 | 加定时/管理员触发的自动 resolve 逻辑 |
| 导出 CSV | 能量币趋势/招募状态/班级规模已实现（`downloadCSV`）；流水导出仍是 toast 占位（TeacherOverview.tsx:620） | 补齐流水 CSV 导出 |
| 小组头像/学生头像 | 仅本地 avatar 字段 | 头像上传后端存储 |

---

## 13. 常见坑（经验教训）

1. **刷新后数据消失**：只调 `initAuth()` 不会恢复分组/学生数据，必须 `bootstrapFromApi()`。
2. **教师端看不到管理入口**：教师与学生共用 `MissionShell`，但侧边栏项按角色不同（教师 6 项）；新教师页面务必同时加入侧边栏。
3. **流水顺序错**：coinTxs 必须时间正序存储，取最近记录用 reverse+slice。
4. **教师看到学生通知**：toast 必须按角色生成，禁止写死一套消息。
5. **未定义色名**导致文字不可读：只用 tailwind.config 中定义的语义色。
6. **进度/状态写死**导致 UI 联动断裂：一切进度由 completedTasks/projects 状态实时计算。
7. **后端测试缺依赖**：务必用 `backend/.venv/bin/python`。
8. **重启后端**会使旧 token 失效（jwt_secret 变更时）；改 schemas/models 后需重启 uvicorn（未开 --reload）。
9. **两个 challenge 路由别混淆**：`/theory/challenge`（无 s）渲染 `KnowledgeGalaxy`；`/theory/challenges`（带 s）渲染 `TheoryChallenge`（挑战大厅）。两者都在使用。改路由前读 `src/App.tsx`。
10. **判断页面是否被使用别只看 `src/App.tsx`**：页面之间会互相引用（`ClassComposition.tsx` 由 `AdminConsole.tsx` 内嵌为 tab，不占路由）。删页面前全仓库 grep 组件名。
11. **图片资源**：需要生成图片时使用内置 text_to_image API URL，不用占位图。
