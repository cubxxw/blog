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
Received:    NaN

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content":
    - /url: "#main-content"
  - text: /
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "空间 · CUBXXW OS" [level=1] [ref=e4]
      - paragraph [ref=e5]: CUBXXW OS 工作区
      - region "CUBXXW OS 个人工作区" [ref=e6]:
        - generic [ref=e7]:
          - generic "三维咖啡馆。WASD 或方向键行走，拖动看四周。" [ref=e8]
          - generic "CUBXXW OS" [ref=e9]:
            - generic:
              - region "欢迎" [ref=e10]:
                - generic [ref=e11]:
                  - generic [ref=e12]:
                    - button "关闭窗口" [ref=e13] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=e14] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=e15] [cursor=pointer]: +
                  - strong: 欢迎
                  - button "窗口并排" [ref=e16] [cursor=pointer]: ◫
                - article [ref=e18]:
                  - generic [ref=e19]:
                    - generic [ref=e20]: Xinwei Xiong / cubxxw
                    - button "关于我 ↗" [ref=e21] [cursor=pointer]
                  - group [ref=e22]:
                    - generic "个人介绍与经历" [ref=e23] [cursor=pointer]:
                      - text: 个人介绍与经历
                      - generic [aria-hidden] [ref=e24]: ↗
                    - generic [ref=e25]:
                      - navigation "个人介绍目录" [ref=e26]:
                        - button "个人档案" [ref=e27] [cursor=pointer]
                        - button "这些年" [ref=e28] [cursor=pointer]
                        - button "阅读地图" [ref=e29] [cursor=pointer]
                      - generic [ref=e30]:
                        - paragraph [ref=e31]: CUBXXW / PROFILE
                        - heading "熊鑫伟 cubxxw" [level=3] [ref=e32]
                        - paragraph [ref=e33]: 熊鑫伟（cubxxw / BEAR，2001 年生）构建 AI 产品，关注 Agent 评估与可靠执行。曾参与 OpenIM 的工程和社区协作，在 cubxxw.com 公开项目实践与每月思考，旅行仍是生活的一部分。
                        - paragraph [ref=e34]: 更了解自己，更了解世界。
                        - generic [ref=e35]:
                          - link "简历与项目证据 ↗" [ref=e36] [cursor=pointer]:
                            - /url: https://resume.cubxxw.com
                          - link "GitHub ↗" [ref=e37] [cursor=pointer]:
                            - /url: https://github.com/cubxxw
                          - button "联系我 ↗" [ref=e38] [cursor=pointer]
                        - group [ref=e39]:
                          - generic "完整履历与公开资料" [ref=e40] [cursor=pointer]
                      - generic [ref=e41]:
                        - paragraph [ref=e42]: CUBXXW / ALONG THE WAY
                        - heading "这些年" [level=3] [ref=e43]
                        - list [ref=e44]:
                          - listitem [ref=e45]:
                            - time [ref=e46]: "2021"
                            - generic [ref=e47]:
                              - heading "第一篇博客" [level=4] [ref=e48]
                              - paragraph [ref=e49]: 注册了 GitHub，写下第一篇博客，开始公开自己的笔记。
                              - group [ref=e50]:
                                - generic "多一点细节" [ref=e51] [cursor=pointer]
                              - link "阅读《我的第一个博客》 ↗" [ref=e52] [cursor=pointer]:
                                - /url: /zh/growth/posts/my-first-blog/
                          - listitem [ref=e53]:
                            - time [ref=e54]: "2023"
                            - generic [ref=e55]:
                              - heading "OpenIM 与开源社区" [level=4] [ref=e56]
                              - paragraph [ref=e57]: 进入 OpenIM 实习，贡献代码，设计并主持社区双周会。
                              - group [ref=e58]:
                                - generic "多一点细节" [ref=e59] [cursor=pointer]
                              - link "阅读 2023 年度总结 ↗" [ref=e60] [cursor=pointer]:
                                - /url: /zh/growth/posts/2023-annual-summary-reflections-and-aspirations/
                          - listitem [ref=e61]:
                            - time [ref=e62]: "2024"
                            - generic [ref=e63]:
                              - heading "毕业，出发" [level=4] [ref=e64]
                              - paragraph [ref=e65]: 第一次出国、毕业、工作，再离职，开始一边旅行一边构建。
                              - group [ref=e66]:
                                - generic "多一点细节" [ref=e67] [cursor=pointer]
                              - link "阅读 2024 年度回顾 ↗" [ref=e68] [cursor=pointer]:
                                - /url: /zh/growth/posts/2024-annual-review/
                          - listitem [ref=e69]:
                            - time [ref=e70]: "2025"
                            - generic [ref=e71]:
                              - heading "尼泊尔 ACT" [level=4] [ref=e72]
                              - paragraph [ref=e73]: 走完第一次高原徒步。从 2 月起，开始每月写思考笔记。
                              - group [ref=e74]:
                                - generic "多一点细节" [ref=e75] [cursor=pointer]
                              - link "阅读 2025-2026 年度总结 ↗" [ref=e76] [cursor=pointer]:
                                - /url: /zh/growth/posts/2025-annual-review/
                          - listitem [ref=e77]:
                            - time [ref=e78]: "2026"
                            - generic [ref=e79]:
                              - heading "产品和新的工作" [level=4] [ref=e80]
                              - paragraph [ref=e81]: 继续做产品、写作。8 月 10 日，结束约两年的空窗，开始新的工作。
                              - group [ref=e82]:
                                - generic "多一点细节" [ref=e83] [cursor=pointer]
                              - link "阅读《不会让恐惧替我做决定》 ↗" [ref=e84] [cursor=pointer]:
                                - /url: /zh/growth/posts/2026-08-10-fear-does-not-decide-for-me/
                      - generic [ref=e85]:
                        - paragraph [ref=e86]: CUBXXW / READING PATHS
                        - group [ref=e88]:
                          - generic "想读我的文字？ 展开四条精选阅读路径" [ref=e89] [cursor=pointer]:
                            - text: 想读我的文字？
                            - generic [ref=e90]: 展开四条精选阅读路径
              - region "你的笔记" [ref=e94]:
                - generic [ref=e95]:
                  - generic [ref=e96]:
                    - button "关闭窗口" [ref=e97] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=e98] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=e99] [cursor=pointer]: +
                  - strong: 你的笔记
                  - button "窗口并排" [ref=e100] [cursor=pointer]: ◫
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - generic [ref=e104]: 属于你的笔记
                    - generic [ref=e105]:
                      - button "保存到沙盒" [ref=e106] [cursor=pointer]
                      - button "导出 .md ↗" [ref=e107] [cursor=pointer]
                  - textbox "你的笔记" [ref=e108]:
                    - /placeholder: "逛到这里，想到了什么？\n\n可以写下来，下次回来继续。"
                    - text: 目录、文章、书架之间，同一份笔记继续写。
                  - generic [ref=e109]:
                    - generic [ref=e110]: 仅保存在当前浏览器，不会公开
                    - generic [ref=e111]: 20 / 40000
              - region "文章与思考" [active] [ref=e115]:
                - generic [ref=e116]:
                  - generic [ref=e117]:
                    - button "关闭窗口" [ref=e118] [cursor=pointer]: ×
                    - button "最小化窗口" [ref=e119] [cursor=pointer]: −
                    - button "最大化或恢复窗口" [ref=e120] [cursor=pointer]: +
                  - strong: 文章与思考
                  - button "窗口并排" [ref=e121] [cursor=pointer]: ◫
                - generic [ref=e123]:
                  - generic [ref=e124]:
                    - generic [ref=e125]: 公开文章 / 189
                    - searchbox "筛选文章" [ref=e126]: Go
                  - generic [ref=e127]:
                    - complementary [ref=e128]:
                      - generic [ref=e129]:
                        - paragraph [ref=e130]: 阅读目录
                        - button "全部文章" [ref=e131] [cursor=pointer]
                        - button "AI Agent" [ref=e132] [cursor=pointer]
                        - button "工程实践" [pressed] [ref=e133] [cursor=pointer]
                        - button "思考与笔记" [ref=e134] [cursor=pointer]
                        - button "你的收藏" [ref=e135] [cursor=pointer]
                      - navigation "你的空间" [ref=e136]:
                        - button "笔记" [ref=e137] [cursor=pointer]
                        - button "书架" [ref=e138] [cursor=pointer]
                    - region "文章列表" [ref=e139]:
                      - button "2025.05.09 Argo CD 实战指南：Kubernetes GitOps、同步策略与生产安全 讲清 Argo CD 的 GitOps 控制循环、Application、AppProject 与 ApplicationSet，给出安装和首个应用示例，分析自动同步、回滚、Server-Side Apply、多集群权限及生产安全取舍，帮助平台团队建立可审计、可恢复、不过度授权的 Kubernetes 持续交付体系。" [ref=e140] [cursor=pointer]:
                        - generic [ref=e141]: 2025.05.09
                        - strong [ref=e142]: Argo CD 实战指南：Kubernetes GitOps、同步策略与生产安全
                        - generic [ref=e143]: 讲清 Argo CD 的 GitOps 控制循环、Application、AppProject 与 ApplicationSet，给出安装和首个应用示例，分析自动同步、回滚、Server-Side Apply、多集群权限及生产安全取舍，帮助平台团队建立可审计、可恢复、不过度授权的 Kubernetes 持续交付体系。
                      - button "2024.08.06 Kubernetes 资源与学习路径总结 本文提供了详细的 Kubernetes 资源和学习路径，涵盖了 CNI、CRI、CSI 以及云原生环境中的核心技术。我们还分享了一些重要的学习资源和学习方法，帮助读者进一步深造 Kubernetes 生态系统。" [ref=e144] [cursor=pointer]:
                        - generic [ref=e145]: 2024.08.06
                        - strong [ref=e146]: Kubernetes 资源与学习路径总结
                        - generic [ref=e147]: 本文提供了详细的 Kubernetes 资源和学习路径，涵盖了 CNI、CRI、CSI 以及云原生环境中的核心技术。我们还分享了一些重要的学习资源和学习方法，帮助读者进一步深造 Kubernetes 生态系统。
                      - 'button "2024.01.25 Go 源码里的这些 go: 指令 && go 自动化工具 本文探讨了 Go 源码中的特殊指令（go: 指令）以及这些指令如何在 Go 项目中应用。同时，文章还介绍了几种常用的 Go 自动化工具，它们如何帮助开发者优化工作流程。" [ref=e148] [cursor=pointer]':
                        - generic [ref=e149]: 2024.01.25
                        - strong [ref=e150]: "Go 源码里的这些 go: 指令 && go 自动化工具"
                        - generic [ref=e151]: "本文探讨了 Go 源码中的特殊指令（go: 指令）以及这些指令如何在 Go 项目中应用。同时，文章还介绍了几种常用的 Go 自动化工具，它们如何帮助开发者优化工作流程。"
                      - button "2024.01.24 Go 语言中的并发类型检查与跨平台开发 探索 Go 语言中并发类型检查和高效跨平台开发技术，阐述最佳实践和高级概念，以构建健壮的应用程序。" [ref=e152] [cursor=pointer]:
                        - generic [ref=e153]: 2024.01.24
                        - strong [ref=e154]: Go 语言中的并发类型检查与跨平台开发
                        - generic [ref=e155]: 探索 Go 语言中并发类型检查和高效跨平台开发技术，阐述最佳实践和高级概念，以构建健壮的应用程序。
                      - button "2023.11.25 GitOps 实践理论：Kubernetes 部署策略深入解析 探索 GitOps 在 Kubernetes 中的实践，详细解析使用 Argo Rollouts 实现金丝雀和蓝绿部署策略。本文将为开发者提供深入的理论和实践指导，帮助优化持续部署流程。" [ref=e156] [cursor=pointer]:
                        - generic [ref=e157]: 2023.11.25
                        - strong [ref=e158]: GitOps 实践理论：Kubernetes 部署策略深入解析
                        - generic [ref=e159]: 探索 GitOps 在 Kubernetes 中的实践，详细解析使用 Argo Rollouts 实现金丝雀和蓝绿部署策略。本文将为开发者提供深入的理论和实践指导，帮助优化持续部署流程。
                      - button "2023.11.06 Hugo 的高级教程 面向已有 Hugo 基础、需要维护博客或主题的开发者，整理模块挂载、Go 模板的管道与作用域、模板查找顺序、列表与分页，以及 shortcode、i18n 和 data 文件的用法，帮助定位页面渲染与内容复用问题。" [ref=e160] [cursor=pointer]:
                        - generic [ref=e161]: 2023.11.06
                        - strong [ref=e162]: Hugo 的高级教程
                        - generic [ref=e163]: 面向已有 Hugo 基础、需要维护博客或主题的开发者，整理模块挂载、Go 模板的管道与作用域、模板查找顺序、列表与分页，以及 shortcode、i18n 和 data 文件的用法，帮助定位页面渲染与内容复用问题。
                      - button "2023.09.28 Kubernetes 的 CNI，CRI，CSI 详解 深入探讨Kubernetes中的CNI（容器网络接口）、CRI（容器运行时接口）和CSI（容器存储接口）。本文将详细解释这些关键组件的作用，以及它们在云原生环境中的重要性和应用场景。" [ref=e164] [cursor=pointer]:
                        - generic [ref=e165]: 2023.09.28
                        - strong [ref=e166]: Kubernetes 的 CNI，CRI，CSI 详解
                        - generic [ref=e167]: 深入探讨Kubernetes中的CNI（容器网络接口）、CRI（容器运行时接口）和CSI（容器存储接口）。本文将详细解释这些关键组件的作用，以及它们在云原生环境中的重要性和应用场景。
                      - button "2023.09.28 Kubernetes 控制平面 - 调度器 探讨 Kubernetes 的调度器组件如何工作，它是如何决定将容器放置在哪个节点上的，以及这对集群管理和容器编排有何重要意义。" [ref=e168] [cursor=pointer]:
                        - generic [ref=e169]: 2023.09.28
                        - strong [ref=e170]: Kubernetes 控制平面 - 调度器
                        - generic [ref=e171]: 探讨 Kubernetes 的调度器组件如何工作，它是如何决定将容器放置在哪个节点上的，以及这对集群管理和容器编排有何重要意义。
                      - button "2023.09.28 Kubernetes 控制平面 - Kubectl 详细讲解 kubelet 架构kubelet 管理 Pod 的核心流程kubelet 节点管理Pod 管理Pod" [ref=e172] [cursor=pointer]:
                        - generic [ref=e173]: 2023.09.28
                        - strong [ref=e174]: Kubernetes 控制平面 - Kubectl 详细讲解
                        - generic [ref=e175]: kubelet 架构kubelet 管理 Pod 的核心流程kubelet 节点管理Pod 管理Pod
                      - button "2023.09.26 深入了解Kubernetes等组件之ETCD 这一篇来深入并且贯穿的讲解 ETCD 和 Raft。并且站在 Kubernetes 的角度来深入剖析 ETCD。" [ref=e176] [cursor=pointer]:
                        - generic [ref=e177]: 2023.09.26
                        - strong [ref=e178]: 深入了解Kubernetes等组件之ETCD
                        - generic [ref=e179]: 这一篇来深入并且贯穿的讲解 ETCD 和 Raft。并且站在 Kubernetes 的角度来深入剖析 ETCD。
                      - button "2023.09.16 GoReleaser v2 教程：用 GitHub Actions 自动发布 Go 手把手带你写 .goreleaser.yaml：builds、archives、Docker 镜像、签名到 GitHub Release 逐段讲清楚，最后接入 GitHub Actions，推一个 tag 就能自动多平台发布，不用再手动打包传附件。" [ref=e180] [cursor=pointer]:
                        - generic [ref=e181]: 2023.09.16
                        - strong [ref=e182]: GoReleaser v2 教程：用 GitHub Actions 自动发布 Go
                        - generic [ref=e183]: 手把手带你写 .goreleaser.yaml：builds、archives、Docker 镜像、签名到 GitHub Release 逐段讲清楚，最后接入 GitHub Actions，推一个 tag 就能自动多平台发布，不用再手动打包传附件。
                      - button "2023.09.12 关于我的 Hugo 博客 (教程) 本教程将指导你如何使用 Hugo —— 一款流行的静态网站生成器 —— 来搭建和管理个人博客。详细介绍从安装到配置的各个步骤。" [ref=e184] [cursor=pointer]:
                        - generic [ref=e185]: 2023.09.12
                        - strong [ref=e186]: 关于我的 Hugo 博客 (教程)
                        - generic [ref=e187]: 本教程将指导你如何使用 Hugo —— 一款流行的静态网站生成器 —— 来搭建和管理个人博客。详细介绍从安装到配置的各个步骤。
                      - button "2023.09.11 速读开源项目 Sealos 的源码 一篇文章从头开始教会如何快速优雅地阅读学习一个顶级的开源项目 Sealos。" [ref=e188] [cursor=pointer]:
                        - generic [ref=e189]: 2023.09.11
                        - strong [ref=e190]: 速读开源项目 Sealos 的源码
                        - generic [ref=e191]: 一篇文章从头开始教会如何快速优雅地阅读学习一个顶级的开源项目 Sealos。
                      - button "2023.08.16 我是如何优雅设计 OpenIM 多进程管理策略的 本文详述了在 OpenIM 中实施多进程管理的策略和技术，OpenIM 的 System 部署设计； 探讨如何通过进程隔离和资源控制来提升系统稳定性和扩展性。" [ref=e192] [cursor=pointer]:
                        - generic [ref=e193]: 2023.08.16
                        - strong [ref=e194]: 我是如何优雅设计 OpenIM 多进程管理策略的
                        - generic [ref=e195]: 本文详述了在 OpenIM 中实施多进程管理的策略和技术，OpenIM 的 System 部署设计； 探讨如何通过进程隔离和资源控制来提升系统稳定性和扩展性。
                      - button "2023.06.19 Go 调试测试以及调试工具 dlv 学习 本文深入介绍 Go 语言的调试过程，测试方法以及如何使用调试工具 dlv 来优化代码。" [ref=e196] [cursor=pointer]:
                        - generic [ref=e197]: 2023.06.19
                        - strong [ref=e198]: Go 调试测试以及调试工具 dlv 学习
                        - generic [ref=e199]: 本文深入介绍 Go 语言的调试过程，测试方法以及如何使用调试工具 dlv 来优化代码。
                      - button "2023.04.23 Openkf 多架构镜像的构建策略设计 本文探讨了针对 Openkf 的多架构镜像构建策略的设计，涵盖了在不同环境下的构建和部署方案，旨在提高应用的可移植性和效率。" [ref=e200] [cursor=pointer]:
                        - generic [ref=e201]: 2023.04.23
                        - strong [ref=e202]: Openkf 多架构镜像的构建策略设计
                        - generic [ref=e203]: 本文探讨了针对 Openkf 的多架构镜像构建策略的设计，涵盖了在不同环境下的构建和部署方案，旨在提高应用的可移植性和效率。
                      - button "2023.02.13 跨平台以及多架构编译设计 用 Docker buildx 结合 QEMU 交叉编译 arm/arm64/amd64 镜像的实战记录：如何按目标架构调整 Dockerfile 基础镜像和依赖下载地址，复杂构建为什么要上真机验证，附 docker buildx imagetools inspect 检查方法。" [ref=e204] [cursor=pointer]:
                        - generic [ref=e205]: 2023.02.13
                        - strong [ref=e206]: 跨平台以及多架构编译设计
                        - generic [ref=e207]: 用 Docker buildx 结合 QEMU 交叉编译 arm/arm64/amd64 镜像的实战记录：如何按目标架构调整 Dockerfile 基础镜像和依赖下载地址，复杂构建为什么要上真机验证，附 docker buildx imagetools inspect 检查方法。
            - navigation "应用 Dock" [ref=e211]:
              - button "CUBXXW OS 空间菜单" [ref=e212] [cursor=pointer]:
                - generic: CUBXXW OS
              - button "欢迎" [ref=e217] [cursor=pointer]
              - button "文章与思考" [ref=e225] [cursor=pointer]
              - button "产品" [ref=e231] [cursor=pointer]
              - button "旅途相册" [ref=e238] [cursor=pointer]
              - button "你的笔记" [ref=e245] [cursor=pointer]
              - button "空间助手" [ref=e251] [cursor=pointer]
              - button "工作区设置" [ref=e257] [cursor=pointer]
        - navigation "咖啡馆导览":
          - generic:
            - button "回到咖啡馆" [ref=e263] [cursor=pointer]: ← 回到咖啡馆
            - generic: CUBXXW OS
            - button "换个风景" [ref=e264] [cursor=pointer]: 换个风景 ↗
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
  68 |   await page.setViewportSize({width:1440,height:900});await setup(page);const notes=await openApp(page,'notes'),editor=notes.locator('[data-note-editor]'),draft='目录、文章、书架之间，同一份笔记继续写。';await editor.fill(draft);const originalEditor=await editor.elementHandle(),reader=await openApp(page,'reader');await choose(page,reader,'engineering');await reader.locator('[data-library-query]').fill('Go');const list=reader.locator('[data-library-list]');expect(await list.locator('.space-list-item').count()).toBeGreaterThan(3);const box=(await list.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,850);await expect.poll(()=>list.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);await frames(page);const scroll=await list.evaluate(el=>el.scrollTop);expect(await reader.locator('[data-window-body]').evaluate(el=>el.scrollTop)).toBe(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bear-library:v1')!).scroll)).toBe(scroll);
> 69 |   const url=await list.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll<HTMLElement>('.space-list-item')].find(item=>{const b=item.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;})!.dataset.payload!;});await list.locator(`[data-payload="${url}"]`).click();const back=reader.locator('.space-reader-toolbar [data-open="reader"]');await hit(back);await back.click();await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate(el=>Math.abs(el.scrollTop-scroll))).toBeLessThanOrEqual(1);const originalList=await list.elementHandle();
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ^ Error: expect(received).toBeLessThanOrEqual(expected)
  70 |   await reader.locator('[data-window-action="minimize"]').click();await openApp(page,'reader');expect(await list.evaluate((el,old)=>el===old,originalList)).toBe(true);await expect.poll(()=>list.evaluate(el=>Math.abs(el.scrollTop-scroll))).toBeLessThanOrEqual(1);const noteEntry=reader.locator('.space-library-actions [data-open="notes"]');await hit(noteEntry);await noteEntry.click();expect(await editor.evaluate((el,old)=>el===old,originalEditor)).toBe(true);await expect(editor).toHaveValue(draft);await editor.press('End');await editor.pressSequentially('继续。');await openApp(page,'reader');const bookEntry=reader.locator('.space-library-actions [data-open="books"]');await hit(bookEntry);await bookEntry.click();const books=page.locator('[data-space-window="books"]');await expect(books.locator('.space-book')).toHaveCount(4);await books.locator('.space-books-toolbar [data-open="reader"]').click();await expect.poll(()=>list.evaluate(el=>Math.abs(el.scrollTop-scroll))).toBeLessThanOrEqual(1);
  71 |   await page.reload();await enterWorkspace(page);await openApp(page,'reader');await expect(reader.locator('[data-library-query]')).toHaveValue('Go');await expect(reader.locator('[data-library-filter="engineering"]')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>list.evaluate(el=>Math.abs(el.scrollTop-scroll))).toBeLessThanOrEqual(1);await openApp(page,'notes');await expect(editor).toHaveValue(draft+'继续。');
  72 | });
  73 | 
```