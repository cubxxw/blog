---
title: 'Kubernetes Control Plane - Detailed Analysis of Kubelet'
ShowRssButtonInSectionTermList: true
date: '2023-09-28T20:29:30+08:00'
draft: false
showtoc: true
tocopen: false
type: posts
author: 'Xinwei Xiong, Me'
keywords: ['Kubernetes', 'Kubelet', 'Control Plane', 'kubelet', 'Pod Management']
tags: ['Development', 'Golang (GO Language)', 'Kubernetes', 'K8s']
categories:
  - 'Development'
description: 'kubelet architecture, kubelet core processes for Pod management, kubelet node management, Pod management'
---

[Kubelet Component Analysis](https://blog.csdn.net/jettery/article/details/78891733)

## Understanding kubelet

The Kubelet component runs on Node nodes, maintaining running Pods and providing Kubernetes runtime environment, mainly accomplishing the following missions:

1. Monitor Pods assigned to this Node
2. Mount volumes required by Pods
3. Download Pod secrets
4. Run containers in Pods through docker/rkt
5. Periodically execute liveness probes defined for containers in Pods
6. Report Pod status to other system components
7. Report Node status

The core process of kubelet managing Pods mainly includes three steps. First, kubelet obtains Pod manifests through files, HTTP endpoints, API Server, and HTTP server. Second, node management mainly involves node self-registration and node status updates. Kubelet registers node information through API Server at startup and periodically sends node information to API Server, which writes the information to etcd after receiving it. Finally, Pod startup process mainly includes steps like image pulling, container startup, probe monitoring, and status reporting.

kubelet is a node agent program in Kubernetes responsible for maintaining the lifecycle of Pods on this node. kubelet is one of the most important components in Kubernetes, playing a very important role in Kubernetes clusters. kubelet can run on each node, monitoring Pods assigned to that Node and performing various container management operations, such as mounting volumes required by Pods and downloading Pod secrets.

The core process of kubelet mainly includes obtaining Pod manifests, node management, and Pod startup process. Among these, methods for obtaining Pod manifests include files, HTTP endpoints, API Server, and HTTP server. Node management mainly includes node self-registration and node status updates, while Pod startup process mainly includes steps like image pulling, container startup, probe monitoring, and status reporting.

+ In terms of node management, kubelet can determine whether to register itself with API Server by setting startup parameter `-register-node`. If kubelet doesn't choose self-registration mode, users need to configure Node resource information themselves and inform kubelet of the API Server location in the cluster. At startup, kubelet registers node information through API Server and periodically sends node information to API Server, which writes the information to etcd after receiving it.
+ In terms of Pod management, kubelet can obtain Pod manifests through files, HTTP endpoints, API Server, and HTTP server. File method is mainly used for static pods, while HTTP and API Server methods are commonly used in Kubernetes. HTTP server is mainly used for kubelet to listen to HTTP requests and respond to simple APIs for submitting new Pod manifests.
+ In terms of Pod startup process, kubelet performs various container management operations, including image pulling, container startup, probe monitoring, and status reporting. Image pulling is an important task in Pod startup process, and kubelet can manage images through imageManager module. Container startup is the next step in Pod startup process, and kubelet starts containers through container runtime. Probe monitoring is a very important task in Pod startup process. kubelet periodically executes liveness probes defined for containers in Pods and reports results to other system components. Status reporting is an important function of kubelet, reporting Pod and Node status to other system components, as well as reporting node's own status and resource usage to API Server.

In summary, kubelet is one of the most important components in Kubernetes, responsible for maintaining the lifecycle of Pods on this node and performing various container management operations. The core process of kubelet includes obtaining Pod manifests, node management, and Pod startup process. In terms of node management, kubelet determines whether to register itself with API Server by setting startup parameter `-register-node`. In terms of Pod management, kubelet can obtain Pod manifests through files, HTTP endpoints, API Server, and HTTP server. In terms of Pod startup process, kubelet performs various container management operations, including image pulling, container startup, probe monitoring, and status reporting.

## kubelet Architecture

Each node runs a kubelet service process, listening on port 10250 by default.

+ Receives and executes instructions from master;
+ Manages Pods and containers in Pods;
+ Each kubelet process registers node information on API Server and periodically reports node resource usage to master node, monitoring node and container resources through cAdvisor.

The kubelet architecture is shown in the following diagram:

![http://sm.nsddd.top/sm202303081731495.png](http://sm.nsddd.top/sm202303081731495.png)

kubelet listens on 4 ports by default:

+ **10250 (kubelet API)**: **Port for kubelet server to communicate with apiserver, periodically requesting apiserver to get tasks it should handle**, through which you can access and get node resources and status. **kubectl commands to view pod logs and cmd commands all access through kubelet port 10250.**
+ **10248 (health check port)**: Whether kubelet is working normally, specified through kubelet startup parameters `–healthz-port` and `–healthz-bind-address`.
+ **4194 (cAdvisor monitoring)**: kubelet can get environment information of this node and status of containers running on node through this port. Accessing `http://localhost:4194` shows cAdvisor management interface, port can be specified through kubelet startup parameter `–cadvisor-port`.
+ **10255 (readonly API)**: Provides pod and node information, interfaces are exposed in read-only form, accessing this port requires no authentication or authorization. Pod interface is similar to apiserver's `http://127.0.0.1:8080/api/v1/pods?fieldSelector=spec.nodeName=xxx` interface
+ ProbeManager: Implements probe functionality in k8s. After configuring various probes in pods, ProbeManager manages and executes them
+ OOMWatcher: System OOM listener, establishes SystemOOM with cadvisor module, receives OOM signals from cadvisor through Watch and records them to node Events
+ GPUManager: Manages available GPUs on Node. Current version requires specifying `Accelerators=true` in feature-gates in kubelet startup parameters, and only supports using GPUs with runtime=Docker, currently only supports NvidiaGPU. GPUManager mainly needs to implement Start()/Capacity()/AllocateGPU() functions defined in interface
+ cAdvisor: cAdvisor integrated in kubelet, collects monitoring information of this Node and started containers, starts an Http Server to receive external rest api requests. cAdvisor module provides interface for external use, through which you can get node information, local file system status, etc. This interface is used by imageManager, OOMWatcher, containerManager, etc.
+ PLEG: PLEG stands for PodLifecycleEvent. PLEG continuously calls container runtime to get pods on this node, then compares with previously cached pod information in this module to see if container states in latest pods have changed. When state transitions occur, it generates an eventRecord event and outputs to eventChannel. syncPod module receives event from eventChannel to trigger pod synchronization process, calling container runtime to rebuild pods and ensure pods work normally.
+ StatusManager: This module is responsible for container status in pods, receives pod status change events from other modules, processes them, and updates to kube-apiserver.
+ EvictionManager: When node resources are insufficient and reach configured evict policies, pods will be evicted from node to ensure node stability. Evict policies can be determined through kubelet startup parameters. When node memory and disk resources reach evict policies, corresponding node status records are generated
+ VolumeManager: Responsible for volume management used by pods on node. Main functions include: Volume status synchronization - module starts goroutines to get current volume status information and expected volume status information on node, periodically syncing volume status. Volume is associated with pod lifecycle, involving volume attach/detach process during pod creation and deletion. More importantly, kubernetes supports multiple storage plugins
+ ImageGC: Responsible for image recycling on Node. When local disk space storing images reaches certain threshold, image recycling is triggered, deleting images not used by pods. Image recycling threshold can be set through kubelet startup parameters.
+ ContainerGC: Responsible for dead containers on Node, automatically cleaning remaining containers on node. Specific GC operations are implemented by runtime
+ ImageManager: Calls methods PullImage/GetImageRef/ListImages/RemoveImage/ImageStates provided by kubecontainer.ImageService to ensure images required for pod operation, mainly to support kubelet cni.

## kubelet Core Process for Managing Pods

![http://sm.nsddd.top/sm202303081730574.png](http://sm.nsddd.top/sm202303081730574.png)

Sources include two types: file and http:

+ file is mainly used for static pods
+ http is called by apiserver

### kubelet Node Management

Node management mainly involves node self-registration and node status updates:

+ Kubelet can determine whether to register itself with API Server by setting startup parameter **-register-node**;
+ If Kubelet doesn't choose self-registration mode, users need to configure Node resource information themselves and inform Kubelet of API Server location in the cluster;
+ Kubelet registers node information through API Server at startup and periodically sends node information to API Server, which writes the information to etcd after receiving it.

### Pod Management

Getting Pod manifests:

+ File: Files in configuration directory specified by startup parameter **-config** (default `/etc/kubernetes/manifests/`). These files are rechecked every 20 seconds (configurable)

+ Configuration method

  kubelet can specify configuration file directory through startup parameter `-config`, default is `/etc/kubernetes/manifests/`. Files in this directory are rechecked every 20 seconds, frequency can be changed using parameter `-sync-frequency` at startup.

+ HTTP endpoint (URL): Set by startup parameter **-manifest-url**. This endpoint is checked every 20 seconds (configurable)

+ API Server: Monitor etcd directory through API Server and sync Pod manifests.

+ HTTP server: kubelet listens to HTTP requests and responds to simple APIs for submitting new Pod manifests.

### Pod Startup Process

![http://sm.nsddd.top/sm202303081731318.png](http://sm.nsddd.top/sm202303081731318.png)

The core process of kubelet managing Pods is as follows:

1. kubelet obtains Pod manifests through API Server or files.
2. kubelet creates Pod containers through CRI (Container Runtime Interface).
3. kubelet checks if required container images exist through image manager, pulls from image repository if not.
4. kubelet starts containers through container runtime (like Docker).
5. kubelet periodically executes container probe monitoring, including liveness and readiness probes.
6. kubelet periodically reports Pod status to API Server, including container status and node resource usage.

Among these, kubelet manages Pods through obtaining Pod manifests, node management, and Pod startup process.

We know each pod has a foundation called pause:

In Kubernetes, containers are the smallest scheduling unit, but they usually don't run independently. Instead, they combine with other containers to form a complete application deployment unit—Pod. In a Pod, all containers share the same network space and storage volumes, and they can communicate with each other through localhost.

Each Pod has a pause container inside, which is a container that exists only in the network. It starts as the first container when Pod is created, doesn't handle any business functions in the Pod, but only occupies a network port so other containers can communicate with it. After pause container starts, it enters pause state but remains running to maintain container process continuity. When all applications in containers stop executing, pause container still runs, preserving container network and storage configuration. pause container is very small, only a few dozen megabytes, so creation and destruction are very fast without consuming excess resources.

You can think of pause container as the "foundation" of Pod, responsible for maintaining Pod lifecycle. When other containers in Pod stop running, pause container still runs to ensure Pod network and storage configuration won't be lost. Therefore, if pause container stops running, the entire Pod will be deleted along with all containers in the Pod. pause container is also an important component of kubelet, which judges Pod status by monitoring pause container status.

In summary, pause container is a very important concept in Kubernetes and can be said to be the foundation of entire container orchestration. Understanding pause container's role and principles is very necessary for deeply understanding Kubernetes runtime mechanisms and scheduling strategies.

pause container source code address: https://github.com/kubernetes/kubernetes/blob/master/cmd/kubelet/app/pods/pause.go

More detailed process:

> Classified by components, detailed to method level.
>
> ![http://sm.nsddd.top/sm202303081908979.png](http://sm.nsddd.top/sm202303081908979.png)

You can see the calling process of CNI, CRI, CSI, giving a clear understanding here.

## kubelet Pod Startup Process

1. Obtain Pod manifests through API Server or files.
2. Create Pod containers through CRI (Container Runtime Interface).
3. Check if required container images exist through image manager, pull from image repository if not.
4. Start containers through container runtime (like Docker).
5. Periodically execute container probe monitoring, including liveness and readiness probes.
6. Periodically report Pod status to API Server, including container status and node resource usage.

Among these, kubelet manages Pods through obtaining Pod manifests, node management, and Pod startup process.

## CNI, CRI, CSI Calling Steps and Process

The calling process is as follows:

1. kube-container-runtime in kubelet calls CRI runtime for container management.
2. CRI runtime is responsible for communicating with container runtime, such as Docker or containerd.
3. CRI runtime calls CNI for network management through CNI plugin.
4. CNI is responsible for calling network plugins, such as flannel or Calico.
5. CSI is responsible for communicating with storage plugins, such as Ceph or NFS.

Above is the kubelet Pod startup process and CNI, CRI, CSI calling steps and process.