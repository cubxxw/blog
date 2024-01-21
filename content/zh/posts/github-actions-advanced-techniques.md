---
title: 'GitHub Actions 的高级技巧'
description: 一些示例涵盖了 GitHub Actions 的高级功能。
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-06-14T16:17:02+08:00
draft : false
showtoc: true
tocopen: true
author: ["熊鑫伟", "Me"]
keywords: []
tags:
  - blog
  - zh
  - actions
  - cicd
categories:
  - Development
  - Blog
  - Github
---


## 创建 actions

**actions 是可以联合收割机以创建作业和自定义工作流的单个任务。您可以创建自己的操作，或使用和自定义GitHub社区共享的操作。**

可以通过编写自定义代码来创建操作，这些代码可以以您喜欢的任何方式与您的存储库进行交互，包括与GitHub的API和任何公开可用的第三方API集成。

可以编写自己的操作以在工作流中使用，或与GitHub社区共享您构建的操作。要与所有人共享您构建的操作，您的存储库必须是公共的。

操作可以直接在机器上或Docker容器中运行。您可以定义操作的输入、输出和环境变量。

可以构建Docker容器、JavaScript和复合操作。操作需要一个元数据文件来定义操作的输入、输出和主入口点。元数据文件名必须为 `action.yml` 或 `action.yaml` 。有关更多信息，请参阅“GitHub操作的元数据语法。“



## docker 容器操作

Docker容器用GitHub Actions代码打包环境。这创建了一个更加一致和可靠的工作单元，因为操作的使用者不需要担心工具或依赖项。

Docker容器允许您使用特定版本的操作系统、依赖项、工具和代码。对于必须在特定环境配置中运行的操作，Docker是理想的选择，因为您可以自定义操作系统和工具。



## 对操作进行发布管理

如果您正在开发供其他人使用的操作，我们建议使用发布管理来控制分发更新的方式。

用户可以期望操作的修补程序版本包括必要的关键修复程序和安全修补程序，同时仍与其现有工作流保持兼容。每当您的更改影响兼容性时，您应该考虑发布新的主版本。

在这种发布管理方法下，用户不应该引用操作的默认分支，因为它可能包含最新的代码，因此可能不稳定。

相反，您可以建议用户在使用您的操作时指定一个主要版本，并且仅在遇到问题时才将他们引导到更具体的版本。

要使用特定的操作版本，用户可以配置他们的GitHub操作工作流，以针对标签，提交的SHA或以发布命名的分支。



## 使用标签进行发布管理

我们建议使用标签进行操作发布管理。使用此方法，您的用户可以轻松区分主版本和次版本：

+ 在创建发布标签（例如 `v1.0.2` ）之前，在发布分支（例如 `release/v1` ）上创建并验证发布。
+ 使用语义版本控制创建发布
  + 文件列表的右侧，单击**Releases**
  + 页面顶部，单击**草拟新版本**。
  + 要为发布选择标签，请选择**选择标签**下拉菜单。
  + 如果您创建了一个新标签，请选择**目标**下拉菜单，然后单击包含您要发布的项目的分支。
  + 在“描述此版本”字段中，为您的版本键入描述。如果您在描述中 `@mention` 任何人，发布的版本将包含一个**贡献者**部分，其中包含所有提及用户的头像列表。或者，您可以通过单击生成发行说明自动**生成发行说明**。
  + 或者，要在您的版本中包含二进制文件（例如已编译的程序），请在二进制文件框中拖放或手动选择文件
  + 或者，选择**设置为最新版本**。如果不选择此选项，将根据语义版本控制自动分配最新版本标签。
  + 如果您准备好发布您的版本，请单击**发布版本**。要稍后处理该版本，请单击**保存草稿**。然后，您可以在存储库的发布提要中查看已发布或草稿的发布。有关详细信息，请参阅“[查看存储库的版本和标签](https://docs.github.com/en/repositories/releasing-projects-on-github/viewing-your-repositorys-releases-and-tags)”。
+ 移动major version标签（例如 `v1` 、 `v2` ），指向当前版本的Git ref。例如：` git tag -a v1.4 -m "my version 1.4"`
+ 引入新的主要版本标记（ `v2` ），用于将破坏现有工作流的更改。例如，更改操作的输入将是一个突破性的更改。
+ 主要版本最初可以使用 `beta` 标签发布，以指示其状态，例如 `v2-beta` 。 `-beta` 标签可以在准备好时移除。

### 带有查询参数的发布表单自动化

> 要通过使用自定义信息自动填充新发布表单来快速创建发布，您可以将查询参数添加到发布表单页面的 URL。

查询参数是 URL 的可选部分，您可以自定义以共享特定网页视图，例如搜索筛选结果、问题模板或 GitHub 上的发布表单页面。要创建自己的查询参数，您必须匹配键值对。

| 查询参数     | 例子                                                         |
| :----------- | :----------------------------------------------------------- |
| `tag`        | `https://github.com/octo-org/octo-repo/releases/new?tag=v1.0.1`基于名为“v1.0.1”的标签创建一个版本。 |
| `target`     | `https://github.com/octo-org/octo-repo/releases/new?target=release-1.0.1`根据对“release-1.0.1”分支的最新提交创建一个版本。 |
| `title`      | `https://github.com/octo-org/octo-repo/releases/new?tag=v1.0.1&title=octo-1.0.1`基于名为“v1.0.1”的标签创建名为“octo-1.0.1”的版本。 |
| `body`       | `https://github.com/octo-org/octo-repo/releases/new?body=Adds+widgets+support`在发布正文中创建一个带有描述“添加小部件支持”的发布。 |
| `prerelease` | `https://github.com/octo-org/octo-repo/releases/new?prerelease=1`创建一个将被标识为非生产就绪的版本。 |



### 如何引用版本

此示例演示了用户如何引用主要版本标记：

```
steps:
    - uses: actions/javascript-action@v1
```

此示例演示了用户如何引用特定的修补程序版本标记：

```
steps:
    - uses: actions/javascript-action@v1.0.1
```



## 使用分支进行版本管理

如果您更喜欢使用分支名称进行发布管理，则此示例演示如何引用命名分支：

```yaml
steps:
    - uses: actions/javascript-action@v1-beta
```



## 使用提交的SHA进行发布管理

每个Git提交都会收到一个计算出来的SHA值，这个值是唯一的，不可变的。你的动作的用户可能更喜欢依赖于提交的SHA值，因为这种方法比指定一个标签更可靠，而标签可能会被删除或移动。

但是，这意味着用户将不会收到对操作的进一步更新。您必须使用提交的完整SHA值，而不是缩写值。

```yaml
steps:
    - uses: actions/javascript-action@a824008085750b8e136effc585c3cd6082bd575f
```



##  GitHub actions 和 GitHub apps 的对比

虽然GitHub Actions和GitHub Apps都提供了构建自动化和工作流工具的方法，但它们各自都有优势，使它们在不同的方面发挥作用。

**GitHub apps：**

- 持续运行，并能快速响应事件。
- 在需要持久性数据时工作出色。
- 最适合不耗时的API请求。
- 在您提供的服务器或计算基础架构上运行。

**GitHub actions：**

- 提供可执行持续集成和持续部署的自动化。
- 可以直接在runner机器或Docker容器中运行。
- 可以包括对存储库的克隆的访问，从而使部署和发布工具、代码格式化程序和命令行工具能够访问代码。
- 不需要部署代码或提供应用程序。
- 有一个简单的界面来创建和使用secret，它使操作能够与第三方服务交互，而无需存储使用操作的人的凭据。



## 创建 docker 容器 actions

你将了解创建和使用打包的Docker容器操作所需的基本组件。为了将本指南的重点放在打包操作所需的组件上，操作代码的功能是最小的。



### Creating a Dockerfile

在新的 `hello-world-docker-action` 目录中，创建一个新的 `Dockerfile` 文件。如果您遇到问题，请确保文件名的大写正确（使用大写 `D` 而不是大写 `f` ）。

```go
# Container image that runs your code
FROM alpine:3.10

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]
```



### 元数据 actions 语法

所有操作都需要一个元数据文件。元数据文件名必须是`action.yml`或`action.yaml`. 元数据文件中的数据为您的操作定义输入、输出和运行配置。

+ name：**必填**。您的操作的名称。`name`GitHub在**操作**选项卡中显示，以帮助直观地识别每个作业中的操作。
+ description：*可选*。对您的操作进行简短的描述。GitHub将在操作的详细信息页面上显示此描述。
+ author：*可选*。操作的作者或组织名称。
+ inputs：*可选*。定义操作的输入参数。每个输入都是一个键值对，其中键是参数名称，值是描述该参数的属性。属性包括`description`、`required`和`default`。
+ outputs：*可选*。定义操作的输出参数。每个输出都是一个键值对，其中键是参数名称，值是描述该参数的属性。属性包括`description`和`value`。
+ runs：**必填**。定义操作的运行配置。运行配置指定操作应该运行在哪个操作系统和环境中。运行配置包括`using`、`image`和`args`。
+ branding： **可选**您可以使用颜色和[羽毛](https://feathericons.com/)图标创建徽章来个性化和区分您的操作。徽章显示在[GitHub Marketplace](https://github.com/marketplace?type=actions)中您的操作名称旁边。



**指定输入：**

```yaml
inputs:
  num-octocats:
    description: 'Number of Octocats'
    required: false
    default: '1'
  octocat-eye-color:
    description: 'Eye color of the Octocats'
    required: true
```

此示例配置两个输入：`num-octocats`和`octocat-eye-color`。输入`num-octocats`不是必需的，默认值为“1”；`octocat-eye-color`是必需的，没有默认值。使用此操作的工作流文件必须使用`with`关键字为 设置输入值`octocat-eye-color`。

当您在工作流文件中指定输入或使用默认输入值时，GitHub 会为输入创建一个名为 的环境变量`INPUT_<VARIABLE_NAME>`。创建的环境变量将输入名称转换为大写字母并将空格替换为`_`字符。

如果 action 是使用[composite](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)编写的，那么它不会自动获取`INPUT_<VARIABLE_NAME>`。如果没有发生转换，您可以手动更改这些输入。

要访问 Docker 容器操作中的环境变量，您必须使用`args`操作元数据文件中的关键字传递输入。有关 Docker 容器操作的操作元数据文件的更多信息，请参阅“[创建 Docker 容器操作](https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action#creating-an-action-metadata-file)”。

例如，如果工作流定义了`num-octocats`和输入，则操作代码可以使用和环境变量`octocat-eye-color`读取输入值。`INPUT_NUM-OCTOCATS INPUT_OCTOCAT-EYE-COLOR`



**参数**：

+ `inputs.<input_id>`: **必需**`string`与输入关联的标识符。的值`<input_id>`是输入元数据的映射。必须`<input_id>`是对象内的唯一标识符`inputs`。必须`<input_id>`以字母 or 开头，`_`并且仅包含字母数字字符 ,`-`或`_`。

+ `inputs.<input_id>.description` : **必需**`string`对输入参数的描述。

- `inputs.<input_id>.required`: 表示该输入参数是否是必需的，如果为 true，则在运行工作流程时必须提供该输入参数的值，否则工作流程将失败。
- `inputs.<input_id>.default`: 表示该输入参数的默认值，如果在运行工作流程时未提供该输入参数的值，则使用该默认值。
- `inputs.<input_id>.env`: 表示将该输入参数的值作为环境变量传递给工作流程中的步骤。例如，可以使用 `${{ env.INPUT_NAME }}` 的方式在步骤中引用该输入参数的值。
- `inputs.<input_id>.group`: 表示将该输入参数分组，可以将多个输入参数分组到同一个组中，以便更好地组织和显示它们。





### 创建操作元数据文件

在上面创建的 `hello-world-docker-action` 目录中创建一个新的 `action.yml` 文件。

```yaml
# action.yml
name: 'Hello World'
description: 'Greet someone and record the time'
inputs:
  who-to-greet:  # id of input
    description: 'Who to greet'
    required: true
    default: 'World'
outputs:
  time: # id of output
    description: 'The time we greeted you'
runs:
  using: 'docker'
  image: 'Dockerfile'
  args:
    - ${{ inputs.who-to-greet }}
```

该元数据定义一个 `who-to-greet` 输入和一个 `time` 输出参数。要将输入传递给Docker容器，您应该使用 `inputs` 声明输入，并在 `args` 关键字中传递输入。您在 `args` 中包含的所有内容都将传递到容器，但为了让用户更好地发现您的操作，我们建议使用输入。

GitHub将从您的 Dockerfile 构建一个镜像，并使用此镜像在新容器中运行命令。



### 编写操作代码

你可以选择任何基本的Docker镜像，因此，你的操作也可以选择任何语言。下面的shell脚本示例使用 `who-to-greet` 输入变量在日志文件中打印"Hello [who-to-greet]"。

接下来，脚本获取当前时间，并将其设置为输出变量，作业中稍后运行的操作可以使用该输出变量。为了让GitHub识别输出变量，你必须将它们写入 `$GITHUB_OUTPUT` 环境文件： `echo "<output name>=<value>" >> $GITHUB_OUTPUT` .有关更多信息，请参阅“GitHub操作的工作流命令。“

1. 在 `hello-world-docker-action` 目录中创建新的 `entrypoint.sh` 文件。

2. 将以下代码添加到 `entrypoint.sh` 文件中。

   ```bash
   #!/bin/sh -l
   
   echo "Hello $1"
   time=$(date)
   echo "time=$time" >> $GITHUB_OUTPUT
   ```

   > 如果 `entrypoint.sh` 执行时没有任何错误，则操作的状态设置为 `success` 。还可以在操作代码中显式设置退出代码，以提供操作的状态。有关详细信息，请参阅“设置操作的退出代码。“

3. 使您的 `entrypoint.sh` 文件可执行。Git提供了一种方法来显式地更改文件的权限模式，这样它就不会在每次有克隆/分叉时都被重置。

   ```bash
   $ git add entrypoint.sh
   $ git update-index --chmod=+x entrypoint.sh
   ```

4. 可选地，要检查git索引中文件的权限模式，请运行以下命令。

   ```bash
   $ git ls-files --stage entrypoint.sh
   ```





## 在工作流中测试您的操作

现在您已经准备好在工作流中测试您的操作了。

- 公共操作可由任何存储库中的工作流使用。

以下工作流代码使用公共 `actions/hello-world-docker-action` 存储库中已完成的hello world操作。将以下工作流示例代码复制到 `.github/workflows/main.yml` 文件中，但用您的存储库和操作名称替换 `actions/hello-world-docker-action` 。您也可以将 `who-to-greet` 输入替换为您的姓名。即使公共操作没有发布到GitHub Marketplace，也可以使用它们。有关更多信息，请参阅“在GitHub Marketplace中发布操作。"

```yaml
on: [push]

jobs:
  hello_world_job:
    runs-on: ubuntu-latest
    name: A job to say hello
    steps:
      - name: Hello world action step
        id: hello
        uses: actions/hello-world-docker-action@v2
        with:
          who-to-greet: 'Mona the Octocat'
      # Use the output from the `hello` step
      - name: Get the output time
        run: echo "The time was ${{ steps.hello.outputs.time }}"

```

从存储库中，单击“操作”选项卡，然后选择最新的工作流运行。在“作业”下或可视化图形中，单击“作业”以打招呼。

单击Hello world操作步骤，您应该会看到“Hello莫纳the Octocat”或您用于 `who-to-greet` 输入的名称打印在日志中。单击获取输出时间以查看时间戳。





## 使用工作流

[GitHub Marketplace](https://github.com/marketplace?type=actions) 是一个中心位置，您可以找到GitHub社区创建的操作。GitHub Marketplace页面允许您按类别过滤操作。

您在工作流中使用的操作可以在以下中定义：

- 与工作流文件相同的存储库
- 任何公共存储库
- Docker Hub上发布的Docker容器镜像



### 在工作流编辑器中浏览Marketplace操作

您可以直接在存储库的工作流编辑器中搜索和浏览操作。从侧边栏中，您可以搜索特定操作、查看特色操作以及浏览特色类别。您还可以查看某个动作从GitHub社区收到的星数。

1. 在存储库中，浏览到要编辑的工作流文件。
2. 在文件视图的右上角，要打开工作流编辑器，请单击 
3. 在编辑器右侧，使用GitHub Marketplace侧边栏浏览操作。与 徽章表明GitHub已将操作的创建者验证为合作伙伴组织。



### 向工作流添加操作向工作流添加操作

可以通过引用工作流文件中的操作将操作添加到工作流中。

您可以将GitHub Actions工作流中引用的操作作为依赖关系在包含工作流的存储库的依赖关系图中查看。有关详细信息，请参阅“[关于依赖关系图](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph)”。



### 从GitHub Marketplace添加操作

操作的列表页包括操作的版本和使用操作所需的工作流语法。
为了保持工作流的稳定，即使对操作进行了更新，您可以通过在工作流文件中指定 Git 或 Docker 标记号来引用要使用的操作版本。

1. 导航到要在工作流中使用的操作。

2. 单击以查看操作的完整市场列表。

3. 在“安装”下，单击 复制工作流语法。

   ![Screenshot of the marketplace listing for an action. The "Copy to clipboard" icon for the action is highlighted with a dark orange outline.](https://docs.github.com/assets/cb-52866/images/help/repository/actions-sidebar-detailed-view.png)

4. 将语法粘贴为工作流中的新步骤。有关更多信息，请参阅“[GitHub操作的工作流语法](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps)。“

5. 如果操作要求您提供输入，请在工作流中设置它们。有关操作可能需要的输入的信息，请参见“[查找和自定义操作”](https://docs.github.com/en/actions/learn-github-actions/finding-and-customizing-actions#using-inputs-and-outputs-with-an-action)。“

您还可以为添加到工作流中的操作启用Dependabot版本更新。有关详细信息，请参阅“[使用Dependabot保持您的操作最新](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot)。“



### 从同一存储库添加操作

如果在工作流文件使用操作的同一存储库中定义了操作，则可以在工作流文件中使用`{owner}/{repo}@{ref}`或`./path/to/dir`语法引用该操作。

存储库文件结构示例：

```
|-- hello-world (repository)
|   |__ .github
|       └── workflows
|           └── my-first-workflow.yml
|       └── actions
|           |__ hello-world-action
|               └── action.yml
```

工作流文件示例：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # This step checks out a copy of your repository.
      - uses: actions/checkout@v3
      # This step references the directory that contains the action.
      - uses: ./.github/actions/hello-world-action
```

`action.yml`文件用于为操作提供元数据。在“[Metadata syntax for GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions).“



### 从其他存储库添加操作

如果某个操作是在与工作流文件不同的存储库中定义的，则可以在工作流文件中使用`{owner}/{repo}@{ref}`语法引用该操作。

操作必须存储在公共存储库中。

```yaml
jobs:
  my_first_job:
    steps:
      - name: My first step
        uses: actions/setup-node@v3
```



### 在Docker Hub上引用容器

如果在Docker Hub上发布的Docker容器镜像中定义了某个操作，则必须在工作流文件中使用`docker://{image}:{tag}`语法引用该操作。为了保护您的代码和数据，我们强烈建议您在将Docker Hub中的Docker容器镜像用于您的工作流程之前，先验证它的完整性。

```yaml
jobs:
  my_first_job:
    steps:
      - name: My first step
        uses: docker://alpine:3.8
```

有关Docker操作的一些示例，请参见[Docker-image.yml工作流](https://github.com/actions/starter-workflows/blob/main/ci/docker-image.yml)和“[创建Docker容器操作](https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action)。“



## action 的基本特征

GitHub Actions允许您自定义工作流，以满足您的应用程序和团队的独特需求。例如使用变量、运行脚本以及在作业之间共享数据和工件。



### 在工作流中使用变量

GitHub Actions包括每个工作流运行的默认环境变量。如果需要使用自定义环境变量，可以在YAML工作流文件中设置这些变量。这个例子演示了如何创建名为`POSTGRES_HOST`和`POSTGRES_PORT`的自定义变量。然后，这些变量可用于`node client.js`脚本。

```yaml
jobs:
  example-job:
      steps:
        - name: Connect to PostgreSQL
          run: node client.js
          env:
            POSTGRES_HOST: postgres
            POSTGRES_PORT: 5432
```



### 向工作流添加脚本

您可以使用操作运行脚本和shell命令，然后在分配的运行器上执行这些命令。这个例子演示了一个动作如何使用`run`关键字在 runner 上执行`npm install -g bats`。

```yaml
jobs:
  example-job:
    steps:
      - run: npm install -g bats
```

例如，要将脚本作为操作运行，可以将脚本存储在存储库中并提供路径和shell类型。

```yaml
jobs:
  example-job:
    steps:
      - name: Run build script
        run: ./.github/scripts/build.sh
        shell: bash
```

有关更多信息，请参阅“[GitHub操作的工作流语法](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun)。“



### 在作业之间共享数据

如果你的作业生成了你想与同一工作流中的另一个作业共享的文件，或者你想保存这些文件以供以后参考，你可以将它们作为工件存储在GitHub中。工件是在构建和测试代码时创建的文件。例如，工件可能包括二进制文件或包文件、测试结果、屏幕截图或日志文件。工件与创建工件的工作流运行相关联，并可由其他作业使用。在一次运行中调用的所有操作和工作流都对该运行的工件具有写访问权限。

例如，您可以创建一个文件，然后将其作为工件上传。

```yaml
jobs:
  example-job:
    name: Save output
    steps:
      - shell: bash
        run: |
          expr 1 + 1 > output.log
      - name: Upload output file
        uses: actions/upload-artifact@v3
        with:
          name: output-log-file
          path: output.log
```

要从单独的工作流运行中下载工件，您可以使用`actions/download-artifact`操作。例如，您可以下载名为`output-log-file`的工件。

```yaml
jobs:
  example-job:
    steps:
      - name: Download a single artifact
        uses: actions/download-artifact@v3
        with:
          name: output-log-file
```

要从同一工作流运行中下载工件，您的下载作业应指定`needs: upload-job-name`，以便在上载作业完成之前不会启动。

有关工件的详细信息，请参见“[将工作流数据存储为工件](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)。“



## context

上下文，关于 github  actions 中的 context 是什么样的

上下文是访问有关工作流运行、变量、运行器环境、作业和步骤的信息的一种方法。每个上下文都是一个包含属性的对象，这些属性可以是字符串或其他对象。

在不同的工作流运行条件下，上下文、对象和属性会有很大差异。例如，仅为矩阵中的作业填充 `matrix` 上下文。

可能还是不是很清楚，我们直接看下何时使用 context：

GitHub Actions包含一个名为context的变量集合和一个名为default变量的类似变量集合。这些变量用于工作流中的不同点：

+ 默认环境变量（Default environment variables）：这些环境变量只存在于执行作业的运行程序上。有关详细信息，请参阅“变量。“
+ 上下文（context）：您可以在工作流中的任何时候使用大多数上下文，包括默认变量不可用时。例如，您可以使用具有表达式的上下文，在将作业路由到运行程序执行之前执行初始处理;这允许您使用带有条件 `if` 关键字的上下文来确定是否应运行某个步骤。一旦作业开始运行，您还可以从正在执行作业的运行程序中检索上下文变量，例如 `runner.os` 。有关可以在工作流中使用各种上下文的位置的详细信息，请参阅 “上下文。“

以下示例演示了如何在作业中一起使用这些不同类型的变量：

```yaml
name: CI
on: push
jobs:
  prod-check:
    if: ${{ github.ref == 'refs/heads/main' }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to production server on branch $GITHUB_REF"
```

在本例中， `if` 语句检查 `github.ref` 上下文以确定当前分支名称;如果名称是 `refs/heads/main` ，则执行后续步骤。 `if` 检查由GitHub Actions处理，只有当结果为 `true` 时，作业才会发送给runner。一旦将作业发送给运行程序，就会执行该步骤，并引用来自运行程序的 `$GITHUB_REF` 变量。



### Context availability

在整个工作流运行过程中，可以使用不同的上下文。例如， `secrets` 上下文可以仅在作业内的某些位置处使用。

此外，某些功能可能仅在某些地方使用。例如， `hashFiles` 函数并不是在任何地方都可用。

| Workflow key 工作流密钥                            | Context 语境                                                 | Special functions 特殊功能                       |
| :------------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------- |
| `run-name`                                         | `github, inputs, vars`                                       | None 无                                          |
| `concurrency`                                      | `github, inputs, vars`                                       | None 无                                          |
| `env`                                              | `github, secrets, inputs, vars`                              | None 无                                          |
| `jobs.<job_id>.concurrency`                        | `github, needs, strategy, matrix, inputs, vars`              | None 无                                          |
| `jobs.<job_id>.container`                          | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.container.credentials`              | `github, needs, strategy, matrix, env, vars, secrets, inputs` | None 无                                          |
| `jobs.<job_id>.container.env.<env_id>`             | `github, needs, strategy, matrix, job, runner, env, vars, secrets, inputs` | None 无                                          |
| `jobs.<job_id>.container.image`                    | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.continue-on-error`                  | `github, needs, strategy, vars, matrix, inputs`              | None 无                                          |
| `jobs.<job_id>.defaults.run`                       | `github, needs, strategy, matrix, env, vars, inputs`         | None 无                                          |
| `jobs.<job_id>.env`                                | `github, needs, strategy, matrix, vars, secrets, inputs`     | None 无                                          |
| `jobs.<job_id>.environment`                        | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.environment.url`                    | `github, needs, strategy, matrix, job, runner, env, vars, steps, inputs` | None 无                                          |
| `jobs.<job_id>.if`                                 | `github, needs, vars, inputs`                                | `always, cancelled, success, failure`            |
| `jobs.<job_id>.name`                               | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.outputs.<output_id>`                | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | None 无                                          |
| `jobs.<job_id>.runs-on`                            | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.secrets.<secrets_id>`               | `github, needs, strategy, matrix, secrets, inputs, vars`     | None 无                                          |
| `jobs.<job_id>.services`                           | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.services.<service_id>.credentials`  | `github, needs, strategy, matrix, env, vars, secrets, inputs` | None 无                                          |
| `jobs.<job_id>.services.<service_id>.env.<env_id>` | `github, needs, strategy, matrix, job, runner, env, vars, secrets, inputs` | None 无                                          |
| `jobs.<job_id>.steps.continue-on-error`            | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.env`                          | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.if`                           | `github, needs, strategy, matrix, job, runner, env, vars, steps, inputs` | `always, cancelled, success, failure, hashFiles` |
| `jobs.<job_id>.steps.name`                         | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.run`                          | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.timeout-minutes`              | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.with`                         | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.steps.working-directory`            | `github, needs, strategy, matrix, job, runner, env, vars, secrets, steps, inputs` | `hashFiles`                                      |
| `jobs.<job_id>.strategy`                           | `github, needs, vars, inputs`                                | None 无                                          |
| `jobs.<job_id>.timeout-minutes`                    | `github, needs, strategy, matrix, vars, inputs`              | None 无                                          |
| `jobs.<job_id>.with.<with_id>`                     | `github, needs, strategy, matrix, inputs, vars`              | None 无                                          |
| `on.workflow_call.inputs.<inputs_id>.default`      | `github, inputs, vars`                                       | None 无                                          |
| `on.workflow_call.outputs.<output_id>.value`       | `github, jobs, vars, inputs`                                 | None 无                                          |



### GitHub context

`github` 上下文包含有关工作流运行和触发运行的事件的信息。您还可以在环境变量中读取大部分 `github` 上下文数据。有关环境变量的详细信息，请参阅“变量。“

| 物业名称                     | 类型      | 描述                                                         |
| :--------------------------- | :-------- | :----------------------------------------------------------- |
| `github`                     | `object`  | 工作流中任何作业或步骤期间可用的顶级上下文。该对象包含下面列出的所有属性。 |
| `github.action`              | `string`  | 当前正在运行的操作的名称或[`id`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsid)步骤的名称。GitHub 会删除特殊字符，并`__run`在当前步骤运行不带`id`. 如果您在同一个作业中多次使用相同的操作，则名称将包含一个后缀，其序列号前面带有下划线。例如，您运行的第一个脚本的名称为`__run`，第二个脚本的名称为`__run_2`。同样，第二次调用`actions/checkout`will 是`actionscheckout2`。 |
| `github.action_path`         | `string`  | 动作所在的路径。此属性仅在复合操作中受支持。您可以使用此路径访问与操作位于同一存储库中的文件，例如通过将目录更改为路径： `cd ${{ github.action_path }}`。 |
| `github.action_ref`          | `string`  | 对于执行操作的步骤，这是正在执行的操作的引用。例如，`v2`.    |
| `github.action_repository`   | `string`  | 对于执行操作的步骤，这是操作的所有者和存储库名称。例如，`actions/checkout`. |
| `github.action_status`       | `string`  | 对于复合操作，复合操作的当前结果。                           |
| `github.actor`               | `string`  | 触发初始工作流运行的用户的用户名。如果工作流运行是重新运行，则该值可能与 不同`github.triggering_actor`。任何工作流重新运行都将使用 的权限`github.actor`，即使发起重新运行的参与者 ( `github.triggering_actor`) 具有不同的权限。 |
| `github.actor_id`            | `string`  | 触发初始工作流程运行的人员或应用程序的帐户 ID。例如，`1234567`. 请注意，这与演员用户名不同。 |
| `github.api_url`             | `string`  | GitHub REST API 的 URL。                                     |
| `github.base_ref`            | `string`  | `base_ref`工作流运行中拉取请求的或目标分支。仅当触发工作流运行的事件为 或 时，此属性才可`pull_request`用。`pull_request_target` |
| `github.env`                 | `string`  | 运行器上从工作流命令设置环境变量的文件的路径。该文件对于当前步骤是唯一的，并且是作业中每个步骤的不同文件。有关更多信息，请参阅“ [GitHub Actions 的工作流程命令](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable)”。 |
| `github.event`               | `object`  | 完整的事件 Webhook 负载。您可以使用此上下文访问事件的各个属性。该对象与触发工作流运行的事件的 Webhook 负载相同，并且对于每个事件都不同。 每个 GitHub Actions 事件的 Webhook 都链接在“[触发工作流的事件](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)”中。例如，对于由事件触发的工作流运行[`push`，该对象包含](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push)[推送 webhook 负载](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads#push)的内容。 |
| `github.event_name`          | `string`  | 触发工作流运行的事件的名称。                                 |
| `github.event_path`          | `string`  | 运行器上包含完整事件 Webhook 负载的文件的路径。              |
| `github.graphql_url`         | `string`  | GitHub GraphQL API 的 URL。                                  |
| `github.head_ref`            | `string`  | `head_ref`工作流运行中拉取请求的或源分支。仅当触发工作流运行的事件为 或 时，此属性才可`pull_request`用。`pull_request_target` |
| `github.job`                 | `string`  | [`job_id`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_id)当前工作的。 注意：此上下文属性由操作运行器设置，并且仅在`steps`作业执行期间可用。否则，该属性的值为`null`。 |
| `github.job_workflow_sha`    | `string`  | 对于使用可重用工作流程的作业，可重用工作流程文件的提交 SHA。 |
| `github.path`                | `string`  | 运行器上从工作流命令设置系统变量的文件的路径`PATH`。该文件对于当前步骤是唯一的，并且是作业中每个步骤的不同文件。有关更多信息，请参阅“ [GitHub Actions 的工作流程命令](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-system-path)”。 |
| `github.ref`                 | `string`  | 触发工作流运行的分支或标签的完整引用。对于 触发的工作流程`push`，这是推送的分支或标签引用。对于 触发的工作流程`pull_request`，这是拉取请求合并分支。对于由 触发的工作流程`release`，这是创建的发布标签。对于其他触发器，这是触发工作流运行的分支或标记引用。仅当分支或标签可用于事件类型时才设置此值。给出的 ref 是完全形成的，这意味着对于分支，格式是，对于拉取请求，格式是，对于标签，格式是。例如，.`refs/heads/<branch_name>``refs/pull/<pr_number>/merge``refs/tags/<tag_name>``refs/heads/feature-branch-1` |
| `github.ref_name`            | `string`  | 触发工作流运行的分支或标签的短引用名称。该值与 GitHub 上显示的分支或标签名称匹配。例如，`feature-branch-1`. |
| `github.ref_protected`       | `boolean` | `true`是否为触发工作流运行的引用配置了分支保护。             |
| `github.ref_type`            | `string`  | 触发工作流运行的引用类型。有效值为`branch`或`tag`。          |
| `github.repository`          | `string`  | 所有者和存储库名称。例如，.`octocat/Hello-World`             |
| `github.repository_id`       | `string`  | 存储库的 ID。例如，`123456789`. 请注意，这与存储库名称不同。 |
| `github.repository_owner`    | `string`  | 存储库所有者的用户名。例如，`octocat`.                       |
| `github.repository_owner_id` | `string`  | 存储库所有者的帐户 ID。例如，`1234567`. 请注意，这与所有者的姓名不同。 |
| `github.repositoryUrl`       | `string`  | 存储库的 Git URL。例如，.`git://github.com/octocat/hello-world.git` |
| `github.retention_days`      | `string`  | 工作流运行日志和工件的保留天数。                             |
| `github.run_id`              | `string`  | 存储库中运行的每个工作流程的唯一编号。如果您重新运行工作流程，此数字不会更改。 |
| `github.run_number`          | `string`  | 存储库中特定工作流程每次运行的唯一编号。对于工作流第一次运行，该数字从 1 开始，并随着每次新运行而递增。如果您重新运行工作流程，此数字不会更改。 |
| `github.run_attempt`         | `string`  | 存储库中特定工作流运行的每次尝试的唯一编号。对于工作流第一次尝试运行，此数字从 1 开始，并随着每次重新运行而递增。 |
| `github.secret_source`       | `string`  | 工作流程中使用的机密的来源。可能的值为`None`、`Actions`、`Codespaces`或`Dependabot`。 |
| `github.server_url`          | `string`  | GitHub 服务器的 URL。例如：.`https://github.com`             |
| `github.sha`                 | `string`  | 触发工作流程的提交 SHA。此提交 SHA 的值取决于触发工作流的事件。有关详细信息，请参阅“[触发工作流的事件](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)”。例如，`ffac537e6cbbf934b08745a378932722df287a53`. |
| `github.token`               | `string`  | 代表存储库上安装的 GitHub 应用程序进行身份验证的令牌。这在功能上等同于`GITHUB_TOKEN`秘密。有关详细信息，请参阅“[自动令牌身份验证](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)”。 注意：此上下文属性由操作运行器设置，并且仅在`steps`作业执行期间可用。否则，该属性的值为`null`。 |
| `github.triggering_actor`    | `string`  | 启动工作流运行的用户的用户名。如果工作流运行是重新运行，则该值可能与 不同`github.actor`。任何工作流重新运行都将使用 的权限`github.actor`，即使发起重新运行的参与者 ( `github.triggering_actor`) 具有不同的权限。 |
| `github.workflow`            | `string`  | 工作流程的名称。如果工作流文件未指定 a `name`，则此属性的值是存储库中工作流文件的完整路径。 |
| `github.workflow_ref`        | `string`  | 工作流程的参考路径。例如，.`octocat/hello-world/.github/workflows/my-workflow.yml@refs/heads/my_branch` |
| `github.workflow_sha`        | `string`  | 工作流文件的提交 SHA。                                       |
| `github.workspace`           | `string`  | 步骤运行器上的默认工作目录，以及使用操作时存储库的默认位置[`checkout`](https://github.com/actions/checkout)。 |



### 一些功能案例

| **特征**                             | **执行**                                                     |
| :----------------------------------- | :----------------------------------------------------------- |
| 触发工作流自动运行                   | [`push`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push) |
| 触发工作流自动运行                   | [`pull_request`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request) |
| 从 UI 手动运行工作流程               | [`workflow_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch) |
| 设置令牌的权限                       | [`permissions`](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs) |
| 控制可以同时运行的工作流程或作业数量 | [`concurrency`](https://docs.github.com/en/actions/using-jobs/using-concurrency) |
| 根据存储库在不同的运行器上运行作业   | [`runs-on`](https://docs.github.com/en/actions/using-jobs/choosing-the-runner-for-a-job) |
| 将您的存储库克隆到运行器             | [`actions/checkout`](https://github.com/actions/checkout)    |
| 安装`node`在转轮上                   | [`actions/setup-node`](https://github.com/actions/setup-node) |
| 使用第三方操作                       | [`trilom/file-changes-action`](https://github.com/trilom/file-changes-action) |
| 在运行器上运行脚本                   | 使用`./script/rendered-content-link-checker.mjs`             |



## actions 高级功能

本节简要介绍 GitHub Actions 的一些高级功能，可帮助您创建更复杂的工作流程。



### 储存秘密

*如果您的工作流程使用敏感数据（例如密码或证书），您可以将这些数据作为机密* 保存在 GitHub 中，然后在工作流程中将它们用作环境变量。这意味着您将能够创建和共享工作流程，而无需将敏感值直接嵌入到工作流程的 YAML 源中。

此示例作业演示了如何引用现有密钥作为环境变量，并将其作为参数发送到示例命令。

```yaml
jobs:
  example-job:
    runs-on: ubuntu-latest
    steps:
      - name: Retrieve secret
        env:
          super_secret: ${{ secrets.SUPERSECRET }}
        run: |
          example-command "$super_secret"
```



### 创造依赖工作

默认情况下，工作流程中的作业全部同时 **并行运行**。如果您的作业必须仅在另一个作业完成后运行，则可以使用关键字`needs`创建此依赖项。如果其中一项作业失败，则跳过所有相关作业；但是，如果您需要继续执行作业，则可以使用`if`条件语句进行定义。

在此示例中，`setup`、`build`和`test`作业串联运行，并且`build`依赖`test`于它们之前的作业是否成功完成：

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - run: ./setup_server.sh
  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - run: ./build_server.sh
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: ./test_server.sh
```

有关详细信息，请参阅“[在工作流程中使用作业](https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow#defining-prerequisite-jobs)”。



### 使用矩阵

矩阵策略允许您在单个作业定义中使用变量来自动创建基于变量组合的多个作业运行。例如，您可以使用矩阵策略在一种语言的多个版本或多个操作系统上测试您的代码。该矩阵是使用`strategy`关键字创建的，该关键字以数组形式接收构建选项。例如，此矩阵将使用不同版本的 Node.js 多次运行作业：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [12, 14, 16]
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
```

有关详细信息，请参阅“[为您的作业使用矩阵](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)”。


### 缓存依赖项

如果您的作业经常重用依赖项，您可以考虑缓存这些文件以帮助提高性能。创建缓存后，同一存储库中的所有工作流都可以使用它。

此示例演示如何缓存`~/.npm`目录：

```yaml
jobs:
  example-job:
    steps:
      - name: Cache node modules
        uses: actions/cache@v3
        env:
          cache-name: cache-node-modules
        with:
          path: ~/.npm
          key: ${{ runner.os }}-build-${{ env.cache-name }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-build-${{ env.cache-name }}-
```

有关详细信息，请参阅“[缓存依赖项以加快工作流程](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)”。



### 使用数据库和服务容器

如果你的工作需要数据库或缓存服务，你可以使用关键字[`services`](https://docs.github.com/en/actions/using-jobs/running-jobs-in-a-container)创建一个临时容器来托管服务；然后，生成的容器可用于该作业中的所有步骤，并在作业完成后被删除。此示例演示了作业如何用于`services`创建`postgres`容器，然后用于`node`连接到服务。

```yaml
jobs:
  container-job:
    runs-on: ubuntu-latest
    container: node:10.18-jessie
    services:
      postgres:
        image: postgres
    steps:
      - name: Check out repository code
        uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Connect to PostgreSQL
        run: node client.js
        env:
          POSTGRES_HOST: postgres
          POSTGRES_PORT: 5432
```

有关详细信息，请参阅“[使用容器化服务](https://docs.github.com/en/actions/using-containerized-services)”。



### 使用标签来路由工作流程

如果您想确保特定类型的运行器将处理您的作业，您可以使用标签来控制作业的执行位置。除了默认标签 之外，您还可以为自托管运行器分配标签`self-hosted`。然后，您可以在 YAML 工作流程中引用这些标签，确保作业以可预测的方式路由。GitHub 托管的运行器已分配预定义标签。

此示例显示工作流如何使用标签来指定所需的运行程序：

```yaml
jobs:
  example-job:
    runs-on: [self-hosted, linux, x64, gpu]
```

工作流将仅在具有`runs-on`数组中所有标签的运行器上运行。该作业将优先转到具有指定标签的空闲自托管运行器。如果没有可用的并且存在具有指定标签的 GitHub 托管运行器，则作业将转到 GitHub 托管运行器。

要了解有关自托管运行器标签的更多信息，请参阅“[将标签与自托管运行器结合使用](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/using-labels-with-self-hosted-runners)”。

要了解有关 GitHub 托管的运行器标签的更多信息，请参阅“[关于 GitHub 托管的运行器](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)”。

### 重用工作流程

您可以从一个工作流程调用另一个工作流程。这使您可以重用工作流程，避免重复并使工作流程更易于维护。有关详细信息，请参阅“[重用工作流程](https://docs.github.com/en/actions/using-workflows/reusing-workflows)”。

### 使用环境

您可以使用保护规则和机密配置环境，以控制工作流中作业的执行。工作流中的每个作业都可以引用单个环境。在将引用环境的作业发送到运行器之前，为环境配置的任何保护规则都必须通过。有关详细信息，请参阅“[使用部署环境](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)”。



## 并发工作

您可以使用它`jobs.<job_id>.concurrency`来确保一次仅运行一个使用相同并发组的作业或工作流。并发组可以是任何字符串或表达式。允许的表达式上下文：[`github`](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context)、[`inputs`](https://docs.github.com/en/actions/learn-github-actions/contexts#inputs-context)、[`vars`](https://docs.github.com/en/actions/learn-github-actions/contexts#vars-context)、[`needs`](https://docs.github.com/en/actions/learn-github-actions/contexts#needs-context)、[`strategy`](https://docs.github.com/en/actions/learn-github-actions/contexts#strategy-context)和[`matrix`](https://docs.github.com/en/actions/learn-github-actions/contexts#matrix-context)。有关表达式的详细信息，请参阅“[表达式](https://docs.github.com/en/actions/learn-github-actions/expressions)”。

您还可以`concurrency`在工作流程级别指定。有关详细信息，请参阅[`concurrency`](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#concurrency)。

当并发作业或工作流排队时，如果使用存储库中相同并发组的另一个作业或工作流正在进行中，则排队的作业或工作流将为`pending`。并发组中任何先前挂起的作业或工作流都将被取消。要同时取消同一并发组中任何当前正在运行的作业或工作流，请指定`cancel-in-progress: true`。

### 示例：使用并发和默认行为

```yaml
concurrency: staging_environment
concurrency: ci-${{ github.ref }}
```

### 示例：使用并发取消任何正在进行的作业或运行

```yaml
concurrency:
  group: ${{ github.ref }}
  cancel-in-progress: true
```



## 容器中运行

用于`jobs.<job_id>.container`创建容器以运行作业中尚未指定容器的任何步骤。如果您有同时使用脚本和容器操作的步骤，则容器操作将作为具有相同卷挂载的同一网络上的同级容器运行。

如果您不设置 a `container`，则所有步骤都将直接在 指定的主机上运行，`runs-on`除非步骤引用配置为在容器中运行的操作。

案例：

```yaml
name: CI
on:
  push:
    branches: [ main ]
jobs:
  container-test-job:
    runs-on: ubuntu-latest
    container:
      image: node:14.16
      env:
        NODE_ENV: development
      ports:
        - 80
      volumes:
        - my_docker_volume:/volume_mount
      options: --cpus 1
    steps:
      - name: Check for dockerenv file
        run: (ls /.dockerenv && echo Found dockerenv) || (echo No dockerenv)
```

当您只指定容器镜像时，可以省略该`image`关键字。

```yaml
jobs:
  container-test-job:
    runs-on: ubuntu-latest
    container: node:14.16
```



## 定义容器镜像

用于`jobs.<job_id>.container.image`定义用作运行操作的容器的 Docker 映像。该值可以是 Docker Hub 映像名称或注册表名称。

如果镜像的容器注册表需要身份验证才能拉取镜像，您可以使用和来`jobs.<job_id>.container.credentials`设置。凭据与您向命令提供的值相同。

map username password [docker login](https://docs.docker.com/engine/reference/commandline/login/)



## 将环境变量与容器一起使用

用于在容器中`jobs.<job_id>.container.env`设置一系列环境变量。`map`



**在容器中安装卷：**

用于`jobs.<job_id>.container.volumes`设置`array`容器使用的卷。您可以使用卷在服务或作业中的其他步骤之间共享数据。您可以在主机上指定命名 Docker 卷、匿名 Docker 卷或绑定安装。

要指定卷，请指定源路径和目标路径：

`<source>:<destinationPath>`。

是`<source>`主机上的卷名称或绝对路径，`<destinationPath>`是容器中的绝对路径。



### 示例：在容器中安装卷

```yaml
volumes:
  - my_docker_volume:/volume_mount
  - /data/my_data
  - /source/directory:/destination/directory
```



## 定义将应用于工作流中的所有作业或作业中所有步骤的默认设置

当使用相同名称定义多个默认设置时，GitHub 将使用最具体的默认设置。例如，作业中定义的默认设置将覆盖在工作流中定义的名称相同的默认设置。



### 设置默认外壳和工作目录

用于 `jobs.<job_id>.defaults` 创建 `map` 将应用于作业中所有步骤的默认设置。您还可以为整个工作流设置默认设置。有关详细信息，请参见 `defaults`  https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#defaults。

当使用相同的名称定义多个默认设置时，GitHub使用最具体的默认设置。例如，在作业中定义的默认设置将覆盖在工作流中定义的同名默认设置。



### 设置作业的默认shell和工作目录

用于 `jobs.<job_id>.defaults.run` 为作业中 `shell` `working-directory` 的所有 `run` 步骤提供默认值。此节中不允许使用上下文和表达式。

可以为作业中的所有步骤提供默认值 `shell` 和 `working-directory` 选项 `run` 。也可以 `run` 为整个工作流设置默认设置。有关详细信息，请参见 `jobs.defaults.run` 。不能在此关键字中使用上下文或表达式。

当使用相同的名称定义多个默认设置时，GitHub使用最具体的默认设置。例如，在作业中定义的默认设置将覆盖在工作流中定义的同名默认设置。



### 设置 `run` 作业的默认步骤选项

```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: bash
        working-directory: scripts
```



## 为作业分配权限

您可以使用 `permissions` 修改授予的默认权限 `GITHUB_TOKEN` ，根据需要添加或删除访问权限，以便仅允许所需的最小访问权限。有关详细信息，请参阅“[自动令牌身份验证。](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)“

您可以将其用作 `permissions` 顶级关键字，以应用于工作流中的所有作业或特定作业内的作业。在 `permissions` 特定作业中添加密钥时，该作业中使用的所有操作和运行命令都将获得 `GITHUB_TOKEN` 您指定的访问权限。有关详细信息，请参见 `jobs.<job_id>.permissions` 。

可用的作用域和访问值：

```yaml
permissions:
  actions: read|write|none
  checks: read|write|none
  contents: read|write|none
  deployments: read|write|none
  id-token: read|write|none
  issues: read|write|none
  discussions: read|write|none
  packages: read|write|none
  pages: read|write|none
  pull-requests: read|write|none
  repository-projects: read|write|none
  security-events: read|write|none
  statuses: read|write|none
```

如果为这些作用域中的任何一个指定了访问权限，则所有未指定的作用域都将设置为 `none` 。

可以使用以下语法定义所有可用作用域的读或写访问权限：

```yaml
permissions: read-all|write-all
```

可以使用以下语法禁用所有可用作用域的权限：

```yaml
permissions: {}
```

您可以使用该密钥添加和删除派生存储库的读取权限，但通常不能授予写入权限。 `permissions` key to add and remove read permissions for forked repositories, but typically you can't grant write access.此行为的例外情况是管理员用户在GitHub Actions设置中选择了“从拉取请求中发送写入令牌到工作流”选项。有关详细信息，请参阅"管理存储库的GitHub操作设置。"



### 为GITHUB_TOKEN分配权限

此示例显示为设置的权限，该权限将应用于工作流中的所有作业。 `GITHUB_TOKEN` 这将适用于工作流中的所有作业。所有权限都被授予读访问权限。

```go
name: "My workflow"

on: [ push ]

permissions: read-all

jobs:
  ...
```



### 示例：设置特定作业的权限

此示例显示为设置的权限，该 `GITHUB_TOKEN` 权限仅适用于名为的作业 `stale` 。和作用域被授予写访问权限 `issues` `pull-requests` 。所有其他作用域都没有访问权限。

```yaml
jobs:
  stale:
    runs-on: ubuntu-latest

    permissions:
      issues: write
      pull-requests: write

    steps:
      - uses: actions/stale@v5
```



## 构建和测试(CI)

**关于持续集成（CI）：**

我们听过很多次 CICD 的大名，分别代表的是 *持续集成*，和 *持续部署*

持续集成（CI）是一种软件实践，需要频繁地将代码提交到共享存储库。更频繁地提交代码可以更快地检测到错误，并减少开发人员在查找错误源时需要调试的代码量。

频繁的代码更新也使得合并来自软件开发团队的不同成员的更改变得更加容易。这对开发人员来说非常好，他们可以花更多的时间编写代码，而花更少的时间调试错误或解决合并冲突。

当您将代码提交到存储库时，您可以不断地构建和测试代码，以确保提交不会引入错误。

测试可以包括代码链接（检查样式格式）、安全检查、代码覆盖率、功能测试和其他自定义检查。

构建和测试代码需要服务器。您可以在将代码推送到存储库之前在本地构建和测试更新，也可以使用CI服务器来检查存储库中的新代码提交。



### 关于使用GitHub Actions进行持续集成

您可以配置CI工作流，使其在GitHub事件发生时（例如，当新代码被推送到存储库时）、按设定的时间表运行，或者使用存储库调度webhook在外部事件发生时运行。

GitHub运行CI测试，并在pull请求中提供每个测试的结果，因此您可以查看分支中的更改是否会引入错误。当工作流中的所有配置项测试都通过时，您推送的更改就可以由团队成员审阅或合并了。

当测试失败时，可能是您的某个更改导致了失败。

当您在存储库中设置CI时，GitHub会分析存储库中的代码，并根据存储库中的语言和框架推荐CI工作流。例如，如果您使用Node.js，GitHub将建议一个启动工作流，用于安装Node.js包并运行测试。您可以使用GitHub建议的CI starter工作流，自定义建议的starter工作流，或创建自己的自定义工作流文件来运行CI测试。

除了帮助您为项目设置CI工作流外，您还可以使用GitHub Actions在整个软件开发生命周期中创建工作流。例如，可以使用操作来部署、打包或发布项目。有关更多信息，请参阅“[学习GitHub操作](https://docs.github.com/en/actions/learn-github-actions)。“



## Starter workflow

GitHub为各种语言和框架提供CI启动工作流。

在 [actions/starter-workflow](https://github.com/actions/starter-workflows/tree/main/ci) 存储库中浏览GitHub提供的CI starter工作流的完整列表。



## 关于持续部署(CD)

持续部署（CD）是使用自动化来发布和部署软件更新的实践。作为典型CD过程的一部分，代码在部署之前会自动构建和测试。

您可以设置GitHub Actions工作流来部署您的软件产品。为了验证产品是否按预期工作，您的工作流可以在存储库中构建代码并在部署之前运行测试。

您可以配置CD工作流，使其在GitHub事件发生时（例如，当新代码被推送到存储库的默认分支时），按照设置的时间表，手动或使用存储库调度webhook发生外部事件时运行。

*接下来我们来学习使用github的 actions 来进行持续部署：*

GitHub Actions提供了一些功能，可以让你控制部署。您可以：

- 使用各种事件触发工作流。
- 配置环境以在作业继续之前设置规则并限制对机密的访问。
- 使用并发控制一次运行的部署数量。



### 触发部署

您可以使用各种事件来触发部署工作流。其中最常见的有： `pull_request` 、 `push` 和 `workflow_dispatch` 。

+ 分支上有一个推力 `main` 。
+ 以分支为目标的拉取请求 `main` 被打开、同步或重新打开。
+ 有人手动触发了它。

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:
```



### 使用并发

并发确保一次只运行使用同一并发组的单个作业或工作流。您可以使用并发性，以便环境中一次最多有一个正在进行的部署和一个挂起的部署。

例如，当以下工作流运行时， `pending` 如果使用并发组的任何作业或工作流 `production` 正在进行，则该工作流将暂停，状态为。它还将取消使用并发组并具有状态的任何作业或工作流 `production` , `pending` 。这意味着在中使用并发组的作业或工作流最多只能有一个正在运行和一个挂 `production` 起。

```yaml
name: Deployment

concurrency: production

on:
  push:
    branches:
      - main

jobs:
  deployment:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: deploy
        # ...deployment-specific steps
```

您还可以在作业级别指定并发性。这将允许工作流中的其他作业继续进行，即使并发作业是 `pending` 。

```yaml
name: Deployment

on:
  push:
    branches:
      - main

jobs:
  deployment:
    runs-on: ubuntu-latest
    environment: production
    concurrency: production
    steps:
      - name: deploy
        # ...deployment-specific steps
```



### Choosing a runner 

您可以在GitHub托管的runner或自托管的runner上运行部署工作流。来自GitHub托管的runner的流量可能来自各种网络地址。如果您正在部署到内部环境，并且您的公司限制外部流量进入专用网络，则在GitHub托管的runner上运行的GitHub Actions工作流可能无法与您的内部服务或资源通信。



## 关于使用 GitHub Actions 进行打包

打包步骤是持续集成或持续交付工作流程的常见部分。在持续集成工作流程结束时创建包可以在拉取请求的代码审查期间提供帮助。

构建和测试代码后，打包步骤可以生成可运行或可部署的工件。根据您正在构建的应用程序的类型，可以在本地下载此包以进行手动测试，可供用户下载，或部署到临时或生产环境。

例如，Java 项目的持续集成工作流程可能会运行`mvn package`以生成 JAR 文件。或者，Node.js 应用程序的 CI 工作流程可能会创建 Docker 容器。

现在，在查看拉取请求时，您将能够查看工作流程运行并下载生成的工件。

![工作流程运行的“工件”部分的屏幕截图。 运行生成的工件的名称“工件”以深橙色轮廓突出显示。](https://docs.github.com/assets/cb-13991/images/help/repository/artifact-drop-down-updated.png)



### 发布包的工作流程

除了上传打包工件以在持续集成工作流程中进行测试之外，您还可以创建构建项目并将包发布到包注册表的工作流程。

- **将包发布到 GitHub Packages** GitHub Packages 可以充当多种类型包的包托管服务。您可以选择与所有 GitHub 共享您的包，也可以选择与协作者或组织共享私有包。更多信息请参阅“ [GitHub 包简介](https://docs.github.com/en/packages/learn-github-packages/introduction-to-github-packages)”。

  您可能希望在每次推送到默认分支时将包发布到 GitHub Packages。这将使项目的开发人员始终能够通过从 GitHub Packages 安装它来轻松运行和测试默认分支的最新版本。

- **将包发布到包注册表** 对于许多项目，每当发布项目的新版本时都会执行向包注册表的发布。例如，生成 JAR 文件的项目可以将新版本上传到 Maven 中央存储库。或者，.NET 项目可能会生成 nuget 包并将其上传到 NuGet Gallery。

  您可以通过创建一个工作流程来自动执行此操作，该工作流程在每次创建版本时将包发布到包注册表。有关详细信息，请参阅“[管理存储库中的版本](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)”。



### 发布 Docker 镜像

每次在 GitHub 上创建新版本时，您都可以触发工作流程来发布图像。以下示例中的工作流在活动类型`release`的事件触发时运行`created`。有关该`release`事件的详细信息，请参阅“[触发工作流的事件](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#release)”。

在下面的示例工作流程中，我们使用 Docker `login-action` 和 `build-push-action` 操作来构建 Docker 映像，如果构建成功，则将构建的映像推送到 Docker Hub。

要推送到 Docker Hub，您需要有一个 Docker Hub 帐户，并创建一个 Docker Hub 存储库。有关更多信息，请参阅Docker 文档中的“[将 Docker 容器映像推送到 Docker Hub ”。](https://docs.docker.com/docker-hub/repos/#pushing-a-docker-container-image-to-docker-hub)

`login-action` Docker Hub 所需的选项是：

- `username`和`password`：这是您的 Docker Hub 用户名和密码。我们建议将您的 Docker Hub 用户名和密码存储为机密，这样它们就不会在您的工作流程文件中公开。有关详细信息，请参阅“[加密的机密](https://docs.github.com/en/actions/security-guides/encrypted-secrets)”。

`metadata-action`Docker Hub 所需的选项是：

- `images`：您正在构建/推送到 Docker Hub 的 Docker 映像的命名空间和名称。

`build-push-action` Docker Hub 所需的选项是：

- `tags`：新图像格式的标签`DOCKER-HUB-NAMESPACE/DOCKER-HUB-REPOSITORY:VERSION`。您可以如下所示设置单个标签，或在列表中指定多个标签。
- `push`：如果设置为`true`，则镜像构建成功后将被推送到注册表。

```yaml
name: Publish Docker image

on:
  release:
    types: [published]

jobs:
  push_to_registry:
    name: Push Docker image to Docker Hub
    runs-on: ubuntu-latest
    steps:
      - name: Check out the repo
        uses: actions/checkout@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@f4ef78c080cd8ba55a85445d5b36e214a81df20a
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@9ec57ed1fcdbf14dcef7dfbe97b2010124a938b7
        with:
          images: my-docker-hub-namespace/my-docker-hub-repository
      
      - name: Build and push Docker image
        uses: docker/build-push-action@3b5e8027fcad23fda98b2e3ac259d8d67585f671
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

上面的工作流程检查 GitHub 存储库，使用`login-action`登录到注册表，然后使用操作`build-push-action`来： 基于存储库的 构建 Docker 映像`Dockerfile`；将镜像推送到 Docker Hub，并为镜像应用标签。



### 将图像发布到 GitHub 包

每次在 GitHub 上创建新版本时，您都可以触发工作流程来发布图像。以下示例中的工作流在活动类型`release`的事件触发时运行`created`。有关该`release`事件的详细信息，请参阅“[触发工作流的事件](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#release)”。

在下面的示例工作流程中，我们使用 Docker `login-action`、`metadata-action`和`build-push-action`操作来构建 Docker 镜像，如果构建成功，则将构建的镜像推送到 GitHub Packages。

`login-action`GitHub 包所需的选项有：

- `registry`：必须设置为`ghcr.io`。
- `username`：您可以使用`${{ github.actor }}`上下文自动使用触发工作流运行的用户的用户名。有关详细信息，请参阅“[上下文](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context)”。
- `password`：您可以使用自动生成的`GITHUB_TOKEN`密码作为密码。有关详细信息，请参阅“[自动令牌身份验证](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)”。

`metadata-action`GitHub Packages 所需的选项是：

- `images`：您正在构建的 Docker 映像的命名空间和名称。

`build-push-action`GitHub 包所需的选项有：

- `context`：将构建的上下文定义为位于指定路径中的文件集。
- `push`：如果设置为`true`，则镜像构建成功后将被推送到注册表。
- `tags`和`labels`：这些由 的输出填充`metadata-action`。

```yaml
# GitHub recommends pinning actions to a commit SHA.
# To get a newer version, you will need to update the SHA.
# You can also reference a tag or branch, but the action may change without warning.

name: Create and publish a Docker image

on:
  push:
    branches: ['release']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Log in to the Container registry
        uses: docker/login-action@65b78e6e13532edd9afa3aa52ac7964289d1a9c1
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@9ec57ed1fcdbf14dcef7dfbe97b2010124a938b7
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

      - name: Build and push Docker image
        uses: docker/build-push-action@f2a1d5e99d037542a71f64918e516c093c6f3fc4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```



### 将镜像发布到 Docker Hub 和 GitHub 包

在单个工作流程中，您可以通过对每个注册表使用`login-action`和操作将 Docker 映像发布到多个注册表。`build-push-action`

以下示例工作流程使用前面部分（“[将映像发布到 Docker Hub](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images#publishing-images-to-docker-hub) ”和“[将映像发布到 GitHub 包](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images#publishing-images-to-github-packages)”）中的步骤来创建推送到两个注册表的单个工作流程。

```yaml
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.

# GitHub recommends pinning actions to a commit SHA.
# To get a newer version, you will need to update the SHA.
# You can also reference a tag or branch, but the action may change without warning.

name: Publish Docker image

on:
  release:
    types: [published]

jobs:
  push_to_registries:
    name: Push Docker image to multiple registries
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - name: Check out the repo
        uses: actions/checkout@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@f4ef78c080cd8ba55a85445d5b36e214a81df20a
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Log in to the Container registry
        uses: docker/login-action@65b78e6e13532edd9afa3aa52ac7964289d1a9c1
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@9ec57ed1fcdbf14dcef7dfbe97b2010124a938b7
        with:
          images: |
            my-docker-hub-namespace/my-docker-hub-repository
            ghcr.io/${{ github.repository }}
      
      - name: Build and push Docker images
        uses: docker/build-push-action@3b5e8027fcad23fda98b2e3ac259d8d67585f671
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```



## 项目管理

您可以使用 GitHub Actions 通过创建工作流程来自动化项目管理任务。每个工作流包含一系列任务，这些任务在每次工作流运行时自动执行。例如，您可以创建一个工作流程，该工作流程在每次创建问题时运行，以添加标签、留下评论并将问题移至项目板上。



### 添加 labels

本教程演示如何使用工作流中的[`actions/github-script`操作来标记新打开或重新打开的问题。](https://github.com/marketplace/actions/github-script)例如，您可以`triage`在每次打开或重新打开问题时添加标签。然后，您可以通过筛选带有标签的问题来查看需要分类的所有问题`triage`。

该`actions/github-script`操作允许您在工作流程中轻松使用 GitHub API。

**创建工作流程：**

1. 选择要应用此项目管理工作流程的存储库。您可以使用具有写入权限的现有存储库，也可以创建新存储库。有关创建存储库的更多信息，请参阅“[创建新存储库](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)”。
2. 在您的存储库中，创建一个名为 的文件`.github/workflows/YOUR_WORKFLOW.yml`，并替换`YOUR_WORKFLOW`为您选择的名称。这是一个工作流程文件。有关在 GitHub 上创建新文件的更多信息，请参阅“[创建新文件](https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files)”。

```yaml
name: Label issues
on:
  issues:
    types:
      - reopened
      - opened
jobs:
  label_issues:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ["triage"]
            })
```

3. 自定义`script`工作流程文件中的参数：

- 值是使用对象自动设置`issue_number`的。您不需要更改这些。`owner``repo``context`
- 将值更改为`labels`要添加到问题的标签列表。用逗号分隔多个标签。例如，`["help wanted", "good first issue"]`. 有关标签的详细信息，请参阅“[管理标签](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels#applying-labels-to-issues-and-pull-requests)”。

4. 将工作流程文件提交到存储库的默认分支。有关详细信息，请参阅“[创建新文件](https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files)”。



### 在项目板上移动分配的问题

本教程演示如何使用该[`alex-page/github-project-automation-plus`操作](https://github.com/marketplace/actions/github-project-automation)在分配问题时自动将问题移动到项目板上的特定列。例如，分配问题后，您可以将其移至`In Progress`项目板的列中。

### 创建工作流程

1. 选择要应用此项目管理工作流程的存储库。您可以使用具有写入权限的现有存储库，也可以创建新存储库。有关创建存储库的更多信息，请参阅“[创建新存储库](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)”。
2. 在您的存储库中，选择一个项目板。您可以使用现有项目，也可以创建新项目。有关创建项目的更多信息，请参阅“[创建项目（经典）](https://docs.github.com/en/issues/organizing-your-work-with-project-boards/managing-project-boards/creating-a-project-board) ”。
3. 在您的存储库中，创建一个名为 的文件`.github/workflows/YOUR_WORKFLOW.yml`，并替换`YOUR_WORKFLOW`为您选择的名称。这是一个工作流程文件。有关在 GitHub 上创建新文件的更多信息，请参阅“[创建新文件](https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files)”。
4. 将以下 YAML 内容复制到您的工作流程文件中。

```yaml
# GitHub recommends pinning actions to a commit SHA.
# To get a newer version, you will need to update the SHA.
# You can also reference a tag or branch, but the action may change without warning.

name: Move assigned card
on:
  issues:
    types:
      - assigned
jobs:
  move-assigned-card:
    runs-on: ubuntu-latest
    steps:
      - uses: alex-page/github-project-automation-plus@7ffb872c64bd809d23563a130a0a97d01dfa8f43
        with:
          project: Docs Work
          column: In Progress
          repo-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

1. 自定义工作流程文件中的参数：
   - 将 的值更改`project`为您的项目板的名称。如果您有多个同名的项目板，则该`alex-page/github-project-automation-plus`操作将作用于具有指定名称的所有项目。
   - 将 的值更改为`column`您希望在分配问题时将其移至的列的名称。
   - 更改 的值 `repo-token`: 
     1. 使用范围创建个人访问令牌（经典）`repo`。有关详细信息，请参阅“[管理您的个人访问令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)”。
     2. 将此个人访问令牌作为秘密存储在您的存储库中。有关存储机密的更多信息，请参阅“[加密的机密](https://docs.github.com/en/actions/security-guides/encrypted-secrets)”。
     3. 在您的工作流程文件中，替换`PERSONAL_ACCESS_TOKEN`为您的密钥名称。
