---
title: '管理后台和监控的部署与设计'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-11-15T11:25:54+08:00
draft : false
showtoc: true
tocopen: true
type: posts
author: ["熊新伟", "我"]
keywords: ["OpenIM", "Docker", "即时通讯", "后台管理", "监控"]
tags:
  - OpenIM
  - Docker
  - 即时通讯
  - 后台管理
  - 监控
categories:
  - 开发
  - 博客
description: >
    本文指导您如何使用 Docker 部署 OpenIM，设置管理后台，并对应用进行监控。它为初学者提供了详细的步骤，并为更高级的用户提供了洞见。
---

# OpenIM 关于 管理后台 和 监控 的部署和设计

OpenIM 提供了多种灵活的部署选项，适用于不同的环境和需求。以下是这些部署方案的简化和优化描述：

1. **源码部署**:
   + **普通源码部署**：使用 nohup 方式进行部署。这是一种基础的部署方法，适合于开发和测试环境。详情参见：[普通源码部署指南](https://docs.openim.io/guides/gettingStarted/imSourceCodeDeployment)。
   + **生产级部署**：采用 system 方式，更适合于生产环境。这种方法提供了更高的稳定性和可靠性。详情参见：[生产级部署指南](https://docs.openim.io/guides/gettingStarted/install-openim-linux-system)。
2. **集群部署**:
   + **Kubernetes 部署**：提供两种方式，包括通过 helm 和 sealos 进行部署。这适用于需要高可用性和可扩展性的环境。具体方法请参考：[Kubernetes 部署指南](https://docs.openim.io/guides/gettingStarted/k8s-deployment)。
3. **Docker 部署**:
   + **普通 Docker 方式**：适用于快速部署和小型项目。详细信息请见：[Docker 部署指南](https://docs.openim.io/guides/gettingStarted/dockerCompose)。
   + **Docker Compose 方式**：提供了更便捷的服务管理和配置，适合于复杂的多容器应用。

接下来，我们将逐一介绍这些部署方法的具体步骤、监控和管理后台的配置，以及使用技巧，帮助您根据自己的需求选择最合适的部署方案。



## 源码 & Docker

### 部署

源码部署 openim-server 和 openim-chat ，其他的组件都是通过 Docker 部署。

docker 部署则通过 https://github.com/openimsdk/openim-docker 仓库一键部署所有的组件。

部署的配置文件，可以阅读 https://github.com/openimsdk/open-im-server/blob/main/scripts/install/environment.sh 文档了解如何学习以及熟悉各个环境变量。

对于 Prometheus 来说，默认是没有开启 Prometheus 的，如果需要开启的话，需要在 make init 之前设置环境变量：

```bash
export PROMETHEUS_ENABLE=true   # 默认是 false 
```

然后执行：

```bash
make init
docker compose up -d
```



### 配置

要在 Grafana 中配置 Prometheus 数据源，请遵循以下步骤：

1. **登录 Grafana**: 首先，打开浏览器并访问 Grafana 的网址。如果您未更改端口，则地址通常为 [http://localhost:3000](http://localhost:3000)

2. **使用默认凭据登录**: Grafana 的默认用户名和密码都是 `admin`。首次登录时，系统将提示您更改密码。

3. **进入数据源设置（DATA SOURCES)**:

   + 在 Grafana 的左侧菜单中，寻找并点击“齿轮”图标，代表“配置”。
   + 在配置菜单中，选择“数据源”。

4. **添加新的数据源**:

   + 在数据源页面，点击“添加数据源”按钮。
   + 在列表中找到并选择“Prometheus”。

   ![image-20231114175117374](http://sm.nsddd.top/sm202311141751692.png)

   点击 `Add New connection` 可以添加更多的数据源，比如说 Loki (负责日志存储和处理查询)

5. **配置 Prometheus 数据源**:

   + 在配置页面，填写 Prometheus 服务器的详细信息。这通常包括 Prometheus 服务的 URL（例如 OpenIM 默认部署的是 `http://172.28.0.1:19090`，如果 Prometheus 在同一台机器上运行）。

     地址是和 和 `cat .env| grep DOCKER_BRIDGE_GATEWAY`  变量地址一致。OpenIM 和 组件之间通过 getway 链接的。端口 OpenIM 默认使用的 `19090`

   + 根据需要调整其他设置，例如认证、TLS 设置等。

   ![image-20231114180351923](http://sm.nsddd.top/sm202311141803076.png)

6. **保存并测试**:

   + 完成配置后，点击“保存&测试”按钮以确保 Grafana 能够成功连接到 Prometheus。



**Grafana 中的 Dashboard 导入指南**

导入 Grafana Dashboard 是一个简洁的过程，适用于 OpenIM Server 应用服务和 Node Exporter。以下是详细步骤和必要的注意事项：



**关键指标概览与部署步骤**

在 Grafana 中监控 OpenIM，您需要关注以下三类关键指标，每个类别都有其特定的部署和配置步骤：

1. **OpenIM 指标** (`prometheus-dashboard.yaml`):
   + **配置文件路径**：在 `config/prometheus-dashboard.yaml`。
   + **启用监控**：设置环境变量 `export PROMETHEUS_ENABLE=true` 以启用 Prometheus 监控。
   + **更多信息**：查看 [OpenIM 配置指南](https://docs.openim.io/configurations/prometheus-integration)。
2. **Node Exporter**:
   + **部署容器**：部署 `quay.io/prometheus/node-exporter` 容器实现节点监控。
   + **获取 Dashboard**：访问 [Node Exporter 全功能 Dashboard](https://grafana.com/grafana/dashboards/1860-node-exporter-full/)，可以通过下载 YAML 文件或使用 ID 导入。
   + **部署指南**：参阅 [Node Exporter 部署文档](https://prometheus.io/docs/guides/node-exporter/)。
3. **中间件指标**: 每种中间件都需要特定的步骤和配置以实现监控。以下是常见中间件的列表及其相关操作指南链接：
   + **MySQL**:
     + **配置**：确保 MySQL 开启了性能监控。
     + **链接**：查看 [MySQL 监控配置指南](https://grafana.com/docs/grafana/latest/datasources/mysql/)。
   + **Redis**:
     + **配置**：配置 Redis 以允许监控数据导出。
     + **链接**：参考 [Redis 监控指南](https://grafana.com/docs/grafana/latest/datasources/redis/)。
   + **MongoDB**:
     + **配置**：设置 MongoDB 的监控指标。
     + **链接**：查看 [MongoDB 监控指南](https://grafana.com/grafana/plugins/grafana-mongodb-datasource/)。
   + **Kafka**:
     + **配置**：整合 Kafka 与 Prometheus 监控。
     + **链接**：参考 [Kafka 监控指南](https://grafana.com/grafana/plugins/grafana-kafka-datasource/)。
   + **Zookeeper**:
     + **配置**：确保 Zookeeper 可以被 Prometheus 监控。
     + **链接**：查看 [Zookeeper 监控配置](https://grafana.com/docs/grafana/latest/datasources/zookeeper/)。



**导入步骤**:

1. **访问 Dashboard 导入界面**:

   + 在 Grafana 的左侧菜单或右上角点击 `+` 图标，选择“创建”。
   + 选择“导入”（Import dashboard）。

2. **进行 Dashboard 导入**:

   + **通过文件上传**：直接上传您的 YAML 文件。
   + **通过粘贴内容**：打开 YAML 文件，复制内容，然后粘贴到导入界面。
   + **通过 Grafana.com Dashboard**：访问 [Grafana Dashboards](https://grafana.com/grafana/dashboards/)，搜索并通过 ID 导入所需 Dashboard。

   > Json model 也可以是你自定义的 Dashboard，需要对自己的业务进行调整，然后配置出来的，在 Dashboard 设置页面中，你可以找到一个 "JSON Model" 或 "Export"（导出）选项。点击这个选项将会显示 Dashboard 的 JSON 配置。你可以复制这个 JSON 配置以便后续导入。

3. **配置 Dashboard**:

   + 选择适当的数据源，例如之前设置的 Prometheus。
   + 调整其他设置，如 Dashboard 名称或存放文件夹。

4. **保存并查看 Dashboard**:

   + 完成配置后，点击“导入”以完成操作。
   + 导入成功后立即查看新 Dashboard。

**图示例：**

![image-20231114194451673](http://sm.nsddd.top/sm202311141944953.png)





### Docker 中监控运行指南

#### 简介

本指南提供了如何使用 Docker 运行 OpenIM 的步骤。OpenIM 是一款开源的即时通讯解决方案，可以通过 Docker 快速部署。更多信息请参考 [OpenIM Docker GitHub](https://github.com/openimsdk/openim-docker)。

#### 前置条件

+ 确保已安装 Docker 和 Docker Compose。
+ 基本了解 Docker 和容器化技术。

#### 步骤 1: 克隆仓库

首先，克隆 OpenIM Docker 仓库:

```bash
git clone https://github.com/openimsdk/openim-docker.git
```

进入仓库目录并查看 `README` 文件，以获取更多信息和配置选项。

#### 步骤 2: 启动 Docker Compose

在仓库目录中，运行以下命令启动服务:

```bash
docker-compose up -d
```

这会下载所需的 Docker 镜像并启动 OpenIM 服务。

#### 步骤 3: 使用 OpenIM Web 端

+ 打开浏览器的隐私模式，访问 [OpenIM Web](http://localhost:11001/)。
+ 注册两个用户，并尝试添加好友。
+ 测试发送消息和图片。

#### 运行效果

![image-20231115100811208](http://sm.nsddd.top/sm202311151008639.png)

#### 步骤 4: 访问管理后台

+ 访问 [OpenIM 管理后台](http://localhost:11002/)。
+ 使用默认的用户名和密码 (`admin1:admin1`) 登录。

运行效果图：

![image-20231115101039837](http://sm.nsddd.top/sm202311151010116.png)

#### 步骤 5: 进入监控界面

+ 通过上续图片的 [监控界面](http://localhost:3000/login) 登录。
+ 使用默认的用户名和密码 (`admin:admin`)。

#### 后续步骤

+ 按照 OpenIM 源码提供的步骤配置和管理服务。
+ 参考 `README` 文件进行高级配置和管理。

#### 常见问题解决

+ 如果遇到任何问题，请查阅 [OpenIM Docker GitHub](https://github.com/openimsdk/openim-docker) 上的文档，或在 Issues 部分搜索相关问题。
+ 如果问题还是没有解决，那么请你提一个 issue 到 [openim-docker](https://github.com/openimsdk/openim-docker/issues/new/choose) 仓库或者是 [openim-server](https://github.com/openimsdk/open-im-server/issues/new/choose) 仓库



## Kubernetes

参考 https://github.com/openimsdk/helm-charts

在 Kubernetes 环境下部署和监控 OpenIM 时，您将专注于三个主要指标：中间件、OpenIM 自定义指标，以及 Node Exporter。以下是详细的步骤和指南：

### 中间件监控

中间件监控是确保整个系统稳定运行的关键。通常，这包括对以下组件的监控：

+ **MySQL**：监控数据库性能、查询延时等。
+ **Redis**：追踪操作延时、内存使用等。
+ **MongoDB**：观察数据库操作、资源使用等。
+ **Kafka**：监控消息吞吐量、延时等。
+ **Zookeeper**：关注集群状态、性能指标等。

对于 Kubernetes 环境，您可以使用相应的 Prometheus Exporters 来收集这些中间件的监控数据。

### OpenIM 自定义指标

OpenIM 自定义指标为您提供了关于 OpenIM 应用本身的重要信息，例如用户活跃度、消息流量、系统性能等。要在 Kubernetes 中监控这些指标：

+ 确保 OpenIM 应用配置以暴露 Prometheus 指标。
+ 使用 Helm chart（参考 [OpenIM Helm Charts](https://github.com/openimsdk/helm-charts)）进行部署时，注意配置相关的监控设置。

### Node Exporter

Node Exporter 用于收集 Kubernetes 节点的硬件和操作系统级别的指标，如 CPU、内存、磁盘使用情况等。在 Kubernetes 中集成 Node Exporter：

+ 通过相应的 Helm chart 部署 Node Exporter。您可以在 [Prometheus 社区](https://prometheus.io/docs/guides/node-exporter/) 找到相关信息和指南。
+ 确保 Node Exporter 的数据能被集群中的 Prometheus 实例采集。
