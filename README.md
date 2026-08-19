# pi-model-web

pi 的 `model-web` 插件重构版：服务端用 Koa 分层重构，前端用 React 重写（构建为单文件 HTML 后由扩展返回给浏览器）。

## 目录结构

```
pi-model-web/
├── extension/                        ← pi 扩展本体（服务端，Koa，jiti 运行时加载，无需构建）
│   ├── package.json                  ← 依赖：koa（无 pi.extensions 字段时加载器回退到 index.ts）
│   ├── index.ts                      ← 扩展入口：注册 /model-web 命令、启停服务、打开浏览器
│   ├── server.ts                     ← Koa 应用组装（中间件顺序：错误兜底→安全头→鉴权→body解析→路由）
│   ├── config-store.ts               ← models.json 存储层：JSONC 读取、原子写、串行更新队列
│   ├── types.ts                      ← 服务端公共类型
│   ├── lib/
│   │   ├── errors.ts                 ← HttpError（携带状态码）
│   │   ├── jsonc.ts                  ← 剥离 JSON 注释（状态机）
│   │   ├── api-types.ts              ← api 字段白名单校验
│   │   ├── validate.ts               ← 字段校验 + JSON 解析 + body 读写辅助
│   │   └── views.ts                  ← 脱敏视图（apiKey/headers 值永不下发）
│   ├── middleware/
│   │   ├── auth.ts                   ← token 鉴权（请求头或 URL query）
│   │   ├── body-parser.ts            ← POST 体解析（256KB 上限）
│   │   ├── error-handler.ts          ← 统一错误处理（HttpError→状态码 JSON）
│   │   └── security-headers.ts       ← no-store / nosniff
│   ├── services/
│   │   ├── provider.ts               ← saveProvider / deleteProvider
│   │   └── model.ts                  ← saveModel / deleteModel / buildModel
│   ├── routes/
│   │   ├── index.ts                  ← 路由表（method+path 精确匹配）+ 分发
│   │   ├── context.ts                ← RouteDeps + refreshAfterChange
│   │   ├── page.ts                   ← GET / 返回 dist/index.html（带 CSP）
│   │   ├── config.ts                 ← GET /api/config
│   │   ├── provider.ts               ← POST /api/provider、/api/provider/delete
│   │   └── model.ts                  ← POST /api/model、/api/model/delete
│   └── dist/index.html               ← 前端构建产物（web build 时自动拷贝）
├── web/                              ← React 前端（Vite + antd + singlefile）
│   └── src/
│       ├── main.tsx                  ← 入口：ConfigProvider 注入苹果风主题 + 中文 locale
│       ├── theme.ts                  ← antd 主题 token（对齐 ardot 设计稿：#007AFF/#F5F5F7 等）
│       ├── App.tsx                   ← 页面组装：Header + 统计卡 + 两栏列表 + 双抽屉
│       ├── styles.css                ← 页面布局与设计稿特有元素（毛玻璃/卡片/响应式）
│       ├── components/               ← HeaderBar/StatsCards/ProviderColumn/ModelColumn/ProviderDrawer/ModelDrawer
│       └── api/                      ← 接口层：每个接口一个文件夹（按 URL 路径组织），自带 types.ts
└── scripts/
    ├── install.sh                    ← 备份原插件 + 软链 extension/ 到 pi
    └── smoke-server.ts               ← 服务端冒烟测试（只读探针，不改配置）
```

### 分层调用关系

```
index.ts（扩展入口）
  └── server.ts（Koa 组装）
        ├── middleware: errorHandler → securityHeaders → auth → bodyParser
        └── routes/index.ts（路由表分发）
              ├── routes/page.ts          → dist/index.html
              ├── routes/config.ts        → config-store + lib/views（脱敏）
              ├── routes/provider.ts      → services/provider → config-store（串行写）
              └── routes/model.ts         → services/model    → config-store（串行写）
写操作成功后 → routes/context.ts 的 refreshAfterChange → pi.modelRegistry.refresh()
```

## 开发

```bash
# 前端
cd web && pnpm install
pnpm dev        # Vite dev server 开发 UI
pnpm build      # tsc 检查 + 构建单文件 HTML，自动拷贝到 ../extension/dist/

# 服务端冒烟测试（验证 Koa 服务：鉴权/页面/配置接口/404/校验，不写配置）
pnpm smoke

# 安装依赖（首次或依赖变更后）
cd extension && pnpm install
```

## 安装到 pi

```bash
./scripts/install.sh
```

脚本会：
1. 把原始的 `~/.pi/agent/extensions/model-web.ts` 备份到 `~/.pi/model-web-backups/`
2. 将 `extension/` 目录软链为 `~/.pi/agent/extensions/model-web`（入口 `index.ts`）

之后重启 pi 会话，执行 `/model-web` 即可看到新页面。

> 服务端 TS 由 pi 内置的 jiti 运行时加载，改服务端代码后重启 pi 会话即可；
> 前端产物是每次请求时按需读取的，`pnpm build` 后刷新浏览器即可，无需重启 pi。
> 如果软链方式未被 pi 正确加载，可改为拷贝：`cp -R extension ~/.pi/agent/extensions/model-web`

## 注意事项

- token 鉴权：pi 启动时生成一次性 token 随 URL 下发；首次访问换成 HttpOnly + SameSite=Strict 的会话 Cookie 后，前端会把 URL 里的 token 参数抹掉，后续请求自动带 Cookie（`web/src/api/request.ts` 兼容处理）
- 更新语义：可选字段留空 = 保留原值，显式删除必须传 `clearXxx: true`（见各接口文件夹的 `types.ts`）
- 构建产物为多文件（index.html + assets/），扩展通过 `/assets/*` 静态路由托管（带 hash 长缓存）；配合 React.lazy 抽屉/弹窗按需加载
- 接口契约与字段清单详见工作区的《pi-model-web-页面功能详细文档.md》
