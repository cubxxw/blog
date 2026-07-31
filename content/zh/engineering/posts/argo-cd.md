---
title: 'Argo CD 实战指南：Kubernetes GitOps、同步策略与生产安全'
ShowRssButtonInSectionTermList: true
date: 2025-05-09T20:45:39+08:00
lastmod: 2026-07-31T00:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Kubernetes
  - DevOps
  - Cloud Native
  - Deployment
  - Automation
  - Security
categories:
  - Development
description: >
  讲清 Argo CD 的 GitOps 控制循环、Application、AppProject 与 ApplicationSet，给出安装和首个应用示例，分析自动同步、回滚、Server-Side Apply、多集群权限及生产安全取舍，帮助平台团队建立可审计、可恢复、不过度授权的 Kubernetes 持续交付体系。
cover:
  image: /images/covers/engineering/2025/argo-cd.jpeg
  alt: Argo CD 持续比较 Git 期望状态与 Kubernetes 集群实际状态
tldr:
  - Argo CD 是 Kubernetes 的声明式持续交付控制器；它比较 Git 中的期望状态与集群实际状态，但不会替你完成构建、测试、镜像扫描或渐进式发布决策。
  - Application 定义部署什么、部署到哪里；AppProject 划定仓库、集群、命名空间和资源权限；ApplicationSet 根据数据源批量生成 Application，三者不能互相替代。
  - 自动同步不等于自动删除或自动修复：prune 与 selfHeal 默认需要显式开启；启用自动同步时不能直接执行 Argo CD 历史回滚。
  - 生产环境应固定受支持版本、最小化 Argo CD 与 Kubernetes 两层权限，并把仓库凭证、目标集群凭证和清单生成插件视为控制面资产。
  - Git 不是因为被称为“唯一事实来源”就天然正确；真正可靠的是经过评审、可追溯、能被控制器重复收敛的期望状态。
maturity: evergreen
---

## 一次同步成功，不等于交付系统已经可靠

Argo CD 页面变成绿色，只能证明此刻的集群与它计算出的期望状态一致。它不能证明镜像通过了测试，不能证明删除动作安全，也不能证明下一次 Git 变更值得进入生产。

这正是理解 Argo CD 的入口：它不是一条会替团队作判断的流水线，而是一个持续执行“比较—报告—收敛”的 Kubernetes 控制器。工程价值不在于多了一个漂亮界面，而在于部署意图从散落的命令变成了可评审、可重放的状态。

本文按 **2026-07-31** 的 Argo CD 稳定文档核对。具体安装版本、升级步骤和支持周期会变化；生产环境应从[官方 Releases](https://github.com/argoproj/argo-cd/releases)选择仍受支持的版本并固定 tag，不要把 `stable` 分支当成不可变版本。

---

## Argo CD 做什么，也不做什么

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) 是面向 Kubernetes 的声明式 GitOps 持续交付工具。它读取 Git、Helm chart、Kustomize 或配置管理插件生成的清单，比较目标集群的实际状态，并把差异标为 `OutOfSync`；随后由人工或自动策略决定是否同步。

一个最小闭环是：

```text
代码或配置评审
      ↓
Git 中的期望状态
      ↓
Argo CD 生成清单并比较差异
      ↓
手动或自动同步
      ↓
Kubernetes 实际状态与健康状态
```

边界同样重要：

- **CI** 负责构建、测试、签名和扫描镜像；Argo CD 不替代这些步骤。
- **Kubernetes** 负责调度与运行工作负载；Argo CD 不选择节点上的容器运行时。
- **Argo Rollouts 等工具**负责金丝雀、蓝绿或指标驱动的渐进式发布；Argo CD 可以部署这些 CR，但不会因此自动获得发布分析能力。
- **Git 历史**提供变更线索，却不保证配置正确。错误配置进入受信分支后，控制器只会更忠实地执行错误。

### Docker 不是这里的运行时前提

旧教程常把“Docker + Kubernetes + Argo CD”写成固定技术链，这会混淆构建工具、镜像格式与节点运行时。Kubernetes 从 1.24 起已经移除内置 `dockershim`；节点需要实现 CRI 的运行时，例如 containerd 或 CRI-O，也可以通过兼容适配器使用 Docker Engine。Docker 仍可用于本地构建 OCI 镜像，但这不等于集群以 Docker Engine 作为运行时。

Argo CD 只关心 Kubernetes API 与声明式资源，并不依赖“Docker 是否最广泛”这种无法帮助部署决策的排名。运行时选择应回到集群发行版、CRI 支持、安全与运维边界。参见 Kubernetes 官方的[容器运行时文档](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)。

---

## 三个核心对象：先把职责分开

### Application：部署什么，部署到哪里

`Application` 是 Argo CD 的基本管理单元。它把来源、版本、目标集群、命名空间和同步策略连在一起：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: demo
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: <PINNED_COMMIT_OR_TAG>
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      enabled: false
    syncOptions:
      - CreateNamespace=true
```

示例故意把自动同步关闭，也没有使用 `HEAD`。学习环境可以跟踪分支，生产环境则应根据发布模型固定 commit、tag 或受控配置分支，并清楚知道谁能推进这个引用。

### AppProject：给 Application 划边界

`AppProject` 不是目录标签，而是安全护栏。它可以约束：

- 允许使用哪些源仓库；
- 允许部署到哪些集群和命名空间；
- 可以创建哪些集群级或命名空间级资源；
- 哪些身份能读取、同步或管理项目内应用。

默认 `default` Project 的宽松能力适合入门，不适合直接承载互不信任的团队。项目边界应显式定义；通配符越多，代码评审与 RBAC 越难真正限制爆炸半径。官方[Projects 文档](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)给出了声明式配置方式。

### ApplicationSet：批量生成，不是另一种 Application

`ApplicationSet` 控制器根据生成器输出参数，再套用模板创建和维护多个 `Application`。稳定文档列出的生成器包括 List、Cluster、Git、Matrix、Merge、SCM Provider、Pull Request、Cluster Decision Resource 与 Plugin。

典型用途包括：

- 每个已注册集群生成一个 Application；
- 按 Git 目录或配置文件生成多个环境；
- 为开放中的 Pull Request 创建临时预览环境；
- 把集群维度与应用维度用 Matrix 组合。

需要记住两个操作边界：

1. **生成的 Application 由 ApplicationSet 管理。** 直接修改子 Application，下一次调和时可能被模板覆盖。
2. **生成器输入具有权限含义。** Git、SCM、PR 或 Plugin 生成器能影响目标、仓库和参数；允许开发者创建 ApplicationSet 前，必须阅读官方的[安全说明](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Security/)并限制可用项目与 SCM Provider。

新配置建议开启 Go Template，并让缺失键直接失败，而不是静默生成错误目标：

```yaml
spec:
  goTemplate: true
  goTemplateOptions:
    - missingkey=error
```

ApplicationSet 解决的是规模化重复，不是权限审查。生成得越快，边界错误扩散得也越快。

---

## 安装：演示可以追 stable，生产必须固定版本

官方 Getting Started 使用 `stable` 清单帮助快速体验：

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

但官方同时建议生产环境使用固定版本。把 `<SUPPORTED_VERSION>` 替换为你在 Releases 与升级文档核对过的 tag：

```bash
ARGOCD_VERSION=<SUPPORTED_VERSION>

kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
```

这里的 `--server-side` 用于绕开某些大型 CRD 的 client-side apply annotation 大小限制；`--force-conflicts` 会接管冲突字段。它适合官方清单的全新安装或按文档升级，却不是“对任何业务资源都安全”的通用参数。若手工改过官方清单定义的字段，升级时可能被覆盖。

安装形态按需求选择：

| 形态 | 适合场景 | 边界 |
|---|---|---|
| 非 HA 多租户安装 | 评估、演示、非生产 | 官方不推荐用于生产 |
| HA 多租户安装 | 生产平台与多团队 | 资源更多；官方清单因 Pod 反亲和需要至少 3 个不同节点 |
| Argo CD Core | 集群管理员的 headless GitOps | 没有常驻 API Server、OIDC 与完整 Argo CD RBAC，主要依赖 Kubernetes RBAC |
| Helm/Kustomize | 需要声明式定制安装 | 仍应固定 chart/版本并审查 values 或 overlays |

不要从“HA 清单”直接推导“生产已高可用”。还要检查集群故障域、Redis、repo-server 与 controller 容量、备份恢复、网络和外部身份提供商。

### 初次访问

本地验证可以先使用端口转发：

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
argocd admin initial-password -n argocd
argocd login localhost:8080
```

默认是自签名证书。`--insecure` 只适合明确理解风险的临时测试；正式入口应配置可信 TLS。首次登录后修改密码并删除 `argocd-initial-admin-secret`，再完成 SSO、RBAC 和管理员账户策略。

---

## 第一个同步：观察控制循环，而不是只背命令

应用创建后，先看 Argo CD 计算出的清单与差异：

```bash
kubectl apply -f guestbook-application.yaml
argocd app get guestbook
argocd app diff guestbook
argocd app sync guestbook
argocd app wait guestbook --health
```

首次部署通常是 `OutOfSync`，因为 Git 中有期望资源而集群尚未创建。同步后可能变成 `Synced`，健康状态则由各类资源的 health assessment 单独判断。二者不是同义词：

- `Synced + Degraded`：清单一致，但工作负载没有健康运行；
- `OutOfSync + Healthy`：当前资源还能服务，但已偏离 Git；
- `Unknown`：比较或健康检查本身无法完成。

真正有用的排障顺序是：先确认生成清单，再看 diff，再看同步操作与 resource tree，最后回到 Kubernetes 事件和日志。绿色状态不是终点，它只是控制器此刻能给出的证据。

---

## 自动同步、删除、自愈与回滚：四件事不要混在一起

Argo CD 的自动同步可以这样显式开启：

```yaml
spec:
  syncPolicy:
    automated:
      enabled: true
      prune: false
      selfHeal: false
```

根据官方[自动同步语义](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)：

- 自动同步只在 Application 为 `OutOfSync` 时尝试；
- 默认不会因为 Git 删除了资源就自动 prune；
- 默认不会因为集群内手工改动就触发 self-heal；
- `allowEmpty` 是额外保护开关，不应随意打开；
- ApplicationSet 生成的 Application，应修改 ApplicationSet 模板或按官方方法临时控制自动同步，而不是直接改子对象；
- **启用自动同步的 Application 不能直接执行 Argo CD rollback。**

### 回滚有两条路，含义不同

`argocd app rollback APP [HISTORY_ID]` 可以回到某次部署历史，但前提是先关闭自动同步。更重要的是，历史回滚如果没有同步修改 Git，下一次调和仍可能把旧状态拉回当前期望状态。

生产事故中更稳妥的默认动作通常是：

1. 在 Git 中 revert 或创建一个明确的修复提交；
2. 走完必要评审；
3. 让 Argo CD 同步新的期望状态；
4. 记录数据库迁移、外部依赖等无法由清单回退的部分。

历史回滚适合紧急恢复，Git revert 负责让恢复结果持续存在。两者都不是“自动回滚”：Argo CD 不会仅凭 SLO、错误率或业务指标自行判断版本好坏；这类能力需要发布控制器和可观测性系统协同。

---

## Sync Options：每个开关都在改变风险

官方[Sync Options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)很多，常见选项应按问题选择：

| 选项 | 解决的问题 | 需要警惕 |
|---|---|---|
| `CreateNamespace=true` | 自动创建目标命名空间 | 不等于获得正确的 Namespace 元数据与权限边界 |
| `ApplyOutOfSyncOnly=true` | 大应用只同步有差异资源 | 改变同步覆盖，需结合 hooks/waves 验证 |
| `PruneLast=true` | 健康同步完成后再删除旧资源 | 仍然会删除，不能替代确认与备份 |
| `FailOnSharedResource=true` | 发现资源被其他 Application 管理时失败 | 有助于暴露所有权冲突 |
| `Delete=confirm` / `Prune=confirm` | 对关键删除要求确认 | 确认流程本身也要受 RBAC 与审计保护 |
| `ServerSideApply=true` | 大清单、部分资源或字段所有权场景 | Argo CD 使用 `--force-conflicts`；要先理解 managedFields |
| `Replace=true` | apply 无法处理时替换资源 | 可能重建资源并造成中断，且优先于 SSA |
| `Force=true` | 删除并重建资源 | 破坏性更强，只用于明确需要重建的对象 |

旧稿把 Server-Side Apply 写成普遍“推荐”，这不够准确。SSA 适合 CRD 过大、部分清单、迁移字段所有权等具体问题；它也可能改变字段管理者并强制解决冲突。先检查 `managedFields`、控制器共管关系和迁移方案，再决定是否启用。

同步波次与 Hooks 也不是通用编排引擎。它们适合与一次部署紧密相关的 PreSync、Sync、PostSync、SyncFail 操作；长期任务、复杂数据迁移和跨系统事务仍需要独立设计幂等、超时与补偿。

---

## 安全：Pull 模型缩小一种暴露，也带来另一种权力

Pull 模型让 CI 不必持有 Argo CD API 或目标集群凭证，这是明显收益。但不能由此推导“Pull 天然安全”。Argo CD 控制器持有目标集群访问能力，repo-server 会处理不受信任程度不同的仓库内容，ApplicationSet 还能批量扩散配置。

生产基线至少包括：

### 1. 同时收紧两层权限

- **Argo CD RBAC**：控制谁能看应用、同步、覆盖参数、查看日志或 exec。
- **Kubernetes RBAC**：控制 application-controller 在目标集群真正能创建和修改什么。

只收紧 UI 权限，却让 controller 永久拥有无边界的 `cluster-admin`，风险并没有消失。`policy.default` 应是最小权限角色，因为所有已认证用户都会继承它，`deny` 无法撤销默认授予的权限。配置后用 Argo CD 提供的 RBAC 校验与测试命令验证，而不是只读 YAML 猜结果。参见官方 [RBAC 文档](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)。

### 2. 用 AppProject 限制爆炸半径

限制 sourceRepos、destinations 与资源种类；对 Namespace、CRD、ClusterRole 等集群级对象尤其谨慎。不要让不受信任团队在无限制 Project 中任意创建 Application 或 ApplicationSet。

### 3. 把仓库与插件当成代码执行边界

配置管理插件会在 repo-server 侧执行命令。插件镜像、参数、环境变量、仓库内容与凭证都要最小化并隔离。SCM/PR generator 的 token 只授予必要范围，限制可访问的 Provider。

### 4. 不把明文 Secret 提交到 Git

选择适合组织的密钥方案，例如 External Secrets、Sealed Secrets 或 SOPS，并分析明文在哪个组件中出现。一个工具支持加密，不代表密钥不会在 repo-server、缓存、日志或目标集群中暴露。

### 5. 固定来源并验证升级

固定 Argo CD 版本、Helm chart、远程 Kustomize base 与生产应用 revision。阅读每个跨 minor 版本的升级说明，先在代表性环境验证 CRD、RBAC、diff 与同步行为，再推进生产。

---

## ApplicationSet 与多集群：规模化之前先定义故障域

单实例管理多集群带来统一视图与较少运维面，却集中保存目标集群凭证，也放大控制面故障。每集群实例隔离更强，但升级、SSO、RBAC 与配置复制成本更高。不存在一条适用于所有团队的拓扑。

做决定前先回答：

1. 哪些集群可以共享同一个信任域？
2. 一个 repo-server 或 controller 故障最多影响多少应用？
3. 平台团队能否同时维护多套升级和策略？
4. 目标集群是否允许管理集群访问 Kubernetes API？
5. 凭证轮换、撤销和审计由谁负责？

ApplicationSet 能减少 YAML 重复，却不会回答这些问题。规模不是 Application 数量，而是一次错误最多能走多远。

---

## 一套更稳妥的落地顺序

我会按下面的顺序引入 Argo CD：

1. **先做一条手动同步链路**：固定版本、单仓库、单集群、单应用，验证 diff 与健康状态。
2. **把 Application 与 AppProject 纳入 Git**：明确源、目标和资源范围，让权限审查与应用评审一起发生。
3. **建立可观测性**：监控 reconcile、Git 请求、清单生成、同步耗时、队列、缓存与失败原因。
4. **再开启自动同步**：先 `enabled`，再分别评估 `prune` 与 `selfHeal`，为删除和共享资源增加保护。
5. **演练恢复**：同时演练 Argo 历史回滚、Git revert、数据库迁移恢复与 Argo CD 控制面重建。
6. **最后引入 ApplicationSet 和多集群**：模板稳定、权限边界明确后再扩大生成范围。

这条路径看起来慢，却减少了最昂贵的一类返工：在团队还不知道一个开关意味着什么时，就先把开关复制到所有集群。

---

## 常见问题

### Argo CD 是 CI/CD 平台吗？

更准确地说，它是 Kubernetes 持续交付与 GitOps 调和工具。CI 仍需负责构建、测试、扫描和发布镜像；Argo CD 负责把期望配置交付到集群并持续比较状态。

### 自动同步会自动删除资源吗？

不会。自动 prune 需要显式启用；空应用还有 `allowEmpty` 保护。对关键资源可以使用确认式 prune/delete，并配合备份与 RBAC。

### 开启 selfHeal 后，线上手工修复会怎样？

当实际状态偏离 Git 时，self-heal 会尝试恢复 Git 状态。紧急修改如果需要保留，应尽快写回 Git；多源 Application 即使未开启 selfHeal，也可能因其他源变化触发自动同步。

### 可以直接回滚到历史版本吗？

可以使用 `argocd app rollback`，但自动同步必须先关闭。若 Git 仍指向新版本，历史回滚不是稳定终态；通常还要在 Git 中 revert 或提交修复。

### 所有应用都应该打开 Server-Side Apply 吗？

不应该把它当成无条件默认。它适合特定的清单大小、部分管理与字段所有权问题；启用前要检查 managedFields、共管控制器和迁移影响。

### ApplicationSet 生成的 Application 可以手工改吗？

可以短暂改到 Kubernetes 对象上，但控制器可能在下一次调和时按模板覆盖。长期变更应进入 ApplicationSet 模板或生成器数据源。

---

## 结语：Git 存放的不是事实，而是承诺

“Git 是唯一事实来源”很容易被说成口号。更准确的理解是：Git 保存了团队对期望状态的公开承诺，Argo CD 负责检查现实是否偏离这份承诺。

承诺本身仍可能错误，所以可靠性从来不只来自自动化。它来自有人评审变化，有边界限制权力，有证据解释状态，也有办法在错误发生时恢复。Argo CD 最有价值的地方，不是替工程师消灭判断，而是让判断留下历史，并让执行可以重复。

---

## 一手资料

- [Argo CD 官方稳定文档](https://argo-cd.readthedocs.io/en/stable/)
- [Getting Started 与版本固定说明](https://argo-cd.readthedocs.io/en/stable/getting_started/)
- [安装形态与高可用](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
- [ApplicationSet 与生成器](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/)
- [ApplicationSet 安全说明](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Security/)
- [自动同步语义](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Sync Options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [RBAC 配置](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- [Kubernetes 容器运行时](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)

*本文事实边界核对至 2026-07-31。版本支持、命令参数和安全默认值会变化，实施前请以所选 release 的对应文档与升级说明为准。*
