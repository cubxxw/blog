---
title: 'OpenIM Use Harbor Build Enterprise Mirror Repositories'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-10-25T10:45:38+08:00
draft : false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: [openim, harbor, docker, kubernetes, helm, cert-manager]
tags:
  - blog
  - openim
  - docker
categories:
  - Development
  - Blog
  - OpenIM
  - Kubernetes
description: >
    Discover how to set up a robust image repository using Harbor, a powerful open-source container image registry. This step-by-step guide covers the installation and configuration of Harbor, including the use of Helm charts and Cert-manager for secure HTTPS connections. Learn how to push Docker images to your Harbor repository, configure DNS resolution, and even explore the option of using AWS S3 for scalable image storage. Harness the full potential of Harbor to streamline your container image management and reduce storage costs while ensuring security and reliability.
---



## Requirements

OpenIM provides various public image registry addresses, such as aliyun, github, Docker Hub, and more.

Read https://github.com/openimsdk/open-im-server/blob/main/docs/conversions/images.md for more image building guidelines.

Most enterprises choose to set up their own image repository using Harbor, integrating it into their CI/CD pipeline to eventually replace Docker Hub and further reduce image storage costs.

Additionally, in a production environment, Harbor generally enables TLS, so you will also need to prepare a valid domain name.

> Chinese servers use domain names and require domain registration.

## Install Helm

Helm, along with cluster deployment references, can be found at https://github.com/openimsdk/open-im-server/tree/main/deployments.

## Install Cert-manager

Next, let's install Cert-manager, which will automatically issue free Let's Encrypt HTTPS certificates for us and renew them before they expire.

First, run the following command to add the official Helm repository:

```bash
$ helm repo add jetstack https://charts.jetstack.io
```

Then, update the local cache:

```bash
$ helm repo update
```

Next, run the following command to install Cert-manager:

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

Additionally, you need to create a ClusterIssuer for Cert-manager to provide the signing authority. Save the following content as `cluster-issuer.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: "your-email@example.com"
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:    
    - http01:
        ingress:
          class: nginx
```

Please replace `spec.acme.email` with your actual email address, and then apply it to the cluster:

```bash
$ kubectl apply -f cluster-issuer.yaml
```

## Install and Configure Harbor

Now, we'll also use Helm to install Harbor. First, add the official Harbor repository:

```bash
$ helm repo add harbor https://helm.goharbor.io
$ helm repo update
```

Next, since we need to customize the installation of Harbor, you'll need to modify Harbor's installation parameters. Save the following content as `values.yaml`:

```bash
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

Additionally, I've configured ingress access domains for Harbor as `harbor.openim.io` and `notary.openim.io`. You need to replace them with your actual domain names.

Then, install Harbor using the following `helm install` command, specifying the configuration file `values.yaml`:

> **Note**: If the OpenIM cluster is deployed in a namespace other than `openim`, you need to use `-n` to specify the namespace. If the namespace does not exist, you can use `--create-namespace`.

```bash
$ helm install harbor harbor/harbor -f values.yaml --namespace harbor --create-namespace
```

Wait for all pods to be in a ready state:

```bash
$ kubectl wait --for=condition=Ready pods --all -n harbor --timeout 600s
```

At this point, Harbor has been successfully installed.

### Configure DNS Resolution

Next, configure DNS resolution for your domain name. First, get the external IP of the Ingress-Nginx LoadBalancer:

```bash
$ kubectl get services --namespace ingress-nginx ingress-nginx-controller --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
43.134.63.160
```

Then, configure DNS resolution for your domain names. In this example, I need to configure A records for `harbor.openim.io` and `notary.openim.io` and point them to `43.134.63.160`.

## Access Harbor Dashboard

Before accessing the Harbor Dashboard, first confirm whether Cert-manager has successfully issued the HTTPS certificate. You can use the `kubectl get certificate` command to check:

```bash
$ kubectl get certificate -A                     
NAMESPACE   NAME                READY   SECRET              AGE
harbor      harbor-secret-tls   True    harbor-secret-tls   8s
harbor      notary-secret-tls   True    notary-secret-tls   8s
```

Since we configured two domains when deploying Harbor, you will see two certificates here. When both certificates have a `Ready` status of `True`, it means that the HTTPS certificates have been successfully issued. Additionally, Cert-manager automatically reads the tls configuration from the Ingress object and creates two secrets, `harbor-secret-tls` and `notary-secret-tls`, containing certificate information.

Next, open [https://harbor.openim.io](https://harbor.openim.io/) to access the Harbor Dashboard. You can log in to the console using the default account `admin` and password `Harbor12345`.

## Test Image Push

Now, let's try pushing a local image to the Harbor repository. First, pull the busybox image locally:

```bash
$ docker pull busybox
```

Then, run the `docker login` command to log in to the Harbor repository using the default credentials:

```bash
$ docker login harbor.openim.io
```

Next, re-tag the busybox image to point to the Harbor image repository:

```bash
$ docker tag busybox:latest harbor.openim.io/library/busybox:latest
```

Compared to pushing to Docker Hub, pushing to Harbor requires specifying the full image repository address, project name, and image name. Here, I used the default `library` project, but you can create a new project and replace `library` with the new project name.

Finally, push the image to the repository:

```bash
$ docker push harbor.openim.io/library/busybox:latest
```

After successfully pushing the image, visit the Harbor console, go to the `library` project details, and you will see theimage that we just pushed.

At this point, your Harbor image repository is configured and operational.

## Recommended: Use S3 Storage for Images

In addition to using persistent volumes for image storage, Harbor also supports external storage. If you want to use Harbor extensively and don't want to worry about storage, using external storage is an excellent choice. For example, you can use an AWS S3 bucket to store images.

The advantages of an S3 storage solution include near-infinite storage capacity, cost control with pay-as-you-go billing, high availability, and disaster recovery capabilities.

To use S3 for image storage, you need to modify the Harbor installation configuration in `values.yaml` during installation:

```bash
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

Make sure to replace the S3 configuration fields (`region`, `bucket`, `accesskey`, `secretkey`, and `rootdirectory`) with your actual values. Then, install Harbor using `helm install` with the `-f values.yaml` option.

```bash
$ helm install harbor harbor/harbor -f values.yaml --namespace harbor --create-namespace
```

With this configuration, Harbor will use S3 storage for images.

Congratulations! You have now completed the installation and configuration of Harbor, and you have the option to use S3 storage for your images if desired. Your Docker images can be securely stored and managed in your own Harbor image repository.