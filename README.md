<div align="center">
  <img src="./public/logo.svg" alt="Lagoon" width="96" height="96" />
  <h1>Lagoon</h1>
  <p>一个容器跑起来的个人主页、作品集与博客。</p>
  <p>
    <code>ghcr.io/sakuralaaa/blog:latest</code> ·
    <a href="https://blog.digitalloves.com/">在线示例</a> ·
    <a href="https://github.com/Sakuralaaa/Atoll">Atoll</a> 一键应用模板
  </p>
</div>

> Lagoon（潟湖）是环礁围起来的那片平静水面，和 [Atoll](https://github.com/Sakuralaaa/Atoll) 正好一对：Atoll 管部署，Lagoon 放你的作品和文字。

我想要一个地方，能同时放做过的东西和写下的文字，又不想维护好几套系统，于是有了 Lagoon。它是一个 Next.js 应用，数据都在一个 SQLite 文件里，打成一个 Docker 镜像，拉下来就能跑，备份就是拷一个数据卷。

## 有什么

**作品集**
- 首页「作品与文章」是一排铺满全宽、缓慢循环滚动的竖版卡片，作品和文章按时间混排，悬停暂停，也能手动滑。
- 作品详情页：封面、角色、时间、标签、可放大的截图画廊、一篇 Markdown 介绍、访问链接、上一个 / 下一个。
- 作品可以自定义路径，比如 `/projects/portfolio`。

**文章**
- Markdown / MDX、代码高亮、数学公式、Mermaid 图表、自动目录。
- 文章系列（同名系列自动串起来，带序号和上下篇）、加密文章、分类与标签、归档、全文搜索、阅读量。

**评论**
- 游客或登录评论、审核、邮件与 Gotify 通知、回复提醒与退订链接。

**界面**
- 四套风格：纸面、极简、杂志、柔和。后台设默认，访客可在导航栏自己切换。
- 深色模式、自定义背景图与遮罩。

**后台**
- 文章、作品、分类、标签、评论、用户、文件、导入导出、接口密钥、站点设置、个人资料。
- 所有图片栏（Logo、Favicon、头像、背景、作品封面、截图、文章封面）都能直接上传：点按钮选图、拖到输入框上，或者 Ctrl+V 粘贴截图。
- 编辑器是所见即所得的 Markdown，支持粘贴截图和拖拽上传。

**给 AI 用**
- 内置 MCP 端点 `POST /api/mcp`，Claude Code、Codex 这类工具拿后台生成的 API Key 就能写文章、传图、管理作品。
- 另有 `/api/plugin/*` REST 接口，给脚本和插件用。

**升级省心**
- 每次启动自动迁移数据库。
- 还在用旧版默认文案的设置项会换成新默认值，你自己改过的内容不动。

技术栈：Next.js 16（App Router）+ React 19、Prisma + SQLite、NextAuth 5、next-intl。

## 快速开始（Docker）

**1. 建目录**

```bash
mkdir -p ~/blog && cd ~/blog
```

**2. 写 `docker-compose.yml`**

最小可用配置如下。完整的可选项见下面的「环境变量」。

```yaml
services:
  app:
    image: ghcr.io/sakuralaaa/blog:latest
    container_name: blog
    ports:
      - "127.0.0.1:6066:3000"
    environment:
      DATABASE_URL: "file:/data/db.sqlite"
      # 改成你的公网地址，否则登录会报 UntrustedHost
      NEXTAUTH_URL: "https://blog.example.com"
      # 只信任由反向代理覆盖的请求头
      TRUSTED_PROXY_HEADER: "x-real-ip"
      NEXT_CACHE_DIR: "/data/.next-cache"
      MEDIA_ROOT: "/data/uploads"
    volumes:
      - blog_data:/data
    logging:
      driver: "local"
      options:
        max-size: "10m"
        max-file: "5"
    restart: unless-stopped

volumes:
  blog_data:
```

**3. 启动**

```bash
docker compose pull && docker compose up -d
```

**4. 登录后台**

打开 `https://你的域名/admin`。初始管理员邮箱是 `admin@example.com`，密码在首次启动时随机生成，保存在数据卷的 `/data/initial-admin.txt`：

```bash
docker compose exec app cat /data/initial-admin.txt
```

也可以用 `ADMIN_INIT_PASSWORD` 预先指定一个 12–72 字节的初始密码。登录后记得改邮箱和密码。

**5. 更新**

```bash
cd ~/blog && docker compose pull && docker compose up -d
```

想在本地自己编译镜像：

```bash
docker compose -f docker-compose.build.yml up -d --build
```

用 [Atoll](https://github.com/Sakuralaaa/Atoll) 部署的话，可以直接用它的一键应用模板，之后在面板里更新。

## 反向代理（Nginx）

`NEXTAUTH_URL` 设为公网地址，`TRUSTED_PROXY_HEADER` 设为 `x-real-ip`，应用端口只绑 `127.0.0.1`。

```nginx
location / {
    proxy_pass http://127.0.0.1:6066;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_read_timeout 130s;
    client_max_body_size 51m;
}
```

<details>
<summary>可选：给图片加防盗链</summary>

```nginx
location ^~ /api/files/ {
    valid_referers none blocked server_names *.your-domain.com your-domain.com;

    if ($invalid_referer) {
        return 403;
    }

    proxy_pass http://127.0.0.1:6066;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

</details>

## 让 AI 帮你写：MCP 与接口密钥

**生成密钥**：后台「接口密钥」里新建，按需勾选权限（文章、分类、标签、作品的读写，上传图片），可设过期时间。明文只显示一次。

**接入 Claude Code**：

```bash
claude mcp add --transport http lagoon https://你的域名/api/mcp \
  --header "Authorization: Bearer <API Key>"
```

Codex 等其他支持 HTTP MCP 的工具同理，地址填 `https://你的域名/api/mcp`，请求头带上 `Authorization: Bearer <API Key>`。

**权限分两级**：
- 普通密钥：按勾选的权限管理文章、作品、分类、标签和图片。MCP 的每个工具都转到对应的 `/api/plugin/*` 接口，权限校验和限流照常生效。
- 勾选「完全管理」（ADMIN_FULL）后等同管理员：额外开放 `get_settings` / `update_settings`（站点设置与个人资料）、评论审核、用户、文件、统计，以及通用的 `admin_request`（任意 `/api/admin/*`）。
- 无论哪一级，密钥管理和登录账号相关接口都不对密钥开放。

<details>
<summary>REST 接口示例（/api/plugin/posts）</summary>

密钥放在 `x-api-key` 或 `Authorization: Bearer` 里，二选一。

```bash
# 列表
curl "https://你的域名/api/plugin/posts?page=1&limit=10" \
  -H "x-api-key: eak_your_key"

# 创建
curl -X POST "https://你的域名/api/plugin/posts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: eak_your_key" \
  -d '{
    "title": "来自脚本的文章",
    "content": "# Hello\n发布成功",
    "status": "PUBLISHED",
    "locale": "zh"
  }'

# 更新
curl -X PATCH "https://你的域名/api/plugin/posts/:id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eak_your_key" \
  -d '{ "title": "新标题", "status": "DRAFT" }'

# 删除
curl -X DELETE "https://你的域名/api/plugin/posts/:id" \
  -H "x-api-key: eak_your_key"
```

返回码：没带密钥或密钥无效 / 禁用 / 过期为 `401`，权限不足 `403`，请求过快 `429`。响应头带 `X-RateLimit-*` 和 `Retry-After`。

</details>

## 环境变量

Docker 部署写在 compose 的 `environment` 里；本地开发复制 `.env.example` 为 `.env`。

<details>
<summary>完整列表</summary>

```env
# 数据库
DATABASE_URL="file:/data/db.sqlite"
# 可选：AI 向量索引单独用一个 SQLite 文件（生产推荐）
# AI_VECTOR_DATABASE_URL="file:/data/ai-index.sqlite"
# 可选：向量库日志模式，默认 DELETE
# SQLITE_JOURNAL_MODE="DELETE"

# 认证
NEXTAUTH_URL="https://blog.example.com"
NEXTAUTH_SECRET=""            # 不填则自动生成并保存在数据卷
TRUSTED_PROXY_HEADER="x-real-ip"
INIT_ADMIN_TOKEN=""           # 可选：启用一次性 /api/init，至少 32 字节，只通过请求头 x-init-token 传入
ADMIN_INIT_PASSWORD=""        # 可选：初始管理员密码

# 第三方登录（可选）
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# 媒体
MEDIA_ROOT="/data/uploads"
MEDIA_MAX_UPLOAD_MB="10"
MEDIA_MAX_INPUT_PIXELS="12000000"
MEDIA_RESOLVE_CACHE_TTL_MS="30000"
NEXT_CACHE_DIR="/data/.next-cache"

# 邮件通知（可选）
SMTP_HOST=""
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER=""
SMTP_PASS=""
EMAIL_TO=""                   # 多个用逗号分隔；留空则发给所有管理员
EMAIL_REPLY_DENYLIST=""       # 回复通知拒收名单
EMAIL_UNSUBSCRIBE_SECRET=""   # 退订链接签名，不填回退到 NEXTAUTH_SECRET
EMAIL_REPLY_UNSUBSCRIBE_EXPIRE_DAYS="365"

# Gotify 推送（可选）
GOTIFY_URL=""
GOTIFY_TOKEN=""

# 前台
NEXT_PUBLIC_APP_URL="https://blog.example.com"
NEXT_PUBLIC_DEFAULT_LOCALE="zh"
# LOG_LEVEL="info"            # fatal/error/warn/info/debug/trace/silent

# 安全策略
# 后台「自定义 Head 注入」里加了外部脚本，要把脚本域名放行，否则会被 CSP 拦截
# HEAD_INJECT_SCRIPT_ORIGINS="https://stats.example.com,https://www.googletagmanager.com"
# 保持默认即可：Next.js 页面依赖内联脚本，设为 false 会导致页面无法运行
# CSP_ALLOW_UNSAFE_INLINE_SCRIPT="false"
```

</details>

**第三方登录回调**
- GitHub：`{站点地址}/api/auth/callback/github`
- Google：`{站点地址}/api/auth/callback/google`
- `NEXTAUTH_URL` 要和 OAuth 平台里填的站点地址完全一致（协议、域名、端口）。

**邮件通知**
- 后台打开「邮件通知」后生效，发件地址固定用 `SMTP_USER`，后台的发件人名称只作显示名。
- 收件人优先读 `EMAIL_TO`，没配就发给管理员邮箱。
- 可开启「回复评论邮件通知」，被回复的人会收到提醒，邮件里带退订链接。

## 图片与文件

- 支持 `jpg / jpeg / png / webp / avif` 图片，以及 PDF / ZIP 附件。单文件默认上限 10MB（`MEDIA_MAX_UPLOAD_MB`），上传时按「平衡」策略压缩。
- 访问路径是 `GET /api/files/:id`。游客只能读公开文件；加密文章里的图片和附件需要解锁凭证，草稿和没被引用的私有文件只有管理员能读。
- 「文件管理」页可以预览、复制地址、删除。删除前会检查引用（文章、作品封面与截图、头像、站点设置）。

## 本地开发

```bash
pnpm install   # 装完会自动准备数据库
pnpm dev       # http://localhost:6066
```

安装依赖和启动开发服务器前，会自动执行 `prisma generate`、`prisma migrate deploy` 和 `db seed`。想跳过：

```bash
SKIP_DB_PREPARE=1 pnpm dev   # 跳过整个数据库准备
SKIP_DB_SEED=1 pnpm dev      # 只跳过种子数据
```

种子数据只写系统设置的默认值（幂等），不创建账号；管理员由启动脚本单独初始化，本地密码在 `.local/initial-admin.txt`。需要示例文章可以跑 `tsx prisma/seed-posts.ts`。反向代理之外的本地调试可临时设 `AUTH_TRUST_HOST=1`。

常用脚本：

```bash
pnpm build                                        # 构建
node --env-file=.env .next/standalone/server.js   # 启动生产包
pnpm lint                                         # 代码检查
pnpm db:prepare                                   # 手动准备数据库
pnpm db:seed                                      # 只跑种子数据
```

## 目录结构

```
docker/            容器入口脚本
messages/          界面文案（i18n）
prisma/            数据库 schema、迁移与种子
public/            静态资源
scripts/           数据库准备与升级脚本
src/
├── app/
│   ├── (public)/  前台：首页、文章、作品、归档、分类、标签、关于
│   ├── admin/     管理后台
│   ├── api/       API 路由（含 /api/mcp、/api/plugin）
│   ├── actions/   Server Actions
│   └── auth/      登录页
├── components/    组件
├── hooks/         自定义 Hooks
├── i18n/          国际化
├── lib/           工具与业务逻辑
└── types/         类型定义
```

## 升级与备份

所有数据都在 `/data` 数据卷里：数据库、上传的文件、自动生成的 `NEXTAUTH_SECRET`。升级前备份这个卷就够了。启动时会自动迁移数据库；要回退，旧镜像和升级前的数据卷一起恢复。

## 许可

MIT，见 [LICENSE](./LICENSE)。
