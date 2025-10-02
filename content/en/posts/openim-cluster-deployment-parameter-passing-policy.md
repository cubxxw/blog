---
title: 'Design Proposal: Simplified Port Configuration via Config Files for Kubernetes Deployment'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2023-09-18T22:49:14+08:00
draft : false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
categories:
  - Development
description: >
    <You can switch to the specified language>
---


## Introduction

In the current module's execution, numerous ports (ws, api, rpc, Prometheus) are passed directly. This approach can be cumbersome and doesn't align with Kubernetes' best practices where a pod typically exposes only one port (either 80 or 443). This proposal suggests transitioning to a configuration file-centric approach, while still retaining the capability to pass ports directly when needed.

## Goals

1. Simplify the port configuration for Kubernetes deployment.
2. Prioritize port values passed as arguments over configuration file values.
3. Provide flexibility to users who wish to use traditional port-based or environment variable-based deployments.

## Proposed Solution

### 1. Configuration File

Instead of passing multiple ports directly, a configuration file will be introduced. By default, this file will contain predefined ports. This configuration file can be passed to the module using Kubernetes' `ConfigMap`.

**Example Configuration File**:

```bash
ws_port: 3000
api_port: 3001
rpc_port: 3002
prometheus_port: 9090
```

### 2. Passing Ports Directly

While the configuration file approach is recommended for Kubernetes deployment, users can still pass the ports directly. If ports are passed as arguments, these values will override the values from the configuration file.

### 3. Environment Variable-based Deployment

For users who prefer source code deployment using environment variables, the module can be designed to read port values set as environment variables on a Linux system. If these environment variables are set, they will override the configuration file values but will have lower precedence than port values passed directly as arguments.

**Example**: If `WS_PORT` environment variable is set to 3005, it will override the `ws_port` value from the configuration file, unless `ws_port` is passed as an argument.

## Implementation Steps

1. **Update Module to Read Configuration File**: Modify the module to read port values from the provided configuration file.
2. **Argument-based Overrides**: Implement logic to override configuration file port values if they are provided as arguments.
3. **Environment Variable-based Overrides**: Implement logic to check for environment variables and use those values if set. Ensure that direct argument values have the highest priority.
4. **Documentation**: Update documentation to provide clear instructions on the three methods of setting port values: configuration file, direct arguments, and environment variables.
5. **Testing**: Thoroughly test the module in different scenarios:
   + Using only the configuration file.
   + Passing ports as arguments.
   + Setting environment variables.

## Conclusion

Adopting a configuration file approach simplifies the deployment process, especially in Kubernetes environments. While the configuration file is prioritized for simplicity, the flexibility of passing ports directly or using environment variables ensures backward compatibility and caters to various user preferences.