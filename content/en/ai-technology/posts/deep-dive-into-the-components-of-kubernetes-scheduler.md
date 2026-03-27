---
title: 'Kubernetes Control Plane - Scheduler'
ShowRssButtonInSectionTermList: true
date: '2023-09-28T20:29:30+08:00'
draft: false
showtoc: true
tocopen: false
type: posts
author: 'Xinwei Xiong, Me'
keywords: ['Kubernetes', 'Scheduler', 'Container Orchestration', 'K8s Architecture', 'Cluster Management']
tags: ['Blog', 'Go', 'Kubernetes', 'K8s']
categories: ['Development']
description: 'Explore how Kubernetes scheduler component works, how it decides which node to place containers on, and its importance for cluster management and container orchestration.'
---

## Scheduler

**kube-scheduler is responsible for scheduling and assigning Pods to nodes within the cluster. It listens to kube-apiserver, queries for Pods that haven't been assigned to Nodes, and then assigns nodes to these Pods based on scheduling policies (updating the Pod's NodeName field).**

The scheduler needs to fully consider many factors:

+ Fair scheduling;
+ Efficient resource utilization;
+ QoS;
+ affinity and anti-affinity;
+ data locality;
+ inter-workload interference;
+ deadlines.

kube-scheduler scheduling is divided into two phases, predicate and priority:

+ predicate: Filter nodes that don't meet conditions;
+ priority: Priority ranking, select the node with highest priority.

### predicate Policies

+ PodFitsHostPorts: Check for Host Ports conflicts.
+ PodFitsPorts: Same as PodFitsHostPorts.
+ PodFitsResources: Check if Node resources are sufficient, including allowed Pod count, CPU, memory, GPU count and other OpaqueIntResources.
+ HostName: Check if pod.Spec.NodeName matches candidate node.
+ MatchNodeSelector: Check if candidate node's pod.Spec.NodeSelector matches
+ NoVolumeZoneConflict: Check for volume zone conflicts.
+ MatchInterPodAffinity: Check if Pod affinity requirements are matched.
+ NoDiskConflict: Check for Volume conflicts, limited to GCE PD, AWS EBS, Ceph RBD and iSCSI.
+ PodToleratesNodeTaints: Check if Pod tolerates Node Taints.
+ CheckNodeMemoryPressure: Check if Pod can be scheduled to MemoryPressure nodes.
+ CheckNodeDiskPressure: Check if Pod can be scheduled to DiskPressure nodes.
+ NoVolumeNodeConflict: Check if node satisfies conditions for Volumes referenced by Pod.

### priority Policies

+ SelectorSpreadPriority: Prioritize reducing number of Pods belonging to same Service or Replication Controller on node.
  + Try to distribute multiple replicas under same rc to different nodes, increasing availability
+ InterPodAffinityPriority: Prioritize scheduling Pod to same topology (like same node, Rack, Zone, etc.).
+ LeastRequestedPriority: Prioritize scheduling to nodes with fewer resource requests.
+ BalancedResourceAllocation: Prioritize balancing resource usage across nodes.
+ NodePreferAvoidPodsPriority: Determined by alpha.kubernetes.io/preferAvoidPods field, weight 10000, avoiding influence of other priority policies
+ NodeAffinityPriority: Prioritize scheduling to nodes matching NodeAffinity.
+ TaintTolerationPriority: Prioritize scheduling to nodes matching TaintToleration.
+ ServiceSpreadingPriority: Try to distribute Pods of same service to different nodes, replaced by SelectorSpreadPriority (not used by default).
+ EqualPriority: Set priority of all nodes to 1 (not used by default)
+ ImageLocalityPriority: Try to schedule containers using large images to nodes that have already downloaded the image (not used by default)
+ MostRequestedPriority: Try to schedule to already used Nodes, especially suitable for cluster-autoscaler (not used by default)

### Resource Requirements

CPU

+ requests
  + When Kubernetes schedules Pod, it judges the sum of CPU Request of Pods currently running on node, plus current scheduling Pod's CPU request, calculating whether it exceeds node's allocatable CPU resources
+ limits
  + Configure cgroup to limit resource upper bound

Memory

+ requests
  + Judge if node's remaining memory meets Pod's memory request to determine if Pod can be scheduled to this node
+ limits
  + Configure cgroup to limit resource upper bound

### request & limit and cgroups

In k8s, request is used for scheduling. Pod can be scheduled if node remaining resources meet request value. limit has no effect in k8s system, just passed to cri.

In cri, when using cgroup to limit resources, how do they correspond?

Taking cpu resource as example:

+ 1) request value reflects in cpu.shares
  + For example, if cpu request is 0.5, then cpu.shares in cgroups is 0.5*1024 = 512
  + If it's 2, then cpu.shares is 2048
+ 2) limits value reflects in cpu.cfs_period_us and cpu.cfs_quota_us
  + Both are absolute values, so can be used for hard limits

### Disk Resource Requirements

Container ephemeral storage includes logs and writable layer data, which can be requested by defining limits.ephemeral-storage and requests.ephemeral-storage in Pod Spec. **After Pod scheduling is completed, compute node's limitation on ephemeral storage is not based on CGroup, but kubelet periodically gets container logs and container writable layer disk usage. If it exceeds limit, Pod will be evicted**.

### init container Resource Requirements

When kube-scheduler schedules Pod with multiple init containers, **it only calculates the init container with most cpu.request**, not the sum of all init containers. **Since multiple init containers execute sequentially and exit immediately after completion, the resources required by init container with most resource requests can meet all init container requirements.** When kube-scheduler calculates resources occupied by this node, init container resources are still included in calculation. Because init containers may be executed again under specific circumstances, such as when Sandbox is rebuilt due to image changes.

### Schedule Pod to Specific Node

Pods can be scheduled to desired Nodes through nodeSelector, nodeAffinity, podAffinity, and Taints and tolerations. You can also schedule Pod to specific node by setting nodeName parameter.

For example, using nodeSelector, first add labels to Node

```
kubectl label nodes <your-node-name> disktype=ssd
```

Then, specify that this Pod only wants to run on Nodes with disktype=ssd label.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
      nodeSelector:
        disktype: ssd
```

#### nodeSelector

First label the Node:

```bash
kubectl label nodes node-01 disktype=ssd
```

Then specify nodeSelector as disktype: ssd in daemonset:

```yaml
spec:
  nodeSelector:
    disktype: ssd
```



#### NodeAffinity

NodeAffinity currently supports two types: `requiredDuringSchedulingIgnoredDuringExecution` and `preferredDuringSchedulingIgnoredDuringExecution`.

They represent must-satisfy conditions and preferred conditions respectively. For example, the following example represents **preferring** to schedule to nodes containing label disktype=ssd.

> If no nodes satisfy this condition, it can still be scheduled.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 1
            preference:
              matchExpressions:
                - key: disktype
                  operator: In
                  values:
                    - ssd
      containers:
        - name: nginx
          image: nginx
```

For example, the following example represents **only** scheduling to nodes containing label disktype=ssd.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                      - ssd
      containers:
        - name: nginx
          image: nginx
```



#### podAffinity

**podAffinity selects Node based on Pod labels**, only scheduling to Nodes where qualifying Pods are located, supporting podAffinity and podAntiAffinity.

This feature is quite complex, using the following example:

If a "Node runs pods containing at least one pod with a=b label", then it can be scheduled to that Node, while also unable to schedule to "Nodes containing at least one running Pod with app=anti-nginx label".

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-anti
spec:
  replicas: 2
  selector:
    matchLabels:
      app: anti-nginx
  template:
    metadata:
      labels:
        app: anti-nginx
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: a
                  operator: In
                  values:
                    - b
            topologyKey: kubernetes.io/hostname
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - anti-nginx
            topologyKey: kubernetes.io/hostname
      containers:
        - name: with-pod-affinity
          image: nginx
```

#### Taints & Tolerations

Taints and Tolerations are used to ensure Pods are not scheduled to inappropriate Nodes, where Taint is applied to Node and Toleration is applied to Pod.

Currently supported Taint types:

+ **NoSchedule**: New Pods are not scheduled to this Node, doesn't affect running Pods;
+ **PreferNoSchedule**: soft version of NoSchedule, try not to schedule to this Node;
+ **NoExecute**: New Pods are not scheduled to this Node, and delete (evict) already running Pods. Pod can add a time (tolerationSeconds), being removed only after this time expires

However, when Pod's Tolerations match all Taints of Node, it can be scheduled to that Node; when Pod is already running, it won't be deleted (evicted) either. Additionally for NoExecute, if Pod adds a tolerationSeconds, it will only delete Pod after that time.

### Multi-tenant Kubernetes Cluster - Compute Resource Isolation

Kubernetes clusters are generally universal clusters that can be shared by all users, with users not needing to care about compute node details. But often some customers with their own compute resources require:

+ Bringing compute resources to join Kubernetes cluster;
+ Requiring resource isolation.

Implementation solution:

+ Put Taints on compute nodes to be isolated;
+ When users create Pods, define tolerations to specify scheduling to node taints.

Does this solution have loopholes? How to close them?

+ Other users who can get nodes or pods can see taints information and can use same tolerations to occupy resources.
+ Don't let users get node detail?
+ Don't let users get other people's pod detail?
+ Within enterprises, can also manage through specifications, seeing who occupied which nodes through statistical data;
+ Data plane isolation requires other solutions to cooperate.

Experience from production systems

+ Users forget to add tolerance, causing pods unable to schedule, pending;
+ Common mistakes by new employees, solved through chatbot Q&A;
+ Other users get node detail, find Taints, steal resources.
+ Through dashboard, can see which users' applications run on which nodes;
+ For violating users, mainly criticism and education.

### Priority Scheduling

Starting from v1.8, kube-scheduler supports defining Pod priority, ensuring high-priority Pods are scheduled first. Enabling method:

+ apiserver configuration --feature-gates=PodPriority=true and --runtime-config=scheduling.k8s.io/v1alpha1=true
+ kube-scheduler configuration --feature-gates=PodPriority=true

### priorityClass

Before specifying Pod priority, you need to first define a PriorityClass (non-namespace resource), such as:

```
apiVersion: v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "This priority class should be used for XYZ service pods only."
```

Then set priorityClass for pod:

```
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
    imagePullPolicy: IfNotPresent
  priorityClassName: high-priority
```

### Multiple Schedulers

If the default scheduler doesn't meet requirements, you can also deploy custom schedulers. Moreover, multiple scheduler instances can run simultaneously in the entire cluster, using **podSpec.schedulerName** to choose which scheduler to use (default uses built-in scheduler).

### Experience from Production

Small clusters:

+ For 100 nodes, concurrently creating 8000 Pods takes maximum scheduling time of about 2 minutes. There have been cases where scheduler cache still had information after node deletion, causing Pod scheduling failures.

Amplification effect:

+ When one node has problems and therefore low load, usually users' Pods are prioritized to schedule to that node, causing all newly created Pods by users to fail.

Application bomb:

+ Dangerous user Pods exist (like fork bomb). After being scheduled to a node, they cause node crashes due to opening too many file handles. Pods get evicted to other nodes, causing damage to other nodes. This cycle can make all nodes in entire cluster unavailable.

**The scheduler can be said to be one of the components with best stability during operations, basically requiring no major maintenance effort.**

## FAQ

### init container Resource Reclamation

According to init container resource requirements section, after pod startup, init container resources are still not reclaimed.

Scenario: **init container needs large resources during initialization, which decreases after initialization is complete. How to optimize this situation?**

> CPU resources can be compressed, at worst initialization is slower, but memory resources cannot - less memory directly causes OOM.

Native k8s doesn't optimize this situation. Community has a **vertical scaling** feature that can dynamically adjust pod resource requirements, but support is not as good as horizontal scaling.

### How to Lock CPU for Compute-intensive Pods

cpuset, bind Pod with specific CPU cores, kubelet supports static cpu config

+ Configure pod's request and limits to be the same, this pod's Qos level in k8s becomes BestEffort. For pods of this level, if kubelet is configured with static cpu config, automatic binding will occur