---
title: 'Advanced Githook Design'
ShowRssButtonInSectionTermList: true
date: '2023-06-16T16:24:59+08:00'
draft: false
showtoc: true
tocopen: true
author: "Xinwei Xiong, Me"
keywords: []
tags: ['blog', 'en', 'git', 'openim']
categories: ['Development']
description: 'Explore advanced techniques and best practices for designing Git hooks to enhance your development workflow.'
---

## What to do if the community is not standardized

As the COO of the [OpenIM](https://github.com/OpenIMSDK) community, I am responsible for the [communtiy](https://github.com/OpenIMSDK/community) and [GitHub configuration repository](https:/ /github.com/OpenIMSDK/.github) has been fully configured. And architect and design the entire OpenIM `Makefile` and `CICD` flows, as well as the log package, error codes, collaborative flows, contributor documents and community documents used by the entire OpenIM.

There will always be some problems at this time, even if you think your [Contributor Document](https://github.com/OpenIMSDK/Open-IM-Server/blob/main/CONTRIBUTING.md) is very awesome. , very comprehensive, but still few people are willing to take the time to learn according to the specifications you wrote. This is a very big obstacle for me to build a top open source community, so I have this document today, and I will record it on [GitHub Gists](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694) , provide instructions and links for pulling and using it, and maintain it regularly.

First, I provide the link to the clone:

```bash
git clone https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694
```



## How to design

The first is for the basic functions, which are the well-known `commit` information and `push` information.

+ We can set the format of `commit` information
+ We can set the size of `push`
+ We provide the `actions` function
+ We provide the ability for `Makefile` to mark and clear `Hook`

I wrote a very comprehensive note when I was learning git, and shared it on GitHub, at this [🤖 link](https://github.com/cubxxw/awesome-cs-course/blob/master/Git /README.md), you can learn many advanced uses of git.

> This article explains what git specifications are and how to find the appropriate CICD flow:
>
> Unified format:
>
> ````bash
> Unified format: git commit -m 'type(scope): description(#issue)'
> ```
>
> We bring the email address `-s` when submitting the visa. This is a good habit.
>
> ````bash
> git commit -s -m "..."
> ```
>
> `git commit` art:
>
> ```
> <type>[optional scope]: <description>
> [optional text]
> [optional footnote]
> ```
>
> `git commit` submission type can be as follows:
>
> 1. `feat`: new function (feature)
> 2. `fix`: fix bug
> 3. `docs`: Documentation
> 4. `style`: format (changes that do not affect code operation)
> 5. `refactor`: Refactoring (that is, code changes that are not new features or bug fixes)
> 6. `test`: add test
> 7. `chore`: changes to the build process or auxiliary tools
> 8. `perf`: performance optimization
> 9. `revert`: rollback
> 10. `build`: build
> 11. `ci`: continuous integration



**⚠️ What should you pay attention to when using this Git hook? **

+ This `git hook` will stop you when you accidentally upload a large file and warn you that this is irreversible
+ This `git hook` will make you miserable when you have no way to control the commit format.



## how to use

**You can choose two ways to use Git hook:**

1. Directly as the `pre-commit` hook in the `.git/hooks` folder.
2. Update your `package.json` with Husky:

[Husky](https://github.com/cubxxw/awesome-cs-course/blob/master/Git/README.md) makes git hook easier and more convenient:

```json
"husky": {
     "hooks": {
       "pre-commit": "sh ./some-path/pre-commit-prevent-large-files.sh"
     }
}
```

I designed this hook for the [OpenIM](https://github.com/OpenIMSDK/Open-IM-Server/) community project, but after thinking about it, I decided to make it into a very convenient and high-end version [Github Gist]( https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694), why not use the features of Gist to record and save Git Hook, provide maintenance and download later, and also provide a communication platform, which is very perfect.

So my first step was to use [GitHub Gist](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694) to provide a download channel, so that other projects in the future can also use the script to pull it directly with one click. to local.

Not only that, I designed a [script](https://gist.githubusercontent.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/gitsync.sh) for submission. We can use the script to push to the remote warehouse in a one-click and standardized way.

```bash
curl -L https://gist.githubusercontent.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/gitsync.sh |sh
```

**Default limit is 5MB maximum per file. If you feel that your commit is a special case, you can override this restriction using: **

```bash
GIT_FILE_SIZE_LIMIT=50000000 git commit -m "test: this commit is allowed file sizes up to 50MB"
#OR
git commit --no-verify
```

I don't care about any specific files, just limiting the entire commit itself, which should at least make the developer thing twice before they might decide to `git commit --no-verify`

**Reusable script for one-click installation:**

```bash
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/install.sh |bash
```



## Contents

+ [Use installation script](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-install-sh)
+ [Commit information](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-commit-msg)
+ [Auto push one-click flow script gitsync](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-gitsync-sh)
+ [Makefile](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-makefile)
+ [Pre-commit: hook itself: pre-commit](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-pre-commit)
+ [Submit push processing](https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694#file-pre-push)

> **Note** Click `Raw` in the upper right corner to enter the script file



## Reusable installation script

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
curl -L https://gist.github.com/cubxxw/126b72104ac0b0ca484c9db09c3e5694/raw/commit-msg -o "$PRECOMMIT_HOOK" 2> /dev/null
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

`git-warning.yml` file:

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



**Once embedded in the Makefile, the whole logic is simpler:**

```makefile
# Copy githook scripts when execute makefile
COPY_GITHOOK:=$(shell cp -f script/githooks/* .git/hooks/; chmod +x .git/hooks/*)
```