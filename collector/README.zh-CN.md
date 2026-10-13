# V4：每日公开用户痛点采集

独立 Worker seo-demand-collector 每天 UTC 02:20 运行，使用 HN Algolia 公开评论，不依赖 GitHub Secrets，也不调用付费 AI 或 SEO 接口。

## 已实现

- 12 个在线工具的研究主题：图片压缩、PDF 压缩、简历转换、Shopify 商品图、字幕、CSV 去重、网页截图、批量改名、GSC 导出、图片隐私转换、alt text、录音转文字。
- 每主题每次最多 80 条近期评论，只收录近 180 天、同时含对象/操作和明确求助/痛点表述的评论，每次最多 6 条。
- 把 HN 评论的原始 URL、摘录、发表时间、采集时间及来源查询记录到已有 D1 数据库。
- 同一关键词数据会去重更新，并保留之前人工决定、备注、目标网站、搜索量、SERP 与其他网站的证据。
- 监控研究主题不是已确认的 Google 搜索词；仍需查 Google Suggest、月搜索量和 SERP。不会自动列为可开发，也不会自动上线相似内容。
- 新增 collector_runs 表记录每次运行时间、错误数量和匹配数量。

## 诊断与后续

D1 控制台运行 SQL，检查最近执行记录：

    SELECT started_at,ended_at,status,total_topics,total_matches,errors_json
    FROM collector_runs ORDER BY started_at DESC LIMIT 10;

查看真实候选：

    SELECT keyword,evidence_count,stage,imported_at
    FROM opportunities ORDER BY imported_at DESC LIMIT 20;

Cloudflare cron 的更新可能需要至多 15 分钟传播，新部署后不能立即把没有记录解释为故障。

代码位置：collector/src/worker.js、collector/src/topics.js、collector/wrangler.toml。
若要更换监控主题，修改 topics.js 后发布 Worker。默认 HN 社区有明显的技术用户样本偏差，不能推断所有美国普通消费者的需求。
