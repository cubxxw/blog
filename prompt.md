我希望你参考下面的模版，以及下面的规则，给出对应修改后的元数据代码

```yaml
---
title: '请填写文章标题'
ShowRssButtonInSectionTermList: true
date: '请保持原有日期或添加新日期'
draft: false
showtoc: true
tocopen: false
type: posts
author: '请根据语言选择 "熊鑫伟，我" 或 "Xinwei Xiong, Me"'
keywords: ['请根据文章内容选择合适的关键词']
tags: ['参考规则表格(如果是中文的话，必须要带上双语)']
categories: ['参考规则表格']
description: '请简洁明了地描述文章主要内容和吸引点'
---
```

### 要求如下

你需要更具语境分析到底是中文博客还是英文博客，然后选择使用中文的格式还是英文的格式（一般来说标题出现了中文就是中文，除此之外是英文）

注意，描述的语言要和标题想匹配，如果标题是中文，必须要翻译为中文描述，以及中文的关键字，和中文的规则

```yaml
metadata_rules:
  - language: "中文"
    tags:
      min_count: 3
      max_count: 10
      list:
        - "Golang (GO语言)"
        - "Kubernetes"
        - "OpenIM"
        - "云原生 (Cloud Native)"
        - "微服务 (Microservices)"
        - "服务网格 (Service Mesh)"
        - "Docker"
        - "CI/CD"
        - "Prometheus"
        - "安全性 (Security)"
        - "部署 (Deployment)"
        - "代码审查 (Code Review)"
        - "敏捷软件开发 (Agile Software Development)"
        - "响应式编程 (Reactive Programming)"
        - "函数式编程 (Functional Programming)"
        - "户外探险 (Outdoor Adventures)"
        - "环球旅行 (World Travel)"
        - "自行车骑行 (Cycling)"
        - "摄影 (Photography)"
        - "旅行 (Travel)"
        - "自我发现 (Self Discovery)"
        - "冒险 (Adventure)"
        - "探索 (Exploration)"
        - "个人效率 (Personal Productivity)"
        - "健康生活 (Healthy Living)"
        - "生活方式 (Lifestyle)"
        - "远程工作 (Remote Work)"
    categories:
      min_count: 1
      max_count: 2
      list:
        - "开发 (Development)"
        - "安全 (Security)"
        - "项目管理 (Project Management)"
        - "个人成长 (Personal Development)"
        - "生活与教育 (Living & Education)"
    title:
      max_length: 60
      min_length: 10
      must_include_keywords: true
    description:
      max_length: 160
      must_be_unique: true
      enabled: true
    keywords:
      max_count: 10
      must_include_at_least: 6
      keywords_must_be_relevant: true
    author:
      required: true
      validate_name: true
      minimum_articles: 1
      author_list: ["熊鑫伟", "我"]

  - language: "English"
    tags:
      min_count: 3
      max_count: 10
      list:
        - "Golang"
        - "Kubernetes"
        - "OpenIM"
        - "Cloud Native"
        - "Microservices"
        - "Service Mesh"
        - "Docker"
        - "CI/CD"
        - "Prometheus"
        - "Security"
        - "Deployment"
        - "Code Review"
        - "Agile Software Development"
        - "Reactive Programming"
        - "Functional Programming"
        - "Outdoor Adventures"
        - "World Travel"
        - "Cycling"
        - "Photography"
        - "Travel"
        - "Self Discovery"
        - "Adventure"
        - "Exploration"
        - "Personal Productivity"
        - "Healthy Living"
        - "Lifestyle"
        - "Remote Work"
    categories:
      min_count: 1
      max_count: 2
      list:
        - "Development"
        - "Security"
        - "Project Management"
        - "Personal Development"
        - "Learning & Education"
    title:
      max_length: 60
      min_length: 10
      must_include_keywords: true
    description:
      max_length: 160
      must_be_unique: true
      enabled: true
    keywords:
      max_count: 10
      must_include_at_least: 6
      keywords_must_be_relevant: true
    author:
      required: true
      validate_name: true
      minimum_articles: 1
      author_list: ["Xinwei Xiong", "Me"]
```

除了输出上序基础的元数据，我希望你额外的补充一句话，关于你还推荐增强搜索的 Keywords 建议
推荐以 keywords: [''] 的形式给出建议

注意，中文文章一定要用 yaml 规则中的中文的规则，英文文章一定要用 yaml 规则中的英文规则，如果表格不满足你的要求，你需要提醒我在上序的 yaml 规则中添加对应的中英文标签和分类。

我将会不断地给你原料，请你输出专业的内容，并且你每一次都需要保证幂等，请问你准备好了吗？