# 广告收入模式：V0.3.1 申请准备版

决策日期：2026-10-04。四个计算器和普通文本报告免费；商业目标改为展示广告，不开发会员/报告付费墙，不以联盟佣金为本阶段目标。

## 当前真实状态

已实现：免费工具说明、广告计划与当前隐私状态说明、配置校验、AdSense 所有权验证 meta / ads.txt 生成器、位于工具操作区之外的两个未来广告插入点。页面不展示假广告、占位大白框或诱导点击文案。

未实现/未启用：真实广告投放代码、广告账户注册、网站审核、付款账户、CMP 隐私同意接入、广告请求与收益报表。本版本不是一个已经产生收入的系统。Search Console 验证不等于 AdSense 审核通过。

默认 ads.config.json 的 mode 为 off，publisherId 为空。monetization.js 在 build.js 和 seo.js 后运行，不依赖第三方包。

## 下一步：使用站主自己的 AdSense 账户

1. 站主在 https://adsense.google.com/start/ 注册或登录，按真实收款国家/地区和身份填写信息；已有账户不要重复注册。中国列在官方可申请地区中。不能借用、伪造身份或收款地址。
2. 在 Sites 添加 shipping-cost-optimizer-xiaoqiu3000.onrender.com。Google 的规则允许公共后缀平台下的子域名；2026-10-04 检索到的官方 PSL 包含 onrender.com。这支持先尝试现有地址，不保证表单接受或网站批准；遇到拒绝应记录原文再处理，不要注册父域名 onrender.com。
3. 获取本人的公开 ca-pub- 加 16 位数字的发布商标识。它不是之前的 google-site-verification 标记。不要提供登录密码、登录验证码、OAuth token 或银行卡资料。
4. 收到真实标识后，将配置的 publisherId 填入，并将 mode 改为 verification。生成的 google-adsense-account meta 与 Search Console 标记并存；ads.txt 只含本人对应的 pub- 授权行。
5. npm test && npm run build，发布到现有 Render 静态站，实际核对首页 meta 和 /ads.txt，再由站主在 AdSense 选择 meta 或 ads.txt 验证并请求审核。这里不需要先运行广告 JavaScript。

verification 仅为申请验证，不加载广告、不追踪访问者、不代表审核已通过。live 配置会拒绝构建，不能靠填一个 ID 或布尔开关绕过后续接入。

## 审核后启用真实广告：单独实施与验收

- 先确认 AdSense 的网站状态为 Ready。Google 要求原创、有价值、可浏览的内容；测试通过、上线或达到某个页面数都不是审核保证。
- 接入 Google Privacy & messaging 或合适的 Google-certified CMP，按访问地区和实际投放配置处理同意/撤回，测试拒绝和接受两种路径。不要把非个性化广告当作无须处理隐私和 Cookie 的承诺。
- 当前 Render CSP 很严格，connect-src 'none' 会阻止广告相关请求；只有在审核具体 Google 代码及 CMP 后才更新必要来源。禁止直接删除安全策略或放开全部来源来追求能显示。
- 初版建议手动展示位，不启用盖住页面的广告；工具页在说明内容后、指南页在正文末尾各保留一个候选位置。最终尺寸/密度需按真实页面预览决定，不是 Google 固定数量规则。
- 不在输入框、计算、复制、下载按钮旁放伪装广告；不要求用户点击/看广告才能取得结果。广告标明 Advertisement，隐私、反馈和错误页不投广告。
- 不点击自己的广告、不买机器人流量、不请亲友帮点、不做自动刷新。现有浏览器巡检在广告上线前须添加请求拦截，阻止测试环境请求广告域名；不得用浏览器自动化刷真实广告展示。
- 测试脚本、隐私说明、release.json 标记和广告投放状态同时升级，不能继续声称没有第三方脚本。记录账户审核、页面投放及实际到账为三个不同里程碑。
- 站主按 AdSense 提示完成身份/地址/付款及适用税务信息。中国付款方式在官方表中包含 wire 和 Hyperwallet，具体以本人账户和银行支持情况为准。

## 收益判断

广告审核通过也不保证流量和收入。先记录真实自然访客、可变现页面浏览量、AdSense 估算收益和实际支付。不要把测试访问算作获客，不虚构 RPM、收入或审核时间。无需为了凑页数批量生成空洞教程。

## 官方依据（2026-10-04 查阅）

- 申请条件：https://support.google.com/adsense/answer/9724
- 可申请地区：https://support.google.com/adsense/answer/13402307
- 可添加的网址类型：https://support.google.com/adsense/answer/12170421
- 公共后缀名单：https://publicsuffix.org/list/public_suffix_list.dat
- meta 与 ads.txt 所有权验证：https://support.google.com/adsense/answer/7584263
- 网站检查与审核：https://support.google.com/adsense/answer/12169212
- 隐私说明：https://support.google.com/adsense/answer/1348695
- 无效展示、点击和广告位置：https://support.google.com/adsense/answer/48182
- 付款方式：https://support.google.com/adsense/answer/1714397

原 docs/LAUNCH.md 记录 V0.3 的历史计划；商业模式以本文件为准。原 Google 验证标记、规范网址及站点地图保持有效，不需要换站或重建服务。
