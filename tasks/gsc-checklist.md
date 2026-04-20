# Google Search Console 接入手册

**站点**: https://nsddd.top  
**Sitemap**: https://nsddd.top/sitemap.xml

---

## Sitemap 状态确认 ✅

- 根 sitemap: `https://nsddd.top/sitemap.xml`（sitemapindex 格式）
  - 指向 `https://nsddd.top/en/sitemap.xml`
  - 指向 `https://nsddd.top/zh/sitemap.xml`
- robots.txt: 已配置 `Sitemap: https://nsddd.top/sitemap.xml`

---

## 接入步骤

### Step 1 — 在 GSC 添加站点

1. 访问 https://search.google.com/search-console
2. 点击「添加资源」→ 选择「URL 前缀」
3. 输入 `https://nsddd.top`，点击「继续」

### Step 2 — 获取 HTML 标签验证码

1. 在验证方式列表中选择「HTML 标签」
2. 复制标签中 `content="..."` 引号内的值（格式类似 `abc123XYZ`）

### Step 3 — 填入 config.yml

打开 `config.yml`，找到：

```yaml
analytics:
  google:
    SiteVerificationTag: "" # 在 Google Search Console 获取 HTML 标签验证码后填入此处
```

将空字符串替换为你的验证码：

```yaml
SiteVerificationTag: "abc123XYZ你的验证码"
```

提交代码并等待 Netlify 部署完成（约 2-3 分钟）。

### Step 4 — 在 GSC 点击验证

回到 GSC 页面，点击「验证」按钮。验证成功后站点会出现在控制台。

### Step 5 — 提交 Sitemap

1. 在左侧菜单点击「站点地图」
2. 在输入框中输入 `sitemap.xml`
3. 点击「提交」

也可以分别提交两个语言 sitemap：
- `en/sitemap.xml`
- `zh/sitemap.xml`

### Step 6 — 等待抓取数据

- 验证后 **48-72 小时**内开始出现抓取数据
- 7 天内「覆盖率」报告会显示已编入索引的页面数量
- 关注「网页体验」报告中的 Core Web Vitals 评分

---

## 提交后需要关注的指标

| 指标 | 位置 | 目标值 |
|------|------|--------|
| 已编入索引页面数 | 覆盖率 → 有效 | ≥ 600 |
| 未编入索引原因 | 覆盖率 → 排除 | 无「已抓取 - 目前未编入索引」堆积 |
| LCP | 网页体验 | < 2.5s |
| CLS | 网页体验 | < 0.1 |
| 点击率（CTR） | 效果 → 查询 | 监控趋势 |

---

## 注意事项

- GSC 数据有 **2-3 天延迟**，提交后不会立即显示
- 如果站点之前没有 GSC 数据，初次索引可能需要 1-2 周
- 验证码只需填写一次，不影响页面展示
