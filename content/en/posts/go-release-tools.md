---
title: 'GoReleaser: Automate your software releases'
description:
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-16T16:07:39+08:00
draft : false
showtoc: true
tocopen: true
author: ["Xiong Xinwei", "Me"]
keywords: []
tags:
   - blog
   - en
   - golang
   - release
categories:
   - Development
   - Blog
---

The goal of GoReleaser is to automate much of the tedious work when releasing software, by using sensible defaults and making it simple for the most common use cases.

## Preparation:

- `.goreleaser.yaml` file: contains all configuration information. (For more information, see [Customization](https://goreleaser.com/customization/))
- Clean working tree: Make sure the code is up to date and all changes have been committed.
- SemVer compliant version number (e.g. `10.21.34-prerelease+buildmeta`)

## GoReleaser running steps:

The operation of GoReleaser is mainly divided into the following four steps:

1. **defaulting**: Configure reasonable default values for each step
2. **building**: Build binaries, archives, packages, Docker images, etc.
3. **releasing**: Release the version to the configured SCM, Docker registry, blob storage, etc.
4. **announcing**: Announce your release to the configured channel

Some steps may be skipped using the `-like` flag, like `--skip-foo`

## Quick Start

First, run the [init](https://goreleaser.com/cmd/goreleaser_init/) command to create the example `.goreleaser.yaml` file:

```
goreleaser init
```

We then run a "local only" build to see if it works using the [release](https://goreleaser.com/cmd/goreleaser_release/) command:

```
goreleaser release --snapshot --rm-dist
```

At this point, you can [customize](https://goreleaser.com/customization/) the generated `.goreleaser.yaml` file, or leave it as-is, it's up to you. Best practice is to put the `.goreleaser.yaml` file into your version control system.

You can also use GoReleaser to build a binary for a given GOOS/GOARCH (https://goreleaser.com/cmd/goreleaser_build/), which is useful for local development:

```
goreleaser build --single-target
```

Prepare GitHub Token:

```
export GITHUB_TOKEN="YOUR_GH_TOKEN"
```

GoReleaser will use the latest [Git tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging) for your repository.

Create a tag and push it to GitHub:

```
git push origin v0.1.0
```

Now you can run GoReleaser in the root directory of your project:

```
goreleaser release
```

## Using GoReleaser in GitHub Actions

GoReleaser is also available in our official GoReleaser Action via GitHub Actions.

You can do this by putting YAML configuration into the `.github/workflows/release.yml` file.

```bash
bashcodename:goreleaser

on:
   push:
     # Only run on labels
     tags:
       - '*'

permissions:
   contents: write
   # packages: write
   # issues: write

jobs:
   goreleaser:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v3
         with:
           fetch-depth: 0
       - run: git fetch --force --tags
       - uses: actions/setup-go@v4
         with:
           go-version: stable
       # More settings may be required, such as Docker login, GPG, etc. These all depend on your needs.
       - uses: goreleaser/goreleaser-action@v4
         with:
           # You can choose 'goreleaser' (default) or 'goreleaser-pro'
           distribution:goreleaser
           version: latest
           args: release --rm-dist
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           # If you are using the 'goreleaser-pro' distribution, you will need the GoReleaser Pro key:
           # GORELEASER_KEY: ${{ secrets.GORELEASER_KEY }}
```

GoReleaser requires the following [permissions](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#permissions-for-the-github_token):

- ````
   contents: write
   ```

   , if you plan to:

   - [Upload files as GitHub Releases](https://goreleaser.com/customization/release/), or
   - Publish to [Homebrew](https://goreleaser.com/customization/homebrew/) or [Scoop](https://goreleaser.com/customization/scoop/) (assuming it's part of the same repository)

- `packages: write` if you plan to [push the Docker image to](https://goreleaser.com/customization/docker/) GitHub

- `issues: write`, if you use [milestone closing function](https://goreleaser.com/customization/milestone/)

The `GITHUB_TOKEN` permission [only](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token#about-the-github_token-secret) contains your Workflow repository.

If you need to push Homebrew Tap to another repository, then you must create a personal access token that you have access to and add it as the repository's secret. If you created a secret named `GH_PAT`, the steps would be as follows:

```
yaml
```

```yaml
       - name: Run GoReleaser
         uses: goreleaser/goreleaser-action@v4
         with:
           version: latest
           args: release --rm-dist
         env:
           GITHUB_TOKEN: ${{ secrets.GH_PAT }}
```



## Customized requirements

GoReleaser can be customized by adjusting the `.goreleaser.yaml` file.

[goreleaser init](https://goreleaser.com/cmd/goreleaser_init/) You can generate a sample configuration by running or starting from scratch.

You can also check that your configuration is valid by running [goreleaser check](https://goreleaser.com/cmd/goreleaser_check/), which will tell you if you are using deprecated or invalid options.

### Name template

| key | description |
| --------------------------- | --------------------------- ---------------------------------- |
| `.ProjectName` | Project name |
| `.Version` | The version being released ([Details](https://goreleaser.com/customization/templates/#fn:version-prefix)) |
| `.Branch` | The current git branch |
| `.PrefixedTag` | The current git tag prefixed by the monorepo configuration tag prefix (if any) |
| `.Tag` | The current git tag |
| `.PrefixedPreviousTag` | The previous git tag prefixed with the monorepo configuration tag (if any) |
| `.PreviousTag` | The previous git tag, or empty if there is no previous tag |
| `.ShortCommit` | git commit short hash |
| `.FullCommit` | git commits the complete hash value |
| `.Commit` | git commit hash (deprecated) |
| `.CommitDate` | UTC submission date in RFC 3339 format |
| `.CommitTimestamp` | UTC commit date in Unix format |
| `.GitURL` | git remote URL |
| `.IsGitDirty` | Whether the current git status is dirty. Since v1.19. |
| `.Major` | Version ([Details](https://goreleaser.com/customization/templates/#fn:tag-is-semver)) |
| `.Minor` | Version ([Details](https://goreleaser.com/customization/templates/#fn:tag-is-semver)) |
| `.Patch` | Patch section ([Details](https://goreleaser.com/customization/templates/#fn:tag-is-semver)) |
| `.Prerelease` | The pre-release part of the version, such as beta ([Details](https://goreleaser.com/customization/templates/#fn:tag-is-semver)) |
| `.RawVersion` | Composed of `{Major}.{Minor}.{Patch}` ([Details](https://goreleaser.com/customization/templates/#fn:tag-is-semver)) |
| `.ReleaseNotes` | Generated release notes, available after executing the changelog step |
| `.IsDraft` | true if `release.draft` is set in the configuration, false otherwise. Since v1.17. |
| `.IsSnapshot` | true if `--snapshot` is set, false otherwise |
| `.IsNightly` | true if `--nightly` is set, false otherwise |
| `.Env` | Contains a map of system environment variables |
| `.Date` | Current UTC date in RFC 3339 format |
| `.Now` | The current UTC date as a `time.Time` structure, allowing all `time.Time` functionality (e.g. `{{ .Now.Format "2006" }}` ). Since v1.17. |
| `.Timestamp` | Current UTC time in Unix format |
| `.ModulePath` | go module path, as reported `go list -m` |
| `incpatch "v1.2.4"` | Patch ([Details](https://goreleaser.com/customization/templates/#fn:panic-if-not-semver)) |
| `incminor "v1.2.4"` | Minor version ([Details](https://goreleaser.com/customization/templates/#fn:panic-if-not-semver)) |
| `incmajor "v1.2.4"` | Increase the given version ([Details](https://goreleaser.com/customization/templates/#fn:panic-if-not-semver)) |
| `.ReleaseURL` | Current version download address ([Details](https://goreleaser.com/customization/templates/#fn:scm-release-url)) |
| `.Summary` | git summary, for example `v1.0.0-10-g34f56g3` ([Details](https://goreleaser.com/customization/templates/#fn:git-summary)) |
| `.PrefixedSummary` | A git summary prefixed with the monorepo configuration tag prefix (if any) |
| `.TagSubject` | The annotated tag message subject, or the message subject of the commit it points to ([Details](https://goreleaser.com/customization/templates/#fn:git-tag-subject)). Starting with v1.2. |
| `.TagContents` | The annotated tag message, or the commit message it points to ([Details](https://goreleaser.com/customization/templates/#fn:git-tag-body)) . Since v1.2 start. |
| `.TagBody` | The annotated tag message body, or the message body of the commit it points to ([Details](https://goreleaser.com/customization/templates/#fn:git-tag-body)). Starting with v1.2. |
| `.Runtime.Goos` | Equivalent to `runtime.GOOS`. Since v1.5. |
| `.Runtime.Goarch` | Equivalent to `runtime.GOARCH`. Since v1.5. |
| `.Artifacts` | The current list of artifacts. The fields are shown in the table below. Since v1.16-pro. |



### Configuration options

```yaml
# Default: './dist'
dist: _output/dist

git:
   # What should be used to sort tags when gathering the current and previous
   # tags if there are more than one tag in the same commit.
   #
   # Default: '-version:refname'
   tag_sort: -version:creatordate

   # What should be used to specify prerelease suffix while sorting tags when gathering
   # the current and previous tags if there are more than one tag in the same commit.
   #
   # Since: v1.17
   prerelease_suffix: "-"
```



### Build options

The build can be customized in a variety of ways. You can specify which GOOS, GOARCH and GOARM binaries are built (GoReleaser will generate a matrix of all combinations), and you can change the binaries' names, flags, environment variables, hooks, etc.

**builds is the most important option in the configuration file:**

```yaml
# .goreleaser.yaml
builds:
   # You can have multiple builds defined as a yaml list
   - #
     # ID of the build.
     #
     # Default: Binary name
     id: "my-build"

     # Path to main.go file or main package.
     # Notice: when used with `gomod.proxy`, this must be a package.
     #
     # Default is `.`.
     main: ./cmd/my-app

     # Binary name.
     # Can be a path (e.g. `bin/app`) to wrap the binary in a directory.
     #
     # Default: Project directory name
     binary: program

     # Custom flags.
     #
     # Templates: allowed
     flags:
       - -tags=dev
       - -v

     # Custom asmflags.
     #
     # Templates: allowed
     asmflags:
       - -D mysymbol
       - all=-trimpath={{.Env.GOPATH}}

     # Custom gcflags.
     #
     # Templates: allowed
     gcflags:
       - all=-trimpath={{.Env.GOPATH}}
       - ./dontoptimizeme=-N

     # Custom ldflags.
     #
     # Default: '-s -w -X main.version={{.Version}} -X main.commit={{.Commit}} -X main.date={{.Date}} -X main.builtBy= goreleaser'
     # Templates: allowed
     ldflags:
       - -s -w -X main.build={{.Version}}
       - ./usemsan=-msan

     # Custom Go build mode.
     #
     # Valid options:
     # - `c-shared`
     # - `c-archive`
     #
     # Since: v1.13
     buildmode: c-shared

     # Custom build tags templates.
     tags:
       -osusergo
       - netgo
       -static_build
       -feature

     # Custom environment variables to be set during the builds.
    # Invalid environment variables will be ignored.
    #
    # Default: os.Environ() ++ env config section
    # Templates: allowed (since v1.14)
    env:
      - CGO_ENABLED=0
      # complex, templated envs (v1.14+):
      - >-
        {{- if eq .Os "darwin" }}
          {{- if eq .Arch "amd64"}}CC=o64-clang{{- end }}
          {{- if eq .Arch "arm64"}}CC=aarch64-apple-darwin20.2-clang{{- end }}
        {{- end }}
        {{- if eq .Os "windows" }}
          {{- if eq .Arch "amd64" }}CC=x86_64-w64-mingw32-gcc{{- end }}
        {{- end }}

    # GOOS list to build for.
    # For more info refer to: https://golang.org/doc/install/source#environment
    #
    # Default: [ 'darwin', 'linux', 'windows' ]
    goos:
      - freebsd
      - windows

    # GOARCH to build for.
    # For more info refer to: https://golang.org/doc/install/source#environment
    #
    # Default: [ '386', 'amd64', 'arm64' ]
    goarch:
      - amd64
      - arm
      - arm64

    # GOARM to build for when GOARCH is arm.
    # For more info refer to: https://golang.org/doc/install/source#environment
    #
    # Default: [ 6 ]
    goarm:
      - 6
      - 7

    # GOAMD64 to build when GOARCH is amd64.
    # For more info refer to: https://golang.org/doc/install/source#environment
    #
    # Default: [ 'v1' ]
    goamd64:
      - v2
      - v3

    # GOMIPS and GOMIPS64 to build when GOARCH is mips, mips64, mipsle or mips64le.
    # For more info refer to: https://golang.org/doc/install/source#environment
    #
    # Default: [ 'hardfloat' ]
    gomips:
      - hardfloat
      - softfloat

    # List of combinations of GOOS + GOARCH + GOARM to ignore.
    ignore:
      - goos: darwin
        goarch: 386
      - goos: linux
        goarch: arm
        goarm: 7
      - goarm: mips64
      - gomips: hardfloat
      - goamd64: v4

    # Optionally override the matrix generation and specify only the final list
    # of targets.
    #
    # Format is `{goos}_{goarch}` with their respective suffixes when
    # applicable: `_{goarm}`, `_{goamd64}`, `_{gomips}`.
    #
    # Special values:
    # - go_118_first_class: evaluates to the first-class ports of go1.18.
    # - go_first_class: evaluates to latest stable go first-class ports,
    #   currently same as 1.18.
    #
    # This overrides `goos`, `goarch`, `goarm`, `gomips`, `goamd64` and
    # `ignores`.
    targets:
      # Since: v1.9
      - go_first_class
      # Since: v1.9
      - go_118_first_class
      - linux_amd64_v1
      - darwin_arm64
      - linux_arm_6

    # Set a specific go binary to use when building.
    # It is safe to ignore this option in most cases.
    #
    # Default is "go"
    gobinary: "go1.13.4"

    # Sets the command to run to build.
    # Can be useful if you want to build tests, for example,
    # in which case you can set this to "test".
    # It is safe to ignore this option in most cases.
    #
    # Default: build.
    # Since: v1.9
    command: test

    # Set the modified timestamp on the output binary, typically
    # you would do this to ensure a build was reproducible. Pass
    # empty string to skip modifying the output.
    #
    # Templates: allowed.
    mod_timestamp: "{{ .CommitTimestamp }}"

    # Hooks can be used to customize the final binary,
    # for example, to run generators.
    #
    # Templates: allowed
    hooks:
      pre: rice embed-go
      post: ./script.sh {{ .Path }}

    # If true, skip the build.
    # Useful for library projects.
    skip: false

    # By default, GoReleaser will create your binaries inside
    # `dist/${BuildID}_${BuildTarget}`, which is a unique directory per build
    # target in the matrix.
    # You can set subdirs within that folder using the `binary` property.
    #
    # However, if for some reason you don't want that unique directory to be
    # created, you can set this property.
    # If you do, you are responsible for keeping different builds from
    # overriding each other.
    no_unique_dist_dir: true

    # By default, GoReleaser will check if the main filepath has a main
    # function.
    # This can be used to skip that check, in case you're building tests, for
    # example.
    #
    # Since: v1.9
    no_main_check: true

    # Path to project's (sub)directory containing Go code.
    # This is the working directory for the Go build command(s).
    # If dir does not contain a `go.mod` file, and you are using `gomod.proxy`,
    # produced binaries will be invalid.
    # You would likely want to use `main` instead of this.
    #
    # Default: '.'
    dir: go

    # Builder allows you to use a different build implementation.
    # This is a GoReleaser Pro feature.
    # Valid options are: `go` and `prebuilt`.
    #
    # Default: 'go'
    builder: prebuilt

    # Overrides allows to override some fields for specific targets.
    # This can be specially useful when using CGO.
    # Note: it'll only match if the full target matches.
    #
    # Since: v1.5
    overrides:- goos: darwin
         goarch: arm64
         goamd64: v1
         goarm: ""
         gomips: ""
         ldflags:
           - foo
         tags:
           - bar
         asmflags:
           -foobar
         gcflags:
           - foobaz
         env:
           - CGO_ENABLED=1
```

**Builds containing multiple binaries:**

```yaml
# .goreleaser.yaml
builds:
   - main: ./cmd/cli
     id: "cli"
     binary: cli
     goos:
       - linux
       - darwin
       -windows

   - main: ./cmd/worker
     ID: "worker"
     binary:worker
     goos:
       - linux
       - darwin
       -windows

   - main: ./cmd/tracker
     id: "tracker"
     binary: tracker
     goos:
       - linux
       - darwin
       -windows
```

Binary name fields support [templating](https://goreleaser.com/customization/templates/). The following build details are exposed:

| Key | Description |
| ------- | ---------------------------------- |
| .Os | GOOS |
| .Arch | GOARCH |
| .Arm | GOARM |
| .Ext | Extension, e.g. .exe |
| .Target | Build target, e.g. darwin_amd64 |

You can do this by using `{{ .Env.VARIABLE_NAME }}` in the template, for example:

```yaml
# .goreleaser.yaml
builds:
   - ldflags:
    - -s -w -X "main.goversion={{.Env.GOVERSION}}"
```

Then you can run:

`GOVERSION=$(go version) goreleaser`

## build hooks

Both pre and post hooks run against every build target, whether those targets are generated via the operating system and architecture matrix or defined explicitly.

In addition to the simple declaration shown above, multiple hooks can be declared to help keep the configuration reusable between different build environments.

```yaml
# .goreleaser.yaml
builds:
   - id: "with-hooks"
     targets:
       - "darwin_amd64"
       - "windows_amd64"
     hooks:
       pre:
         -first-script.sh
         -second-script.sh
       post:
         - upx "{{ .Path }}"
         - codesign -project="{{ .ProjectName }}" "{{ .Path }}"
```

Each hook can also have its own working directory and environment variables:

```yaml
# .goreleaser.yaml
builds:
   - id: "with-hooks"
     targets:
       - "darwin_amd64"
       - "windows_amd64"
     hooks:
       pre:
         - cmd: first-script.sh
           dir:
             "{{ dir .Dist}}"
             # Always print command output, otherwise only visible in debug mode.
             # Since: v1.5
           output: true
           env:
             - HOOK_SPECIFIC_VAR={{ .Env.GLOBAL_VAR }}
         -second-script.sh
```

All properties of hooks (`cmd`, `dir` and `env`) support using hooks with binary artifacts available for templating (https://goreleaser.com/customization/templates/) (as they are built *run later). *In addition, the following build details are also exposed to and hooks: `postprepost`

| Key | Description |
| ------- | ---------------------------------- |
| .Name | Filename of the binary, e.g. bin.exe |
| .Ext | Extension, e.g. .exe |
| .Path | Absolute path to the binary |
| .Target | Build target, e.g. darwin_amd64 |

Environment variables are inherited and overridden in the following order:

- global (`env`)
- build (`builds[].env`)
- Hooks (`builds[].hooks.pre[].env` and `builds[].hooks.post[].env`)

### Module

If you are using Go 1.11+ with the go module or vgo, when GoReleaser runs, it may try to download dependencies. Since multiple builds are running in parallel, it is likely to fail.

You can solve this by running `goreleaser` before calling `go mod tidy` or adding a [hook](https://goreleaser.com/customization/hooks)`.goreleaser.yaml` that does this on the file question:

```yaml
# .goreleaser.yaml
before:
   hooks:
     - go mod tidy
# rest of the file...
```

## archives

Binaries built by `README` will be archived together with `LICENSE` files into a `tar.gz` file. In this `archives` section you can customize the archive name, additional files and formats.

```yaml
# .goreleaser.yaml
archives:
   - #
     # ID of this archive.
     #
     # Default: 'default'
     id:my-archive

     # Builds reference which build instances should be archived in this archive.
     builds:
       -default

     # Archive format. Valid options are `tar.gz`, `tgz`, `tar.xz`, `txz`, tar`, `gz`, `zip` and `binary`.
     # If format is `binary`, no archives are created and the binaries are instead
     # uploaded directly.
     #
     # Default: 'tar.gz'
     format:zip

     # This will create an archive without any binaries, only the files are there.
     # The name template must not contain any references to `Os`, `Arch` and etc, since the archive will be meta.
     #
     # Since: v1.9
     # Templates: allowed
     meta: true

     # Archive name.
     #
     #Default:
     # - if format is `binary`:
     # - `{{ .Binary }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}{{ with .Arm }}v{{ . }}{{ end }}{{ with .Mips }}_{{ . }}{{ end }}{{ if not (eq .Amd64 "v1") }}{{ .Amd64 }}{{ end }}`
     # - if format is anything else:
     # - `{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}{{ with .Arm }}v{{ . }}{{ end }}{{ with .Mips }}_{{ . }}{{ end }}{{ if not (eq .Amd64 "v1") }}{{ .Amd64 }}{{ end }}`
     # Templates: allowed
     name_template: "{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}"

     # Sets the given file info to all the binaries included from the `builds`.
     #
     # Default: copied from the source binary.
     # Since: v1.14
     builds_info:
       group: root
       owner: root
       mode: 0644
       # format is `time.RFC3339Nano`
       mtime: 2008-01-02T15:04:05Z

     # Set this to true if you want all files in the archive to be in a single directory.
     # If set to true and you extract the archive 'goreleaser_Linux_arm64.tar.gz',
     # you'll get a folder 'goreleaser_Linux_arm64'.
     # If set to falsee, all files are extracted separately.
    # You can also set it to a custom folder name (templating is supported).
    wrap_in_directory: true

    # If set to true, will strip the parent directories away from binary files.
    #
    # This might be useful if you have your binary be built with a subdir for some reason, but do no want that subdir inside the archive.
    #
    # Since: v1.11
    strip_parent_binary_folder: true

    # This will make the destination paths be relative to the longest common
    # path prefix between all the files matched and the source glob.
    # Enabling this essentially mimic the behavior of nfpm's contents section.
    # It will be the default by June 2023.
    #
    # Since: v1.14
    rlcp: true

    # Can be used to change the archive formats for specific GOOSs.
    # Most common use case is to archive as zip on Windows.
    format_overrides:
      - goos: windows
        format: zip

    # Additional files/globs you want to add to the archive.
    #
    # Default: [ 'LICENSE*', 'README*', 'CHANGELOG', 'license*', 'readme*', 'changelog']
    # Templates: allowed
    files:
      - LICENSE.txt
      - README_{{.Os}}.md
      - CHANGELOG.md
      - docs/*
      - design/*.png
      - templates/**/*
      # a more complete example, check the globbing deep dive below
      - src: "*.md"
        dst: docs

        # Strip parent folders when adding files to the archive.
        strip_parent: true

        # File info.
        # Not all fields are supported by all formats available formats.
        #
        # Default: copied from the source file
        info:
          # Templates: allowed (since v1.14)
          owner: root

          # Templates: allowed (since v1.14)
          group: root

          # Must be in time.RFC3339Nano format.
          #
          # Templates: allowed (since v1.14)
          mtime: "{{ .CommitDate }}"

          # File mode.
          mode: 0644

    # Additional templated files to add to the archive.
    # Those files will have their contents pass through the template engine,
    # and its results will be added to the archive.
    #
    # Since: v1.17 (pro)
    # This feature is only available in GoReleaser Pro.
    # Templates: allowed
    templated_files:
      # a more complete example, check the globbing deep dive below
      - src: "LICENSE.md.tpl"
        dst: LICENSE.md

        # File info.
        # Not all fields are supported by all formats available formats.
        #
        # Default: copied from the source file
        info:
          # Templateable (since v1.14.0)
          owner: root

          # Templateable (since v1.14.0)
          group: root

          # Must be in time.RFC3339Nano format.
          # Templateable (since v1.14.0)
          mtime: "{{ .CommitDate }}"

          # File mode.
          mode: 0644

    # Before and after hooks for each archive.
    # Skipped if archive format is binary.
    # This feature is only available in GoReleaser Pro.
    hooks:
      before:
        - make clean # simple string
        - cmd: go generate ./... # specify cmd
        - cmd: go mod tidy
          output: true # always prints command output
          dir: ./submodule # specify command working directory
        - cmd: touch {{ .Env.FILE_TO_TOUCH }}
          env:
            - "FILE_TO_TOUCH=something-{{ .ProjectName }}" # specify hook level environment variables

      after:
        - make clean
        - cmd: cat *.yaml
          dir: ./submodule
        - cmd: touch {{ .Env.RELEASE_DONE }}
          env:
            - "RELEASE_DONE=something-{{ .ProjectName }}" # specify hook level environment variables

    # Disables the binary count check.
    allow_different_binary_count: true
```

## linux 软件包

GoReleaser 可以连接到[nfpm](https://github.com/goreleaser/nfpm)以生成和发布 `.deb`、`.rpm`、`.apk` 和 `Archlinux` 软件包。

```bash
# .goreleaser.yaml
nfpms:
  # note that this is an array of nfpm configs
  - #
    # ID of the nfpm config, must be unique.
    #
    # Default: 'default'
    id: foo

    # Name of the package.
    # Default: ProjectName
    # Templates: allowed (since v1.18)
    package_name: foo

    # You can change the file name of the package.
    #
    # Default: '{{ .PackageName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}{{ with .Arm }}v{{ . }}{{ end }}{{ with .Mips }}_{{ . }}{{ end }}{{ if not (eq .Amd64 "v1") }}{{ .Amd64 }}{{ end }}'
    # Templates: allowed
    file_name_template: "{{ .ConventionalFileName }}"

    # Build IDs for the builds you want to create NFPM packages for.
    # Defaults empty, which means no filtering.
    builds:
      - foo
      - bar

    # Your app's vendor.
    vendor: Drum Roll Inc.

    # Your app's homepage.
    homepage: https://example.com/

    # Your app's maintainer (probably you).
    maintainer: Drummer <drum-roll@example.com>

    # Your app's description.
    description: |-
      Drum rolls installer package.
      Software to create fast and easy drum rolls.

    # Your app's license.
    license: Apache 2.0

    # Formats to be generated.
    formats:
      - apk
      - deb
      - rpm
      - termux.deb # Since: v1.11
      - archlinux # Since: v1.13

    # Umask to be used on files without explicit mode set. (overridable)
    #
    # Default: 0o002 (will remove world-writable permissions)
    # Since: v1.19
    umask: 0o002

    # Packages your package depends on. (overridable)
    dependencies:
      - git
      - zsh

    # Packages it provides. (overridable)
    #
    # Since: v1.11
    provides:
      - bar

    # Packages your package recommends installing. (overridable)
    recommends:
      - bzr
      - gtk

    # Packages your package suggests installing. (overridable)
    suggests:
      - cvs
      - ksh

    # Packages that conflict with your package. (overridable)
    conflicts:
      - svn
      - bash

    # Packages it replaces. (overridable)
    replaces:
      - fish

    # Path that the binaries should be installed.
    # Default: '/usr/bin'
    bindir: /usr/bin

    # Version Epoch.
    # Default: extracted from `version` if it is semver compatible
    epoch: 2

    # Version Prerelease.
    # Default: extracted from `version` if it is semver compatible
    prerelease: beta1

    # Version Metadata (previously deb.metadata).
    # Setting metadata might interfere with version comparisons depending on the
    # packager.
    #
    # Default: extracted from `version` if it is semver compatible
    version_metadata: git

    # Version Release.
    release: 1

    # Section.
    section: default

    # Priority.
    priority: extra

    # Makes a meta package - an empty package that contains only supporting
    # files and dependencies.
    # When set to `true`, the `builds` option is ignored.
    #
    # Default: false
    meta: true

    # Changelog YAML file, see: https://github.com/goreleaser/chglog
    #
    # You can use goreleaser/chglog to create the changelog for your project,
    # pass that changelog yaml file to GoReleaser,
    # and it should in turn setup it accordingly for the given available
    # formats (deb and rpm at the moment).
    #
    # Experimental.
    # Since: v1.11
    changelog: ./foo.yml

    # Contents to add to the package.
    # GoReleaser will automatically add the binaries.
    contents:
      # Basic file that applies to all packagers
      - src: path/to/foo
        dst: /usr/bin/foo

      # This will add all files in some/directory or in subdirectories at the
      # same level under the directory /etc. This means the tree structure in
      # some/directory will not be replicated.
      - src: some/directory/
        dst: /etc

      # This will replicate the directory structure under some/directory at
      # /etc, using the "tree" type.
      #
      # Since: v1.17
      # Templates: allowed
      - src: some/directory/
        dst: /etc
        type: tree

      # Simple config file
      - src: path/to/foo.conf
        dst: /etc/foo.conf
        type: config

      # Simple symlink.
      # Corresponds to `ln -s /sbin/foo /usr/local/bin/foo`
      - src: /sbin/foo
        dst: /usr/bin/foo
        type: "symlink"

      # Corresponds to `%config(noreplace)` if the packager is rpm, otherwise it
      # is just a config file
      - src: path/to/local/bar.conf
        dst: /etc/bar.conf
        type: "config|noreplace"

      # The src and dst attributes also supports name templates
      - src: path/{{ .Os }}-{{ .Arch }}/bar.conf
        dst: /etc/foo/bar-{{ .ProjectName }}.conf

    # Additional templated contents to add to the archive.
    # Those files will have their contents pass through the template engine,
    # and its results will be added to the package.
    #
    # Since: v1.17 (pro)
    # This feature is only available in GoReleaser Pro.
    # Templates: allowed
    templated_contents:
      # a more complete example, check the globbing deep dive below
      - src: "LICENSE.md.tpl"
        dst: LICENSE.md

      # These files are not actually present in the package, but the file names
      # are added to the package header. From the RPM directives documentation:
      #
      # "There are times when a file should be owned by the package but not
      # installed - log files and state files are good examples of cases you
      # might desire this to happen."
      #
      # "The way to achieve this, is to use the %ghost directive. By adding this
      # directive to the line containing a file, RPM will know about the ghosted
      # file, but will not add it to the package."
      #
      # For non rpm packages ghost files are ignored at this time.
      - dst: /etc/casper.conf
        type: ghost
      - dst: /var/log/boo.log
        type: ghost

      # You can use the packager field to add files that are unique to a
      # specific packager
      - src: path/to/rpm/file.conf
        dst: /etc/file.conf
        type: "config|noreplace"
        packager: rpm
      - src: path/to/deb/file.conf
        dst:/etc/file.conf
        type: "config|noreplace"
        packager: deb
      - src: path/to/apk/file.conf
        dst: /etc/file.conf
        type: "config|noreplace"
        packager: apk

      # Sometimes it is important to be able to set the mtime, mode, owner, or
      # group for a file that differs from what is on the local build system at
      # build time.
      - src: path/to/foo
        dst: /usr/local/foo
        file_info:
          mode: 0644
          mtime: 2008-01-02T15:04:05Z
          owner: notRoot
          group: notRoot

      # If `dst` ends with a `/`, it'll create the given path and copy the given
      # `src` into it, the same way `cp` works with and without trailing `/`.
      - src: ./foo/bar/*
        dst: /usr/local/myapp/

      # Using the type 'dir', empty directories can be created. When building
      # RPMs, however, this type has another important purpose: Claiming
      # ownership of that folder. This is important because when upgrading or
      # removing an RPM package, only the directories for which it has claimed
      # ownership are removed. However, you should not claim ownership of a
      # folder that is created by the OS or a dependency of your package.
      #
      # A directory in the build environment can optionally be provided in the
      # 'src' field in order copy mtime and mode from that directory without
      # having to specify it manually.
      - dst: /some/dir
        type: dir
        file_info:
          mode: 0700

    # Scripts to execute during the installation of the package. (overridable)
    #
    # Keys are the possible targets during the installation process
    # Values are the paths to the scripts which will be executed.
    scripts:
      preinstall: "scripts/preinstall.sh"
      postinstall: "scripts/postinstall.sh"
      preremove: "scripts/preremove.sh"
      postremove: "scripts/postremove.sh"

    # All fields above marked as `overridable` can be overridden for a given
    # package format in this section.
    overrides:
      # The dependencies override can for example be used to provide version
      # constraints for dependencies where  different package formats use
      # different versions or for dependencies that are named differently.
      deb:
        dependencies:
          - baz (>= 1.2.3-0)
          - some-lib-dev
        # ...
      rpm:
        dependencies:
          - baz >= 1.2.3-0
          - some-lib-devel
        # ...
      apk:
        # ...

    # Custom configuration applied only to the RPM packager.
    rpm:
      # RPM specific scripts.
      scripts:
        # The pretrans script runs before all RPM package transactions / stages.
        pretrans: ./scripts/pretrans.sh
        # The posttrans script runs after all RPM package transactions / stages.
        posttrans: ./scripts/posttrans.sh

      # The package summary.
      #
      # Default: first line of the description
      summary: Explicit Summary for Sample Package

      # The package group.
      # This option is deprecated by most distros but required by old distros
      # like CentOS 5 / EL 5 and earlier.
      group: Unspecified

      # The packager is used to identify the organization that actually packaged
      # the software, as opposed to the author of the software.
      # `maintainer` will be used as fallback if not specified.
      # This will expand any env var you set in the field, eg packager: ${PACKAGER}
      packager: GoReleaser <staff@goreleaser.com>

      # Compression algorithm (gzip (default), lzma or xz).
      compression: lzma

      # Prefixes for relocatable packages.
      #
      # Since: v1.20.
      prefixes:
        - /usr/bin

      # The package is signed if a key_file is set
      signature:
        # PGP secret key file path (can also be ASCII-armored).
        # The passphrase is taken from the environment variable
        # `$NFPM_ID_RPM_PASSPHRASE` with a fallback to `$NFPM_ID_PASSPHRASE`,
        # where ID is the id of the current nfpm config.
        # The id will be transformed to uppercase.
        # E.g. If your nfpm id is 'default' then the rpm-specific passphrase
        # should be set as `$NFPM_DEFAULT_RPM_PASSPHRASE`
        #
        # Templates: allowed
        key_file: "{{ .Env.GPG_KEY_PATH }}"

    # Custom configuration applied only to the Deb packager.
    deb:
      # Lintian overrides
      lintian_overrides:
        - statically-linked-binary
        - changelog-file-missing-in-native-package

      # Custom deb special files.
      scripts:
        # Deb rules script.
        rules: foo.sh
        # Deb templates file, when using debconf.
        templates: templates

      # Custom deb triggers
      triggers:
        # register interest on a trigger activated by another package
        # (also available: interest_await, interest_noawait)
        interest:
          - some-trigger-name
        # activate a trigger for another package
        # (also available: activate_await, activate_noawait)
        activate:
          - another-trigger-name

      # Packages which would break if this package would be installed.
      # The installation of this package is blocked if `some-package`
      # is already installed.
      breaks:
        - some-package

      # The package is signed if a key_file is set
      signature:
        # PGP secret key file path (can also be ASCII-armored).
        # The passphrase is taken from the environment variable
        # `$NFPM_ID_DEB_PASSPHRASE` with a fallback to `$NFPM_ID_PASSPHRASE`,
        # where ID is the id of the current nfpm config.
        # The id will be transformed to uppercase.
        # E.g. If your nfpm id is 'default' then the deb-specific passphrase
        # should be set as `$NFPM_DEFAULT_DEB_PASSPHRASE`
        #
        # Templates: allowed
        key_file: "{{ .Env.GPG_KEY_PATH }}"

        # The type describes the signers role, possible values are "origin",
        # "maint" and "archive".
        #
        # Default: 'origin'
        type: origin

    apk:
      # APK specific scripts.
      scripts:
        # The preupgrade script runs before APK upgrade.
        preupgrade: ./scripts/preupgrade.sh
        # The postupgrade script runs after APK.
        postupgrade: ./scripts/postupgrade.sh

      # The package is signed if a key_file is set
      signature:
        # PGP secret key file path (can also be ASCII-armored).
        # The passphrase is taken from the environment variable
        # `$NFPM_ID_APK_PASSPHRASE` with a fallback to `$NFPM_ID_PASSPHRASE`,
        # where ID is the id of the current nfpm config.
        # The id will be transformed to uppercase.
        # E.g. If your nfpm id is 'default' then the apk-specific passphrase
        # should be set as `$NFPM_DEFAULT_APK_PASSPHRASE`
        #
        # Templates: allowed
        key_file: "{{ .Env.GPG_KEY_PATH }}"

        # The name of the signing key. When verifying a package, the signature
        # is matched to the public key store in /etc/apk/keys/<key_name>.rsa.pub.
        #
        # Default: maintainer's email address
        # Templates: allowed (since v1.15)
        key_name: origin

    archlinux:
      # Archlinux-specific scripts
      scripts:
        # The preupgrade script runs before pacman upgrades the package.
        preupgrade: ./scripts/preupgrade.sh
        # The postupgrade script runs after pacman upgrades the package.
        postupgrade: ./scripts/postupgrade.sh

      # The pkgbase can be used to explicitly specify the name to be used to refer
      # to a group of packages. See: https://wiki.archlinux.org/title/PKGBUILD#pkgbase.
      pkgbase: foo

      # The packager refers to the organization packaging the software, not to be confused
      # with the maintainer, which is the person who maintains the software.
      packager: GoReleaser <staff@goreleaser.com>
```

Learn more about the [name template engine](https://goreleaser.com/customization/templates/).



## Checksums 校验

GoReleaser 会生成一个文件并将其与版本一起上传，以便您的用户可以验证下载的文件是否正确。

该部分允许自定义文件名：

```jsx
# .goreleaser.yaml
checksum:
  # You can change the name of the checksums file.
  #
  # Default: {{ .ProjectName }}_{{ .Version }}_checksums.txt
  # Templates: allowed
  name_template: "{{ .ProjectName }}_checksums.txt"

  # Algorithm to be used.
  # Accepted options are sha256, sha512, sha1, crc32, md5, sha224 and sha384.
  #
  # Default: sha256.
  algorithm: sha256

  # IDs of artifacts to include in the checksums file.
  #
  # If left empty, all published binaries, archives, linux packages and source archives
  # are included in the checksums file.
  ids:
    - foo
    - bar

  # Disable the generation/upload of the checksum file.
  disable: true

  # You can add extra pre-existing files to the checksums file.
  # The filename on the checksum will be the last part of the path (base).
  # If another file with the same name exists, the last one found will be used.
  #
  # Templates: allowed
  extra_files:
    - glob: ./path/to/file.txt
    - glob: ./glob/**/to/**/file/**/*
    - glob: ./glob/foo/to/bar/file/foobar/override_from_previous
    - glob: ./single_file.txt
      name_template: file.txt # note that this only works if glob matches 1 file only

  # Additional templated extra files to add to the checksum.
  # Those files will have their contents pass through the template engine,
  # and its results will be added to the checksum.
  #
  # Since: v1.17 (pro)
  # This feature is only available in GoReleaser Pro.
  # Templates: allowed
  templated_extra_files:
    - src: LICENSE.tpl
      dst: LICENSE.txt
```

## Snapcraft Packages (snaps) Snapcraft Packages

GoReleaser也可以生成软件包。Snaps 是一种新的打包格式，可让您将项目直接发布到 Ubuntu 商店。从那里，它可以安装在所有受支持的Linux发行版中，并进行自动和事务性更新。

您可以在 snapcraft 文档中阅读更多相关信息。

**Snaps是适用于桌面**、**云**和**物联网**的 Linux 应用程序包，易于安装、安全、跨平台且无依赖性。

它们会**自动更新，并且通常在有限的**基于**事务的**环境中运行。**安全性和稳健性**是其主要特点，此外还**易于安装**、**易于维护**和**易于升级**。

**Snapd 发布流程**

snapd 是管理和维护快照的后台服务。它本身可以作为Available as snaps or traditional Linux packages such as *deb* or RPM.

There are two types of releases; major and minor releases, represented by the numeric status of their version number, with a minor period and a number reserved for minor releases:

- Major version releases: 2.53, 2.54, 2.55
- Minor version releases: 2.53.1, 2.53.2

The difference between a major release and a minor release is its planning, preparation, and motivation. There is a major release cycle every few weeks, but sometimes we need intermediate minor releases that contain smaller changes and fixes.

Differences between major releases and subsequent minor releases (e.g. 2.53 -> 2.53.1) are kept as small and targeted as possible, and major code refactorings and new features are omitted. This is not always possible because sometimes the bugs or features are complex, but this is our primary goal.

**Step-by-step release process**

- [https://gist.github.com/baymaxium/e1602202e7a3ef53a723ae14a3e928bc](https://gist.github.com/baymaxium/e1602202e7a3ef53a723ae14a3e928bc)

**Use Snapcraft to build and publish Snap installation packages**

Generate an initial project:

```jsx
$ snapcraft init
Created snap/snapcraft.yaml.
```

## Docker Images

GoReleaser can build and push Docker images. Let's see how it works.

You can declare multiple Docker images. They will be matched against section-generated binaries and section-generated packages.

If you only have one setting, configuration is as simple as adding the image name to a file:

```jsx
dockers:
   - image_templates:
       -user/repo
```

You will also need to create a `Dockerfile` in the root folder of your project:

```jsx
FROM scratch
ENTRYPOINT ["/mybin"]
COPY mybin /
```

This configuration will build and push a Docker image named .

**Customization**

```jsx
# .goreleaser.yaml
dockers:
   # You can have multiple Docker images.
   - #
     # ID of the image, needed if you want to filter by it later on (e.g. on custom publishers).
     id: myimg

     # GOOS of the built binaries/packages that should be used.
     # Default: 'linux'
     goos: linux

     # GOARCH of the built binaries/packages that should be used.
     # Default: 'amd64'
     goarch: amd64

     # GOARM of the built binaries/packages that should be used.
     # Default: '6'
     goarm: ""

     # GOAMD64 of the built binaries/packages that should be used.
     # Default: 'v1'
     goamd64: "v2"

     # IDs to filter the binaries/packages.
     ids:
       -mybuild
       -mynfpm

     # Templates of the Docker image names.
     #
     # Templates: allowed
     image_templates:
       - "myuser/myimage:latest"
       - "myuser/myimage:{{ .Tag }}"
       - "myuser/myimage:{{ .Tag }}-{{ .Env.FOOBAR }}"
       - "myuser/myimage:v{{ .Major }}"
       - "gcr.io/myuser/myimage:latest"

     # Skips the docker build.
     # Could be useful if you want to skip building the windows docker image on
     # linux, for example.
     #
     # Templates: allowed
     # Since: v1.14 (pro)
     # This option is only available on GoReleaser Pro.
     skip_build: false

     # Skips the docker push.
     # Could be useful if you also do draft releases.
     #
     # If set to auto, the release will not be pushed to the Docker repository
     # in case there is an indicator of a prerelease in the tag, e.g. v1.0.0-rc1.
     #
     # Templates: allowed (since v1.19)
     skip_push: false

     # Path to the Dockerfile (from the project root).
     #
     # Default: 'Dockerfile'
     dockerfile: "{{ .Env.DOCKERFILE }}"

     # Set the "backend" for the Docker pipe.
     #
     # Valid options are: docker, buildx, podman.
     #
     # Podman is a GoReleaser Pro feature and is only available on Linux.
     #
     # Default: 'docker'
     use:docker

     # Docker build flags.
     #
     # Templates: allowed
     build_flag_templates:
       - "--pull"
       - "--label=org.opencontainers.image.created={{.Date}}"
       - "--label=org.opencontainers.image.title={{.ProjectName}}"
       - "--label=org.opencontainers.image.revision={{.FullCommit}}"
       - "--label=org.opencontainers.image.version={{.Version}}"
       - "--build-arg=FOO={{.Env.Bar}}"
       - "--platform=linux/arm64"

     # Extra flags to be passed down to the push command.
     push_flags:
       - --tls-verify=false

     # If your Dockerfile copies files other than binaries and packages,
     # you should list them here as well.
     # Note that GoReleaser will create the same structure inside a temporary
     # folder, so if you add `foo/bar.json` here, on your Dockerfile you can
     # `COPY foo/bar.json /whatever.json`.
     # Also note that the paths here are relative to the folder in which
     # GoReleaser is being run (usually the repository root folder).
     # This field does not support wildcards, you can add an entire folder here
     # and use wildcards when you `COPY`/`ADD` in your Dockerfile.
     extra_files:
       -config.yml

     # Additional templated extra files to add to the Docker image.
     # Those files will have their contents pass through the template engine,
     # and its results will be added to the build context the same way as the
     # extra_files field above.
     #
     # Since: v1.17 (pro)
     # This feature is only available in GoReleaser Pro.
     # Templates: allowed
     templated_extra_files:
       - src: LICENSE.tpl
         dst: LICENSE.txt
         mode: 0644
```

## Docker Images

GoReleaser can build and push Docker images. Let's see how it works.

You can declare multiple Docker images. They will be matched against section-generated binaries and section-generated packages.

If you only have a build setting, configuration is as simple as adding the image name to a file:

```jsx
dockers:
   - image_templates:
       -user/repo
```

You also need to create one in the root folder of your project:

```jsx
FROM scratch
ENTRYPOINT ["/mybin"]
COPY mybin/
```

This configuration will build and push a Docker image named .

**Customization**

```jsx
# .goreleaser.yaml
dockers:
   # You can have multiple Docker images.
   - #
     # ID of the image, needed if you want to filter by it later on (e.g. on custom publishers).
     id: myimg

     #GOOS of the built binariess/packages that should be used.
    # Default: 'linux'
    goos: linux

    # GOARCH of the built binaries/packages that should be used.
    # Default: 'amd64'
    goarch: amd64

    # GOARM of the built binaries/packages that should be used.
    # Default: '6'
    goarm: ""

    # GOAMD64 of the built binaries/packages that should be used.
    # Default: 'v1'
    goamd64: "v2"

    # IDs to filter the binaries/packages.
    ids:
      - mybuild
      - mynfpm

    # Templates of the Docker image names.
    #
    # Templates: allowed
    image_templates:
      - "myuser/myimage:latest"
      - "myuser/myimage:{{ .Tag }}"
      - "myuser/myimage:{{ .Tag }}-{{ .Env.FOOBAR }}"
      - "myuser/myimage:v{{ .Major }}"
      - "gcr.io/myuser/myimage:latest"

    # Skips the docker build.
    # Could be useful if you want to skip building the windows docker image on
    # linux, for example.
    #
    # Templates: allowed
    # Since: v1.14 (pro)
    # This option is only available on GoReleaser Pro.
    skip_build: false

    # Skips the docker push.
    # Could be useful if you also do draft releases.
    #
    # If set to auto, the release will not be pushed to the Docker repository
    #  in case there is an indicator of a prerelease in the tag, e.g. v1.0.0-rc1.
    #
    # Templates: allowed (since v1.19)
    skip_push: false

    # Path to the Dockerfile (from the project root).
    #
    # Default: 'Dockerfile'
    dockerfile: "{{ .Env.DOCKERFILE }}"

    # Set the "backend" for the Docker pipe.
    #
    # Valid options are: docker, buildx, podman.
    #
    # Podman is a GoReleaser Pro feature and is only available on Linux.
    #
    # Default: 'docker'
    use: docker

    # Docker build flags.
    #
    # Templates: allowed
    build_flag_templates:
      - "--pull"
      - "--label=org.opencontainers.image.created={{.Date}}"
      - "--label=org.opencontainers.image.title={{.ProjectName}}"
      - "--label=org.opencontainers.image.revision={{.FullCommit}}"
      - "--label=org.opencontainers.image.version={{.Version}}"
      - "--build-arg=FOO={{.Env.Bar}}"
      - "--platform=linux/arm64"

    # Extra flags to be passed down to the push command.
    push_flags:
      - --tls-verify=false

    # If your Dockerfile copies files other than binaries and packages,
    # you should list them here as well.
    # Note that GoReleaser will create the same structure inside a temporary
    # folder, so if you add `foo/bar.json` here, on your Dockerfile you can
    # `COPY foo/bar.json /whatever.json`.
    # Also note that the paths here are relative to the folder in which
    # GoReleaser is being run (usually the repository root folder).
    # This field does not support wildcards, you can add an entire folder here
    # and use wildcards when you `COPY`/`ADD` in your Dockerfile.
    extra_files:
      - config.yml

    # Additional templated extra files to add to the Docker image.
    # Those files will have their contents pass through the template engine,
    # and its results will be added to the build context the same way as the
    # extra_files field above.
    #
    # Since: v1.17 (pro)
    # This feature is only available in GoReleaser Pro.
    # Templates: allowed
    templated_extra_files:
      - src: LICENSE.tpl
        dst: LICENSE.txt
        mode: 0644
```

请注意，您必须手动登录到要推送到的Docker注册表 - GoReleaser不会自行登录。

> 请注意，您必须手动登录到要推送到的Docker注册表 - GoReleaser不会自行登录。

这些设置应该允许您生成多个 Docker 映像，例如，使用多个语句，以及为项目中的每个二进制文件生成一个映像或一个具有多个二进制文件的映像，以及安装生成的包而不是手动复制二进制文件和配置。

### 通用映像名称

某些用户可能希望使其映像名称尽可能通用。这可以通过在定义中添加模板语言来实现：

```jsx
# .goreleaser.yaml
project_name: foo
dockers:
  - image_templates:
      - "myuser/{{.ProjectName}}"
```

这将生成并发布以下映像：

- `myuser/foo`

### 保持当前主要内容的 docker 映像更新

一些用户可能想要推送 docker 标记 、 以及何时（例如）构建。这可以通过使用多个：

```jsx
# .goreleaser.yaml
dockers:
  - image_templates:
      - "myuser/myimage:{{ .Tag }}"
      - "myuser/myimage:v{{ .Major }}"
      - "myuser/myimage:v{{ .Major }}.{{ .Minor }}"
      - "myuser/myimage:latest"
```

这将生成并发布以下映像：

- `myuser/myimage:v1.6.4`
- `myuser/myimage:v1`
- `myuser/myimage:v1.6`
- `myuser/myimage:latest`

通过这些设置，您可以希望推送多个具有多个标签的 Docker 映像。

### 发布到多个 docker 注册表

某些用户可能希望将映像推送到多个 docker 注册表。这可以通过使用多个：

```jsx
# .goreleaser.yaml
dockers:
  - image_templates:
      - "docker.io/myuser/myimage:{{ .Tag }}"
      - "docker.io/myuser/myimage:latest"
      - "gcr.io/myuser/myimage:{{ .Tag }}"
      - "gcr.io/myuser/myimage:latest"
```

这会生成以下映像并将其发布到 和 ：

- `myuser/myimage:v1.6.4`
- `myuser/myimage:latest`
- `gcr.io/myuser/myimage:v1.6.4`
- `gcr.io/myuser/myimage:latest`

### 应用 Docker 构建标志

可以使用 应用生成标志。这些标志必须是有效的 Docker 构建标志。

```jsx
# .goreleaser.yaml
dockers:
  - image_templates:
      - "myuser/myimage"
    build_flag_templates:
      - "--pull"
      - "--label=org.opencontainers.image.created={{.Date}}"
      - "--label=org.opencontainers.image.title={{.ProjectName}}"
      - "--label=org.opencontainers.image.revision={{.FullCommit}}"
      - "--label=org.opencontainers.image.version={{.Version}}"
```

This will execute the following command:

```jsx
docker build -t myuser/myimage . \
   --pull \
   --label=org.opencontainers.image.created=2020-01-19T15:58:07Z \
   --label=org.opencontainers.image.title=mybinary \
   --label=org.opencontainers.image.revision=da39a3ee5e6b4b0d3255bfef95601890afd80709 \
   --label=org.opencontainers.image.version=1.6.4
```

### Using specific builders with Docker buildx

If enabled, the context builder is used when building the image. This builder is always available and powered by BuildKit in the Docker engine. If you want to use a different builder, you can specify it using the following fields:

```jsx
# .goreleaser.yaml
dockers:
   - image_templates:
       - "myuser/myimage"
     use: buildx
     build_flag_templates:
       - "--builder=mybuilder"
```

### Podman

You can use instead by setting it on the config to:

```jsx
# .goreleaser.yaml
dockers:
   - image_templates:
       - "myuser/myimage"
     use:podman
```

Please note that GoReleaser will not install Podman for you, nor will it change any of its configuration.

## Docker Manifests

GoReleaser can also use the tool to create and push Docker multi-platform images.

There is no need to switch devices. We can directly build `amd64`, which is the Linux platform image, on the Apple M2 chip machine. The `docker build` command provides the `--platform` parameter to build a cross-platform image.

```jsx
docker build --platform=linux/amd64 -t kubecub/echo-platform-amd64 .
```

What happens when running images for different platforms:

You may be wondering what will happen if you run an `amd64` platform image on a host device with an Apple M2 chip. The simple image we have built so far can actually run, but you will get a warning message:

```jsx
$ docker run --rm kubecub/echo-platform-amd64
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
Linux buildkitsandbox 5.15.49-linuxkit #1 SMP PREEMPT Tue Sep 13 07:51:32 UTC 2022 x86_64 Linux
```

`x86_64` in the output content means `AMD64` architecture.

> Note: Although this simple image can run successfully, if the program inside the container does not support cross-platform, the `amd64` platform image cannot run successfully on the `arm64` platform.

**Use manifest to merge multi-platform images**

We can use the `create` subcommand of `docker manifest` to create a `manifest list`, that is, to merge the images of multiple platforms into one image.

The usage of the `create` command is very simple. The first parameter `jianghushinian/echo-platform` followed is the merged image. Starting from the second parameter, you can specify one or more images of different platforms.

```jsx
docker manifest create kubecub/echo-platform kubecub/echo-platform-arm64 kubecub/echo-platform-amd64
```

Log in to [Docker Hub](https://link.juejin.cn/?target=https%3A%2F%2Fhub.docker.com%2F) in the browser to view the successfully pushed image:

> Enter the `Tags` tab of the image information details page, and you can see that the image supports the two platforms `amd64` and `arm64/v8`.

### Manifest command

It can be found that `docker manifest` provides a total of 5 sub-commands: `annotate`, `create`, `inspect`, `push`, and `rm`.

It can be found that the `create` subcommand supports two optional parameters `-a/--amend` to modify existing multi-architecture images.

Specifying the `--insecure` parameter allows the use of insecure (non-https) mirror repositories.

### push

We have also seen the `push` subcommand. Using `push` we can push multi-architecture images to the image warehouse.

Similarly, `push` also has a `--insecure` parameter that allows the use of insecure (non-https) mirror repositories.

- The function of the `p/--purge` option is to delete the local `manifest list` after pushing the local image to the remote warehouse.

### inspect

`inspect` is used to view the image information contained in `manifest`/`manifest list`.

The `--insecure` parameter allows the use of insecure (non-https) mirror repositories. This is the third time we have seen this parameter, which also verifies the statement that the `docker manifest` command requires an Internet connection to be used, because these subcommands basically involve interaction with the remote mirror repository.

### annotate

The `annotate` subcommand can add additional information to a local image `manifest`. This is a bit like what K8s Annotations means.

The optional parameter list is as follows:

| Options | Description |
| ------------- | ---------------------------------- ---------------------------------- |
| --arch | Set CPU architecture information. |
| --os | Set operating system information. |
| --os-features | Set operating system feature information. |
| --os-version | Set operating system version information. |
| --variant | Set the variant information of the CPU architecture (translated as "variant"), such as v7, v8, etc. of the ARM architecture. |

## rm

The last subcommand to be introduced is `rm`. Use `rm` to delete one or more local multi-architecture mirrors (`manifest lists`).

###Customization

You can create multiple manifests in one GoReleaser run, here are all the available options:

```jsx
# .goreleaser.yaml
docker_manifests:
   # You can have multiple Docker manifests.
-
   # ID of the manifest, needed if you want to filter by it later on (e.g. on
   # custom publishers).
   id: myimg

   # Name for the manifest.
   #
   # Templates: allowed
   name_template: "foo/bar:{{ .Version }}"

   # Image name to be added to this manifest.
   #
   # Templates: allowed
   image_templates:
   - "foo/bar:{{ .Version }}-amd64"
   - "foo/bar:{{ .Version }}-arm64v8"

   # Extra flags to be passed down to the manifest create command.
   create_flags:
   - --insecure

   # Extra flags to be passed down to the manifest push command.
   push_flags:
   - --insecure

   # Skips the Docker manifest.
   # If you set this to `false` or `auto` on your source Docker configuration,
   # you'll probably want to do the same here.
   #
   # If set to `auto`, the manifest will not be created in case there is an
   # indicator of a prerelease in the tag, e.g. v1.0.0-rc1.
   #
   # Templates: allowed (since v1.19)
   skip_push: false

   # Set the "backend" for the Docker manifest pipe.
   # Valid options are: docker, podman
   #
   # Relevant notes:
   # 1. podman is a GoReleaser Pro feature and is only available on Linux;
   # 2. if you set podman here, the respective docker configuration need to use
   #podman too.
   #
   # Default: 'docker'
   use:docker
```

## KO

https://github.com/ko-build/ko

KO is Build and deploy Go applications

installdocs:

[Installation - ko: Easy Go Containers](https://ko.build/install/)

User Actions:

```jsx
steps:
- uses: imjasonh/setup-ko@v0.6
```

**User Ko:**

`ko` depends on the authentication configured in the Docker configuration (usually `~/.docker/config.json`).

✨**If you can push images using `docker push`, you have passed the statusVerify `ko`! **✨

Since `ko` does not require `docker`, `ko login` also provides an interface to log into the container image registry using a username and password, similar to `[docker login](https://docs.docker.com/engine/ reference/commandline/login/)`.

Additionally, even if authentication is not configured in the Docker configuration, `ko` includes built-in support for authenticating to the following container registries using credentials configured in the environment:

- Google Container Registry and Artifact Registry, using [Application Default Credentials](https://cloud.google.com/docs/authentication/production)`gcloud`

   or

- Amazon Elastic Container Registry, using [AWS Credentials](https://github.com/awslabs/amazon-ecr-credential-helper/#aws-credentials)

- Azure Container Registry, using [environment variables](https://github.com/chrismellard/docker-credential-acr-env/)

- GitHub Container Registry, using the `GITHUB_TOKEN` environment variable

`ko` depends on the environment variable `KO_DOCKER_REPO` to determine where its built image should be pushed. Typically this will be the remote registry, for example:

- `KO_DOCKER_REPO=gcr.io/my-project`, or
- `KO_DOCKER_REPO=ghcr.io/my-org/my-repo`, or
- `KO_DOCKER_REPO=my-dockerhub-user`

**step:**

```jsx
echo "***" | docker login ghcr.io -u kuebcub --password-stdin
export GITHUB_TOKEN="******"
export KO_DOCKER_REPO=ghcr.io/kubecub/exporter; ko build ./cmd/exporter
```

**test:**

```jsx
docker run -p 8080:8080 $(ko build ./cmd/app)
```

## Docker Images with Ko

Note that ko will build your binary again. This shouldn't increase release time too much, as it will use the same build options as the build pipeline where possible, so the results may be cached.

```jsx
# .goreleaser.yaml
kos:
-
   # ID of this image.
   id: foo

   # Build ID that should be used to import the build settings.
   build: build-id

   # Main path to build.
   #
   # Default: build.main
   main: ./cmd/...

   # Working directory used to build.
   #
   # Default: build.dir
   working_dir: .

   # Base image to publish to use.
   #
   # Default: 'cgr.dev/chainguard/static'
   base_image: alpine

   # Labels for the image.
   #
   # Since: v1.17
   labels:
     foo: bar

   # Repository to push to.
   #
   # Default: $KO_DOCKER_REPO
   repository: ghcr.io/foo/bar

   # Platforms to build and publish.
   #
   # Default: 'linux/amd64'
   platforms:
   - linux/amd64
   - linux/arm64

   # Tag to build and push.
   # Empty tags are ignored.
   #
   # Default: 'latest'
   # Templates: allowed
   tags:
   -latest
   - '{{.Tag}}'
   - '{{if not .Prerelease}}stable{{end}}'

   # Creation time given to the image
   # in seconds since the Unix epoch as a string.
   #
   # Since: v1.17
   # Templates: allowed
   creation_time: '{{.CommitTimestamp}}'

   # Creation time given to the files in the kodata directory
   # in seconds since the Unix epoch as a string.
   #
   # Since: v1.17
   # Templates: allowed
   ko_data_creation_time: '{{.CommitTimestamp}}'

   # SBOM format to use.
   #
   # Default: 'spdx'
   # Valid options are: spdx, cyclonedx, go.version-m and none.
   sbom: none

   # Ldflags to use on build.
   #
   # Default: build.ldflags
   ldflags:
   - foo
   - bar

   # Flags to use on build.
   #
   # Default: build.flags
   flags:
   - foo
   - bar

   # Env to use on build.
   #
   # Default: build.env
   env:
   - FOO=bar
   - SOMETHING=value

   # Bare uses a tag on the $KO_DOCKER_REPO without anything additional.
   bare: true

   # Whether to preserve the full import path after the repository name.
   preserve_import_paths: true

   # Whether to use the base path without the MD5 hash after the repository name.
   base_import_paths: true
```

Here's a minimal example:

```jsx
# .goreleaser.yml
before:
   hooks:
     - go mod tidy

builds:
   - env: [ "CGO_ENABLED=1" ]
     binary: test
     goos:
     - darwin
     - linux
     goarch:
     -amd64
     - arch64

kos:
   - repository: ghcr.io/caarlos0/test-ko
     tags:
     - '{{.Version}}'
     -latest
     bare: true
     preserve_import_paths: false
     platforms:
     - linux/amd64
     - linux/arm64
```

This will build binaries for , , and Docker images and manifests for Linux.

## Package size

```jsx
# .goreleaser.yaml
# Whether to enable the size reporting or not.
report_sizes: true
```

## Metadata Metadata

GoReleaser creates some metadata files in the folder before finishing running.

```jsx
# .goreleaser.yaml
#
metadata:
   # Set the modified timestamp on the metadata files.
   #
   # Templates: allowed.
   mod_timestamp: "{{ .CommitTimestamp }}"
```

## Signature verification

GoReleaser provides methods for signing executable files and archives.

Signatures are used in conjunction with a checksum file, and it is usually sufficient to just sign the checksum file.

The default configuration is to create a standalone signature for the checksum file using [GnuPG](https://www.gnupg.org/), along with your default key. To enable signing just add

```jsx
# .goreleaser.yaml
signs:
   - artifacts: checksum
```

To customize the signing pipeline, you have the following options:

```jsx
# .goreleaser.yaml
signs:
   -
     # ID of the sign config, must be unique.
     #
     # Default: 'default'
     id: foo

     # Name of the signature file.
     #
     # Default: '${artifact}.sig'
     # Templates: allowed
     signature: "${artifact}_sig"

     # Path to the signature command
     #
     # Default: 'gpg'
     cmd: gpg2

     # Command line arguments for the command
     #
     # to sign with a specific key use
     # args: ["-u", "<key id, fingerprint, email, ...>", "--output", "${signature}", "--detach-sign", "${artifact} "]
     #
     # Default: ["--output", "${signature}", "--detach-sign", "${artifact}"]
     # Templates: allowed
     args: ["--output", "${signature}", "${artifact}", "{{ .ProjectName }}"]

     # Which artifacts to sign
     #
     # all: all artifacts
     # none: no signing
     # checksum: only checksum file(s)
     # source: source archive
     # package: linux packages (deb, rpm, apk)
     # archive: archives from archive pipe
    #   binary:   binaries if archiving format is set to binary
    #   sbom:     any Software Bill of Materials generated for other artifacts
    #
    # Default: 'none'
    artifacts: all

    # IDs of the artifacts to sign.
    #
    # If `artifacts` is checksum or source, this fields has no effect.
    ids:
      - foo
      - bar

    # Stdin data to be given to the signature command as stdin.
    #
    # Templates: allowed
    stdin: '{{ .Env.GPG_PASSWORD }}'

    # StdinFile file to be given to the signature command as stdin.
    stdin_file: ./.password

    # Sets a certificate that your signing command should write to.
    # You can later use `${certificate}` or `.Env.certificate` in the `args` section.
    # This is particularly useful for keyless signing (for instance, with cosign).
    # Note that this should be a name, not a path.
    certificate: '{{ trimsuffix .Env.artifact ".tar.gz" }}.pem'

    # List of environment variables that will be passed to the signing command
    # as well as the templates.
    env:
    - FOO=bar
    - HONK=honkhonk

    # By default, the stdout and stderr of the signing cmd are discarded unless
    # GoReleaser is running with `--debug` set.
    # You can set this to true if you want them to be displayed regardless.
    #
    # Since: v1.2
    output: true
```

### 可用的变量名称

这些环境变量可能在接受模板的字段中可用：

- `${artifact}`：将被签名的工件的路径
- `${artifactID}`：将被签名的工件的ID
- `${certificate}`：证书文件名（如果提供）
- `${signature}`: 签名文件名

假设你有一个`cosign.key`在存储库根目录和`COSIGN_PWD`环境变量设置，一个简单的使用示例如下：

```jsx
# .goreleaser.yaml
signs:
- cmd: cosign
  stdin: '{{ .Env.COSIGN_PWD }}'
  args:
  - "sign-blob"
  - "--key=cosign.key"
  - "--output-signature=${signature}"
  - "${artifact}"
  - "--yes" # needed on cosign 2.0.0+
  artifacts: all
```

然后，您的用户可以通过以下方式验证签名：

`cosign verify-blob -key cosign.pub -signature file.tar.gz.sig file.tar.gz`

## 对 Docker 映像和清单进行签名

使用 GoReleaser 也可以对 Docker 映像和清单进行签名。该管道是根据通用标志管道设计的，并考虑了共签名。

```jsx
# .goreleaser.yml
docker_signs:
  -
    # ID of the sign config, must be unique.
    # Only relevant if you want to produce some sort of signature file.
    #
    # Default: 'default'
    id: foo

    # Path to the signature command
    #
    # Default: 'cosign'
    cmd: cosign

    # Command line arguments for the command
    #
    # Templates: allowed
    # Default: ["sign", "--key=cosign.key", "${artifact}@${digest}", "--yes"]
    args:
    - "sign"
    - "--key=cosign.key"
    - "--upload=false"
    - "${artifact}"
    - "--yes" # needed on cosign 2.0.0+

    # Which artifacts to sign
    #
    #   all:       all artifacts
    #   none:      no signing
    #   images:    only docker images
    #   manifests: only docker manifests
    #
    # Default: 'none'
    artifacts: all

    # IDs of the artifacts to sign.
    ids:
      - foo
      - bar

    # Stdin data to be given to the signature command as stdin.
    #
    # Templates: allowed
    stdin: '{{ .Env.COSIGN_PWD }}'

    # StdinFile file to be given to the signature command as stdin.
    stdin_file: ./.password

    # List of environment variables that will be passed to the signing command as well as the templates.
    env:
    - FOO=bar
    - HONK=honkhonk

    # By default, the stdout and stderr of the signing cmd are discarded unless GoReleaser is running with `--debug` set.
    # You can set this to true if you want them to be displayed regardless.
    #
    # Since: v1.2
    output: true
```

这些环境变量可能在可模板化的字段中可用：

- `${artifact}`: 将要签名的项目的路径
- `${digest}`: 将签名的映像/清单的摘要
- `${artifactID}`: 将要签名的项目的 ID
- `${certificate}`: 证书文件名（如果提供）

## Release

GoReleaser 可以使用当前标签创建 GitHub/GitLab/Gitea 版本，上传所有工件，并根据自上一个标签以来的新提交生成更改日志。

让我们看看 GitHub 部分可以自定义的内容：

```jsx
# .goreleaser.yaml
release:
  # Repo in which the release will be created.
  # Default is extracted from the origin remote URL or empty if its private hosted.
  github:
    owner: user
    name: repo

  # IDs of the archives to use.
  # Empty means all IDs.
  #
  # Default: []
  ids:
    - foo
    - bar

  # If set to true, will not auto-publish the release.
  # Available only for GitHub and Gitea.
  #
  # Default: false
  draft: false

  # Whether to remove existing draft releases with the same name before creating
  # a new one.
  # Only effective if `draft` is set to true.
  # Available only for GitHub.
  #
  # Default: false
  # Since: v1.11
  replace_existing_draft: false

  # Useful if you want to delay the creation of the tag in the remote.
  # You can create the tag locally, but not push it, and run GoReleaser.
  # It'll then set the `target_commitish` portion of the GitHub release to the
  # value of this field.
  # Only works on GitHub.
  #
  # Default: ''
  # Since: v1.11
  # Templates: allowed
  target_commitish: "{{ .Commit }}"

  # This allows to change which tag GitHub will create.
  # Usually you'll use this together with `target_commitish`, or if you want to
  # publish a binary from a monorepo into a public repository somewhere,without
  # the tag prefix.
  #
  # Default: '{{ .PrefixedCurrentTag }}'
  # Since: v1.19 (pro)
  # Templates: allowed
  tag: "{{ .CurrentTag }}"

  # If set, will create a release discussion in the category specified.
  #
  # Warning: do not use categories in the 'Announcement' format.
  #  Check https://github.com/goreleaser/goreleaser/issues/2304 for more info.
  #
  # Default is empty.
  discussion_category_name: General

  # If set to auto, will mark the release as not ready for production
  # in case there is an indicator for this in the tag e.g. v1.0.0-rc1
  # If set to true, will mark the release as not ready for production.
  # Default is false.
  prerelease: auto

  # If set to false, will NOT mark the release as "latest".
  # This prevents it from being shown at the top of the release list,
  # and from being returned when calling https://api.github.com/repos/OWNER/REPO/releases/latest.
  #
  # Available only for GitHub.
  #
  # Default is true.
  # Since: v1.20.
  make_latest: true

  # What to do with the release notes in case there the release already exists.
  #
  # Valid options are:
  # - `keep-existing`: keep the existing notes
  # - `append`: append the current release notes to the existing notes
  # - `prepend`: prepend the current release notes to the existing notes
  # - `replace`: replace existing notes
  #
  # Default is `keep-existing`.
  mode: append

  # Header for the release body.
  #
  # Templates: allowed
  header: |
    ## Some title ({{ .Date }})

    Welcome to this new release!

  # Footer for the release body.
  #
  # Templates: allowed
  footer: |
    ## Thanks!

    Those were the changes on {{ .Tag }}!

  # You can change the name of the release.
  #
  # Default: '{{.Tag}}' ('{{.PrefixedTag}}' on Pro)
  # Templates: allowed
  name_template: "{{.ProjectName}}-v{{.Version}} {{.Env.USER}}"

  # You can disable this pipe in order to not create the release on any SCM.
  # Keep in mind that this might also break things that depend on the release
  # URL, for instance, homebrew taps.
  #
  # Templates: allowed (since v1.15)
  disable: true

  # Set this to true if you want to disable just the artifact upload to the SCM.
  # If this is true, GoReleaser will still create the release with the
  # changelog, but won't upload anything to it.
  #
  # Since: v1.11
  # Templates: allowed (since v1.15)
  skip_upload: true

  # You can add extra pre-existing files to the release.
  # The filename on the release will be the last part of the path (base).
  # If another file with the same name exists, the last one found will be used.
  #
  # Templates: allowed
  extra_files:
    - glob: ./path/to/file.txt
    - glob: ./glob/**/to/**/file/**/*
    - glob: ./glob/foo/to/bar/file/foobar/override_from_previous
    - glob: ./single_file.txt
      name_template: file.txt # note that this only works if glob matches 1 file only

  # Additional templated extra files to add to the release.
  # Those files will have their contents pass through the template engine,
  # and its results will be added to the release.
  #
  # Since: v1.17 (pro)
  # This feature is only available in GoReleaser Pro.
  # Templates: allowed
  templated_extra_files:
    - src: LICENSE.tpl
      dst: LICENSE.txt
```

## GPG 认证

GitHub 支持多种 GPG 关键算法。如果您尝试添加使用不受支持的算法生成的密钥，则可能会遇到错误。

### 检查现有 GPG 密钥

使用该`gpg --list-secret-keys --keyid-format=long`命令列出您拥有公钥和私钥的 GPG 密钥的长格式。签署提交或标签需要私钥。

```jsx
gpg --list-secret-keys --keyid-format=long
```

### 生成新的 GPG 密钥

通过 git 的参数校验。配置：

```jsx
git config --global gpg.program gpg2
```

**生成密钥对：**

```jsx
gpg --full-generate-key
```

**检查密钥对：**

```jsx
gpg --list-secret-keys --keyid-format=long
```

从 GPG 密钥列表中，复制您要使用的 GPG 密钥 ID 的完整形式。

1. 在此示例中，GPG 密钥 ID 为`3AA5C34371567BD2`：

   ```
   $ gpg --list-secret-keys --keyid-format=long
   /Users/hubot/.gnupg/secring.gpg
   ------------------------------------
   sec   4096R/3AA5C34371567BD2 2016-03-10 [expires: 2017-03-10]
   uid                          Hubot <hubot@example.com>
   ssb   4096R/4BB6D45482678BE3 2016-03-10
   ```

2. 粘贴下面的文本，并将其替换为您要使用的 GPG 密钥 ID。在此示例中，GPG 密钥 ID 为`3AA5C34371567BD2`：

   ```
   gpg --armor --export 3AA5C34371567BD2
   # Prints the GPG key ID, in ASCII armor format
   ```

3. 复制您的 GPG 密钥，以 开头`----BEGIN PGP PUBLIC KEY BLOCK-----`和结尾`----END PGP PUBLIC KEY BLOCK-----`。

```jsx
cat /root/.gnupg/openpgp-revocs.d/4DDA37AE0F3AEA3044B33F1B1BAD6F395338EFDE.rev
```

然后就是将这个密钥链接到你的 GitHub 账户了。这个操作很简单，不介绍了

**告诉 Git 你的签名密钥：**

你还需要告诉 Git 关于你的 签名 密钥，因为 如果您有多个 GPG 密钥，则需要告诉 Git 使用哪一个。

1. 如果您之前已将 Git 配置为在使用 进行签名时使用不同的密钥格式，请取消设置此配置，以便使用`-gpg-sign`默认格式。`openpgp`

   ```
   git config --global --unset gpg.format
   ```

使用该`gpg --list-secret-keys --keyid-format=long`命令列出您拥有公钥和私钥的 GPG 密钥的长格式。签署提交或标签需要私钥。

```jsx
gpg --list-secret-keys --keyid-format=long
```

从 GPG 密钥列表中，复制您要使用的 GPG 密钥 ID 的完整形式。在此示例中，GPG 密钥 ID 为`3AA5C34371567BD2`：

```jsx
$ gpg --list-secret-keys --keyid-format=long
/Users/hubot/.gnupg/secring.gpg
-------------------------------------
sec 4096R/3AA5C34371567BD2 2016-03-10 [expires: 2017-03-10]
uid Hubot <hubot@example.com>
ssb 4096R/4BB6D45482678BE3 2016-03-10
```

To set a master GPG signing key in Git, paste the text below and replace it with the GPG master key ID you want to use. In this example, the GPG key ID is `3AA5C34371567BD2`:

```jsx
git config --global user.signingkey 3AA5C34371567BD2
```

Alternatively, include the suffix `!` when setting the subkey. In this example, the GPG subkey ID is `4BB6D45482678BE3`:

```jsx
git config --global user.signingkey 4BB6D45482678BE3!
```

Alternatively, to configure Git to sign all commits by default, enter the following command:

```jsx
git config --global commit.gpgsign true
```

+ [Tell Git about your SSH key](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key#telling-git-about -your-ssh-key)

You can use an existing SSH key to sign commits and tags, or generate a new key specifically for signing. For more information, see "[Generating new SSH keys and adding them to ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating -a-new-ssh-key-and-adding-it-to-the-ssh-agent)".

**Notice:**

We may need to add `export GPG_TTY=$(tty)` to the environment variables

### Signature tag

```jsx
$ git tag -s MYTAG
# Creates a signed tag
```

Verify your signing tag by running `git tag -v [tag-name]`.

```
$ git tag -v MYTAG
# Verifies the signed tag
```

## Cloud storage service

Allows you to upload artifacts to Amazon S3, Azure Blob, and Google GCS.

In fact, it’s not just these, but also domestic COS and CSS.

```jsx
# .goreleaser.yaml
blobs:
   # You can have multiple blob configs
   - # Cloud provider name:
     # - s3 for AWS S3 Storage
     # - azblob for Azure Blob Storage
     # - gs for Google Cloud Storage
     #
     # Templates: allowed
     provider: azblob

     # Set a custom endpoint, useful if you're using a minio backend or
     # other s3-compatible backends.
     #
     # Implies s3ForcePathStyle and requires provider to be `s3`
     #
     # Templates: allowed
     endpoint: https://minio.foo.bar

     # Sets the bucket region.
     # Requires provider to be `s3`
     #
     # Templates: allowed
     region: us-west-1

     # Disables SSL
     # Requires provider to be `s3`
     disableSSL: true

     # Bucket name.
     #
     # Templates: allowed
     bucket: goreleaser-bucket

     # IDs of the artifacts you want to upload.
     ids:
       - foo
       - bar

     # Path/name inside the bucket.
     #
     # Default: '{{ .ProjectName }}/{{ .Tag }}'
     # Templates: allowed
     folder: "foo/bar/{{.Version}}"

     # Whether to disable this particular upload configuration.
     #
     # Since: v1.17
     # Templates: allowed
     disable: '{{ neq .BLOB_UPLOAD_ONLY "foo" }}'

     # You can add extra pre-existing files to the bucket.
     # The filename on the release will be the last part of the path (base).
     # If another file with the same name exists, the last one found will be used.
     # These globs can also include templates.
     extra_files:
       - glob: ./path/to/file.txt
       - glob: ./glob/**/to/**/file/**/*
       - glob: ./glob/foo/to/bar/file/foobar/override_from_previous
       - glob: ./single_file.txt
         # Templates: allowed
         name_template: file.txt # note that this only works if glob matches 1 file only

     # Additional templated extra files to uploaded.
     # Those files will have their contents pass through the template engine,
     # and its results will be uploaded.
     #
     # Since: v1.17 (pro)
     # This feature is only available in GoReleaser Pro.
     # Templates: allowed
     templated_extra_files:
       - src: LICENSE.tpl
         dst: LICENSE.txt

   - provider: gs
     bucket: goreleaser-bucket
     folder: "foo/bar/{{.Version}}"
   - provider: s3
     bucket: goreleaser-bucket
     folder: "foo/bar/{{.Version}}"
```

### Fury.io (apt and rpm repositories)

**This is an advanced feature**, but sealos also uses it, using bash logic

You can easily create and repository on fury.io using GoReleaser.

First, you need to create an account on fury.io and get a push token.

You then need to pass your account name to GoReleaser and your push token as a file named `FURY_TOKEN` :

```jsx
# .goreleaser.yaml
furies:
-account:myaccount
```

This will automatically upload all your files.

**customize:**

```jsx
# goreleaser.yaml

furies:
   -
     # fury.io account.
     # Config is skipped if empty
     account: "{{ .Env.FURY_ACCOUNT }}"

     # Skip the announced feature in some conditions, for instance, when
     # publishing patch releases.
     # Any value different of 'true' will be considered 'false'.
     #
     # Templates: allowed
     skip: "{{gt .Patch 0}}"

     # Environment variable name to get the push token from.
     # You might want to change it if you have multiple fury configurations for
     # some reason.
     #
     # Default: 'FURY_TOKEN'
     secret_name: MY_ACCOUNT_FURY_TOKEN

     # IDs to filter by.
     # configurations get uploaded.
     ids:
       - packages

     # Formats to upload.
     # Available options are `deb` and `rpm`.
     #
     # Default: ['deb', 'rpm']
     formats:
       -deb
```

## Homebrew Taps

After publishing to GitHub, GitLab, or Gitea, GoReleaser can generate *homebrew-tap* and publish it to a repository that you have access to.

## Announce

GoReleaser can also announce new releases on social networks, chat rooms and email!

It is run at the very end of the pipeline and can be skipped using the command's flags or via the skip attribute:

```jsx
# .goreleaser.yaml
announce:
   # Skip the announced feature in some conditions, for instance, when
   # publishing patch releases.
   #
   # Any value different from 'true' is evaluated to false.
   #
   # Templates: allowed
   skip: "{{gt .Patch 0}}"
```

### Currently supports many accounts

**Discode:**

To use Discord, you need to create a [Webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) and set the following environment variables on the pipe:

- `DISCORD_WEBHOOK_ID`
- `DISCORD_WEBHOOK_TOKEN`

After this you can add the following section to your configuration:

```jsx
# .goreleaser.yaml
announce:
   discord:
     # Whether its enabled or not.
     enabled: true

     # Message template to use while publishing.
     #
     # Default: '{{ .ProjectName }} {{ .Tag }} is out! Check it out at {{ .ReleaseURL }}'
     # Templates: allowed
     message_template: 'Awesome project {{.Tag}} is out!'

     # Set author of the embed.
     #
     # Default: 'GoReleaser'
     author: ''

     # Color code of the embed. You have to use decimal numeral system, not hexadecimal.
     #
     # Default: '3888754' (the grey-ish from GoReleaser)
     color: ''

     # URL to an image to use as the icon for the embed.
     #
     # Default: 'https://goreleaser.com/static/avatar.png'
     icon_url: ''
```

To make it work, you need to set some environment variables on the pipe:

- `LINKEDIN_ACCESS_TOKEN`

> We currently don't support posting in groups.

You can then add something like the following to your configuration:

```jsx
# .goreleaser.yaml
announce:
   linkedin:
     # Whether its enabled or not.
     enabled: true

     # Message to use while publishing.
     #
     # Default: '{{ .ProjectName }} {{ .Tag }} is out! Check it out at {{ .ReleaseURL }}'
     message_template: 'Awesome project {{.Tag}} is out!'
```

### slack

Like discode, slack also needs to pass in a new `Webhook`

- `SLACK_WEBHOOK`

You can then add something like the following to your configuration:

```jsx
# .goreleaser.yaml
announce:
   slack:
     # Whether its enabled or not.
     enabled: true

     ****# Message template to use while publishing.
     #
     # Default: '{{ .ProjectName }} {{ .Tag }} is out! Check it out at {{ .ReleaseURL }}'
     # Templates: allowed
     message_template: 'Awesome project {{.Tag}} is out!'

     # The name of the channel that the user selected as a destination for webhook messages.
     channel: '#channel'

     # Set your Webhook's user name.
     username: ''

     # Emoji to use as the icon for this message. Overrides icon_url.
     icon_emoji: ''

     # URL to an image to use as the icon for this message.
     icon_url: ''

     # Blocks for advanced formatting, see: https://api.slack.com/messaging/webhooks#advanced_message_formatting
     # and https://api.slack.com/messaging/composing/layouts#adding-blocks.
     #
     # Attention: goreleaser doesn't check the structure full of the Slack API: please make sure that
     # your configuration for advanced message formatting abides by this API.
     #
     # Templates: allowed
     blocks: []

     # Attachments, see: https://api.slack.com/reference/messaging/attachments
     #
     # Attention: goreleaser doesn't check the structure full of the Slack API: please make sure that
     # your configuration for advanced message formatting abides by this API.
     #
     # Templates: allowed
     attachments: []
```

## Link

- [https://docs.docker.com/engine/reference/commandline/manifest/](https://docs.docker.com/engine/reference/commandline/manifest/)