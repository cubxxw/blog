---
title: '这是一篇我职业生涯总结的 OpenIM 故障排查指南'
ShowRssButtonInSectionTermList: true
date: '2024-04-16T01:21:13+08:00'
draft: false
showtoc: true
tocopen: true
type: posts
author: '熊鑫伟，我'
keywords: ['OpenIM', '故障排查', '调试', '技术支持', '软件开发']
tags: ['博客 (Blog)', 'OpenIM', '故障排查 (Troubleshooting)', '调试 (Debugging)', '技术支持 (Technical Support)']
categories: ['开发 (Development)']
description: '本指南提供了一个全面的 OpenIM 故障排查方法和调试技术概览，基于真实的开发和操作经验。非常适合希望在 OpenIM 环境中提升问题解决能力的开发人员。'
---

如果你想在寻找一篇针对 OpenIM 并且准备好具体的问题想来这里找到答案的话。那么很遗憾的告诉你，这篇并不是记录问题和编写答案的，这篇是读者经过开发和业务实战中以 OpenIM 为例总结出来的故障排查的方法，以及调试的技巧。如果你想从我这里学习到故障的排查以及问题定位的经验，那么请你继续读下去。

我将会从工作中经常出现的一些情况总结成类型来分析。

一个小小的玩笑，或许我比较逆人性，其他人都很害怕遇到 bug 的时候，我倒是对出现 bug 比较兴奋，我们后期读代码的时间和维护代码的时间其实是远远高于写代码的时间的。所以面对 bug， 我们的思考和总结尤其是非常重要，尤其是帮我们在写代码的时候也思考，代码的扩展性，和错误处理，是否可以禁得起考验 ~

## 故障排查的基本概念

故障排查，我主要是分为几种情况，分别是，编译的故障排查，启动的故障排查，以及服务运行故障排查。这几种情况的故障排查思路都是大同小异的。

首先，我们需要发现问题，然后定位问题。我们可能需要经过多轮分析排查才能定位到问题的根因，最后去解决问题。排障流程如下图所示：

```go
开始
  |
  V
发现问题 ------> 记录问题的症状和相关情况
  |
  V
定位问题
  |
  V
进行初步分析 --------> 确定可能的原因
  |                    |
  V                    |
是否需要深入分析？-----> 是 ------> 进行深入分析
  |                    |             |
  |                    |             V
  |                    |          确定具体原因
  |                    |             |
  |                    |             V
  |                    <-------- 是否已找到根本原因？
  |                               |
  |                               否
  |
  V
是否解决了问题？
  |
  是 ------> 记录解决过程和解决方案
  |
  |
  否 ------> 调整策略或寻求帮助
  |
  V
结束
```

如果想排查问题并解决问题，你还需要具备以下两个基本能力：

- 能够找到组件日志，并理解错误日志的内容；
- 根据错误日志，找出解决方案。

### 发现问题

要排查问题，我们首先要发现问题，我们通常用下面这几种方式来发现问题：

- 代码审查：在开发过程中进行代码审查可以发现代码中的问题和潜在的错误；
- 安全审计：通过安全审计可以发现软件或系统中的安全漏洞和风险；
- 服务状态检查：可以通过检查服务的运行状态，来发现问题。例如：如果是 linux-system 模式部署 openim，那么启动 openim-api 服务后，执行 ``systemctl status openim-api` 发现 openim-api 启动失败，即 `Active` 的值不为 `active (running)`；
- 代码测试：通过进行各种类型的测试，如单元测试(util-test)、集成测试(api-test)、系统测试（e2e-test）等，可以发现软件或系统中的问题。例如：访问 openim-api 服务，发现接口返回异常错误码、接口值返回不对等；
- 自动化测试：我们也可以通过运行自动化测试，来帮助我们快速发现问题；
- 日志记录：在服务或接口异常时，我们需要排查日志。通过在日志中发现一些 `WARN`、`ERRORV`、`PANIC`、`FATAL` 等级别的错误日志来发现问题；
- 监控告警：通过监控指标、告警等，也可以发现问题。如果通过日志，能发现已经发生的问题，通过监控，还可以发现一些潜在的问题；
- 用户反馈：产品或功能发布后，用户在使用过程中，也可能会发现一些问题，并将问题反馈给开发人员。

上面发现问题的途径多种多样，有些发现问题的途径，通常发生在特定的软件阶段，例如：测试阶段，我们可以通过测试、质量保障团队来发现问题。产品发布后，可以通过用户反馈来发现问题。

但在开发阶段，发现问题最常用的手段是：**开发自测** -> **日志** -> **监控**。接下来，我来详细介绍下，开发阶段具体如何排查问题。

### 定位问题

发现问题之后，就需要我们定位出问题的根本原因。开发阶段，我们可以通过下面这三种方式来定位问题。

- 查看日志，它是最简单的排障方式（需要对代码的日志处理有要求）
- 使用 Go 调试工具 Delve 来定位问题。
- 添加 Debug 日志，从程序入口处跟读代码，在关键位置处打印 Debug 日志，来定位问题。

在定位问题的过程中，我们可以采用“顺藤摸瓜”的思路去排查问题。比如，我们的程序执行流程是： `A -> B -> ... -> M -> N`. 其中 A、B、N 都可以理解为一个排查点。所谓的排查点，就是需要在该处定位问题的点，这些点可能是导致问题的根因所在。

在排障过程中，你可以根据最上层的日志报错 N，找到上一个排查点 M。如果经过定位，发现 M 没有问题，那继续根据程序执行流程，向上查找可能出错的排查点。如此反复，直到找到最终的排查点（例如 B），也就是出问题的根因，即为 Bug 点。执行流程如下图所示：

```go
+----+     +----+                +----+     +----+
| A  | --> | B  | --> ... --> | M  | --> | N  |
+----+     +----+                +----+     +----+
  ^          ^                             |
  |          |                             |
  +----------+-----------------------------+
     向上追溯，逐级排查直到找到问题源头

--------------------------------------------------
流程说明：
1. 开始于错误报告的排查点 N。
2. 如果 N 点检查正常，向上追溯至前一个排查点 M。
3. 重复步骤 2，直至找到问题源头，如点 B。
4. 定位到 B 点后，对导致错误的具体问题进行修复。
```

**查看日志定位问题：**

我们首先应该通过日志来定位问题，这是最简单高效的方式。要通过日志来定位问题，你需要知道组件日志的保存位置，通常是标准输出或者某个日志文件，你不仅要会看日志，还要能读懂日志，也就是理解日志报错的原因。

下面我来具体讲解用这种方法定位问题的步骤 ~

**第一步，确保服务运行正常**

如果你选择的是源码或者容器的形式安装的 OpenI，普通的源码方式，那么在项目的根目录可以使用：

```go
make check
```

来检查 OpenIM 的各个服务是否是正常启动的。

如果你是使用的 linux system 来部署的 OpenIM ，类似的可以在任意的位置都使用：

```go
systemctl status openim-api
```

来检测 OpenIM 的 API 组件是否正常的运行。

可以看到，`Active` 不是 `active (running)`，说明 openim-api 服务没有正常运行。从上面输出中的 `Process: 1092 ExecStart=/opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml (code=exited, status=1/FAILURE)`信息中，我们可以获取以下信息：

- openim-api 服务启动命令为 `/opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml`。
- `/opt/openim/bin/openim-api` 加载的配置文件为 `/opt/openim/etc/oopenim-api.yaml`。
- `/opt/openim/bin/openim-api` 命令执行失败，退出码为 `1`，其进程 ID 为 `1092`。

这里注意，`systemctl status` 会将超过一定长度的行的后半部分用省略号替代，如果想查看完整的信息，可以追加-l参数，也就是 `systemctl status openim-api -l` 来查看。

既然 `openim-api` 命令启动失败，那我们就需要查看 `openim-api` 启动时的日志，看看有没有一些报错日志。

接下来，就进入**第二步，查看 openim-api 运行日志。**

那么如何查看呢？我们有 3 种查看方式，我在下面按优先级顺序排列了下。你在定位问题和查看日志时，按优先级 3 选 1 即可，1 > 2 > 3。

1. 通过 `journalctl -u openim-api` 查看。
2. 通过 openim-api 日志文件查看。
3. 通过 console 查看。

下面我来分别介绍下这三种查看方式。

先来看优先级最高的方式，通过 `journalctl -u openim-api`查看。

systemd 提供了自己的日志系统，称为 journal。我们可以使用 `journalctl` 命令来读取 journal 日志。`journalctl` 提供了 `-u` 选项来查看某个 Unit 的日志，提供了 `_PID` 来查看指定进程 ID 的日志。在第一步中，我们知道服务启动失败的进程 ID 为 `1092`。执行以下命令来查看这次启动的日志：

```go
journalctl -u openim-api
```

> 你也可以执行 `journalctl _PID=1092`，效果等效于 `journalctl -u openim-api`。
> 

从上面的日志中，我们找到了服务启动失败的原因： openim-api 启动时，发生了 Panic 级别的错误：`panic: runtime error: invalid memory address or nil pointer dereference`。引起 Painic 的代码行为：`/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`。到这里，你已经初步定位到问题原因了。

我们再来看通过 openim-api 日志文件查看的方式。

作为一个企业级的 IM 开源项目，openim-api 的日志当然是会记录到日志文件中的。在第一步中，我们通过 `systemctl status openim-api` 输出的信息，知道了 openim-api 启动时加载的配置文件为 `/opt/openim/etc/openim-api.yaml`。所以，我们可以通过 openim-api 的配置文件 `openim-api.yaml` 中的 `log.storageLocation` 配置项，查看记录日志文件的位置：

```yaml
###################### Log Configuration ######################
# Log configuration
#
# Storage directory
# Log rotation time
# Maximum number of logs to retain
# Log level, 6 means all levels
# Whether to output to stdout
# Whether to output in json format
# Whether to include stack trace in logs
log:
  storageLocation: ${LOG_STORAGE_LOCATION}
  rotationTime: ${LOG_ROTATION_TIME}
  remainRotationCount: ${LOG_REMAIN_ROTATION_COUNT}
  remainLogLevel: ${LOG_REMAIN_LOG_LEVEL}
  isStdout: ${LOG_IS_STDOUT}
  isJson: ${LOG_IS_JSON}
  withStack: ${LOG_WITH_STACK}
```

可以看到，openim-api 将日志记录到 `${LOG_STORAGE_LOCATION}` 文件中。所以，我们可以通过查看 `${LOG_STORAGE_LOCATION}` 日志文件，来查看报错信息。

当然，我们也可以直接通过 console 来看日志，这就需要我们在 Linux 终端前台运行 openim-api（在第一步中，我们已经知道了启动命令）：

```bash
# /opt/openim/bin/openim-api --config=/opt/openim/etc/oopenim-api.yaml
2024/02/02 18:43:19 maxprocs: Leaving GOMAXPROCS=32: CPU quota undefined
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x1de02f7]

goroutine 1 [running]:
......
```

通过上面这 3 种查看方式，我们均能初步定位到服务异常的原因。

使用下面的命令可以查看关于 openim 的所有组件的状态信息 （target）：

```go
systemctl status openim.target
```

更详细的 linux system 部署方法可以看 https://github.com/openimsdk/open-im-server/blob/main/docs/contrib/install-openim-linux-system.md

如果使用的是 Docker 的部署，那么 docker compose 我们配置了健康监测，直接使用 docker ps 查看容器的状态，然后使用：

```go
docker logs -f openim-server
```

查看 OpenIM 的启动日志来分析。

**使用 Go 调试工具 Delve 来定位问题:**

查看日志是最简单的排障方式，通过查看日志，我们可能定位出问题的根本原因，这种情况下问题就能得到快速的解决。但有些情况下，我们通过日志并不一定能定位出问题，例如：

- 程序异常，但是没有错误日志。
- 日志有报错，但只能判断问题的面，还不能精准找到问题的根因。

遇到上面这两种情况，我们都需要再进一步地定位问题。这时候，我们可以使用 Delve 调试工具来尝试定位问题。Delve 工具的用法你可以参考Delve 使用详解 。

我之前博客写过一章，关于 Delve 的用法可以阅读： https://nsddd.top/zh/posts/use-go-tools-dlv/

**添加 Debug 日志来分析排查问题：**

如果使用 Delve 工具仍然没有定位出问题，接下来你可以尝试最原始的方法：添加 Debug 日志来定位问题。这种方法具体可以分为两个步骤。

**第一步，在关键代码段添加 Debug 日志。**

你需要根据自己对代码的理解来决定关键代码段。如果不确定哪段代码出问题，可以从请求入口处添加 Debug 日志，然后跟着代码流程一步步往下排查，并在需要的地方添加 Debug 日志。

例如，通过排查日志，我们定位到 `/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`` 位置的代码导致程序 Panic

当你在使用 Go 语言开发项目时，遇到程序崩溃（Panic）的情况，通常是因为某个变量未被正确初始化或使用了空指针。在这种情况下，合理的调试和错误处理可以显著提高你的问题解决效率。以下是如何有效地定位并解决这种问题的步骤，以及一些关键的代码演示：

**第一步：定位问题**

通过日志文件，你已经找到了问题出现的代码文件位置，如 `/home/colin/workspace/golang/src/github.com/openimsdk/open-im-server/pkg/*/*.go:*`。接下来，我们需要验证是否存在空指针使用。这通常是导致 Panic 的主要原因。为此，你可以在疑似出现问题的地方增加一些调试代码，来检查相关变量。

假设你怀疑变量 `o` 是 `nil`，你可以在使用 `o` 之前添加以下代码来确认：

```go
if o == nil {
  log.Errorf("ERROR: 'o' is nil")
}

```

同时，增加错误处理和调试日志也是一个很好的做法。这不仅可以帮助你确认错误的位置，还可以了解错误发生的上下文。例如，你可以在处理错误的代码中添加调试日志：

```go
if err != nil {
  log.Debugf("DEBUG POINT - 1: %v", err)
  return err
}
# systemctl status openim-api
```

这段代码在检测到 `err` 不为空时，会记录一个调试日志，并返回错误。通过查看这个日志，你可以更容易地理解错误发生的情况。

**第二步：重新编译并启动程序**

在添加了必要的调试代码和错误处理后，你需要重新编译源代码以确保修改生效。如果我们想要只编译 openim-api 组件，那么使用下面的命令：

```
make build BINS="openim-api"
```

编译完成后，运行你的程序。观察程序是否再次出现 Panic，以及日志中是否有新的信息帮助你进一步定位问题:

我们添加完 Debug 代码后，就可以重新编译并运行程序了。程序运行后，继续通过日志查看是否有以下日志输出：

```
Var o is nil

```

如果有，说明 `o` 没有被初始化、如果没有，说明猜想错误，继续其他 Debug。这里，我们加完之后，日志输出中有 `ERROR: 'o' is nil` 字符串，说明 `o` 没有被初始化。

在你添加 Debug 日志的过程中，因为这些 Debug 日志能够协助你定位问题，从侧面说明这些日志是有用的，所以你可以考虑保留这些 Debug 日志调用代码。

**第三步，修复代码，并重新编译、启动、测试**

我们找到了上面的错误，并且解决上面的错误之后，便可以根据开发指南，编译、运行并测试。修复后，重新运行后，检查 openim-api 服务状态：

```go
systemctl status openim-api
```

出现 `Active: active (running)` 字样，说明 openim-api 运行成功，bug 被修复。

**代码演示和小技巧**

在 Go 语言项目开发中，合理利用日志是解决问题的关键。这里提供一个简单的函数示例，演示如何在函数中添加错误处理和调试日志：

```go
func loadData(o *DataObject) error {
  if o == nil {
    log.Errorf("loadData error: data object is nil")
    return fmt.Errorf("data object is nil")
  }

  // 假设这里有复杂的数据处理逻辑
  err := processComplexData(o)
  if err != nil {
    log.Debugf("DEBUG POINT - 2: %v", err)
    return err
  }

  return nil
}

```

在这个示例中，`loadData` 函数接受一个可能为 `nil` 的数据对象指针 `o`。函数开始时检查 `o` 是否为 `nil`，并在是 `nil` 的情况下记录错误日志并返回错误。在处理数据时，如果遇到错误，同样记录调试日志并返回错误。

### 解决问题

在定位问题阶段，我们已经找到了问题的原因，接下来就可以根据自己对业务、底层代码实现的掌握和理解，修复这个问题了。至于怎么修复，你需要结合具体情况来判断，并没有统一的流程和方法论，这里就不多介绍了。

## 编译故障排查

编译的故障排查其实是相对比较简单和明确的。

OpenIM 是使用以下命令构建整套服务的：

```go
make build
```

在此阶段，构建失败通常是由两种问题引起的：

1. **Go 语言版本过低**：实际上 Go 语言版本需要满足一定的最低标准才能确保软件能够正常构建和运行。我们在 Makefile 中设置了对 Go 版本的监控，使用 `GO_MINIMUM_VERSION` 变量来定义支持的最低版本，并通过一个脚本段来检查当前环境中的 Go 版本是否满足此要求。如果版本过低，则会提示错误，要求安装更新版本的 Go。
2. **Go 语言包下载网络错误**：Go 包的下载通常依赖于网络环境。默认情况下，建议使用 Go 官方的代理（例如 `https://proxy.golang.org`），这可以提高包的下载速度并确保下载的安全性。然而，在某些地区，特别是在网络连接到国外服务器较慢或不稳定的情况下，构建过程中可能会出现长时间无响应的情况，这通常是因为拉取依赖包过于缓慢。在这种情况下，推荐设置网络代理，或者使用国内的镜像源如七牛云（`https://goproxy.cn`）和阿里云（`https://mirrors.aliyun.com/goproxy/`），这些代理提供了更快的访问速度和更好的可用性。

## 启动故障排查

我们举个例子，有以下错误：

```go
root ▻ ◇┈◉ mysql -h127.0.0.1 -uroot -p 'cubxxw
bash: /usr/bin/mysql: 没有那个文件或目录
```

对于这个错误，我们首先来理解错误内容：mysql 命令没有找到，说明没有安装 mysql，或者安装 mysql 失败。

那么，我们的解决方案就是重新执行 MariaDB 的安装步骤：

```go
apt install mysql-client-core-8.0     # version 8.0.35-0ubuntu0.22.04.1,
```

## 服务运行故障排查

服务器运行的错误是非常难以排查的。

> 当我们收到线上服务的报警，如何正确的处理？当遇到莫名的性能问题，如何定位到 RootCase ?线上问题诊断总是困难重重，但是我们可以通过成熟的方法论和工具链来帮助我们迅速定位问题。
> 

报警是一个客观事实，即使是误报也说明了出现了一些没有预期的 case，我们无法穷尽所有的问题，但是我们可以建立标准的流程和 SOP手册，去拆分问题的颗粒度，简化难度，更加容易的去定位问题。

**下面是一个基础遇到问题的流程：**

- don't panic，遇到 panic 不要慌张，在紧张和压力面前越是慌张越会犯错，反而忽略了正确的线索。
- 然后在群里同步你已开始介入，让大家知道目前的进度
- 80% 的事故都是当日上线的变更（可以是代码，环境和配置的变更 ~）。
- 对于事故，止损是第一要务，即使会破坏现场，事后我们总是可以靠着蛛丝马迹找出线索。不能降级就重启，重启无效就回滚。
- 从资源利用率到延迟建立不同的 SOP。遇到问题时我们只需要按照 SOP 的步骤，足矣解决90% 的问题。对于解决不了，要呼叫队友和大佬进行支援，语音是最有效的沟通，回头再追踪和记录问题。

建立好 SOP , 培养组织的战斗力，不能只是一个人的单打独斗。建立了完善的 SOP，即使一个新人也能迅速投入战场，参与到线上排查。我们作为文档如下：

- 服务调用异常排查SOP
- 响应延迟增长问题排查SOP
- 熔断问题排查SOP
- Mysql响应RT升高排查 SOP
- Redis响应RT升高排查SOP
- ES响应RT、错误率升高SOP
- goroutine异常升高排查SOP
- 实例CPU、内存异常排查SOP
- 流量环比上涨排查SOP
- 业务常见问题排查

限于内部的敏感性，这里基于上述资料做一个总结，处理手册应该做好以下几点：

- 涵盖各种工具的链接，有服务的 Owner，基建的负责人，要做到**不靠搜，不靠问**
- Grafana 等工具做好 Dashboard ，一个好的 Dashboard 能够直观的定位到有问题的 API ，可以看到 P99, 95, 90 等延迟, QPS、流量等监控。错误率是重点监控的值，**延迟只是表象，错误能帮我们接近真相**。
- 查看对应的服务是否存活？是否存在资源瓶颈（CPU 打满等）？Goroutine 是否飙升？全家桶炸了？

这种就直接重启，大概率是资源连接申请了没有释放。重启无效就止血。

- 基建（Redis，Mysql 等）的延迟，查看当前的连接数，慢请求数，硬件资源等。性能之巅里的 **USE**（utilization、saturation、erros）是个很好的切入点，对于所有的资源，查看它的使用率、饱和度和错误。
- 部分接口慢，直接限流防止雪崩，抓一条请求看看 tracing ，看看链路的耗时。

**CPU过高如何排查**

CPU 使用率过高是服务端开发中常见的问题，它可能导致性能下降，响应时间增加，甚至服务崩溃。针对 Go 语言开发的服务，我们可以使用一系列工具和技术来诊断和解决这些问题。以下是排查 CPU 使用率过高的一般步骤：

**1. 收集性能剖析数据**

首先，你需要使用 Go 语言的 **`pprof`** 工具来收集和分析性能数据。**`pprof`** 是 Go 语言标准库的一部分，提供了查看和分析性能相关数据的接口。

- **启动 CPU 剖析：** 在你的服务中导入 **`net/http/pprof`** 模块，并确保你的程序在运行时可以通过 HTTP 访问这些剖析端点。然后，使用以下命令开始收集 CPU 剖析数据：
    
    ```bash
    go tool pprof http://<your-service-address>:<port>/debug/pprof/profile?seconds=30
    ```
    
    这条命令会触发服务器运行 30 秒的 CPU 剖析，并收集此期间的 CPU 使用数据。**`seconds`** 参数可以根据需要调整，以收集更长或更短时间的数据。
    

**2. 分析 CPU 剖析数据**

收集到 CPU 剖析数据后，使用 **`go tool pprof`** 工具来分析这些数据。这可以帮助你找到 CPU 使用率高的原因：

- **打开剖析文件：** 使用 **`go tool pprof`** 加载剖析文件。你可以通过上一步生成的 URL 或直接加载保存的剖析文件。
- **查看热点函数：** 在 **`pprof`** 的交互式命令行中，使用 **`top`** 命令查看消耗 CPU 最多的函数。这将帮助你识别哪些函数最耗费 CPU 资源。
    
    ```bash
    top
    ```
    
- **生成火焰图：** 火焰图提供了一个可视化的方式来查看各函数对 CPU 的贡献。在 **`pprof`** 工具中，使用 **`web`** 命令生成火焰图，需要有图形界面支持：
    
    ```bash
    web
    ```
    

**3. 优化代码**

根据 **`pprof`** 分析结果，识别出 CPU 使用率高的代码段后，你可以进一步分析这些代码的运行逻辑和性能瓶颈。可能的优化措施包括：

- **优化算法和数据结构：** 使用更高效的算法或数据结构来减少计算复杂度。
- **减少锁的使用：** 查看是否存在不必要的锁竞争，尝试减少锁的范围或采用更高效的并发控制方法。
- **异步处理：** 对于 IO 密集型的操作，考虑使用异步或非阻塞调用来减轻 CPU 负载。

## 自动化 CICD 的故障排查

OpenIM 大量用到了自动化的工具和手段，到目前为止， OpenIM 的自动化手段已经非常成熟了。

OpenIM 使用的 CICD 主要是基于 github actions 来做的，地址是 https://github.com/openimsdk/open-im-server/actions

筛选了部分的 CICD 报错信息，举例 ：https://github.com/openimsdk/open-im-server/actions?query=is%3Afailure

我们以其中的 API 测试失败为例看看：

> 对应的链接是： [https://github.com/openimsdk/open-im-server/actions/runs/8687693217?pr=2148https://github.com/openimsdk/open-im-server/actions/runs/8687693217?pr=2148](https://github.com/openimsdk/open-im-server/actions/runs/8687693217?pr=2148)
> 

CICD 中有很多的 jobs ，我们直接跳转到对应报错的 jobs 上即可。

定位到错误：

```go
[2024-04-15 10:41:04 UTC] Response from user registration: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}
!!! Error in /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:53 
  Error occurred: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}, You can read the error code in the API documentation https://docs.openim.io/restapi/errcode
Call stack:
  1: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:53 openim::test::check_error(...)
  2: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:705 openim::test::invite_user_to_group(...)
  3: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1091 openim::test::group(...)
  4: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1444 openim::test::api(...)
  5: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1456 openim::test::test(...)
  6: /home/runner/work/open-im-server/open-im-server/scripts/install/test.sh:1465 main(...)
Exiting with status 1
make[1]: *** [scripts/make-rules/golang.mk:200: go.test.api] Error 1
make: *** [Makefile:173: test-api] Error 2
===========> Run api test
{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have operationID: 1001 ArgsError"}
{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have token: 1001 ArgsError"}
User registration failed.
TODO: openim test man
***
Requesting force logout for user: {
  "platformID": 2,
  "userID": "4950983283"
}
```

1. 读取服务器错误

错误信息：**`{"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}`**

**分析**：

- **`EOF`** (End of File) 错误表明在从服务器尝试读取数据时，连接意外关闭了。
- 这可能是由服务器端的崩溃或网络问题导致的。

**解决方法**：

- **检查服务器状态**：确保服务器运行正常且未遭遇崩溃。
- **网络连接**：检查网络连接是否稳定，特别是服务器和测试客户端之间的连接。
- **服务器日志**：查看服务器端的日志，寻找任何可能导致连接断开的错误或警告。

2. 参数错误

错误信息：**`{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have operationID: 1001 ArgsError"}`** 和 **`{"errCode":1001,"errMsg":"ArgsError","errDlt":"header must have token: 1001 ArgsError"}`**

**分析**：

- 这些错误指出请求头部缺少必需的参数：**`operationID`** 和 **`token`**。
- 根据API文档，这些参数是执行请求所必需的。

**解决方法**：

- **检查API请求**：审查构建API请求的代码部分，确保所有必要的头部信息都被包括。
- **更新测试脚本**：如果发现脚本中遗漏了这些参数，需要更新脚本以包含正确的参数。

**3. 脚本错误**

脚本错误提示：**`Error occurred: {"errCode":14,"errMsg":"error reading from server: EOF","errDlt":"14 error reading from server: EOF"}`**，调用堆栈显示错误来自于 **`test.sh`** 文件中多个位置。

**分析**：

- 错误提示位于脚本的不同函数调用中，指向可能的脚本逻辑问题或API调用顺序问题。

**解决方法**：

- **逐步调试**：按照调用堆栈中的顺序，逐步运行脚本的各个部分，确保每一步都能正确执行。
- **增强错误处理**：改进脚本的错误处理逻辑，确保在API调用失败时能够提供更明确的错误消息和恢复路径。

细致到 API 测试失败，分析可能的原因如下 ~

**API测试失败的原因分析**

1. **代码错误**：最直接的原因可能是代码逻辑或实现上的错误。比如，API可能没有正确处理输入数据的边界条件，或者API的逻辑处理与预期不符。
2. **环境问题**：测试环境与生产环境的不一致，或是测试环境的某些资源（如数据库、网络连接等）未能正确配置或存在问题，都可能导致测试失败。
3. **依赖服务问题**：API测试通常依赖外部服务或第三方库，如果这些服务不稳定或者更新导致不兼容，都可能影响测试结果。
4. **数据问题**：测试数据不准确或不具代表性也可能导致失败，尤其是在测试需要处理复杂数据或状态转换时。
5. **配置错误**：配置文件错误或是CI/CD流程中的步骤配置不正确，比如API密钥、环境变量设置错误等，都可以导致测试失败。

**故障排除步骤**

针对上述提到的GitHub Actions的API测试失败示例，我们可以按以下步骤进行排除故障：

1. **查看日志和报告**：首先需要查看CI/CD流程中生成的详细日志和测试报告。这些信息通常能提供失败的直接原因。
2. **本地环境复现**：尝试在本地环境中复现问题。通过这种方式，开发者可以更直接地调试和测试，排除环境配置或依赖问题。
3. **验证代码和逻辑**：检查API的代码实现和逻辑处理，确认是否存在代码级别的错误或不当。
4. **检查配置文件和环境变量**：确保所有的配置文件和环境变量都设置正确，特别是那些涉及网络、数据库连接和外部API调用的配置。
5. **与团队沟通**：如果API测试依赖于团队其他部分的工作，及时与相关团队成员沟通可能的问题和变更。

## 故障排查工具和资源

测试提`Bug`的基本要素，主要包括：

1. 期望得到的结果
2. 实际得到的结果
3. 如何重现问题

对于开源项目来说，统一的搜索问题的入门尤其重要，对于我们来说， github issue 是一个很高的追踪问题的地方，github Projects 是一个很好的总结问题的地方。

不要放过任何`Bug`，对`Bug`的处理过程要做好梳理、总结。下面是总结的模版：

```
-- 细节
-- 灾难响应
-- 事后总结
    -- 做的好的地方
    -- 做的不好的地方
```

**Q1**

服务发生`panic`时，结合日志中打印的堆栈信息，可以很容易定位到出错的代码，并作出很多可能的推测。然后，结合具体的上下文信息，能很快复现问题。整个过程中，日志是问题排查的关键。

日志必须包含`panic`的堆栈信息，最好有链路的`trace_id`信息。如果在开发过程中，有对应的`Test`就更好了。

**Q2**

对于接口响应慢的情况，可以依靠`pprof`工具进行诊断。其中，最可能的是调用外部服务慢，比如经典的`MySQL`慢查询。

如果排除了外部依赖的问题，那很可能是程序代码自身问题。通过`pprof`的各种信息展示，也能很快定位。

### pprof

pprof 支持通过两种不同的方式集成和使用：

1. **runtime/pprof**：
    - 这种方式主要用于长时间运行的服务，可以嵌入到服务中。
    - 它允许开发者在程序运行时捕获性能数据，程序结束后自动完成采样。
    - 示例代码：
        
        ```go
        import "runtime/pprof"
        import "os"
        
        func main() {
            f, err := os.Create("cpu.prof")
            if err != nil {
                log.Fatal("could not create CPU profile: ", err)
            }
            if err := pprof.StartCPUProfile(f); err != nil {
                log.Fatal("could not start CPU profile: ", err)
            }
            defer pprof.StopCPUProfile()
        
            // 你的程序代码
        }
        
        ```
        
2. **net/http/pprof**：
    - 提供一个 HTTP Handler 接口，可以在运行时通过 HTTP 请求启动和停止性能分析。
    - 这种方式非常适合随时开始或停止 Profiling，更加灵活。
    - 示例代码：
        
        ```go
        import (
            "net/http"
            _ "net/http/pprof"
        )
        
        func main() {
            http.ListenAndServe(":8080", nil)
        }
        
        ```
        

**支持的 Profiling 类型**

- **CPU Profiling**：捕获程序执行中的 CPU 使用情况，帮助发现 CPU 热点。
- **内存 Profiling**：追踪内存分配情况，识别内存泄漏或频繁分配的地方。
- **支持 Benchmark Profiling**：在运行 Go Benchmark 时可以生成性能分析文件：
    
    ```bash
    go test -bench . -cpuprofile=cpu.prof
    ```
    

**如何解读 Profiling 结果**

- **cum**（累积时间）： 显示当前函数及其调用者的总开销。
- **flat**（当前函数开销）： 显示函数自身的开销。

通常建议首先查看 **`cum`** 值，因为如果一个函数调用了其他多个函数或被多次调用，其 **`flat`** 值可能会显得异常地高。而 **`cum`** 值可以帮助你看到一个更全面的情景，通常问题代码都能在此被发现。

**示例分析**

假设你已经有了一个名为 **`cpu.prof`** 的分析文件，你可以使用 **`go tool pprof cpu.prof`** 命令来启动 pprof 的交互式界面。这里是如何操作的：

1. 在命令行中运行：
    
    ```bash
    go tool pprof cpu.prof
    ```
    
2. 在 pprof 工具中，使用 **`top`** 命令查看消耗 CPU 最多的函数：
    
    ```bash
    (pprof) top
    ```
    

### trace

当 runtime 出现瓶颈，比如 goroutine 调度延迟，GC STW 过大，可以通过 trace 帮助我们查看 runtime 细节。curl host/debug/pprof/trace?seconds=10 > trace.out 这里我们生成 10s 内的数据，然后通过 go tool trace trace.out 如果数据量很大我们要等待一段时间，然后会在浏览器打开一个新的 tab 里面的数据非常有用。

我们可以通过 view trace 了解到在此期间我们的程序跑的情况如何，我们随便先一个会进入下面这个界面，我们可以通过 wsad 当缩放，在这里我们可以看到 gc 的时间，STW 的影响，函数的调用栈，goroutine 的调度。

### Goroutine 可视化

除此之外我们可以还可以通过[divan/gotrace](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fdivan%2Fgotrace) 把 goroutine 运行时的关系渲染出来，可视化的渲染非常有趣。

**`gotrace`** 是一个非常有用的工具，它可以帮助开发者可视化地理解 Goroutine 在运行时的行为和关系。这个工具的特点是将程序的并发执行模式以图形方式展示出来，这对于调试并发问题或了解程序的并发行为非常有帮助。

**如何使用 gotrace**

1. **安装 gotrace**：
要使用 gotrace，你首先需要将其安装在你的开发环境中。gotrace 可以通过 Go 的包管理工具安装：
    
    ```bash
    go get -u github.com/divan/gotrace
    ```
    
2. **编译你的 Go 程序**：
使用 **`go build`** 命令编译你的程序。确保开启了 race detector，这样 gotrace 可以追踪所有必要的运行时信息：
    
    ```bash
    go build -race
    # 我们使用 make build 的时候其实已经是最小体积的镜像，需要开启 debug 模式
    # make build BINS="openim-api" DEBUG=1
    ```
    
3. **运行 gotrace**：
运行 gotrace 并将其指向你的可执行文件。gotrace 将分析程序的运行，并生成一个包含所有 goroutine 活动的可视化报告：
    
    ```bash
    gotrace ./your_program
    ```
    
    这个命令将启动你的应用程序，并在执行过程中捕获 goroutine 的行为数据。
    
4. **查看结果**：
gotrace 会生成一个 HTML 文件，你可以在浏览器中打开这个文件来查看 goroutine 的活动。这个可视化报告包括了各个 goroutine 的生命周期、它们之间的交互以及其他关键事件。

**gotrace 的好处**

- **并发行为可视化**：通过可视化显示，gotrace 让复杂的并发行为一目了然，帮助开发者理解各个 goroutine 如何相互作用。
- **性能问题诊断**：可以帮助诊断死锁、竞态条件等并发问题。
- **改善程序设计**：通过观察 goroutine 的行为，开发者可以更好地设计程序的并发结构，优化性能和资源使用。

**示例视图**

gotrace 生成的报告通常包含多个 goroutine 的时间线，每个 goroutine 的不同状态（如运行、等待、休眠等）以及它们之间的交互。这些可视化的信息极大地简化了并发编程的复杂性，尤其是在处理大量 goroutines 时。

总的来说，gotrace 是一个非常有用的工具，它不仅能帮助开发者发现并解决并发问题，还能帮助优化程序的整体性能。如果你在开发涉及复杂并发的 Go 程序，强烈建议尝试使用 gotrace。

### perf

有些时候 pprof 可能会失效，比如应用程序 hang 死。比如调度打满（抢占式调度解决了这个问题）。比如我们可以通过 perf top 可以看到耗时最多的符号(Go 编译的时候会嵌入符号表，无需手动注入)。

### 瑞士军刀

[Brendan gregg](https://link.juejin.cn/?target=https%3A%2F%2Fwww.brendangregg.com%2Flinuxperf.html) 大佬绘制了一个性能指南，被称为瑞士军刀。当我们怀疑 OS 问题的时候可以按图使用对应的工具，当然最有效的是喊上运维大佬们来支援。

### 性能优化思考

性能问题往往是来自多方面的，可能是最近才有即使你没有做任何变更；也可能偶尔出现；也可能是有的机器出现。**我们应该做好benchmark ，任何的优化都应该有基线对比，数字是最直观的。** 应用层和底层的处理逻辑往往是完全不同的，我们应该分开来思考。

## 总结

这篇中笔者给你介绍了排查日志的思路和方式：发现问题 -> 定位问题 -> 解决问题。在开发阶段，发现问题的主要方式是通过测试 + 日志，定位问题的一个有效手段是从日志报错处开始，逆着程序运行流程向上找问题出错的地方。找到问题根因之后，就要解决问题。你需要根据自己对业务、底层代码实现的掌握和理解，解决这个问题。

我们会面临很多奇怪的问题，也会遇到不同的挑战。既然无法控制问题的爆发，但是可以通过 Golangci-lint 等工具和 CodeReview 去避免潜在的问题，降低事故的频次和影响范围。大多数的问题**要么是问题太简单没有想到，要么是太复杂那难以发现。** 保持代码简洁，遵循 KISS 原则是个永不失过时的观点。

问题的修复并不只是结束，而是一切的开始。每一起严重事故的背后，必然有29次轻微事故和300起未遂先兆以及1000起事故隐患。做好复盘和改进项才是事故给我们最大的价值。

最后的如果你对性能优化非常感兴趣，你不应该错过这本 [性能之巅](https://link.juejin.cn/?target=https%3A%2F%2Fbook.douban.com%2Fsubject%2F26586598%2F)。

## 引用

- chatgpt4
- [pprof - The Go Programming Language](https://link.juejin.cn/?target=https%3A%2F%2Fgolang.org%2Fpkg%2Fnet%2Fhttp%2Fpprof%2F)
- [Visualizing Concurrency in Go · divan’s blog](https://link.juejin.cn/?target=https%3A%2F%2Fdivan.github.io%2Fposts%2Fgo_concurrency_visualize%2F)
- [QQ 音乐 go pprof实战](https://link.juejin.cn/?target=https%3A%2F%2Fwemp.app%2Fposts%2Fb4f1a37c-239d-4561-a4d6-0bbeb0c6e43f)
- [内存泄漏的定位与排查：Heap Profiling 原理解析](https://link.juejin.cn/?target=https%3A%2F%2Fmp.weixin.qq.com%2Fs%2FvncOjgrSomLx5je-ywD5Ng)
- [石墨文档 Websocket 百万长连接技术实践](https://link.juejin.cn/?target=https%3A%2F%2Fmp.weixin.qq.com%2Fs%2FMUourpb0IqqFo5XlxRLE0w)
- [大型系统在线问题诊断与定位](https://link.juejin.cn/?target=https%3A%2F%2Fxargin.com%2Fcontinuous-profiling%2F)
- [Go 应用的性能优化](https://link.juejin.cn/?target=https%3A%2F%2Fwww.xargin.com%2Fgo-perf-optimization%2F)
- [Go runtime related problems in TiDB production environment](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fgopherchina%2Fconference%2Fblob%2Fmaster%2F2020%2F2.1.4%2520PingCAP-Go%2520runtime%2520related%2520problems%2520in%2520TiDB%2520production%2520environment.pdf)
- [www.brendangregg.com/blog/2017-0…](https://link.juejin.cn/?target=https%3A%2F%2Fwww.brendangregg.com%2Fblog%2F2017-01-31%2Fgolang-bcc-bpf-function-tracing.html)