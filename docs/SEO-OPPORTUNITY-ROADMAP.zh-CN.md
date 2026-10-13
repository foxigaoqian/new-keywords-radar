# SEO Opportunity Radar V1 — 我们自己的需求雷达

原仓库的 X、GitHub、HF、Sitemap、GSC 信号是趋势线（Trend Lane）；本版本新增人群任务线（Persona / Task Lane）：人群 → 场景 → 动作 → 痛点和限制 → 候选搜索词 → 人工验证。两线并行，不破坏原定时采集。

## 使用

1. 不需要 API key 就可以跑本地机会队列：python -m radar opportunities --input opportunities.example.json --out opportunities.md
2. 可合并原雷达每天的 JSON：python -m radar opportunities --input opportunities.example.json --radar-json report.json --out opportunities.md
3. 输出同名 JSON，包含完整人群、动作、证据、SERP 记录和下一步建议。实例中关键词全部是演示假设，不是推荐词。

## 输入

- personas 下按 scenes / actions / keywords 描述目标人群、用户旅程、痛点、条件和候选搜索表达。
- reviews 单独记录：keyword, evidence（每条 type/url/note）, monthly_searches, monthly_searches_source, serp（reviewed_at、exact_tool_results、major_site_results）, estimated_build_days, monetization, existing_site。
- Trend Lane 从 report.json 的 leads 和 keywords.rows 导入；仅是发现信号，不能算搜索量或真实需求证据。
- 重复词按大小写和空白合并。泛需求关键词优先于原雷达误判的品牌类型。

## 阶段与评分

假设 hypothesis → 待补证据 needs-evidence → 待人工决策 manual-review。只有两个不同域名的证据 URL、带来源的搜索量、完整 SERP 检查、开发估时及变现模式都存在，才能进入待人工决策。

证据最多 30 分；带来源的搜索量最多 20；SERP 竞争最多 20；开发估时 10；变现模式 10；复用已有网站 10。分数只用于排序人工调研，绝非可排名概率；输入的证据链接和搜索指标只做格式检查，尚未独立核实。

## 后续的优先开发顺序

- P0：真实用户评论 / Reddit / HN / 产品评论数据源（许可范围内），储存原始 URL、发帖日期、文本、抓取时间。
- P0：AI 依据有出处的痛点拆解人群与动作；关键词必须保留源证据，不能凭模型猜测量化需求。
- P0：接 Google Suggest / GSC / DataForSEO / SERP；按 US 地区和时间记录快照，分析前十对搜索意图的匹配程度、工具站竞争度。
- P1：现有站点匹配（imagekb.net、soocly.com 等）和工具 MVP 技术难度、API 成本、付费意愿评估。
- P1：七天 / 十四天 / 三十天后复盘排名、曝光、付费结果，记录失败案例并优化阈值。
- P2：Cloudflare D1 + Worker 的管理看板，关键词去重聚类、筛选、项目决策记录。

**不做**：自动堆砌「动作×限制」生成虚假词量；将 0 搜索量等同于蓝海；未经 SERP 和需求验证就批量生成重复页面；自动部署产品；提交 API 或 Search Console 密钥。

## 验收

原来的 daily / sources 命令继续可用；新命令支持原数据并能生成 Markdown 与 JSON；无密钥可跑；测试覆盖去重、无搜索量、证据域名、CLI 和无效输入。
