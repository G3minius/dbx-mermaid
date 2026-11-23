# 容器与远程部署

插件本身是纯前端产物（`assets` + `ui`），没有 Sidecar。这里只记录把它装进 **Docker / Web 宿主** 时的部署要点与排障方式；桌面宿主不需要这些步骤。

## 参考 compose

官方镜像 `t8y2/dbx:latest` 的 `CMD` 是 `dbx-web`，`EXPOSE 4224`，内置 `DBX_STATIC_DIR=/app/static`、`DBX_DATA_DIR=/app/data`、`DBX_BACKUP_ROOT=/app/backups`。

```yaml
services:
  dbx:
    image: t8y2/dbx:latest            # 国内可用 docker.cnb.cool/dbxio.com/dbx:latest
    pull_policy: always
    ports:
      - "4224:4224"
    environment:
      DBX_PASSWORD: "<强密码>"        # 生产必填；否则 /api/* 的鉴权行为会随数据库状态变化
      DBX_PORT: "4224"               # 必须与 ports 的容器侧端口一致
      DBX_DATA_DIR: "/app/data"      # 插件包解包在 $DBX_DATA_DIR/plugins
      DBX_BACKUP_ROOT: "/app/backups"
      DBX_PUBLIC_BASE_PATH: "/"      # 子路径部署时改成 /dbx，并与反向代理前缀一致
      # DBX_SECRET_KEY_FILE: /run/secrets/dbx_secret_key
    volumes:
      - dbx-data:/app/data
      - dbx-backups:/app/backups
    # 官方镜像基于 debian:bookworm-slim，不含 curl/wget，故用 bash 的 /dev/tcp 做 TCP 就绪探测；
    # HTTP 层就绪再由下方的 /api/auth/check 轮询确认。
    healthcheck:
      test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/4224"]
      interval: 5s
      timeout: 3s
      retries: 20
      start_period: 15s
    stop_grace_period: 90s
    restart: unless-stopped

volumes:
  dbx-data:
  dbx-backups:
```

等价的 `docker run`：

```bash
docker run -d --pull=always --name dbx \
  -p 4224:4224 \
  -e DBX_PASSWORD='<强密码>' -e DBX_PORT=4224 \
  -e DBX_DATA_DIR=/app/data -e DBX_BACKUP_ROOT=/app/backups \
  -e DBX_PUBLIC_BASE_PATH=/ \
  -v dbx-data:/app/data -v dbx-backups:/app/backups \
  --stop-timeout 90 --restart unless-stopped \
  t8y2/dbx:latest
```

## 四条硬性约束

1. **必须持久化 `/app/data`**：插件解包目录是 `$DBX_DATA_DIR/plugins`。容器重建且卷丢失时，插件中心看起来还在装，但 `GET /api/plugins/<id>/ui` 与 `/ui/<path>` 会 404，表现为「工作台空白 / 渲染引擎加载失败」。
2. **必须等后端完全就绪再装插件**：`docker compose up -d` 后等 healthcheck 通过，再由插件中心安装 `.dbxp`。数据卷从旧版本升级时，若数据迁移未完成，`auth_middleware` 之后的 `migration_gate` 会让除 `auth/*`、`migration/*`、`ping` 外的所有 API 返回 `423 LOCKED / DATA_MIGRATION_REQUIRED`，其中就包括插件资源读取；此时安装或打开工作台必然失败。先在 Web 界面完成「数据安全升级」向导再继续。

   ```bash
   docker compose up -d
   until curl -fsS http://127.0.0.1:4224/api/auth/check >/dev/null; do sleep 1; done
   ```

3. **插件资源走带会话的 API，不是静态文件**：Web 宿主用 `GET /api/plugins/<id>/ui` 与 `/api/plugins/<id>/ui/<path>` 读入口与资源，再内联进 `srcdoc`。这些路由在 `auth_middleware` 之后，只有 `auth/login|setup|check|captcha` 免鉴权，其余一律需要 `dbx_session` Cookie；无会话时实测返回 `401`。反向代理必须透传 `Cookie`，不要改写 `Host`/`Origin`，不要吞掉 `/api/plugins/`，也不要额外注入与之冲突的 `Content-Security-Policy`。HTTPS 反向代理需设 `DBX_WEB_COOKIE_SECURE=1`，否则 `Secure` 标志缺失只是安全降级（不会导致 401）；真正易踩的是 Cookie 的 `Path` 等于 `DBX_PUBLIC_BASE_PATH`——`DBX_PUBLIC_BASE_PATH=/dbx` 时整个 app（含 `/api`）会被 nest 到该前缀，代理必须把同一前缀原样转给容器，否则浏览器不会带上 Cookie，插件资源全部 401。该变量也影响 DBX 自身前端的资源基址（源码构建对应 `VITE_DBX_BASE_PATH=/dbx/`），与本插件 `ui/` 产物无关。
4. **改包必须递增版本并重装**：宿主按 `<pluginId>:<version>` 缓存沙箱文档（LRU），监听 `dbx:plugins-changed` 才清空。沿用旧版本号时浏览器仍会用缓存里的旧 `index.html` 和旧 chunk 列表，替换 `.dbxp` 也不会生效。安装后请关闭旧工作台标签再重新打开。

## 验收

登录后带 Cookie 执行，或直接看浏览器 Network 面板：

```bash
# 入口：返回 { "dataBase64": "...", "contentType": "text/html" }，解码后应只有 1 个 JS + 1 个 CSS 引用
curl -fsS -b 'dbx_session=<从浏览器 DevTools 复制>' \
  http://127.0.0.1:4224/api/plugins/io.github.g3minius.dbx-mermaid/ui \
  | python3 -c 'import sys,json,base64;print(base64.b64decode(json.load(sys.stdin)["dataBase64"]).decode())'

# 单入口 JS：200；浏览器 Network 面板中不应再出现 mermaid.core-*.js 之类的 chunk 请求
curl -fsS -o /dev/null -w '%{http_code} %{size_download}\n' -b 'dbx_session=<...>' \
  http://127.0.0.1:4224/api/plugins/io.github.g3minius.dbx-mermaid/ui/assets/index-<hash>.js
```

检查包内是否残留动态 chunk：

```bash
unzip -l dist/io.github.g3minius.dbx-mermaid-<version>-universal.dbxp | grep 'ui/assets'
# 应只有 index-<hash>.js 与 style-<hash>.css 两个文件
```

容器内复验清单：

- [ ] 等待后端就绪后安装当前版本包，Network 面板中插件 UI 只有 1 个 JS + 1 个 CSS 请求，无 `mermaid.core-*.js` 等 chunk 请求。
- [ ] 默认 flowchart 正常渲染；主动点「重试」不再出现「渲染引擎加载失败」。
- [ ] `docker compose restart dbx` 后（卷保留）重新打开工作台仍可渲染。
