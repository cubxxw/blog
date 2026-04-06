# CLAUDE.md - Blog Development Guidelines

This document contains critical information about working with this codebase. Follow these guidelines precisely.


---

编译不要用 make，用 netlify dev，如果是修改代码，修改完成后必须要验证页面是否正常



### 创建新文章

```bash
# 技术文章
hugo new content content/zh/ai-technology/posts/my-article.md
hugo new content content/en/ai-technology/posts/my-article.md

# 成长文章
hugo new content content/zh/growth/posts/my-article.md
hugo new content content/en/growth/posts/my-article.md

# AI 项目文章
hugo new content content/zh/projects/my-project.md --kind ai-project
hugo new content content/en/projects/my-project.md --kind ai-project
```

### 添加文章的推荐流程

判断文章属于 `ai-technology`、`growth` 还是 `projects`，用对应命令创建文件，不要手工新建到错误目录

---