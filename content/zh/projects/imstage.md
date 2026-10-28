---
title: 'IMStage：用于测试与评测的合成对话'
date: 2026-09-23T09:00:00+08:00
lastmod: 2026-10-20T00:00:00+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - MCP
  - Developer Tools
  - Product Strategy
product: imstage
description: >
  IMStage 用于软件测试、教学与评测数据集的合成聊天场景创作。逐条编辑消息，复用人物与模板，批量制作项目变体，再导出带默认虚构标识的 PNG 或可编辑 JSON。当前版本采用非商业源码可用许可，公开入口已禁用真实截图编辑；账号 MCP 通过 OAuth 连接 Web 作品，手动编辑和导出不需要模型密钥。
---

测试一段聊天截图识别流程，需要换几种对白、人物和时间。IMStage 把这些变化保存在可编辑的合成场景里，方便制作软件测试、教学和评测数据集所需的样例。[当前项目说明](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

在 [IMStage](https://imstage.org/?lang=zh) 手动编辑消息与人物，调整头像和设备状态，也可以登录后让站内 Agent 起草或修改场景。预览与导出默认带“AI生成 / 虚构”标识。[功能与使用边界](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

{{< figure src="/images/products/imstage-zh.jpg" alt="IMStage 早期中文首页，展示场景输入与合成聊天预览" caption="2026 年 9 月的早期界面示例，人物与照片为虚构合成素材；当前功能与许可见下文。" width="1440" height="900" >}}

## 一张画面，继续改

改一句回复、换一个头像，或者调整时间和设备状态，都不必从头开始。完成后可以导出普通画面、长图 PNG 或可继续编辑的 JSON。[编辑与导出](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

本地会话留在当前浏览器；托管服务为登录账号保存场景与项目。手动编辑和 PNG 导出不需要模型密钥，站内 Agent 则需要服务端配置和登录。[托管与本地运行](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

## 同一个设定，不同的故事

把满意的场景存成模板，姓名、图片等内容可以作为变量复用。项目保存共同设定，再批量制作不同变体，适合让同一测试场景覆盖多组对白和人物。[模板与项目](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

公开入口已禁用真实截图参考编辑，支付、转账、红包和余额消息类型也已移除。上传素材应为虚构或已获授权的内容，合成结果不能作为真实对话的证据。[当前限制](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

## 可以自己部署，也可以接入 AI 工具

账号 MCP 通过 OAuth 登录，与 Web 共用已保存的场景；自托管的实例 MCP 仍使用管理员令牌与独立场景库。两种接入方式的账号和存储边界不同。[MCP 接入](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)

当前版本采用非商业源码可用许可，仅限测试、学习与研究，不再沿用 MIT 作为新版本许可。历史 MIT 版本保留原条款。[许可说明](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md#license-and-commercial-use)

## 参考资料

- [IMStage 当前功能、接入方式与许可说明（2026-10-18 版本）](https://github.com/kubbot/imstage/blob/b34ac2ff236024c176980913a07834448ec9cca6/README.md)
