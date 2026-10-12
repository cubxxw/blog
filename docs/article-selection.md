# 正文选区、分享与阅读讨论

默认文章详情页使用浏览器原生文字选择。普通点击段落保持安静；拖选松手、双击选词或键盘选文稳定后，出现「分享 / AI 分析 / 评论 / 更多」，中英文分别本地化。

## 设计依据

Notion 与 Medium 官方文档都提供选中文字后评论的入口，Notion 还提供评论侧栏；本次评论布局以作者给出的 Medium 截图为直接参考。[Notion comments](https://www.notion.com/help/comments-mentions-and-reminders)、[Medium highlights](https://help.medium.com/hc/en-us/articles/214406358-About-highlights)

分享采用博客原有暖纸、衬线正文、留白与克制的主题色。微信读书是作者指定的书页审美参考，不把未验证的 App 行为当作事实。X 入口打开附有原文链接的分享草稿，发布由读者完成。[X sharing](https://help.x.com/en/using-x/share-a-post)

## 选区与反馈

- 工具条、独立“更多”菜单与段落轮廓均挂在 body 下固定定位，正文宽度、间距和滚动高度不因选择改变。
- 轮廓圆角 16px，向外留 8px / 6px 呼吸空间。明亮主题为 4.5% 描边、0.6% 底色和 14px 短线；暗色主题为 7% / 1%，保留很淡的反馈。
- 工具条锚定真实 Range。桌面优先在选文上方 10px，顶栏或视口遮挡时落在完整选区下方；两侧均不足时暂时隐藏。滚动离开视口淡出，返回后重新锚定。
- pointer 按下期间隐藏动作，不拦截文字、链接或行内代码的原生行为。键盘与跨段选择可用；选区端点越出正文、落在不支持的结构时拒绝操作，保留原生选择。
- 触屏稳定 350ms 后显示，优先在选区下方留出 56px。网页不能读取系统菜单矩形；这是避让策略，真实 iOS / Android 菜单仍需真机验收。320px 与 390px 浏览器布局纳入自动测试。

## 统一分享编辑器

摘录、整篇文章及 AI 阅读札记复用 ShareConversation。摘录默认书页式卡片，包含完整原文、作者、标题、原文二维码；整篇卡片以标题和摘要为主。书页、石墨、晨雾、墨白四种纸面样式均可预览。手机先呈现卡片，样式与分享操作跟随其后。

保存 PNG、复制引用、复制图片、系统分享、原文链接及 X 草稿按照能力开放。只绘制一个当前预览；字体与 PNG Blob 完成后启用导出，重绘和退场旧回调不能覆盖新卡。二维码本地生成，使用 canonical 原文链接与段落 anchor，避免将本地预览地址写进卡片。

摘录上限为 2400 字符、80 行显式文本，超限不分配画布，仍保留完整文字复制。原文 Markdown 符号按字面保留；AI 札记单独排版并标明节选。剪贴板失败在当前弹窗提供手动复制；系统分享取消保持安静。Escape、焦点循环、快速关闭重开均有回归测试。

兼容接口：

- ShareConversation.show(messages, options)：现有 AI 分享。
- ShareConversation.showExcerpt(text, options)：excerpt / article 卡片。
- 选文入口与文章页底微信入口调用同一编辑器。

## 不跳页底的评论

桌面打开右侧 Responses 面板，手机使用下方面板。选文、复制引用和真实 Utterances 评论框在一起；关闭或“继续阅读”返回原阅读位置。桌面保留正文操作，手机按 modal 管理焦点与背景。

#post-comments-body 固定到侧栏的 provider 槽位，iframe 始终保留在原父节点。原位置留下同高度占位，关闭后恢复样式；不移除、重挂或刷新评论 iframe，草稿与浏览上下文跨开关保留。MDN 说明普通 DOM 移动可能重置 iframe，moveBefore 的兼容范围仍有限，因此本实现直接避开重挂。[MDN moveBefore](https://developer.mozilla.org/en-US/docs/Web/API/Element/moveBefore)

Utterances 由 GitHub Issues 和其原有登录流程完成发表。跨域编辑器没有安全的预填接口：读者复制引用后粘贴，页面不虚构预填或发布成功。验收不发送真实评论。[Utterances](https://github.com/utterance/utterances)

## AI 进入现有聊天

article:selection-analyze 把选文快照、邻近上下文与源位置传给 ArticleChat。1200px 以上进入右侧 rc 聊天，较窄视口进入现有 abs 工具抽屉；不另开正文弹窗，不抢正文滚动位置或清空未发送问题。桌面 650ms 细曲线把选文引向聊天引用，滚动、尺寸变化或减少动态效果时清理。

每次追问携带 selectedText、selectionContext、文章节选与当前选区自己的历史。按完整选文身份隔离最多 24 个会话、每个最多 10 条历史消息；失败与停止结果不进入历史。结束选文解读恢复整篇问答。重试复用同一提问，避免重复气泡。

ArticleAIClient 统一 POST /.netlify/functions/article-ai，支持 JSON、SSE、分块 UTF-8、CRLF、EOF 和 [DONE]。等待响应头与流读取采用 45 秒无进展超时；取消和过期响应不能污染当前会话。选文上限 6000、上下文上限 5600 字符，沿用后端对参考资料与系统指令的权限区分。桌面使用现有转义 Markdown renderer，手机使用安全文本渲染；相关来源只接受 HTTP(S)。

静态本地预览没有 Netlify 函数，浏览器 AI 验收使用明确的 mock 回复；不将其写成真实模型服务已通过。

## 验证

定向 Hugo 生产构建覆盖本次文章与行内代码验收页；按仓库冻结站点机制隔离第三方网络。

- node --test scripts/article-ai-client.test.mjs scripts/article-ai.test.mjs scripts/share-conversation.test.mjs
- npm run typecheck
- article-selection.spec.ts：尺寸与零位移、卡片完整导出、手机/桌面聊天、追问、错误重试、曲线、暗色、复制拒绝、快速重开和评论阅读位置。
- article-selection-state.spec.ts：评论 iframe 内草稿和初始化标识反复开关保留，原生正文/行内代码拖选只在松手后显示。
- git diff --check 与改动脚本语法检查。

正式截图与本次验收记录保存在任务永久产物目录，不将可重建缓存留在 /private/tmp。
