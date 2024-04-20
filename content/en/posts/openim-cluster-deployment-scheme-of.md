---
title: 'OpenIM clustering design Kubernetes deploy concludes'
description: "This article mainly introduces the clustering design of OpenIM, including infrastructure design, CI/CD, containerization, microservice optimization, monitoring and alarm, security, etc."
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-17T09:51:54+08:00
draft : false
showtoc: true
tocopen: false
author: ["Xinwei Xiong", "Me"]
keywords: ["OpenIM", "Kubernetes", "Clustering", "Design", "Deployment", "Scheme"]
tags:
  - blog
  - openim
  - kubernetes
  - sealos
  - clustering
categories:
  - Development
  - Blog
  - OpenIM
---

## Conference and Reference Links

+ Conference reference documents: [https://nsddd.notion.site/2899028707604b8090b36677c031cdf8?pvs=4](https://nsddd.notion.site/2899028707604b8090b36677c031cdf8?pvs=4)
+ Video playback: Bilibili: [https://www.bilibili.com/video/BV1s8411q7Um/?spm_id_from=333.999.0.0](https://www.bilibili.com/video/BV1s8411q7Um/?spm_id_from=333.999.0.0)



**Comment:**

+ I think that middleware can be replaced with https://kubeblocks.io which can help you manage multiple database middlewares.
+ im reads the configuration information, and reads the config/ directory. The config.yaml hard-coded in the code can be automatically divided into rpc for different services, and then unified directories. By default, the directory is read from the binary running path. two floors
+ openim version: https://github.com/openimsdk/open-im-server/blob/main/docs/conversions/version.md
+ Storage can consider using:
   + https://github.com/openebs/openebs
   + https://github.com/rook/rook



**Core target:**

The biggest difference between open source projects and non-open source projects is a complete set of solutions.

+ The design of cluster deployment solutions for non-open source projects is more concerned with stability, efficiency, and speed. It is best to deploy with one click.
+ The design of cluster deployment solutions for open source projects is more concerned with versatility, difficulty of getting started, difficulty of later maintenance, and stability of the infrastructure. Later developers, contributors, and users can create their own cluster deployment solutions and solutions based on this, and become a use case for OpenIM's cluster deployment solution.



## OpenIM cluster deployment seminar records

Summary first, then detailed explanation ~

### About the evolution and changes of open source deployment environment

+ **New deployment method**: a one-click operation that combines binary and deployment.
+ **Kubernetes Deployment**: A new solution for one-click deployment in the Kubernetes environment.
+ **Existing issues**: Involving log collection, service restart tracking, etc. These issues will be improved and solutions will be found in the future.

### CICD development and maintenance strategy

+ **CICD concept**: Implement Code Streaming through CICD.
+ **Development Phase**: Image files need to be written. **CSD feature for GitHub**: Implemented but yet to be further studied.
+ **Version tagging strategy**: It is recommended to use local branch instead of direct tags.

### Practical experience sharing about software development and testing

+ **Local development**: It is recommended to use the "auto-compile" tool to quickly generate a stable version of the image.
+ **Team Collaboration**: Introduces how teams collaborate on development, testing, and release.
+ **Code Reuse**: Mention the encapsulation of functions or methods in the library into components to enable cross-project calls.

### Docker Deployment and Service Configuration

+ **Configuration delivery**: Mainly through configuration files such as K8S.
+ **Deployment Method**: Introduces two strategies, binary deployment and deployable, and discusses their respective advantages and disadvantages.

### Discussion on containerized deployment and code optimization

+ **Containerization**: It is proposed to merge multiple processes into one container for management.
+ **Deployment Compatibility**: Discussed how to implement and fine-tune.
+ **Technical architecture and components**: such as Helm chat, OpenM, etc., and their role and importance in the system.

### Technical issues and solutions about one-click deployment

+ **One-click deployment problem**: Possible problems include being unable to circumvent the wall, being unable to install, etc.
+ **Solution**: 1) Universalize existing solutions; 2) Use third-party services to achieve one-click deployment.

### Optimization strategy for K8S deployment and automation

+ **Deployment tools**: such as using Shell to achieve one-click deployment, K ks deployment, etc.
+ **Component Integration**: Consider how different components can be combined into a complete solution and maintain consistency across different environments.

### Best practices in microservice architecture

+ **Application Deployment**: It is recommended to divide the application into different containers, and run a business process in each container.
+ **Code integration**: It is proposed to integrate related codes into one file for management.

### Optimization and deployment strategy of microservices

+ **Microservice Division**: Emphasis on avoiding too detailed module division.
+ **Automation**: No additional maintenance workload is added during deployment, and an automation strategy is adopted.

### About the selection of storage methods and orchestration tools

+ **File Storage**: For example, use NFS as local distributed file storage.
+ **Orchestration Tool**: It is recommended to use rook for object storage orchestration, and use a dedicated orchestrator for the database.

### Application of NFS and Flexible File System

+ **MFS on iPhone**: Discussed its usage and how to synchronize global configuration files to each business module.
+ **PV/PVC management data**: Example explains how to use this file system for data management.

### Application of binary code and configuration files

+ **Code Adaptation**: Performed through configuration files, involving passing configuration paths, file mapping and other details.

### About optimization and improvement in software development

+ **Project Scripting**: Discussed optimization suggestions for performance bottlenecks, unified deployment processing, and service discovery modules.

### About writing and optimizing web application configuration files

+ **IP Allocation**: Configuration file for IP allocation and inter-module segmentation handling.
+ **Interface application**: For example, using different interfaces in different environments to implement heartbeat and other functions.
+ **Technical architecture improvements**: Optimize lightweight, improve development efficiency and maintenance effects, etc.

**Conclusion**: This seminar covered many aspects of the open source deployment environment, from software development, deployment, testing to microservice architecture and storage methods. We hope that this discussion can provide powerful reference and guidance for the cluster deployment of OpenIM.



## Kubernetes cluster design plan

### Ingress-Controller selection

In order to provide a scalable and flexible environment, we intend to use the following Ingress-Controller:

+ **Development and early stage**: Use `nginx-controller`.

   *Reason*: Simple, fast, easy to configure, suitable for early development and testing.

+ **Production and scaling phase**: Consider using `traefik` or `istio`.

   *Reason*: To meet the complexity and scalability needs of production environments.

### Deployment of basic component layer

We will use `Helm charts` to deploy the following basic components:

+ MySQL
+ Redis
+ MongoDB
+ Kafka
+ Loki
+ Prometheus
+ Grafana

*Reason*: `Helm` can simplify the deployment, upgrade and management of Kubernetes applications, making the deployment of basic components simpler.

### Application layer design

For `openim-server` and `openim-chat`, consider the following strategies:

+ Create separate `Helm chart` for each module of `openim-server` and `openim-chat`.

   *Reason*: This makes it easy to collect logs, monitor and restart status management.

### K8s adaptation of openim-server and openim-chat

+ The existing service discovery through zookeep will be replaced and communicated through the `servicename` domain name of K8s.

   *Reason*: In the Kubernetes environment, using servicename for service discovery is more intuitive and easy to manage and expand.



## OpenIM cluster general design ideas



### Overall Thoughts

+ **Deployment method**:
   + binary (implemented)
   + docker-compose (implemented)
   + k8s deployment (targeting one-click deployment, with sealos)
   + [openim-docker GitHub address](https://github.com/openimsdk/openim-docker)
+ **Code and deployment adaptation**: The same business code should be adapted to three deployment methods, the difference is only in the deployment script. Specifically, scalability design can be carried out through the parameters and environment variables of `install.sh`.
+ **Service process independence**: Consider separating multiple processes in the `openim-server` and `openim-chat` containers into containers for the purpose of simplifying log collection, easy tracking of service restarts and panics, and convenient monitoring and refined expansion. This is also more in line with the idea of microservices.
+ **CICD process**: The image `tag` needs to be different between the development stage and the official release stage. The compiled image `tag` in the development stage is the branch name; the officially released `tag` is `release` plus the version number; the `tag` names in the testing stage are `rc0`, `rc1`, `rc2`... This facilitates speed updates during the development phase.
+ **Service configuration policy**: The configuration information of all services should be passed through the `yaml` configuration file. The specific startup command is `openim -c /data/openim/config.yaml`. The default configuration is to read the configuration file from `/data/service name/config.yaml`. The configuration file should cover all configuration information required for operation.
+ **Deployment script details**:
   + `docker-compose`: Continue to use the `shell+compose.yaml` strategy, extract a `config.yaml` configuration file for each service, and map it into the `/data/openim/` directory of the container.
   + `k8s`: adopt `shell+helm chart` strategy. The infrastructure component maintains an open source stable version and default configuration `value.yaml` in our own helm repo. All basic service configurations should be maintained in a global configuration file `openim.yaml`, which is used to override the default `value.yaml`.

### Prepare each helm chart

| **Category** | **Includes** | **Description** | **Remarks** |
| ----------------------- | ----------------------- ---------------------------------- | --------------- -------------------------------------------------- | --- -------------------------------------------------- |
| ingress-controller | nginx-ingress | There are currently three mainstream ingress-controllers: istio, traefik, and nginx. It is recommended to transition to traefik in the later stage. | Configure http and ws to use the same port. |
| Business service module | openim-api, openimmsg-gateway, openim-push, openim-msgtransfer, openim-rpc-*, front-end module | It is recommended to merge the lightweight rpc service responsible for database storage into openim-api. | Dividing services too finely will increase maintainability. |
| Infrastructure module | mysql, redis, mongodb, kafka, loki, Prometheus, grafana, zookeeper | Maintain a stable open source helm chart and default value. | Pushed to our own helm repo for easy management and user installation. |
| Global configuration file openim.yaml | Value.yaml covering all business modules helm | Abstracts the same global configuration information. | Such as: infrastructure account, url information, pvc path mapping information, etc. |
| shell script | Install, restart, and delete services selectively. | The script needs to capture the return value of success or failure of helm installation. | Complete basic templating and automation functions. |

**Helm chart directory structure**: [View link](https://wdcdn.qpic.cn/MTY4ODg1NDc5OTQ3MTMwMw_344519_vqHmjF7xlPMUz1ht_1694910900?sign=1694915159-592367056-0-b8360271e7d98a1b5 31eb3a5713ceb85)

### Application configuration file adaptation

+ Binary deployment: passed through the `-c /data/openim/config.yaml` command line parameter.
+ docker-compose: Map configuration files into the `/data/service name/` directory of the container.
+ k8s: Create a configmap and map it to the container in deployment.

### Adaptation of application service discovery and service registration

Since k8s comes with its own service discovery and service registration mechanism, consider adapting it to simplify deployment. The specific method is to encapsulate another layer on `discoveryregistry.SvcDiscoveryRegistry`, and maintain the original process for docker-compose and binary deployment. If it is deployed on k8s, the internal domain name of the service name is used for communication.

### Modification points

+ **CICD**: implemented using github actions. The build process should generate corresponding image tags in the three environments of `dev`, `test`, and `release`.
+ **Deployment function**: Maintain three sets of deployment scripts and corresponding yaml configuration files.
+ **Development Suggestion**: Microservices should not be divided too much. It is recommended to choose lightweight cloud-native modules and maintain public modules independently.



## Design steps

**OpenIM** is an open source instant messaging solution. In order to ensure its high availability and high performance in large-scale application scenarios, the clustered deployment design focuses on providing OpenIM with a professional and complete clustering design guide, covering from infrastructure, continuous integration/deployment to microservices All critical steps for optimization.

### Infrastructure design

#### Web Design

+ **Subnet planning**: Ensure that each Availability Zone (AZ) has its own independent subnet and ensure isolation between them.
+ **Load Balancer**: Use a cloud provider or open source load balancer (such as Nginx, HAProxy) to ensure high availability and traffic distribution.

#### Storage design

+ **Persistent Storage**: Leverage cloud-native persistence solutions such as AWS EBS, GCE Persistent Disk, or the open source Rook.
+ **Log and Monitoring**: Integrate ELK (Elasticsearch, Logstash, Kibana) or EFK (Elasticsearch, Fluentd, Kibana) stack to ensure real-time collection, analysis and display of logs.



### CI/CD & GitOps

#### Continuous integration

+ **Compile and Test**: Integrate with Jenkins, GitLab CI or GitHub Actions to ensure automated unit testing and builds after every code commit.

#### Continuous deployment

+ **Deployment process**: Ensure that each successful build can be automatically pushed to the test environment, and there is a process to support automatic or semi-automatic push to the production environment.
+ **Configuration Management**: Use Helm or Kustomize to implement versioned management and automatic deployment of application configurations.

#### GitOps

+ Use ArgoCD or Flux to achieve declarative application deployment. Ensure that all cluster changes are tracked via Git.



### Containerization and Service Orchestration

#### Container design

+ Use Docker as a container solution to ensure isolation and consistency of services.
+ Images are stored in private or public container repositories such as Docker Hub, Quay.io or a cloud provider's container repository.

#### Kubernetes as a service orchestration tool

+ **Multi-cluster management**: Consider using Rancher or Kubefed to achieve unified management across multiple clusters.
+ **Network Policy**: Implement network policy and security for inter-pod communication using Calico or Cilium.



### Microservice optimization

#### Service division

+ **Functional separation**: Make sure each microservice only does one thing, and does it well.
+ **Communication**: Use gRPC or RESTful API as the communication method between microservices.

#### Service discovery and load balancing

+ Use Istio or Linkerd to provide service mesh functions for microservices and implement advanced functions such as service discovery, load balancing, and grayscale publishing.

#### Current limiting and fusing

+ Use Hystrix or Sentinel to provide current limiting, circuit breaking and degradation strategies for microservices.



### Monitoring and Alarming

#### Monitoring

+ Use Prometheus and Grafana to provide real-time monitoring data display.

#### log

+ Use Loki or Fluentd to provide log aggregation functions for the cluster.

#### Alarm

+ Integrate with Alertmanager or ElastAlert to ensure relevant teams are notified promptly when critical issues occur.



### Safety

#### cyber security

+ **Pod Network Policies**: Use NetworkPolicies to limit unnecessary communication between Pods.
+ **Ingress/Egress Traffic**: Use Istio's egress and ingress gateway to control incoming and outgoing traffic to the cluster.

#### IAM

+ Provide unified authentication for Kubernetes using OpenID Connect or Dex.configuration information. | Such as: infrastructure account, url information, pvc path mapping information, etc. |
| shell script | Install, restart, and delete services selectively. | The script needs to capture the return value of success or failure of helm installation. | Complete basic templating and automation functions. |

**Helm chart directory structure**: [View link](https://wdcdn.qpic.cn/MTY4ODg1NDc5OTQ3MTMwMw_344519_vqHmjF7xlPMUz1ht_1694910900?sign=1694915159-592367056-0-b8360271e7d98a1b5 31eb3a5713ceb85)

### Application configuration file adaptation

+ Binary deployment: passed through the `-c /data/openim/config.yaml` command line parameter.
+ docker-compose: Map configuration files into the `/data/service name/` directory of the container.
+ k8s: Create a configmap and map it to the container in deployment.

### Adaptation of application service discovery and service registration

Since k8s comes with its own service discovery and service registration mechanism, consider adapting it to simplify deployment. The specific method is to encapsulate another layer on `discoveryregistry.SvcDiscoveryRegistry`, and maintain the original process for docker-compose and binary deployment. If it is deployed on k8s, the internal domain name of the service name is used for communication.

### Modification points

+ **CICD**: implemented using github actions. The build process should generate corresponding image tags in the three environments of `dev`, `test`, and `release`.
+ **Deployment function**: Maintain three sets of deployment scripts and corresponding yaml configuration files.
+ **Development Suggestion**: Microservices should not be divided too much. It is recommended to choose lightweight cloud-native modules and maintain public modules independently.



## Design steps

**OpenIM** is an open source instant messaging solution. In order to ensure its high availability and high performance in large-scale application scenarios, the clustered deployment design focuses on providing OpenIM with a professional and complete clustering design guide, covering from infrastructure, continuous integration/deployment to microservices All critical steps for optimization.

### Infrastructure design

#### Web Design

+ **Subnet planning**: Ensure that each Availability Zone (AZ) has its own independent subnet and ensure isolation between them.
+ **Load Balancer**: Use a cloud provider or open source load balancer (such as Nginx, HAProxy) to ensure high availability and traffic distribution.

#### Storage design

+ **Persistent Storage**: Leverage cloud-native persistence solutions such as AWS EBS, GCE Persistent Disk, or the open source Rook.
+ **Log and Monitoring**: Integrate ELK (Elasticsearch, Logstash, Kibana) or EFK (Elasticsearch, Fluentd, Kibana) stack to ensure real-time collection, analysis and display of logs.



### CI/CD & GitOps

#### Continuous integration

+ **Compile and Test**: Integrate with Jenkins, GitLab CI or GitHub Actions to ensure automated unit testing and builds after every code commit.

#### Continuous deployment

+ **Deployment process**: Ensure that each successful build can be automatically pushed to the test environment, and there is a process to support automatic or semi-automatic push to the production environment.
+ **Configuration Management**: Use Helm or Kustomize to implement versioned management and automatic deployment of application configurations.

#### GitOps

+ Use ArgoCD or Flux to achieve declarative application deployment. Ensure that all cluster changes are tracked via Git.



### Containerization and Service Orchestration

#### Container design

+ Use Docker as a container solution to ensure isolation and consistency of services.
+ Images are stored in private or public container repositories such as Docker Hub, Quay.io or a cloud provider's container repository.

#### Kubernetes as a service orchestration tool

+ **Multi-cluster management**: Consider using Rancher or Kubefed to achieve unified management across multiple clusters.
+ **Network Policy**: Implement network policy and security for inter-pod communication using Calico or Cilium.



### Microservice optimization

#### Service division

+ **Functional separation**: Make sure each microservice only does one thing, and does it well.
+ **Communication**: Use gRPC or RESTful API as the communication method between microservices.

#### Service discovery and load balancing

+ Use Istio or Linkerd to provide service mesh functions for microservices and implement advanced functions such as service discovery, load balancing, and grayscale publishing.

#### Current limiting and fusing

+ Use Hystrix or Sentinel to provide current limiting, circuit breaking and degradation strategies for microservices.



### Monitoring and Alarming

#### Monitoring

+ Use Prometheus and Grafana to provide real-time monitoring data display.

#### log

+ Use Loki or Fluentd to provide log aggregation functions for the cluster.

#### Alarm

+ Integrate with Alertmanager or ElastAlert to ensure relevant teams are notified promptly when critical issues occur.



### Safety

#### cyber security

+ **Pod Network Policies**: Use NetworkPolicies to limit unnecessary communication between Pods.
+ **Ingress/Egress Traffic**: Use Istio's egress and ingress gateway to control incoming and outgoing traffic to the cluster.

#### IAM

+ Provide unified authentication for Kubernetes using OpenID Connect or Dex.
