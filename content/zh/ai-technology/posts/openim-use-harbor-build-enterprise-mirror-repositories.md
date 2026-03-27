---
title: '设计 OpenIM 使用 Harbor 构建企业镜像仓库'
ShowRssButtonInSectionTermList: true
date: '2023-10-25T10:45:38+08:00'
draft: false
showtoc: true
tocopen: false
type: posts
author: '熊鑫伟，我'
keywords: ['OpenIM', 'Harbor', 'Docker', 'Kubernetes', 'Helm', 'Cert-manager']
tags: ['博客', 'OpenIM', 'Docker']
categories: ['开发 (Development)']
description: >
    探索如何使用 Harbor 构建强大的开源容器镜像仓库，用于设置稳健的镜像存储解决方案。这一步步指南涵盖了 Harbor 的安装和配置，包括使用 Helm 图表和 Cert-manager 来确保安全的 HTTPS 连接。了解如何将 Docker 镜像推送到你的 Harbor 仓库，配置 DNS 解析，并探索使用 AWS S3 作为可伸缩的镜像存储选项。充分发挥 Harbor 的潜力，优化容器镜像管理，降低存储成本，同时确保安全性和可靠性。
---


## 需求

OpenIM 提供了多种公共的镜像注册地址，比如说 aliyun， github， Docker hub ~

阅读 https://github.com/openimsdk/open-im-server/blob/main/docs/conversions/images.md 获取更多的镜像构建指南。

大部分企业都会选择自己做镜像仓库，使用 Harbor 来搭建企业级的镜像仓库，将它集成 CICD Pipeline 流程中，最终替换 Docker Hub，进一步降低镜像存储的成本。

此外，在生产环境下，Harbor 一般都会开启 TLS，所以你还需要准备一个可用的域名。

> 中国的服务器使用域名，需要对域名进行备案



## 安装 Helm 

Helm，以及 集群的部署参考 https://github.com/openimsdk/open-im-server/tree/main/deployments



## 安装 Cert-manager

接下来我们安装 Cert-manager，它会为我们自动签发免费的 Let’s Encrypt HTTPS 证书，并在过期前自动续期。

首先，运行 helm repo add 命令添加官方 Helm 仓库。

```bash
$ helm repo add jetstack https://charts.jetstack.io
```

然后，运行 helm repo update 更新本地缓存。

```bash
$ helm repo update
```

接下来，运行 helm install 来安装 Cert-manager。

```bash
$ helm install cert-manager jetstack/cert-manager \
--namespace cert-manager \
--create-namespace \
--version v1.10.0 \
--set ingressShim.defaultIssuerName=letsencrypt-prod \
--set ingressShim.defaultIssuerKind=ClusterIssuer \
--set ingressShim.defaultIssuerGroup=cert-manager.io \
--set installCRDs=true
```

此外，还需要为 Cert-manager 创建 ClusterIssuer，用来提供签发机构。将下面的内容保存为 `cluster-issuer.yaml`。

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: "cubxxw@openim.io"
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:    
    - http01:
        ingress:
          class: nginx
```

注意，这里你需要将 `spec.acme.email` 替换为你真实的邮箱地址。然后运行 kubectl apply 提交到集群内。

```yaml
$ kubectl apply -f cluster-issuer.yaml
```



## 安装和配置 Harbor

现在，我们同样使用 Helm 来安装 Harbor，首先添加 Harbor 官方仓库。

```bash
$ helm repo add harbor https://helm.goharbor.io
$ helm repo update
```

接下来，由于我们需要定制化安装 Harbor，所以需要修改 Harbor 的安装参数，将下面的内容保存为 `values.yaml`。

```yaml
expose:
  type: ingress
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: "harbor-secret-tls"
      notarySecretName: "notary-secret-tls"
  ingress:
    hosts:
      core: harbor.openim.io
      notary: notary.openim.io
    className: nginx
    annotations:
      kubernetes.io/tls-acme: "true"
persistence:
  persistentVolumeClaim:
    registry:
      size: 20Gi
    chartmuseum:
      size: 10Gi
    jobservice:
      jobLog:
        size: 10Gi
      scanDataExports:
        size: 10Gi
    database:
      size: 10Gi
    redis:
      size: 10Gi
    trivy:
      size: 10Gi
```

另外，我还为 Harbor 配置了 ingress 访问域名，分别是 `harbor.openim.io` 和 `notary.openim.io`，你需要将它们分别替换成你的真实域名。

然后，再通过 helm install 命令来安装 Harbor，并指定参数配置文件 values.yaml。

> **Note**
>
> 如果 OpenIM 集群部署的 命名空间 是 `openim`， 那么需要使用 `-n` 指定命名空间。如果命名空间不存在，则可以使用 `--create-namespace` chaun'jian

```yaml
$ helm install harbor harbor/harbor -f values.yaml --namespace harbor --create-namespace
```

等待所有 Pod 处于就绪状态。

```yaml
$ kubectl wait --for=condition=Ready pods --all -n harbor --timeout 600s
```

到这里，Harbor 就已经安装完成了。



### 配置 DNS 解析

接下来，我们为域名配置 DNS 解析。首先，获取 Ingress-Nginx Loadbalancer 的外网 IP。

```yaml
$ kubectl get services --namespace ingress-nginx ingress-nginx-controller --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
43.134.63.160
```

然后，为域名配置 DNS 解析。在这个例子中，我需要分别为 `harbor.openim.io` 和 `notary.openim.io` 配置 A 记录，并指向 `43.134.63.160`。



## 访问 Harbor Dashboard

在访问 Harbor Dashboard 之前，首先我们要确认 Cert-manager 是否已经成功签发了 HTTPS 证书，你可以通过 kubectl get certificate 命令来确认。

```bash
$ kubectl get certificate -A                     
NAMESPACE   NAME                READY   SECRET              AGE
harbor      harbor-secret-tls   True    harbor-secret-tls   8s
harbor      notary-secret-tls   True    notary-secret-tls   8s
```

由于我们在部署 Harbor 的时候需要配置两个域名，所以这里会出现两个证书。当这两个证书的 Ready 状态都为 True 时，说明 HTTPS 证书已经签发成功了。此外，Cert-manager 自动从 Ingress 对象中读取了 tls 配置，还自动创建了名为 harbor-secret-tls 和 notary-secret-tls 两个包含证书信息的 Secret。

接下来，打开 [https://harbor.openim.io](https://harbor.openim.io)  进入 Harbor Dashboard，使用默认账号 admin 和 Harbor12345 即可登录控制台。



## 推送镜像测试

现在，让我们来尝试将本地的镜像推送到 Harbor 仓库。首先，在本地拉取 busybox 镜像。

```bash
$ docker pull busybox
```

然后，运行 docker login 命令登录到 Harbor 仓库，使用默认的账号密码。

```bash
$ docker login harbor.openim.io
```

接下来，重新给 busybox 镜像打标签，指向 Harbor 镜像仓库。

```bash
$ docker tag busybox:latest harbor.openim.io/library/busybox:latest
```

和推送到 Docker Hub 的 Tag 相比，推送到 Harbor 需要指定完整的镜像仓库地址、项目名和镜像名。在这里，我使用了默认的 library 项目，当然你也可以新建一个项目，并将 library 替换为新的项目名。

最后，将镜像推送到仓库。

```yaml
$ docker push harbor.openim.io/library/busybox:latest
```

镜像推送成功后，访问 Harbor 控制台，进入 library 项目详情，你将看到我们刚才推送的镜像。

到这里，Harbor 镜像仓库就已经配置好了。



## 推荐使用 S3 存储镜像

除了使用持久卷来存储镜像以外，Harbor 还支持外部存储。如果你希望大规模使用 Harbor 又不想关注存储问题，那么使用外部存储是一个非常的选择。例如使用 AWS S3 存储桶来存储镜像。

S3 存储方案的优势是，它能为我们提供接近无限存储容量的存储系统，并且按量计费的方式成本也相对可控，同时它还具备高可用性和容灾能力。

要使用 S3 来存储镜像，你需要在安装时修改 Harbor 的安装配置 values.yaml。

```yaml
expose:
  type: ingress
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: "harbor-secret-tls"
      notarySecretName: "notary-secret-tls"
  ingress:
    hosts:
      core: harbor.openim.io
      notary: notary.openim.io
    className: nginx
    annotations:
      kubernetes.io/tls-acme: "true"
persistence:
  imageChartStorage:
    type: s3
    s3:
      region: us-west-1
      bucket: bucketname
      accesskey: AWS_ACCESS_KEY_ID
      secretkey: AWS_SECRET_ACCESS_KEY
      rootdirectory: /harbor
  persistentVolumeClaim:
    chartmuseum:
      size: 10Gi
    jobservice:
      jobLog:
        size: 10Gi
      scanDataExports:
        size: 10Gi
     ......
```

注意，要将 S3 相关配置 region、bucket、accesskey、secretkey 和 rootdirectory 字段修改为实际的值。然后，再使用 `helm install -f values.yaml` 来安装。
