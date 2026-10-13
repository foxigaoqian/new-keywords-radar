# V5 — 多来源需求发现 + 真实关键词候选

## 两类信号分别保存

A. 真实用户问题线索（免费，定时）

- Hacker News：保留带具体动作与痛点的公众评论。
- Stack Exchange：调用官方 /2.3/search/advanced，发现公开问答中的具体操作困难；只保留标题摘要、原始链接、日期和来源标记，并在网页中注明来自 Stack Exchange 的 CC BY-SA 许可归属。保留 API backoff 限流，最多七个查询主题。
- HN 与 Stack Exchange 都不能证明某个候选词有 Google 搜索量，也不是“容易排名”的证据；来自技术论坛的人群有样本偏差。
- Reddit 商业自动采集默认不启用。2026 年官方条款要求商业用途在获得 Reddit 许可后开展。不要通过未授权代理规避规则。

B. 真实 Google 搜索表达（可选、按调用收费）

DataForSEO Labs Google Keyword Suggestions 官方接口。默认 US 2840 / English，输入种子词并得到最多 30 条真实数据库建议。保留种子词、来源、搜索量、CPC、第三方 KD（如果存在）和数据查询日。
Google Ads 竞争指数不等于自然排名 KD，DataForSEO 的 KD 也不是能进前三名的保证。

在仓库根目录运行：

    python -m radar opportunities --input opportunities.example.json --out opportunities.md
    python -m radar ideas --input opportunities.json --limit-seeds 2 --results-per-seed 20 --paid --out research.ideas.json
    python -m radar opportunities --input opportunities.example.json --research-json research.ideas.json --out opportunities.md

命令只有明确加 --paid 且设置 DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD 时才调用收费接口。最大一批 3 个种子，每词最多 30 条；关闭附加点击流数据以避免额外费用，报表展示供应商返回的实际成本（若接口提供）。

离线演示：
    echo '{"keywords":["avatar image format converter"]}' > /tmp/ideas-input.json
    python -m radar ideas --input /tmp/ideas-input.json --fixture tests/fixtures/dataforseo_keyword_ideas.json --out research.ideas.json

## Cloudflare 线上采集

- 独立的 seo-demand-collector Worker 每日 UTC 02:20 运行，按照 12 个 HN 任务与 7 个 Stack Exchange 任务研究公开用户问题。
- 两类记录都进入原 D1 opportunities 表，保留原有的人工处理状态、搜索量、SERP 快照和用户备注。
- 新迁移 collector/migrations/0002_source_counts.sql 增加 source_counts_json 统计源数；必须在正式代码部署前应用。
- 登录后在工作台点击“立即采集”，后台通过私有 Service Binding 触发；匿名无法请求采集器。
- 工作台显示分别来自 HN 和 Stack Exchange 的新增证据数量。
- 无搜索量的候选只进入“待补证据”，不自动新建站点或 SEO 页面。

## 测试及局限

pytest + Node tests 覆盖 API 输入、时间限制、分页上限、来源链接验证、backoff、无搜索量、数据合并。
真实 SEO 机会仍需核验美国 Google SERP 前十、建站成本、商业模式；社区帖子不是销售订单。
