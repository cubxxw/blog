---
title: 'Go 源码里的这些 go: 指令 && go 自动化工具'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2024-01-25T15:22:36+08:00
draft : false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
  - golang
  - go
categories:
  - Development
  - Blog
  - OpenIM
  - Go
---

# Go 源码里的这些 go: 指令 && go 自动化工具

开发人员有很强的自动化重复性任务的倾向，这也适用于编写代码。

样板代码可能包括设置基本文件结构、初始化变量、定义函数或导入库或模块等操作。

1. 在某些情况下，包提供样板代码作为开发人员构建的起点，通常是在代码行为配置之后生成。
2. 尽管样板代码对于应用程序功能可能是必要的和有价值的，但它也可能是浪费和冗余的。出于这个原因，有许多工具可以最小化样板代码。
3. `go generate` 是Go编程语言的命令行工具，允许自动生成代码。您可以使用 `go generate` 为您的项目生成易于修改的特定代码，使该工具在减少样板文件方面功能强大。

`go generate` 这个命令通常用于在编译前自动生成代码。它可以用来创建那些重复性高或者模式化的代码，从而节省时间和减少错误。想想看，这在哪些情况下会特别有用呢？🤔

比如说下面有一个简单的例子，在代码中：

```jsx
//go:generate echo Hello, cubxxw !
```

在这个例子中，当我们运行 **`go generate`** 命令时，它将执行注释中指定的命令。在这个例子里，它会打印出 "Hello, cubxxw !"。

因此，元编程(metaprogramming)的主题是一个开发和研究的热门领域，可以追溯到 1960 年代的 Lisp。元编程中一个特别有用的领域是代码生成(code-generation)。支持宏的语言内置了此功能;其他语言扩展了现有功能以支持这一点。 

## `go:generate`

在我们之前的讨论中，我们已经介绍了 "Go Generate" 命令的基础知识。现在，我们将深入探讨一些更具体的用例和实践技巧。🚀

让我们从一些术语开始。go generate 工作方式主要由三个参与者之间协调进行的：

- Generator：是由 go generate 调用的程序或脚本。在任何给定的项目中，可以调用多个生成器，可以多次调用单个生成器等。
- Magic comments：是 `.go` 文件中以特殊方式格式化的注释，用于指定调用哪个生成器以及如何调用。任何以文本 `//go:generate` 行开头的注释都是合法的。
- go generate : 是 Go 工具，它读取 Go 源文件、查找和解析 magic comments 并运行指定的生成器。

需要强调的是，以上是 Go 为代码生成提供的自动化的全部范围。对于其他任何事情，开发人员可以自由使用适合他们的任何工作流程。例如，go generate 应该始终由开发人员手动运行; 它永远不会自动调用(比如不会作为 go build 的一部分)。此外，由于我们通常使用 Go 将二进制文件发送给用户或执行环境，因此很容易理解 go generate 仅在开发期间运行(可能就在运行 go build 之前);Go 程序的用户不会知道哪部分代码是生成的以及如何生成的。(实际上，很多时候会在生成的文件开头加上注释，这是生成的，请别手动修改。)

这也适用于生成 module;go generate 不会运行导入包的生成器。因此，当一个项目发布时，生成的代码应该与其余代码一起 checked 和分发。

**Go Generate 的高级用法**

1. **生成接口的模拟实现**：

    - 在测试中，我们经常需要模拟一些接口。使用 "Go Generate"，我们可以自动化这个过程。例如，我们可以使用 **`mockgen`** 工具来生成接口的模拟实现。
    - 试想一下，如果你有一个需要多个接口模拟的大型项目，"Go Generate" 如何帮助你节省时间和减少重复劳动？🤔

    **下面的一个 Demo 简单的介绍了如何使用 Mockgen:**

    1. **安装 Mockgen**:

        - 首先，确保你已经安装了 **`mockgen`** 工具。可以使用以下命令安装：

            ```arduino
            go get github.com/golang/mock/mockgen
            ```

    2. **编写你的接口**:

        - 假设我们有一个名为 **`MyInterface`** 的接口，我们希望为其生成 mock 实现。这个接口可能位于一个名为 **`myinterface.go`** 的文件中。

            ```go
            package mypackage
            
            // MyInterface 是我们将要模拟的接口
            type MyInterface interface {
                DoSomething() bool
            }
            ```

    3. **使用 Go Generate 生成 Mock**:

        - 在 **`myinterface.go`** 文件的顶部，我们添加一行特殊的注释，指示 **`go generate`** 如何生成 mock。这行注释应该遵循以下格式：

            ```go
            //go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
            ```

        - 这里，**`source`** 指定了源接口文件，**`destination`** 指定了生成 mock 文件的位置和名称，**`package`** 指定了包名。

    4. **运行 Go Generate**:

        - 现在，当你在包含 **`myinterface.go`** 的目录中运行 **`go generate`** 命令时，它将读取文件顶部的注释，并执行 **`mockgen`** 命令来生成 mock 实现。

            ```go
            go generatex
            ```

    5. **使用生成的 Mock**:

        - 生成的 **`mock_myinterface.go`** 文件将包含 **`MyInterface`** 的 mock 实现。你可以在测试中使用这个 mock 来代替实际的接口实现。

    ## **示例 Demo**

    让我们看一个简单的示例来展示这个过程：

    1. 创建一个名为 **`myinterface.go`** 的文件，内容如下：

        ```go
        package mypackage
        
        // MyInterface 是我们将要模拟的接口
        type MyInterface interface {
            DoSomething() bool
        }
        
        //go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
        
        ```

    2. 在相同的目录下运行 **`go generate`**。这将生成 **`mock_myinterface.go`** 文件。

    3. 在测试中，你可以导入并使用这个 mock 实现。

2. **自动生成文档**：

    - "Go Generate" 也可以用来自动生成代码文档。这对于维护大型代码库特别有用，可以确保文档与代码实现保持同步。
    - 通过注释和特定的工具，我们可以让 "Go Generate" 自动生成更新的文档，保持开发文档的连续性和准确性。

3. **代码模板实例化**：

    - 对于那些结构和逻辑相似但细节不同的代码部分，我们可以使用 "Go Generate" 结合代码模板来实例化这些部分。这在处理大量类似结构时尤为有用。
    - 想象一下，在创建一系列相似的数据模型或者处理程序时，如何利用 "Go Generate" 来提高效率和减少错误。

💻 让我们尝试一个实际的例子：假设我们有一个接口，我们想为它生成一个模拟实现。我们可以在接口定义的旁边加上如下的注释：

```go
//go:generate mockgen -source=myinterface.go -destination=mock_myinterface.go -package=mypackage
```

当我们运行 **`go generate`** 命令时，它将自动调用 **`mockgen`** 工具，并为我们的接口生成模拟实现代码。

### **实践中的挑战与技巧**

1. **处理复杂的生成场景**：
    - 在复杂的项目中，"Go Generate" 命令可能需要处理多个文件和不同的生成规则。在这些情况下，维护清晰和有组织的生成指令非常重要。
    - 例如，你可能需要在不同的目录中有多个 **`//go:generate`** 指令，它们各自调用不同的工具或脚本。
2. **集成到构建流程中**：
    - 在实际的开发流程中，"Go Generate" 命令通常被集成到自动化构建流程中。这意味着，每当代码库被构建时，相关的生成命令也会被自动执行。
    - 确保 "Go Generate" 命令正确地集成到你的构建脚本或构建系统中是至关重要的。这可以通过 Makefile 或 CI/CD 流程中的脚本来实现。
3. **优化生成性能**：
    - 在一些大型项目中，频繁运行 "Go Generate" 命令可能导致性能问题。因此，合理地组织和优化生成逻辑是非常重要的。
    - 例如，仅在相关源文件发生变化时运行生成命令，或者使用缓存来避免重复的生成工作。

💻 让我们来看一个简单的示例：假设我们有一个项目，其中包含多个需要生成代码的子模块。我们可以在项目的根目录创建一个 Makefile，该文件包含了执行所有子模块 **`go generate`** 命令的逻辑。

```makefile
generate:
    @echo "Generating code..."
    @go generate ./...
```

在这个例子中，当我们运行 **`make generate`** 命令时，它将遍历项目的每个子模块，并在每个包含 **`//go:generate`** 指令的目录中运行相应的生成命令。

## `go:build`

让我们开始探索 Go 语言中的 `go:build` 指令！🔨

首先， `go:build`  指令是用于指定 Go 源文件中的构建约束的。构建约束允许我们根据不同的条件（如操作系统、架构或自定义标记）来包含或排除源文件。

**为什么重要？** 💡

- 在大型项目中，可能需要根据不同的平台或配置来编译不同的代码。 `go:build`  指令让我们能够灵活地控制哪些代码被包含在构建中。

**示例：**

```go
//go:build linux
```

在这个例子中，该源文件仅在目标平台为 Linux 时才会被包含在构建中。

**还有一些场景：**

- 测试环境使用 mock 服务；而正式环境使用真实数据
- 免费版、专业版和企业版提供不同的功能
- 不同操作系统的兼容性处理。通常用于跨平台，例如 windows，linux，mac 不同兼容处理逻辑。
- go 低版本的兼容处理

示例：有以下两个文件：

1. `main.go`

```jsx
package main
 
import "fmt"
 
func main() {
	fmt.Println("OK")
}
```

1. `init.go`

```jsx
//go:build init
 
package main
 
import "fmt"
 
func init() {
	fmt.Println("Init.")
}
```

不同的编译参数，最后的可执行文件输出也不同：

```jsx
% go build 
% ls
cmd     init.go main.go
% ./cmd 
OK
 
% go build -tags init
% ./cmd 
Init.
OK
```

**再比如说利用它来 Debug 代码：**

假设您正在处理一个Go项目，并且您有一些调试代码，您只想将其包含在构建中以进行测试。您可以创建一个带有构建标记（如 **`// +build debug`** 或 **`go:build debug`** 指令）的文件。这样，当你用 **`debug`** 标签构建你的项目时，Go会包含这个文件。否则，将被忽略。不错吧？📚

Here's a small snippet to illustrate：

```jsx
// +build debug

package main

import "fmt"

func main() {
    fmt.Println("Debugging mode is on!")
}
```

在此代码片段中，只有在使用 **`debug`** 标记构建项目时，才会执行 **`println`** 语句。这是将调试代码与生产代码分开的好方法。

## `go:build` 指令的进阶应用

go 文档里称之为，Build Constraints，即，编译限制。 也称为 build tag。

用于限制一整个文件是否应该被编译入最终的二进制文件，而不是一个文件中的部分代码片段 （block）

1. **复杂的构建条件**：
    - `go:build` 指令不仅限于简单的操作系统或架构检查，它还可以用于更复杂的条件组合。
    - 例如，你可以组合多个条件，如 `//go:build linux && amd64`，这意味着代码仅在目标平台为 Linux 并且架构为 amd64 时才会编译。
2. **与构建标签的结合使用**：
    - 除了系统级别的构建条件， `go:build` 指令还可以与自定义的构建标签结合使用。
    - 例如，`//go:build debug` 可以用来在开发模式下包含额外的调试代码。
3. **管理大型项目**：
    - 在大型项目中， `go:build` 指令有助于管理不同的构建配置，例如区分生产环境和开发环境的代码。
    - 这对于维护一个具有多个模块和可选功能的复杂代码库非常有用。

💻 **实践示例**：

```go
//go:build linux && amd64
// +build !debug

package mypackage

// 这里是仅在 Linux amd64 平台且非调试模式下的代码
```

在这个例子中，源文件仅在 Linux amd64 平台上编译，并且在启用了 `debug` 标签的情况下不会编译。

### 📚 详细介绍：与构建标签的结合使用

在 Go 语言中，构建标签（Build Tags）是一种强大的工具，用于在编译时控制哪些代码文件被包含在构建中。与  `go:build` 指令结合使用时，它们提供了更高的灵活性和精确的控制。

**构建标签的基本概念**：

- 构建标签是在源文件的顶部通过注释定义的，例如 `// +build debug`。
- 它们可以用于为不同的构建配置（如调试模式、特定的操作系统或自定义条件）标记文件。

**与 `go:build` 指令结合**：

- "go:build" 指令和构建标签可以在同一个文件中结合使用，以实现更复杂的构建逻辑。
- 例如，`//go:build linux && amd64` 和 `// +build debug` 可以共同决定文件是否包含在特定构建中。

**示例**：

```go
//go:build linux
// +build debug

package mypackage

// 这些代码只在 Linux 平台上以及开启调试模式时编译
```

在这个例子中，只有在目标平台为 Linux 且开启了调试模式时，这个源文件才会被包含在构建中。

### 💻 实际应用案例

想象您正在开发一个跨平台的应用程序，并希望在开发过程中包含一些额外的调试信息或测试功能。

1. **创建专门的调试文件**：
    - 在文件顶部添加 `// +build debug` 标签。
    - 这些文件将仅在您使用了 `debug` 标签进行构建时被包括在内。
2. **结合操作系统或架构特定代码**：
    - 使用 `go:build` 指令定义操作系统或架构特定的条件。
    - 结合 `// +build debug`，可以创建既特定于平台又仅在调试模式下有效的代码。
3. **构建脚本中使用标签**：
    - 在构建脚本或命令中，通过 `tags 'debug'` 参数来启用这些调试特定的文件。

## `go:embed`

---

现在，让我们开始学习 Go 语言中的 `go:embed` 功能。

Go 语言是一种编译型的静态类型语言，它由谷歌开发，以简洁、高效和易读而闻名。Go 语言的 `go:embed` 功能是 Go 1.16 版本引入的一项新特性，它允许开发者在 Go 程序中直接嵌入静态文件和文件夹。这个特性非常有用，因为它简化了将文件数据包含到 Go 程序中的过程。📚

在 `go:embed` 之前，将文件嵌入到 Go 程序中通常需要额外的步骤，比如使用第三方工具来生成文件数据的 Go 代码。但是，有了 `go:embed`，这一切变得简单多了。开发者只需要使用特定的 `//go:embed` 指令，并通过特定的语法来指定要嵌入的文件或目录。👀

例如，如果你想在程序中嵌入一个名为 `example.txt` 的文件，你可以这样做：

```go
import "embed"

//go:embed example.txt
var exampleFile embed.FS

```

在这里，`embed.FS` 是一个特殊的文件系统类型，用于访问嵌入的文件。这个变量 `exampleFile` 现在包含了 `example.txt` 的内容，并且可以在程序中使用。💡

这个特性在创建需要访问大量静态资源的应用程序时特别有用，例如 Web 服务器或桌面应用程序。它也有助于简化部署和分发，因为所有必要的资源都被包含在单个可执行文件中。🎉

现在，我将通过一个实际的代码示例来展示如何使用 **`go:embed`**。这个示例将演示如何在一个简单的 Go 程序中嵌入一个文本文件，并在程序运行时读取这个文件的内容。

```go
package main

import (
    "embed"
    "fmt"
    "io/fs"
    "log"
)

//go:embed example.txt
var embeddedFiles embed.FS

func main() {
    data, err := fs.ReadFile(embeddedFiles, "example.txt")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Content of embedded file:")
    fmt.Println(string(data))
}
```

在这个示例中，我们首先导入了 **`embed`** 包，它是 Go 标准库的一部分。我们使用 **`//go:embed example.txt`** 指令来指示编译器嵌入名为 **`example.txt`** 的文件。**`embeddedFiles`** 变量现在包含了这个文件的内容。

**调用 `fs.ReadFile` 函数**:
**`fs.ReadFile`** 接受两个参数：一个实现了 **`fs.FS`** 接口的文件系统和要读取的文件名。它返回文件内容的字节切片和一个错误值。

```go
data, err := fs.ReadFile(fileSystem, "filename.txt")
if err != nil {
    // 处理错误
}
```

- **`fileSystem`**: 这是一个实现了 **`fs.FS`** 接口的文件系统，可以是通过 **`embed`** 嵌入的文件系统，也可以是普通的文件系统。
- **`"filename.txt"`**: 这是你想要读取的文件名。

在 **`main`** 函数中，我们使用 **`fs.ReadFile`** 函数来读取嵌入的文件内容。然后，我们打印出这个文件的内容。

这个例子展示了 **`go:embed`** 的基本用法，它使得在 Go 程序中包含静态文件变得非常简单和直接。

事实上 OpenIM 也用到了 **`go:embed`** 使用的非常简单：

```jsx
//go:embed version
var Version string
```

然后对应的 version 文件直接写对应的版本号即可。

> 在这个例子中，**`version`** 是一个文件的名称，该文件的内容将被嵌入到 **`Version`** 变量中。这里，**`Version`** 是一个字符串类型的变量。当使用这种方式时，被嵌入的文件应该是文本文件，并且它的内容将直接作为字符串赋值给变量。这种方法适用于文件内容较短，且你希望将文件内容作为字符串直接使用的情况。

如果您使用 **`//go:embed`** 指令并希望处理多个文件或整个目录，您可以使用 **`embed.FS`** 类型的变量。这种情况下，**`embed.FS`** 表现为一个文件系统，您可以从中读取多个文件。下面是处理多个文件的方法：

1. **嵌入多个文件或目录**:
    您可以通过在 **`//go:embed`** 指令后列出多个文件或目录来嵌入它们。例如，如果您想嵌入一个目录及其所有内容，您可以这样做：

     ```go
    //go:embed mydir
    var myFS embed.FS
     ```

     这将嵌入 **`mydir`** 目录及其所有子目录和文件。您也可以指定多个单独的文件：

     ```go
    //go:embed file1.txt file2.txt
    var myFiles embed.FS
     ```

2. **访问嵌入的文件**:
    要访问嵌入的文件，您可以使用 **`embed.FS`** 提供的方法，如 **`ReadFile`** 或 **`ReadDir`**。例如，要读取一个文件的内容：

     ```go
    data, err := myFS.ReadFile("file1.txt")
    if err != nil {
        // 处理错误
    }
    fmt.Println(string(data))
     ```

     要枚举目录中的文件，您可以这样做：

     ```go
    entries, err := myFS.ReadDir("mydir")
    if err != nil {
        // 处理错误
    }
    
    for _, entry := range entries {
        fmt.Println(entry.Name())
        // 可以进一步读取每个文件的内容
    }
     ```

3. **注意事项**:

    - 嵌入的文件在编译时就确定了，您不能在运行时动态添加或更改嵌入的文件。
    - 使用 **`embed.FS`** 时，文件路径是相对于 Go 源文件所在的目录。确保在使用文件路径时考虑到这一点。
    - **`embed.FS`** 是只读的，您不能使用它来修改文件。

## **`go:linkname`**

`go:linkname` 是 Go 语言的一个编译器指令，它允许你在 Go 代码中链接到另一个包的私有函数或变量。这种技术通常被用于高级用例，例如在进行底层操作或链接到标准库的内部实现时。使用 `go:linkname` 可以绕过 Go 的类型安全和封装机制，因此需要谨慎使用。

要使用 `go:linkname`，你需要导入 `unsafe` 包，即使你不直接使用它。这是因为 `go:linkname` 本身是一种不安全的操作，可能会导致程序行为不稳定。以下是 `go:linkname` 的基本使用方法：

1. **导入 `unsafe` 包**:

    ```go
    import _ "unsafe"
    ```

2. **使用 `go:linkname`**:
    使用 `//go:linkname` 指令将本地函数或变量链接到另一个包的私有函数或变量。格式如下：

     ```go
    //go:linkname localName import/path.name
     ```

     其中，`localName` 是你在当前包中定义的函数或变量的名称，`import/path.name` 是目标包中的函数或变量的全路径名。

3. **定义本地函数或变量**:
    在链接声明之后，定义一个与目标函数或变量具有相同签名的本地函数或变量。

例如，如果你想要链接到标准库中某个包的私有函数，可以这样做：

```go
// 导入unsafe包
import _ "unsafe"

// 链接到runtime包中的私有函数
//go:linkname myLocalFunc runtime.myPrivateFunc
func myLocalFunc() int

func main() {
    // 现在可以在你的代码中调用 myLocalFunc，它会调用 runtime.myPrivateFunc
    result := myLocalFunc()
    println(result)
}
```

在使用 `go:linkname` 时需要注意以下几点：

- 这是一个非常强大且危险的特性。不当使用可能导致程序崩溃或出现不可预测的行为。
- `go:linkname` 主要用于编写库或进行高级系统编程，对于大多数常规开发工作来说，使用它并不是一个好主意。
- 由于 `go:linkname` 绕过了 Go 的类型安全机制，因此可能会使代码难以维护和理解。
- 在不同版本的 Go 语言中，标准库的内部实现可能会有所不同，因此使用 `go:linkname` 链接到标准库的私有部分可能导致代码在未来版本中失效。

## `go:nosplit`

`go:nosplit` 是 Go 语言的一个编译器指令，用于控制函数的栈分裂行为。在深入理解 `go:nosplit` 之前，我们需要先了解栈分裂（stack splitting）这一概念。

在 Go 语言中，为了支持高并发，每个 goroutine 都有自己的栈空间。Go 使用一种称为栈分裂的技术来动态地增长 goroutine 的栈空间。当一个函数被调用时，Go 会检查当前栈的剩余空间是否足够执行该函数。如果不够，Go 会分配一个更大的栈空间，并将现有栈的内容复制到新的栈上。这个过程就是栈分裂。

然而，在某些特殊情况下，程序员可能需要确保某个函数在执行时不触发栈分裂，这通常是出于性能考虑或因为函数本身与栈管理相关。这时就可以使用 `go:nosplit` 指令。当一个函数被 `go:nosplit` 标记时，编译器会保证在该函数执行期间不进行栈分裂。

例如：

```go
//go:nosplit
func MyFunction() {
    // 函数实现
}
```

在使用 `go:nosplit` 时需要非常小心，因为如果在执行该函数时栈空间不足，程序可能会因栈溢出而崩溃。因此，只有当你确切知道自己在做什么，并且了解栈分裂的细节时，才应该使用这个指令。

通常，`go:nosplit` 主要用于低级编程，如系统调用、运行时库的实现等场景。对于大多数高级应用程序开发而言，很少需要使用 `go:nosplit` 指令。

## `go:noescape`

在Go语言中，`//go:noescape`是一个编译器指令，用于告诉编译器在编译时应用特定的优化。这个指令的主要作用是通知编译器，被标记的函数的参数不会逃逸到堆上。通常，Go的编译器会自动决定是否将一个变量分配在栈上还是堆上。如果一个变量在函数返回后仍然存在（例如，被返回或存储在全局变量中），则该变量通常会被分配到堆上，以便在函数执行结束后继续存在。

使用`//go:noescape`指令可以告诉编译器，即使有逃逸分析的迹象，也不要将参数移动到堆上。这可以优化性能，因为在栈上分配和回收内存比在堆上更快，而且不涉及垃圾回收。

这个指令通常用于低级编程或性能关键型代码，比如在Go的标准库中。对于大多数高级应用程序来说，这个指令并不常用，因为逃逸分析通常由编译器自动处理，且效果很好。

请注意，滥用`//go:noescape`可能会导致程序错误，因为它会阻止编译器执行通常的逃逸分析。如果一个变量实际上需要逃逸到堆上，但被错误地标记为`noescape`，可能会导致程序崩溃或其他不可预测的行为。因此，只有在完全理解其影响并确实需要此类优化时，才应使用此指令。

## `go:norace`

`go:norace` 是 Go 语言中的一个编译器指令，它用于禁用特定函数或代码块的竞态条件检测。当使用 Go 的竞态检测器（race detector）时，`go:norace` 可以用来标记那些你确信不会发生竞态条件的代码区域。这个指令主要用于性能优化，因为竞态检测可能会增加程序的运行时间和内存使用。

在实际使用时，`go:norace` 指令应该非常小心地使用，因为它会使得代码中的这部分跳过竞态检测器的检查。如果错误地使用了 `go:norace`，可能会导致竞态条件的问题被隐藏，从而在程序中引入难以发现的错误。

例如，如果你有一个函数，你非常确定它在并发环境下是安全的，并且你想优化性能，可以使用 `go:norace` 来标记这个函数：

```go
//go:norace
func myFunction() {
    // 函数实现
}
```

这将告诉 Go 编译器在这个函数中不进行竞态检测。但是，再次强调，这需要你非常确信该函数在并发环境下不会引起任何竞态问题。在大多数情况下，除非绝对必要，避免使用此类指令通常是更安全的选择。

## `go:notinheap`

`go:notinheap` 指令是一个编译器指令，它告诉go编译器不能在堆上分配类型。这个指令对于避免某些类型对象的垃圾收集开销特别有用。当你使用这个指令时，这意味着它所应用的类型的实例只能在堆栈或全局变量中分配。

## `go:yeswritebarrierrec`

`go:yeswritebarrierrec` 是一个 Go 语言的编译器指令，用于控制垃圾回收（GC）相关的行为。在 Go 中，编译器和运行时系统会使用写屏障（write barriers）来帮助垃圾回收器准确地跟踪对象的引用。这是为了确保在垃圾回收期间，不会错误地回收仍然被引用的对象。

通常情况下，写屏障是自动管理的，但在某些特殊的情况下，开发者可能需要手动控制写屏障的启用或禁用。这就是 `go:yeswritebarrierrec` 指令的用途。

- 使用 `go:yeswritebarrierrec` 指令：当你在代码中使用这个指令时，你告诉 Go 编译器在接下来的代码块中启用写屏障记录。这意味着在这段代码中的内存写入操作将被写屏障记录，以帮助垃圾回收器正确跟踪对象引用。
- 应用场景：这个指令通常用在非常底层的代码中，特别是那些与运行时系统或垃圾回收器交互密切的地方。普通的应用程序开发中很少需要使用它。
- 注意事项：`go:yeswritebarrierrec` 是一个高级特性，不正确地使用它可能会导致程序出现难以预料的问题。因此，除非你非常清楚自己在做什么，否则不建议使用它。

这个指令体现了 Go 语言对底层内存管理和垃圾回收机制的灵活控制能力，但也需要开发者具有较深的内存管理和垃圾回收原理的理解。

## **`go:nowritebarrierrec`**

```
//go:nowritebarrierrec

```

该指令表示编译器遇到写屏障时就会产生一个错误，并且允许递归。也就是这个函数调用的其他函数如果有写屏障也会报错。

简单来讲，就是针对写屏障的处理，防止其死循环。

### **案例**

```
//go:nowritebarrierrec
funcgcFlushBgCredit(scanWorkint64) {
...
}
```

## 参考

- ChatGpt
- C++模板元编程: [https://en.wikipedia.org/wiki/Template_metaprogramming](https://en.wikipedia.org/wiki/Template_metaprogramming)
- Go 1.4: [https://go.dev/blog/generate](https://go.dev/blog/generate)
- samplegentool: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/samplegentool](https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/samplegentool)
- mymod: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/mymod](https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/mymod)
- 官方文档: [https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source](https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source)
- stringer: [https://pkg.go.dev/golang.org/x/tools/cmd/stringer](https://pkg.go.dev/golang.org/x/tools/cmd/stringer)
- RoundingMode: [https://pkg.go.dev/math/big#RoundingMode](https://pkg.go.dev/math/big#RoundingMode)
- 小示例模块中: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/stringerusage](https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/stringerusage)
- 这里有: [https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/insourcegenerator](https://github.com/eliben/code-for-blog/tree/master/2021/go-generate-guide/insourcegenerator)
- 在 1.8 中: [https://tip.golang.org/doc/go1.8#tool_yacc](https://tip.golang.org/doc/go1.8#tool_yacc)
- Rob Pike 的这个提交: [https://go-review.googlesource.com/c/go/+/8091/](https://go-review.googlesource.com/c/go/+/8091/)
- shell escaping: [http://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Quoting](http://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Quoting)