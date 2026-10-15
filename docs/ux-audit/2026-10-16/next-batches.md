# 已有证据驱动的后续批次

沿用 control 固定量表与所有权。以下是实施约束，不是已完成声明；每批 source manifest 与真实动作完成后才闭环。

## E8 · Space 窗口容量与真实动作名称

已复现 UX024：844×390 coarse 三窗整理后，最小高260把原小tile抬高，欢迎窗4个控制中心被地图遮住。默认重叠与最大化可用，不把它们误判为缺陷。

- 仅 `assets/js/space/state.mjs` 与 `desktop.js` 生产路径；追加 workspace-state 单元测试与新 arrangement 浏览器合同，不改 world、CSS、公开内容或私人节点。
- 同一纯布局plan按实际viewport与可见窗计算，优先原1/2列，再尝试其他可行列数；扣除现有100px chrome、边距与gap后，raw cell必须达到320×260且不超fitRect可用范围。否则返回overview，不让fitRect把小tile抬大导致重叠。reducer亦守卫，fallback不改原state/rect。
- ≤640使用overview；它的stateViewport=10000仅为保留原桌面rect，不能据此认定容量足够。0可见窗不宣称已并排，1窗按实际容量处理。
- bar aria/title与settings动作按实际模式命名。容量不足时菜单使用已有overview入口，避免两个同名动作；terminal返回实际结果。公开 `BearSpace.execute('arrange')` 布尔兼容性保留。
- 实测：844×390 coarse中英3/4窗点击bar打开overview，选择原notes、Escape回触发器、原DOM/草稿/rect连续；菜单与terminal反馈真实。1440×900的2/4窗真实平铺、无相交/出界、控制中心hit、原notes可续写。Node补0/1/minimized、最小容量前沿和fallback原state不变。

## E9 · 四App阅读、触控与边框

已复现 UX028/029，见 space-app-families.json 与独立评分建议。一次仅 products/books/contact/settings；不借机重写11App或世界。保持真实产品/书籍/外链与四色封面，不真实打开联系发送渠道。

主正文/输入投影后约15–16 CSSpx，主要动作13–14、必要辅助/能力状态12–13、装饰编号10–11；不是WCAG统一字号规则。重要手机目标投影后44×44并实际中心命中。desktop产品图限制高度但保持比例；phone目录用紧凑选择释放正文宽度。book允许单列纵滚。contact减少渠道重复围框，草稿同DOM/值保留。settings状态就近对应，不新增卡片层。

实拍需desktop/390前后对照，并补320/620/844 coarse、长英文、深色与zoom；逐个选择/滚到底/恢复，不以无横溢出作为可用证明。具体范围可再拆小批，单浏览器串行。

## E10 · Travel QR 与其余目录边界

UX018已有真实390×844zh/light两motion焦点失败；normal Escape后立即Enter重开被旧transition隐藏。修复需要实际focus进入/Tab containment/Escape返回，运行时reduce与取消旧过渡。先保留渠道/二维码源与可见外观，不真实添加联系人。

F03只验Archives首年Mac Meta/plain/Back；其余修饰键/页面不继承。UX009只验当前右TOC runtime reduce点击定位；长目录自动追踪container.scrollTo与焦点仍需独立探针，legacy左sidebar无当前模板不能冒充活路径。

### E9拆批与已测基线

E9a先products/books，E9b再contact/settings；共用原有palette/组件语义，不同时重写4个App。E9a允许native phone select释放正文宽度、保持desktop目录与全部7个产品/4本真实书、限制截图高度保持图像比例、主入口投影后44px、同component产品选择后焦点连续；E9b原contact draft同节点，settings仅同步pressed而不重建整个host，避免焦点BODY。

3caab4d1不可变预览书封computed CSS对比探针已保存：作者/编号因opacity.75，四封面分别约3.415/2.330/2.706/3.164；第二封面的标题2.957，不能上取整为3。E9a保持四色相，允许调深背景与去降低对比opacity，测实际computed前景/背景/元素opacity并报告原始ratio；不把source数值或程序设焦点当全页/Tab路径通过。
