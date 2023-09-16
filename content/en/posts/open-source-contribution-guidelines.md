---
title : 'Open Source Contribution Guidelines'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-16T16:40:53+08:00
draft : false
showtoc: true
tocopen: true
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
categories:
  - Development
  - Blog
---

## Task Assignment

> time:Within a week

- Complete first contribute, purpose: to understand the contribution process of open source projects
- Complete the construction of sealos development environment
- Understand the basic usage, core concepts, and functions of core components of kuberentes

> - Basic usage:
> - Create a pod and understand what a pod is
> - Create a deployment and understand the relationship between deployment and pod
> - Create a configmap and understand how to mount configuration files to pods
> - Create a service and access pods in the cluster through service
> - Core concepts and functions of core components:
> - kubectl apiserver controller-manager scheduler kubelet kube-proxy etcd What do these components do?
> - You can use a kubectl apply and a deployment to sort out what these components have done respectively.

🚸 Next time: A specific task will be assigned and the sealos source code architecture will be introduced.



### Resources 🗓️

**Reference:**

1. Contribution documents: [https://github.com/labring/sealos/blob/main/CONTRIBUTING.md](https://github.com/labring/sealos/blob/main/CONTRIBUTING.md)

2. Development environment construction document: [https://github.com/labring/sealos/blob/main/DEVELOPGUIDE.md](https://github.com/labring/sealos/blob/main/DEVELOPGUIDE.md)

3. Use sealos to quickly build kubernetes learning environment documents: [https://github.com/labring/sealos#quickstart](https://github.com/labring/sealos#quickstart) Just build a stand-alone environment.

4. Kubernetes introductory documentation: [https://kubernetes.io/docs/tutorials/kubernetes-basics/](https://kubernetes.io/docs/tutorials/kubernetes-basics/) Skip the installation part and use sealos directly. key build.


> ⚠️ Note: Don’t be afraid of harassing fanux if there are any problems during the process. It is important to take the initiative to ask questions. Questions are also very welcome in the incubation communication group.



## Contribute documentation

+ [x] [Contribution Guide](https://github.com/labring/sealos/blob/main/CONTRIBUTING.md)

For **security** issues discovered, it is recommended to notify [admin@sealyun.com](mailto:admin@sealyun.com) by sending an email

For **general** issues, maybe you can choose [issues]([New Issue · labring/sealos (github.com)](https://github.com/labring/sealos/issues/new/choose)) to point out the problem

![image-20221019161049208](http://sm.nsddd.top/smimage-20221019161049208.png)

⚡ Obviously, I prefer `pr` to `issues`, you can find the following problems and improve them

+ If you find a spelling mistake, try to fix it!
+ If you find a bug, try to fix it!
+ If you find some redundant code, try deleting them!
+ If you find some test cases missing, try adding them!
+ If you can enhance a feature, **don't hesitate**!
+ If you find that code is implicit, try adding comments to make it clear!
+ If you think the code is ugly, try refactoring it!
+ If you can help improve the documentation, that would be great!
+ If you find a document that is incorrect, just fix it!
+ .…..



### 🧷 Additional reading

1. [How to participate in the github project, you may refer to this article~](https://nsddd.top/archives/contributors)
2. [How to use actions automatic deployment to achieve automatic remote updates~](https://nsddd.top/archives/actions)

### 💡 Steps

+ [x] [git tutorial](https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md)

⬇️ The general process is as follows:

1. First fork this repository to your repository on Github

2. git clone clone to local
3. Modify the corresponding code locally
4. git push to your own warehouse
5. Perform pull request operations in your own warehouse



### Documentation specifications

#### Format

Please follow the rules below to format your document better, which will greatly improve the reading experience.

1. Please do not use Chinese punctuation marks in English documents and vice versa.
2. Please use capital letters where applicable, such as the first letter of a sentence/title, etc.
3. Please specify a language for each Markdown code block unless there is no associated language.
4. Please insert spaces between Chinese and English words.
5. Please use the correct capitalization of technical terms, such as HTTP instead of http, MySQL instead of mysql, Kubernetes instead of kubernetes, etc.
6. Please check the document for any spelling errors before submitting a PR.

You can also check out [docusaurus](https://docusaurus.io/docs/markdown-features) to write documentation with richer features.



**1. Set "Remote Upstream" to **Use the following two commands: `https://github.com/labring/sealos.git`

> [🧷 Two ways to add remote repository with git](https://github.com/cubxxw/awesome-cs-course/blob/master/Git/markdown/git-adds.md)

```bash
git remote add upstream https://github.com/labring/sealos.git
git remote set-url --push upstream no-pushing
```

![image-20221109173951312](http://sm.nsddd.top/smimage-20221109173951312.png)

With this remote setup, you can check the git remote configuration like this:

```bash
$ git remote -v
origin https://github.com/<your-username>/sealos.git (fetch)
origin https://github.com/<your-username>/sealos.git (push)
upstream https://github.com/labring/sealos.git (fetch)
upstream no-pushing (push)
```

Adding this we can easily synchronize our local branch with the upstream branch.

![image-20221019162733226](http://sm.nsddd.top/smimage-20221019162733226.png)



**2. Create a branch** to add new features or fix issues

Update the local working directory and the remote forked repository:

> It is recommended to use `fetch`: From a security perspective, `git fetch` is safer than `git pull`, because we can first compare the differences between local and remote, and then selectively merge.

```bash
cd sealos
git fetch upstream
git checkout main
git rebase upstream/main
git push # default origin, update your forked repository
```

Create new branch:

```
git checkout -b bug-xiongxinwei
```

Make any changes to the code and then build and test it. `new-branch`

> Recommended naming convention:
>
> ``asciiarmor
> Branch: Name: Description:
>
> Master branch master master branch, all official versions provided to users are released on this master branch
> Development branch dev development branch is always the branch with the latest and most complete functions
> Function branch feature-* new function branch, a certain function point is under development
> Release version release-* releases functions that will be launched regularly
> Fix branch bug-* Fix bug in online code
> ```

![image-20221019164941695](http://sm.nsddd.top/smimage-20221019164941695.png)



**3. Push the branch** to the forked repository, trying not to generate multiple commit messages in the PR.

> `git commit -a -s -m "message for your changes"`
>
> + `-a` parameter setting does not need to execute the `git add` command after modifying the file, just submit it directly
> + `-s` means adding a signature and adding your own information
>
> ![image-20221019190552361](http://sm.nsddd.top/smimage-20221019190552361.png)

```bash
golangci-lint run -c .golangci.yml # lint
git add -A
git commit -a -s -m "message for your changes" # -a is git add ., -s adds a Signed-off-by trailer
git rebase -i <commit-id> # If your PR has multiple submissions
git push # Push to the forked library after rebase is completed. If this is the first push, run git push --set-upstream origin <new-branch>
```

![image-20221019190409127](http://sm.nsddd.top/smimage-20221019190409127.png)

> Specify a language for each Markdown block unless there is no associated language.

If you don't want to use it, you can use `git rebase -i`, `git commit -s --amend && git push -f`

If you develop multiple features in the same branch, you should rebase the master branch:

```bash
# create new branch, for example git checkout -b feature/infra
git checkout -b <new branch>
# update some code, feature1
git add -A
git commit -m -s "init infra"
git push # if it's first time push, run git push --set-upstream origin <new-branch>
# then create pull request, and merge
# update some new feature, feature2, rebase main first.
git rebase upstream/main
git commit -m -s "init infra"
# then create pull request, and merge
```



**Submit a pull request to the master branch:**

![image-20221019192522791](http://sm.nsddd.top/smimage-20221019192522791.png)



## Use sealos to quickly build kubernetes

> ⚠️ Installation notes:
>
> 1. Requires **pure version** Linux system `ubuntu16.04`, `centos7`
> 2. Use the new version, **use the new version instead of the old one**
> 3. Server time must be synchronized
> 4. The host name cannot be repeated
> 5. The master node CPU must be 2C or above
> 6. When selecting `cilium` for the cni component, the kernel version must be no less than 5.4

+ [x] [Quick Build Guide](https://github.com/labring/sealos/blob/main/DEVELOPGUIDE.md)

`sealos` currently only supports `linux` and requires a `linux` server for testing.

Some tools can help you start a virtual machine very conveniently, such as [multipass](https://multipass.run/)



### Build project

```bash
mkdir /sealos && cd /sealos ; git clone https://ghproxy.com/https://github.com/labring/sealos && cd sealos && ls ; make build # It may take a while due to network reasons~
```

You can `scp` the `bin` file to your `linux` host.

If you use `multipaas`, you can mount the `bin` directory to `vm`:

```bash
multipass mount /your-bin-dir <name>[:<path>]
```

Then test it locally.

> **⚠️ NOTE: **
>
> All binaries with `sealos` can be built anywhere as they have `CGO_ENABLED=0`. However, support for overriding the driver is required when running some `sealos` subcommands that depend on CGO. `images` therefore opens CGO `sealos` when building, making it impossible to build `sealos` binaries on platforms other than Linux.
>
> + Both `Makefile` and `GoReleaser` in this project have this setting.
>
> ## Install golang
>
> ````bash
> wget -o https://go.dev/dl/go1.19.3.linux-amd64.tar.gz && tar -C /usr/local -zxvf go1.19.3.linux-amd64.tar.gz
> cat >> /etc/profile <<EOF
> # set go path
> export PATH=\$PATH:/usr/local/go/bin
> EOF
> source /etc/profile && go version
> ```
>
> ## Build the project
>
> ````bash
> git clone https://github.com/labring/sealos && cd sealos
> go env -w GOPROXY=https://goproxy.cn,direct && make build
> ```

:::danger custom environment variable mypath
root@smile:/usr/local/src# cat /etc/profile.d/mypath

# GO language path

export GO_PATH=$"/usr/local/src/go"

# path

export PATH=$PATH:$GO_PATH/bin

:::
---

😂 What I like very much is that `sealos` can build the environment in one go. I think back then, I really spent all my efforts to build it~ but failed.

![image-20221019194939030](http://sm.nsddd.top/smimage-20221019194939030.png)



### remote connection

+ [x] [Remote connection & password-free remote~documentation](https://github.com/cubxxw/awesome-cs-course/blob/master/linux/linux-web/7.md)



### Pitfalls and solutions encountered

+ centos server is not recommended (ubuntu is recommended)
+ go version is best `>18`



::: tip

1. Cloning code is slow, you can use ghproxy: `git clone https://ghproxy.com/https://github.com/labring/sealos`
2. Building the download package is slow, you can use **goproxy**: `go env -w GOPROXY=https://goproxy.cn,direct && make build`
3. `cgo: C compiler "x86_64-linux-gnu-gcc" not found: exec: "x86_64-linux-gnu-gcc": executable file not found in $PATH` You need to install gnu-gcc, for example: `apt -get install build-essential` or `yum -y install gcc-c++-x86_64-linux-gnu`

:::



## Use sealos to quickly build kubernetes

+ [x] [sealos guide to building k8s](https://github.com/labring/sealos#quickstart)



### Add to environment variables

> `sealos` location`/sealos/*`

```bash
export PATH=$PATH:/sealos/bin/linux_amd64/
#export PATH=/usr/local/bin:$PATH
//PATH is the variable name, here it means adding it to the PATH environment variable
// =Followed by the environment variables to be added
// :$PATH refers to reassigning the newly added environment variables and the original environment variables to the PATH variable. It can be seen here that if there are multiple environment variables, they should be separated by:, such as
// export PATH=/sealos/bin/linux_amd64/bin:/sealos/bin/linux_amd64/bin:$PATH
// Of course, it doesn't matter whether $PATH is placed at the beginning or at the end.
```

**Environment variables added in this way will take effect immediately, but will become invalid after the window is closed**

⬇️ Add global variable method:

```bash
vim /etc/profile
// If you only modify the environment variables of the current user, it is `vim ~/.bashrc`
//Add the following code to the last line of the file:
export PATH=$PATH:/sealos/bin/linux_amd64/
//The rules and usage are as mentioned in Article 2
```

⚔️Quick:

```bash
cat >> /etc/profile <<EOF
#set go path
export PATH=\$PATH:/usr/local/go/bin
EOF

echo "source /etc/profile" >> ~/.bashrc #auto update
```

 

⚡Verification:

```bash
root@VM-4-3-ubuntu:/# sealos version
{"gitVersion":"untagged","gitCommit":"b24684f6","buildDate":"2022-10-20T19:20:05+0800","goVersion":"go1.19.2","compiler":" gc","platform":"linux/amd64"}
root@VM-4-3-ubuntu:/#
```



## k8s introductory documentation

+ [x] [Official Getting Started Document](https://kubernetes.io/docs/tutorials/kubernetes-basics/)



### docker, k8s, cloud native notes

+ [x] [docker.nsddd.top](https://docker.nsddd.top)



### Task block

- Basic usage:

   - Create a `pod` and understand what a `pod` is ➡️ [🧷Record](https://docker.nsddd.top/Cloud-Native-k8s/9.html)
   - Create a `deployment` and understand the relationship between `deployment` and `pod` ➡️ [🧷Record](https://docker.nsddd.top/Cloud-Native-k8s/10.html)
   - Create a `configmap` and understand the mounting configuration file to `pod` ➡️ [🧷Record](https://docker.nsddd.top/Cloud-Native-k8s/13.html)
   - Create a `service` and access `pod` within the cluster through `service` ➡️ [🧷Record](https://docker.nsddd.top/Cloud-Native-k8s/11.html)

- Core concepts and functions of core components:

   > `Kube-proxy` is responsible for formulating the forwarding strategy of data packets, and uses daemon mode to monitor the `pod` information of each node in real time and update the forwarding rules. After `service` receives the request, it will formulate it according to `kube-proxy` A good strategy is used to forward requests to achieve load balancing.

   You can use a `kubectl apply` and a `deployment` to sort out what these components have done respectively.



::: details core components
`kubectl apiserver controller-manager scheduler kubelet kube-proxy etcd`

>What do these components do?

+ I can imagine sealos forming a group after a long time😂
+ We have many factories, master factory and node small factory

> Node node mainly includes kubelet, kube-proxy module and pod object
> Master node mainly includes API Server, Scheduler, Controller manager, etcd components

+ kubectl is the client that comes with Kubernetes and can be used to directly operate the Kubernetes cluster.
+ Api Server is equivalent to the master’s secretary. All communication between master and node needs to go through Api Server.
+ Controller-manager is the boss and the company's decision-maker. He is responsible for the management of resource objects such as Node, Namespace, Service, Token, and Replication in the cluster, so as to maintain the resource objects in the cluster in the expected working state.
+ The scheduler is the scheduler. If our small factory cannot produce something, the scheduler needs to be responsible for scheduling the resources within the cluster, which is equivalent to the "scheduling room".
+ kubelet is the director of the small factory, controlling each node
   + The kubelet component monitors the pod binding events generated by kube-scheduler through the interface provided by api-server, then obtains the pod list from etcd, downloads the image and starts the container.
   + Monitor the pods assigned to the Node node at the same time, periodically obtain the container status, and thenNotify various components through api-server.
+ kube-proxy is easy to understand. It is equivalent to the concierge of each factory under sealos. The group may not know which resource is in which factory, but the concierge definitely knows, so the kube-proxy of each node is connected.

:::



**what is `pod`? **

+ [🧷 Go to cub to learn pod ](https://docker.nsddd.top/Cloud-Native-k8s/9.html#%E4%BF%AE%E6%94%B9pod)

Pod is the smallest scheduling unit in `Kubernetes`. A Pod encapsulates a container (or multiple containers). Containers in a Pod share storage, network, etc. That is, you can think of the entire pod as a virtual machine, and then each container is equivalent to a process running on the virtual machine. All containers in the same pod are scheduled and scheduled uniformly.

> When applications are deployed in `Kubernetes`, they are scheduled in `pods`, which are basically packages or houses of a single container. In a sense, a container of containers. `pod` is a logical packaging entity for executing containers on a `K8s` cluster. Think of each pod as a transparent wrapper that provides a slot for the container. `pod` is the smallest deployable unit of `Kubernetes`. A pod is a group of one or more containers with shared storage/network resources, and a specification for how to run the containers. So, in the simplest terms, a pod is the mechanism by which a container is "used" in Kubernetes.
>
> 1. Pod is the smallest unit of k8s. Containers are included in pods. There is a pause container and several business containers in a pod, and the container is a separate container. In short, a pod is a collection of containers.
>
> 2. Pod is equivalent to a logical host, each pod has its own IP address
>
> 3. **Containers in the pod share the same IP and port**
>
> 4. By default, each container’s file system is completely isolated from other containers

```bash
#Create a pod named nginx-learn and expose the container port to 80.
root@VM-4-3-ubuntu:/# kubectl get node -A
root@VM-4-3-ubuntu:/# kubectl run nginx-learn --image=nginx:latest --image-pull-policy='IfNotPresent' --port=80
pod/nginx-learn created
root@VM-4-3-ubuntu:/# kubectl get node -A
NAME STATUS ROLES AGE VERSION
vm-4-3-ubuntu Ready control-plane 24h v1.25.0
root@VM-4-3-ubuntu:/# kubectl get pod
NAME READY STATUS RESTARTS AGE
nginx-learn 1/1 Running 0 58s
```



**delect the pod:**

```bash
root@VM-4-3-ubuntu:/# kubectl get pod
NAME READY STATUS RESTARTS AGE
nginx-learn 1/1 Running 0 58s
root@VM-4-3-ubuntu:/# kubectl delete pod nginx-learn
pod "nginx-learn" deleted
root@VM-4-3-ubuntu:/# kubectl get pod
No resources found in default namespace.
```



**kubectl creates and deletes a pod related operations:**

| **Command** | **Description** |
| -------- | ------------------------------------- |
| run | Run a pod on the cluster |
| create | Create a pod using a file or standard input |
| delete | Use a file or standard input to delete a pod |



**create deployment:**

> Pod is a single or a collection of containers
>
> Pod is the smallest scheduling unit of k8s. There can be multiple containers in a Pod, sharing the network with each other, etc. This is the core concept of k8s.
>
> **deployment is a pod version management tool used to distinguish different versions of pods**
>
> From a developer's perspective, deployment means deployment. For the complete application deployment process, in addition to running the code (that is, pod), it is necessary to consider the update strategy, number of copies, rollback, restart and other steps.
>
> Deployment, StatefulSet is the Controller, ensuring that the Pod is always running in the state you need.
>
> There are one-time ones called jobs, those that are executed regularly are called crontabjobs, and those that are scheduled are called sts.

```bash
kubectl run nginx --image=nginx --replicas=2
```

> [nginx](https://so.csdn.net/so/search?q=nginx&spm=1001.2101.3001.7020): Application name
>
> `--replicas`: Specify the number of pod replicas running in the application
>
> `--image`: the image used (pulled from dockerhub by default)

```
kubectl get deployment or kubectl get deploy
```



**View replicaset:**

```bash
kubectl get replicaset or kubectl get rs
```


  **View pod:**

```bash
kubectl get pods -o wide
```



**create configMap:**

ConfigMap can be created using `kubectl create configmap` or the ConfigMap generator in `kustomization.yaml`

```powershell
kubectl create configmap <map name> <data source>
```

Where `<map name>` is the name specified for the ConfigMap and `<data source>` is the directory, file or literal value from which data is to be extracted. The name of the ConfigMap object must be a legal [DNS subdomain name](https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/names#dns-subdomain-names).





### Multiple nodes

sealos currently only supports Linux and requires a Linux server for testing.

Some tools can help you start a virtual machine very conveniently, such as [multipass](https://multipass.run/)

### Build project

```bash
mkdir /sealos && cd /sealos && git clone https://github.com/labring/sealos && cd sealos && ls && make build # It may take a while due to network reasons~
```

You can `scp` the `bin` file to your `linux` host.

If you use `multipaas`, you can mount the `bin` directory to `vm`:

```bash
multipass mount /your-bin-dir <name>[:<path>]
```

Then test it locally.

> **⚠️ NOTE: **
>
> All binaries with `sealos` can be built anywhere as they have `CGO_ENABLED=0`. However, support for overriding the driver is required when running some `sealos` subcommands that depend on CGO. `images` therefore opens CGO `sealos` when building, making it impossible to build `sealos` binaries on platforms other than Linux.
>
> + Both `Makefile` and `GoReleaser` in this project have this setting.

---

😂 What I like very much is that `sealos` can build the environment in one go. I think back then, I really spent all my efforts to build it~ but failed.

![image-20221019194939030](http://sm.nsddd.top/smimage-20221019194939030.png)



## Quick start of core services

**💡 Delete all the clusters from yesterday and open three new servers, completely new~**

![image-20221021151347038](http://sm.nsddd.top/smimage-20221021151347038.png)



### Environment preparation

> ⚠️ Note: The environment must be very important, otherwise you won’t be able to run~

```bash
hostnamectl set-hostname k8s-master01
hostnamectl set-hostname k8s-master02
hostnamectl set-hostname k8s-master03
```

> **The virtual machine needs to be configured with a static IP**



### Check the kernel version

```bash
# Download and install sealos. sealos is a golang binary tool. You can directly download and copy it to the bin directory. You can also download it from the release page.
yum install wget && yum install tar &&\
wget https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz && \
tar -zxvf sealos_4.1.3_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
#Create a cluster
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
      --masters 192.168.0.2,192.168.0.3\
      --nodes 192.168.0.4 -p [your-ssh-passwd]
```

> `-p`: passwd password
>
> Turning on ssh password-free does not require a password, it is implemented here.
>
> ![image-20221020111912006](http://sm.nsddd.top/smimage-20221020111912006.png)

![image-20221020105230320](http://sm.nsddd.top/smimage-20221020105230320.png)



**验证集群：**

```bash
kubectl get nodes
```

![image-20221020113615770](http://sm.nsddd.top/smimage-20221020113615770.png)



### 单节点

> Single host
>
> + You can use `multipass` to start multiple virtual machines from one machine
> + Recent releases also support the ——`Single` mode single-machine deployment

```bash
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
# remove taint
$ kubectl taint node --all node-role.kubernetes.io/control-plane-
```

![image-20221020212025716](http://sm.nsddd.top/smimage-20221020212025716.png) branch