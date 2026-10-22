# 雨夜咖啡馆：参考细节与本地对比

本轮只在 `codex/space-night-cafe` 的本地工作区修改，未提交、推送或发布。正式线上版本仍是 `32e9296`。

本地空间：<http://localhost:3987/zh/projects/?vista=image>。本地对比页：<http://localhost:3991/>。对比页、原图副本、固定相机截图与试听片段位于忽略目录 `.netlify/cafe-lab/`，不作为站点发布内容。

## 参考图逐处分析

参考为作者提供的 `codex-clipboard-9f8171e3-7aa4-4eec-a7bc-b1817f2fe2c7.png`。以下描述限于画面可见特征，并不将参考图认定为现场摄影，也不把做旧纹理直接等同于侘寂。

| 部位 | 参考图的实际关系 | 旧版问题 | 本轮处理 |
| --- | --- | --- | --- |
| 窗樘 | 承重粗木樘在前，细窗梃退后；收口有暗缝，纸面嵌在框内 | 等粗、等深木条，像贴在墙上的线框 | 增加企口与凹槽、退后的纸面、磨暗的内沿；保留窗洞与点击范围 |
| 卷帘 | 卷起的一束竹苇；有厚度、织线、束绳与轻微起伏 | 平铺等距横线，缺少卷曲厚度 | 不同直径竹苇组成卷束，加入深色经线、束绳和低幅垂弯；合批减少绘制 |
| 桌面 | 顺木纹宽幅延伸，局部氧化，手臂接触前沿磨暗；收口有柔和不齐 | 暗红纹理重复，像整块上漆平板 | 使用已有实木照片的纤维明度，重新配置不重复的色泽和粗糙度；比较浅木、蜂蜜木、旧蜂蜜木后选后者 |
| 桌下 | 边框、桌腿、抽屉暗缝、地面接触共同赋予分量 | 深黑平板吞掉抽屉细节 | 同步腿、边框、抽屉色泽和接缝；桌面尺寸与电脑位置保持可用 |
| 外景 | 桥在左侧，右岸房屋逐级退让；水道通向桥洞，远山被雾分开 | 房屋横排、同高同距，桥与水道关系不明 | 先重做有纵深的两岸、石拱桥和实际灯位，再与环境影像方案固定视角比较 |
| 雨、水与老人 | 外景蓝灰、灯火暖黄；降雨、碎反光与远船尺度互相约束 | 长白雨线像划痕，船太近，水面亮条生硬 | 雨线变短细、分远近层；老人船移远，继续平缓划行；实时水波与尾流保留 |
| 声场 | 窗外是连续环境，室内音乐是另一件可开关的事 | 两条声音一同开关，进入电脑可能影响雨声 | 雨声默认单独播放，号角只开关音乐；两条独立播放通道和暂停位置 |

## 两条外景路线与选择

路线一是完整三维河道：弯曲两岸、错落房屋、真实开孔的石拱桥、灯下碎反光、远山雾层均有几何或实时着色。查询参数 `?vista=geometry` 可以查看。

路线二把远城、山林与主要静态反光作为球面环境影像，房间、窗面雨珠、落雨、薄雾、水波、尾流和划船仍实时呈现。当前本地默认选路线二；它的屋瓦、沿岸层次和空气感更接近参考。远城是生成的环境影像，不能称为可走入的完整三维村落或现场摄影。

环境资源加载期间保留三维河道；失败后继续使用三维回退。异步贴图完成时若房间已经销毁，立即释放贴图，不改变新房间。房间走动、转头、照片和原生电脑交互继续工作。

固定相机、环境时间 12 秒、相同画幅比较三处视角，避免把不同角度误认成材质改善：整体 1933×814，桌面与窗边 1440×900。几轮截图保留于本地对比页，包含旧版、第一轮、桌面做旧前后、两条外景及雨层与船距调整前后。

| 整体固定视角 | 绘制次数 | 三角形数量 |
| --- | ---: | ---: |
| 修改前 | 285 | 227750 |
| 当前三维河道版 | 250 | 243840 |
| 当前环境影像版 | 232 | 170008 |

这些是同一相机下的渲染负担，不能证明审美更好。没有以静态截图替代走动和声音验收。

## 环境影像生成记录

- 工具：内置 `image_gen.imagegen`；模式为参考图引导的新环境图生成，非整页截图替换。
- 输入：作者提供的上述室内参考图，只取窗外构图、色温与空气感。
- 首轮资源：`assets/images/space-cafe/jiangnan-vista-study-v1.png`，1902×827。
- 当前选定资源：`assets/images/space-cafe/jiangnan-vista-study-v2.png`，2032×774。Hugo 生成 WebP，引用来自站点资源，不依赖本机生成工具的输出目录。
- 首轮提示记录：

```text
Use case photorealistic-natural. Standalone high-resolution panoramic far-environment matte for Jiangnan café. Attached image exterior composition mood/color only. ONLY outdoors: graceful pale aged stone arched footbridge left third, irregular traditional timber/white-plaster houses receding RIGHT bank amber windows/lanterns, far roofs/mountains layered blue gray rainy mist. Lower 40% dark blue canal fine irregular gold reflections. Restrained willow upper right only, eye 1.3m across 12m canal, natural cinematic material detail. Wide ~2.3:1. No indoor room/furniture/computer/window frame/curtain/glass/close beads, no person/boat (own animated boat), no foreground rain (live animated), no stars/moon/text/logos/watermarks, no block geometry/illustration/neon.
```

首轮在入口视角接近参考，但桌面侧视角出现了图片边界被拉成横条的问题。又比较两次覆盖角度后，采用内置工具对首轮环境图继续扩景；选择 `image-v6` 固定视角截图对应的版本。实际输出比目标画幅窄，按实际资源重新校准角度，不能仅因提示指定了画幅就认定输出满足。

扩景工具：内置 `image_gen.imagegen`，编辑模式；参考/编辑目标为上面的首轮资源。最终调用提示如下：

```text
Use case photorealistic-natural. EDIT TARGET: the attached Jiangnan canal environment image. Expand it into a much wider panoramic environment, approximately 3.5:1, by adding natural scene to the LEFT and a little RIGHT. Preserve the existing central scene and its dusk blue-gray / amber palette, photographic weathered material, atmospheric mist, aged stone bridge, fine canal reflections. The existing pale stone bridge should now sit at 38 percent of the FINAL image width, its top at roughly 47 percent height; right-bank houses should recede from the bridge toward the RIGHT. Crucial: the LEFTMOST 25 percent must be newly painted real continuous scenery with deep trees, misty distant roofs, canal and restrained warm lamps, not a duplicated/stretched column. Keep lower 40 percent open dark reflective canal. Mountain ridges and flowing mist above. No interior, window frame, glass, curtains, computer, text, logos, person, boat or close foreground rainfall; our real-time scene supplies rain and the boat. Natural panorama from a stationary eye 1.3 metres above water, film-like fine detail, avoid oversaturated/neon light and avoid invented foreground objects. Deliver one seamless wide environment asset, not a screenshot or comparison.
```

## 连续声音

雨声来自 Matucha 的 [Distant storm in the city (5)](https://commons.wikimedia.org/wiki/File:Distant_storm_in_the_city_(5).flac)，原始来源为 [Freesound 115250](https://freesound.org/people/matucha/sounds/115250/)，许可 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。保留原生 44.1 kHz、24-bit、立体声无损格式，不用升采样冒充更高质量。

原录音长约 121.67 秒，约第 111 秒存在明显强瞬态。选择前 108 秒，排除该尾段；解码后首尾 8 秒等功率重叠，形成 100 秒循环。音频由浏览器音频时钟循环，不用定时器到点重新播放。不合成噪声，不压缩原录音动态。来源、校验、选段和加工见 `static/audio/space/rain-distant-storm-loop.json`；准备脚本是 `scripts/prepare-room-rain.mjs`。

雨声原文件 SHA-1：`bda24ca82be3f1a1755ff8aa8920df03fc77efab`。本地片段 SHA-256：`163b7f4df1345f2d54a35ae041116987544eca12dc0397105537b4eb76c999fb`。

现有爵士配乐去除开头约 1.06 秒、末尾约 2.28 秒的近静音，首尾重叠 2 秒。只给音乐启停加入 60 毫秒渐变，每个音源拥有独立音量节点；快速再次播放不会被前一个淡出的音源影响。雨声增益 1.5，音乐增益 0.3，音响关闭后雨声仍持续。浏览器阻止自动播放时，房间内第一次真实点击或按键继续启动雨声；临时请求失败后也可以通过后续真实操作重试，不自动循环请求。

雨声与音乐在循环边界附近均没有 50 毫秒静音窗口。雨声接缝相邻样本差约 0.00048/0.00225，低于录音自然相邻变化的第 95 百分位 0.00285；配乐对应约 0.00009/0.00021。此检查可以排除明显断点，不代表人耳一定听不出循环；本地对比页提供接缝在第 12 秒的 24 秒试听。

切换电脑和返回房间不重建音频源。主动进入安静模式或隐藏房间会暂停，并保留进度；回到房间从暂停位置继续。原有非江南场景保留原音频调用方式与资源。署名可在电脑“帮助”菜单中查看。

## 验证记录

单元门禁 `npm run bear:test`：305/305。类型检查和 Hugo 本地生产构建通过；构建输出在忽略目录 `.netlify/cafe-local-production/`。

桌面与移动端四个浏览器文件覆盖 58 项用例。第一遍 56 通过，新增恢复测试的两项失败来自测试按 Tab 时焦点在房间外；改为真实点击房间后，连续雨声专项重新运行 8/8 通过。独立审查者用首次 503、合成事件不重试、真实点击恢复的方法复验桌面与移动端，原 P2 已关闭。最新扩景资源到位后，远景正常加载、404 回退和原生 Mac 选区保留专项再次 6/6 通过。

真实浏览器验证了音频源身份与播放时间、音乐开关、首次播放被拦截、雨声首次请求失败恢复、安静/隐藏恢复、原生 Mac 笔记与选区保留、照片、全屏和远景加载失败回退。木作本身另有 16 项定向检查，包含首射线命中、无无效顶点和 763/763 资源释放。固定相机截图均未出现页面或着色器错误。静态检查、构建与浏览器结果分别记录；本地构建不代表线上部署，声音品质和审美仍需实际试听与观看判断。

最后直接访问未经模块替换的本地页面：1933×814 与 390×844 均加载了 `study-v2` 环境资源和 12 张材质图；雨声 `playing`、音乐 `paused`，外部导航不可见，画面填满视口，无横向溢出或页面/着色器错误。本地对比页的版本切换、视角切换、24 秒音频试听互斥及手机宽度也通过。实际截图和结构化结果位于 `.netlify/cafe-lab/final-live-*.png` 与 `final-browser-check.json`。
