---
title: 'Nango 接入实战：让用户在聊天中添加自己的 MCP'
date: 2026-10-03T22:24:30+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - AI
  - Agent
  - MCP
  - Development
  - Security
  - Product Strategy
description: >
  用户能否在聊天中添加产品没有预置的 MCP？本文从这个产品问题出发，拆解 Nango 授权、连接归属、工具发现、参数校验与结果回传，提供可本地运行的自有 MCP 案例，并核对云端接入请求。进一步说明多账号隔离、写入重试、任务恢复、协议升级和后续维护，让首次连接的惊喜变成持续可用的能力，供聊天式 AI 产品开发者参考。
---

查项目状态这件事，模型得有工具才能做。用户说：“帮我看看 demo 项目卡在哪。”模型能理解这句话，却没有入口读取项目状态。我们想补上的体验很具体：用户添加自己的项目服务，授权一次，然后回到这段对话，拿到有依据的回答。
## 一句话把整条路讲清楚

**用户提供工具地址，Nango 保管授权凭证，你的后端选对账号并调用工具，最后把结果交给模型回答。**

MCP 可以先理解成“工具菜单加点单规则”：菜单告诉客户端有哪些工具，点单规则说明参数怎么填、结果怎么收，它的正式名称是 Model Context Protocol。Nango 则提供授权与请求转发的基础设施；模型负责选择动作，后端负责执行条件，所以新工具可以在运行时接入。

![从“帮我看看 demo 项目卡在哪”到回答：用户添加服务，后端关联账号，Nango 处理授权与代理，MCP 返回数据给模型](/images/agent-system-series/12-nango-user-mcp/nango-user-mcp-roundtrip.svg)

图里的中间一段要留在产品里。后端保存“当前用户对应哪个外部连接”，还保存这段聊天正在等什么；授权完成后，从等待点继续。Nango 的标签帮助关联记录，具体访问权限由产品检查，这样用户换账号时，查询才能跟着换。

## 逐步跑通：让 demo 项目真正返回数据

先跑通“工具存在、参数正确、结果可读”，再把授权放进聊天，排错会容易很多。下面按这个顺序准备项目服务，然后走用户添加和执行的路径。

### 把项目查询做成一个工具

这一步把“项目卡在哪”包装成一个有名字、有参数的函数。服务只提供 `get_project_brief`，输入是项目标识 `projectKey`；我们先放入一条演示记录，把数据库和业务权限留到上线阶段补齐。

在独立目录安装依赖。这里固定 SDK v2 的包，避免把旧教程的导入方式混进来：

```bash
npm init -y
npm install --save-exact @modelcontextprotocol/server@2.3.0 @modelcontextprotocol/client@2.3.0 @modelcontextprotocol/node@2.1.1 zod@4.6.5
```

保存成 `server.mjs`，然后运行 `node server.mjs`：

```javascript
import { createServer } from 'node:http';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const projects = { demo: {
  name: '演示项目', status: '等待验收',
  blockers: ['移动端登录回归尚未完成'], synthetic: true
} };
const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'project-brief', version: '1.0.0' });
  server.registerTool('get_project_brief', {
    description: 'Read a project status and its blockers.',
    inputSchema: z.object({ projectKey: z.string().min(1).max(64) }),
    annotations: { readOnlyHint: true }
  }, async ({ projectKey }) => {
    const project = Object.hasOwn(projects, projectKey) ? projects[projectKey] : undefined;
    return project
      ? { structuredContent: { project }, content: [{ type: 'text', text: JSON.stringify(project) }] }
      : { isError: true, content: [{ type: 'text', text: 'PROJECT_NOT_FOUND' }] };
  });
  return server;
}, { responseMode: 'json' });

const handle = toNodeHandler(handler);
const hostOK = localhostHostValidation(), originOK = localhostOriginValidation();
createServer((req, res) => {
  if (!hostOK(req, res) || !originOK(req, res)) return;
  if (req.url !== '/mcp') return res.writeHead(404).end();
  void handle(req, res);
}).listen(43173, '127.0.0.1', () => console.log('MCP: http://127.0.0.1:43173/mcp'));
```

这时，`http://127.0.0.1:43173/mcp` 就有了一份项目工具菜单。像填表说明一样的 `inputSchema` 规定 `projectKey` 必须是 1—64 字符的字符串，因此传数字会被拒绝；项目不存在则返回工具错误。`structuredContent` 放机器可读数据，`content` 放文本表示，两者都来自同一条演示记录。

服务绑定本机，并检查 Host 与 Origin；JSON 响应足够完成这次快速查询。长任务的中间通知需要另一种返回方式，这个选择先记住，后面接代理时会用到。[SDK 的 HTTP 接入说明](https://github.com/modelcontextprotocol/typescript-sdk/blob/8aabbdcef6e016978a3132045281dfbd51c69792/docs/serving/http.md)

### 先在本地查到 demo 项目

这一步先取得工具的真实定义，再执行一次项目查询。客户端用 `tools/list` 拿菜单，用 `tools/call` 点单；开发时先写死 `projectKey: 'demo'`，这样就能验证模型后面要走的那条数据路径。

保持第一个终端的服务运行，在第二个终端把下面保存为 `client.mjs`，执行 `node client.mjs`：

```javascript
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const client = new Client(
  { name: 'chat-demo', version: '1.0.0' },
  { versionNegotiation: { mode: 'auto' } }
);
try {
  await client.connect(new StreamableHTTPClientTransport(
    new URL('http://127.0.0.1:43173/mcp')
  ));
  console.log(JSON.stringify(await client.listTools(), null, 2));
  const result = await client.callTool({
    name: 'get_project_brief', arguments: { projectKey: 'demo' }
  });
  console.log(result.isError ? result.content : result.structuredContent.project);
} finally {
  await client.close();
}
```

先看到工具名和参数结构，再看到“等待验收”与“移动端登录回归尚未完成”，最小 demo 就跑通了。改成不存在的项目会得到 `PROJECT_NOT_FOUND`，传错参数类型会被校验拒绝，因此我们已经把“有工具”与“业务查询成功”分开验收。

本地实验到这里已经完整：菜单、参数和结果都走通了。接下来，把同一个工具部署成公网 HTTPS 服务，接入授权服务并发布元数据，数据库查询带上调用者权限，同时把 localhost 校验配置换成实际允许的域名与 Origin，然后再让用户添加它。

### 让用户把这个服务添加进聊天

这一步给聊天增加一个服务入口，后面才能发现工具。用户仍然在等 demo 项目的答案，产品可以展示“添加项目工具”，让他粘贴地址，或者从目录选择。

公网产品接收的应是远程服务地址，例如 `https://mcp.example.com/mcp`。`localhost` 指当前执行程序所在的机器；访问用户电脑里的服务，需要本地客户端或隔离运行环境。若用户带来的是需要启动的包，产品也得提供运行器，Nango Generic 不负责启动进程。

目录可以从官方 MCP Registry 读取。下面的命令可直接查看名称包含 `notion` 的最新条目：

```bash
curl 'https://registry.modelcontextprotocol.io/v0.1/servers?search=notion&version=latest&limit=10'
```

`search` 是名称子串匹配，所以“找一个能看项目进度的工具”需要产品自己的检索与排序。`remotes` 描述远程地址，`packages` 描述要安装的包；取下一页使用 `metadata.nextCursor`。产品可以缓存目录并同步停用、下架状态，因为 Registry 不保证持续在线和数据持久性。

对 demo 项目，目录和自定义 URL 最终都进入同一条连接流程。先显示发布者与真实域名，再检查接法是否匹配；目录收录本身不提供安全背书。选择服务之后，把原任务留在等待状态，别让用户授权回来还要重说问题。[Registry API](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/reference/api/official-registry-api.md)

### 给用户一个短期授权入口

这一步让用户把项目账号的访问权限交给产品使用，凭证由 Nango 保存。下面走的是远程 OAuth 路线：Nango Generic 当前要求服务支持自动客户端注册，服务让客户端登记自己叫 DCR，让服务读取客户端介绍文档叫 CIMD。

开发团队先在控制台配置一次 MCP Server OAuth2（Generic），将集成 ID 设为 `user-mcp`。多个用户可以通过它连接各自的服务器，但每次授权都有独立连接。固定 OAuth 客户端要另外配置对应 provider；API Key 和无认证服务也有各自的接法，不走这条 Generic OAuth 路线。

安装 `npm install --save-exact @nangohq/node@0.71.12`，将下面保存为 `connect.mjs`。设置后端环境变量 `NANGO_API_KEY` 和已经审核的公网 `MCP_URL`，运行 `node connect.mjs`，打开打印出的链接完成授权：

```javascript
import { Nango } from '@nangohq/node';
import { randomUUID } from 'node:crypto';

const apiKey = process.env.NANGO_API_KEY, mcpUrl = process.env.MCP_URL;
if (!apiKey || !mcpUrl) throw new Error('Set NANGO_API_KEY and MCP_URL');
if (new URL(mcpUrl).protocol !== 'https:') throw new Error('MCP_URL must use HTTPS');
const nango = new Nango({ apiKey });
const { data } = await nango.createConnectSession({
  allowed_integrations: ['user-mcp'],
  tags: {
    end_user_id: 'demo-user', organization_id: 'demo-org',
    connect_request_id: randomUUID()
  },
  integrations_config_defaults: {
    'user-mcp': { connection_config: { mcp_server_url: mcpUrl } }
  }
});
console.log(data.connect_link);
```

这里有三样东西各管一件事。`user-mcp` 选择集成；标签关联用户与这一次连接请求；`mcp_server_url` 固定访问目标。地址要放在这个嵌套层级里，session 配置优先于前端参数，预填字段会在 Connect UI 中隐藏；不预填则由用户在授权界面填写。

这个入口像一张有效期很短的入场券，正式名称是 Connect session，当前有效期为 30 分钟。返回的 token 或 `connect_link` 可以交给前端，环境 API Key 留在后端；正式产品把示例用户替换为登录系统确认的身份，并保存待授权记录。

聊天界面可以用前端 SDK 打开 Connect UI，从按钮点击时先打开窗口，再异步设置 session token，以减少弹窗被拦截的情况。用户授权后，Nango 给后端送来一份回执，这种事件通知叫 webhook；后端核验完成，再通过状态查询或事件推送让原聊天继续。[Nango MCP Auth](https://nango.dev/docs/guides/auth/mcp-auth)

### 把查询接回同一段聊天

这一步把已经验证的项目查询放回用户原来的问题里。后端用刚授权的连接执行，模型拿到结果后解释 demo 项目的阻塞项，前端继续展示同一个任务。

接回聊天时，把工具定义适配到所用模型的接口。模型根据“帮我看看 demo 项目卡在哪”提出工具名和参数，后端从当前用户的记录里选择连接，校验输入后执行；返回数据再作为这次工具调用的输出交回模型，它才能围绕项目的真实阻塞项回答。

这份带编号的请求信封叫 JSON-RPC，`id` 用来匹配响应；业务参数是 `arguments.projectKey`，选外部账号用的是 `connectionId`。多个服务都有 `search` 时，后端还要用路由表区分“模型可见名字、产品连接、外部工具名”，避免选错服务。

最后让模型收到必要字段和来源，让前端收到回答与任务状态。用户应该看到查的是哪个账号、结果是否覆盖他的请求；创建待办或发送通知时，先展示目标和内容，执行后再交付对象 ID 或链接。请求只发出而没有确定结果，就显示“结果待确认”。

<details>
<summary>通过 Nango 调用同一个工具：完整后端脚本</summary>

下面保存为 `cloud-client.mjs`，设置 `NANGO_API_KEY`、`NANGO_CONNECTION_ID` 和已批准的 `MCP_URL` 后运行，集成仍使用 `user-mcp`，连接 ID 使用授权后在 Nango Connections 中保存的那条记录。它保持 SDK 请求体与返回的 `Response`，只接已确认支持新版的 POST 路径，拒绝临时换目标；这个 URL 检查之外，还要执行网络出口、DNS 和重定向策略。

```javascript
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const url = new URL(process.env.MCP_URL);
const proxyFetch = async (input, init = {}) => {
  const target = input instanceof Request ? input.url : String(input);
  if (new URL(target).href !== url.href || init.method?.toUpperCase() !== 'POST') {
    throw new Error('Unexpected MCP target or method');
  }
  const headers = new Headers({
    Authorization: `Bearer ${process.env.NANGO_API_KEY}`,
    'Provider-Config-Key': 'user-mcp',
    'Connection-Id': process.env.NANGO_CONNECTION_ID,
    'Base-Url-Override': url.href, Retries: '0',
    'Content-Type': 'application/json'
  });
  const original = new Headers(init.headers);
  for (const name of ['content-type', 'accept', 'mcp-protocol-version', 'mcp-method', 'mcp-name']) {
    if (original.has(name)) headers.set(`Nango-Proxy-${name}`, original.get(name));
  }
  return fetch('https://api.nango.dev/proxy', {
    method: 'POST', headers, body: init.body, signal: init.signal, redirect: 'error'
  });
};
const client = new Client(
  { name: 'chat-demo', version: '1.0.0' },
  { versionNegotiation: { mode: { pin: '2026-07-28' } } }
);
try {
  await client.connect(new StreamableHTTPClientTransport(url, { fetch: proxyFetch }));
  console.log(await client.listTools());
  console.log(await client.callTool({ name: 'get_project_brief', arguments: { projectKey: 'demo' } }));
} finally {
  await client.close();
}
```

</details>

## 上线前，先处理这五个坑

本地查到 demo 项目，只解决了调用问题；上线还要管住账号、网络目标和失败后的动作。

1. **授权成功，却查到了别人的项目**　症状：用户查询 demo，结果来自另一个账号或组织。原因：环境级 API Key 能选择连接，但标签和参数格式不提供产品用户级、项目级权限。怎么办：每次执行都从登录身份解析连接，并在实际查询中检查资源归属；个人、公司与组织共享账号分别保存，写动作审批绑定到具体工具和参数。

2. **地址填对了，工具还是连不上**　症状：授权后报 `unsupported_provider`、协议错误，或者请求跑向错误地址。原因：Generic 的注册条件、代理地址和协议转发是三道不同配置，远程地址还会触发授权发现与网络访问。怎么办：审核 HTTPS 目标及其发现端点，按实际协议处理请求头和返回流，给内网接入设置独立受控通道，并先完成工具发现再执行 demo 查询。

3. **一次超时，创建了两个待办**　症状：用户只批准一次，系统却重复写入。原因：请求可能已成功而响应丢失，JSON-RPC 请求编号不提供业务去重，关闭连接也不撤回已发生的写入。怎么办：写入默认不盲目重试，将未知结果记为 `outcome_unknown`，利用上游幂等机制或业务操作记录核验，再决定重试、补偿或请用户处理。

4. **菜单有这个工具，模型却填错参数**　症状：发现成功，查询时缺字段、类型错误，或者模型听从了工具结果中的额外指令。原因：输入结构可能不完整，工具名称可能重名，服务说明、只读声明和返回内容都是外部数据。怎么办：保留原 schema 做后端校验，处理嵌套与引用，把工具权限和写入批准放在执行代码里；敏感参数发给陌生服务前展示目标，同时限制调用次数与时间预算。

5. **第二次回来，又得从头开始**　症状：令牌失效、参数更新或临时故障后，用户要重新授权并重说任务。原因：连接状态、聊天任务和短期执行权限有各自的生命周期，不能靠一条“连接成功”文案维持。怎么办：保存任务等待点与已完成部分，用重连恢复现有连接，刷新工具缓存；权限单过期后重新检查权限，已发出的写入单独核验，保留成果再继续。

<details>
<summary>第 1、2 个坑的连接核验与协议细节</summary>

授权事件中检查 `type=auth`、`operation=creation` 和 `success=true`，再核对 environment、provider 与 `providerConfigKey`。使用后端生成的 `connect_request_id` 找待授权记录，按用户和组织核对归属，最后读取 `connection_config.mcp_server_url` 对照已批准地址。元数据读取可不授予 `environment:connections:read_credentials`，避免把凭证顺手读进日志。

验签使用独立 Webhook signing key，对原始 body 校验 `X-Nango-Hmac-Sha256`；不要先解析再重新序列化。配置 Node SDK 的 `webhookSigningKey` 后可调用 `verifyIncomingWebhookRequest`。接收端先可靠保存事件再响应，后台核验与连接写入做幂等；重复 webhook 或前端刷新不应产生重复连接。

连接先进入 `discovering`，协议与菜单取得成功后变成 `ready`；第一次业务调用成功另外记任务验收。公网部署还需授权服务和元数据，数据库查询带上调用者权限，并替换示例的 localhost 校验配置。

固定源码中的 Generic 没有默认代理地址，所以调用要显式提供完整 MCP URL；服务器配置也可能关闭或拒绝地址 override。代理会去掉地址末尾的斜杠，再拼接 endpoint，严格要求 `/mcp/` 的服务要处理这个差异；需要送给服务的头加 `Nango-Proxy-` 前缀，由代理剥前缀转发。[代理头实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/proxy/allProxy.ts#L192-L210)

新版 `2026-07-28` 使用每请求 `_meta` 与匹配的协议头，并支持 `server/discover`；SDK 的 `auto` 模式负责探测。旧服务可能使用 `initialize` 和 session 头，交给对应客户端管理；任意报错不能都触发旧协议回退。Nango Agent Sessions 的固定源码仍使用兼容入口，客户端按服务端广告与响应选择协议。

上游可以返回 JSON 或 SSE，客户端按 `Content-Type` 解析，所以适配器不能一律调用 `response.json()`。新版进一步用户输入需要任务等待状态；HTTP 成功之后，还要检查 JSON-RPC error、工具的 `isError` 和是否完成，新版完成标记为 `resultType=complete`，原始协议响应与 SDK 解包后的结果要分开。工具分页使用 `nextCursor`，按连接与授权范围隔离缓存。

</details>

<details>
<summary>第 4、5 个坑的参数发现与长期维护细节</summary>

工具参数可能包含嵌套对象、数组约束或 `$ref`，模型接口接受的结构与原始校验规则需要适配。目录搜索与 Nango 的工具搜索也不同：核心能力可以像预先编好的操作脚本，部署成 Action 函数，再通过临时的工具权限单 Agent Sessions 指定连接、开放动作和有效期；用户自带服务走外部 MCP 接入路径。

这份权限单返回 `mcp_url` 与 `session_token`，令牌放在后端传输层。示例可以限定已有 GitHub 连接只用 `get-repository`，开放 `nango_tool_search` 与 `nango_execute`，保持通用 `nango_proxy` 关闭，设置 `expires_in=5m`；五分钟按任务调整，会话不能延长，终止后拒绝新请求但不取消正在执行的调用。[Agent Sessions](https://nango.dev/docs/guides/agent-sessions)

固定源码里的搜索使用 Fuse 文本模糊匹配，`/[^a-z0-9]+/` 分词让纯中文查询得到空词集合，中文产品要生成英文操作词或增加自己的检索。Pinned actions 使用允许额外属性的空对象 schema，最佳搜索匹配才读取输入模型；参数不存在与参数不可取得是不同状态，后者不能当成无需参数，更不能靠模型猜必填项。

令牌刷新失败可能是临时问题，Nango 会报告失败与恢复；持续失效时使用 reconnect session。删除再新建会改变或丢失已有数据配置，产品里停用、删除连接和到提供商撤销授权也要分开，已产生的外部数据不会随之撤回。授权恢复后，检查原审批、是否已执行和数据变化，再恢复任务。

工具缓存保存更新时间或结构摘要，写入工具变化后重新审查。核心函数代码进仓库，使用模板起步并缩小输出，通过测试与发布流程更新；AI 生成新函数还要编译、试运行和部署，连接现成服务与上线新代码分开处理。

运维记录要串起聊天任务、所用账号与外部结果，并区分授权、参数、上游错误和未知结果。日志筛掉凭证，私有文档按权限与保留规则处理；每次发布验证跨用户访问、参数拒绝、重复事件、取消和部分成功，SDK 或上游更新先用测试连接验证。产品同时观察授权完成与首次任务成功、耗时、重复操作和成本，逐步收紧无用工具。

如果自带 MCP 是核心卖点，首版先完成经过验证的远程接法，再扩目录、本地运行和其他认证；如果主要交付固定业务任务，可以先维护少量 Action，再加入扩展入口。两种选择都把一次真实任务结果作为首次体验的验收，连接器数量单独说明不了任务效果。

需要持续同步资料时再增加同步检查。Nango 发布的 Replit 案例讲的是超过 30 个连接器的触发能力和增量同步；开发助手可用 Management MCP 配置调试，终端用户的运行时权限另设。Cloud、托管到自己的云和自维护承担不同运维工作，根许可证为 Elastic License 2.0，自托管功能范围与托管限制需要一起核对。

</details>

<details>
<summary>先用 GitHub 排除 Nango 账号配置问题</summary>

官方 Quickstart 使用 `github-getting-started`：创建测试连接并授权，在 Functions 启用 `get-repository`，将连接 ID 放进 `NANGO_CONNECTION_ID`。保存下面为 `check-nango.mjs`，设置后端 `NANGO_API_KEY` 后运行；执行错误去 Logs 查连接与外部请求，这个检查对应 Nango Action 路径。

```javascript
import { Nango } from '@nangohq/node';

const nango = new Nango({ apiKey: process.env.NANGO_API_KEY });
console.log(await nango.triggerAction(
  'github-getting-started', process.env.NANGO_CONNECTION_ID,
  'get-repository', { owner: 'NangoHQ', repo: 'nango' }
));
```

使用 API 创建 Generic 集成时，`unique_key` 填自己的集成 ID，`provider=mcp-generic`，凭证类型为 `MCP_OAUTH2_GENERIC`，`client_name` 和 `client_uri` 描述产品客户端；终端用户的 access token 在后面的 OAuth 中取得。前端使用 `@nangohq/frontend@0.71.12` 的 Connect UI，`connect` 事件先更新界面，再以已验签的后端事件确认归属。

</details>

## 最后，回到用户那句话

用户选工具，Nango 保管授权，后端按当前账号执行，模型读结果。

先用 demo 项目跑通菜单、参数和返回，再把授权与任务恢复接回原聊天，用户才会得到一份有依据的回答。

上线前把这五个坑处理好，并持续维护连接和工具版本，下一次“帮我看看 demo 项目卡在哪”才不用从头再来。

## 参考资料

- [Nango 固定源码基线（6b794c6）](https://github.com/NangoHQ/nango/tree/6b794c68f7f70302a3151b9ae9bb2b0e21edf117)
- [版本文件](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/package.json)
- [Nango MCP Auth：目录内与自定义服务器接入](https://nango.dev/docs/guides/auth/mcp-auth)
- [MCP 传输方式](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [Nango Agent Sessions：连接与工具范围、会话生命周期](https://nango.dev/docs/guides/agent-sessions)
- [连接归属要求](https://nango.dev/docs/guides/auth/auth-guide)
- [官方 Registry API](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/reference/api/official-registry-api.md)
- [服务器描述格式](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/reference/server-json/generic-server-json.md)
- [Registry 审核政策](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/modelcontextprotocol-io/moderation-policy.mdx)
- [目录聚合建议](https://github.com/modelcontextprotocol/registry/blob/bf4e88cbe8d1a635c06144ccea1d24cb52fa6186/docs/modelcontextprotocol-io/registry-aggregators.mdx)
- [Nango Connect session API：授权会话参数](https://nango.dev/docs/reference/backend/http-api/connect/sessions/create)
- [MCP Tools：发现、输入结构与执行结果](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [官方 Quickstart](https://nango.dev/docs/getting-started/quickstart)
- [创建集成 API](https://nango.dev/docs/reference/backend/http-api/integration/create)
- [固定版本的字段校验](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/helpers/validation.ts)
- [会话请求类型](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/types/lib/connect/api.ts)
- [授权配置合并逻辑](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/oauth.controller.ts)
- [前端 SDK](https://nango.dev/docs/reference/frontend/frontend-sdk)
- [Nango Webhooks：连接事件与验签](https://nango.dev/docs/guides/platform/webhooks-from-nango)
- [读取连接](https://nango.dev/docs/reference/backend/http-api/connections/get)
- [连接读取权限](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/connection/connectionId/getConnection.ts)
- [验签实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/node-client/lib/index.ts)
- [版本协商](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [Nango session 服务入口](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/agent/mcp/sessionMcp.ts)
- [SDK 新旧入口说明](https://github.com/modelcontextprotocol/typescript-sdk/blob/8aabbdcef6e016978a3132045281dfbd51c69792/docs/protocol-versions.md)
- [Generic provider 配置](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/providers/providers.yaml)
- [Nango Proxy 源码：配置与 URL 拼接](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/shared/lib/services/proxy/utils.ts)
- [代理头解析](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/proxy/allProxy.ts)
- [MCP Streamable HTTP：请求头、协议版本与响应流](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [SDK 版本与包说明](https://github.com/modelcontextprotocol/typescript-sdk/blob/8aabbdcef6e016978a3132045281dfbd51c69792/README.md)
- [SDK HTTP 服务指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/8aabbdcef6e016978a3132045281dfbd51c69792/docs/serving/http.md)
- [SDK 客户端连接指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/8aabbdcef6e016978a3132045281dfbd51c69792/docs/clients/connect.md)
- [MCP 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Nango Generic 条件](https://nango.dev/docs/integrations/all/mcp-generic)
- [工具搜索实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/services/agentSessionToolSearch.service.ts)
- [Pinned schema 实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/server/lib/controllers/agent/mcp/sessionServer.ts)
- [权限实现说明](https://nango.dev/blog/how-developers-secure-ai-agent-access-to-apis/)
- [Generic 地址发现实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/shared/lib/clients/mcpGeneric.client.ts)
- [MCP 安全实践](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [代理重试实现](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/packages/shared/lib/services/proxy/retry.ts)
- [令牌刷新](https://nango.dev/docs/guides/auth/token-refreshing)
- [删除连接接口](https://nango.dev/docs/reference/backend/http-api/connections/delete)
- [Functions 开发流程](https://nango.dev/docs/guides/functions/functions-guide)
- [Replit 案例](https://nango.dev/case-studies/replit/)
- [自维护说明](https://nango.dev/docs/guides/platform/self-hosting/self-managed)
- [固定版本许可证](https://github.com/NangoHQ/nango/blob/6b794c68f7f70302a3151b9ae9bb2b0e21edf117/LICENSE)
- [Management MCP 的职责](https://nango.dev/blog/how-to-build-ai-agent-integrations-using-the-nango-management-mcp)
