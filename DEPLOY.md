# Docker 部署

前端（Vite React）+ 后端（FastAPI）通过 Docker Compose 部署。前端由 nginx 托管并同源代理 `/api` 到后端（无 CORS），SQLite 数据落在持久化卷。

## 前置
- Docker Engine 24+，含 `docker compose` 插件（`docker compose version` 可验证）。

## 首次部署
```bash
# 1. 配置密钥（勿提交到 git；.env 已被 .gitignore 忽略）
cp docker.env.example .env
vi .env                      # 填 JWT_SECRET（openssl rand -hex 32）、教师/管理员/学生密码

# 2. 构建镜像
scripts/docker-build.sh      # 等价 docker compose build

# 3. 启动
scripts/docker-up.sh         # 等价 docker compose up -d

# 4. 验证
curl http://localhost:8080/api/health        # {"status":"ok",...}
open http://localhost:8080                    # 用 .env 里的教师/管理员账号登录
```

首次启动时后端 `python -m app.seed` 自动幂等播种（已有数据则跳过），无需手动初始化。

## 常用运维
```bash
docker compose logs -f backend        # 后端日志
docker compose logs -f web            # 前端/nginx 日志
docker compose restart backend        # 重启后端（数据保留）
docker compose up -d --build          # 改代码后重建并启动
docker compose down                   # 停止（保留 db-data 卷与镜像）

# 备份 SQLite 卷
docker run --rm -v physics_lab_db-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/physics_lab_$(date +%F).tar.gz -C /data physics_lab.db
```

## 换主机 / 端口 / 域名
`VITE_API_BASE_URL` 在**构建期**烘焙进前端，且须与浏览器访问的源一致（同源代理）。
- 改宿主机端口：编辑 `.env` 的 `WEB_PORT` 与 `VITE_API_BASE_URL` 后 `docker compose up -d --build`。
- 换成域名：`.env` 里 `VITE_API_BASE_URL=https://your.domain`，并将 `web` 端口映射到 80/443（配 HTTPS 请在 nginx 前加反代或在此镜像中启用 TLS）。

## 改密钥 / 密码
`JWT_SECRET` 或各密码变更后需**重启后端**（`docker compose restart backend`）；改动 `JWT_SECRET` 会令旧 token 全部失效。

## 生产建议
- 用 `docker compose` 内嵌的 `restart: unless-stopped` 保证自愈；必要时改为 `docker compose up -d` 配合 systemd 托管。
- 数据库是 SQLite，单副本即可；高并发/多副本需换 PostgreSQL 并调整 `DATABASE_URL`。

## 常见问题
- **登录后接口 401 跳转登录页**：token 过期或 `JWT_SECRET` 变更，重新登录即可。
- **深层路由（如 `/theory/topics`）刷新白屏**：请确认 web 镜像以 `--base /` 构建（当前 `web.Dockerfile` 已默认），并按上述"换主机/端口"核对 `VITE_API_BASE_URL`。
- **离线/种子数据**：缺少 `VITE_API_BASE_URL` 时前端走 localStorage 离线演示；部署务必提供该值。
