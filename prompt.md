我希望你参考下面的模版，以及下面的规则，给出对应修改后的元数据代码

```yaml
---
title: '请填写文章标题'
ShowRssButtonInSectionTermList: true
date: '请保持原有日期或添加新日期'
draft: false
showtoc: true
tocopen: true
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

1. **标题（title）**: 根据文章的核心内容填写，适当的优化标题
2. **日期（date）**: 如指示，如果已存在，则保持不变；否则，添加文章的发布日期。
3. **作者（author）**: 中文文章使用“熊鑫伟，我”，英文文章使用“Xinwei Xiong, Me”。
4. **关键词（keywords）**: 结合文章主题和预期搜索需求选择关键词。例如，如果文章是关于Kubernetes的技术深入，关键词可以是“Kubernetes”, “云原生”, “服务网格”, “容器编排”, “DevOps”等。
5. **标签（tags）**和**分类（categories）**: 选择与文章内容最匹配的标签和分类。必须要使用下面给出的中英文标签和分类表。中文的文章使用中文的规则，英文的文章使用英文的规则。不要使用表格外的 标签和 分类

**中文规则：**
| 类别       | 标签                                                             | 分类                             |
|------------|------------------------------------------------------------------|----------------------------------|
| 技术       | `Go`, `Kubernetes`, `OpenIM`, `云原生 (Cloud Native)`, `微服务 (Microservices)`, `服务网格 (Service Mesh)`, `Docker`, `CI/CD`, `Prometheus` | `开发 (Development)`             |
| 安全       | `安全性 (Security)`, `代码审查 (Code Review)`                     | `安全 (Security)`                |
| 敏捷与流程 | `敏捷软件开发 (Agile Software Development)`, `响应式编程 (Reactive Programming)`, `函数式编程 (Functional Programming)` | `项目管理 (Project Management)`   |
| 个人兴趣   | `户外探险 (Outdoor Adventures)`, `环球旅行 (World Travel)`, `自行车骑行 (Cycling)`, `摄影 (Photography)` | `个人成长 (Personal Development)`|
| 生活方式   | `个人效率 (Personal Productivity)`, `健康生活 (Healthy Living)`, `生活方式 (Lifestyle)`, `远程工作 (Remote Work)` | `生活与教育 (Living & Education)`|


**英文规则：**

| Category            | Tags                                                         | Classification                  |
|---------------------|--------------------------------------------------------------|---------------------------------|
| Technology          | `Go`, `Kubernetes`, `OpenIM`, `Cloud Native`, `Microservices`, `Service Mesh`, `Docker`, `CI/CD`, `Prometheus` | `Development`                   |
| Security            | `Security`, `Code Review`                                     | `Security`                      |
| Agile & Processes   | `Agile Software Development`, `Reactive Programming`, `Functional Programming` | `Project Management`            |
| Personal Interests  | `Outdoor Adventures`, `World Travel`, `Cycling`, `Photography`| `Personal Development`          |
| Lifestyle           | `Personal Productivity`, `Healthy Living`, `Lifestyle`, `Remote Work` | `Learning & Education`           |


6. **描述（description）**: 提供文章的精确摘要，突出其独特之处和读者的收益点，注意，中文的不要用您。

### 扩展 Keywords 字段示例

除了输出上序基础的元数据，我希望你额外的补充一句话，关于你还推荐增强搜索的 Keywords 建议
推荐以 keywords: [""] 的形式给出建议

这些关键词将帮助提高文章在搜索引擎中的可见性，并吸引更具体的读者群体。每篇文章的关键词应根据其内容和目标读者精心挑选，以实现最佳的搜索引擎优化效果。

我将会不断地给你原料，请你输出专业的内容，并且你每一次都需要保证幂等，请问你准备好了吗？