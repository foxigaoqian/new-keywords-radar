# SEO Opportunity Workbench V3 — Cloudflare 私有机会工作台

V3 把趋势、新用户任务、真实问题引用、SEO 搜索量和 SERP 原始快照统一成手机/电脑可用的后台。

## 已完成

- dashboard/src/worker.js：Cloudflare Worker + D1，所有研究/导入/导出/决策 API 都需要 ADMIN_TOKEN Bearer 验证。
- dashboard/migrations/0001_init.sql：机会和决策审计表。重复导入时更新研究内容但保留人工决定、备注和目标站点。
- dashboard/public：完整的搜索、筛选、详情、证据 URL、SERP 前十、编辑人工决定、JSON 备份/导入界面。
- radar/intent.py：提供保守的相似意图建议，不自动合并或建 SEO 页面，不合并不同尺寸和品牌。
- radar/screening.py：生成待调查项、证据缺失提示，不虚构关键词搜索量/排名概率。
- scripts/sync_workbench.py：Python 机会报告通过 Bearer token 分批安全上传至 Worker。
- GitHub Actions research.yml：RESEARCH_ENABLED 开启且生成真实 AI 任务报告、工作台凭据已设置时自动同步；不执行付费 SERP。

## 本地安装

在仓库根目录执行以下命令：

    cd dashboard
    npm install
    npx wrangler d1 create seo-opportunity-radar

将生成的 database_id 填写到 dashboard/wrangler.toml 中替换 REPLACE_WITH_D1_DATABASE_ID。

    npm run db:local
    npm run dev

本地同样必须为 Worker 提供 ADMIN_TOKEN。推荐在 dashboard/.dev.vars 中放一条 ADMIN_TOKEN=长随机密钥，文件已在 .gitignore 排除，不能提交到 GitHub。

## 正式部署

    cd dashboard
    npm run db:remote
    npx wrangler secret put ADMIN_TOKEN
    npm run deploy

可在本地用 openssl rand -hex 32 生成长随机密钥。密钥不得写入前端代码、公开仓库或日志。建议同时通过 Cloudflare Access 限制可见人群。

默认 workers_dev=false，需要你在 Cloudflare 绑定受控域名路由，或在安全策略就绪时将其改为 true 以开通 workers.dev 地址。仅进行部署，不等于有可访问的公开域名。

## 生成和上传

在根目录：

    python -m radar opportunities --input opportunities.example.json --out opportunities.md

输出 opportunities.md 和 opportunities.json。示例仅是待验证的假设，不能作为真实蓝海词使用。在工作台中点击“导入机会 JSON”即可上传。

也可从命令行自动同步：

    export WORKBENCH_URL=https://YOUR_PRIVATE_WORKBENCH_HOST
    export WORKBENCH_ADMIN_TOKEN=YOUR_PRIVATE_SECRET
    python scripts/sync_workbench.py --input opportunities.json

## GitHub Actions（只有显式启用才执行）

变量：RESEARCH_ENABLED=true，WORKBENCH_URL=https://YOUR_PRIVATE_HOST
Secrets：WORKBENCH_ADMIN_TOKEN（与 Worker 密钥相同）；可选 AISA_API_KEY（AI 会产生费用）。

工作流未生成真实用户旅程时会跳过自动同步，不导入演示数据。DataForSEO 不会被工作流自动调用。

## 隐私和安全

- API 无 ADMIN_TOKEN / DB 时返回 503，密钥错误时 401。
- 静态 UI 本身可能公开，但所有机会数据 API 和导入/导出/决策都需要密钥；若要连 UI 都不可访问，请配置 Cloudflare Access。
- 客户端密钥只存在当前网页内存，不保存在 localStorage、Cookie，也不转发第三方。
- 外部讨论文本仅用 textContent 安全渲染；链接仅允许 http(s)。
- 决策保存到独立审计表 decision_events，暂时未提供历史查询界面。
- 导出的机会文件可能包含公开讨论摘录或人工备注，注意文件分享权限。
- Google Ads 竞争指数不是自然搜索 KD；AI 人群场景词不是验证过的搜索需求。

## 测试

    python -m pytest -q tests
    node --test dashboard/tests/*.test.mjs
    node --check dashboard/public/app.js
    node --check dashboard/src/worker.js

CI 会使用 Python 3.10 / 3.12 和 Node 22 测试。Cloudflare 上的真实部署和数据库迁移，需要在实际账户单独验收。

## 后续

补充有授权的 Reddit / 产品评论源；基于 SERP 的搜索意图实际对比；GSC 效果回流、日后收益复盘和人群/关键词语义聚类。
