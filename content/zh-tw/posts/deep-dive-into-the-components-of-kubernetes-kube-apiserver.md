---
title: '深入了解Kubernetes Kube apisserver的组件'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2023-09-28T20:12:51+08:00
draft : false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - etcd
  - k8s
  - kubernetes
  - kube-apiserver
categories:
  - Development
  - Blog
  - Kubernetes
description: >
    Kubernetes API的每个请求都会经过多阶段的访问控制之后才会被接受，这包括认证、授权以及准入控制（Admission Control）等。
---


## 深入理解Kube-APIServer

kube-apiserver是Kubernetes最重要的核心组件之一，主要提供以下的功能

+ 提供集群管理的REST API接口，包括认证授权、数据校验以及集群状态变更等
+ 提供其他模块之间的数据交互和通信的枢纽（其他模块通过API Server查询或修改数据，只有API Server才直接操作etcd）

**apiserver 主要功能：**

+ **认证**：使用集群判断身份。
+ **鉴权**：使用操作 CRUD，需要权限。 
+ **准入：** 对于Kubernetes来说，需要一些额外的 actions，例如写入的值不规范，需要对其进行修改，修改后需要 校验。最后需要 限流，以防止恶意或者漏洞导致拥堵
  + Mutating
  + Validating
  + Admission
+ **限流**
+ APIServer对象的实现



## 访问控制

**API Server 是所有组件交互的 中间枢纽。**

Kubernetes API的每个请求都会经过多阶段的访问控制之后才会被接受，这包括**认证**、**授权**以及**准入控制**（Admission Control）等。

> 前面的是 Mutating Webhook，可以改一个对象的值，而 Validating Webhook 是不可以修改对象的值，不生效的。

![img](http://sm.nsddd.top/sm202303051431637.png)

**更加详细的请求处理流程：**

![img](http://sm.nsddd.top/sm202303051430312.jpeg)

> **📜 对上面的解释：**
>
> 如何处理API请求：API源码存在于kubernetes/pkg/api路径中，会处理集群内以及集群外客户端的请求。
>
> 那么，当HTTP请求到达Kubernetes API时，具体会发现什么呢？从上层看，会发现以下交互：
>
> 1. HTTP请求由一串过滤器（filters）进行处理，这些过滤器注册在DefaultBuildHandlerChain()（参阅源码：*https://github.com/kubernetes/apiserver中的config.go*）中，并执行相应的处理。过滤器要么会将信息传递并附加到ctx.RequestInfo上（例如通过了身份认证的用户），要么返回适当的HTTP响应代码。
>
> 2. 第二步，复用器（multiplexer，参阅源码：*https://github.com/kubernetes/apiserver中的container.go*）会根据HTTP路径，将HTTP请求路由到相应的处理程序（handler）。
>
> 3. 第三步，routes（在routes/*中定义）会将处理程序（handler）与HTTP路径进行连接。
>
> 4. 第四步，按照API Group进行注册的处理程序（参阅源码：*https://github.com/kubernetes/apiserver中的groupversion.go和installer.go*），会处理HTTP请求和上下文（context，如user、rights等），并将请求的对象从存储中传送出来。
>
> 
>
> 注意，为了简洁，在上图中我们省略了HTTP路径中的`$NAMESPACE`字段。
>
> 现在我们进一步深入的对前文中提到的DefaultBuildHandlerChain()中建立的过滤器（filters）进行介绍：
>
> **WithRequestInfo()：**在requestinfo.go中定义，将RequestInfo附加到上下文中。
>
> **WithMaxInFlightLimit()：**在maxinflight.go中定义，对当前的请求数量进行限制。
>
> **WithTimeoutForNonLongRunningRequests()：**在timeout.go中定义，超时暂停非长时间运行请求（如大多数GET，PUT，POST，DELETE请求），这种请求与长时间运行请求（如watch和proxy请求）正好相反。
>
> **WithPanicRecovery()：**在wrap.go中定义，包装一个http Handler来恢复和记录报错。
>
> **WithCORS()：**在cors.go中定义，提供了一个CORS实现；CORS代表跨原始资源共享（Cross-Origin Resource Sharing），是一种允许嵌入在HTML页面中的JavaScript生成XMLHttpRequests请求到一个域（domain）的机制，这个域不同于JavaScript的初始起源。
>
> **WithAuthentication()：**在authentication.go中定义，尝试以用户身份对给定的请求进行验证，并将用户信息存储在提供的上下文中。成功后，授权HTTP header将从请求中删除。
>
> **WithAudit()：**在audit.go中定义，使用所有传入请求的审计日志信息来充实handler。审计日志的条目包含很多信息，例如请求的源IP、调用操作的用户信息以及请求的命名空间等。
>
> **WithImpersonation()：**在impersonation.go中定义，通过检查试图对用户进行修改的请求（类似sudo），来对假用户进行处理；
>
> **WithAuthorization()：**在authorization.go中定义，将所有授权的请求传递给已经将请求分发给正确的handler的复用器，否则返回禁止错误（forbidden error）。



## 认证

开启TLS时，**所有的请求都需要首先认证。** Kubernetes支持多种认证机制，并支持同时开启多个认证插件（只要有一个认证通过即可）。如果认证成功，则用户的`username`会传入授权模块做进一步授权验证；而对于认证失败的请求则返回`HTTP 401`。





### 认证插件

**我们上一节学的 ETCD ，知道 ETCD 作为 Kubernetes 的数据库，多么的重要：**

> 我们知道，不论是通过kubectl客户端还是REST请求访问K8s集群，最终都需要经过API Server来进行资源的操作，生效结果会被持久化至etcd中，etcd中的数据安全就变得十分重要。为了保证etcd的安全性，K8s只允许API Server 去访问操作etcd，此时API Server就担负起了整个etcd的安全。那么K8s是如何管控和保障API Server访问过程的安全的呢？
>
> 认证的方式主要有：客户端证书、密码、普通token、bootstrap token和JWT认证(主要用于Service Account)。认证模块会检查请求头或者客户端证书的内容，我们可以同时配置一种或几种方式对请求进行认证。多种认证方式会被依次执行，只要一种方式通过，请求便得到合法认证。当所有方式都未通过时，会返回401状态码并中断请求。认证解决的问题是校验访问方是否合法并识别其身份。



**apiserver 支持多种认证方式：**

+ **X509证书**

  + 使用X509客户端证书只需要API Server启动时配置--client-ca-file=SOMEFILE。在证书认证时，**其CN域用作用户名，而组织机构域则用作group名**。

+ **静态Token文件**

  + 使用静态Token文件认证只需要API Server启动时配置--token-auth-file=SOMEFILE。
  + 该文件为csv格式，每行至少包括三列token,username,user id,最后一列为可选的 group 字段。
  + 例如：token,user,uid,"group1,group2,group3”

+ **引导Token**

  + 为了支持平滑地启动引导新的集群，Kubernetes 包含了一种动态管理的持有者令牌类型， 称作 启动引导令牌（Bootstrap Token）。
  + 这些令牌以 Secret 的形式保存在 kube-system 名字空间中，可以被动态管理和创建。
  + 控制器管理器包含的 TokenCleaner 控制器能够在启动引导令牌过期时将其删除。
  + 在使用kubeadm部署Kubernetes时，可通过kubeadm token list命令查询。

+ **静态密码文件**

  + 需要API Server启动时配置`--basic-auth-file=SOMEFILE`，文件格式为csv，每行至少三列`password, user, uid`，后面是可选的group名 password,user,uid,"group1,group2,group3”

+ ServiceAccount

  + ServiceAccount是Kubernetes自动生成的，并会自动挂载到容器的/run/secrets/kubernetes.io/serviceaccount目录中。

+ OpenID

  + OAuth 2.0的认证机制

+ Webhook 令牌身份认证

  + --authentication-token-webhook-config-file 指向一个配置文件，其中描述 如何访问远程的 Webhook 服务。
  + --authentication-token-webhook-cache-ttl 用来设定身份认证决定的缓存时间。 默认时长为 2 分钟。

+ 匿名请求

  + 如果使用AlwaysAllow以外的认证模式，则匿名请求默认开启，但可用--anonymous-auth=false禁止匿名请求。

  > 匿名请求不建议开启，一般用作 测试 用的。



### X509证书

如果你不了解数字证书和 CA 的基本原理，可以先阅读下这篇文章[《数字证书原理》](https://www.zhaohuabing.com/post/2020-03-19-pki/)

K8s中组件之间通信，证书的验证是在协议层通过TLS完成的，TLS验证分为2种：

+ 服务器单向认证：服务器端持有证书证明自己身份，用于服务端不关心客户端身份而客户端需要确认服务器身份的场景。例如火车票购票网站，我们必须保证其是官方而非恶意服务器，但网站允许任何客户端进行连接访问；
+ 双向TLS认证：双方都要持有证书，并验证对方证书确认身份。一般用于服务端持有信息比较敏感，只有特定客户端才能访问的场景。例如：K8s内组件提供的接口往往包含集群内部信息，若被非法访问会影响整体安全，所以K8s内部组件之间都是双向TLS认证。

![图2 双向TLS过程](http://sm.nsddd.top/sm202303051505019.webp)

当两个组件进行双向TLS认证时，会涉及到下表中的相关文件：

| 名称           | 作用                                                        | 例子                                                         |
| :------------- | :---------------------------------------------------------- | :----------------------------------------------------------- |
| 服务端证书     | 包含服务端公钥和服务端身份信息                              | 通过根证书手动或者kubeadm自动生成的API Server服务端证书文件apiserver.crt |
| 服务器私钥     | 主要用于TLS认证时进行数字签名，证明自己是服务端证书的拥有者 | 通过根证书手动或者kubeadm生成的API Server服务端私钥文件apiserver.key |
| 客户端证书     | 包含客户端公钥和客户端身份信息                              | 由同一个CA根证书签发的.crt文件                               |
| 客户端私钥     | 主要用于TLS认证时进行数字签名，证明自己是客户端证书的拥有者 | 由同一个CA根证书签发的.key文件                               |
| 服务端CA根证书 | 签发服务端证书的 CA 根证书                                  | 通过openssl等工具生成的ca.crt文件,并在服务端启动时进行指定   |
| 客户端CA根证书 | 签发客户端证书的 CA 根证书                                  | 通过openssl等工具生成的ca.crt文件,并在客户端启动时进行指定(一般与服务端使用一个) |



#### demo

不同过用户名和密码，也不通过 Token，也是可以知道你的身份。我可以办证书。

> 带上证书到 API Server（学生证） ，API Server 就知道你的身份。

**Kubernetes 本身就是一种 CA，API Server 本身就是一种 CA**

**Kubernetes 的 API Server 的证书都放在 `/etc/kubernetes/pki` 下面**

```bash
❯ ls /etc/kubernetes/pki
apiserver.crt              apiserver.key                 ca.crt  front-proxy-ca.crt      front-proxy-client.key
apiserver-etcd-client.crt  apiserver-kubelet-client.crt  ca.key  front-proxy-ca.key      sa.key
apiserver-etcd-client.key  apiserver-kubelet-client.key  etcd    front-proxy-client.crt  sa.pub
```

使用 k8s 里的 `ca` 来为 `myuser` 用户签发证书，并通过 `rbac` 为该用户添加权限，并配置到 `kubeconfig` 中。

创建一个私钥和 csr 文件：

```bash
openssl genrsa -out myuser.key 2048
openssl req -new -key myuser.key -out myuser.csr
openssl req -new -x509 -days 10000 -key .key -out <CA_public>.crt 
```

**base64 以下**

```
cat myuser.csr | base64 | tr -d "\n"
```

然后使用 base64 后的值往 k8s 里创建一个 csr 对象，表示我们需要签发一个证书

```
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: myuser
spec:
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJREJ6Q0NBZThDQVFBd2dZNHhDekFKQmdOVkJBWVRBa05PTVJFd0R3WURWUVFJREFoVGFHRnVaMGhoYVRFUgpNQThHQTFVRUJ3d0lVMmhoYm1kSVlXa3hEekFOQmdOVkJBb01CbU51WTJGdGNERVBNQTBHQTFVRUN3d0dZMjVqCllXMXdNUTh3RFFZRFZRUUREQVpqYm1OaGJYQXhKakFrQmdrcWhraUc5dzBCQ1FFV0Z6TXlPVE14TnpJM05URnUKYzNNaloyMWhhV3d1WTI5dE1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBd1o0cgpRWE9rL3NSWW9OMUJKckRnTE01cHB0aGdlczJLOVE1VFJyTGFtUkZwMThpclN5b0tjQi8rdzlGdWlPYWQ5VmdBCmdveC9MSGFCdnNibnpiVmlHVHc4ODhSQXNXODVLengwc2tlYTRiVWtrWjhpVjRLb2xRNzRIWXp0N3l5a1JMVHIKQjYrMUk3MmZQUDhHMFYxQ1JEQkN6ZE5RNUE3ZFBRcVJHbHg5Wm9lUThFYU1jQnU5dXE1Ti96aG9PRVNKL1BhRwprdFVQNHR0YWI0NSs4MkNLVEZiZWZKbENSUmpucXRoSVRuME0xRmxOVlIvYW9HR3N3NndYTjhmaXZVRzk4aXNSCmJjUWpKMVRnSEltYTZYc3lKSWFnWDVScCtqY0ZmMzdOcjljdG1GUTZBbkNUUUVmVlVLdGgybnFxK2lBUERBQWQKNUdvcEVlaUt4N0tpSjNsU253SURBUUFCb0RNd0ZRWUpLb1pJaHZjTkFRa0hNUWdNQmpFeU16UTFOakFhQmdrcQpoa2lHOXcwQkNRSXhEUXdMZUdsdmJtZDRhVzUzWldrd0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFHdk5wUk5YCjhXTzFlb0ZGT2k2eHRkSW1SKzY3eHYzSk1NSm9pYXkvdkEvalZFU3BDYXRWanBVTW9WbnlMT1pDUXhsbHRUakQKK0J1TDU1NEN1Y1pTYjN2ellMR0MwdXVqTlBBY2lSVHkrMmNKNVdmMUtTdjFVZ0lpbzNWRjJ4K1FybVJ6Uk54MApsa0w5M1BmYlIxMVdwNktLWE5UOGRGejNsdmNXV3lmSlpMOC8vV3dRZlFJV2IyRG1wQXQ1a2Jnekw4NEFNYjg0CnVITkh2RGxBN1pYS0k5NzRMSGdZUlptWW9paHkzanBiSzgxcFYzdzFFSWx6UlhZbG5tWFVrWmExVElsbjllUlEKREtaV2xmOXJGb1dVM0dDQXN2MWxCYytGMmxjY1ZyYTNDaktuTnBUdmFIWG4vQkhUREZGT1JmSTNhNGMrYzl3SgpLb3hpS3VDVW5TYkdEOGs9Ci0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=#
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400  # one day
  usages:
  - client auth
EOF
```

然后用默认的管理员账号执行命令，同意这个请求

```bash
kubectl certificate approve myuser
```

接着在查看就可以发现，证书已经被签发好了

```bash
kubectl get csr/myuser -o yaml
```

使用 jsonpath 把我们的证书提取出来，写入到 myuser.crt 文件中

```bash
kubectl get csr myuser -o jsonpath='{.status.certificate}'| base64 -d > myuser.crt
```

使用证书和key来配置 kubeconfig 中的 user

```
kubectl config set-credentials myuser --client-key=myuser.key --client-certificate=myuser.crt --embed-certs=true
```

使用 role 和 rolebinding 为该用户添加权限

```
kubectl create role developer --verb=create --verb=get --verb=list --verb=update --verb=delete --resource=pods
kubectl create rolebinding developer-binding-myuser --role=developer --user=myuser
```

kubectl 命令中指定使用该用户进行查询：

```
# 指定使用 myuser 这个用户来访问 apiserver
kubectl get po --user myuser
```



### static token 认证 demo

**static token 认证方式是 apiserver 中最简单的一种认证方式。**

+ 使用 静态文件 token 文件认证只需要 API Server 启动时配置 `–token-auth-file=SOMEFILE`
+ 改文件为 `csv` 格式，每行至少包括三列`token,username,user id`

首先准备一个 `static-token` 文件，完整内容如下：

> **该文件为csv格式，每行至少包括三列`token,username,user id`,最后一列为可选的 group 字段。**

**新建目录，存放该文件：**

```bash
❯ cat static-token
cncamp-token,cncamp,1000,"group1,group2,group3"

❯ mkdir -p /etc/kubernetes/auth
❯ cp static-token /etc/kubernetes/auth
```

修改`/etc/kubernetes/manifests/kube-apiserver.yaml`文件，增加启动参数。

**做备份：API Server 启动时配置 `–token-auth-file=SOMEFILE`**

```bash
❯ cp /etc/kubernetes/manifests/kube-apiserver.yaml ~/kube-apiserver.yaml
```

+ 1）添加**`--token-auth-file=/etc/kubernetes/auth/static-token`**参数，

  ![asd](http://sm.nsddd.top/sm202303051620735.png)

+ 2）同时由于 `apiserver` 是容器化运行的，还需要额外添加`hostpath` 的 `mount`，把存放 `static token` 的目录也挂载到容器中。

  ![image-20230305162319477](http://sm.nsddd.top/sm202303051623527.png)

  ![image-20230305162510114](http://sm.nsddd.top/sm202303051625169.png)

修改完成后 kubelet 就会自动重启 `apiserver pod`。

```bash
kubectl get pod -A
```

然后我们可以拿 `static token` 去访问 `apiserver` 了：

```bash
❯ curl https://192.168.137.133:6443/api/v1/namespaces/default -H "Authorization: Bearer cncamp-token" -k
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {
    
  },
  "status": "Failure",
  "message": "namespaces \"default\" is forbidden: User \"cncamp\" cannot get resource \"namespaces\" in API group \"\" in the namespace \"default\"",
  "reason": "Forbidden",
  "details": {
    "name": "default",
    "kind": "namespaces"
  },
  "code": 403
}#  
```

> 此时 API Server 就知道当前的用户是：`cncamp`

当然了，现在访问会提升 `403`，因为还没有为该用户配置权限（**授权**），不过可以说明的是此时 apiserver 已经能认识我们了。

**现在就是多用户集群了，我们此时就是通过静态 Token 方式来创建多用户，此时就会产生隔离。**

> 比如说，五个人，每个人用自己的 Token。



当一个来自于 User 的 Request 通过认证之后，该 Request 必须要进行授权。 
一个Request必须包含以下内容：

  * the username of the requester
  * the requested action
  * the object affected by the action
    该Request的授权能否通过，取决于是现有的授权规则是否声明了允许该user去完成其请求的action。

如下面例子所示，用户 bob 仅仅被允许在 namespace `projectCaribou` 中读取 pod 资源：

```yaml
{
    "apiVersion": "abac.authorization.kubernetes.io/v1beta1",
    "kind": "Policy",
    "spec": {
        "user": "bob",
        "namespace": "projectCaribou",
        "resource": "pods",
        "readonly": true
    }
}
```

此时用户 bob 发起以下请求，是可以通过授权的:

```json
{
  "apiVersion": "authorization.k8s.io/v1beta1",
  "kind": "SubjectAccessReview",
  "spec": {
    "resourceAttributes": {
      "namespace": "projectCaribou",
      "verb": "get",
      "group": "unicorn.example.org",
      "resource": "pods"
    }
  }
}
```

下述操作，都是会被授权机制给拒绝的：

  * 如果用户 bob 试图对 namespace `projectCaribou`中的资源进行写操作（`create` or `update`）；
  * 如果用户 bob 试图对其它 namespace 中的资源进行读操作（`get`）

k8s的Authorization机制要求用户使用通用的 REST 属性来和控制系统进行交互，这是因为控制系统可能需要和其它API进行交互。 
k8s的Authorization机制目前支持多种授权模型，如：

   * Node Mode, v1.7+支持，配合NodeRestriction准入控制来限制kubelet仅可访问node、endpoint、pod、service以及secret、configmap、PV和PVC等相关的资源。
   * ABAC Mode, 
   * RBAC Mode,
   * Webhook Mode，
   * AlwaysDeny仅用来测试，
   * AlwaysAllow则允许所有请求（会覆盖其他模式）

用户在启动kube-apiserver的时候可以指定多种模型。 
如果设置了多种模型，k8s会按顺序进行检查。 

  * 和`Authenticator机制`一样，只要有其中一种模型允许该 Request，那么就算 PASS 了。 
  * 如果所有的模型都 Say NO，则拒绝该 Request，返回 HTTP status code 403。 

这同时也说明，一个 Request 在默认情况下其`permissions`都是被拒绝的。

使用方法

```
--authorization-mode=RBAC
```



### Request Attributes

K8s授权机制仅处理以下的请求属性:

* user, group, extra
* API
* 请求方法如 get、post、update、patch和delete
* 请求路径（如/api和/healthz）
* 请求资源和子资源
* Namespace
* API Group



### 静态密码文件

**我们加入一个用户:（~/.kube/config)**

![image-20230305171723601](http://sm.nsddd.top/sm202303051717736.png)

**登录：**

```bash
❯ k get ns --user cncamp
Error from server (Forbidden): namespaces is forbidden: User "cncamp" cannot list resource "namespaces" in API group "" at the cluster scope
```



### ServiceAccount

**ServiceAccount 为系统账户，是Kubernetes自带的。**

```bash
❯ k get sa
NAME      SECRETS   AGE
default   1         136m
```

> Kubernetes在创建一个 namespace 的时候，namespace 创建完成后有一个 namespace controller.。它会在 namespace 下面自动创建 `default serviceaccount` 对象。



**看一下细节：**

```bash
❯ k get sa default -oyaml
apiVersion: v1
kind: ServiceAccount
metadata:
  creationTimestamp: "2023-03-05T07:02:48Z"
  name: default
  namespace: default
  resourceVersion: "394"
  uid: e0d24106-9bf0-49af-9f06-ac0020307950
secrets:
- name: default-token-vkbzr
```



**看到这个 ServiceAccount yaml 文件中 有一个 secrets 字段，OMG，这就对应起来了，我们继续看一下细节。**

![image-20230305172613547](http://sm.nsddd.top/sm202303051726706.png)

**有 ca.crt， 有namespace，所以 ServiceAccount 是 Kubernetes 自动生成的，并且会自动挂载到 任何容器 的 `/run/secrets/kubernetes.io/serviceaccount` 中**

查看某个容器细节：

```bash
❯ k get pod coredns-697ddfb55c-87qws -oyaml -n kube-system
...
- mountPath: /var/run/secrets/kubernetes.io/serviceaccount
...
 serviceAccountName: coredns
...
```

Kubernetes 会把 coredns 所对应的 service mount 到 `/var/run/secrets/kubernetes.io/serviceaccount` 这个目录。



**意义在哪里：**

我们一旦进入到 Pod 中，你就可以在 Pod 中任何程序简单的 拿到 Token ，然后访问 API Server ，这就是用来控制 Kubernetes 组件中的权限。

> 当我们开发 Kubernetes 的组件的时候，我们需要去 监听 API Server 和 修改 API Server 的数据，所以需要权限。



**还有就是 用户权限 的管理，建立自己的 serviceaccount ，拿走自己的 Token，用来唯一标识自己的身份。**



**user account 和 service account 的区别：**

当你落地 Kubernetes 的时候，需要企业内所用用户登录到 Kubernetes 集群中，这个信息不是 在Kubernetes ，而是在外部平台，这样可以通过开发出一个 权限系统，但是是外部系统，所以 Kubernetes 需要到 外部 询问。

而 service account 主动的，或者被动的建立系统账户，只存在 Kubernetes 里面，而不是外面。

> 如果是在 Kubernetes 中， 除了 ` service account ` ，其他都是 `user account`





### 基于 webhook 的认证服务集成

webhook 的认证服务集成的范围很广，基本上 Kubernetes 的项目落地，都要考虑要不要将 Kubernetes 和公司认证平台整合。

Kubernetes 本身是一个框架，Kubernetes 提供了基于 webhook 的认证服务集成功能，可以与各种认证服务整合，如 OAuth、LDAP、Active Directory 等等。



#### 构建符合Kubernetes规范的认证服务

需要依照`Kubernetes`规范，构建认证服务，用来认证`tokenreview request`，构建认证服务，认证服务需要满足如下`Kubernetes`的规范。

API Server 提供内置的逻辑可能不够，我们需要外部自己写好的 http 服务，所以，这就是 webhook。

**URL**： https://authn.example.com/authenticate

> 必须以 `authenticate` 结尾

**Method**： POST

> 必须是 POST 方法

**Input**:

> 携带上token

```bash
{ "apiVersion": "authentication.k8s.io/v1beta1", "kind": "TokenReview", 
"spec": { "token": "(BEARERTOKEN)" } }
```

**Output**:

> **解析token并返回验证结果以及相应用户的数据**

```json
{ 
	"apiVersion": "authentication.k8s.io/v1beta1",
    "kind": "TokenReview",
    "status": {
    "authenticated": true,
    "user": {
        "username": "janedoe@example.com",
        "uid": "42",
        "groups": [
            "developers",
            "qa"
            ]
        }
    }
}
```



转发认证请求至认证服务器：

```go
// check user
ts := oauth2.StaticTokenSource(
	&oauth2.Token{AccessToken: tr.Spec.Token},
)
// 传入请求 到 GitHub 
tc := oauth2.NewClient(context.Background(), ts)
client := github.NewClient(tc)
user, _, err := client.Users.Get(context.Background(), "")
if err != nil {
	log.Println("[Error]", err.Error())
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"apiVersion": "authentication.k8s.io/v1beta1",
		"kind":       "TokenReview",
		"status": authentication.TokenReviewStatus{
			Authenticated: false,
		},
	})
	return
}

```



#### 配置 apiserver

**apiserver 怎么知道请求哪个 webhook 来进行验证呢？**

> **问题**：apiserver 是遇到无法识别的用户都会发到 webhook 吗？

这就需要我们进行配置了

**可以是任何认证系统：**

+ 但在用户认证完成后，生成代表用户身份的token
+ 该token通常是有失效时间的
+ 用户获取该token以后以后，将token配置进 kubeconfig

修改apiserver设置，开启认证服务，apiserver保证将所有收到的请求中的token信息，发给认证服务进行验证

+ `--authentication-token-webhook-config-file`，该文件描述如何访问认证服务
+ `--authentication-token-webhook-cache-ttl`，默认2分钟

配置文件需要`mount`进`Pod`

配置文件中的服务器地址需要指向`authService`

**配置文件格式如下：**

```json
{
  "kind": "Config",
  "apiVersion": "v1",
  "preferences": {},
  "clusters": [
    {
      "name": "github-authn",
      "cluster": {
        "server": "http://192.168.34.2:3000/authenticate"
      }
    }
  ],
  "users": [
    {
      "name": "authn-apiserver",
      "user": {
        "token": "secret"
      }
    }
  ],
  "contexts": [
    {
      "name": "webhook",
      "context": {
        "cluster": "github-authn",
        "user": "authn-apiserver"
      }
    }
  ],
  "current-context": "webhook"
}
```



### 生产系统中遇到的陷阱

**基于 Keystone 的认证插件导致 Keystone 故障且无法恢复**

1. Keystone 是企业关键服务
2. Kubernetes 以 Keystone 作为认证插件
3. Keystone 在出现故障后会抛出 401 错误
4. Kubernetes 发现 401 错误后会尝试重新认证

大多数 controller都有指数级back off，重试间隔越来越慢，但 gophercloud 针对过期 token 会一直 retry

大量的 request 积压在 Keystone 导致服务无法恢复

> 随着时间推移，apiserver 中越来越多的 token 过期，需要访问 Keystone 进行认证，因此 Keystone 压力越来越大，然后大量压力下 Keystone 根本无法正常启动，刚起来又被大量请求打死，从而形成恶性循环。

Kubernetes 成为压死企业认证服务的最后一根稻草

**解决方案**？

+ Circuit break
+ Rate limit



## 鉴权

### 授权

授权主要是用于对集群资源的访问控制，通过检查请求包含的相关属性值，与相对应的访问策略相比较，API请求必须满足某些策略才能被处理。跟认证类似，Kubernetes也支持多种授权机制，并支持同时开启多个授权插件（只要有一个验证通过即可）。如果授权成功，则用户的请求会发送到准入控制模块做进一步的请求验证；对于授权失败的请求则返回HTTP 403。

**Kubernetes授权仅处理以下的请求属性：**

+ user, group, extra
+ API、请求方法（如get、post、update、patch和delete）和请求路径（如/api）
+ 请求资源和子资源
+ Namespace
+ API Group

**目前，Kubernetes支持以下授权插件：**

+ **ABAC（更精确的授权系统，Kubernetes 支持 ABAC，但是 RBAC 能满足大部分需求，因为 Kubernetes 授权对象就是 Kubernetes 自己本身的对象。**
+ RBAC
  + **由于控制对象的 k8s 中的对象，因此 RBAC 基本可以满足绝大部分需求**
+ Webhook：比如上面演示的 GitHub 授权（token 密钥 ）
+ Node
  + 节点上的 kubelet 只能操作当前节点上的对象，不能操作那些和当前节点没有关系的对象



#### RBAC vs ABAC

ABAC（Attribute Based Access Control）本来是不错的概念，但是在 Kubernetes 中的实现比较难于管理和理解，而且需要对 Master 所在节点的 SSH 和文件系统权限，要使得对授权的变更成功生效，还需要重新启动 API Server。

> ABAC 类似我认证中的 static-token，将数据配置到静态文件中，然后通过 apiserver 的参数指定该文件，如果有更新还需要重启 apiserver 比较麻烦。

而 RBAC 的授权策略可以利用 kubectl 或者 Kubernetes API 直接进行配置。RBAC 可以授权给用户，让用户有权进行授权管理，这样就可以无需接触节点，直接进行授权管理。RBAC 在 Kubernetes 中被映射为 API 资源和操作。



#### Kubernetes中授权系统

授权系统大致的设计思路一样的

+ Role：角色，包括资源和verbs（动作）

+ Subject是一个虚词，主体：包括 User（外部用户） 和 ServiceAccount（系统用户)

+ Role 和 Subject 是通过 RoleBindings产生关系的，最后 RBAC 需要定义的就是谁（who) 能对 哪些对象（what）做哪些操作（how)

+ ClusterRole 表示这个角色是定义在全局范围中的，而 Role 表示这个角色和 namespace 产生关系的。

+ ClusterRoleBindings 和 RoleBindings 也是一样，也就是说如果是通过 ClusterRoleBindings 绑定某个用户，那么这个用户默认就在 所有的 Namespace 上拥有 权限。RoleBindings 会限制在 namespace

  

![img](http://sm.nsddd.top/sm202303051947235.png)

> **最后实现的效果是： 谁（who) 能对 哪些对象（what）做哪些操作（how)**





#### Role与ClusterRole

Role（角色）是一系列权限的集合，例如一个角色可以包含读取 Pod 的权限和列出 Pod 的权限。

Role只能用来给某个特定namespace中的资源作鉴权，对多namespace和集群级的资源或者是非

```yaml
# Role示例
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""] # "" indicates the core API group
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

> 📜 对上面的解释：
>
> 如果你的 Groups 是空的，表示 是 core API group 对象，这个权限限定在 default namespace。
>
> 绑定了后只有 default namespace 读写权限



#### RoleBinding

建立好了 Role 后你就可以绑定（binding) 了

RoleBinding 把角色（Role或ClusterRole）的权限映射到用户或者用户组，从而让这些用户继承角色在 namespace 中的权限。 

```yaml
# RoleBinding示例（引用Role）
# This role binding allows "jane" to read pods in the "default" namespace.
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

> 📜 对上面的解释：
>
> 这个也是知识在 default namespace 下的权限，
>
> 如果是 ClusterRoleBindings，那么就不需要 `namespace: default`

**授权是可以传递的~**

资源类的API（如/healthz）使用ClusterRole。

Role 是有 namespace，只能在该 namespace 下进行 bind。

ClusterRole则没有namespace，在任意namespace下都可以bind。



#### roleBinding 和 clusterRoleBinding

roleBinding 可以引用 Role与ClusterRole，但是最终权限会被限制在 namespace 下。

**clusterRoleBinding 则只能引用ClusterRole，但最终权限则是整个集群中。**



#### 账户 & 组的管理

> 对应的是 **多租户** 的应用~

角色绑定（Role Binding）是将角色中定义的权限赋予一个或者一组用户。

它包含若干 **主体**（用户、组或服务账户）的列表和对这些主体所获得的角色的引用。

组的概念：

+ 当与外部认证系统对接时，用户信息（UserInfo）可包含Group信息，授权可针对用户群组
+ **当对ServiceAccount授权时，Group代表某个Namespace下的所有ServiceAccount**



#### 针对群组授权

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global
subjects: 
  - kind: Group
    name: manager # 'name' 是区分大小写的
    apiGroup: rbac.authorization.k8s.io
roleRef:
	kind: ClusterRole
	name: secret-reader
	apiGroup: rbac.authorization.k8s.io
```



#### 规划系统角色

User

+ 管理员
  + 所有资源的所有权限？？
+ 普通用户
  + 是否有该用户创建的namespace下的所有object的操作权限？
  + 对其他用户的namespace资源是否可读，是否可写？

SystemAccount

+ SystemAccount是开发者（kubernetes developer或者domain developer）创建应用后，应用于apiserver通讯需要的身份
+ 用户可以创建自定的ServiceAccount，kubernetes也为每个namespace创建default ServiceAccount
+ Default ServiceAccount通常需要给定权限以后才能对apiserver做写操作



#### 实现方案

在cluster创建时，创建自定义的role，比如namespace-creator

Namespace-creator role定义用户可操作的对象和对应的读写操作。

创建自定义的namespace admission webhook

+ 当namespace创建请求被处理时，获取当前用户信息并annotate到namespace

创建RBAC controller

+ Watch namespace的创建事件
+ 获取当前namespace的创建者信息
+ 在当前namespace创建rolebinding对象，并将namespace-creator 角色和用户绑定

#### 与权限相关的其他最佳实践

ClusterRole是非namespace绑定的，针对整个集群生效

通常需要创建一个管理员角色，并且绑定给开发运营团队成员

CustomResourceDefinition 是全局资源，普通用户创建 CustomResourceDefinition 以后，需要管理员授予相应权限后才能真正操作该对象

针对所有的角色管理，建议创建spec，用源代码驱动

+ 虽然可以通过edit操作来修改权限，但后期会导致权限管理混乱，可能会有很多临时创建出来的角色和角色绑定对象，重复绑定某一个资源权限

权限是可以传递的，用户A可以将其对某对象的某操作，抽取成一个权限，并赋给用户B

防止海量的角色和角色绑定对象，因为大量的对象会导致鉴权效率低，同时给apiserver增加负担

ServiceAccount也需要授权的，否则你的component可能无法操作某对象

Tips：SSH到master节点通过insecure port访问apiserver可绕过鉴权，当需要做管理操作又没

有权限时可以使用（不推荐）

#### 运营过程中出现的陷阱

**案例1:**

+ 研发人员为提高系统效率，将update方法修改为patch
+ 研发人员本地非安全测试环境测试通过
+ 上生产，发现不work
+ 原因：忘记更新rolebinding，对应的serviceaccount没有patch权限

**案例2:**

+ 研发人员创建CRD，并针对该CRD编程
+ 上生产后不工作
+ 原因，该CRD未授权，对应的组件get不到对应的CRD资源
