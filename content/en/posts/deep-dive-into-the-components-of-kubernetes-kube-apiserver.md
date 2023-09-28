---
title: 'In-depth understanding of the components of Kubernetes Kube apisserver'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-28T20:12:51+08:00
draft : false
showtoc: true
tocopen: true
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
     Each request to the Kubernetes API will go through multi-stage access control before it is accepted, including authentication, authorization and admission control (Admission Control), etc.
---


## Deep understanding of Kube-APIServer

kube-apiserver is one of the most important core components of Kubernetes and mainly provides the following functions

+ Provides REST API interface for cluster management, including authentication and authorization, data verification, cluster status changes, etc.
+ Provides a hub for data interaction and communication between other modules (other modules query or modify data through API Server, only API Server directly operates etcd)

**apiserver main functions:**

+ **Authentication**: Use the cluster to determine identity.
+ **Authentication**: Use operation CRUD, permissions are required.
+ **Access:** For Kubernetes, some additional actions are required. For example, if the written value is not standardized, it needs to be modified, and verification is required after modification. Finally, it is necessary to limit the current flow to prevent maliciousness or loopholes from causing congestion.
   + Mutating
   + Validating
   +Admission
+ **Current Limit**
+ Implementation of APIServer object



## Access control

**API Server is the intermediate hub for all component interactions. **

Each request to the Kubernetes API will go through multi-stage access control before it is accepted, including authentication, authorization and admission control (Admission Control), etc.

> The previous one is Mutating Webhook, which can change the value of an object, but Validating Webhook cannot modify the value of an object and will not take effect.

![img](http://sm.nsddd.top/sm202303051431637.png)

**More detailed request processing process:**

![img](http://sm.nsddd.top/sm202303051430312.jpeg)

> **📜 Explanation of the above: **
>
> How to handle API requests: The API source code exists in the kubernetes/pkg/api path and will handle requests from clients within the cluster and outside the cluster.
>
> So, what exactly will you find when an HTTP request reaches the Kubernetes API? Looking from the top, you will find the following interactions:
>
> 1. HTTP requests are processed by a series of filters (filters), which are registered in DefaultBuildHandlerChain() (see source code: *config.go* in https://github.com/kubernetes/apiserver), and Perform appropriate processing. The filter will either pass and append information to ctx.RequestInfo (such as an authenticated user) or return an appropriate HTTP response code.
>
> 2. In the second step, the multiplexer (multiplexer, refer to the source code: *container.go* in https://github.com/kubernetes/apiserver) will route the HTTP request to the corresponding handler according to the HTTP path ( handler).
>
> 3. In the third step, routes (defined in routes/*) will connect the handler to the HTTP path.
>
> 4. The fourth step is to register the handler according to the API Group (see source code: *groupversion.go and installer.go* in https://github.com/kubernetes/apiserver), which will handle HTTP requests and context ( context, such as user, rights, etc.) and transfer the requested object from storage.
>
>
>
> Note that for the sake of simplicity, we have omitted the `$NAMESPACE` field in the HTTP path in the above figure.
>
> Now we will further introduce the filters established in DefaultBuildHandlerChain() mentioned earlier:
>
> **WithRequestInfo(): **Defined in requestinfo.go, attaches RequestInfo to the context.
>
> **WithMaxInFlightLimit():** Defined in maxinflight.go, limits the current number of requests.
>
> **WithTimeoutForNonLongRunningRequests():** Defined in timeout.go, the timeout pauses non-long-running requests (such as most GET, PUT, POST, DELETE requests), which is different from long-running requests (such as watch and proxy) request) is exactly the opposite.
>
> **WithPanicRecovery():** Defined in wrap.go, wraps an http Handler to recover and record errors.
>
> **WithCORS():** Defined in cors.go, providing a CORS implementation; CORS stands for Cross-Origin Resource Sharing, which is a method that allows JavaScript embedded in HTML pages to generate XMLHttpRequests requests Mechanism to a domain that is different from JavaScript's original origins.
>
> **WithAuthentication(): ** Defined in authentication.go, attempts to authenticate the given request as the user and stores the user information in the provided context. Upon success, the Authorization HTTP header will be removed from the request.
>
> **WithAudit(): **Defined in audit.go, enriches the handler with audit log information from all incoming requests. Audit log entries contain a lot of information, such as the source IP of the request, the user information that called the operation, and the namespace of the request.
>
> **WithImpersonation():** defined in impersonation.go, handles fake users by checking requests that attempt to modify the user (similar to sudo);
>
> **WithAuthorization(): **Defined in authorization.go, passes all authorized requests to the multiplexer that has distributed the requests to the correct handler, otherwise a forbidden error is returned.



## Certification

When TLS is turned on, **all requests need to be authenticated first. ** Kubernetes supports multiple authentication mechanisms and supports opening multiple authentication plug-ins at the same time (as long as one authentication passes). If the authentication is successful, the user's username will be passed to the authorization module for further authorization verification; for requests that fail authentication, HTTP 401 will be returned.





### Authentication plugin

**We learned ETCD in the last section and know how important ETCD is as the database of Kubernetes:**

> We know that whether you access the K8s cluster through the kubectl client or REST request, you ultimately need to go through the API Server to operate the resources. The effective results will be persisted to etcd, and the data security in etcd becomes very important. In order to ensure the security of etcd, K8s only allows the API Server to access and operate etcd. At this time, the API Server is responsible for the security of the entire etcd. So how does K8s control and ensure the security of the API Server access process?
>
> The main authentication methods include: client certificate, password, ordinary token, bootstrap token and JWT authentication (mainly used for Service Account). The authentication module will check the content of the request header or client certificate. We can configure one or several methods to authenticate the request at the same time. Multiple authentication methods will be executed in sequence. As long as one method passes, the request will be legally authenticated. When all methods fail, a 401 status code will be returned and the request will be interrupted. The problem solved by authentication is to verify whether the visiting party is legitimate and to identify its identity.



**apiserver supports multiple authentication methods:**

+ **X509 Certificate**

   + To use the X509 client certificate, you only need to configure --client-ca-file=SOMEFILE when starting the API Server. During certificate authentication, the CN domain is used as the user name, and the organization domain is used as the group name.

+ **Static Token file**

   + To use static Token file authentication, you only need to configure --token-auth-file=SOMEFILE when starting the API Server.
   + The file is in csv format. Each row includes at least three columns of token, username, user id, and the last column is an optional group field.
   + For example: token,user,uid,"group1,group2,group3"

+ **Bootstrap Token**

   + To support smooth startup of new clusters, Kubernetes includes a dynamically managed holder token type called Bootstrap Token.
   + These tokens are stored in the kube-system namespace in the form of Secrets and can be dynamically managed and created.
   + The Controller Manager contains a TokenCleaner controller with the ability to delete boot tokens when they expire.
   + When using kubeadm to deploy Kubernetes, you can query it through the kubeadm token list command.

+ **Static Password File**

   + It is necessary to configure `--basic-auth-file=SOMEFILE` when starting the API Server. The file format is csv. Each line has at least three columns `password, user, uid`, followed by the optional group name password, user, uid, "group1,group2,group3"

+ServiceAccount

   + ServiceAccount is automatically generated by Kubernetes and will be automatically mounted to the /run/secrets/kubernetes.io/serviceaccount directory of the container.

+OpenID

   + OAuth 2.0 authentication mechanism

+ Webhook token authentication

   + --authentication-token-webhook-config-file points to a configuration file describing how to access the remote Webhook service.
   + --authentication-token-webhook-cache-ttl is used to set the cache time for authentication decisions. The default duration is 2 minutes.

+ Anonymous request

   + If an authentication mode other than AlwaysAllow is used, anonymous requests are enabled by default, but anonymous requests can be disabled with --anonymous-auth=false.

   > It is not recommended to enable anonymous requests and is generally used for testing.



### X509 Certificate

If you don’t understand the basic principles of digital certificates and CAs, you can read this article first ["Principles of Digital Certificates"](https://www.zhaohuabing.com/post/2020-03-19-pki/)

For communication between components in K8s, certificate verification is completed through TLS at the protocol layer. TLS verification is divided into two types:

+ Server one-way authentication: The server holds a certificate to prove its identity, which is used in scenarios where the server does not care about the client's identity but the client needs to confirm the server's identity. For example, on a train ticket purchasing website, we must ensure that it is an official server and not a malicious server, but the website allows any client to connect and access;
+ Two-way TLS authentication: Both parties must hold certificates and verify the other party's certificate to confirm identity. It is generally used in scenarios where the information held by the server is relatively sensitive and can only be accessed by specific clients. For example: the interface provided by the component in K8s goes toOften contains cluster internal information. If it is illegally accessed, it will affect the overall security. Therefore, K8s internal components have two-way TLS authentication.

![Figure 2 Two-way TLS process](http://sm.nsddd.top/sm202303051505019.webp)

When two components perform mutual TLS authentication, the relevant files in the following table will be involved:

| Name | Function | Example |
| :------------- | :--------------------------------- ----------------------- | :----------------------- ---------------------------------- |
| Server certificate | Contains server public key and server identity information | API Server server certificate file apiserver.crt generated manually through root certificate or automatically by kubeadm |
| Server private key | Mainly used for digital signature during TLS authentication to prove that you are the owner of the server certificate | API Server private key file apiserver.key generated manually or by kubeadm through the root certificate |
| Client certificate | Contains client public key and client identity information | .crt file signed by the same CA root certificate |
| Client private key | Mainly used for digital signature during TLS authentication to prove that you are the owner of the client certificate | .key file signed by the same CA root certificate |
| Server CA root certificate | CA root certificate that issues the server certificate | ca.crt file generated through openssl and other tools, and specified when the server starts |
| Client CA root certificate | CA root certificate that issues the client certificate | The ca.crt file generated through openssl and other tools, and specified when the client starts (usually one is used with the server) |



#### demo

You can also know your identity without using a username and password, or using a Token. I can apply for a certificate.

> Bring the certificate to the API Server (student ID), and the API Server will know your identity.

**Kubernetes itself is a CA, API Server itself is a CA**

**Kubernetes API Server certificates are placed under `/etc/kubernetes/pki`**

```bash
❯ ls /etc/kubernetes/pki
apiserver.crt apiserver.key ca.crt front-proxy-ca.crt front-proxy-client.key
apiserver-etcd-client.crt apiserver-kubelet-client.crt ca.key front-proxy-ca.key sa.key
apiserver-etcd-client.key apiserver-kubelet-client.key etcd front-proxy-client.crt sa.pub
```

Use `ca` in k8s to issue a certificate for the `myuser` user, add permissions to the user through `rbac`, and configure it in `kubeconfig`.

Create a private key and csr file:

```bash
openssl genrsa -out myuser.key 2048
openssl req -new -key myuser.key -out myuser.csr
openssl req -new -x509 -days 10000 -key .key -out <CA_public>.crt
```

**base64 below**

```
cat myuser.csr | base64 | tr -d "\n"
```

Then use the value after base64 to create a csr object in k8s, indicating that we need to issue a certificate

```
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
   name: myuser
spec:
   request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJREJ6Q0NBZThDQVFBd2dZNHhDekFKQmdOVkJBWVRBa05PTVJFd0R3WURWUVFJREFoVGFHRnVaMGhoYVRFUgpNQThHQTFVRUJ3d0lVMmhoYm1k SVlXa3hEekFOQmdOVkJBb01CbU51WTJGdGNERVBNQTBHQTFVRUN3d0dZMjVqCllXMXdNUTh3RFFZRFZRUUREQVpqYm1OaGJYQXhKakFrQmdrcWhraUc5dzBCQ1FFV0Z6TXlPVE14TnpJM05URnUKYzNNaloyMWhh V3d1WTI5dE1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBd1o0cgpRWE9rL3NSWW9OMUJKckRnTE01cHB0aGdlczJLOVE1VFJyTGFtUkZwMThpclN5b0tjQi8rdzlGdWlPYWQ 5VmdBCmdveC9MSGFCdnNibnpiVmlHVHc4ODhSQXNXODVLengwc2tlYTRiVWtrWjhpVjRLb2xRNzRIWXp0N3l5a1JMVHIKQjYrMUk3MmZQUDhHMFYxQ1JEQkN6ZE5RNUE3ZFBRcVJHbHg5Wm9lUThFYU1j QnU5dXE1Ti96aG9PRVNKL1BhRwprdFVQNHR0YWI0NSs4MkNLVEZiZWZKbENSUmpucXRoSVRuME0xRmxOVlIvYW9HR3N3NndYTjhmaXZVRzk4aXNSCmJjUWpKMVRnSEltYTZYc3lKSWFnWDVScCtqY0ZmM zdOcjljdG1GUTZBbkNUUUVmVlVLdGgybnFxK2lBUERBQWQKNUdvcEVlaUt4N0tpSjNsU253SURBUUFCb0RNd0ZRWUpLb1pJaHZjTkFRa0hNUWdNQmpFeU16UTFOakFhQmdrcQpoa2lHOXcwQkNRSXh Europe bHRUakQKK0J1TDU1NEN1Y1pTYjN2ellMR0MwdXVqTlBBY2lSVHkrMmNKNVdmMUtTdjFVZ0lpbzNWRjJ4K1FybVJ6Uk54MApsa0w5M1BmYlIxMVdwNktLWE5UOGRGejNsdmNXV3lmSlpMOC8vV3dRZl FJV2IyRG1wQXQ1a2Jnekw4NEFNYjg0CnVITkh2RGxBN1pYS0k5NzRMSGdZUlptWW9paHkzanBiSzgxcFYzdzFFSWx6UlhZbG5tWFVrWmExVElsbjllUlEKREtaV2xmOXJGb1dVM0dDQXN2MWxCYytGM mxjY1ZyYTNDaktuTnBUdmFIWG4vQkhUREZGT1JmSTNhNGMrYzl3SgpLb3hpS3VDVW5TYkdEOGs9Ci0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=#
   signerName: kubernetes.io/kube-apiserver-client
   expirationSeconds: 86400 # one day
   usages:
   -client auth
EOF
```

Then use the default administrator account to execute the command and agree to the request.

```bash
kubectl certificate approve myuser
```

Then after checking, you can find that the certificate has been issued.

```bash
kubectl get csr/myuser -o yaml
```

Use jsonpath to extract our certificate and write it into the myuser.crt file

```bash
kubectl get csr myuser -o jsonpath='{.status.certificate}'| base64 -d > myuser.crt
```

Use certificate and key to configure user in kubeconfig

```
kubectl config set-credentials myuser --client-key=myuser.key --client-certificate=myuser.crt --embed-certs=true
```

Add permissions for this user using role and rolebinding

```
kubectl create role developer --verb=create --verb=get --verb=list --verb=update --verb=delete --resource=pods
kubectl create rolebinding developer-binding-myuser --role=developer --user=myuser
```

Specify this user in the kubectl command to query:

```
# Specify the user myuser to access apiserver
kubectl get po --user myuser
```



### static token authentication demo

**static token authentication method is the simplest authentication method in apiserver. **

+ To use static file token file authentication, you only need to configure `–token-auth-file=SOMEFILE` when starting the API Server.
+ Change the file to `csv` format, each line includes at least three columns `token, username, user id`

First prepare a `static-token` file, the complete content is as follows:

> **The file is in csv format. Each row includes at least three columns of `token, username, user id`, and the last column is an optional group field. **

**Create a new directory to store the file:**

```bash
❯ cat static-token
cncamp-token,cncamp,1000,"group1,group2,group3"

❯ mkdir -p /etc/kubernetes/auth
❯ cp static-token /etc/kubernetes/auth
```

Modify `/etc/kubernetes/manifests/kube-apiserver.yaml` file, add startup parameters.

**Make a backup: configure `–token-auth-file=SOMEFILE`** when starting the API Server

```bash
❯ cp /etc/kubernetes/manifests/kube-apiserver.yaml ~/kube-apiserver.yaml
```

+ 1) Add **`--token-auth-file=/etc/kubernetes/auth/static-token`** parameter,

   ![asd](http://sm.nsddd.top/sm202303051620735.png)

+ 2) At the same time, since `apiserver` is run in a container, you need to add `mount` to `hostpath` and mount the directory where `static token` is stored into the container.

   ![image-20230305162319477](http://sm.nsddd.top/sm202303051623527.png)

   ![image-20230305162510114](http://sm.nsddd.top/sm202303051625169.png)

After the modification is completed, kubelet will automatically restart the `apiserver pod`.

```bash
kubectl get pod -A
```

Then we can use `static token` to access `apiserver`:

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

> At this point, the API Server knows that the current user is: `cncamp`

Of course, now the access will raise `403`, because the permissions (**Authorization**) have not been configured for the user, but it can be explained that the apiserver can already recognize us at this time.

**Now it is a multi-user cluster. We are creating multi-users through static tokens, and isolation will occur at this time. **

> For example, five people, each uses his own Token.



When a Request from User is authenticated, the Request must be authorized.
A Request must contain the following content:

   * the username of the requester
   * the requested action
   * the object affected by the action
     Whether the request can be authorized depends on whether the existing authorization rules state that the user is allowed to complete the requested action.

As shown in the following example, user bob is only allowed to read pod resources in the namespace `projectCaribou`:

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

At this time, user bob initiates the following request, which can be authorized:

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

The following operations will be rejected by the authorization mechanism:

   * If user bob attempts to write (`create` or `update`) to a resource in namespace `projectCaribou`;
   * If user bob attempts to read (`get`) resources in other namespaces

The Authorization mechanism of k8s requires users to use common REST attributes to interact with the control system, because the control system may need to interact with other APIs.
The Authorization mechanism of k8s currently supports multiple authorization models, such as:

    * Node Mode, v1.7+ support, cooperates with NodeRestriction access control to restrict kubelet to only access node, endpoint, pod, service, secret, configmap, PV and PVC and other related resources.
    * ABAC Mode,
    *RBAC Mode,
    * Webhook Mode,
    *AlwaysDeny is only for testing,
    * AlwaysAllow allows all requests (will override other modes)

Users can specify multiple models when starting kube-apiserver.
If multiple models are set up, k8s will check them in order.

   * Same as the `Authenticator mechanism`, as long as one of the models allows the Request, it will be PASS.
   * If all models say NO, the Request will be rejected and HTTP status code 403 will be returned.

This also shows that a Request's `permissions` are denied by default.

Instructions

```
--authorization-mode=RBAC
```



### Request Attributes

K8s authorization mechanism only handles the following request attributes:

* user, group, extra
* API
* Request methods such as get, post, update, patch and delete
* Request path (such as /api and /healthz)
* Request resources and sub-resources
* Namespace
* API Group



### Static password file

**We add a user: (~/.kube/config)**

![image-20230305171723601](http://sm.nsddd.top/sm202303051717736.png)

**Log in:**

```bash
❯ k get ns --user cncamp
Error from server (Forbidden): namespaces is forbidden: User "cncamp" cannot list resource "namespaces" in API group "" at the cluster scope
```



### ServiceAccount

**ServiceAccount is a system account that comes with Kubernetes. **

```bash
❯ k get sa
NAME SECRETS AGE
default 1 136m
```

> When Kubernetes creates a namespace, there is a namespace controller after the namespace is created. It will automatically create a `default serviceaccount` object under the namespace.



**Look at the details:**

```bash
❯ k get sa default -oyaml
apiVersion: v1
kind: ServiceAccount
metadata:
   creationTimestamp: "2023-03-05T07:02:48Z"
   name:default
   namespace:default
   resourceVersion: "394"
   uid: e0d24106-9bf0-49af-9f06-ac0020307950
secrets:
- name: default-token-vkbzr
```



**See that there is a secrets field in this ServiceAccount yaml file, OMG, this corresponds to it, let's continue to look at the details. **

![image-20230305172613547](http://sm.nsddd.top/sm202303051726706.png)

**There is ca.crt and namespace, so ServiceAccount is automatically generated by Kubernetes and will be automatically mounted to `/run/secrets/kubernetes.io/serviceaccount` of any container**

View details of a container:

```bash
❯ k get pod coredns-697ddfb55c-87qws -oyaml -n kube-system
...
- mountPath: /var/run/secrets/kubernetes.io/serviceaccount
...
  serviceAccountName: coredns
...
```

Kubernetes will mount the service corresponding to coredns to the directory `/var/run/secrets/kubernetes.io/serviceaccount`.



**What’s the meaning:**

Once we enter the Pod, you can simply get the Token from any program in the Pod, and then access the API Server. This is used to control permissions in Kubernetes components.

> When we develop Kubernetes components, we need to monitor the API Server and modify the API Server data, so permissions are required.



**There is also the management of user permissions, establishing your own service account, and taking away your own Token to uniquely identify yourself. **



**The difference between user account and service account:**

When you implement Kubernetes, you need users within the enterprise to log in to the Kubernetes cluster. This information is not in Kubernetes, but on the external platform. In this way, a permission system can be developed, but it is an external system, so Kubernetes needs to ask externally. .

The service account actively or passively creates a system account and only exists inside Kubernetes, not outside.

> If it is in Kubernetes, except `service account`, everything else is `user account`





### Based on webhook authentication service integration

Webhook's authentication service integration has a wide range. Basically, when implementing a Kubernetes project, you must consider whether to integrate Kubernetes with the company's authentication platform.

Kubernetes itself is a framework. Kubernetes provides webhook-based authentication service integration functions that can be integrated with various authentication services, such as OAuth, LDAP, Active Directory, etc.



#### Build an authentication service that complies with Kubernetes specifications

An authentication service needs to be built in accordance with the `Kubernetes` specification to authenticate `tokenreview request`. The authentication service needs to meet the following `Kubernetes` specifications.

The built-in logic provided by API Server may not be enough. We need an external http service written by ourselves, so this is webhook.

**URL**: https://authn.example.com/authenticate

> Must end with `authenticate`

**Method**: POST

> Must be POST method

**Input**:

> Bring the token

```bash
{ "apiVersion": "authentication.k8s.io/v1beta1", "kind": "TokenReview",
"spec": { "token": "(BEARERTOKEN)" } }
```

**Output**:

> **Parse the token and return the verification result and the data of the corresponding user**

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



Forward the authentication request to the authentication server:

```go
// check user
ts := oauth2.StaticTokenSource(
&oauth2.Token{AccessToken: tr.Spec.Token},
)
// Incoming request to GitHub
tc := oauth2.NewClient(context.Background(), ts)
client := github.NewClient(tc)
user, _, err := client.Users.Get(context.Background(), "")
if err != nil {
log.Println("[Error]", err.Error())
w.WriteHeader(http.StatusUnauthorized)
json.NewEncoder(w).Encode(map[string]interface{}{
"apiVersion": "authentication.k8s.io/v1beta1",
"kind": "TokenReview",
"status": authentication.TokenReviewStatus{
Authenticated: false,
},
})
return
}

```



#### Configure apiserver

How does **apiserver know which webhook to request for verification? **

> **Question**: Will apiserver send webhook when encountering unrecognized users?

This requires us to configure

**Can be any authentication system:**

+ But after the user authentication is completed, a token representing the user's identity is generated.
+ The token usually has an expiration time
+ After the user obtains the token, configure the token into kubeconfig

Modify the apiserver settings and enable the authentication service. The apiserver ensures that the token information in all received requests is sent to the authentication service for verification.

+ `--authentication-token-webhook-config-file`, which describes how to access the authentication service
+ `--authentication-token-webhook-cache-ttl`, default 2 minutes

The configuration file needs to be mounted into Pod

The server address in the configuration file needs to point to `authService`

**The configuration file format is as follows:**

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



### Traps encountered in production systems

**Keystone-based authentication plugin causes Keystone failure and cannot be recovered**

1. Keystone is a key enterprise service
2. Kubernetes uses Keystone as the authentication plug-in
3. Keystone will throw 401 error after failure
4. Kubernetes will try to re-authenticate after detecting a 401 error

Most controllers have exponential back off, and the retry interval is getting slower and slower, but gophercloud will always retry for expired tokens.

A large number of requests are backlogged in Keystone, causing the service to be unable to be restored.

> As time goes by, more and more tokens in the apiserver expire and need to access Keystone for authentication. Therefore, the pressure on Keystone is increasing. Then Keystone cannot start normally under a lot of pressure. When it gets up, it is killed by a large number of requests, thus forming Vicious cycle.

Kubernetes becomes the last straw for enterprise authentication services

**solution**?

+ Circuit break
+ Rate limit



## Authentication

### Authorization

Authorization is mainly used to control access to cluster resources. By checking the relevant attribute values contained in the request and comparing it with the corresponding access policy, the API request must meet certain policies before it can be processed. Similar to authentication, Kubernetes also supports multiple authorization mechanisms and supports opening multiple authorization plug-ins at the same time (as long as one of them passes the verification). If the authorization is successful, the user's request will be sent to the admission control module for further request verification; for requests that fail to authorize, HTTP 403 will be returned.

**Kubernetes authorization only handles the following request attributes:**

+ user, group, extra
+ API, request methods (such as get, post, update, patch and delete) and request paths (such as /api)
+ Request resources and subresources
+ Namespace
+ API Group

**Currently, Kubernetes supports the following authorization plugins: **

+ **ABAC (a more precise authorization system, Kubernetes supports ABAC, but RBAC can meet most needs, because the Kubernetes authorization object is the object of Kubernetes itself.**
+RBAC
   + **Since it controls objects in k8s, RBAC can basically meet most needs**
+ Webhook: For example, the GitHub authorization (token key) demonstrated above
+Node
   + The kubelet on the node can only operate objects on the current node, and cannot operate objects that have no relationship with the current node.



####RBAC vs ABAC

ABAC (Attribute Based Access Control) is originally a good concept, but its implementation in Kubernetes is difficult to manage and understand, and it requires SSH and file system permissions on the node where the Master is located. To make the authorization changes successfully take effect, it needs to be re-authorized. Start API Server.

> ABAC is similar to the static-token in my authentication. It configures the data into a static file, and then specifies the file through the apiserver parameters. If there are updates, it is troublesome to restart the apiserver.

The RBAC authorization policy can be configured directly using kubectl or the Kubernetes API. RBAC can be authorized to users, giving them the right to perform authorization management, so that they can directly perform authorization management without touching the node. RBAC is mapped to API resources and operations in Kubernetes.



#### Authorization system in Kubernetes

The general design idea of the authorization system is the same

+ Role: role, including resources and verbs (actions)

+ Subject is a function word, subject: including User (external user) and ServiceAccount (system user)

+ Role and Subject are related through RoleBindings. Finally, what RBAC needs to define is who (who) can do which operations (how) on which objects (what)

+ ClusterRole means that this role is defined in the global scope, and Role means that this role is related to the namespace.

+ The same is true for ClusterRoleBindings and RoleBindings. That is to say, if a user is bound through ClusterRoleBindings, then this user will have permissions on all Namespaces by default. RoleBindings will be restricted to namespace

  

![img](http://sm.nsddd.top/sm202303051947235.png)

> **The final effect is: who (who) can do which operations (how) on which objects (what)**





#### Role and ClusterRole

A role is a collection of permissions. For example, a role can include permissions to read Pods and permissions to list Pods.

Role can only be used to authenticate resources in a specific namespace. It cannot be used to authenticate resources in multiple namespaces and cluster-level resources or non-

```yaml
# Role example
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
   namespace:default
   name: pod-reader
rules:
- apiGroups: [""] # "" indicates the core API group
   resources: ["pods"]
   verbs: ["get", "watch", "list"]
```

> 📜 Explanation of the above:
>
> If your Groups is empty, it means it is a core API group object, and this permission is limited to the default namespace.
>
> After binding, there is only default namespace read and write permissions



#### RoleBinding

After creating the Role, you can bind it

RoleBinding maps the permissions of a role (Role or ClusterRole) to users or user groups, allowing these users to inherit the permissions of the role in the namespace.

```yaml
# RoleBinding example (referring to Role)
# This role binding allows "jane" to read pods in the "default" namespace.
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
   name: read-pods
   namespace:default
subjects:
- kind: User
   name: jane
   apiGroup: rbac.authorization.k8s.io
roleRef:
   kind: Role
   name: pod-reader
   apiGroup: rbac.authorization.k8s.io
```

> 📜 Explanation of the above:
>
> This is also the permission of knowledge under the default namespace.
>
> If it is ClusterRoleBindings, then `namespace: default` is not needed

**Authorization is transferable~**

Resource class APIs (such as /healthz) use ClusterRole.

Role has a namespace and can only be binded under this namespace.

ClusterRole has no namespace and can be binded in any namespace.



#### roleBinding and clusterRoleBinding

roleBinding can reference Role and ClusterRole, but the final permissions will be limited to the namespace.

**clusterRoleBinding can only reference ClusterRole, but the final permission is in the entire cluster. **



#### Account & Group Management

> Corresponds to **multi-tenant** applications~

Role Binding is to assign the permissions defined in the role to one or a group of users.

It contains a list of several principals (users, groups, or service accounts) and references to the roles obtained by these principals.

The concept of group:

+ When connecting with an external authentication system, user information (UserInfo) can include Group information, and authorization can be targeted at user groups.
+ **When authorizing ServiceAccount, Group represents all ServiceAccounts under a certain Namespace**



#### Authorization for groups

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
   name: read-secrets-global
subjects:
   - kind: Group
     name: manager # 'name' is case sensitive
     apiGroup: rbac.authorization.k8s.io
roleRef:
kind: ClusterRole
name: secret-reader
apiGroup: rbac.authorization.k8s.io
```



#### Planning system roles

User

+ admin
   + All permissions for all resources? ?
+ Ordinary users
   + Does the user have operating permissions for all objects in the namespace created by this user?
   + Are the namespace resources of other users readable and writable?

SystemAccount

+ SystemAccount is the identity required for apiserver communication after the developer (kubernetes developer or domain developer) creates the application.
+ Users can create custom ServiceAccounts, and kubernetes also creates a default ServiceAccount for each namespace.
+ Default ServiceAccount usually requires given permissions before it can write to the apiserver.



#### Implementation plan

When the cluster is created, create a custom role, such as namespace-creator

Namespace-creator role defines user-operable objects and corresponding read and write operations.

Create a custom namespace admission webhook

+ When the namespace creation request is processed, obtain the current user information and annotate it to the namespace

Create RBAC controller

+ Watch namespace creation event
+ Get the creator information of the current namespace
+ Create a rolebinding object in the current namespace and bind the namespace-creator role to the user

#### Other best practices related to permissions

ClusterRole is non-namespace bound and takes effect for the entire cluster.

Usually you need to create an administrator role and bind it to the development operations team members

CustomResourceDefinition is a global resource. After ordinary users create a CustomResourceDefinition, the administrator needs to grant corresponding permissions before they can actually operate the object.

For all role management, it is recommended to create a spec and drive it with source code

+ Although permissions can be modified through edit operations, it will lead to confusion in permission management later. There may be many temporarily created roles and role-binding objects that repeatedly bind a certain resource permission.

Permissions are transferable. User A can extract a certain operation on an object into a permission and assign it to user B.

Prevent a large number of roles and role-binding objects, because a large number of objects will lead to low authentication efficiency and increase the burden on the apiserver.

ServiceAccount also needs authorization, otherwise your component may not be able to operate a certain object.

Tips: SSH to the master node and access the apiserver through the insecure port to bypass authentication. When management operations need to be performed but there is no

Can be used if you have permission (not recommended)

#### Traps that occur during operation

**Case 1:**

+ In order to improve system efficiency, the R&D staff changed the update method to patch
+ R&D personnel passed the local non-security test environment test
+ Go to production and find it is not working
+ Reason: Forgot to update rolebinding, the corresponding serviceaccount does not have patch permissions

**Case 2:**

+ R&D personnel create CRD and program for this CRD
+ Not working after production
+ The reason is that the CRD is not authorized and the corresponding component cannot get the corresponding CRD resource.