---
title : 'Openkf 多架构镜像的构建策略设计'
date : 2023-04-23T14:15:15+08:00
draft : false
tags:
  - blog
  - zh
  - openim
categories:
  - Development
  - Blog
  - OpenIM
---

## 自动化构建`openkf`的多架构镜像并推送到多个镜像仓库

+ https://github.com/openimsdk/openkf

**描述：**

为了满足各种用户的需求，我们的目标是自动化构建用于各种架构的`openkf` Docker镜像，并无缝地将它们推送到多个镜像仓库。

**目标：**

- 自动构建`openkf`的`linux/amd64`和`linux/arm64`架构的Docker镜像。
- 将镜像推送到Docker Hub、阿里云Docker Hub和GitHub容器仓库。

**任务：**

1. **设置多架构构建系统**
   - 使用GitHub Actions，配合QEMU和Docker Buildx，支持`linux/amd64`和`linux/arm64`的多架构构建。
   - 在每次新版本发布、提交到`main`分支或定期事件时，触发构建过程。
2. **支持多个镜像仓库**
   - Docker Hub：推送到`openim/openkf-server`。
   - 阿里云Docker Hub：推送到`registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server`。
   - GitHub容器仓库：推送到`ghcr.io/openimsdk/openkf-server`。
3. **动态镜像标记**
   - 使用Docker Metadata Action，基于事件（如定期触发器、分支提交、拉取请求、语义版本控制和提交SHA）生成动态标签。
   - 确保在拉取请求事件中不推送已构建的镜像。
4. **身份验证和安全性**
   - 使用秘密配置Docker Hub、阿里云和GitHub容器仓库的身份验证。
   - 确保每个仓库的推送操作都是安全且无缝的。
5. **通知和日志**
   - 通过GitHub Actions，如果有任何构建或推送失败，向开发团队发送通知。
   - 保留每次构建和推送操作的日志以供追踪。

**验收标准：**

- `openkf`镜像应该成功地为`linux/amd64`和`linux/arm64`架构构建。
- 在成功构建后，镜像应该在Docker Hub、阿里云Docker Hub和GitHub容器仓库上可用。
- 根据定义的事件和属性正确标记镜像。
- 整个过程中不需要人工干预。

**附加说明：**

- 自动化过程在GitHub Actions工作流中定义。确保根据需要查看和更新工作流。
- 确保在单独的分支或环境中测试此过程，以避免中断。
