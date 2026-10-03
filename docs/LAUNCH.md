# V0.3 上线与需求验证

主站：https://shipping-cost-optimizer-xiaoqiu3000.onrender.com/

## 已实现，不等于已经获客
- 固定主站 canonical；`/packaging-optimizer/` 与首页内容相同，统一指向首页。
- `sitemap.xml` 只含 8 个规范网址；另一个 Render 副本站如果同样更新，会指向本主站，但没有删除或重定向副本站。
- 使用说明、计算示例、关于、隐私和公开 GitHub 反馈入口。
- Google / Bing 验证配置槽位为空，不声称已验证或已提交。
- 没有访问统计、行为埋点、广告、联盟或收款；release.json 的开关明确为 false。访问日志不等于独立访客或转化率。

## 下一项需要站主操作：Google Search Console 验证
1. 打开 https://search.google.com/search-console/welcome ，用站主自己的 Google 账号登录。
2. 选择 URL 前缀，不是需要修改 DNS 的域名方式。填主站完整 HTTPS 地址，包括尾部 `/`。
3. 展开 HTML 标记验证，获取 `<meta name="google-site-verification" content="...">`。
4. 把 content 值填入 site.config.json 的 googleSiteVerification，或设置构建环境变量 GOOGLE_SITE_VERIFICATION；重新构建发布。
5. 线上首页源代码确认标记存在后，在 Google 页面点击验证。
6. 验证后提交 `sitemap.xml`，用网址检查工具检查首页。保留标记，不要发布后删除。

验证标记是公开网页上的所有权证明，不是登录密码、API 密钥或验证码。不要传输 Google 密码、OAuth 凭证或登录验证码。
官方说明：https://support.google.com/webmasters/answer/9008080
站点地图：https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
Canonical：https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
提交只是发现提示，不保证收录、排名、流量或收入。

## 免费的第一轮验证（建议阈值，不是市场基准）
先找 10 位有真实打包/物流任务的卖家，在允许分享工具的渠道请他们试用，不群发或伪造推荐。
记录是否完成计算、有没有错误、是否理解取整、是否需要重复比较多箱数据；可以请用户自愿反馈，不要求提供订单和个人信息。
如果没有至少 2 人明确表示单箱工具解决问题，先修正需求/易用性，不做 50 个页面。
只有出现明确的多箱重复工作需求，才讨论批量 CSV 付费功能；反馈入口是需求调研，不是预售，不能据此宣称有人愿意付款。
48 小时验证的是使用反馈，不是 SEO 排名；没有足够目标用户访问时，不能把零成交当作市场已被证伪。

## 维护和核验
`npm test` 包含计算与 SEO 构建测试；`npm run build` 先生成工具页，再运行 seo.js。
Verify live website 工作流每日运行，并对指定源码更新触发：先检查新版本、canonical、sitemap，再运行桌面/窄屏 Chromium 计算验收。不是实时监控或真实 iPhone Safari 测试。
如果 Render 没有自动更新，在已存在的静态站点击 Manual Deploy → Deploy latest commit；不要再次创建 Blueprint。
没有自动修改账户权限、购买托管、删除重复站点或收款。
