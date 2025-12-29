# 自动语言检测和重定向功能

## 功能简介

本功能会根据用户浏览器的语言设置，自动跳转到对应的语言版本：

- 中文用户 → `/zh/`（简体中文）
- 英文用户 → `/`（英文，默认）

## 支持的语言检测

### 简体中文 (`/zh/`)
- `zh`
- `zh-CN`
- `zh-Hans`
- `zh-TW`
- `zh-HK`
- `zh-MO`
- `zh-Hant`

### 英文 (`/`)
- `en`
- `en-US`
- `en-GB`
- `en-AU`
- `en-CA`
- 其他未识别的语言（默认）

## 工作原理

1. **首次访问检测**：只在访问网站根路径（`/`）时执行语言检测
2. **用户偏好记忆**：使用 localStorage 记住用户的语言选择，避免重复跳转
3. **智能跳转**：根据浏览器 `navigator.language` 自动选择最合适的语言版本

## 手动语言切换

用户可以通过以下方式手动切换语言：

### 1. 使用语言切换器组件
在需要的地方添加语言切换器：
```hugo
{{- partial "language-switcher.html" . -}}
```

### 2. 使用JavaScript API
在浏览器控制台或脚本中：
```javascript
// 设置语言偏好
setLanguagePreference('zh');     // 切换到简体中文
setLanguagePreference('en');     // 切换到英文

// 清除语言偏好（下次访问将重新检测）
clearLanguagePreference();

// 强制重新检测语言
forceLanguageDetection();

// 获取当前语言偏好
getLanguagePreference();
```

## 调试模式

开启调试模式来查看详细的语言检测过程：

```javascript
// 在浏览器控制台中执行
enableLangRedirectDebug();

// 或者在页面加载前设置
window.langRedirectDebug = true;
```

开启后，控制台会显示详细的检测日志：
- 当前路径
- 浏览器语言设置
- 语言匹配过程
- 最终选择的目标语言
- 重定向URL

## 文件结构

```
static/
├── js/
│   └── lang-redirect.js          # 主要的语言检测脚本
layouts/
├── partials/
│   ├── extend_head.html          # 在页面头部加载脚本
│   └── language-switcher.html    # 语言切换器组件
```

## 配置说明

在 `config.yml` 中的相关配置：

```yaml
DefaultContentLanguage: en
defaultContentLanguageInSubdir: false
languages:
  en:
    weight: 1
    languageName: English
    contentDir: "content/en"
  zh:
    weight: 2
    languageName: 简体中文
    contentDir: "content/zh"
```

## 注意事项

1. **避免无限循环**：脚本使用 localStorage 记住用户选择，避免重复跳转
2. **SEO友好**：使用 `window.location.replace()` 不会在浏览器历史中留下记录
3. **性能优化**：只在根路径执行检测，其他页面不受影响
4. **用户体验**：记住用户的语言选择，除非手动清除或重置

## 测试方法

1. **清除浏览器数据**：清除 localStorage 和 cookies
2. **修改浏览器语言**：在浏览器设置中修改首选语言
3. **访问网站根路径**：直接访问 `https://your-domain.com/`
4. **观察跳转行为**：检查是否跳转到正确的语言版本

## 故障排除

### 问题：脚本不工作
- 检查浏览器控制台是否有JavaScript错误
- 确认 `lang-redirect.js` 文件可以正常访问
- 开启调试模式查看详细日志

### 问题：重复跳转
- 检查 localStorage 中的 `lang-preference` 值
- 使用 `clearLanguagePreference()` 清除偏好设置

### 问题：跳转到错误的语言
- 检查浏览器的语言设置
- 查看控制台中的检测日志
- 验证语言映射配置是否正确

## 自定义扩展

### 添加新语言支持
在 `lang-redirect.js` 中的 `langMap` 对象添加新的映射：

```javascript
const langMap = {
    // 现有映射...
    'fr': 'fr',        // 法语
    'de': 'de',        // 德语
    'ja': 'ja',        // 日语
    // ...
};
```

### 修改检测逻辑
可以修改语言检测的优先级和匹配规则，以适应特定需求。 