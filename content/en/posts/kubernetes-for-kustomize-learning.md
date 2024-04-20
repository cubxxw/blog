---
title: 'Kubernetes for Kustomize Learning'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2023-10-31T21:30:19+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - Kubernetes
  - Kustomize
categories:
  - Development
description: >
  Explore the power of Kustomize, an open-source configuration management tool for Kubernetes.
  Learn how to customize Kubernetes objects and manage configurations declaratively using Kustomize.
  Understand the integration with kubectl and Helm, and discover best practices for Kubernetes configuration management.
---


## Introduction

**About Kustomize**

+ [GitHub Repository](https://github.com/kubernetes-sigs/kustomize)
+ [Get Started](https://kubectl.docs.kubernetes.io/zh/installation/)

Kustomize is an open-source configuration management tool designed specifically for Kubernetes. It helps users customize Kubernetes objects and manage them declaratively without modifying the original [YAML files](https://devopscube.com/kustomize-tutorial/). This means you can retain the basic settings for applications and components while overriding default settings with declarative YAML documents called "patches" without altering the original files. Kustomize provides a declarative approach that aligns with Kubernetes philosophy and allows customization of Kubernetes configurations in a reusable, fast, debuggable, and scalable manner.

**Key Features of Kustomize:**

+ **Declarative Configuration:** Allows you to define and manage Kubernetes objects declaratively, such as deployments, DaemonSets, services, ConfigMaps, etc., to support multiple environments without modifying the original YAML files.
+ **Configuration Layering:** Preserves the basic settings of applications and components by leveraging layering and selectively overrides default settings using declarative YAML documents (patches).
+ **Integration and Standalone Usage:** Kustomize can be used as a standalone tool or in combination with kubectl. Starting from Kubernetes version 1.14, kubectl also supports managing Kubernetes objects using kustomization files.

Kustomize provides a solution for customizing Kubernetes resource configurations without the need for templates and DSLs.

## Version Compatibility & kubectl Integration

To find the version of Kustomize embedded in the latest kubectl version, run `kubectl version`:

```
$ kubectl version --short --client
Client Version: v1.26.0
Kustomize Version: v4.5.7
```

Kustomize builds in kubectl were frozen at v2.0.3 until kubectl v1.21 updated to v4.0.5. It will receive periodic updates reflected in Kubernetes release notes.

| Kubectl version | Kustomize version |
| --------------- | ----------------- |
| < v1.14         | n/a               |
| v1.14-v1.20     | v2.0.3 v2.03      |
| v1.21           | v4.0.5 V4.05      |
| v1.22           | v4.2.0 v4.2 0     |
| v1.23           | v4.4.1 V4.1       |
| v1.24           | v4.5.4            |
| v1.25           | v4.5.7            |
| v1.26           | v4.5.7            |
| v1.27           | v5.0.1            |

## Installation

**Install Kustomize CLI from Source Code without Cloning the Repository**

For `go version` ≥ `go1.17`:

```
GOBIN=$(pwd)/ GO111MODULE=on go install sigs.k8s.io/kustomize/kustomize/v5@latest
```

> **Note:** In addition to using the `kustomize` command directly, you can also use `kubectl kustomize` to execute Kustomize, starting from Kubernetes v1.14.

## kubectl Resources

### Annotations

Annotations allow you to update one or more resources with additional metadata. Kubernetes annotations provide extra data for resources. Unlike labels, annotations are not used for selecting and finding resources. Annotations can store a significant amount of data, such as a detailed description, timestamps for checks, contact information, or other information provided by tools and libraries.

**What Are Annotations?**

Annotations are a way to attach non-identifying metadata to objects. Client tools and libraries, like `kubectl` and Helm, can retrieve this metadata.

**Difference Between Annotations and Labels**

While both annotations and labels are used to attach metadata, they serve different purposes:

+ **Labels:** Labels are used to select objects and form collections of objects based on certain criteria.
+ **Annotations:** Annotations are primarily used to store auxiliary data for retrieval by tools and libraries.

**Adding and Modifying Annotations with `kubectl`**

To add annotations to a resource using `kubectl`, you can use the `annotate` command. For example:

```
kubectl annotate pods my-pod example.com/some-annotation="some value"
```

This adds an annotation named `example.com/some-annotation` with a value of "some value" to the Pod named `my-pod`.

**Updating and Deleting Annotations**

You can use the same `annotate` command to modify or delete annotations. To change the value of an existing annotation, simply run the same command again with a new value. To delete an annotation, use the `-` symbol:

```bash
kubectl annotate pods my-pod example.com/some-annotation-
```

**Querying Resources Using Annotations**

While you cannot directly query specific annotation values with `kubectl`, you can use the `kubectl get` command with the `-o json` or `-o yaml` output format options to view all annotations for a resource:

```bash
kubectl get pods my-pod -o=jsonpath='{.metadata.annotations}'
```

## Kustomize Usage

In a directory containing YAML resource files (e.g., deployments, services, ConfigMaps), create a `kustomization.yaml` file.

Kustomize can be used in conjunction with Helm, and here are some ways and features of using them together:

1. **HelmChartInflationGenerator:** Kustomize has a built-in feature called "HelmChartInflationGenerator," which allows you to use Helm charts in Kustomize manifests. When running the Kustomize command, it expands Helm charts to include all files generated by Helm.
2. **HelmCharts Plugin:** You can directly use HelmCharts as plugins within Kustomize. For example, you can place a `values-prod.yaml` file in the same directory as `kustomization.yaml` and override default values from the Helm chart.
3. **helm template and kubectl kustomize:** You can first use the `helm template` command to generate manifests and export them to a file, then use the `kubectl kustomize` command to apply Kustomize modifications. Another approach is to use `helm install` (or `helm upgrade --install`) with a custom post-renderer to run `kubectl kustomize`.
4. **Overriding Helm Charts:** Kustomize can override existing Helm charts and provide custom `nginx.conf` and homepages, for example, using the `HelmChartInflationGenerator` to override a set of custom values.

This file should declare these resources, as well as any customizations applied to them, e.g. Add a common label.

```
base: kustomization + resources
```

File structure: File structure:

> ````bash
> ~/someApp
> ├── deployment.yaml
> ├── kustomization.yaml
> └── service.yaml
> ```
>
> The resources in this directory may be branches configured by others. If this is the case, you can easily base from the source material to obtain improvements, since you are not modifying the resource directly.

Generate custom YAML:

```bash
kustomize build ~/someApp
```

YAML can be applied directly to the cluster:

```bash
kustomize build ~/someApp | kubectl apply -f -
```

The difference between **and helm:**

Kustomize has no template syntax and only needs a binary command to generate the corresponding yaml file, which is very lightweight. However, helm supports GoTemplate and has more components. Moreover, helm publishes through the chart package, which is relatively heavyweight. . Personally, I think Kustomize is more suitable for gitops and helm is more suitable for application package distribution.

Of course, we will discuss the difference with helm in detail later.



###kustomization.yml

A common `kustomization.yml` is as follows, generally containing two fixed fields `apiVsersion` and `kind`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
- manager.yaml

configMapGenerator:
- files:
   - controller_manager_config.yaml
   name: manager-config
```

kustomize provides a relatively rich field selection. In addition, you can also customize plug-ins. The meaning of each field will be briefly listed below. When we need to use it, we will know that there is such a capability, and then go to [Kustomize official documentation ](https://kubectl.docs.kubernetes.io/zh/guides/) Just look for the corresponding API documentation

+ `resources` represents the location of k8s resources. This can be a file or point to a folder. When reading, it will be read in order. The path can be a relative path or an absolute path. If it is a relative path, then it is Path relative to `kustomization.yml`
+ `crds` is similar to `resources`, except that `crds` is our customized resource
+ `namespace` adds namespace to all resources
+ `images` Modify image name, tag or image digest without using patches
+ `replicas` Modify the number of resource copies
+ `namePrefix` adds a prefix to the names of all resources and references
+ `nameSuffix` adds a suffix to the names of all resources and references
+ `patches` adds or overrides fields on resources, Kustomization uses the `patches` field to provide this functionality.
+ Each entry in the `patchesJson6902` list should be parsable into a kubernetes object and a [JSON patch](https://tools.ietf.org/html/rfc6902) that will be applied to that object.
+ `patchesStrategicMerge` uses strategic merge patch standard Patch resources.
+ `vars` is similar to specifying variables
+ `commonAnnotations` adds `annotations` to all resources. If the corresponding key already has a value, this value will be overwritten.

```yaml
commonAnnotations:
   app.lailin.xyz/inject: agent

resources:
- deploy.yaml
```

`commonLabels` adds labels and label selectors to all resources **Note: This operation will be more dangerous**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

commonLabels:
   app: bingo
```

+ `configMapGenerator` can generate config map, each item in the list will generate a configmap
+ `secretGenerator` is used to generate secret resources
+ `generatorOptions` is used to control the behavior of `configMapGenerator` and `secretGenerator`



### Comments Transformer

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```
commonAnnotations:
   oncallPager: 800-555-1212
```

Each entry in this list creates a ConfigMap resource (which is a generator of n maps).

The following example creates three ConfigMap. One is the name and content of a given file, one is the keys/values as data, and the third is setting comments and labels for a single ConfigMap via `options`.

Each MapGenerator item accepts one parameter `behavior: [create|replace|merge]` . This allows the overlay to modify or replace an existing CNOMAP from the parent.

Additionally, each entry has an `options` field that has the same subfields as the `generatorOptions` field of the kustomization file.

The `options` field allows adding labels and/or comments to the generated instance, or individually disabling name suffix hashing for the instance. Labels and annotations added here will not be overridden by global options associated with the kustomization file's `generatorOptions` field. However, due to the way boolean values behave, if the global `generatorOptions` field specifies `disableNameSuffixHash: true` , this will trump any local attempts to override it.

```yaml
# These labels are added to all configmaps and secrets.
generatorOptions:
   labels:
     fruit: apple

configMapGenerator:
- name: my-java-server-props
   behavior: merge
   files:
   -application.properties
   - more.properties
- name: my-java-server-env-vars
   literals:
   - JAVA_HOME=/opt/java/jdk
   - JAVA_TOOL_OPTIONS=-agentlib:hprof
   options:
     disableNameSuffixHash: true
     labels:
       pet: dog
- name: dashboards
   files:
   - mydashboard.json
   options:
     annotations:
       dashboard: "1"
     labels:
       app.kubernetes.io/name: "app1"
```

It is also possible to define a key to set a name different from the file name.

The following example creates a ConfigMap with a filename of `myFileName.ini` , while the actual file name of the ConfigMap created is `whatever.ini` .

```yaml
configMapGenerator:
- name: app-whatever
   files:
   - myFileName.ini=whatever.ini
```



### ImageTagTransformer

Image modifies the image's name, tags, and/or summary without creating a patch. For example, given this kubernetes Deployment snippet:

```yaml
containers:
- name: mypostgresdb
   image: postgres:8
- name: nginxapp
   image: nginx:1.7.9
- name: myapp
   image: my-demo-app:latest
- name: alpine-app
   image:alpine:3.7
```

`image` can be changed via:

+ `postgres:8` to `my-registry/my-postgres:v1`,
+ nginx tag `1.7.9` to `1.8.0`,
+ image name `my-demo-app` to `my-app`,
+ alpine tag `3.7` to summary value



All of these have the following kustomization:

```yaml
images:
- name: postgres
   newName: my-registry/my-postgres
   newTag: v1
- name: nginx
   newTag: 1.8.0
- name: my-demo-app
   newName: my-app
- name: alpine
   digest: sha256:24a0c4b4a4c0eb97a1aabb8e29f18e917d05abfe1b7a7c07857230879ce7d3d3
```



### *Comment Transformer*

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```bash
commonAnnotations:
   oncallPager: 800-555-1212
```



### Used via the `transformers` field

In Kustomize, the `transformers` field allows you to specify a series of transformers that can modify and adjust the original resource manifest.

To use `transformers` with Kustomize, you need to specify it in the `kustomization.yaml` file and list the path to the transformer configuration file you want to use.

For example:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
-deployment.yaml

transformers:
- transformers/add-labels.yaml
- transformers/change-image-tag.yaml
```

In the above example, `add-labels.yaml` and `change-image-tag.yaml` will be applied as converters, which in turn modify the resources in `deployment.yaml`.

```yaml
apiVersion: builtin
kind: ImageTagTransformer
metadata:
   name: not-important-to-example
imageTag:
   name: nginx
   newTag: v2
```



### LabelTransformer

Add tags to all resources and selectors

```yaml
comThis file should declare these resources, as well as any customizations applied to them, e.g. Add a common label.

```
base: kustomization + resources
```

File structure: File structure:

> ````bash
> ~/someApp
> ├── deployment.yaml
> ├── kustomization.yaml
> └── service.yaml
> ```
>
> The resources in this directory may be branches configured by others. If this is the case, you can easily base from the source material to obtain improvements, since you are not modifying the resource directly.

Generate custom YAML:

```bash
kustomize build ~/someApp
```

YAML can be applied directly to the cluster:

```bash
kustomize build ~/someApp | kubectl apply -f -
```

The difference between **and helm:**

Kustomize has no template syntax and only needs a binary command to generate the corresponding yaml file, which is very lightweight. However, helm supports GoTemplate and has more components. Moreover, helm publishes through the chart package, which is relatively heavyweight. . Personally, I think Kustomize is more suitable for gitops and helm is more suitable for application package distribution.

Of course, we will discuss the difference with helm in detail later.



###kustomization.yml

A common `kustomization.yml` is as follows, generally containing two fixed fields `apiVsersion` and `kind`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
- manager.yaml

configMapGenerator:
- files:
   - controller_manager_config.yaml
   name: manager-config
```

kustomize provides a relatively rich field selection. In addition, you can also customize plug-ins. The meaning of each field will be briefly listed below. When we need to use it, we will know that there is such a capability, and then go to [Kustomize official documentation ](https://kubectl.docs.kubernetes.io/zh/guides/) Just look for the corresponding API documentation

+ `resources` represents the location of k8s resources. This can be a file or point to a folder. When reading, it will be read in order. The path can be a relative path or an absolute path. If it is a relative path, then it is Path relative to `kustomization.yml`
+ `crds` is similar to `resources`, except that `crds` is our customized resource
+ `namespace` adds namespace to all resources
+ `images` Modify image name, tag or image digest without using patches
+ `replicas` Modify the number of resource copies
+ `namePrefix` adds a prefix to the names of all resources and references
+ `nameSuffix` adds a suffix to the names of all resources and references
+ `patches` adds or overrides fields on resources, Kustomization uses the `patches` field to provide this functionality.
+ Each entry in the `patchesJson6902` list should be parsable into a kubernetes object and a [JSON patch](https://tools.ietf.org/html/rfc6902) that will be applied to that object.
+ `patchesStrategicMerge` uses strategic merge patch standard Patch resources.
+ `vars` is similar to specifying variables
+ `commonAnnotations` adds `annotations` to all resources. If the corresponding key already has a value, this value will be overwritten.

```yaml
commonAnnotations:
   app.lailin.xyz/inject: agent

resources:
- deploy.yaml
```

`commonLabels` adds labels and label selectors to all resources **Note: This operation will be more dangerous**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

commonLabels:
   app: bingo
```

+ `configMapGenerator` can generate config map, each item in the list will generate a configmap
+ `secretGenerator` is used to generate secret resources
+ `generatorOptions` is used to control the behavior of `configMapGenerator` and `secretGenerator`



### Comments Transformer

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```
commonAnnotations:
   oncallPager: 800-555-1212
```

Each entry in this list creates a ConfigMap resource (which is a generator of n maps).

The following example creates three ConfigMap. One is the name and content of a given file, one is the keys/values as data, and the third is setting comments and labels for a single ConfigMap via `options`.

Each MapGenerator item accepts one parameter `behavior: [create|replace|merge]` . This allows the overlay to modify or replace an existing CNOMAP from the parent.

Additionally, each entry has an `options` field that has the same subfields as the `generatorOptions` field of the kustomization file.

The `options` field allows adding labels and/or comments to the generated instance, or individually disabling name suffix hashing for the instance. Labels and annotations added here will not be overridden by global options associated with the kustomization file's `generatorOptions` field. However, due to the way boolean values behave, if the global `generatorOptions` field specifies `disableNameSuffixHash: true` , this will trump any local attempts to override it.

```yaml
# These labels are added to all configmaps and secrets.
generatorOptions:
   labels:
     fruit: apple

configMapGenerator:
- name: my-java-server-props
   behavior: merge
   files:
   -application.properties
   - more.properties
- name: my-java-server-env-vars
   literals:
   - JAVA_HOME=/opt/java/jdk
   - JAVA_TOOL_OPTIONS=-agentlib:hprof
   options:
     disableNameSuffixHash: true
     labels:
       pet: dog
- name: dashboards
   files:
   - mydashboard.json
   options:
     annotations:
       dashboard: "1"
     labels:
       app.kubernetes.io/name: "app1"
```

It is also possible to define a key to set a name different from the file name.

The following example creates a ConfigMap with a filename of `myFileName.ini` , while the actual file name of the ConfigMap created is `whatever.ini` .

```yaml
configMapGenerator:
- name: app-whatever
   files:
   - myFileName.ini=whatever.ini
```



### ImageTagTransformer

Image modifies the image's name, tags, and/or summary without creating a patch. For example, given this kubernetes Deployment snippet:

```yaml
containers:
- name: mypostgresdb
   image: postgres:8
- name: nginxapp
   image: nginx:1.7.9
- name: myapp
   image: my-demo-app:latest
- name: alpine-app
   image:alpine:3.7
```

`image` can be changed via:

+ `postgres:8` to `my-registry/my-postgres:v1`,
+ nginx tag `1.7.9` to `1.8.0`,
+ image name `my-demo-app` to `my-app`,
+ alpine tag `3.7` to summary value



All of these have the following kustomization:

```yaml
images:
- name: postgres
   newName: my-registry/my-postgres
   newTag: v1
- name: nginx
   newTag: 1.8.0
- name: my-demo-app
   newName: my-app
- name: alpine
   digest: sha256:24a0c4b4a4c0eb97a1aabb8e29f18e917d05abfe1b7a7c07857230879ce7d3d3
```



### *Comment Transformer*

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```bash
commonAnnotations:
   oncallPager: 800-555-1212
```



### Used via the `transformers` field

In Kustomize, the `transformers` field allows you to specify a series of transformers that can modify and adjust the original resource manifest.

To use `transformers` with Kustomize, you need to specify it in the `kustomization.yaml` file and list the path to the transformer configuration file you want to use.

For example:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
-deployment.yaml

transformers:
- transformers/add-labels.yaml
- transformers/change-image-tag.yaml
```

In the above example, `add-labels.yaml` and `change-image-tag.yaml` will be applied as converters, which in turn modify the resources in `deployment.yaml`.

```yaml
apiVersion: builtin
kind: ImageTagTransformer
metadata:
   name: not-important-to-example
imageTag:
   name: nginx
   newTag: v2
```



### LabelTransformer

Add tags to all resources and selectors

```yaml
comThis file should declare these resources, as well as any customizations applied to them, e.g. Add a common label.

```
base: kustomization + resources
```

File structure: File structure:

> ````bash
> ~/someApp
> ├── deployment.yaml
> ├── kustomization.yaml
> └── service.yaml
> ```
>
> The resources in this directory may be branches configured by others. If this is the case, you can easily base from the source material to obtain improvements, since you are not modifying the resource directly.

Generate custom YAML:

```bash
kustomize build ~/someApp
```

YAML can be applied directly to the cluster:

```bash
kustomize build ~/someApp | kubectl apply -f -
```

The difference between **and helm:**

Kustomize has no template syntax and only needs a binary command to generate the corresponding yaml file, which is very lightweight. However, helm supports GoTemplate and has more components. Moreover, helm publishes through the chart package, which is relatively heavyweight. . Personally, I think Kustomize is more suitable for gitops and helm is more suitable for application package distribution.

Of course, we will discuss the difference with helm in detail later.



###kustomization.yml

A common `kustomization.yml` is as follows, generally containing two fixed fields `apiVsersion` and `kind`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
- manager.yaml

configMapGenerator:
- files:
   - controller_manager_config.yaml
   name: manager-config
```

kustomize provides a relatively rich field selection. In addition, you can also customize plug-ins. The meaning of each field will be briefly listed below. When we need to use it, we will know that there is such a capability, and then go to [Kustomize official documentation ](https://kubectl.docs.kubernetes.io/zh/guides/) Just look for the corresponding API documentation

+ `resources` represents the location of k8s resources. This can be a file or point to a folder. When reading, it will be read in order. The path can be a relative path or an absolute path. If it is a relative path, then it is Path relative to `kustomization.yml`
+ `crds` is similar to `resources`, except that `crds` is our customized resource
+ `namespace` adds namespace to all resources
+ `images` Modify image name, tag or image digest without using patches
+ `replicas` Modify the number of resource copies
+ `namePrefix` adds a prefix to the names of all resources and references
+ `nameSuffix` adds a suffix to the names of all resources and references
+ `patches` adds or overrides fields on resources, Kustomization uses the `patches` field to provide this functionality.
+ Each entry in the `patchesJson6902` list should be parsable into a kubernetes object and a [JSON patch](https://tools.ietf.org/html/rfc6902) that will be applied to that object.
+ `patchesStrategicMerge` uses strategic merge patch standard Patch resources.
+ `vars` is similar to specifying variables
+ `commonAnnotations` adds `annotations` to all resources. If the corresponding key already has a value, this value will be overwritten.

```yaml
commonAnnotations:
   app.lailin.xyz/inject: agent

resources:
- deploy.yaml
```

`commonLabels` adds labels and label selectors to all resources **Note: This operation will be more dangerous**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

commonLabels:
   app: bingo
```

+ `configMapGenerator` can generate config map, each item in the list will generate a configmap
+ `secretGenerator` is used to generate secret resources
+ `generatorOptions` is used to control the behavior of `configMapGenerator` and `secretGenerator`



### Comments Transformer

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```
commonAnnotations:
   oncallPager: 800-555-1212
```

Each entry in this list creates a ConfigMap resource (which is a generator of n maps).

The following example creates three ConfigMap. One is the name and content of a given file, one is the keys/values as data, and the third is setting comments and labels for a single ConfigMap via `options`.

Each MapGenerator item accepts one parameter `behavior: [create|replace|merge]` . This allows the overlay to modify or replace an existing CNOMAP from the parent.

Additionally, each entry has an `options` field that has the same subfields as the `generatorOptions` field of the kustomization file.

The `options` field allows adding labels and/or comments to the generated instance, or individually disabling name suffix hashing for the instance. Labels and annotations added here will not be overridden by global options associated with the kustomization file's `generatorOptions` field. However, due to the way boolean values behave, if the global `generatorOptions` field specifies `disableNameSuffixHash: true` , this will trump any local attempts to override it.

```yaml
# These labels are added to all configmaps and secrets.
generatorOptions:
   labels:
     fruit: apple

configMapGenerator:
- name: my-java-server-props
   behavior: merge
   files:
   -application.properties
   - more.properties
- name: my-java-server-env-vars
   literals:
   - JAVA_HOME=/opt/java/jdk
   - JAVA_TOOL_OPTIONS=-agentlib:hprof
   options:
     disableNameSuffixHash: true
     labels:
       pet: dog
- name: dashboards
   files:
   - mydashboard.json
   options:
     annotations:
       dashboard: "1"
     labels:
       app.kubernetes.io/name: "app1"
```

It is also possible to define a key to set a name different from the file name.

The following example creates a ConfigMap with a filename of `myFileName.ini` , while the actual file name of the ConfigMap created is `whatever.ini` .

```yaml
configMapGenerator:
- name: app-whatever
   files:
   - myFileName.ini=whatever.ini
```



### ImageTagTransformer

Image modifies the image's name, tags, and/or summary without creating a patch. For example, given this kubernetes Deployment snippet:

```yaml
containers:
- name: mypostgresdb
   image: postgres:8
- name: nginxapp
   image: nginx:1.7.9
- name: myapp
   image: my-demo-app:latest
- name: alpine-app
   image:alpine:3.7
```

`image` can be changed via:

+ `postgres:8` to `my-registry/my-postgres:v1`,
+ nginx tag `1.7.9` to `1.8.0`,
+ image name `my-demo-app` to `my-app`,
+ alpine tag `3.7` to summary value



All of these have the following kustomization:

```yaml
images:
- name: postgres
   newName: my-registry/my-postgres
   newTag: v1
- name: nginx
   newTag: 1.8.0
- name: my-demo-app
   newName: my-app
- name: alpine
   digest: sha256:24a0c4b4a4c0eb97a1aabb8e29f18e917d05abfe1b7a7c07857230879ce7d3d3
```



### *Comment Transformer*

Add annotations (non-identifying metadata) to all resources. Like tags, they are also key-value pairs.

```bash
commonAnnotations:
   oncallPager: 800-555-1212
```



### Used via the `transformers` field

In Kustomize, the `transformers` field allows you to specify a series of transformers that can modify and adjust the original resource manifest.

To use `transformers` with Kustomize, you need to specify it in the `kustomization.yaml` file and list the path to the transformer configuration file you want to use.

For example:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization

resources:
-deployment.yaml

transformers:
- transformers/add-labels.yaml
- transformers/change-image-tag.yaml
```

In the above example, `add-labels.yaml` and `change-image-tag.yaml` will be applied as converters, which in turn modify the resources in `deployment.yaml`.

```yaml
apiVersion: builtin
kind: ImageTagTransformer
metadata:
   name: not-important-to-example
imageTag:
   name: nginx
   newTag: v2
```



### LabelTransformer

Add tags to all resources and selectors

```yaml
commonLabels:
   someName: someValue
   owner: alice
   app: bingo
```



### NamespaceTransformer

Add namespace to all resources

```yaml
namespace: my-namespace
```



## Compare the use of helm

Helm uses templates. A Helm Chart package contains many templates and value files. When rendered, the variables in the template will be replaced with the corresponding values ​​in the value file. Kustomize uses a template-free approach, which patches and merges YAML files. In addition, Kustomize has also been natively built into kubectl. Both tools are widely used in the Kubernetes ecosystem, and they can also be used together. **

Yes, for OpenIM, it is actually difficult to meet the deployment requirements of OpenIM using helm alone. We prefer to use Kustomize.

We know that many projects actually provide Helm Chart packages for applications, and the values of template variables are controlled through value files. A long-standing problem is how we should customize the upstream Helm Chart package, such as adding or a Kubernetes resource list from the Helm Chart package. If it is a general change, the best choice is of course to contribute directly to the upstream repository, but if it is What about custom changes?

Usually we can fork the upstream Helm Chart repository ourselves, and then make additional changes to the Chart package in our own repo. But doing so will obviously bring extra burden, especially when the Chart package only needs a small change.

At this time we can use Kustomize to customize the existing Helm Chart without performing a fork operation.



### Kustomize plug-in learning

In Kustomize's GitHub repository, there are plugins that can be used to extend its functionality. Here is a brief introduction to these plugins:

1. **Exec plugin**: This plugin can run executable scripts as a [plugin](https://github.com/badjware/kustomize-plugins).
2. **RemoteResources Generator**: This plug-in can be downloaded from remote locations [Kubernetes resources](https://github.com/badjware/kustomize-plugins).
3. **PlaceholderTransformer**: This plugin can perform arbitrary key/value replacement in Kubernetes resources.
4. **SSMParameterPlaceholderTransformer**: This plugin can perform arbitrary key/value substitutions in Kubernetes resources and obtain values from AWS System Manager parameters.
5. **EnvironmentPlaceholderTransformer**: This plugin can perform arbitrary key/value replacements in Kubernetes resources and get values from environment variables.

Other relevant information is that users can create converter or generator plugins to implement new behaviors, which usually means writing code, such as Go plugins, Go binaries, C++ [binaries or Bash scripts, etc.](https:// /github.com/kubernetes-sigs/kustomize/blob/master/examples/configureBuiltinPlugin.md). As of March 2020, Kustomize's external plugins were still in alpha functionality, so the build needed to be invoked with the `--enable_alpha_plugins` flag.

At the same time, there are some other GitHub repositories that also provide a collection of Kustomize plug-ins, such as badjware/kustomize-plugins repository, sapcc/kustomize-plugins repository and pollination/kustomize-plugins repository. Some of these plug-ins can be used to generate Kubernetes secrets, from Generated in GCP's sealed secrets, etc.

These plugins allow users to extend Kustomize's functionality by writing code to meet specific needs, such as modifying Kubernetes resources by performing arbitrary key/value substitutions.



### ChartInflator

Kustomize provides a great plugin ecosystem that allows extending the functionality of Kustomize. Among them is a non-built-in plugin called **ChartInflator**, which allows Kustomize to render Helm Charts and perform any required changes.

**First install the `ChartInflator` plugin:**

```yaml
$ chartinflator_dir="./kustomize/plugin/kustomize.config.k8s.io/v1/chartinflator"

#Create plugin directory
$ mkdir -p ${chartinflator_dir}

# Download plugin
$ curl -L https://raw.githubusercontent.com/kubernetes-sigs/kustomize/kustomize/v3.8.2/plugin/someteam.example.com/v1/chartinflator/ChartInflator > ${chartinflator_dir}/ChartInflator

#Set plugin execution permissions
$ chmod u+x ${chartinflator_dir}/ChartInflator
```

For example, if we want to customize the **Vault Helm Chart** package, then create the ChartInflator resource list and Helm's `values.yaml` value file:

```yaml
# ChartInflator resource list
$ cat << EOF >> chartinflator-vault.yaml
apiVersion: kustomize.config.k8s.io/v1
kind: ChartInflator
metadata:
   name: vault-official-helm-chart
chartRepo: https://helm.releases.hashicorp.com
chartName: vault
chartRelease: hashicorp
chartVersion: 0.7.0
releaseName: vault
values: values.yaml
EOF

#Create values value file
$ helm repo add hashicorp https://helm.releases.hashicorp.com
$ helm show values --version 0.7.0 hashicorp/vault > values.yaml

#Create Kustomize file
$ kustomize init
$ cat << EOF >> kustomization.yaml
generators:
- chartinflator-vault.yaml
EOF

#Add a label label to all resources
$ kustomize edit add label env:dev

#The final generated kustomize file is as follows:
$ cat kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization
generators:
- chartinflator-vault.yaml
commonLabels:
   env: dev

# Entire resource list directory structure
$tree.
.
├── chartinflator-vault.yaml
├── kustomization.yaml
├── kustomize
│ └── plugin
│ └── kustomize.config.k8s.io
│ └── v1
│ └── chartinflator
│ └── ChartInflator
└── values.yaml

5 directories, 4 files
```

Now you can render the Chart template by executing the following command:

```javascript
$ kustomize build --enable_alpha_plugins .
```

After normal rendering is completed, we can see that an `env: dev` tag has been added to all resources. This is done in real time and does not require the maintenance of any additional files.



### Customize with a single manifest file

Another way to customize a Chart using Kustomize is to use the `helm template` command to generate a single resource list. This method allows more control over the Chart, but it requires more work to process and update the generated file. version control.

Usually we can use Make for auxiliary processing, as shown in the following example:

```javascript
#Makefile
CHART_REPO_NAME := hashicorp
CHART_REPO_URL := https://helm.releases.hashicorp.com
CHART_NAME := vault
CHART_VERSION := 0.7.0
CHART_VALUES_FILE := values.yaml

add-chart-repo:
     helm repo add ${CHART_REPO_NAME} ${CHART_REPO_URL}
     helm repo update

generate-chart-manifest:
     helm template ${CHART_NAME} ${CHART_REPO_NAME}/${CHART_NAME} \
         --version ${CHART_VERSION} \
         --values ${CHART_VALUES_FILE} > ${CHART_NAME}.yaml

get-chart-values:
     @helm show values --version ${CHART_VERSION} \
     ${CHART_REPO_NAME}/${CHART_NAME}

generate-chart-values:
     @echo "Create values file: ${CHART_VALUES_FILE}"
     @$(MAKE) -s get-chart-values > ${CHART_VALUES_FILE}

diff-chart-values:
     @echo "Diff: Local <==> Remote"
     @$(MAKE) -s get-chart-values | \
     diff --suppress-common-lines --side-by-side ${CHART_VALUES_FILE} - || \
     exit 0
```

To customize the upstream Vault Helm Chart, we can do the following:

```javascript
#Initialize chart file
$ make generate-chart-values generate-chart-manifest

# Create a Kustomize file and add a label label
$ kustomize init
$ kustomize edit add resource vault.yaml
$ kustomize edit add label env:dev

#The final generated file structure is as follows
$tree.
.
├── kustomization.yaml
├── makefile
├── values.yaml
└── vault.yaml

0 directories, 4 files

#kustomize The content of the file is as follows
$ cat kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
Kind: Kustomization
resources:
-vault.yaml
commonLabels:
   env: dev
```

Finally, also use the `kustomize build` command to render:

```javascript
$ kustomize build .
```

In the rendering results, you can also see that all resources have been added with an `env: dev` tag.

This approach requires running the make command in some way to generate the updated all-in-one resource manifest file, and it can be a bit cumbersome to integrate the update process with your GitOps workflow.



### Customize using Post Rendering

**Post Rendering** is a new feature brought by Helm 3. Among the previous two methods, Kustomize is the main tool used to generate chart lists, but here, Kustomize exists as an auxiliary tool for Helm. .

Let's take a look at how to use this method for customization:

```javascript
# Create a Kustomize file and add a label label
$ kustomize init
$ kustomize edit add label env:dev

# Create a script file that wraps Kustomize, which will be used later in Helm
$ cat << EOF > kustomize-wrapper.sh
#!/bin/bash
cat <&0 > chart.yaml
kustomize edit add resource chart.yaml
kustomize build . && rm chart.yaml
EOF
$ chmod +x kustomize-wrapper.sh
```

Then we can directly use Helm to render or install Chart:

```javascript
$ helm repo add hashicorp https://helm.releases.hashicorp.com
$ helm template vault hashicorp/vault --post-renderer ./kustomize-wrapper.sh
```

Under normal circumstances, we can also see that an `env:dev` tag is added to each resource file that is finally rendered.

This method requires the management of an additional script. The rest is basically the same as the first method, except that the Kustomize plug-in is not used, but the function of Helm itself is directly used to render the upstream Chart package.