# Leafhour 产品目录更新

日期：2026-10-16，上海时间。开发基线为 `11a27dc6`。本记录描述本地验收；远端 CI 和生产部署须在推送后分别确认。

## 产品表达与来源

Leafhour 是有 AI 陪伴的私人阅读书房，主句为“留一点时间，读进一本书。” / “Stay with a book.”。介绍聚焦接续阅读、原文与译文对照、自己的旁注及按需阅读对话。阅读时长不能证明理解，AI 译文与解释需要核对原文。应用目前主要为中文，Google 新品牌审核仍待通过。

核对来源：

- [中文官网](https://leafhour.com/)与[英文官网](https://leafhour.com/en)：本轮实际浏览，分别采集真实首屏截图；两图均为 1280×720，分别为 114,884 和 118,327 bytes。
- [品牌上线与验收记录](https://github.com/getyak/leafhour/blob/main/docs/verification/2026-10-16-leafhour-launch.md)：区分已上线功能、登录验收与待完成的 Google 品牌审核。
- [公开源码](https://github.com/getyak/leafhour)：技术栈和实现范围。
- [公开试读](https://leafhour.com/read?book=gutenberg-alice)：使用官网实际链接，不要求博客读者提供私人书房数据。

## 接入范围

通过 `data/products.yml` 接入现有中英文首页、个人介绍页、CUBXXW OS 产品窗口及 Product Lab，无新增共享渲染代码。英文入口使用 `/en` 与英文官网截图；中文沿用官网根路径及中文截图。

中文产品关联已有的 [AI 英语学习文章](https://cubxxw.com/zh/growth/posts/ai-english-learning/)。该文暂未有英文版本，英文目录通过现有 `site.GetPage` 过滤后为空，没有生成失效链接。

## 本地验证

- `npm run frontmatter:check`：通过。
- `npm run tags:check`：通过，0 文件需要更新。
- `node --check scripts/check-product-integration.mjs` 与 `git diff --check`：通过。
- 使用 Netlify dev 与 Hugo 0.145.0 extended 渲染；对新构建目录运行 `npm run products:check`：通过。覆盖中英文首页、about、projects，实际图片文件、对应语言的官网入口与审核边界。
- 六条页面路由均返回 HTTP 200。实际浏览器打开中英文 `projects/#leafhour`，确认产品名、正文、截图、官网、试读、源码及边界。中文显示关联文章，英文不生成缺失翻译的文章链接。
- 实际点击 OS 菜单进入 Product Lab，再返回 CUBXXW OS：双向切换有效，默认入口仍为 OS。
- 独立只读 sub-agent review 复核最终源文件、生成目录与截图，无未解决的 P0/P1/P2。

本次为产品资料与既有卡片接入，未修改布局、样式或运行时；未新增手机或深色模式专项测试，未运行本地全站 E2E。全站检查交由本次提交的 CI。未使用模型调用、登录私人书房或修改产品自身的数据。

本地产品窗口截图：[中文 Leafhour 产品窗口](assets/leafhour-2026-10-16/zh-product.jpg)。
