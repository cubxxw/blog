# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: space-library-profile-contracts.spec.ts >> the real library scroller restores reading position while Notes and Books keep their own documents
- Location: tests/e2e/space-library-profile-contracts.spec.ts:67:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    850

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - text: /
  - main [ref=f1e2]:
    - generic [ref=f1e3]:
      - heading "空间 · CUBXXW OS" [level=1] [ref=f1e4]
      - paragraph [ref=f1e5]: CUBXXW OS 工作区
      - region "CUBXXW OS 个人工作区" [ref=f1e6]:
        - generic [ref=f1e7]:
          - generic "三维咖啡馆。WASD 或方向键行走，拖动看四周。" [ref=f1e8]
          - generic "CUBXXW OS" [ref=f1e9]:
            - generic:
              - region "欢迎" [ref=f1e10]:
                - generic [ref=f1e11]:
                  - generic [ref=f1e12]:
                    - button "关闭窗口" [ref=f1e13] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=f1e14] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=f1e15] [cursor=pointer]: +
                  - strong: 欢迎
                  - button "窗口并排" [ref=f1e16] [cursor=pointer]: ◫
                - article [ref=f1e18]:
                  - generic [ref=f1e19]:
                    - generic [ref=f1e20]: Xinwei Xiong / cubxxw
                    - button "关于我 ↗" [ref=f1e21] [cursor=pointer]
                  - group [ref=f1e22]:
                    - generic "个人介绍与经历" [ref=f1e23] [cursor=pointer]:
                      - text: 个人介绍与经历
                      - generic [aria-hidden] [ref=f1e24]: ↗
                    - generic [ref=f1e25]:
                      - navigation "个人介绍目录" [ref=f1e26]:
                        - button "个人档案" [ref=f1e27] [cursor=pointer]
                        - button "这些年" [ref=f1e28] [cursor=pointer]
                        - button "阅读地图" [ref=f1e29] [cursor=pointer]
                      - generic [ref=f1e30]:
                        - paragraph [ref=f1e31]: CUBXXW / PROFILE
                        - heading "熊鑫伟 cubxxw" [level=3] [ref=f1e32]
                        - paragraph [ref=f1e33]: 熊鑫伟（cubxxw / BEAR，2001 年生）构建 AI 产品，关注 Agent 评估与可靠执行。曾参与 OpenIM 的工程和社区协作，在 cubxxw.com 公开项目实践与每月思考，旅行仍是生活的一部分。
                        - paragraph [ref=f1e34]: 更了解自己，更了解世界。
                        - generic [ref=f1e35]:
                          - link "简历与项目证据 ↗" [ref=f1e36] [cursor=pointer]:
                            - /url: https://resume.cubxxw.com
                          - link "GitHub ↗" [ref=f1e37] [cursor=pointer]:
                            - /url: https://github.com/cubxxw
                          - button "联系我 ↗" [ref=f1e38] [cursor=pointer]
                        - group [ref=f1e39]:
                          - generic "完整履历与公开资料" [ref=f1e40] [cursor=pointer]
                      - generic [ref=f1e41]:
                        - paragraph [ref=f1e42]: CUBXXW / ALONG THE WAY
                        - heading "这些年" [level=3] [ref=f1e43]
                        - list [ref=f1e44]:
                          - listitem [ref=f1e45]:
                            - time [ref=f1e46]: "2021"
                            - generic [ref=f1e47]:
                              - heading "第一篇博客" [level=4] [ref=f1e48]
                              - paragraph [ref=f1e49]: 注册了 GitHub，写下第一篇博客，开始公开自己的笔记。
                              - group [ref=f1e50]:
                                - generic "多一点细节" [ref=f1e51] [cursor=pointer]
                              - link "阅读《我的第一个博客》 ↗" [ref=f1e52] [cursor=pointer]:
                                - /url: /zh/growth/posts/my-first-blog/
                          - listitem [ref=f1e53]:
                            - time [ref=f1e54]: "2023"
                            - generic [ref=f1e55]:
                              - heading "OpenIM 与开源社区" [level=4] [ref=f1e56]
                              - paragraph [ref=f1e57]: 进入 OpenIM 实习，贡献代码，设计并主持社区双周会。
                              - group [ref=f1e58]:
                                - generic "多一点细节" [ref=f1e59] [cursor=pointer]
                              - link "阅读 2023 年度总结 ↗" [ref=f1e60] [cursor=pointer]:
                                - /url: /zh/growth/posts/2023-annual-summary-reflections-and-aspirations/
                          - listitem [ref=f1e61]:
                            - time [ref=f1e62]: "2024"
                            - generic [ref=f1e63]:
                              - heading "毕业，出发" [level=4] [ref=f1e64]
                              - paragraph [ref=f1e65]: 第一次出国、毕业、工作，再离职，开始一边旅行一边构建。
                              - group [ref=f1e66]:
                                - generic "多一点细节" [ref=f1e67] [cursor=pointer]
                              - link "阅读 2024 年度回顾 ↗" [ref=f1e68] [cursor=pointer]:
                                - /url: /zh/growth/posts/2024-annual-review/
                          - listitem [ref=f1e69]:
                            - time [ref=f1e70]: "2025"
                            - generic [ref=f1e71]:
                              - heading "尼泊尔 ACT" [level=4] [ref=f1e72]
                              - paragraph [ref=f1e73]: 走完第一次高原徒步。从 2 月起，开始每月写思考笔记。
                              - group [ref=f1e74]:
                                - generic "多一点细节" [ref=f1e75] [cursor=pointer]
                              - link "阅读 2025-2026 年度总结 ↗" [ref=f1e76] [cursor=pointer]:
                                - /url: /zh/growth/posts/2025-annual-review/
                          - listitem [ref=f1e77]:
                            - time [ref=f1e78]: "2026"
                            - generic [ref=f1e79]:
                              - heading "产品和新的工作" [level=4] [ref=f1e80]
                              - paragraph [ref=f1e81]: 继续做产品、写作。8 月 10 日，结束约两年的空窗，开始新的工作。
                              - group [ref=f1e82]:
                                - generic "多一点细节" [ref=f1e83] [cursor=pointer]
                              - link "阅读《不会让恐惧替我做决定》 ↗" [ref=f1e84] [cursor=pointer]:
                                - /url: /zh/growth/posts/2026-08-10-fear-does-not-decide-for-me/
                      - generic [ref=f1e85]:
                        - paragraph [ref=f1e86]: CUBXXW / READING PATHS
                        - group [ref=f1e88]:
                          - generic "想读我的文字？ 展开四条精选阅读路径" [ref=f1e89] [cursor=pointer]:
                            - text: 想读我的文字？
                            - generic [ref=f1e90]: 展开四条精选阅读路径
              - region "你的笔记" [ref=f1e94]:
                - generic [ref=f1e95]:
                  - generic [ref=f1e96]:
                    - button "关闭窗口" [ref=f1e97] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=f1e98] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=f1e99] [cursor=pointer]: +
                  - strong: 你的笔记
                  - button "窗口并排" [ref=f1e100] [cursor=pointer]: ◫
                - generic [ref=f1e102]:
                  - generic [ref=f1e103]:
                    - generic [ref=f1e104]: 属于你的笔记
                    - generic [ref=f1e105]:
                      - button "保存到沙盒" [ref=f1e106] [cursor=pointer]
                      - button "导出 .md ↗" [ref=f1e107] [cursor=pointer]
                  - textbox "你的笔记" [ref=f1e108]:
                    - /placeholder: "逛到这里，想到了什么？\n\n可以写下来，下次回来继续。"
                    - text: 目录、文章、书架之间，同一份笔记继续写。继续。
                  - generic [ref=f1e109]:
                    - generic [ref=f1e110]: 仅保存在当前浏览器，不会公开
                    - generic [ref=f1e111]: 23 / 40000
              - region "我的书架" [ref=f1e115]:
                - generic [ref=f1e116]:
                  - generic [ref=f1e117]:
                    - button "关闭窗口" [ref=f1e118] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=f1e119] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=f1e120] [cursor=pointer]: +
                  - strong: 我的书架
                  - button "窗口并排" [ref=f1e121] [cursor=pointer]: ◫
                - generic [ref=f1e122]:
                  - generic [ref=f1e123]:
                    - generic [ref=f1e124]: 熊鑫伟 · 自著
                    - button "文章目录" [ref=f1e125] [cursor=pointer]
                  - generic [ref=f1e126]:
                    - article [ref=f1e127]:
                      - generic [ref=f1e128]:
                        - generic [ref=f1e129]: BEAR / 01
                        - strong [ref=f1e130]: 越南
                        - generic [ref=f1e131]: 熊鑫伟 · 自著
                      - paragraph [ref=f1e132]: 胡志明的车流、大叻的雾、会安的灯——两个月慢火炖出来的湄公河随笔。
                      - link "阅读《越南》 ↗" [ref=f1e133] [cursor=pointer]:
                        - /url: https://vietnam.cubxxw.com/
                    - article [ref=f1e134]:
                      - generic [ref=f1e135]:
                        - generic [ref=f1e136]: BEAR / 02
                        - strong [ref=f1e137]: 吴哥窟
                        - generic [ref=f1e138]: 熊鑫伟 · 自著
                      - paragraph [ref=f1e139]: 石头、树根与帝国——走过吴哥的庙宇与废墟，听一个逝去帝国的回声。
                      - link "阅读《吴哥窟》 ↗" [ref=f1e140] [cursor=pointer]:
                        - /url: https://angkor.cubxxw.com/
                    - article [ref=f1e141]:
                      - generic [ref=f1e142]:
                        - generic [ref=f1e143]: BEAR / 03
                        - strong [ref=f1e144]: 西藏
                        - generic [ref=f1e145]: 熊鑫伟 · 自著
                      - paragraph [ref=f1e146]: 海拔 3650 米的拉萨——被高原强制降速的一段路，看云、看人、看信仰怎么落进日子里。
                      - link "阅读《西藏》 ↗" [ref=f1e147] [cursor=pointer]:
                        - /url: https://tibet.cubxxw.com/
                    - article [ref=f1e148]:
                      - generic [ref=f1e149]:
                        - generic [ref=f1e150]: BEAR / 04
                        - strong [ref=f1e151]: 乱世为龙
                        - generic [ref=f1e152]: 熊鑫伟 · 自著
                      - paragraph [ref=f1e153]: 一部写后周太祖郭威的历史长篇——从颈刺飞雀的潞州孤儿，到碎玉罢租、薄葬嵩陵的开国天子。史实为骨，文学为肉。
                      - link "阅读《乱世为龙》 ↗" [ref=f1e154] [cursor=pointer]:
                        - /url: https://wudai.cubxxw.com/
              - region "文章与思考" [active] [ref=f1e158]:
                - generic [ref=f1e159]:
                  - generic [ref=f1e160]:
                    - button "关闭窗口" [ref=f1e161] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=f1e162] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=f1e163] [cursor=pointer]: +
                  - strong: 文章与思考
                  - button "窗口并排" [ref=f1e164] [cursor=pointer]: ◫
                - generic [ref=f1e166]:
                  - generic [ref=f1e167]:
                    - generic [ref=f1e168]: 公开文章 / 189
                    - searchbox "筛选文章" [ref=f1e169]: Go
                  - generic [ref=f1e170]:
                    - complementary [ref=f1e171]:
                      - generic [ref=f1e172]:
                        - paragraph [ref=f1e173]: 阅读目录
                        - button "全部文章" [ref=f1e174] [cursor=pointer]
                        - button "AI Agent" [ref=f1e175] [cursor=pointer]
                        - button "工程实践" [pressed] [ref=f1e176] [cursor=pointer]
                        - button "思考与笔记" [ref=f1e177] [cursor=pointer]
                        - button "你的收藏" [ref=f1e178] [cursor=pointer]
                      - navigation "你的空间" [ref=f1e179]:
                        - button "笔记" [ref=f1e180] [cursor=pointer]
                        - button "书架" [ref=f1e181] [cursor=pointer]
                    - region "文章列表" [ref=f1e182]:
                      - button "2025.05.09 Argo CD 实战指南：Kubernetes GitOps、同步策略与生产安全 讲清 Argo CD 的 GitOps 控制循环、Application、AppProject 与 ApplicationSet，给出安装和首个应用示例，分析自动同步、回滚、Server-Side Apply、多集群权限及生产安全取舍，帮助平台团队建立可审计、可恢复、不过度授权的 Kubernetes 持续交付体系。" [ref=f1e183] [cursor=pointer]:
                        - generic [ref=f1e184]: 2025.05.09
                        - strong [ref=f1e185]: Argo CD 实战指南：Kubernetes GitOps、同步策略与生产安全
                        - generic [ref=f1e186]: 讲清 Argo CD 的 GitOps 控制循环、Application、AppProject 与 ApplicationSet，给出安装和首个应用示例，分析自动同步、回滚、Server-Side Apply、多集群权限及生产安全取舍，帮助平台团队建立可审计、可恢复、不过度授权的 Kubernetes 持续交付体系。
                      - button "2024.08.06 Kubernetes 资源与学习路径总结 本文提供了详细的 Kubernetes 资源和学习路径，涵盖了 CNI、CRI、CSI 以及云原生环境中的核心技术。我们还分享了一些重要的学习资源和学习方法，帮助读者进一步深造 Kubernetes 生态系统。" [ref=f1e187] [cursor=pointer]:
                        - generic [ref=f1e188]: 2024.08.06
                        - strong [ref=f1e189]: Kubernetes 资源与学习路径总结
                        - generic [ref=f1e190]: 本文提供了详细的 Kubernetes 资源和学习路径，涵盖了 CNI、CRI、CSI 以及云原生环境中的核心技术。我们还分享了一些重要的学习资源和学习方法，帮助读者进一步深造 Kubernetes 生态系统。
                      - 'button "2024.01.25 Go 源码里的这些 go: 指令 && go 自动化工具 本文探讨了 Go 源码中的特殊指令（go: 指令）以及这些指令如何在 Go 项目中应用。同时，文章还介绍了几种常用的 Go 自动化工具，它们如何帮助开发者优化工作流程。" [ref=f1e191] [cursor=pointer]':
                        - generic [ref=f1e192]: 2024.01.25
                        - strong [ref=f1e193]: "Go 源码里的这些 go: 指令 && go 自动化工具"
                        - generic [ref=f1e194]: "本文探讨了 Go 源码中的特殊指令（go: 指令）以及这些指令如何在 Go 项目中应用。同时，文章还介绍了几种常用的 Go 自动化工具，它们如何帮助开发者优化工作流程。"
                      - button "2024.01.24 Go 语言中的并发类型检查与跨平台开发 探索 Go 语言中并发类型检查和高效跨平台开发技术，阐述最佳实践和高级概念，以构建健壮的应用程序。" [ref=f1e195] [cursor=pointer]:
                        - generic [ref=f1e196]: 2024.01.24
                        - strong [ref=f1e197]: Go 语言中的并发类型检查与跨平台开发
                        - generic [ref=f1e198]: 探索 Go 语言中并发类型检查和高效跨平台开发技术，阐述最佳实践和高级概念，以构建健壮的应用程序。
                      - button "2023.11.25 GitOps 实践理论：Kubernetes 部署策略深入解析 探索 GitOps 在 Kubernetes 中的实践，详细解析使用 Argo Rollouts 实现金丝雀和蓝绿部署策略。本文将为开发者提供深入的理论和实践指导，帮助优化持续部署流程。" [ref=f1e199] [cursor=pointer]:
                        - generic [ref=f1e200]: 2023.11.25
                        - strong [ref=f1e201]: GitOps 实践理论：Kubernetes 部署策略深入解析
                        - generic [ref=f1e202]: 探索 GitOps 在 Kubernetes 中的实践，详细解析使用 Argo Rollouts 实现金丝雀和蓝绿部署策略。本文将为开发者提供深入的理论和实践指导，帮助优化持续部署流程。
                      - button "2023.11.06 Hugo 的高级教程 面向已有 Hugo 基础、需要维护博客或主题的开发者，整理模块挂载、Go 模板的管道与作用域、模板查找顺序、列表与分页，以及 shortcode、i18n 和 data 文件的用法，帮助定位页面渲染与内容复用问题。" [ref=f1e203] [cursor=pointer]:
                        - generic [ref=f1e204]: 2023.11.06
                        - strong [ref=f1e205]: Hugo 的高级教程
                        - generic [ref=f1e206]: 面向已有 Hugo 基础、需要维护博客或主题的开发者，整理模块挂载、Go 模板的管道与作用域、模板查找顺序、列表与分页，以及 shortcode、i18n 和 data 文件的用法，帮助定位页面渲染与内容复用问题。
                      - button "2023.09.28 Kubernetes 的 CNI，CRI，CSI 详解 深入探讨Kubernetes中的CNI（容器网络接口）、CRI（容器运行时接口）和CSI（容器存储接口）。本文将详细解释这些关键组件的作用，以及它们在云原生环境中的重要性和应用场景。" [ref=f1e207] [cursor=pointer]:
                        - generic [ref=f1e208]: 2023.09.28
                        - strong [ref=f1e209]: Kubernetes 的 CNI，CRI，CSI 详解
                        - generic [ref=f1e210]: 深入探讨Kubernetes中的CNI（容器网络接口）、CRI（容器运行时接口）和CSI（容器存储接口）。本文将详细解释这些关键组件的作用，以及它们在云原生环境中的重要性和应用场景。
                      - button "2023.09.28 Kubernetes 控制平面 - 调度器 探讨 Kubernetes 的调度器组件如何工作，它是如何决定将容器放置在哪个节点上的，以及这对集群管理和容器编排有何重要意义。" [ref=f1e211] [cursor=pointer]:
                        - generic [ref=f1e212]: 2023.09.28
                        - strong [ref=f1e213]: Kubernetes 控制平面 - 调度器
                        - generic [ref=f1e214]: 探讨 Kubernetes 的调度器组件如何工作，它是如何决定将容器放置在哪个节点上的，以及这对集群管理和容器编排有何重要意义。
                      - button "2023.09.28 Kubernetes 控制平面 - Kubectl 详细讲解 kubelet 架构kubelet 管理 Pod 的核心流程kubelet 节点管理Pod 管理Pod" [ref=f1e215] [cursor=pointer]:
                        - generic [ref=f1e216]: 2023.09.28
                        - strong [ref=f1e217]: Kubernetes 控制平面 - Kubectl 详细讲解
                        - generic [ref=f1e218]: kubelet 架构kubelet 管理 Pod 的核心流程kubelet 节点管理Pod 管理Pod
                      - button "2023.09.26 深入了解Kubernetes等组件之ETCD 这一篇来深入并且贯穿的讲解 ETCD 和 Raft。并且站在 Kubernetes 的角度来深入剖析 ETCD。" [ref=f1e219] [cursor=pointer]:
                        - generic [ref=f1e220]: 2023.09.26
                        - strong [ref=f1e221]: 深入了解Kubernetes等组件之ETCD
                        - generic [ref=f1e222]: 这一篇来深入并且贯穿的讲解 ETCD 和 Raft。并且站在 Kubernetes 的角度来深入剖析 ETCD。
                      - button "2023.09.16 GoReleaser v2 教程：用 GitHub Actions 自动发布 Go 手把手带你写 .goreleaser.yaml：builds、archives、Docker 镜像、签名到 GitHub Release 逐段讲清楚，最后接入 GitHub Actions，推一个 tag 就能自动多平台发布，不用再手动打包传附件。" [ref=f1e223] [cursor=pointer]:
                        - generic [ref=f1e224]: 2023.09.16
                        - strong [ref=f1e225]: GoReleaser v2 教程：用 GitHub Actions 自动发布 Go
                        - generic [ref=f1e226]: 手把手带你写 .goreleaser.yaml：builds、archives、Docker 镜像、签名到 GitHub Release 逐段讲清楚，最后接入 GitHub Actions，推一个 tag 就能自动多平台发布，不用再手动打包传附件。
                      - button "2023.09.12 关于我的 Hugo 博客 (教程) 本教程将指导你如何使用 Hugo —— 一款流行的静态网站生成器 —— 来搭建和管理个人博客。详细介绍从安装到配置的各个步骤。" [ref=f1e227] [cursor=pointer]:
                        - generic [ref=f1e228]: 2023.09.12
                        - strong [ref=f1e229]: 关于我的 Hugo 博客 (教程)
                        - generic [ref=f1e230]: 本教程将指导你如何使用 Hugo —— 一款流行的静态网站生成器 —— 来搭建和管理个人博客。详细介绍从安装到配置的各个步骤。
                      - button "2023.09.11 速读开源项目 Sealos 的源码 一篇文章从头开始教会如何快速优雅地阅读学习一个顶级的开源项目 Sealos。" [ref=f1e231] [cursor=pointer]:
                        - generic [ref=f1e232]: 2023.09.11
                        - strong [ref=f1e233]: 速读开源项目 Sealos 的源码
                        - generic [ref=f1e234]: 一篇文章从头开始教会如何快速优雅地阅读学习一个顶级的开源项目 Sealos。
                      - button "2023.08.16 我是如何优雅设计 OpenIM 多进程管理策略的 本文详述了在 OpenIM 中实施多进程管理的策略和技术，OpenIM 的 System 部署设计； 探讨如何通过进程隔离和资源控制来提升系统稳定性和扩展性。" [ref=f1e235] [cursor=pointer]:
                        - generic [ref=f1e236]: 2023.08.16
                        - strong [ref=f1e237]: 我是如何优雅设计 OpenIM 多进程管理策略的
                        - generic [ref=f1e238]: 本文详述了在 OpenIM 中实施多进程管理的策略和技术，OpenIM 的 System 部署设计； 探讨如何通过进程隔离和资源控制来提升系统稳定性和扩展性。
                      - button "2023.06.19 Go 调试测试以及调试工具 dlv 学习 本文深入介绍 Go 语言的调试过程，测试方法以及如何使用调试工具 dlv 来优化代码。" [ref=f1e239] [cursor=pointer]:
                        - generic [ref=f1e240]: 2023.06.19
                        - strong [ref=f1e241]: Go 调试测试以及调试工具 dlv 学习
                        - generic [ref=f1e242]: 本文深入介绍 Go 语言的调试过程，测试方法以及如何使用调试工具 dlv 来优化代码。
                      - button "2023.04.23 Openkf 多架构镜像的构建策略设计 本文探讨了针对 Openkf 的多架构镜像构建策略的设计，涵盖了在不同环境下的构建和部署方案，旨在提高应用的可移植性和效率。" [ref=f1e243] [cursor=pointer]:
                        - generic [ref=f1e244]: 2023.04.23
                        - strong [ref=f1e245]: Openkf 多架构镜像的构建策略设计
                        - generic [ref=f1e246]: 本文探讨了针对 Openkf 的多架构镜像构建策略的设计，涵盖了在不同环境下的构建和部署方案，旨在提高应用的可移植性和效率。
                      - button "2023.02.13 跨平台以及多架构编译设计 用 Docker buildx 结合 QEMU 交叉编译 arm/arm64/amd64 镜像的实战记录：如何按目标架构调整 Dockerfile 基础镜像和依赖下载地址，复杂构建为什么要上真机验证，附 docker buildx imagetools inspect 检查方法。" [ref=f1e247] [cursor=pointer]:
                        - generic [ref=f1e248]: 2023.02.13
                        - strong [ref=f1e249]: 跨平台以及多架构编译设计
                        - generic [ref=f1e250]: 用 Docker buildx 结合 QEMU 交叉编译 arm/arm64/amd64 镜像的实战记录：如何按目标架构调整 Dockerfile 基础镜像和依赖下载地址，复杂构建为什么要上真机验证，附 docker buildx imagetools inspect 检查方法。
            - navigation "应用 Dock" [ref=f1e254]:
              - button "CUBXXW OS 空间菜单" [ref=f1e255] [cursor=pointer]:
                - generic: CUBXXW OS
              - button "欢迎" [ref=f1e260] [cursor=pointer]
              - button "文章与思考" [ref=f1e268] [cursor=pointer]
              - button "产品" [ref=f1e274] [cursor=pointer]
              - button "旅途相册" [ref=f1e281] [cursor=pointer]
              - button "你的笔记" [ref=f1e288] [cursor=pointer]
              - button "空间助手" [ref=f1e294] [cursor=pointer]
              - button "工作区设置" [ref=f1e300] [cursor=pointer]
        - navigation "咖啡馆导览":
          - generic:
            - button "回到咖啡馆" [ref=f1e306] [cursor=pointer]: ← 回到咖啡馆
            - generic: CUBXXW OS
            - button "换个风景" [ref=f1e307] [cursor=pointer]: 换个风景 ↗
```

# Test source

```ts
  1  | import {test,expect,type Page,type Locator} from '../helpers/frozen-site';
  2  | import {enterWorkspace} from '../helpers/space-entry';
  3  | 
  4  | test.use({reducedMotion:'reduce',channel:'chromium',launchOptions:{args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']}});
  5  | type Article={url:string,title:string,description:string,date:string,section:string,tags:string[]};
  6  | const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  7  | const projectedFontCSS=(node:Locator)=>node.evaluate((el:HTMLElement)=>parseFloat(getComputedStyle(el).fontSize)*el.getBoundingClientRect().width/el.offsetWidth);
  8  | const noOverflow=(node:Locator)=>node.evaluate(el=>el.scrollWidth<=el.clientWidth+1);
  9  | async function openApp(page:Page,app:string){
  10 |   const dock=page.locator(`[data-space-dock] [data-open="${app}"]`);
  11 |   if(await dock.isVisible())await dock.click();
  12 |   else {await page.locator('[data-space-menu-trigger]').click();await page.locator('.space-menu [data-space-launchpad-trigger]').click();await page.locator(`[data-launchpad-app="${app}"]`).click();}
  13 |   const win=page.locator(`[data-space-window="${app}"]`);await expect(win).toBeVisible();return win;
  14 | }
  15 | async function setup(page:Page,locale='zh',theme='light'){
  16 |   await page.goto(locale==='zh'?'/zh/projects/':'/projects/');await enterWorkspace(page);await expect(page.locator('[data-bear-workspace]')).toHaveAttribute('data-world-ready','true');
  17 |   await page.evaluate(theme=>(window as any).BearSpace.execute('theme',{value:theme}),theme);
  18 | }
  19 | async function hit(control:Locator){
  20 |   await control.scrollIntoViewIfNeeded();const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  21 |   expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);return box;
  22 | }
  23 | async function choose(page:Page,reader:Locator,value:string){
  24 |   if((page.viewportSize()?.width||0)<=640){const picker=reader.locator('[data-library-select]');await hit(picker);await picker.focus();const values=['all','ai-agent','engineering','growth','favorites'];await picker.press('Home');for(let n=0;n<values.indexOf(value);n++)await picker.press('ArrowDown');await expect(picker).toHaveValue(value);await frames(page);await expect(picker).toBeFocused();}
  25 |   else {const control=reader.locator(`[data-library-filter="${value}"]`);await hit(control);await control.click();await frames(page);await expect(control).toBeFocused();}
  26 |   await expect(reader.locator(`[data-library-filter="${value}"]`)).toHaveAttribute('aria-pressed','true');
  27 | }
  28 | const views=[
  29 |   {width:320,height:844,locale:'zh',theme:'light',coarse:true},
  30 |   {width:390,height:844,locale:'en',theme:'dark',coarse:true},
  31 |   {width:620,height:844,locale:'zh',theme:'dark',coarse:true},
  32 |   {width:844,height:390,locale:'en',theme:'light',coarse:true},
  33 |   {width:1440,height:900,locale:'zh',theme:'light',coarse:false},
  34 |   {width:1440,height:900,locale:'en',theme:'dark',coarse:false},
  35 | ];
  36 | for(const view of views)test.describe(`${view.width}×${view.height} ${view.locale} ${view.theme} library/profile`,()=>{
  37 |   test.use({viewport:{width:view.width,height:view.height},hasTouch:view.coarse,isMobile:view.coarse});
  38 |   test('real writing and profile remain readable with reachable choices and complete titles',async({page})=>{
  39 |     await setup(page,view.locale,view.theme);const catalog=await page.locator('[data-space-catalog]').evaluate(el=>JSON.parse(el.textContent||'{}')) as {articles:Article[]};const reader=await openApp(page,'reader'),query=reader.locator('[data-library-query]'),picker=reader.locator('[data-library-select]'),list=reader.locator('[data-library-list]');
  40 |     const originalQuery=await query.elementHandle(),originalPicker=await picker.elementHandle();await expect(list.locator('.space-list-item')).toHaveCount(catalog.articles.length);
  41 |     expect(await picker.locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value))).toEqual(['all','ai-agent','engineering','growth','favorites']);
  42 |     if(view.width<=640){await expect(picker).toBeVisible();await expect(reader.locator('.space-library-directory')).toBeHidden();await hit(picker);}else{await expect(picker).toBeHidden();for(const control of await reader.locator('[data-library-filter]').all()){await hit(control);expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(14);}}
  43 |     const longest=catalog.articles.reduce((best,item,i)=>item.title.length>catalog.articles[best].title.length?i:best,0),item=list.locator('.space-list-item').nth(longest);await item.scrollIntoViewIfNeeded();await expect(item.locator('strong')).toHaveText(catalog.articles[longest].title);await expect(item.locator('span')).toHaveText(catalog.articles[longest].description||'');
  44 |     expect(await projectedFontCSS(item.locator('strong'))).toBeGreaterThanOrEqual(15);expect(await projectedFontCSS(item.locator('span'))).toBeGreaterThanOrEqual(14);expect(await projectedFontCSS(item.locator('small'))).toBeGreaterThanOrEqual(12);expect(await item.locator('strong').evaluate(el=>getComputedStyle(el).whiteSpace==='normal'&&el.scrollHeight<=el.clientHeight+1)).toBe(true);
  45 |     const summary=await item.locator('span').evaluate((el:HTMLElement)=>({clamp:getComputedStyle(el).webkitLineClamp,height:el.offsetHeight,line:parseFloat(getComputedStyle(el).lineHeight)}));expect(summary.clamp).toBe('3');expect(summary.height).toBeLessThanOrEqual(summary.line*3+1);expect(await noOverflow(reader.locator('[data-window-body]'))).toBe(true);
  46 |     await choose(page,reader,'engineering');expect(await query.evaluate((el,old)=>el===old,originalQuery)).toBe(true);expect(await picker.evaluate((el,old)=>el===old,originalPicker)).toBe(true);await query.fill('dlv');await choose(page,reader,'all');await expect(query).toHaveValue('dlv');expect(await query.evaluate((el,old)=>el===old,originalQuery)).toBe(true);await expect(list.locator('.space-list-item')).not.toHaveCount(0);
  47 |     for(const app of ['notes','books'])await hit(reader.locator(`.space-library-actions [data-open="${app}"]`));
  48 |     const welcome=await openApp(page,'welcome'),profile=welcome.locator('[data-space-profile]');if(await profile.evaluate((el:HTMLDetailsElement)=>el.open))await profile.locator(':scope > summary').click();
  49 |     expect(await projectedFontCSS(welcome.locator('.space-welcome__intro'))).toBeGreaterThanOrEqual(15);for(const control of await welcome.locator('.space-welcome__routes button,.space-enter,.space-welcome__foot button').all()){await hit(control);expect(await projectedFontCSS(control)).toBeGreaterThanOrEqual(14);}
  50 |     await welcome.locator('.space-welcome__foot button').click();await expect(profile).toHaveAttribute('open','');const identity=profile.locator('[data-profile-section="identity"]');expect(await projectedFontCSS(identity.locator('p').nth(1))).toBeGreaterThanOrEqual(15);expect(await projectedFontCSS(identity.locator('.space-profile__mission'))).toBeGreaterThanOrEqual(15);
  51 |     const expectedLinks=await page.locator('[data-space-profile-template]').evaluate((el:HTMLTemplateElement)=>[...el.content.querySelectorAll<HTMLAnchorElement>('.space-profile__identity > .space-profile__links a')].map(a=>a.getAttribute('href')));const links=identity.locator(':scope > .space-profile__links a');await expect(links).toHaveCount(expectedLinks.length);
  52 |     for(let i=0;i<expectedLinks.length;i++){await expect(links.nth(i)).toHaveAttribute('href',expectedLinks[i]!);await expect(links.nth(i)).toHaveAttribute('rel',/noopener/);await hit(links.nth(i));expect(await projectedFontCSS(links.nth(i))).toBeGreaterThanOrEqual(14);}
  53 |     for(const control of await profile.locator('.space-profile__nav button').all())await hit(control);await profile.locator('[data-profile-target="story"]').click();expect(await projectedFontCSS(profile.locator('.space-profile__chapters p').first())).toBeGreaterThanOrEqual(15);await profile.locator('[data-profile-target="start-here"]').click();expect(await projectedFontCSS(profile.locator('.space-profile__reading .post-content'))).toBeGreaterThanOrEqual(15);expect(await noOverflow(welcome.locator('[data-window-body]'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
  54 |   });
  55 | });
  56 | 
  57 | test.describe('390 English bookmark semantics and recovery',()=>{
  58 |   test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  59 |   test('Save, favorites, reload and remove expose the actual persistent state',async({page})=>{
  60 |     await setup(page,'en');const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');const item=reader.locator('.space-list-item').first(),url=(await item.getAttribute('data-payload'))!,title=(await item.locator('strong').textContent())!;await item.click();const favorite=reader.locator('[data-reader-favorite]'),purpose=`Bookmark article: ${title}`;await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toHaveAttribute('aria-pressed','false');const original=await favorite.elementHandle();
  61 |     const originalLink=reader.locator('.space-reader-toolbar a');await expect(originalLink).toHaveAttribute('href',new URL(url,page.url()).href);await hit(originalLink);await page.evaluate(()=>{(window as any).__libraryOriginalClicks=[];document.addEventListener('click',event=>{const a=(event.target as Element).closest<HTMLAnchorElement>('.space-reader-toolbar a');if(a){event.preventDefault();(window as any).__libraryOriginalClicks.push(a.href);}},true);});await originalLink.click();expect(await page.evaluate(()=>(window as any).__libraryOriginalClicks)).toEqual([new URL(url,page.url()).href]);
  62 |     await hit(favorite);await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','true');await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toContainText('Saved');await expect(favorite).toBeFocused();expect(await favorite.evaluate((el,old)=>el===old,original)).toBe(true);expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().favorites)).toContain(url);
  63 |     const back=reader.locator('.space-reader-toolbar [data-open="reader"]');await hit(back);await back.click();await reader.locator('[data-library-query]').fill('');await choose(page,reader,'favorites');await expect(reader.locator('.space-list-item')).toHaveCount(1);await page.reload();await enterWorkspace(page);await openApp(page,'reader');await expect(reader.locator('[data-library-select]')).toHaveValue('favorites');await expect(reader.locator('[data-library-query]')).toHaveValue('');await expect(reader.locator('.space-list-item')).toHaveCount(1);await reader.locator('.space-list-item').click();await expect(favorite).toHaveAttribute('aria-pressed','true');await hit(favorite);await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','false');await expect(favorite).toHaveAttribute('aria-label',purpose);await expect(favorite).toContainText('Save');await back.click();await expect(reader.locator('.space-library-empty h3')).toHaveText('No bookmarks yet');expect(await page.evaluate(()=>(window as any).BearSpace.snapshot().favorites)).not.toContain(url);const recover=reader.locator('[data-library-recover]');await hit(recover);await recover.click();await expect(reader.locator('[data-library-select]')).toHaveValue('all');await expect(reader.locator('[data-library-query]')).toBeFocused();
  64 |   });
  65 | });
  66 | 
  67 | test('the real library scroller restores reading position while Notes and Books keep their own documents',async({page})=>{
  68 |   await page.setViewportSize({width:1440,height:900});await setup(page);const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]'),draft='目录、文章、书架之间，同一份笔记继续写。';await editor.fill(draft);const originalEditor=await editor.elementHandle(),reader=await openApp(page,'reader');await choose(page,reader,'engineering');await reader.locator('[data-library-query]').fill('Go');const list=reader.locator('[data-library-list]');expect(await list.locator('.space-list-item').count()).toBeGreaterThan(3);const box=(await list.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,850);await expect.poll(()=>list.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);await frames(page);const readingScroll=await list.evaluate(el=>el.scrollTop);expect(await reader.locator('[data-window-body]').evaluate(el=>el.scrollTop)).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(readingScroll);
  69 |   const url=await list.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll<HTMLElement>('.space-list-item')].find(item=>{const b=item.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;})!.dataset.payload!;});await list.locator(`[data-payload="${url}"]`).click();const back=reader.locator('.space-reader-toolbar [data-open="reader"]');await hit(back);await back.click();await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);const originalList=await list.elementHandle();
  70 |   await reader.locator('[data-window-action="minimize"]').click();await openApp(page,'reader');expect(await list.evaluate((el,old)=>el===old,originalList)).toBe(true);await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);const noteEntry=reader.locator('.space-library-actions [data-open="notes"]');await hit(noteEntry);await noteEntry.click();expect(await editor.evaluate((el,old)=>el===old,originalEditor)).toBe(true);await expect(editor).toHaveValue(draft);await editor.press('End');await editor.pressSequentially('继续。');await openApp(page,'reader');const bookEntry=reader.locator('.space-library-actions [data-open="books"]');await hit(bookEntry);await bookEntry.click();const books=page.locator('[data-space-window="books"]');await expect(books.locator('.space-book')).toHaveCount(4);await books.locator('.space-books-toolbar [data-open="reader"]').click();await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);
> 71 |   await page.reload();await enterWorkspace(page);await openApp(page,'reader');await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);await openApp(page,'notes');await expect(editor).toHaveValue(draft+'继续。');
     |                                                                                                                                                                                                                                                                                                                                                                    ^ Error: expect(received).toBeLessThanOrEqual(expected)
  72 | });
  73 | 
  74 | test('the original public favorite action synchronizes state and semantics without replacing the reader',async({page})=>{
  75 |   await page.setViewportSize({width:1440,height:900});await setup(page,'en');const reader=await openApp(page,'reader');await reader.locator('[data-library-query]').fill('dlv');const item=reader.locator('.space-list-item').first(),url=(await item.getAttribute('data-payload'))!,title=(await item.locator('strong').textContent())!;await item.click();const favorite=reader.locator('[data-reader-favorite]'),body=reader.locator('[data-reader-body] .post-content'),windowBody=reader.locator('[data-window-body]');await expect(body).toBeVisible();await expect(favorite).toHaveAttribute('aria-pressed','false');await favorite.focus();const originalButton=await favorite.elementHandle(),originalBody=await body.elementHandle(),text=await body.textContent(),readingScroll=await windowBody.evaluate(el=>el.scrollTop);expect(text!.length).toBeGreaterThan(100);
  76 |   for(const saved of [true,false]){
  77 |     expect(await page.evaluate(url=>(window as any).BearSpace.execute('favorite',{url}),url)).toBe(true);await frames(page);expect(await page.evaluate(url=>(window as any).BearSpace.snapshot().favorites.includes(url),url)).toBe(saved);await expect(favorite).toHaveAttribute('aria-pressed',String(saved));await expect(favorite).toHaveAttribute('aria-label',`Bookmark article: ${title}`);await expect(favorite).toContainText(saved?'Saved':'Save');await expect(favorite.locator('span[aria-hidden="true"]')).toHaveText(saved?'★':'☆');expect(await favorite.evaluate((el,old)=>el===old,originalButton)).toBe(true);await expect(favorite).toBeFocused();expect(await body.evaluate((el,old)=>el===old,originalBody)).toBe(true);await expect(body).toHaveText(text!);expect(await windowBody.evaluate((el,expected)=>Math.abs(el.scrollTop-expected),readingScroll)).toBeLessThanOrEqual(1);
  78 |   }
  79 | });
  80 | 
```