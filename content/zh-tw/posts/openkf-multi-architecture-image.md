---
title: 'Openkf 多架構鏡像的構建策略設計'
date : 2023-09-16T14:15:15+08:00
draft : false
tags:
  - blog
categories:
  - Development
  - Blog
---

## 自動化構建`openkf`的多架構鏡像並推送到多個鏡像倉庫

+ https://github.com/openimsdk/openkf

**描述：**

為了滿足各種用戶的需求，我們的目標是自動化構建用於各種架構的`openkf` Docker鏡像，並無縫地將它們推送到多個鏡像倉庫。

**目標：**

- 自動構建`openkf`的`linux/amd64`和`linux/arm64`架構的Docker鏡像。
- 將鏡像推送到Docker Hub、阿里雲Docker Hub和GitHub容器倉庫。

**任務：**

1. **設置多架構構建系統**
   - 使用GitHub Actions，配合QEMU和Docker Buildx，支持`linux/amd64`和`linux/arm64`的多架構構建。
   - 在每次新版本發布、提交到`main`分支或定期事件時，觸發構建過程。
2. **支持多個鏡像倉庫**
   - Docker Hub：推送到`openim/openkf-server`。
   - 阿里雲Docker Hub：推送到`registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server`。
   - GitHub容器倉庫：推送到`ghcr.io/openimsdk/openkf-server`。
3. **動態鏡像標記**
   - 使用Docker Metadata Action，基於事件（如定期觸發器、分支提交、拉取請求、語義版本控制和提交SHA）生成動態標籤。
   - 確保在拉取請求事件中不推送已構建的鏡像。
4. **身份驗證和安全性**
   - 使用秘密配置Docker Hub、阿里雲和GitHub容器倉庫的身份驗證。
   - 確保每個倉庫的推送操作都是安全且無縫的。
5. **通知和日誌**
   - 通過GitHub Actions，如果有任何構建或推送失敗，向開發團隊發送通知。
   - 保留每次構建和推送操作的日誌以供追踪。

**驗收標準：**

- `openkf`鏡像應該成功地為`linux/amd64`和`linux/arm64`架構構建。
- 在成功構建後，鏡像應該在Docker Hub、阿里雲Docker Hub和GitHub容器倉庫上可用。
- 根據定義的事件和屬性正確標記鏡像。
- 整個過程中不需要人工干預。

**附加說明：**

- 自動化過程在GitHub Actions工作流中定義。確保根據需要查看和更新工作流。
- 確保在單獨的分支或環境中測試此過程，以避免中斷。