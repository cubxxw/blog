---
title: 'Openkf Multi Architecture Image'
date: 2023-09-01T14:56:14+08:00
draft : false
tags:
  - blog
  - en
  - openkf
categories:
  - Development
---

## Automate Multi-Architecture Image Build for `openkf` and Push to Multiple Image Repositories

+ https://github.com/openimsdk/openkf

**Description:**

To meet the requirements of a diverse set of users, we aim to automate the process of building the `openkf` Docker images for various architectures and push them to multiple image repositories seamlessly.

**Objective:**

- Automatically build Docker images of `openkf` for `linux/amd64` and `linux/arm64` architectures.
- Push the images to Docker Hub, AliYun Docker Hub, and GitHub Container Registry.

**Tasks:**

1. **Setup Multi-Architecture Build System**
   - Use GitHub Actions with QEMU and Docker Buildx to support multi-architecture builds for `linux/amd64` and `linux/arm64`.
   - On every new release, commit to the `main` branch, or scheduled event, trigger the build process.
2. **Support Multiple Image Repositories**
   - Docker Hub: Push to `openim/openkf-server`.
   - AliYun Docker Hub: Push to `registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server`.
   - GitHub Container Registry: Push to `ghcr.io/openimsdk/openkf-server`.
3. **Dynamic Image Tagging**
   - Use Docker Metadata Action to generate dynamic tags based on events such as scheduled triggers, branch commits, pull requests, semantic versioning, and the commit SHA.
   - Ensure the built image does not get pushed during pull request events.
4. **Authentication & Security**
   - Configure authentication for Docker Hub, AliYun, and GitHub Container Registry using secrets.
   - Ensure a secure and seamless push operation for each repository.
5. **Notifications & Logging**
   - Send notifications to the development team in case of any build or push failures through GitHub Actions.
   - Maintain logs for every build and push operation for traceability.

**Acceptance Criteria:**

- The `openkf` image should be built successfully for both `linux/amd64` and `linux/arm64` architectures.
- Upon successful build, the image should be available on Docker Hub, AliYun Docker Hub, and GitHub Container Registry.
- Properly tagged images based on the defined events and attributes.
- No manual intervention required during the entire process.

**Additional Notes:**

- The automation process is defined in the GitHub Actions workflow. Ensure to review and update the workflow as needed.
- Make sure to test the process in a separate branch or environment to avoid disruptions.

Feedback and further recommendations are welcome.
