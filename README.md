# Shipping Cost Optimizer

零后端、零运行时依赖的物流计算网站。源码包含首页和四个独立工具页，计算在浏览器完成，不调用 AI API，不上传输入数据。

## 功能

- Packaging Optimizer：比较两组包装尺寸；保留成本增加、实际重量占主导、取整后无改善等结果，不把负收益截断成零。
- DIM Weight：公制/英制，明确除数单位，可选尺寸向上取整。
- Chargeable Weight：实际重与体积重取较大值，可选 0.5 / 1 重量单位向上取整。
- CBM：相同纸箱数量必须为整数，支持厘米和英寸转换成立方米。
- 复制及下载计算报告；必填、有限数、正尺寸、非零除数、数量整数校验。
- 手机端布局；独立 title/description；拿到真实域名后可生成 canonical 和 sitemap。

## 本地测试和预览

需要 Node.js 22 或更新版本。不需要 npm install；没有第三方运行时或构建依赖。

```sh
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

浏览器打开 http://localhost:8000 。`dist` 是构建产物，不是源代码目录。

## 部署状态

`render.yaml` 是部署配置，不代表已经发布。只有托管平台部署成功且网址通过访问验证后，才能称为已上线。

## Render 静态部署

项目已提供 Blueprint：`runtime: static`，不是需要常驻服务器的 Web Service。也可在 Render 新建 Static Site，选择本仓库并填写：

| 设置 | 值 |
| --- | --- |
| Branch | main |
| Build Command | npm test && npm run build |
| Publish Directory | dist |

不要创建数据库、添加付费实例或购买域名来验证此 MVP。静态托管受平台带宽、构建分钟等配额限制；不要把免费额度解释成永久无限免费。账户注册、托管授权和任何费用确认由账户持有人完成。

获取真实 HTTPS 网址后设置 `SITE_URL` 为实际网址并重新部署，以生成准确的 sitemap 和 canonical。尚未向搜索引擎提交站点，也没有安装统计或接入支付/联盟。

## 公式与范围

`DIM = L × W × H / divisor`，除数单位必须匹配。`chargeable = max(actual, DIM)`，之后按用户选择的增量向上取整。默认不进行尺寸或重量取整；这是一种明确的估算选择，不声称等于任何承运商的默认账单规则。

更换公制/英制会重置为该单位的示例输入，并显示提示。不会把同一个数值悄悄重新标为另一单位。

包装比较假设实际重量不变。成本估算只是 `计费重量差 × 用户输入单价 × 每月票数`，不包含阶梯费率、最低收费、附加费、包装材料成本或税费；不检查产品是否放得下、抗摔保护、托盘/集装箱装载或 NMFC 货运等级。

## 隐私和经营边界

无第三方脚本、输入数据上传、Cookie 统计、广告、支付或联盟链接。托管服务可能产生正常访问日志。本版不能据此声称已经建立收入渠道。不得把报价估算包装为收益或承运商合规保证。

GitHub Pages 的使用限制不适合直接作为本项目未来的商业成交/SaaS 托管方案，所以本项目以独立静态托管配置为主，不依赖 Pages 管理权限。

## 官方参考（2026-10-03 核验）

- FedEx 区域规则示例（不是全球统一费率）：https://www.fedex.com/en-my/customer-support/faq/invoices-and-payments/fees-and-charges/calculate-dimensional-weight.html
- Render Static Sites：https://render.com/docs/static-sites
- Render Blueprint：https://render.com/docs/blueprint-spec
- GitHub Pages 使用限制：https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## 上线后的验证

先由真实目标用户检查输入、计算和包装比较是否有用。未获授权前，不自动发送推广消息、不接入第三方统计、不注册商户或购买服务。后续上线统计/联盟功能时需补充披露并核验地区和账户资格。
