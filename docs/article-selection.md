# 正文选区工具

适用范围：默认文章详情页的 `.post-content`。单击文字段落，或使用浏览器原生文字选择后，出现「分享 / AI 分析 / 评论 / 更多」。中英文按钮分别本地化。

## 调研与设计选择

Readwise 将摘录作为可独立分享的图片，并保留阅读材料的来源；本功能据此采用“先预览摘录卡，再下载或调用系统分享”的流程。[Readwise Sharing](https://docs.readwise.io/reader/docs/faqs/sharing)

Ghostreader 的解释功能把选中文字和所在句子一起送给模型。这里把选文、邻近段落和文章节选一起作为阅读材料，避免文章后半段的选区丢失上下文。[Default Ghostreader Prompts](https://docs.readwise.io/reader/guides/ghostreader/default-prompts)

Substack 支持选中片段后以引用分享，并在引用之外添加自己的文字。这里让分享卡和评论引用共用同一份选文与来源链接，评论仍由读者在原评论框发表。[Substack Restack](https://support.substack.com/hc/en-us/articles/14671398684308-What-is-a-restack-on-Substack-Notes)

这些资料用于确定交互方向；工具条位置、极淡边框与渐变色采用作者提供的截图和要求。

## 阅读交互

- 工具条、独立“更多”菜单和段落标记挂在 `body` 下，以 `position: fixed` 绘制；正文不增加 wrapper、占位、padding 或 margin。
- 段落标记采用 7% 墨绿色描边、1% 底色、6px 圆角和左侧短线，明暗主题分别调整墨色。
- 桌面优先位于选区上方 10px。顶栏或视口边缘挡住上方时，移到完整段落/选区下方；两侧都没有空间时暂时隐藏。
- 文字拖选使用 `Range.getClientRects()` 的真实选区。跨段和行内格式保留原生选择；图片、链接点击、代码交互、折叠区和互动组件保留自身行为。仅端点属于可选择正文块的范围才出现工具条。
- 滚动和视口变化按动画帧重新定位，离开视口时淡出并停止接收焦点；回到视口后重新锚定。Escape 关闭菜单或工具条，保留原生选文。
- 触屏选文稳定 350ms 后显示工具条，优先放在选区下方并留出至少 56px。网页无法读取操作系统菜单的实际矩形，这属于避让策略；iOS/Android 原生菜单仍需真机验证。正文不拦截 `touchstart`、`contextmenu` 或拖选默认行为。

## 分享与引用评论

分享弹窗以渐现方式出现，支持墨/苔、纸、暮三种渐变，只有一个可见 PNG 预览。图片包含完整摘录、文章标题、作者和来源；字体加载和最新绘制完成后才启用导出。复制文本保留 Markdown 引用和来源链接。

PNG 导出上限为 2400 字符或 80 行显式文本。超过上限时给出缩短选择的提示，停止画布分配并保留完整文本复制能力；不会截断最后一行冒充完整导出。原生图片分享按 Web Share 能力检测开放，取消后仍可下载。自动复制失败时，在当前弹窗内提供可选中的手动复制框。

评论操作滚动到页底，展示选文、来源和“复制引用”。预览保存独立快照，之后清除选区也不会丢失复制内容。Utterances 是跨域 iframe，本实现没有预填或自动发表评论；读者复制后粘贴到原评论框并发表。

段落链接保留已有作者 ID，给其余可选块分配不冲突的 `asel-pN` ID；浏览器支持时补充文字片段。ID 依赖正文顺序，编辑文章后可能变化；文字片段提供额外的原文定位。

## AI 接口

复用 `/.netlify/functions/article-ai`：沿用 `question`、`language`、`articleTitle`、`articleContent`、`pagePath`、`context`、`stream`，新增可选的 `selectedText` 和 `selectionContext`。

- 选文最大 6000 字符，上下文最大 5600 字符；过长选文在前端提示缩短，后端再次约束长度。
- 选文和邻近上下文仅进入 user 角色的参考资料 JSON，原文中的指令不进入 system 权限；旧客户端的请求形状保持一致。
- 支持 JSON 和 SSE，包括跨读取边界、UTF-8、流末尾和 `[DONE]`；回答使用纯文本渲染。
- 每份完整选区单独保存最多 10 条会话消息。关闭/取消会中止请求，过期请求不能改写新会话。
- 等待响应头和读取流均有 45 秒无进展超时，失败可重试；失败回答不会进入会话历史。
- 备份部署依照 `site-capabilities` 隐藏 AI 操作，没有评论区时隐藏评论操作。

## 文件与验证

入口为 `layouts/partials/article/selection-tools.html` 和 `layouts/_default/single.html`；运行时为 `static/js/article-selection.js`，样式为 `assets/css/extended/article-selection.css`。样式沿用文章页面的资源归属规则，脚本仅由默认文章详情页加载并带内容版本。

```sh
node --check static/js/article-selection.js
node --test scripts/article-ai.test.mjs
npm run typecheck
SITE_OUTPUT_DIR=<已构建的站点目录> SITE_TEST_RESULTS=<登记的测试产物目录> \
  npm test -- article-selection.spec.ts --project=desktop --workers=1
git diff --check
```

浏览器用例覆盖 320px、390px、1280px 的段落坐标/页面高度、菜单脱离正文、顶部翻转、滚动淡出、原生 Range、触屏避让、明暗主题、PNG 下载、评论引用、复制失败、AI JSON/SSE/追问/失败/重试/超时/取消和英文按钮。几何测量关闭已有滚动入场动画，单独验证选区操作是否产生位移。

## 参考资料

- [Readwise Sharing](https://docs.readwise.io/reader/docs/faqs/sharing)
- [Readwise Default Ghostreader Prompts](https://docs.readwise.io/reader/guides/ghostreader/default-prompts)
- [Substack Restack](https://support.substack.com/hc/en-us/articles/14671398684308-What-is-a-restack-on-Substack-Notes)
- [MDN Range.getClientRects](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Utterances](https://utteranc.es/)
