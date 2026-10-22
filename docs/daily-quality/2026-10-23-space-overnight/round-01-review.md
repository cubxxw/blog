# 独立审查：浏览器旧入口

Reviewer：独立 reviewer sub-agent `/root/review_space_alias_guard`，2026-10-23，基线 `db80e3fbfed57e9f75f15ab83ef8a192a0316059`。

结论：**未发现 P0/P1/P2，可进入定向 E2E 验证，尚不能认定交付完成。**

- `browser-state.mjs:21` 保持 origin 相等前提、safeURL 前置校验和原 Projects 行为；新增分支精确覆盖 `_redirects` 的 8 个旧入口，不会把普通文章或允许嵌入的外站 About 误判。
- `space-browser.test.mjs:31` 覆盖全部正式旧入口、查询与片段，以及正常文章和外站兼容。
- `space-browser.spec.ts:31` 的真实 submit 路径同步触发 popup；监听主页面所属请求不会把独立 popup 导航计为嵌套 iframe。仍需运行完整 Space 上 desktop/mobile 的新 E2E。
- Reviewer 只读，未修改文件、启动浏览器/服务或运行构建/测试；`git diff --check` 通过，检查时 `.agent-pause` 已不存在。

审查针对当前三个源码/测试文件的差异，不把静态 review 当成浏览器或线上验收。后续生产代码变化需重新确认审查有效性。
