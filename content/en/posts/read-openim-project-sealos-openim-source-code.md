---
title : 'Read Openim Project Sealos Openim Source Code'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-16T16:33:09+08:00
draft : false
showtoc: true
tocopen: true
author: ["熊鑫伟", "Me"]
keywords: []
tags:
  - blog
categories:
  - Development
  - Blog
---

## Prepare

I have been waiting for this article for too long. It has been about four months. I have also experienced the process of leaping from docker to Kubernetes and CloudNative ecosystem.

In turn, if you understand open source, understand sealos, and understand Kubernetes, you will have a suddenly enlightened perspective.

The difference between this article and other articles is that this article is written according to my current thinking. The specific why can be found in the previous articles~

**Connecting the source code from the perspective of CMD, starting from the beginning:**

Whether it is sealer or sealctl, they are inseparable from the image building core》buildah:

```go
package main

import (
"github.com/containers/buildah"

"github.com/labring/sealos/cmd/sealctl/cmd"
)

func main() {
if buildah.InitReexec() {
return
}
cmd.Execute()
}
```

Starting from `InitReexec` calling buildah initialization, proceed to the door of sealos: `Execute`

In cobra, `Execute` will only be executed once, regardless of whether it is correct or failed~

When calling, the `init` initialization function will be executed first, which defines some initialization work and flags:

```go
func init() {
cobra.OnInitialize(func() {
logger.CfgConsoleLogger(debug, showPath)
})

rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "enable debug logger")
rootCmd.PersistentFlags().BoolVar(&showPath, "show-path", false, "enable show code path")
}
```

Haha, sealos is very pleasantly surprised by the packaging of the log package. It uses `zap` for secondary development and packaging to suit my own business needs. This is a reference for me, including horizon, which may be possible in the future. Improvements need to be made in the log package and error code design. This is a necessary condition for an excellent open source project~

Later, the flag was bound to `rootCmd`, which is the root command of our `sealos`:

```go
// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
Use: "sealos",
Short: "sealos is a Kubernetes distribution, a unified OS to manage cloud native applications.",
}
```

As the most important command of sealos to achieve Kubernetes cluster, let’s try `sealos run`

+ [Use sealos to quickly build HA cluster](https://docker.nsddd.top/Cloud-Native-k8s/6.html)

```bash
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
      --masters 192.168.0.2,192.168.0.3\
      --nodes 192.168.0.4 -p [your-ssh-passwd]
```

Fortunately, compared to sealer, sealos implements most of the run.go logic in pkg, which makes it not look so bloated. However, for sealos' architecture, there is no cluster-runtime as a Abstraction layer, so the dependence on sealos is too serious. This is also the idea that I must solve when designing the k3s runtime.



## Principle implementation

A simple naming of run is highly abstract: when we run, cmd will pass `applier, err := apply.NewApplierFromArgs(images, runArgs)` to `NewApplierFromArgs`

```go
func NewApplierFromArgs(imageName []string, args *RunArgs) (applydrivers.Interface, error) {
clusterPath := constants.Clusterfile(args.ClusterName)
cf := clusterfile.NewClusterFile(clusterPath,
clusterfile.WithCustomConfigFiles(args.CustomConfigFiles),
clusterfile.WithCustomEnvs(args.CustomEnv),
)
err := cf.Process()
if err != nil && err != clusterfile.ErrClusterFileNotExists {
return nil, err
}
if err = cf.SetSingleMode(args.Single); err != nil {
return nil, err
}

cluster := cf.GetCluster()
if cluster == nil {
logger.Debug("creating new cluster")
cluster = initCluster(args.ClusterName)
} else {
cluster = cluster.DeepCopy()
}
c := &ClusterArgs{
clusterName: cluster.Name,
cluster: cluster,
}
if err = c.runArgs(imageName, args); err != nil {
return nil, err
}
return applydrivers.NewDefaultApplier(c.cluster, cf, imageName)
}
```

`NewApplierFromArgs` is used to create an `Applier` instance object. It receives two parameters: one is the image name array `imageName`, and the other is the running parameters args. In this function, it obtains `ClusterName` from the parameter, and then obtains the corresponding `ClusterFile` based on `ClusterName`. If it cannot be obtained, it creates a new one. Then, it updates the spec in the cluster status Cluster based on the parameters entered by the user, and finally creates an Applier object and returns it through the Cluster object and ClusterFile object.



## Applier

First, Sealos will create an Applier structure, which is responsible for the core logic of deploying the cluster.

```go
func NewDefaultApplier(cluster *v2.Cluster, cf clusterfile.Interface, images []string) (Interface, error) {
if cluster.Name == "" {
return nil, fmt.Errorf("cluster name cannot be empty")
}
if cf == nil {
cf = clusterfile.NewClusterFile(constants.Clusterfile(cluster.Name))
}
err := cf.Process()
if !cluster.CreationTimestamp.IsZero() && err != nil {
return nil, err
}

return &Applier{
ClusterDesired: cluster,
ClusterFile: cf,
ClusterCurrent: cf.GetCluster(),
RunNewImages: images,
}, nil
}
```

The `NewDefaultApplier` function is used to create an `Applier` instance object. It receives three parameters:

+ One is a `Cluster` object
+ One is a `ClusterFile` object
+ There is also an array of image names `images`

In this function, it obtains the cluster name from the parameter, and then obtains the corresponding `ClusterFile` based on the cluster name. If it does not exist, an error is returned. Then, it updates the `Spec` in the cluster state `ClusterDesired` based on the parameters entered by the user, and finally creates an `Applier` object and returns it through the `ClusterDesired` object and the `ClusterFile` object.

**Specific steps are as follows:**

1. Determine whether the cluster name is empty. If it is empty, an error will be returned.
2. Determine whether `ClusterFile` is empty, and if it is empty, create a new `ClusterFile`.
3. If the creation timestamp of `ClusterDesired` is empty and `ClusterCurrent` is `nil` or the creation timestamp of `ClusterCurrent` is empty, a new cluster is initialized and the creation timestamp of `ClusterDesired` is set to the current time. .
4. If the creation timestamps of both `ClusterDesired` and `ClusterCurrent` are not empty, update the `Spec` in the cluster state `ClusterDesired`.

`Applier` adopts the **declarative** design concept of k8s. The user declares a desired cluster state, and Applier is responsible for converting the current state of the cluster into the state expected by the user.



## Applier struct

```go
type Applier struct {
     ClusterDesired *v2.Cluster // The cluster state expected by the user
     ClusterCurrent *v2.Cluster // Current status of the cluster
     ClusterFile clusterfile.Interface // Current cluster interface
     Client kubernetes.Client
     CurrentClusterInfo *version.Info
     RunNewImages []string // Image name added by run command
}
```

`clusterfile.Interface` is an interface type, which is implemented in Sealos through `ClusterFile`. Therefore, the most important types in the `Applier` structure are the two types `Cluster` and `ClusterFile`, which define the status and configuration of the cluster.

1. ClusterDesired: The cluster state expected by the user
2. ClusterCurrent: Current status of the cluster
3. ClusterFile: Current cluster interface
4. Client: Kubernetes client
5. CurrentClusterInfo: current information of the cluster
6. RunNewImages: Image name added by run command



## Dig into the Cluster structure of the cluster

```go
type Cluster struct{
     metav1.TypeMeta `json:",inline"`
     metav1.ObjectMeta `json:"metadata,omitempty"`

     Spec ClusterSpec `json:"spec,omitempty"`
     Status ClusterStatus `json:"status,omitempty"`
}
typeClusterSpec struct {
     Image ImageList `json:"image,omitempty"`
     SSH SSH `json:"ssh"`
     Hosts []Host `json:"hosts,omitempty"`
     Env []string `json:"env,omitempty"`
     Command []string `json:"command,omitempty"`
}
typeClusterStatus struct {
     Phase ClusterPhase `json:"phase,omitempty"`
     Mounts []MountImage `json:"mounts,omitempty"`
     Conditions []ClusterCondition `json:"conditions,omitempty" `
}
```

The content of Cluster is designed according to the format of K8s Resource. You can see that the structures are split out instead of using nested structures, which is more standardized and tidy. In ClusterSpec, a series of parameters for deploying K8s clusters are defined, such as images, SSH parameters, nodes, etc.

In ClusterStatus, `Phase` defines the status of the current cluster, `Mounts` defines the mirror used by the cluster, and `Conditions` saves a series of events that occur in the cluster.



##ClusterFile

`ClusterFile` is the object actually operated by `Applier` and the content persisted to the file. This contains the current status information of all clusters, as well as `kubeconfig`. The kubeconfig here is not the config file we usually use when operating k8s, but a series of configuration items needed to build a cluster. When using `kubeadm`, these configuration items often require us to configure them manually, but Sealos will automatically fill them in for us here and apply them to the cluster. It can be seen that `Cluster` is more like an instance of `ClusterFile`, recording the real-time status of the cluster.

```go
typeInterface interface {
PreProcessor
GetCluster() *v2.Cluster
GetConfigs() []v2.Config
GetKubeadmConfig() *runtime.KubeadmConfig
}
```



## Create Applier

Logic for creating Applier:

The `buildah mount` command is a tool used to mount container images on the local file system. Through this command, you can easily view and edit files in the container image. For specific usage, please refer to [Official Document](https://buildah.io/commands/mount/).

![Untitled](http://sm.nsddd.top/sm202304152156333.png)

**Creating an `Applier` will go through the following steps:**

1. Determine whether `ClusterFile` already exists. If it exists, read it directly to build the cluster state `Cluster`. Otherwise, initialization creates an empty cluster state `Cluster`.
2. Update the spec in the cluster status `Cluster` according to the user's parameters this time. At this time, `Cluster` is the target cluster state.
3. Build the `ClusterFile` from the file again as the current state and objects of the cluster.
4. Construct the `Applier` structure and return it.

At this time we return to the logic of run:

```go
RunE: func(cmd *cobra.Command, args []string) error {
if runSingle {
addr, _ := iputils.ListLocalHostAddrs()
runArgs.Masters = iputils.LocalIP(addr)
runArgs.Single = true
}

images, err := args2Images(args, transport)
if err != nil {
return err
}

applier, err := apply.NewApplierFromArgs(images, runArgs)
if err != nil {
return err
}
return applier.Apply()
},
```

`applier` is the constructed structure: the purpose of building `applier` is to transform the current state of the cluster into the state expected by the user. By initializing an `Applier`, you can update the spec in the cluster status `Cluster` according to the user's current parameters, and finally build an `Applier` structure. This structure can convert the cluster state expected by the user into the actual cluster state, realizing the declarative design idea of K8s. Next comes the `Apply()` operation.



## Start Apply

Next, through `Applier.Apply()`, Sealos begins to formally deploy the cluster to bring the cluster status closer to the target. First, Sealos will set the status of the current cluster to `ClusterInProcess`. Next, enter two branches depending on whether the cluster is created or updated.

> There is one thing that needs to be explained here. During a previous interview, the interviewer asked me about the logic implemented by `apply` and `create`. The logical difference between these two implementations is that obviously, create does not control the controller. The observation and analysis stages are directly executed and updated. This is in line with the imperative characteristics rather than the declarative characteristics.

```go
func (c *Applier) Apply() error {
clusterPath := constants.Clusterfile(c.ClusterDesired.Name)
// clusterErr and appErr should not appear in the same time
var clusterErr, appErr error
// save cluster to file after apply
defer func() {
switch clusterErr.(type) {
case *processor.CheckError, *processor.PreProcessError:
return
}
logger.Debug("write cluster file to local storage: %s", clusterPath)
saveErr := yaml.MarshalYamlToFile(clusterPath, c.getWriteBackObjects()...)
if saveErr != nil {
logger.Error("write cluster file to local storage: %s error, %s", clusterPath, saveErr)
logger.Debug("complete write back file: \n %v", c.getWriteBackObjects())
}
}()
c.initStatus()
if c.ClusterDesired.CreationTimestamp.IsZero() && (c.ClusterCurrent == nil || c.ClusterCurrent.CreationTimestamp.IsZero()) {
clusterErr = c.initCluster()
c.ClusterDesired.CreationTimestamp = metav1.Now()
} else {
clusterErr, appErr = c.reconcileCluster()
c.ClusterDesired.CreationTimestamp = c.ClusterCurrent.CreationTimestamp
}
c.updateStatus(clusterErr, appErr)

// return app error if not nil
if appErr != nil && !errors.Is(appErr, processor.ErrCancelled) {
return appErr
}
return clusterErr
}
```

The `Apply()` function is the core function in Sealos responsible for deploying the cluster. This function determines whether the cluster already exists by passing the `ClusterDesired` and `ClusterCurrent` values of the `Applier` instance. When the function is executed, the current cluster status will first be set to `ClusterInProcess`, and then `initCluster()` and `reconcileCluster()` will be called respectively to **create and update the cluster**. Finally, the function will update the status of the cluster (or APP) based on the values of `appErr` and `clusterErr`. Because as mentioned above, `EXECUTE` will only be executed once, whether right or wrong, so only one cluster or app can exist.



Why `c.initStatus()` is needed:

The function of initStatus function is to initialize the cluster status, that is, to assign an initial value to the Status field in the cluster status Cluster: Set Phase to ClusterInProcess, and if Conditions is empty, create an empty array.

```go
func (c *Applier) initStatus() {
c.ClusterDesired.Status.Phase = v2.ClusterInProcess
if c.ClusterDesired.Status.Conditions == nil {
c.ClusterDesired.Status.Conditions = make([]v2.ClusterCondition, 0)
}
}
```

The function implementation is very simple. First set `Phase` to `ClusterInProcess`, indicating that the cluster is being deployed. Then, determine whether `Conditions` is empty. If it is empty, set `Conditions` to an empty array.

This code is to determine whether the cluster already exists. The specific explanation is as follows:

+ `c.ClusterDesired.CreationTimestamp.IsZero()` determines whether the `CreationTimestamp` of the desired state is empty. If it is empty, it means that the cluster does not exist or has not been created yet.
+ `(c.ClusterCurrent == nil || c.ClusterCurrent.CreationTimestamp.IsZero())` Determine whether the current state of `ClusterCurrent` is empty or whether `CreationTimestamp` is empty. If it is empty, it means that the cluster does not exist or is still there. Not created.

If the above two conditions are met, it means that the cluster has not been created yet and you can call `initCluster()` function to create a new cluster. Otherwise, the cluster already exists and the `reconcileCluster()` function can be called to update the cluster.

The function of `yaml.MarshalYamlToFile` is to serialize one or more objects into YAML format and write the serialized string to the specified file. In Sealos, `yaml.MarshalYamlToFile` is used to serialize a `ClusterFile` object into YAML format and write it to the specified file. This file is used to persist the state of the cluster.

The `initCluster()` function creates a cluster from scratch and uses the `CreateProcessor` object to deploy the cluster in the desired state. The `CreateProcessor.Execute()` function receives the desired cluster status `ClusterDesired`, and then executes a series of pipelines to officially enter the actual cluster deployment process.

```go
func (c *InstallProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
var todoList []func(cluster *v2.Cluster) error
todoList = append(todoList,
c.SyncStatusAndCheck,
c.ConfirmOverrideApps,
c.PreProcess,
c.RunConfig,
c.MountRootfs,
c.MirrorRegistry,
c.UpgradeIfNeed,
// i.GetPhasePluginFunc(plugin.PhasePreGuest),
c.RunGuest,
c.PostProcess,
// i.GetPhasePluginFunc(plugin.PhasePostInstall),
)
return todoList, nil
}
```

In Sealos, `CreateProcessor` and `InstallProcessor` are two different Processors, used to create clusters and install clusters respectively. They implement the `processor.Processor` interface, which defines the basic methods required to perform cluster deployment. Each Processor contains a series of Pipelines, and each Pipeline contains a series of functions, which are used to perform specific deployment operations.

In `CreateProcessor`, the `GetPipeLine()` function returns a list containing the Pipeline required to create the cluster. This list includes some basic operations, such as checking whether the cluster already exists, running configuration, checking and mounting rootfs, starting bootstrap, etc. These operations will be executed in sequence, and finally the cluster creation process is completed.

In `InstallProcessor`, the `GetPipeLine()` function returns a list containing the Pipeline required to install the cluster. This list contains operations similar to creating a cluster, but also includes additional operations such as upgrades, running guests, post-processing, etc. These operations will be performed sequentially to finally complete the cluster installation process.

From a functional point of view, `CreateProcessor` is more focused on creating a cluster, while `InstallProcessor` is more focused on installing a cluster. In fact, in Sealos, there is not much difference between the two Processors, they both contain the same Pipeline and operations. The only difference is that they are used in different scenarios.

`pipeline` is mainly divided into the following steps:

1. Check: Check the host of the cluster, including whether the IP can be accessed, whether the host is a Linux system, whether the user is root, etc.

2. PreProcess: Responsible for image preprocessing operations before cluster deployment, mainly using the `image.Manager` object to process images. Here, the image will be pulled, format checked, and mounted to rootfs.

3. RunConfig: Export the `working container` in the cluster status into a configuration in yaml format and persist it to the host's file system.

    ```go
    func (c *InstallProcessor) RunConfig(_ *v2.Cluster) error {
    if len(c.NewMounts) == 0 {
    return nil
    }
    eg, _ := errgroup.WithContext(context.Background())
    for _, cManifest := range c.NewMounts {
    manifest := cManifest
    eg.Go(func() error {
    cfg := config.NewConfiguration(manifest.ImageName, manifest.MountPoint, c.ClusterFile.GetConfigs())
    return cfg.Dump()
    })
    }
    return eg.Wait()
    }
    ```

    The function of `RunConfig` is to export the `working container` in the cluster status into a configuration in yaml format and persist it to the host's file system. When the function is executed, the configuration of the `working container` will be exported into a Config object, and then the `config.Dump()` function will be used to serialize the Config object into YAML format and write it to the specified file. In Sealos, the `RunConfig` function is mainly used to generate configuration files for Kubernetes clusters. These configuration files are used to persist the state of the cluster.

    `rootfs → Clusterfile`

    ```go
    func (c *Dumper) Dump() error {
    if len(c.Configs) == 0 {
    logger.Debug("clusterfile config is empty!")
    return nil
    }
   
    if err := c.WriteFiles(); err != nil {
    return fmt.Errorf("failed to write config files %v", err)
    }
    return nil
    }
   
    func (c *Dumper) WriteFiles() (err error) {
    for _, config := range c.Configs {
    if config.Spec.Match != "" && config.Spec.Match != c.name {
    continue
    }
    configData := []byte(config.Spec.Data)
    configPath := filepath.Join(c.RootPath, config.Spec.Path)
    //only the YAML format is supported
    switch config.Spec.Strategy {
    case v1beta1.Merge:
    configData, err = getMergeConfigData(configPath, configData)
    if err != nil {
    return err
    }
    case v1beta1.Insert:
    configData, err = getAppendOrInsertConfigData(configPath, configData, true)
    if err != nil {
    return err
    }
    case v1beta1.Append:
    configData, err = getAppendOrInsertConfigData(configPath, configData, false)
    if err != nil {
    return err
    }
    case v1beta1.Override:
    }
    err = file.WriteFile(configPath, configData)
    if err != nil {
    return fmt.Errorf("write config file failed %v", err)
    }
    }
   
    return nil
    }
    ```

    The `Dump()` function is a method for writing cluster configuration to a file. The function first checks if the configuration is empty. If not empty, it will call the `WriteFiles()` method, which will write files for each profile. If no error occurred, `nil` is returned. If an error occurs, an error is returned.

    The `WriteFiles()` method is the actual way to write the cluster configuration to a file. This method iterates through all configurations and checks for the one that matches the current name. If a matching configuration is found, the data from that configuration is used to write it to a file. Before writing to the file, you also need to check the policy in the configuration and handle it accordingly. Finally, the method will return `nil` or an error.

    ```go
    const (
    Merge StrategyType = "merge"
    Override StrategyType = "override"
    Insert StrategyType = "insert"
    Append StrategyType = "append"
    )
    ```

    These constants define enumeration values of type `StrategyType` that specify the strategy to use when updating the configuration file. Among them, `Merge` means merging the new configuration into the old configuration, `Override` means using the new configuration to overwrite the old configuration, `Insert` means inserting the new configuration into the specified location of the old configuration file, and `Append` means appending the new configuration to The end of the old configuration file.

4. `MountRootfs`: Distribute the mounted image contents to each machine according to categories. Here we need to introduce the image structure of sealos, taking the most basic k8s image as an example:

```
labring/kubernetes
    - etc # Configuration items
    - scripts # scripts
        - init-containerd.sh
        - init-kube.sh
        -init-shim.sh
        - init-registry.sh
        - init.sh
    - Kubefile # dockerfile syntax, which defines the execution logic of the image
```

> This process is very important for us to make k3s images. I will explain this step in detail in the next title. Maybe we should understand this step well~



## mount

The above part is the base image of mount, and you can see that `init.sh` is the first to be executed. At this time, `init` will be used to initialize some kubeadm and kubectl things. We also know in learning Kubernetes that some initialization problems of Kubernetes cannot be deployed using containerization, because kubeadm deals with containers and hosts.

The image structure of Sealos contains the addons folder, which stores some additional components, such as dashboard and metrics-server. In the MountRootfs step, the addons type init.sh script will be executed to install the components in the addons into the cluster.

K8s serves as the foundation of the entire cluster. Although the directory structure in the final image is consistent with others, its construction process is slightly different. In CI, we can see that the k8s image actually merges multiple folders, containerd, rootfs and registry. These separate folders contain scripts that install the corresponding components. In the MountRootfs step, only the init.sh scripts of rootfs and addons types will be executed. This is also easy to understand, because so far, Sealos has only successfully installed kubelet on each machine, and the entire k8s cluster is not yet available.

First pass a constructor:

```go
func (f *defaultRootfs) MountRootfs(cluster *v2.Cluster, hosts []string) error {
return f.mountRootfs(cluster, hosts)
}
```

Although I don’t know what the use of this is, it can be regarded as implementing the structure method:

```go
func (f *defaultRootfs) mountRootfs(cluster *v2.Cluster, ipList []string) error {
target := constants.NewData(f.getClusterName(cluster)).RootFSPath()
ctx := context.Background()
eg, _ := errgroup.WithContext(ctx)
envProcessor := env.NewEnvProcessor(cluster, f.mounts)
for _, mount := range f.mounts {
src := mount
eg.Go(func() error {
if !file.IsExist(src.MountPoint) {
logger.Debug("Image %s not exist, render env continue", src.ImageName)
return nil
}
// TODO: if we are planning to support rendering templates for each host,
// then move this rendering process before ssh.CopyDir and do it one by one.
err := renderTemplatesWithEnv(src.MountPoint, ipList, envProcessor)
if err != nil {
return fmt.Errorf("failed to render env: %w", err)
}
dirs, err := file.StatDir(src.MountPoint, true)
if err != nil {
return fmt.Errorf("failed to stat files: %w", err)
}
if len(dirs) != 0 {
_, err = exec.RunBashCmd(fmt.Sprintf(constants.DefaultChmodBash, src.MountPoint))
if err != nil {
return fmt.Errorf("run chmod to rootfs failed: %w", err)
}
}
return nil
})
}
if err := eg.Wait(); err != nil {
return err
}

sshClient := f.getSSH(cluster)
notRegistryDirFilter := func(entry fs.DirEntry) bool { return !constants.IsRegistryDir(entry) }

for idx := range ipList {
ip := ipList[idx]
eg.Go(func() error {
egg, _ := errgroup.WithContext(ctx)
for idj := range f.mounts {
mount := f.mounts[idj]
egg.Go(func() error {
switch mount.Type {
case v2.RootfsImage, v2.PatchImage:
logger.Debug("send mount image, ip: %s, image name: %s, image type: %s", ip, mount.ImageName, mount.Type)
err := ssh.CopyDir(sshClient, ip, mount.MountPoint, target, notRegistryDirFilter)
if err != nil {
return fmt.Errorf("failed to copy %s %s: %v", mount.Type, mount.Name, err)
}
}
return nil
})
}
return egg.Wait()
})
}
err := eg.Wait()
if err != nil {
return err
}

endEg, _ := errgroup.WithContext(ctx)
master0 := cluster.GetMaster0IPAndPort()
for idx := range f.mounts {
mountInfo := f.mounts[idx]
endEg.Go(func() error {
if mountInfo.Type == v2.AppImage {
logger.Debug("send app mount images, ip: %s, image name: %s, image type: %s", master0, mountInfo.ImageName, mountInfo.Type)
err = ssh.CopyDir(sshClient, master0, mountInfo.MountPoint, constants.GetAppWorkDir(cluster.Name, mountInfo.Name), notRegistryDirFilter)
if err != nil {
return fmt.Errorf("failed to copy %s %s: %v", mountInfo.Type, mountInfo.Name, err)
}
}
return nil
})
}
return endEg.Wait()
}
```

The `mountRootfs` function is a core function in Sealos. It is mainly used to distribute the mounted image contents to each machine according to categories. The steps in this function are divided into the following parts:

1. **Environment variable processing**: This function processes environment variables based on the incoming cluster and mount point information. Specifically, it creates an `envProcessor` object, which contains cluster information and mount point information for processing environment variables.
2. Traverse mount points: This function will traverse all mount points and perform the following operations on each mount point:
    1. Determine whether the mount point exists. If it does not exist, the mount point is skipped directly.
    2. Render environment variables. This function injects environment variables into the mount point. Specifically, it calls the `renderTemplatesWithEnv` function, which injects environment variables into the template files in the mount point.
    3. Modify directory permissions. If the mount point contains a subdirectory, its permissions will be changed to the default permissions. Specifically, it calls the `exec.RunBashCmd` function, which executes the `chmod` command to change the permissions of all directories in the mount point to the default permissions.
3. **Copy image to each node**: This function will copy the image folder to each node. Specifically, it will traverse each node, and for each node, it will traverse each mount point and copy the mirror folder in the mount point to the node. Specifically, it calls the `ssh.CopyDir` function, which copies the image folder from the mount point to the node via SSH.
4. **Copy the application image to the primary node**: If the application image exists, copy it to the primary node. Specifically, it iterates through each mount point and, if the mount point's type is an application image type, copies it to the master node. Specifically, it calls the `ssh.CopyDir` function, which copies the application image folder to the master node via SSH.



## MirrorRegistry and Bootstrap steps

### MirrorRegistry

Of course, there are two more stages in the step to init:

```
c.MirrorRegistry,
c.Bootstrap,
```

The `MirrorRegistry` stage is an important step in Sealos deployment of the cluster. In this step, Sealos will pull the required Docker image from the public image repository locally and push it to the local Docker image repository. The purpose of this step is to cache the Docker image locally to avoid frequent downloading of the image during the cluster deployment process, thereby speeding up the cluster deployment. The `MirrorRegistry` phase is usually executed after the `MountRootfs` phase.

**This step is equivalent to the core logic of sealos. The core logic of image processing can be regarded as a black technology. It is to pull the images in the remote docker registery to localhost and then cache them. The cached files can be used later. **



### Bootstrap

The `Bootstrap` phase is the last phase of Sealos deploying the cluster. During this stage, Sealos will start the Kubernetes initialization program to initialize the cluster. During the initialization process, Sealos uses the kubeadm tool to create the control plane and nodes of the Kubernetes cluster, start various Kubernetes components, and configure them to function properly. When the initialization procedure completes successfully, the Kubernetes cluster is ready for normal use. The `Bootstrap` phase is usually executed after the `MountRootfs` and `MirrorRegistry` phases.

```go
func (c *CreateProcessor) Bootstrap(cluster *v2.Cluster) error {
logger.Info("Executing pipeline Bootstrap in CreateProcessor")
hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
bs := bootstrap.New(cluster)
return bs.Apply(hosts...)
}
```

The main function of this function is to create a bootstrap instance and call its Apply function. Among them, cluster represents the configuration information of the Kubernetes cluster, and hosts contains the IP addresses and port numbers of all nodes in the cluster.Next, take a look at the `bootstrap.New` function in Sealos. Its code is as follows:

```go
func New(cluster *v2.Cluster) Interface {
ctx := NewContextFrom(cluster)
bs := &realBootstrap{
ctx: ctx,
preflights: make([]Applier, 0),
initializers: make([]Applier, 0),
postflights: make([]Applier, 0),
}
// register builtin appliers
_ = bs.RegisterApplier(Preflight, defaultPreflights...)
_ = bs.RegisterApplier(Init, defaultInitializers...)
_ = bs.RegisterApplier(Postflight, defaultPostflights...)
return bs
}
```

The main function of this function is to create a bootstrap instance and initialize the values of its fields. Among them, cluster represents the configuration information of the Kubernetes cluster, ctx represents the context information, `preflights`, `initializers`, and `postflights` represent the list of pre-check, initialization, and post-processing functions respectively. In addition, this function will also call the `RegisterApplier` function to register the default pre-check, initialization, and post-processing functions.



### RegisterApplier function

Next, take a look at the RegisterApplier function in Sealos. Its code is as follows:

```go
func (bs *realBootstrap) RegisterApplier(phase Phase, appliers ...Applier) error {
phase switch {
case Preflight:
bs.preflights = append(bs.preflights, appliers...)
case Init:
bs.initializers = append(bs.initializers, appliers...)
case Postflight:
bs.postflights = append(bs.postflights, appliers...)
default:
return fmt.Errorf("unknown phase %s", phase)
}
return nil
}
```

The main function of this function is to register pre-check, initialization, and post-processing functions. Among them, phase represents the type of function, and appsliers represents the function list. This function will add the function list to the corresponding list depending on the phase.



### Apply function

Finally, take a look at the Apply function in Sealos. Its code is as follows:

```go
func (bs *realBootstrap) Apply(hosts ...string) error {
appliers := make([]Applier, 0)
appliers = append(appliers, bs.preflights...)
appliers = append(appliers, bs.initializers...)
appliers = append(appliers, bs.postflights...)
logger.Debug("apply %+v on hosts %+v", appliers, hosts)
for i := range appliers {
applier := appliers[i]
if err := runParallel(hosts, func(host string) error {
if !applier.Filter(bs.ctx, host) {
return nil
}
logger.Debug("apply %s on host %s", applier, host)
return applier.Apply(bs.ctx, host)
}); err != nil {
return err
}
}
return nil
}
```

The main function of this function is to execute pre-check, initialization, and post-processing functions in sequence. Among them, `hosts` represents the list of nodes to execute the function, and `appliers` represents the list of functions to be executed. This function will add pre-check, initialization, and post-processing functions to the `appliers` list respectively, and execute them in order. During execution, the `Filter` function will be called to determine whether the function needs to be executed on the node. If execution is required, the `Apply` function is called to execute the function. Finally, if an error occurs during execution, the function will return error information.

By analyzing the `Bootstrap` stage code of `Sealos`, we understand its calling process and the functions of each function. In this phase, `Sealos` will start the Kubernetes initialization program and initialize the cluster so that the Kubernetes cluster can be used normally. At the same time, this stage will also perform pre-check, initialization, and post-processing functions to ensure the normal operation of the cluster.

> Here you may refer to a process of Linux kernel startup. bootfs in Linux will start a Kernel Boot Process to guide the startup of the kernel. After startup, the boot will be destroyed and the life cycle will end.



## init phase

Init: Initialize the k8s cluster. In this step, a series of sub-operations are actually performed. First, the cluster status is written to the cluster file.

### **initCluster**

`initCluster` is responsible for creating a cluster from scratch. The function will use `CreateProcessor` to deploy the cluster in the desired state.

```go
typeCreateProcessor struct {
     ClusterFile clusterfile.Interface // Current cluster object
     ImageManager types.ImageService // Process images
     ClusterManager types.ClusterService //Manage clusterfile
     RegistryManager types.RegistryService //Manage image registry
     Runtime runtime.Interface // kubeadm object
     Guest guest.Interface // sealos-based application object
}
```

`CreateProcessor.Execute` receives the desired cluster state `ClusterDesired`.

```bash
func (c *CreateProcessor) Execute(cluster *v2.Cluster) error {
pipeLine, err := c.GetPipeLine()
if err != nil {
return err
}
for _, f := range pipeLine {
if err = f(cluster); err != nil {
return err
}
}

return nil
}

func (c *CreateProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
var todoList []func(cluster *v2.Cluster) error
todoList = append(todoList,
// c.GetPhasePluginFunc(plugin.PhaseOriginally),
c.Check,
c.PreProcess,
c.RunConfig,
c.MountRootfs,
c.MirrorRegistry,
c.Bootstrap,
// c.GetPhasePluginFunc(plugin.PhasePreInit),
c.Init,
c.Join,
// c.GetPhasePluginFunc(plugin.PhasePreGuest),
c.RunGuest,
// c.GetPhasePluginFunc(plugin.PhasePostInstall),
)
return todoList, nil
}
```

+ To facilitate understanding, the sealer picture is stolen here

   ![sdUntitled](http://sm.nsddd.top/sm202304152338621.png)

Next, a series of pipelines will be executed to officially enter the actual cluster deployment process:

1. Check: Check the host of the cluster
2. PreProcess: Responsible for image preprocessing operations before cluster deployment. Here, each Manager in `CreateProcessor` will be used.
3. Pull the image
4. Check the image format
5. Use `buildah` to create a working container from the OCI format image and mount the container to rootfs
6. Add the container’s manifest to the cluster status
7. RunConfig: Export the working container in the cluster status into a configuration in yaml format and persist it to the host's file system
8. MountRootfs: Distribute the mounted image content to each machine according to the category, in the order of `rootfs`, `addons`, and `app`. Here we need to introduce the general structure of the sealos image, taking the most basic k8s image as an example:

K8s serves as the foundation of the entire cluster. Although the directory structure in the final image is consistent with others, its construction process is slightly different. In CI **https://github.com/labring/cluster-image/blob/faca63809e7a3eae512100a1eb8f9b7384973175/.github/scripts/kubernetes.sh#L35**, we can see that the k8s image is actually merged with cluster-image Multiple folders under the warehouse, `containerd`, `rootfs` and `registry`. These separate folders contain scripts that install the corresponding components. After Sealos mounts an image, it will first execute the `init.sh` script. For example, the following script for the k8s image executes `init-containerd.sh` to install containerd, `init-shim.sh` to install image-cri-shim and `init-kube.sh` to install kubelet respectively.

```bash
source common.sh
REGISTRY_DOMAIN=${1:-sealos.hub}
REGISTRY_PORT=${2:-5000}

#Install containerd
chmod a+x init-containerd.sh
bash init-containerd.sh ${REGISTRY_DOMAIN} ${REGISTRY_PORT}

if [ $? != 0 ]; then
    error "====init containerd failed!===="
fi

chmod a+x init-shim.sh
bash init-shim.sh

if [ $? != 0 ];then
    error "====init image-cri-shim failed!===="
fi

chmod a+x init-kube.sh
bash init-kube.sh

logger "init containerd rootfs success"
```

In the MountRootfs step, only the `init.sh` scripts of the `rootfs` and `addons` types will be executed. This is also easy to understand, because so far, Sealos has only successfully installed kubelet on each machine, and the entire k8s cluster is not yet available.

1. Init: Initialize the k8s cluster. In this step, a series of sub-operations are actually performed.
2. Sealos will load the configuration of `kubeadm` from `ClusterFile` and then copy it to master0.
3. Generate certificates and k8s configuration files based on the hostname of master0, such as `admin.conf`, `controller-manager.conf`, `scheduler.conf`, `kubelet.conf`.
4. Sealos copies these configurations and static files in rootfs (mainly some policy configurations) to master0.
5. Sealos links the registry in rootfs to the host directory through link, and then executes the script `init-registry.sh` to start the registry daemon.
6. Last but not least, initialize master0. First, add the domain name of the registry and the domain name of the api server (the IP is the IP of master0) to the master0 host. Then, call `kubeadm init` to create the k8s cluster. Finally, copy the generated administrator kubeconfig to `.kube/config`.
7. Join: Use kubeadm to join the remaining masters and nodes to the existing cluster, and then update `ClusterFile`. At this point, the entire k8s cluster has been set up.
8. RunGuest: Run the CMD of all images of type `app` and install all applications.

At this point, a k8s cluster and all applications based on this cluster have been installed.



## controller

+ [https://github.com/labring/sealos/tree/main/controllers](https://github.com/labring/sealos/tree/main/controllers)

If we talk about the core part of sealos, I think it is the implementation of the controller. [controllers](https://github.com/labring/sealos/tree/main/controllers) The controller is used to manage the cluster (k8s has some built-in Functions `pod` and deployment can also be extended by controllers):

controllers use a new feature of Go language 1.8+: workspace

> These functions are all functions that `k8s` does not have ~

1. We run many servers and manage them through `infra`

2. `metering` is used to measure how many resources we have used

3. `terminal` is the terminal application on the desktop
4. `user` is user management, because `cloud.sealos` is a multi-tenant cluster
5. `app`: Responsible for managing all applications created by users, including creating, deleting, updating, viewing application status, and deploying applications.
6. `cluster`: Responsible for managing Kubernetes clusters, including creating, deleting, updating, viewing the status of the cluster, and deploying the cluster.
7. `imagehub`: Responsible for managing the image warehouse, including creating, deleting, updating, viewing the status of the image warehouse, and deploying the image warehouse.

I think this is the core part of sealos.