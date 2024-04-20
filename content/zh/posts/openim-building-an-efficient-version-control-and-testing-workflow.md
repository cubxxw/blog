---
title: 'OpenIM：构建高效的版本控制和测试工作流程'
ShowRssButtonInSectionTermList: true
cover:
  image: 'images/blog/openim-version-control.jpg'  # 假设您有这张图片，如无请更换
  caption: '高效的版本控制和测试工作流程'
date: '2024-01-15T21:13:07+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: '熊鑫伟，我'
keywords: ['OpenIM', '版本控制', '测试工作流', '代码质量', '项目管理', '开源社区', 'OpenIM 版本控制', '高效测试流程', '开源项目管理', '质量保证方法', '代码稳定性', '社区参与']
tags: ['博客 (Blog)', '版本控制 (Version Control)', '测试流程 (Testing Workflow)', 'OpenIM']
categories: ['开发 (Development)']
description: '一个开源项目的成功很大程度上取决于其质量管理和协作流程。在 OpenIM 开源社区中，项目管理和测试流程的标准化对于确保代码库的质量和稳定性至关重要。本文提供了对我们的测试策略、分支管理、质量控制政策的简要概述，以及它们如何应用于主分支、PR测试分支和稳定发布分支，以满足开发人员、测试人员和社区管理人员的需求。此外，我们还将介绍 OpenIM 开源社区的标准、测试方案和项目管理策略，旨在提供明确的指导，以确保项目的稳定性和可持续性。'
---

# OpenIM 构建高效的版本控制和测试流程

开源项目的成功与否在很大程度上取决于其质量管理和协作流程。在 OpenIM 开源社区中，项目管理和测试流程的规范性至关重要，以确保代码的质量和稳定性。本文将简要介绍我们的测试方案、分支管理和质量控制策略，以及如何应用于 main 分支、PR 测试分支和稳定的 release 分支，以满足开发者、测试人员和社区管理者的需求。除此之外，还将介绍OpenIM开源社区的规范、测试方案和项目管理策略，旨在提供清晰的指导，以确保项目的稳定性和可持续性。

## 分支管理与版本控制

对于 OpenIM 来说分支的版本管理策略是尤其重要的，这里面设计到两块，一块是 OpenIM 的部署分支策略，一个是镜像版本策略，这两块分别参考下面的文章：

- [分支以及 tag 的版本策略](https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/version.md)
- [镜像的版本策略](https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/images.md)

**总的来说：**

在OpenIM社区中，**`main`** 分支被视为稳定版本的代表。所有代码必须经过严格的代码审查和测试，确保其质量和稳定性，然后才能合并到 **`main`** 分支中。

**`release`** 分支用于发布稳定版本。在 `openim-docker` 以及  `openim-k8s` 中使用的镜像版本也都是  `release-v3.*` 。在 **`release`** 分支上的任何更改都应该是针对已知问题的修复或功能的精心策划的添加。测试工作应重点关注于 **`release`** 分支，以确保发布版本的可靠性。

## 测试方案

### Main 分支测试

在 **`main`** 分支上进行的测试应覆盖核心功能和关键路径，以确保基本功能的稳定性。测试工作应包括单元测试、集成测试和端到端测试。这部分所有的工作全部交给自动化去做，而不需要测试干预。

### Release 分支测试

对于三种仓库，分别是 https://github.com/openimsdk/open-im-server 仓库，https://github.com/openimsdk/chat 仓库，https://github.com/openimsdk/openim-sdk-core 仓库。

在 **`release`** 分支上进行的测试要求更严格。测试团队应深入测试所有功能，并着重检查先前已知的问题是否已解决。确保在发布前没有潜在的问题。

**这里的 PR 合并规则：**

以 [这个PR](https://github.com/openimsdk/open-im-server/pull/1750) 为例：

首先是 PR 标题，PR 标题 **fix pageFindUser** ，首先，我们知道 `git commit` 信息包括是三种：

```jsx
<类型>[可选 范围]: <描述>
```

对于所有的 release 分支，我们要求必须要有 `<类型>[可选 范围]: <描述>`

- 其中类型和以前的一样
    - `git commit`提交类型可以是如下
        1. `feat`：新功能（feature）
        2. `fix`：修补bug
        3. `docs`：文档（documentation）
        4. `style`： 格式（不影响代码运行的变动）
        5. `refactor`：重构（即不是新增功能，也不是修改bug的代码变动）
        6. `test`：增加测试
        7. `chore`：构建过程或辅助工具的变动
        8. `perf`：性能优化
        9. `revert`：回滚
        10. `build`：构建
        11. `ci`：持续集成
        12. `update`：更新
        13. `add`：添加
        14. `delete`：删除
        15. `init`：初始化
        16. `merge`：合并
        17. `move`：移动
        18. `rename`：重命名
        19. `sync`：同步
        20. `release`：发布
        21. `hotfix`：修复线上问题
        22. `optimize`：优化
- 需要额外添加的是 `[可选 范围]` 这部分，就需要填写 `release-v3.5`
- `<描述>` 需要填写这个 PR 的描述。

最后，一个正确的 PR 标题描述应该是：

```jsx
fix(release-v3.5): fix user search page issue
```

> 更多的文档信息阅读参考：https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md
> 

### Pull Request (PR) 测试分支

每个提交的 PR 都应有对应的测试分支。可以是功能测试分支和 bug 测试分支，具体的测试情况是更具分支的所有者来决定的。但是当测试分支合并到 `main` 或者 `release-v3.5` 分支的时候，那么需要按照对应的主要分支的要求去测试。

## 项目管理

OpenIM 社区采用透明的项目管理方法，以便更好地协作和监督项目进展。

更具 OpenIM 的分支设计规范，对于项目管理也主要区分 `main`， `release-v3.*`，以及其他的分支来做不同的策略：

### PR 流程

- 提交 PR 后，必须通过至少两名核心开发者的审查。
- PR 必须通过所有自动化测试，并且不得引入新的问题。
- 一旦 PR 被批准，它可以合并到 **`main`** 分支中。
- 如果这个 PR 同时需要急切的解决 release-3.5 分支的问题，那么需要
    - 在这个 PR 的对应的关联 issue 上，设置 **Milestone** 为 `v3.5`
    - 需要将这个 **Milestone** 为 `v3.5` issue 在 `release-v3.5` 分支上同样解决一下，提出 PR
    - 当这个 PR 自动化测试通过后，需要对这个 PR 手动测试（需要定义手动测试的一些文档）
    - 贴出手动测试的截图，在 PR 描述的 **`🎯 Describe how to verify it` 中**

### Review 规范

- 评审应重点关注代码质量、性能、安全性和文档。
- 评审者应提供具体的反馈和建议，以便作者进行改进。
- 针对代码的问题作出评论和修改意见
- 如果 PR 没有问题，那么久

### Relase 分支测试步骤

- [ ]  定期检查 openim-server， openim-chat，openim-sdk-core 仓库
- [ ]  检查 PR 标题是否符合规范
- [ ]  通过 Issue 或者是 PR 描述，代码等判断这个 PR 解决的问题
- [ ]  检查 PR 链接的 issue 是否有对应的 **Milestone**
- [ ]  检查是否有对应的测试截图
- [ ]  如果没有截图需要对这个 PR 测试，然后评论补充测试截图
- [ ]  如果审核通过，在评论区使用命令 `/lgtm` 评论
- [ ]  如果审核不通过，在评论区补充一些错误信息以及错误截图

### Note: 如何对这个 PR 进行测试

还是以 https://github.com/openimsdk/open-im-server/pull/1750 为例，可以选择两种部署方式：

**服务器部署**：

- 向 openim 申请固定的测试服务器
- 停掉之前所有的容器
    - `docker stop $(docker ps -qa)`
    - `docker rm -f $(docker ps -qa)`
    - `docker network prune -f`
        - `ps -ef |grep openim` and use `kill -9 ${pid}`
- 使用 `gh` 或者是 `git` 获取对应的代码：
    
    ```bash
    gh pr checkout 1750
    ```

- 进入测试目录，打开 `docker-compose.yml` 文件，然后将后面的 `openim-chat` ， `openim-admin` ， `prometheus` ， `alertmanager` ， `node-exporter`,  `grafana` 的注释

除了用本地或者服务器测试，还可以使用 github 的 `codespaces`

> 学习文档：https://docs.github.com/en/codespaces/getting-started/quickstart
> 

在 `codespaces` 中使用端口转发，然后访问对应的 openim-web 测试即可。

### 未来的自动化测试设计

OpenIM社区计划不断提升自动化测试覆盖率，以降低人工测试的工作量。将开发更多的自动化测试脚本，以确保代码质量和稳定性。

## NED

OpenIM开源社区致力于提供高质量的开源即时通讯解决方案。通过严格的规范、测试方案和项目管理，我们可以确保项目的成功和可持续性，同时欢迎更多的贡献者、开发者和社区管理者的参与与合作。希望这些指导方针有助于加强我们的社区和项目的发展。