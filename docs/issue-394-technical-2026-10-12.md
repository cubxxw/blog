# #394 三篇双语教程核心示例正确性维护（2026-10-12）

冻结基线 `32c6e40d`。本记录覆盖 `content/{en,zh}/engineering/posts/{go-release-tools,github-actions-advanced-techniques,hugo-advanced-tutorial}.md` 六篇工程文章的 G1/G2/G3/A1/A2/A3/H1/H2/H3 有界技术维护，不含新文章、发布、workflow 或外部写入。范围与判定以冻结 findings manifest 为准；修改只做最小双语修复，保留标题、锚点、URL、date、canonical、既有 shortcode/HTML/图示语法与作者视角。

## 目标版本与确定性边界

| 目标 | 固定版本 | 依据 |
| --- | --- | --- |
| GoReleaser 构建/archives/Actions 示例 | OSS **2.18.0** | <https://github.com/goreleaser/goreleaser/blob/v2.18.0/pkg/config/config.go>、<https://github.com/goreleaser/goreleaser/blob/v2.18.0/pkg/config/load.go>（yaml.UnmarshalStrict）、<https://goreleaser.com/resources/deprecations/> |
| Hugo 模块与旧 layout 示例 | **0.145.0 extended** | 复用 `/Users/cubxxw/.local/state/blog-389/tooling/hugo`；不外推到 0.146+ |
| GitHub Actions | 当前官方 metadata/workflow 规则 | 保留能工作的现有 action major（含 `actions/cache@v3`，官方 README 仍支持新 cache 后端，未宣称退役）；artifact v4 既有例子保持 |

字段兼容性判定（以 2.18.0 源码与保留的 `content-goreleaser-archive-2.18.0-keys.json` 为准）：

- `builds`→`ids`、`format`→`formats`、`format_overrides.format`→`formats`：结构内仍保留为 Deprecated 别名，**加载器不拒绝**，属迁移维护，不是运行时失败。
- `rlcp`、`strip_parent_binary_folder`：**不在 2.18.0 Archive 结构内**，严格 loader 直接报错，属目标版本不兼容；`strip_binary_directory` 取代后者。
- 2.0.0 网站静态 schema 含老字段，不能用它否定 2.18.0 实际源码结论。

## 修改前失败（冻结基线 32c6e40d）

- GoReleaser 文：EN fenced YAML 起始 240（长 build 配置列表/缩进/缺空格损坏，含 `overrides:- goos`、`-osusergo`、`builtBy= goreleaser`）、491（`-windows`×3、`binary:worker`、`ID: "worker"`）、531（ldflags 列表缩进）、566（hook 列表 `-second-script.sh`）语法错误；ZH 531 同类缩进错误。archives 主块含 `meta: true`（createMeta 仅文件模式，不含二进制，与 name_template 的 .Os/.Arch 冲突）、`strip_parent_binary_folder`、`rlcp`（含“June 2023 默认”旧说明）、`builds`/`format`/`override.format` 旧名，Pro 的 `templated_files`/`hooks` 混在 OSS 活动 YAML 内。EN38/ZH37 的 `-like`/`--skip-foo` 不是 v2 命令说明；EN72/ZH71 “创建 tag 并推送”缺 `git tag`；EN description 承诺 production-ready 配置。
- GitHub Actions 文：EN fenced YAML 934（`-/data/my_data`）、1240/1303/1359（`id:meta`）、1435（`-opened`）语法错误；EN313 完整 hello workflow `ID: hello`（runner 步骤 schema 只声明 `id`）；EN848–851/ZH845–848 同一 yaml 块两个 `concurrency` 根键。metadata 契约错误：description 标 optional、`required: true` 被写成“未提供自动失败”、虚构 `inputs.<id>.env`/`.group` 属性、runs 被写成通用 using/image/args。EN608–641 核心 context 解释残留中文。
- Hugo 文：EN53–61/ZH48–56 module top-level 块 `replacements: ""` 导致 Hugo 0.145 exit 1（invalid module.replacements）；EN1490/ZH1486 TOML i18n 被标 yaml 且前文 `en.toml` 说明与 YAML 内容矛盾；EN1600/ZH1596 Hugo 模板被标 yaml；EN366–515 模板语义/pipeline 解释残留中文。
- 冻结 helper 基线（`baseline-32c6e40d/acceptance.json`）：116 个标 yaml 片段、16 个失败（含 4 个 Hugo 误标块）、Hugo exit 1、Go exit 0。

## 实施内容（按 findings 编号）

- **G1**：EN 长 build 块按可解析的 ZH 同块恢复（内容仅空格/缩进差异 + 已知损坏点，逐行比对确认语义一致后整块恢复）；EN491 修复 `-windows`/`binary: worker`/`id: "worker"`；EN/ZH531 修复 ldflags 嵌套缩进；EN548/566 恢复 hook 列表 `- ` 空格（EN548 `-first-script.sh`/`-second-script.sh` 原可解析但树与 ZH 不一致，属同类缺空格损坏）；EN/ZH 在长字段清单前标注“组合参考片段，不能整体当生产配置复制”并补 builds/hooks 官方引用。未改任何 target/path/build 语义。
- **G2**：archives 主块 `builds`→`ids`、`format`→`formats: [zip]`、`format_overrides.format`→`formats: [zip]`（均注明 2.18.0 仍接受 deprecated 别名）；`strip_parent_binary_folder`→`strip_binary_directory`；删除 `rlcp` 与“June 2023 将默认”旧说明；`meta: true`→`meta: false` 并解释 meta 是仅文件归档的独立模式；`templated_files`/`archives.hooks` 整段移出 OSS 主块，成为明确标注的 Pro-only 参考片段（保留既有 Pro 知识与字段注释，不混入 OSS 配置）。快速开始后新增版本边界段落（不改开篇）；两个核心 release 工作流示例 `version: "~> v2"`→`version: v2.18.0`（EN/ZH 各两处），注明重新校验配置后可升级。
- **G3**：`-like`/`--skip-foo` 改为有界官方例子 `--skip=publish`（带 deprecations 引用，不执行）；“创建 tag 并推送”补 `git tag v0.1.0` 在 push 前并注明替换版本号（不执行 git tag/push）；EN description 删除 production-ready 保证，改写为本地快照构建、字段参考与 Actions 入口（157 字符）；ZH 摘要保持原准确任务范围，标题未动。
- **A1**：EN934 `- /data/my_data`；EN `id:meta`→`id: meta`（发布工作流三处，`steps.meta.outputs.*` 引用与 `id: meta` 一致）；EN1441 `- opened`；EN313 `ID: hello`→`id: hello`；EN/ZH 并发重复根键示例拆为两个独立 fence 并注明任选其一。另按同一缺空格损坏类、以有效 ZH 对应树为基线恢复三处：`pull_request:branches:`→`pull_request:`+`branches:`、`-assigned`→`- assigned`、`Column`→`column`（与下方正文 `column` 说明及 ZH 基线一致）。保留现有 action ref/permissions/触发器/镜像路径。
- **A2**：description 改 required；`required: true` 语义改为“元数据声明，需操作代码主动校验，缺失不自动失败”并补官方 metadata-syntax 引用；删除虚构的 `inputs.<id>.env`/`.group`，限定 composite 的 `runs.steps[].env` + `inputs` context，并说明调用方 `with` 与 workflow 输入边界；补 `deprecationMessage` 属性；runs 补类型边界（docker=using+image/args、JS=Node runtime+main、composite=using+steps 且 run 步骤要 shell）。既有 composite 无 `INPUT_*`、Docker args→`$1`、`GITHUB_OUTPUT` 说明保留；action.yml 完整示例的 name/description/runs、args 与脚本参数、输出 `time` 名称与 hello workflow `steps.hello.outputs.time` 一致。
- **A3**：EN608–641（jobs 表尾部 `None 无` 与 github context 核心字段表/说明）翻译为英文，保留属性名、类型、官方链接、技术含义与表格结构；翻译后 Han 检测该文件全文 0 残留。
- **H1**：EN/ZH module top-level 块仅删除 `replacements: ""` 一行，其余字段保留；不再新增 module 依赖。
- **H2**：明确 YAML i18n 存为 `en.yaml`、TOML 示例存为 `es.toml`（修正原 `en.toml` 误导说明），第二 fence 改 `toml`；数据文件模板 fence 改 `go-html-template`；模板逻辑未改，range 行为保留。
- **H3**：EN366–515 模板语义列表、pipeline 定义/结构/命令/actions 示例说明翻译为英文，保留 fences、表达式、参数与既有锚点（`##### Multiple pipelines` 恢复为独立标题行，与 ZH 结构一致）；翻译后可见解释无中文残留；两个原中文标题的显式 ID 保留 `命令command`、`使用在-actions-中`，避免历史锚点失效。

新增更正事实的行内官方引用与文末去重 References/参考资料：GoReleaser builds/go、builds/hooks、package/archives、deprecations（含 `--skip`）、v2.18.0 config.go、v2.18.0 load.go；GitHub metadata-syntax。各文 References 条目无重复。

## 精确本地验证（2026-10-12，全部在冻结 worktree 内执行）

1. `git diff --check` — 干净（仅上述六文件改动，`git status --porcelain` 确认无其他文件）。
2. `node scripts/check-frontmatter-fields.mjs` — `Front matter check passed.`
3. `node scripts/normalize-tags.mjs --check` — `Would update 0 file(s).`
4. `node scripts/check-ai-flavor.mjs content/zh/engineering/posts/{go-release-tools,github-actions-advanced-techniques,hugo-advanced-tutorial}.md --check` — 3 篇 / 0 篇有问题，0 错误 0 警告。
5. `python3 /Users/cubxxw/.local/state/blog-issue-triage-20261012/evidence/content-validate_content.py --repo . --artifact /private/tmp/ai-test-blog-issues-20261012.lPn7JA/content-technical/pi-verification --hugo /Users/cubxxw/.local/state/blog-389/tooling/hugo` — `passed: true`，116 个 yaml 片段 0 失败（基线 16 失败）、Hugo 0.145.0+extended micro 站点 exit 0（MicroSite / `<h1>Posts</h1>` / `<h2>Alpha</h2>` / `<h2>Beta</h2>` 全 true）、Go stdlib 模板片段 exit 0（range 输出 Alice/Bob/Charlie、with 输出 Alice）。报告：`pi-verification/acceptance.json`（含六文件 sha256）。
6. 任务证据增强检查（`pi-verification/`，Node 复用 worktree 已链接的 `node_modules` 的 `yaml`）：
   - `check-yaml-blocks.mjs`：六文件全部 yaml fence 0 syntax/duplicate-key 失败。
   - `compare-yaml-trees.mjs`：go-release-tools 11/11、github-actions 38/38 双语同位块解析树相等；hugo 仅 ASCII 目录树示意图（非配置块）空格差异。
   - `check-archive-keys.mjs`：两语言主 archives 块根字段=`id, ids, formats, meta, name_template, builds_info, wrap_in_directory, strip_binary_directory, format_overrides, files, allow_different_binary_count`，全部落在 2.18.0 Archive 键集；`meta: false`；`rlcp`/`strip_parent_binary_folder`/`templated_files`/`hooks` 不在主块。
   - TOML fence 用 Python stdlib `tomllib` 解析通过（每语言 2 块）。
7. 翻译跨度 Han 检测：EN github-actions 可见正文无残留中文，EN hugo 可见翻译跨度无残留中文（原中文显式锚点 ID 保留）（go-release-tools 的历史中文标题及说明段落（linux/nfpm、checksum、Snapcraft、Docker 等）不在指定翻译跨度内，未完整翻译）。

## 未解决的运行/发布边界（不作为本次代码正确性阻塞）

- **goreleaser CLI 本机未安装**：`goreleaser check`/`build`/`release` 未运行；Go 实际构建、GPG/cosign 签名、Docker 镜像构建/推送、GitHub Release、Homebrew/Scoop 发布均未验证。文中示例只做静态正确性修复。
- **未执行任何 GitHub workflow / Docker 发布 / 模型调用**；GitHub 服务端行为（metadata 校验、`INPUT_*` 注入）仅按官方文档修正文本。私有 module 网络权限未验证。
- **Hugo 结果仅覆盖 0.145.0 extended**（原文片段 micro 站点 + 纯 Go range/with 模板），**不外推到 0.146+**，也未运行全站构建、`npm test`、浏览器或 E2E。
- GoReleaser **Pro** 的 `templated_files`/`archives.hooks` 仅作为 Pro-only 参考片段保留，未验证 Pro 执行。
- `actions/cache@v3`、artifact v4、goreleaser-action v7 等保留现状，仅冻结 GoReleaser 测试版本到 2.18.0；读者侧 Docker 登录/GPG/签名密钥仍需自行配置。
- 原 CTR 因果实验的 query→intent 变更表、device/country、Google 重抓后 28 天窗口**不是本次代码正确性门禁**，仍属于 #394 原验收缺项；本次未观测、不伪称已观测，issue 保持开放。
- 范围外观察（未修改）：hugo 文中 `heml` fence 拼写、ASCII 目录树标 `yaml` 的历史痕迹、go-release-tools EN 历史中文标题及说明段落（独立 Goldmark 可见文本检查仍有 1,204 个汉字，未完整翻译）与 ZH `refs/heads/...` 类表格行折行，均不在冻结必修清单与指定翻译跨度内。

#394 的本轮交付范围为教程准确性维护。原搜索实验验收保持有效，Google 重抓与完整 28 天观察尚未完成，不因本地技术检查通过提前关闭。

## 父代理独立验收补充

独立审查发现并由父代理纠正两项 P2：英文 Hugo 翻译标题以显式 ID 保留 `命令command`、`使用在-actions-中`；Action 输入属性补 `deprecationMessage`，环境映射限定 composite 的 `runs.steps[].env`，调用方使用 `with`。真实 Hugo/Goldmark 渲染六文前后，全部旧 heading ID 保留，仅补原合并行缺失的 `multiple-pipelines`；Go 11/11 与 Actions 38/38 双语 YAML 树一致、archives 字段与 OSS2.18.0 一致，父最终 helper 116 块/0 错误、Hugo/Go 通过。剩余 P0/P1/P2=0；这不认证六篇文章全部历史代码或全文英文化。
