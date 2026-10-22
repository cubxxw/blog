# Tana、Doneas、Ambi 双语发布收尾

三篇文章已于 `2026-10-23T02:26:13.131+08:00` 正式发布。PR [#471](https://github.com/cubxxw/blog/pull/471) 于 `2026-10-23T02:22:57+08:00` 合并。作者已明确允许先合并发布、在后台继续整站回归；发布与回归通过分别记录。

正文、完整英文、六张配图保持合并版本原样。文件校验值见 [定稿清单](2026-10-23-product-docs-release/final-content-before.sha256)。

## 正式链接与 brief

| 产品 | 正式中文 | 正式英文 | brief / pending 内容回执 |
| --- | --- | --- | --- |
| Tana | [中文](https://cubxxw.com/zh/ai-agent/posts/tana-from-notes-to-meeting-work/) | [English](https://cubxxw.com/ai-agent/posts/tana-from-notes-to-meeting-work/) | [brief](../../_briefs/2026-10-23-tana-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-tana-product-teardown.json) |
| Doneas | [中文](https://cubxxw.com/zh/ai-agent/posts/doneas-weekly-commitments/) | [English](https://cubxxw.com/ai-agent/posts/doneas-weekly-commitments/) | [brief](../../_briefs/2026-10-23-doneas-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-doneas-product-teardown.json) |
| Ambi | [中文](https://cubxxw.com/zh/ai-agent/posts/ambi-memory-to-work/) | [English](https://cubxxw.com/ai-agent/posts/ambi-memory-to-work/) | [brief](../../_briefs/2026-10-23-ambi-product-teardown.md) / [receipt](../content-receipts/pending/2026-10-23-ambi-product-teardown.json) |

## 生产部署

- 源版本：`db80e3fbfed57e9f75f15ab83ef8a192a0316059`。
- Netlify deployment：`6ada5484e1776686525b58a4`，`production`、`main`、`ready`。
- 发布时间来自 Netlify 当前 `published_deploy.published_at`，不是文章 front matter 日期或合并时间。
- [Netlify 实际读回](2026-10-23-product-docs-release/netlify-production.json) 同时绑定当前 published deployment 和完整 commit。
- 当前使用 Netlify 原生 Git 生产构建；公开 `__release.json` 返回 404。版本认定依据上面的平台 published deployment，未把 404 的 marker 或 HTTP 200 本身当作部署版本证明。

## 正式站浏览器验收

目标流程：进入每篇正式文章 → 确认全文、图片与参考资料 → 实际点击中英文切换 → 确认同篇对应语言；另以手机尺寸阅读三篇中文。

连接浏览器技能已读取并搜索相关工具，本轮没有可调用的 `js` / Browser / CUA 运行工具。任务未限定本地浏览器，使用当前云环境已安装的 Chromium 154.0.8037.57 与 Playwright，保持 TLS 校验和环境网络代理。此项是正式站实际浏览器验收，不替代仓库整站回归。

| 检查 | 结果与范围 |
| --- | --- |
| 桌面六页 | 1440×1000；6/6 HTTP 200，标题、HTML 语言与 canonical 对应 |
| 正文完整性 | 6/6 正文可见，所有 H2 与定稿顺序相同：Tana 各 11、Doneas 各 8、Ambi 各 9；参考资料存在 |
| 图片 | 每页封面及两张正文图片成功解码，alt 和图注存在；六张线上原图 MIME 为 image/png，SHA-256 与合并版本一致 |
| 语言切换 | 6/6 实际点击 `.lang-switch`，目标 URL、语言、标题与非空正文正确 |
| 手机中文 | 390×844；3/3 标题、正文、图注、图片与参考资料可读，无横向溢出、正文超宽或覆盖 |
| 运行健康 | 9 个页面状态均无框架错误层、控制台 error/warning、pageerror 或失败请求 |
| 截图复核 | 逐项目视检查六页桌面首屏与正文配图，以及三篇中文手机首屏、正文配图和参考资料 |

Hugo 响应式图片的 `_hu_<hash>` 文件名通过原始图片名称归一确认来源；原图另外按完整字节做 SHA-256 校验。未因为生成文件名不同而替换定稿图片。

[完整浏览器读回](2026-10-23-product-docs-release/browser-acceptance.json) · [截图及 SHA-256 清单](2026-10-23-product-docs-release/screenshots-manifest.json)。清单中的截图随此记录保存。

| 页面 | 首屏 | 正文图片 |
| --- | --- | --- |
| Tana 中文 | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-zh-mobile-image2.png) |
| Tana 英文 | [桌面](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/tana-from-notes-to-meeting-work-en-desktop-image2.png) |
| Doneas 中文 | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-zh-mobile-image2.png) |
| Doneas 英文 | [桌面](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/doneas-weekly-commitments-en-desktop-image2.png) |
| Ambi 中文 | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-desktop-top.png) / [手机](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-mobile-top.png) | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-desktop-image2.png) / [手机](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-zh-mobile-image2.png) |
| Ambi 英文 | [桌面](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-en-desktop-top.png) | [正文](2026-10-23-product-docs-release/screenshots/ambi-memory-to-work-en-desktop-image2.png) |

## 回归检查

最终依据是合并版本的主分支 [Blog Quality and Release / 39830855910](https://github.com/cubxxw/blog/actions/runs/39830855910)，当前仍在运行。PR 头版本的 [39824062985](https://github.com/cubxxw/blog/actions/runs/39824062985) 也仍在运行；它不能替代主分支结果。快照见 [main](2026-10-23-product-docs-release/main-quality.json) 与 [PR](2026-10-23-product-docs-release/pr-quality.json)。

Lighthouse [39830855352](https://github.com/cubxxw/blog/actions/runs/39830855352) 第 1 次在 `/projects/` 发生 DevTools `Network.getResponseBody` 的 `PROTOCOL_TIMEOUT`。失败发生在采集阶段，尚未完成整套测量。失败 [摘要](2026-10-23-product-docs-release/lighthouse-attempt1-excerpt.log) 及 [原 artifact 12449249813](https://github.com/cubxxw/blog/actions/runs/39830855352/artifacts/12449249813) 已保留，原 artifact digest 为 `sha256:8124aeee0c88e0558b8337b655deb140e27db32502e9cdeedf2ad6be098d6ae4`。

同版 `/projects/` 独立浏览器复核 HTTP 200、load 约 0.91 秒且无 pageerror；这只证明普通加载能完成，不证明 Lighthouse 的受限环境测量通过。保存首次失败证据后，仅重试失败 job；第 2 次仍在执行，未调整工作流、断言、阈值、范围或超时。当前 [重试快照](2026-10-23-product-docs-release/lighthouse-current.json)。

`published` 只表示文章正式发布与本批正式页验收；**整站回归尚无通过结论**。不因合并成功、Netlify ready 或定向浏览器通过而改写该状态。

## 内容回执与读者反馈

三张 brief 均回填 `published`、中英文正式链接、实际发布时间、部署版本与证据链接。三张博客侧内容回执放在 [pending](../content-receipts/pending/README.md)，`publication_status` 为 `published`，回执 `status` 与 `reader_feedback.status` 保持 `pending`，真实反馈列表为空。自动浏览器验收不作为读者反馈，也不证明文章所述产品的账户流程已经实测。

上游回执导入状态单独记录为 pending。本轮云环境未带入此前交接目录及上游工作树，尚未声称已写回 Brain。

## 保存与清理边界

本批仅修改三张 brief 和本收尾记录、pending 回执及验证证据。正文、英文翻译、配图、CI 规则保持不变。

交接目录及其中列明的临时工作区清单尚未取得，旧临时工作区未清理。当前工作区没有 Brain 检出，未接触既有合并冲突；其他任务和改动均未回退。核实清单、确认提交及证据已保存后，才处理明确列名的本批临时工作区。
