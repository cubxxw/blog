---
title: '我的实践总结：开源社区的规范设计思路'
ShowRssButtonInSectionTermList: true
date: '2023-09-16T16:25:00+08:00'
draft: false
showtoc: true
tocopen: false
type: posts
author: '熊鑫伟，我'
keywords: ['开源社区', '规范设计', '社区管理', 'Git', 'OpenIM']
tags: ['OpenIM', '管理 (Management)', 'Git', '开源 (Open Source)']
categories: ['开发 (Development)']
description: '探讨如何在开源社区中实施规范设计，分享我的实践经验与思路，包括如何利用Git和OpenIM工具进行高效管理。'
---

## 社区不规范怎么办

作为 [OpenIM](https://github.com/OpenIMSDK) 社区首席运营官，对整个社区的 [communtiy](https://github.com/OpenIMSDK/community) 以及 [GitHub 配置仓库](https://github.com/OpenIMSDK/.github) 进行了全面的配置。并且对整个 OpenIM 的 `Makefile` 和 `CICD` 流，以及整个 OpenIM 使用的日志包 、错误码、协同流、贡献者文档以及 社区文档 进行架构和设计。

在这个时候总会有一些问题，即使你觉得自己的 [贡献者文档](https://github.com/OpenIMSDK/Open-IM-Server/blob/main/CONTRIBUTING.md) 写的很牛逼了，很全面了，但是依旧很少有人愿意花心思去按照你写的规范去学习。这对我打造顶级的开源社区是一个非常大的阻碍，于是就有了今天的这个文档，我会将它记录在 [GitHub Gists](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694) 上，提供拉取和使用的说明、链接，并且定期的维护它。

首先，我提供克隆的链接：

```bash
git clone https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694
```



## 如何设计

首先是针对基础的功能，那就是我们熟知的 `commit` 信息和 `push` 信息。

+ 我们可以对 `commit` 信息的格式进行设置
+ 我们可以对 `push` 的大小进行设置
+ 我们提供了 `actions` 的功能
+ 我们提供了 `Makefile` 标记和清除 `Hook` 的能力

我之前在学习 git 的时候写了一篇很全的笔记，并且分享在 GitHub 上面，在这个 [🤖 链接](https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md) 上可以学习到 git 很多高级用法。

> 这篇文章讲解了 git 有哪些规范，寻找合适的 CICD 流：
>
> 统一格式：
>
> ```bash
> 统一格式：git commit -m 'type(scope): 描述(#issue)'
> ```
>
> 我们在提交的时候带上邮箱信息 `-s` 来签证，这是一个很好的习惯。 
>
> ```bash
> git commit -s -m "..."
> ```
>
> `git commit`艺术：
>
> ```
> <类型>[可选 范围]: <描述>
> [可选 正文]
> [可选 脚注]
> ```
>
> `git commit`提交类型可以是如下：
>
> 1. `feat`：新功能（feature）
> 2. `fix`：修补bug
> 3. `docs`：文档（documentation）
> 4. `style`： 格式（不影响代码运行的变动）
> 5. `refactor`：重构（即不是新增功能，也不是修改bug的代码变动）
> 6. `test`：增加测试
> 7. `chore`：构建过程或辅助工具的变动
> 8. `perf`：性能优化
> 9. `revert`：回滚
> 10. `build`：构建
> 11. `ci`：持续集成



**⚠️ 使用这个 Git hook 应该注意什么？**

+ 这个 `git hook` 会在你不小心上传大文件的时候，阻止你，并且警告你，这是不可逆转的
+ 这个 `git hook` 会在你没有办法控制提交格式的时候，让你很痛苦。



## 如何使用

**你可以选择两种方式来使用 Git hook:**

1. 直接作为 `.git/hooks`文件夹中的 `pre-commit` 钩子。
2. 使用 Husky 更新您的 `package.json`：

[Husky](https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md) 使得 git hook 变的更加容易和方便：

```json
"husky": {
    "hooks": {
      "pre-commit": "sh ./some-path/pre-commit-prevent-large-files.sh"
    }
}
```

这个钩子我是为 [OpenIM](https://github.com/OpenIMSDK/Open-IM-Server/) 社区项目设计的，但是转念一想，反正都做成很方便和高端的 [Github Gist](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694) 了，为何不用 Gist 的特性来对 Git Hook 做一个记录和保存，后期提供维护和下载，也提供了一个交流平台，这是非常 perfect 的。

所以我第一步，利用了 [GitHub Gist](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694) 提供了一个下载的通道，这样以后有别的项目也可以直接一键使用脚本来拉取到本地。

不仅仅如此，我针对提交设计了一个[脚本](https://gist.githubusercontent.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/gitsync.sh)，我们使用脚本可以一键并且规范的 push 到远程仓库。

```bash
curl -L https://gist.githubusercontent.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/gitsync.sh |sh
```

**默认限制为每个文件最大5MB。如果你觉得你的提交是一个特例，你可以使用以下命令覆盖这个限制：**

```bash
GIT_FILE_SIZE_LIMIT=50000000 git commit -m "test: this commit is allowed file sizes up to 50MB"
# OR
git commit --no-verify
```

我不关心任何特定的文件，只是限制整个提交本身，这至少应该使开发人员的事情两次之前，他们可能会作出决定 `git commit --no-verify`

**可复用脚本一键安装：**

```bash
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/install.sh |bash
```



## Contents

+ [使用安装脚本](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-install-sh)
+ [commit 的信息](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-commit-msg)
+ [自动 push 一键流脚本 gitsync](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-gitsync-sh)
+ [Makefile](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-makefile)
+ [预提交：钩子本身: pre-commit](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-pre-commit)
+ [提交 push 处理](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-pre-push)

> **Note** 点击右上角 `Raw` 进入脚本文件



##  可复用的安装脚本 

```bash
#!/bin/sh
set -e
echo "Starting install script..."

SET_GIT_TEMPLATE_DIR=false
EXISTING_TEMPLATE=$(git config --global init.templateDir || echo "")
if [ -z "$EXISTING_TEMPLATE" ]; then
  echo "Creating a new global git template dir at ~/.git_template"
  mkdir ~/.git_template
  EXISTING_TEMPLATE="$(cd ~; pwd -P)/.git_template"
  SET_GIT_TEMPLATE_DIR=true
else
  EXISTING_TEMPLATE="$(eval cd $(dirname "$EXISTING_TEMPLATE"); pwd -P)/$(basename "$EXISTING_TEMPLATE")"
  echo "Using existing git template dir: $EXISTING_TEMPLATE"
fi

HOOKS_DIR="$EXISTING_TEMPLATE/hooks"
PRECOMMIT_HOOK="$HOOKS_DIR/pre-commit"
echo "Creating hooks dir if it doesn't already exist: $HOOKS_DIR"
mkdir -p "$HOOKS_DIR"
if [ -f "$PRECOMMIT_HOOK" ]; then
  echo "Cannot install hook as it's already defined: '$PRECOMMIT_HOOK'" >&2
  exit 1
fi

echo "Downloading the hook to $PRECOMMIT_HOOK"
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/pre-commit -o "$PRECOMMIT_HOOK" 2> /dev/null
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/commit-msg -o "$PRECO---
title: '开源社区的规范设计思路'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date: 2023-09-16T16:25:00+08:00
draft : false
showtoc: true
tocopen: false
author: ["熊鑫伟", "Me"]
keywords: []
tags:
  - blog
  - openim
  - management
  - zh
  - git
categories:
  - Development
  - Blog
  - OpenIM
  - Github
---MMIT_HOOK" 2> /dev/null
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/pre-push -o "$PRECOMMIT_HOOK" 2> /dev/null

echo "Making it executable"
chmod +x "$PRECOMMIT_HOOK"

if [ "$SET_GIT_TEMPLATE_DIR" = true ]; then
  echo "Defining ~/.git_template as the global git template dir"
  git config --global init.templateDir '~/.git_template'
fi

echo -e "\nDone! Any future git repo created in this user profile will contain the hook\n"


##################################################
GIT_PATH=$(git rev-parse --show-toplevel)
echo "===> Copying hooks to $GIT_PATH/.git/hooks/"
mv ~/.git_template/hooks/* $GIT_PATH/.git/hooks/
```





## git commit 设置

**pre-commit 文件:**

```bash
#!/usr/bin/env bash

# Copyright © 2023 OpenIMSDK.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# ==============================================================================
# This is a pre-commit hook that ensures attempts to commit files that are
# are larger than $limit to your _local_ repo fail, with a helpful error message.

# You can override the default limit of 2MB by supplying the environment variable:
# GIT_FILE_SIZE_LIMIT=50000000 git commit -m "test: this commit is allowed file sizes up to 50MB"
#
# ==============================================================================


YELLOW="\e[93m"
GREEN="\e[32m"
RED="\e[31m"
ENDCOLOR="\e[0m"

printMessage() {
   printf "${YELLOW}OpenIM : $1${ENDCOLOR}\n"
}

printSuccess() {
   printf "${GREEN}OpenIM : $1${ENDCOLOR}\n"
}

printError() {
   printf "${RED}OpenIM : $1${ENDCOLOR}\n"
}

printMessage "Running local OpenIM pre-commit hook."

# flutter format .
# https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694
# TODO! GIT_FILE_SIZE_LIMIT=50000000 git commit -m "test: this commit is allowed file sizes up to 50MB"
# Maximum file size limit in bytes
limit=${GIT_FILE_SIZE_LIMIT:-2000000} # Default 2MB
limitInMB=$(( $limit / 1000000 ))

function file_too_large(){
	filename=$0
	filesize=$(( $1 / 2**20 ))

	cat <<HEREDOC

	File $filename is $filesize MB, which is larger than github's maximum
        file size (2 MB). We will not be able to push this file to GitHub.
	Commit aborted

HEREDOC
    git status

}

# Move to the repo root so git files paths make sense
repo_root=$( git rev-parse --show-toplevel )
cd $repo_root

empty_tree=$( git hash-object -t tree /dev/null )

if git rev-parse --verify HEAD > /dev/null 2>&1
then
	against=HEAD
else
	against="$empty_tree"
fi

# Set split so that for loop below can handle spaces in file names by splitting on line breaks
IFS='
'

shouldFail=false
for file in $( git diff-index --cached --name-only $against ); do
	file_size=$(([ ! -f $file ] && echo 0) || (ls -la $file | awk '{ print $5 }'))
	if [ "$file_size" -gt  "$limit" ]; then
	    printError "File $file is $(( $file_size / 10**6 )) MB, which is larger than our configured limit of $limitInMB MB"
        shouldFail=true
	fi
done

if $shouldFail
then
    printMessage "If you really need to commit this file, you can override the size limit by setting the GIT_FILE_SIZE_LIMIT environment variable, e.g. GIT_FILE_SIZE_LIMIT=42000000 for 42MB. Or, commit with the --no-verify switch to skip the check entirely."
	  printError "Commit aborted"
    exit 1;
fi
```



**commit-msg**

```bash
#!/usr/bin/env bash

# Copyright © 2023 OpenIMSDK.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# ==============================================================================
#
# Store this file as .git/hooks/commit-msg in your repository in order to
# enforce checking for proper commit message format before actual commits.
# You may need to make the script executable by 'chmod +x .git/hooks/commit-msg'.

# commit-msg use go-gitlint tool, install go-gitlint via `go get github.com/llorllale/go-gitlint/cmd/go-gitlint`
# go-gitlint --msg-file="$1"

# An example hook script to check the commit log message.
# Called by "git commit" with one argument, the name of the file
# that has the commit message.  The hook should exit with non-zero
# status after issuing an appropriate message if it wants to stop the
# commit.  The hook is allowed to edit the commit message file.

YELLOW="\e[93m"
GREEN="\e[32m"
RED="\e[31m"
ENDCOLOR="\e[0m"

printMessage() {
   printf "${YELLOW}OpenIM : $1${ENDCOLOR}\n"
}

printSuccess() {
   printf "${GREEN}OpenIM : $1${ENDCOLOR}\n"
}

printError() {
   printf "${RED}OpenIM : $1${ENDCOLOR}\n"
}

printMessage "Running the OpenIM commit-msg hook."

# This example catches duplicate Signed-off-by lines.

test "" = "$(grep '^Signed-off-by: ' "$1" |
	 sort | uniq -c | sed -e '/^[ 	]*1[ 	]/d')" || {
	echo >&2 Duplicate Signed-off-by lines.
	exit 1
}

./tools/go-gitlint \
	 --msg-file=$1 \
	 --subject-regex="^(build|chore|ci|docs|feat|feature|fix|perf|refactor|revert|style|test)(.*)?:\s?.*" \
    --subject-maxlen=150 \
    --subject-minlen=10 \
    --body-regex=".*" \
    --max-parents=1

if [ $? -ne 0 ]
then
    printError "Please fix your commit message to match OpenIM coding standards"
    printError "https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694"
    exit 1
fi
```



## push 

```bash
#!/usr/bin/env bash

YELLOW="\e[93m"
GREEN="\e[32m"
RED="\e[31m"
ENDCOLOR="\e[0m"

printMessage() {
   printf "${YELLOW}OpenIM : $1${ENDCOLOR}\n"
}

printSuccess() {
   printf "${GREEN}OpenIM : $1${ENDCOLOR}\n"
}

printError() {
   printf "${RED}OpenIM : $1${ENDCOLOR}\n"
}

printMessage "Running local OpenIM pre-push hook."

if [[ `git status --porcelain` ]]; then
  printError "This script needs to run against committed code only. Please commit or stash you changes."
  exit 1
fi

#
#printMessage "Running the Flutter analyzer"
#flutter analyze
#
#if [ $? -ne 0 ]; then
#  printError "Flutter analyzer error"
#  exit 1
#fi
#
#printMessage "Finished running the Flutter analyzer"

```



## actions

`git-warning.yml` 文件：

```yaml
# This workflow will check for large files being added in PRs
# and label the PR if one is found that exceeds the configured limit.
#
# For more information, see: https://github.com/marketplace/actions/lfs-warning

name: Large file size warning

on: 
  pull_request:
    # Ignore some files to avoid consuming Actions minutes unnecessarily 
    # for file types we're fairly confident we'll never need to worry about
    paths-ignore: 
      - '**.config'
      - '**.cs'
      - '**.cshtml'
      - '**.cs'
      - '**.csproj'
      - '**.cmd'
      - '**.dockerignore'
      - '**.gitignore'
      - '**.graphql'
      - '**.jsx?'
      - '**.md'
      - '**.props'
      - '**.ps1'
      - '**.scss'
      - '**.sh'
      - '**.sln'
      - '**.tsx?'
      - '**.yml'
      - '**/appsettings.*.json'
      - '**/Dockerfile'
      
jobs:
  run-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actionsdesk/lfs-warning@v2.0
      with:
        #token: ${{ secrets.GITHUB_TOKEN }} # Optional
        filesizelimit: '5242880' # 5MB
```



**嵌入到 Makefile 后，整个逻辑就更简单了：**

```makefile
# Copy githook scripts when execute makefile
COPY_GITHOOK:=$(shell cp -f script/githooks/* .git/hooks/; chmod +x .git/hooks/*)
```
