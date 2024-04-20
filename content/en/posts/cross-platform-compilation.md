---
title: 'Cross Platform Compilation'
ShowRssButtonInSectionTermList: true
date: '2023-09-16T16:21:52+08:00'
draft: false
showtoc: true
tocopen: true
author: "Xinwei Xiong, Me"
keywords: ['Cross Platform Compilation', 'Go Programming Language', 'Build Process', 'Compatibility', 'Distribution']
tags: ['blog', 'en', 'golang']
categories: ['Development']
description: 'Learn how to efficiently compile Go programs for multiple platforms, ensuring compatibility and ease of distribution.'
---

## Preface

https://github.com/OpenIMSDK/Open-IM-Server/issues/432

Many places now have requirements for local adaptation of services. Generally, localized platforms provide an arm version of Linux cloud environment for us to deploy services, so it is necessary to build an arm version of the image.

## Build plan

In the above issue, we describe the general construction ideas and solution steps. Let's take a look at the construction plan. We take the most commonly used amd machine as an example to compile arm. For building the ARM version of the image, there are two ways:

1. Use docker build to build on the ARM machine;
2. Use docker buildx to perform cross-build on X86/AMD64 machine;

> **⚠️Note: **
>
> 1. There will be some unpredictable problems in the cross-building and cross-running methods. It is recommended that you consider cross-building under x86 for simple building steps (such as just downloading and decompressing the files of the corresponding architecture), and for complex ones (such as those that require compilation) Build directly on the arm machine;
> 2. Actual testing found that when using [qemu mode](https://github.com/multiarch/qemu-user-static) to run the arm version of the image under the x86 platform, simple commands can be executed successfully (such as arch) , when executing some complex programs (such as starting a Java virtual machine), there will be no response, so the verification of the image should be done on the arm machine as much as possible;
>
> **Test the second point above as follows:**
>
> + `docker run --rm --platform=linux/arm64 openjdk:8u212-jre-alpine arch` can output normally;
> + `docker run --rm --platform=linux/arm64 openjdk:8u212-jre-alpine java -version` will be **stuck**, and you need to use `docker stop` to stop the container before you can exit the container;

## Enable experimental features

> 💡 Note: buildx only supports docker19.03 and above docker versions

If you want to use buildx, you need to enable the experimental function of docker before it can be used. How to enable it:

Edit `/etc/docker/daemon.json` and add:

```jsx
{
     "experimental": true
}
```

Edit `~/.docker/config.json` to add:

```jsx
"experimental" : "enabled"
```

Restart Docker to take effect:

+ `sudo systemctl daemon-reload`
+ `sudo systemctl restart docker`

Confirm whether it is enabled:

+ `docker version -f'{{.Server.Experimental}}'`
+ If true is output, it means the opening is successful

In previous versions, to build Docker images that support multiple system architectures, you must use the `[$ docker manifest](notion://www.notion.so/docker_practice/image/manifest)` command to use a unified name.

In Docker 19.03+, you can use the `$ docker buildx build` command to build the image using `BuildKit`. This command supports the `--platform` parameter to build Docker images that support multiple system architectures at the same time, greatly simplifying the construction steps.

## Build using buildx

For detailed usage of buildx, please refer to: [Docker official document-Reference-buildx](https://docs.docker.com/engine/reference/commandline/buildx/?fileGuid=0l3NVKX0BgflYN3R)

### Create buildx builder

Use the docker buildx ls command to view existing builders

```bash
root@rbqntnwlflfxvigv:~# docker buildx ls
NAME/NODE DRIVER/ENDPOINT STATUS BUILDKIT PLATFORMS
default *docker
   default default running 20.10.24 linux/amd64, linux/386
```

Create and builder:

```bash
# Just select any one of the following creation commands that fits the situation.
# 1. Create without specifying any parameters
docker buildx create --use --name multiarch-builder
# 2. If you use docker buildx ls after creation and find that the arm architecture is not supported during the build, you can use --platform to explicitly specify the build type to be supported, such as the following command
docker buildx create --platform linux/arm64,linux/arm/v7,linux/arm/v6 --name multiarch-builder
# 3. If you need to access the private registry in buildx, you can use host mode and manually specify the configuration file to avoid being unable to access the local registry host during buildx.
docker buildx create --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 --driver-opt network=host --config=/Users/hanlyjiang/.docker/buildx-config.toml --use --name multiarch-builder
```

The buildx-config.toml configuration file is written similarly:

```bash
# <https://github.com/moby/buildkit/blob/master/docs/buildkitd.toml.md>
# registry configures a new Docker register used for cache import or output.
[registry."zh-registry.geostar.com.cn"]
   mirrors = ["zh-registry.geostar.com.cn"]
   http=true
   insecure=true
```

**Enable Builder**

```bash
#Initialize and activate
docker buildx inspect multiarch-builder --bootstrap
```

**Confirmed successfully**

```bash
# Use docker buildx ls to view
docker buildx ls
```

Docker does not support arm architecture images under Linux system architecture, so we can run a new container to support this feature. Docker desktop version does not require this setting (mac system).

+ Use QEMU emulation support in the kernel for multi-architecture image building

```bash
# Install emulator (for multi-platform image building)
$ docker run --rm --privileged tonistiigi/binfmt:latest --install all
```

Since Docker's default `builder` instance does not support specifying multiple `--platform` at the same time, we must first create a new `builder` instance. At the same time, because pulling images in China is slow, we can use the configured [image acceleration address](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fmoby%2Fbuildkit%2Fblob%2Fmaster %2Fdocs%2Fbuildkitd.toml.md) `[dockerpracticesig/buildkit:master](<https://github.com/docker-practice/buildx>)` image replaces the official image

```
# Suitable for domestic environment
root@i-3uavns2y:~# docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master

# Applicable to Tencent Cloud environment (Tencent Cloud Host, coding.net continuous integration)
root@i-3uavns2y:~# docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master-tencent
# Use default image
root@i-3uavns2y:~# docker buildx create --name mybuilder --driver docker-container

# Use the newly created builder instance
root@i-3uavns2y:~# docker buildx use mybuilder
```

View existing builder instances

```go
root@i-tpmja312:~# docker buildx ls
NAME/NODE DRIVER/ENDPOINT STATUS PLATFORMS
mybuilder *docker-container
   mybuilder0 unix:///var/run/docker.sock inactivedefault docker
   default default running linux/amd64, linux/386
```

Construct:

```yaml
docker buildx build --platform linux/amd64,linux/arm/v6,linux/arm/v7,linux/arm64/v8,linux/386,linux/ppc64le,linux/s390x -t kubecub/hello . --push
```

### Modify Dockerfile

To modify the Dockerfile, you generally need to perform the following operations:

1. Confirm whether the base image (FROM) has an arm version. If so, you don’t need to change it. If not, you need to find an alternative image. If there is no alternative image, you may need to compile it yourself;
2. Confirm whether any of the steps in the dockerfile depends on the CPU architecture. If so, it needs to be replaced with the arm architecture. For example, when building the jitis image, add an amd64 architecture software to the Dockerfile.

```
ADD <https://github.com/just-containers/s6-overlay/releases/download/v1.21.4.0/s6-overlay-amd64.tar.gz> /tmp/s6-overlay.tar.gz
```

At this time, it needs to be replaced with the following address (note that amd64 is replaced with aarch64. Of course, you need to first confirm whether there is a gz package of the corresponding architecture in the download address. You cannot simply replace characters):

```
ADD <https://github.com/just-containers/s6-overlay/releases/download/v1.21.4.0/s6-overlay-aarch64.tar.gz> /tmp/s6-overlay.tar.gz
```

Of course, we need to confirm that the software has an archive package of this architecture. If not, we need to consider downloading it from the source code.Construct;

> Tips:
>
> How to determine the corresponding execution architecture of an executable file `/so` library? You can view it through `file {executable file path}`,
>
> As shown below when executing the file command on macOS, you can find that the git program on macOS is compatible with two architectures - `x86_64&arm64e`:
>
> ```
> file $(which git)
> /usr/bin/git: Mach-O universal binary with 2 architectures: [x86_64:Mach-O 64-bit executable x86_64] [arm64e:Mach-O 64-bit executable arm64e]
> /usr/bin/git (for architecture x86_64): Mach-O 64-bit executable x86_64
> /usr/bin/git (for architecture arm64e): Mach-O 64-bit executable arm64e
> ```
>
> The following command executes file on a so file, and you can see the architecture information `ARM aarch64`:
>
> ```
> file /lib/aarch64-linux-gnu/libpthread-2.23.so
> /lib/aarch64-linux-gnu/libpthread-2.23.so: ELF 64-bit LSB shared object, ARM aarch64, version 1 (GNU/Linux), dynamically linked, interpreter /lib/ld-linux-aarch64.so. 1, BuildID[sha1]=880365ebb22114e4c10108b73243144d5fa315dc, for GNU/Linux 3.7.0, not stripped
> ```

### docker buildx command to build arm64 image

Use --platform to specify the architecture, and use `--push` or `--load` to specify the action after the build is completed.

```
docker buildx build --platform=linux/arm64,linux/amd64 -t xxxx:tag . --push
```

> Tip: When specifying multiple architectures, you can only use --push to push to the remote warehouse, and cannot use `--load`. After the push is successful, you can use `docker pull --platform` to pull the image of the specified architecture.

### Check build results

1. Check the image information through the `docker buildx imagetools inspect` command to see if there is corresponding arm architecture information;
2. Actually run the image and confirm that it runs normally; (executed on the arm machine)

> Tip: If an error similar to `exec format error` is output during runtime, it means that the architecture of some executable files in the image does not match.

## Run arm image on x86

You can refer to [github/qemu-user-static](https://github.com/multiarch/qemu-user-static), a brief description is as follows:

+ Execute the following command to install:

   `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes`

+ Then you can run the arm version of the image, such as:

   ```
   docker run --rm -t arm64v8/fedora uname -m
   ```

## Use Buildx to build cross-platform images and run arm applications under the x86 platform

We demonstrated a simple construction method,

### Install qemu multi-platform support

Run the following containers:

```
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

This container will install qemu multi-platform support for your device, which will also be used if you need to run cross-platform containers.

### Create a new builder instance and set it as default

```
docker buildx create --use --name mybuilder
```

Seeing the output `mybuilder` means the creation is successful. Using the `--use` command will automatically set it as the default when the builder instance is created. Otherwise, you need to manually use `docker buildx use mybuilder` to set the created instance as the default.

### Use Buildx to build multi-platform images

The use of Buildx is very similar to docker build. Basically, you only need to replace `docker build` in the command with `docker buildx build`. If you use `docker buildx install` to replace the default docker build with Buildx, then use `docker build` directly.

For example, to package the Dockerfile file in the current directory into an image, you need to use the following command:

```
docker buildx build -t xxx/xxx:tag . --push
```

If you replace the default docker build, it will look like this:

```
docker build -t xxx/xxx:tag . --push
```

The `-push` command will automatically push the built image to the remote warehouse, otherwise it will only be stored in the cache.

If you want to build a multi-platform image, just add `--platform=` to the command. After the equal sign, fill in the platform that needs to be built, such as `linux/arm`, `linux/arm64`, `linux/amd64`, etc., use `,` separated. The Dockerfile itself does not need to be changed unless the operations you need to do are different on different platforms, such as downloading different files depending on the platform.

```docker
docker buildx build --platform=linux/arm,linux/arm64,linux/amd64 -t xxx/xxx:tag . --push
```

Buildx will automatically build images for the three platforms based on the above instructions and push them to the remote end. These three images will use the same tag specified in the command.

It should be noted that the specified platform must be supported by the underlying image.

Seven builds are supported natively:

```yaml
docker buildx build --platform linux/amd64,linux/arm/v6,linux/arm/v7,linux/arm64/v8,linux/386,linux/ppc64le,linux/s390x -t doubledong/hello . --push
```

See more detailed instructions in [Docker Documents](https://docs.docker.com/buildx/working-with-buildx/).

## Use GitHub Action to automatically build multi-platform images

Since DockerHub's automatic build tool is not friendly to multi-platform support, it is recommended to use GitHub Action to build. The specific yaml files are as follows:

```yaml
name: docker build and push

on:
   release:
     branches: [main]
     types: released
     # This process will be automatically run when the release of the main branch is released
   workflow_dispatch:
     # A run workflow button will be created on the GitHub Action interface, and the process will be executed after clicking it.
jobs:
   build:
     runs-on: ubuntu-latest

     steps:
       - name: Checkout
         uses: actions/checkout@v2

       - name: Get the tag name
         run: echo "TAG=${GITHUB_REF/refs\\/tags\\//}" >> $GITHUB_ENV
         # Get the release tag, which will be used when creating the image
       - name: Setup QEMU
         uses: docker/setup-qemu-action@v1

       - name: Docker Setup Buildx
         uses: docker/setup-buildx-action@v1.3.0
         # Enable Buildx
       - name: Login
         uses: docker/login-action@v1
         with:
           username: ${{ secrets.DOCKERHUB_USERNAME }}
           password: ${{ secrets.DOCKERHUB_TOKEN }}
             # Log in to the DockerHub account for pushing images. The secrets here need to be added on the warehouse settings page.
       - name: Build and Push with Version Tag
         uses: docker/build-push-action@v2
         with:
           context: .
           platforms: linux/amd64,linux/arm64,linux/arm
           push: true
           tags: xxx/abc:${{ env.TAG }}
           # Use the Dockerfile in the root directory of the warehouse to build images for the three platforms and push them to the xxx/abc warehouse, using the tags obtained previously.
```

### Strategies for running containers across platforms

We know how to compile across platforms, so what is the strategy for pulling images?

Generally speaking. By default, the docker pull command will only pull the image that is consistent with the current platform. To pull the image of other platforms, use –platform to specify the corresponding platform.

Similarly, when using docker run to run a container, you also need to use –platform to specify the platform.

If you use docker-compose to manage containers, you need to add a directive similar to `platform: linux/arm` at the same level of the image to specify the platform. If there are other platform images with the same tag locally, you need to use `docker-compose pull` to pull the image of the required platform

### Case Demonstration

Suppose there is a simple golang program source code:

```yaml
❯ cat hello.go
/****************************************************** ************************
    > File Name: hello.go
    > Author: smile
    > Mail: 3293172751nss@gmail.com
    > Created Time: Sun Jun 11 12:37:18 2023
*************************************************** ************************/
package main

import (
         "fmt"
         "runtime"
)

func main() {
         fmt.Printf("Hello, %s!\\n", runtime.GOARCH)
}
```

Create aDockerfile to containerize the application:

```yaml
❯ cat Dockerfile
FROM golang:alpine AS builder
RUN mkdir /app
ADD ./app/
WORKDIR/app
RUN go build -o hello .

FROM alpine
RUN mkdir /app
WORKDIR/app
COPY --from=builder /app/hello .
CMD ["./hello"]
```

This is a multi-stage build Dockerfile that uses the Go compiler to build the application and copies the built binaries into the alpine image.

Now you can use buildx to build a Docker image that supports arm, arm64 and amd64 multi-architecture, and push it to **Docker Hub**:

```yaml
→ docker buildx build -t cubxxw/hello-arch --platform=linux/arm,linux/arm64,linux/amd64 . --push
```

> You need to log in and authenticate Docker Hub through the docker login command in advance.

Now you can pull the newly created image through `docker pull mirailabs/hello-arch`. Docker will pull the matching image according to your CPU architecture.

The principle behind it is also very simple. As mentioned before, buildx will build 3 different images for 3 different CPU architectures (arm, arm64 and amd64) through `QEMU` and `binfmt_misc` respectively. After the build is completed, a **manifest** will be created, which contains pointers to these 3 images.

Now you can pull the newly created image through `docker pull mirailabs/hello-arch`. Docker will pull the matching image according to your CPU architecture.

The principle behind it is also very simple. As mentioned before, buildx will build 3 different images for 3 different CPU architectures (arm, arm64 and amd64) through `QEMU` and `binfmt_misc` respectively. After the build is completed, a **manifest list** will be created, which contains pointers to these 3 images.

**Save locally:**

If you want to save the built image locally, you can specify `type` as `docker`, but you must build different images for different CPU architectures separately and cannot be merged into one image, that is:

```yaml
→ docker buildx build -t cubxxw/hello-arch --platform=linux/arm -o type=docker .
→ docker buildx build -t cubxxw/hello-arch --platform=linux/arm64 -o type=docker .
→ docker buildx build -t cubxxw/hello-arch --platform=linux/amd64 -o type=docker .
```

### Testing multi-platform images

Since `binfmt_misc` has been enabled before, we can now run the Docker image of any CPU architecture, so we can test the 3 previously generated images on the local system for problems.

First list the `digests` of each image:

```yaml
? → docker buildx imagetools inspect cubxxw/hello-arch

Name: docker.io/cubxxw/hello-arch:latest
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest: sha256:ec55f5ece9a12db0c6c367acda8fd1214f50ee502902f97b72f7bff268ebc35a

Manifests:
   Name: docker.io/cubxxw/hello-arch:latest@sha256:38e083870044cfde7f23a2eec91e307ec645282e76fd0356a29b32122b11c639
   MediaType: application/vnd.docker.distribution.manifest.v2+json
   Platform: linux/arm/v7

   Name: docker.io/cubxxw/hello-arch:latest@sha256:de273a2a3ce92a5dc1e6f2d796bb85a81fe1a61f82c4caaf08efed9cf05af66d
   MediaType: application/vnd.docker.distribution.manifest.v2+json
   Platform: linux/arm64

   Name: docker.io/cubxxw/hello-arch:latest@sha256:8b735708d7d30e9cd6eb993449b1047b7229e53fbcebe940217cb36194e9e3a2
   MediaType: application/vnd.docker.distribution.manifest.v2+json
   Platform: linux/amd64
```

Run each image and observe the output:

```yaml
? → docker run --rm docker.io/cubxxw/hello-arch:latest@sha256:38e083870044cfde7f23a2eec91e307ec645282e76fd0356a29b32122b11c639
Hello, arm!

? → docker run --rm docker.io/cubxxw/hello-arch:latest@sha256:de273a2a3ce92a5dc1e6f2d796bb85a81fe1a61f82c4caaf08efed9cf05af66d
Hello, arm64!

? → docker run --rm docker.io/cubxxw/hello-arch:latest@sha256:8b735708d7d30e9cd6eb993449b1047b7229e53fbcebe940217cb36194e9e3a2
Hello amd64!
```

## [buildx’s cross-platform build strategy](https://waynerv.com/posts/building-multi-architecture-images-with-docker-buildx/#contents:buildx-’s cross-platform build strategy)

Depending on the build node and target program language, `buildx` supports the following three cross-platform build strategies:

1. Create a lightweight virtual machine through the user mode of QEMU and build an image in the virtual machine system.
2. Add multiple nodes of different target platforms to a builder instance and build the corresponding platform image through native nodes.
3. Build in stages and cross-compile to different target architectures.

QEMU is usually used to emulate a complete operating system. It can also run in user mode: register a binary translation handler with the host system as `binfmt_misc`, and dynamically translate the binary file when the program is running, calling the system as needed Converts from the target CPU architecture to the current system's CPU architecture. The end effect is like running binaries for the target CPU architecture in a virtual machine. Docker Desktop has built-in QEMU support, and other platforms that meet the operating requirements can be installed in the following ways:

```yaml
docker run --privileged --rm tonistiigi/binfmt --install all
```

## OpenIM cross-platform compilation practice

We need to make a solution for OpenIM offline deployment. First of all, we need to be familiar with what components are required for OpenIM deployment. Check out

| Service Name | Image | Supported Architectures | Ports |
| ------------------ | ---------------------------------- --------- | ----------------------- | ---------------- ------- |
| mysql | mysql:5.7 | amd64, arm64v8, arm32v7 | 13306:3306, 23306:33060 |
| mongodb | mongo:4.0 | amd64, arm64v8, arm32v7 | 37017:27017 |
| redis | redis | amd64, arm64v8, arm32v7 | 16379:6379 |
| zookeeper | wurstmeister/zookeeper | amd64 | 2181:2181 |
| kafka | wurstmeister/kafka | amd64, arm | 9092:9092 |
| etcd | http://quay.io/coreos/etcd | amd64, arm64v8 | 2379:2379, 2380:2380 |
| minio | minio/minio | amd64, arm64v8, arm32v7 | 10005:9000, 9090:9090 |
| open_im_server | openim/open_im_server:v2.3.9 | amd64 | N/A |
| open_im_enterprise | openim/open_im_enterprise:v1.0.3 | amd64 | N/A |
| prometheus | prom/prometheus | amd64, arm64v8, arm32v7 | N/A |
| grafana | grafana/grafana | amd64, arm64v8, arm32v7 | N/A|
| node-exporter | http://quay.io/prometheus/node-exporter | amd64, arm64v8, arm32v7 | 9100:9100 |

Note that zookeeper and openim do not provide arm architecture design solutions.

So we need to compile the arm architecture image ourselves, and the design of this layer is more complicated. To automate the build, we will use CICD and Makefile integration.
