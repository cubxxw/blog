+++
title = '重新搭建我的博客（静态）'
date = 2023-09-13T21:53:16+08:00
description = "这个是一个正式的页面"
draft = true
+++

# 重新搭建我的博客（静态）

冤大头回来了 …

太难了这次，准备简历的时候，发现我的博客没了，我最亲爱的，陪伴了一年的，备受好评的博客 [nsddd.top](nsddd.top) 牺牲了 呜呜呜呜

别急别急，吸取教训，第一件事是什么，坚决不用动态博客了，从大一的第一代博客使用 workpress， 那时候用的服务器管理工具是 著名顶顶的 宝塔 ， 虽然现在我还在用，哈哈哈，不过以后绝对绝对不会再用了 。第二代博客还记得吗 ，第二代博客就是我刚刚牺牲掉的博客，使用 docker 搭建，存活了两年（大二到大三），服务器中途都换了一次，不过得益于 Docker 优雅的移植性haha，所以我的博客得以存活。

那这次为啥挂了？？？ 挂的时间是 2023 年 9 月 1 日。原因是 Java 出现故障，发现 swtich 空间不足，然后，准备移植的，修复的，实在是觉得无力维护，我希望我的博客可以长久生存几年，十几年，甚至是几十年上百年。

所以，从头开始 !!! 



## 选择合适的博客模板

之前用过 vuepress 做笔记，vuepress 相对来说不是特别合适我现在做的，因为已经有视觉疲惫了哈哈哈，看着很不舒服，所以用我很喜欢的一个开源项目，大家很多人也耳熟能详的顶级开源项目：hugo ,  GitHub 地址是：https://github.com/gohugoio/hugo

接下来就是选择合适的主题了，我参考了几个热门的 theme 选择了 https://github.com/adityatelange/hugo-PaperMod

### 安装 Hugo

我热衷于源码，可以随时改代码，提 PR ，于是用源码构建：

```bash
❯ git clone https://github.com/cubxxw/hugo.git
❯ cd hugo 
❯ go build
❯ mv hugo /usr/bin
```

### 部署主题

选择我们使用的主题：

```bash
❯ git clone https://github.com/adityatelange/hugo-PaperMod themes/PaperMod --depth=1

# 如果希望后面更新主题
❯ cd themes/PaperMod
❯ git pull
```



**使用 git [submodule](https://www.atlassian.com/git/tutorials/git-submodule) with**

> 代码可能是要提交到 Github 的，所以外模块包含子项目的 git 可以用 git submodule 来管理。

```bash
❯ git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod
❯ git submodule update --init --recursive # needed when you reclone your repo (submodules may not get cloned automatically)
```

> **Note**: You may use ` --branch v7.0` to end of above command if you want to stick to specific release.

**用方法2更新主题**:

> ```bash
> ❯ git submodule update --remote --merge
> ```



**添加主题到 hugo.toml 中：**

推荐使用 yaml 或者是 toml ，我比较喜欢用 yaml 哈哈，当然，用 https://tooltt.com/yaml2toml/ 工具可以随便转换

```toml
baseURL = 'https://nsddd.top'
languageCode = 'en-us'
title = 'cubxxw is blog'
theme = "PaperMod"

enableRobotsTXT = true
buildDrafts = false
buildFuture = false
buildExpired = false
googleAnalytics = "UA-123-45"
pygmentsUseClasses = true

[minify]
disableXML = true
minifyOutput = true

[params]
env = "production"
title = "ExampleSite"
description = "ExampleSite description"
keywords = [ "Blog", "Portfolio", "PaperMod" ]
author = "Me"
images = [ "<link or path of image for opengraph, twitter-cards>" ]
DateFormat = "January 2, 2006"
defaultTheme = "auto"
disableThemeToggle = false
ShowReadingTime = true
ShowShareButtons = true
ShowPostNavLinks = true
ShowBreadCrumbs = true
ShowCodeCopyButtons = false
ShowWordCount = true
ShowRssButtonInSectionTermList = true
UseHugoToc = true
disableSpecial1stPost = false
disableScrollToTop = false
comments = false
hidemeta = false
hideSummary = false
showtoc = false
tocopen = false

  [params.assets]
  favicon = "<link / abs url>"
  favicon16x16 = "<link / abs url>"
  favicon32x32 = "<link / abs url>"
  apple_touch_icon = "<link / abs url>"
  safari_pinned_tab = "<link / abs url>"

  [params.label]
  text = "Home"
  icon = "/apple-touch-icon.png"
  iconHeight = 35

  [params.profileMode]
  enabled = false
  title = "ExampleSite"
  subtitle = "This is subtitle"
  imageUrl = "<img location>"
  imageWidth = 120
  imageHeight = 120
  imageTitle = "my image"

    [[params.profileMode.buttons]]
    name = "Posts"
    url = "posts"

    [[params.profileMode.buttons]]
    name = "Tags"
    url = "tags"

  [params.homeInfoParams]
  Title = "Hi there 👋"
  Content = "Welcome to my blog"

  [[params.socialIcons]]
  name = "twitter"
  url = "https://twitter.com/"

  [[params.socialIcons]]
  name = "stackoverflow"
  url = "https://stackoverflow.com"

  [[params.socialIcons]]
  name = "github"
  url = "https://github.com/"

[params.analytics.google]
SiteVerificationTag = "XYZabc"

[params.analytics.bing]
SiteVerificationTag = "XYZabc"

[params.analytics.yandex]
SiteVerificationTag = "XYZabc"

  [params.cover]
  hidden = true
  hiddenInList = true
  hiddenInSingle = true

  [params.editPost]
  URL = "https://github.com/<path_to_repo>/content"
  Text = "Suggest Changes"
  appendFilePath = true

  [params.fuseOpts]
  isCaseSensitive = false
  shouldSort = true
  location = 0
  distance = 1_000
  threshold = 0.4
  minMatchCharLength = 0
  keys = [ "title", "permalink", "summary", "content" ]

[[menu.main]]
identifier = "categories"
name = "categories"
url = "/categories/"
weight = 10

[[menu.main]]
identifier = "tags"
name = "tags"
url = "/tags/"
weight = 20

[[menu.main]]
identifier = "example"
name = "example.org"
url = "https://example.org"
weight = 30

[markup.highlight]
noClasses = false
```



**然后就是创建一个文件：**

>  样本`Page.md`

```markdown
---
title: "My 1st post"
date: 2020-09-15T11:30:03+00:00
# weight: 1
# aliases: ["/first"]
tags: ["first"]
author: "Me"
# author: ["Me", "You"] # multiple authors
showToc: true
TocOpen: false
draft: false
hidemeta: false
comments: false
description: "Desc Text."
canonicalURL: "https://canonical.url/to/page"
disableHLJS: true # to disable highlightjs
disableShare: false
disableHLJS: false
hideSummary: false
searchHidden: true
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
cover:
    image: "<image path/url>" # image path/url
    alt: "<alt text>" # alt text
    caption: "<text>" # display caption under cover
    relative: false # when using page bundles set this to true
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/<path_to_repo>/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---
```

可以通过创建来使用它`archetypes/post.md`

```bash
❯ hugo new --kind post archetypes/Page.md
```



**下面的所有例子都使用 `yml/yaml` 格式，我建议使用 `yml` 而不是 `toml` ，因为它更容易阅读。**

当然，作为云原生的配置文件， yaml 比 toml 更加受到我的 love :love_letter:



### hugo 的基础命令

**添加内容：**

你可以使用 `hugo new` 命令来添加新的内容，例如：

```bash
❯ hugo new posts/my-first-post.md
```

这个命令会在生成 `content/posts/my-first-post.md` 文件，

然后，编辑 `content/posts/my-first-post.md` 文件，添加你的内容。



**生成所有的内容：**

```
❯ hugo
```

> 上述命令会生成所有的页面，并把它们放在 `public/` 目录中。



**你可以使用 `hugo server` 命令来本地预览你的网站：**

```bash
❯ hugo server -D
```

`-D` 参数意味着包括草稿内容。然后，在浏览器中访问 `http://localhost:1313` 来查看你的站点。



**定义路径**

默认的情况下，路径是强相关的，比如说你在哪个目录中定义，那么路径就是这个目录的路径，但是这并不是绝对的。

比如说上面：

```bash
❯ hugo new posts/my-first-post.md
```

该帖子的默认访问URL通常会是：

+ http://localhost:1313/posts/my-first-post/

注意以下几点：

1. **末尾的斜杠**：Hugo默认生成的是"pretty URLs"，这意味着它们会以斜杠结尾。你可以在Hugo的配置文件中修改这一行为。
2. **草稿和发布**：新创建的帖子默认是草稿状态（在帖子的头部信息中，`draft: true`）。如果你使用`hugo server`来预览你的站点，并没有加`-D`参数，你是看不到草稿的。为了预览草稿内容，你需要使用`hugo server -D`。
3. **自定义路径**：如果你想要为特定的帖子定义一个自定义的路径，你可以在该帖子的头部信息（front matter）中使用`url`属性来指定。



## 主题配置

接下来的环境，开始我们的主题配置，主题的配置使得 hugo 的主题得以丰富



### 默认主题 暗/亮

```yaml
params:
    # defaultTheme: light
    # defaultTheme: dark
    defaultTheme: auto # to switch between dark or light according to browser theme
```



### Archives 布局

在 `content` 目录中创建一个带有 `archive.md` 的页面，内容如下

```bash
.
├── config.yml
├── content/
│   ├── archives.md   <--- Create archive.md here
│   └── posts/
├── static/
└── themes/
    └── PaperMod/
```

并添加以下内容:

```bash
---
title: "Archive"
layout: "archives"
url: "/archives/"
summary: archives
---
```

注意：**Archives** 布局不支持多语言月份翻译。



### 启动

**使用 `hugo server` 启动：**

```bash
❯ hugo server
```

然后访问：http://localhost:1313/ 

![image-20230913222054387](http://sm.nsddd.top/sm202309132220842.png)

点击 **月亮** ，支持设置 **明暗** 。



### 常规模式（默认模式）

使用第1个条目作为某些信息:

```yaml
  homeInfoParams:
    Title: Hi there 👋
    Content: My name is Xinwei(bear) Xiong. My loyalty is to adventure 🤖
  socialIcons:
    - name: twitter
      url: https://twitter.com/xxw3293172751
    - name: stackoverflow
      url: https://stackoverflow.com/users/17393425/xinwei-xiong
    - name: github
      url: https://github.com/cubxxw
    - name: zhihu
      url: https://www.zhihu.com/people/3293172751
    - name: linkedin
      url: https://www.linkedin.com/in/cubxxw
    - name: bilibili
      url: https://space.bilibili.com/1233089591
    - name: youtube
      url: https://https//www.youtube.com/channel/UCd3qbRbMwYlh5uKneo_2m_w
    - name: liberapay
      url: https://liberapay.com/xiongxinwei/donate
    - name: email
      url: https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=3293172751nss@gmail.com
    - name: weibo
      url: https://weibo.com/u/6248930985
```

 

### Profile模式

将 Index/Home 显示为带有社交链接和图像的完整页面

在配置文件中添加以下内容:

```go
params:
    profileMode:
        enabled: true
        title: "<Title>" # optional default will be site title
        subtitle: "This is subtitle"
        imageUrl: "<image link>" # optional
        imageTitle: "<title of image as alt>" # optional
        imageWidth: 120 # custom size
        imageHeight: 120 # custom size
        buttons:
            - name: Archive
            url: "/archive"
            - name: Github
            url: "https://github.com/"

    socialIcons: # optional
        - name: "<platform>"
            url: "<link>"
        - name: "<platform 2>"
            url: "<link2>"
```



### BreadCrumb 导航

在文章标题上方添加 BreadCrumb 导航，以显示子章节和主页导航

```yaml
params:
    ShowBreadCrumbs: true
```

可以禁用特定页面的封面:

```yaml
---
ShowBreadCrumbs: false
---
```



### 编辑帖子链接

添加一个按钮，通过使用文章的文件路径链接到编辑目的地来建议更改。

对于站点配置用途：

```yaml
Params:
    editPost:
        URL: "https://github.com/<gitlab user>/<repo name>/tree/<branch name>/<path to content>/"
        Text: "Suggest Changes" # edit text
        appendFilePath: true # to append file path to Edit link
```

可针对单个页面进行修改:

```yaml
---
editPost:
    URL: "https://github.com/<path_to_repo>/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---
```



### Icons 表情 & 图标

+ https://github.com/adityatelange/hugo-PaperMod/wiki/Icons



### 配置文件变量

+ https://github.com/adityatelange/hugo-PaperMod/wiki/Variables
