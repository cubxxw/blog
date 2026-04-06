# check-posts — 文章发布质量检查

对 `$ARGUMENTS` 指定的文章文件（或默认扫描最近修改的文章）执行完整质量检查清单。

## 检查范围

若提供了路径参数则只检查该文件；若未提供参数，则扫描 `content/` 下最近 7 天内修改的所有 `.md` 文件。

## 执行步骤

### 1. 定位目标文章

```bash
# 有参数时直接使用
TARGET="$ARGUMENTS"

# 无参数时扫描最近修改
find content/ -name "*.md" -newer <(date -v-7d +%Y-%m-%d) 2>/dev/null | head -20
```

### 2. 逐项检查（对每篇文章）

读取文件，然后逐一验证：

#### Front Matter 检查
- **格式正确**：确认存在 `---` 开头的 YAML front matter
- **date 时区**：`date` 字段必须包含 `+08:00`（上海时区），不得缺失偏移
- **发布时间**：`date` 不能是未来时间（除非 draft: true）
- **draft 状态**：翻译未完成的文章应设置 `draft: true`

#### 内容质量检查
- **description 无 Markdown**：description 字段不含 `**`、`#`、`_`、`` ` `` 等符号
- **标签规范**：所有 tags 符合 `config/tags-mapping.json` 中的 canonical 命名（Title Case，优先英文）
- **标签黑名单**：不含 `tags_to_remove` 列表中的无效标签
- **keywords**：建议存在 keywords 字段

#### 双语完整性检查
- 若文件在 `content/zh/`，检查对应的 `content/en/` 路径是否存在同名文件，反之亦然
- 对应文件若存在，检查其内容不为空（排除只有 front matter 的占位文件）

#### 可选项检查
- **cover image**：front matter 中是否有 `cover` 字段（提示但不报错）

### 3. 输出结果

为每篇文章打印检查结果，格式如下：

```
📄 content/zh/ai-technology/posts/my-article.md
  ✅ Front matter 格式正确
  ✅ date 包含 +08:00
  ❌ date 是未来时间: 2026-05-01T10:00:00+08:00（当前时间之后）
  ✅ description 无 Markdown 符号
  ⚠️  tags 含非规范名称: ["golang"] → 应为 "Go"
  ✅ 双语对应文件存在
  ⚠️  无 cover image（可选）

📊 汇总: 1 篇文章，1 个错误，2 个警告
```

### 4. 标签治理补充检查（全局，无参数时执行）

扫描所有文章，统计：
- 出现次数 = 1 的孤立标签（⚠️ 提示）
- 与 `canonical_tags` aliases 匹配但未使用 canonical 名称的标签（❌ 报错）

### 5. 给出修复建议

对每个 ❌ 错误给出具体的修复命令或操作建议，例如：
- 时区问题 → 给出正确的 date 格式示例
- 标签问题 → 给出替换命令 `sed -i 's/golang/Go/g' <file>`
- 双语缺失 → 提示创建命令

## 注意事项

- 使用 Read 工具读取文件内容，不要用 cat
- 时间比较以当前系统时间为准（Asia/Shanghai）
- 检查完成后不自动修改文件，只报告问题并给出建议
- 标签规范参考：`config/tags-mapping.json`
