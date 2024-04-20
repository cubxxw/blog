---
title: 'Hugo 的高级教程'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2023-11-06T13:44:09+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: '熊鑫伟，我'
keywords: ['Hugo', '静态网站生成器', '网站开发', '博客搭建', 'GitHub']
tags: ['Hugo', '博客搭建 (Blog Building)', '网站开发 (Web Development)']
categories: ['开发 (Development)']
description: '本教程为Hugo高级教程，适合已经有Hugo基础知识的开发者。我们将深入探讨Hugo的高级功能和最佳实践，包括自定义主题开发、数据模板、性能优化和部署策略。此外，教程将介绍如何将Hugo与GitHub结合使用，实现持续部署和版本控制，以优化的工作流程。'
---


来到进阶部分，就需要深度学习一些 Hugo 的高级技巧。

## 模块

**Hugo 模块**是 Hugo 的核心构建块。模块可以是您的主项目或较小的模块，提供 Hugo 中定义的 7*种*组件类型中的一种或多种：**static**、**content**、**layouts**、**data**、**assets**、**i18n**和**archetypes**。

您可以按照您喜欢的任何组合来组合模块，甚至可以挂载非 Hugo 项目的目录，形成一个大型的虚拟联合文件系统。

Hugo 模块由 Go 模块提供支持。有关 Go 模块的更多信息，请参阅：

+ https://github.com/golang/go/wiki/Modules
+ https://go.dev/blog/using-go-modules



一些示例项目：

+ https://github.com/bep/docuapi是一个在测试此功能时已移植到 Hugo Modules 的主题。这是将非 Hugo 项目安装到 Hugo 文件夹结构中的一个很好的示例。它甚至展示了常规 Go 模板中的 JS Bundler 实现。
+ https://github.com/bep/my-modular-site是一个非常简单的用于测试的网站。





### 模块配置： top level

**💡简单的一个案例如下：**

```yaml
module:
  noProxy: none
  noVendor: ""
  private: '*.*'
  proxy: direct
  replacements: ""
  workspace: "off"
```



#### noVendor

一个可选的Glob模式匹配模块路径，当自动售货时跳过，例如 `github.com/**`



#### vendorClosest

启用后，我们将选择与使用它的模块最近的供应商模块。默认行为是选择第一个。请注意，给定的模块路径仍然只能有一个依赖项，因此一旦使用它，就不能重新定义它。



#### proxy

定义用于下载远程模块的代理服务器。默认值是 `direct` ，意思是“git clone”或类似的。



#### noproxy

逗号分隔的glob列表匹配不应使用上面配置的代理的路径。



#### private

逗号分隔的glob列表匹配应被视为私有的路径。



#### workspaces

要使用的工作区文件。这将启用Go工作区模式。请注意，这也可以通过OS env设置，例如 `export HUGO_MODULE_WORKSPACE=/my/hugo.work` 这只适用于Go 1.18+。在Hugo `v0.109.0` 中，我们将默认值更改为 `off` ，现在我们可以解析相对于工作目录的任何相对工作文件名。



### 使用 hugo 模块

如何使用Hugo模块来构建和管理您的网站。

Hugo模块的大多数命令需要安装较新版本的Go（请参阅https://golang.org/dl/）和相关的VCS客户端（例如：Git，参见https://git-scm.com/downloads/）。如果您在Netlify上运行的是“较旧”的站点，则可能需要在环境设置中将GO_VERSION设置为1.12。





## Templates (模块)

我认为 hugo 模板是 hugo 最麻烦的部分，模板是包含模板操作的HTML文件，位于项目、主题或模块的 `layouts` 目录中。

它可以做的很简单，也可以做的非常非常丰富复杂

Hugo使用Go的 `html/template` 和 `text/template` 库作为模板的基础。希望深入学习   hugo 的模板功能，我们可以深入学习 go 语言的 `template`



### go 语言的 template

包模板实现用于生成文本输出的数据驱动模板。

要生成HTML输出，请参阅html/template，它与此包具有相同的接口，但会自动保护HTML输出免受某些攻击。



#### html/template

包模板（html/template）实现了数据驱动的模板，用于生成安全的HTML输出，以防止代码注入。它提供了与text/template相同的接口，只要输出是HTML，就应该使用它来代替text/template。

那么到底是哪里安全了？ 我们开始开始学习：

首先 这个包包装了text/template，因此您可以共享其模板API来安全地解析和执行HTML模板。

```go
tmpl, err := template.New("name").Parse(...)
// Error checking elided
err = tmpl.Execute(out, data)
```

HTML模板将数据值视为应编码的纯文本，以便它们可以安全地嵌入HTML文档中。转义是上下文相关的，因此操作可以出现在JavaScript、CSS和URI上下文中。

此包使用的安全模型假定模板作者是受信任的，而Execute的data参数不是。下文提供更多细节。

```go
import "text/template"
...
t, err := template.New("foo").Parse(`{{define "T"}}Hello, {{.}}!{{end}}`)
err = t.ExecuteTemplate(out, "T", "<script>alert('you have been pwned')</script>")
```

输出：

```bash
Hello, <script>alert('you have been pwned')</script>!
```

这是在 text/template 中，但是html/template中的上下文自动转义

```go
import "html/template"
...
t, err := template.New("foo").Parse(`{{define "T"}}Hello, {{.}}!{{end}}`)
err = t.ExecuteTemplate(out, "T", "<script>alert('you have been pwned')</script>")
```

生成的 安全输出 ：

```bash'
Hello, &lt;script&gt;alert(&#39;you have been pwned&#39;)&lt;/script&gt;!
```



**Contexts 包**

这个包可以理解HTML、CSS、JavaScript和URI。它为每个简单的操作管道添加了清理功能，因此，

```bash
<a href="/search?q={{.}}">{{.}}</a>
```

在解析时每个{{.}}被覆盖以根据需要添加转义函数。在这种情况下它变成了

```html
<a href="/search?q={{. | urlescaper | attrescaper}}">{{. | htmlescaper}}</a>
```

其中urlescaper、attrescaper和htmlescaper是内部转义函数的别名。

对于这些内部转义函数，如果操作管道的计算结果为nil接口值，则将其视为空字符串。

通过将模板应用于数据结构来执行模板。

模板中的注释引用数据结构的元素（通常是结构的字段或映射中的键），以控制执行并导出要显示的值。模板的执行遍历结构并设置游标，由句点'表示. '并称为“dot”，当执行进行时，将结构中当前位置处的值转换为值。

模板的输入文本是任何格式的UTF-8编码文本。“操作”--数据评估或控制结构--由 `{{`和`}}`分隔;动作之外的所有文本都不加改变地复制到输出。

一旦解析，模板可以安全地并行执行，尽管如果并行执行共享Writer，则输出可以是交错的。

这里有一个简单的例子，打印 `17 items are made of wool`。

```go
type Inventory struct {
	Material string
	Count    uint
}
sweaters := Inventory{"wool", 17}
tmpl, err := template.New("test").Parse("{{.Count}} items are made of {{.Material}}")
if err != nil { panic(err) }
err = tmpl.Execute(os.Stdout, sweaters)
if err != nil { panic(err) }
```



#### Text and spaces

默认情况下，当执行模板时，操作之间的所有文本都会逐字复制。例如，当程序运行时，上面示例中的字符串“items are made of”出现在标准输出中。

然而，为了帮助格式化模板源代码，如果操作的左分隔符（默认情况下“`{{`”）后面紧跟着减号和白色，则所有尾随空白将从紧接在前面的文本中修剪。类似地，如果右分隔符（“`}}`”）前面有白色和减号，则所有前导空格都将从紧接着的文本中修剪。在这些修剪标记中，必须存在白色：`{{- 3}}` 类似于`{{3}}`，但修剪紧挨着前面的文本，而“`{{-3}}`”解析为包含数字-3的操作。

例如，当执行其源为

```bash
"{{23 -}} < {{- 45}}"
```

生成的输出将是

```bash
"23<45"
```

对于此修剪，白色字符的定义与Go中相同：空格、水平制表符、回车符和换行符。

`{{-` 和 `-}}` 的用法是用来修剪空白字符的。这两种符号的使用可以控制模板渲染输出的格式，特别是在处理空白字符和换行时。

+ `{{-` 会修剪掉它左边的所有空白字符和换行符。
+ `-}}` 会修剪掉它右边的所有空白字符和换行符。



##### 不使用修剪

```bash
{{/* Comment 1 */}}
Hello
{{/* Comment 2 */}}
World
```

输出：

```
Hello

World

```



##### 使用修剪

```bash
{{- /* Comment 1 */ -}}
Hello
{{- /* Comment 2 */ -}}
World
```

输出：

```
HelloWorld
```



#### actions

下面是行动列表。“参数”和“管道”是对数据的评估，在下面的相应章节中详细定义。

```bash
{{/* a comment */}}
{{- /* a comment with white space trimmed from preceding and following text */ -}}
	A comment; discarded. May contain newlines.
	Comments do not nest and must start and end at the
	delimiters, as shown here.

{{pipeline}}
	The default textual representation (the same as would be
	printed by fmt.Print) of the value of the pipeline is copied
	to the output.

{{if pipeline}} T1 {{end}}
	If the value of the pipeline is empty, no output is generated;
	otherwise, T1 is executed. The empty values are false, 0, any
	nil pointer or interface value, and any array, slice, map, or
	string of length zero.
	Dot is unaffected.

{{if pipeline}} T1 {{else}} T0 {{end}}
	If the value of the pipeline is empty, T0 is executed;
	otherwise, T1 is executed. Dot is unaffected.

{{if pipeline}} T1 {{else if pipeline}} T0 {{end}}
	To simplify the appearance of if-else chains, the else action
	of an if may include another if directly; the effect is exactly
	the same as writing
		{{if pipeline}} T1 {{else}}{{if pipeline}} T0 {{end}}{{end}}

{{range pipeline}} T1 {{end}}
	The value of the pipeline must be an array, slice, map, or channel.
	If the value of the pipeline has length zero, nothing is output;
	otherwise, dot is set to the successive elements of the array,
	slice, or map and T1 is executed. If the value is a map and the
	keys are of basic type with a defined order, the elements will be
	visited in sorted key order.

{{range pipeline}} T1 {{else}} T0 {{end}}
	The value of the pipeline must be an array, slice, map, or channel.
	If the value of the pipeline has length zero, dot is unaffected and
	T0 is executed; otherwise, dot is set to the successive elements
	of the array, slice, or map and T1 is executed.

{{break}}
	The innermost {{range pipeline}} loop is ended early, stopping the
	current iteration and bypassing all remaining iterations.

{{continue}}
	The current iteration of the innermost {{range pipeline}} loop is
	stopped, and the loop starts the next iteration.

{{template "name"}}
	The template with the specified name is executed with nil data.

{{template "name" pipeline}}
	The template with the specified name is executed with dot set
	to the value of the pipeline.

{{block "name" pipeline}} T1 {{end}}
	A block is shorthand for defining a template
		{{define "name"}} T1 {{end}}
	and then executing it in place
		{{template "name" pipeline}}
	The typical use is to define a set of root templates that are
	then customized by redefining the block templates within.

{{with pipeline}} T1 {{end}}
	If the value of the pipeline is empty, no output is generated;
	otherwise, dot is set to the value of the pipeline and T1 is
	executed.

{{with pipeline}} T1 {{else}} T0 {{end}}
	If the value of the pipeline is empty, dot is unaffected and T0
	is executed; otherwise, dot is set to the value of the pipeline
	and T1 is executed.
```

上面的逻辑稍微有些复杂，意义解释：

1. **注释**:

   ```
   {{/* a comment */}}
   {{- /* a comment with white space trimmed */ -}}
   ```

   这两种方式都用于在模板中添加注释。第二种方式使用`-`来修剪与注释相邻的空白字符。

   + `{{-` 会修剪掉它左边的所有空白字符和换行符。
   + `-}}` 会修剪掉它右边的所有空白字符和换行符。

2. **管道表达式**:

   ```
   {{pipeline}}
   ```

   这里的`pipeline`是一个表达式，它的值将被转换为字符串并插入到输出中。待会再详细解释。

3. **条件语句**:

   ```
   {{if pipeline}} T1 {{end}}
   {{if pipeline}} T1 {{else}} T0 {{end}}
   {{if pipeline}} T1 {{else if pipeline}} T0 {{end}}
   ```

   `if`语句用于条件渲染。`pipeline`是一个表达式，如果它的值为非空，则执行`T1`，否则执行`T0`（如果提供了`else`部分的话）。

4. **循环语句**:

   ```
   {{range pipeline}} T1 {{end}}
   {{range pipeline}} T1 {{else}} T0 {{end}}
   ```

   `range`用于迭代数组、切片、映射或通道，并对每个元素执行`T1`。如果集合为空，并且提供了`else`部分，则执行`T0`。

5. **中断语句**:

   ```
   {{break}}
   {{continue}}
   ```

   `break`和`continue`用于控制`range`循环的流程。

6. **模板引用**:

   ```
   {{template "name"}}
   {{template "name" pipeline}}
   ```

   `template`动作用于执行另一个命名模板，`pipeline`表达式的值将用作新模板的上下文。

7. **块模板**:

   ```
   {{block "name" pipeline}} T1 {{end}}
   ```

   `block`是定义并执行模板的简写。它等同于定义一个模板并立即执行它。

8. **With语句**:

   ```
   {{with pipeline}} T1 {{end}}
   {{with pipeline}} T1 {{else}} T0 {{end}}
   ```

   `with`语句用于设置dot（当前上下文）的值。如果`pipeline`非空，`T1`将在新的上下文中执行；否则，执行`T0`（如果提供了`else`部分的话）。





#### pipeline

在 Go 模板中，`pipeline` 是一个非常核心的概念。它代表一个或多个命令的链式序列，其中每个命令都会生成一个值。这些值可以被传递给其他命令或模板动作（例如 `if`、`range`、`with` 等）以进一步处理或渲染输出。

**基本结构：**

```bash
{{command1 | command2 | command3}}
```

这里，`command1` 的输出会被传递给 `command2` 作为输入，`command2` 的输出又会被传递给 `command3`，依此类推。

在 Template 中，一切能产生数据的表达式都是管道 (Pipeline)，比如 `{{ . }}` 是一个管道，`{{ print 12 }}` 也是一个管道。

类似 Linux 管道操作一样，Template 的管道与管道之间可以通过 `|` 操作符进行数据传递，可以将前者的数据传递给后者，作为后者的参数进行使用。

```go
{{ 12 | printf "%03d" }}        {{/* 等价于 {{ printf "%03d" 12 }} */}}
{{ 3 | printf "%d+%d=%d" 1 2 }} {{/* 等价于 {{ printf "%d+%d=%d" 1 2 3 }} */}}
```



##### 命令（Command）

每个命令通常由一个函数调用或字段访问组成，并且可以接受前一个命令的输出作为输入。例如：

```bash
{{.FieldName | toUpper | printf "%s is uppercased"}}
```

在这个例子中：

+ `.FieldName` 访问当前上下文对象的 `FieldName` 字段。
+ `toUpper` 是一个假设存在的函数，它将输入字符串转换为大写。
+ `printf "%s is uppercased"` 使用 `printf` 函数格式化字符串。



##### 使用在 actions 中

`pipeline` 常用在模板动作中，例如 `if`、`range`、`with` 等。

**在 if 中使用：**

```go
{{if .IsTrue}}
    This will be displayed if .IsTrue is true.
{{end}}
```

**在 `range` 中使用**

```bash
{{range .Items}}
    Item: {{.}}
{{end}}
```



**在 `with` 中使用**

```bash
{{with .User}}
    Username: {{.Username}}
{{end}}
```

在这些例子中，`.` 表示当前的上下文对象。在 `range` 或 `with` 动作中，`.` 会被重新赋值为当前迭代的元素或新的上下文对象。



##### 多重管道

你还可以在一个模板动作中使用多个 `pipeline`。例如，在 `if-else` 结构中：

```bash
{{if .Var1}} 
    {{.Var1}} 
{{else if .Var2}} 
    {{.Var2}} 
{{else}} 
    Neither Var1 nor Var2 is available.
{{end}}
```

在这个例子中，`.Var1` 和 `.Var2` 都是 `pipeline`，它们分别在不同的 `if` 和 `else if` 分支中被评估。

pipeline 可能是“commands”的链式序列。命令是一个简单的值（参数）或函数或方法调用，可能有多个参数：

```bash
Argument
	The result is the value of evaluating the argument.
.Method [Argument...]
	The method can be alone or the last element of a chain but,
	unlike methods in the middle of a chain, it can take arguments.
	The result is the value of calling the method with the
	arguments:
		dot.Method(Argument1, etc.)
functionName [Argument...]
	The result is the value of calling the function associated
	with the name:
		function(Argument1, etc.)
	Functions and function names are described below.
```

流水线可以通过用流水线字符的“字符串”分隔命令序列来“链接”。`|'.`在链式管道中，每个命令的结果都作为下一个命令的最后一个参数传递。流水线中最后一个命令的输出是流水线的值。



#### Variables

动作内部的流水线可以初始化一个变量以捕获结果。初始化具有语法

```bash
$variable := pipeline
```

其中 `$variable` 是变量的名称。声明变量的操作不产生输出。

以前声明的变量也可以赋值，使用语法

```
$variable = pipeline
```

如果“范围”操作初始化变量，则该变量被设置为迭代的连续元素。此外，“范围”可以声明两个变量，由逗号分隔：

```bash
range $index, $element := pipeline
```

在这种情况下，`$index`和`$element`分别被设置为 `数组/切片` 索引或映射键和元素的连续值。注意，如果只有一个变量，它被赋值为元素; 这与Go范围子句中的惯例相反。

变量的作用域扩展到声明变量的控制结构的“end”动作（“if”、“with”或“range”），或者如果没有这样的控制结构，则扩展到模板的末尾。模板调用不会从调用点继承变量。



#### 作用域

当你在模板中使用 `{{ . }}` 时，你实际上是在访问传递给模板的当前数据上下文。

```go
package main

import (
	"os"
	"text/template"
)

func main() {
	tmpl := template.Must(template.New("test").Parse("Hello, {{ . }}!\n"))
	tmpl.Execute(os.Stdout, "World")
}

```

在这个例子中，`{{ . }}` 引用的是传递给模板的字符串 `"World"`。



**在 `range` 循环中使用 `{{ . }}`**

```bash
tmpl := template.Must(template.New("test").Parse(`
{{ range . }}
    Hello, {{ . }}!
{{ end }}
`))
tmpl.Execute(os.Stdout, []string{"Alice", "Bob", "Charlie"})

```

在 `range` 循环中，`{{ . }}` 分别引用切片中的 `"Alice"`, `"Bob"`, 和 `"Charlie"`。



**在结构体中使用 `{{ . }}`**

当上下文是一个结构体时，你可以使用 `{{ .FieldName }}` 来访问其字段。

```bash
type Person struct {
	Name string
	Age  int
}

tmpl := template.Must(template.New("test").Parse(`
	Name: {{ .Name }}
	Age: {{ .Age }}
`))
tmpl.Execute(os.Stdout, Person{Name: "Alice", Age: 30})
```

这里，`{{ .Name }}` 和 `{{ .Age }}` 分别访问 `Person` 结构体的 `Name` 和 `Age` 字段。



**使用 `with` 语句**

`with` 语句可以改变当前的上下文。

```
tmpl := template.Must(template.New("test").Parse(`
{{ with .Name }}
    Hello, {{ . }}!
{{ end }}
`))
tmpl.Execute(os.Stdout, Person{Name: "Alice", Age: 30})

```

在 `with` 语句块中，`{{ . }}` 引用的是 `.Name` 字段的值。

在前面的例子，我们使用 `{{ . }}` 输入了一个变量，这里的 `.` 表示当前作用域的对象值。在该例子中，当前作用域即为全局作用域，因此 `.` 实际上就是我们执行 Execute 时传入的变量。

整个模板文件、单个 range 模块、单个 with 模块、单个 block 模块等都可以是一个作用域。

作用域对象也可以传入一个更复杂的结构体。

```go
type Params struct {
	UserName string
	SiteName string
}

tmpl, _ := template.New("").Parse("你好，这里是{{ .UserName }}的{{ .SiteName }}。")
_ = tmpl.Execute(os.Stdout, Params{
    UserName: "Xinwei Xiong",
    SiteName: "Blog",
})
```

通过 `$` 可以访问全局作用域的对象值，以上例子中 `{{ .UserName }}` 等价于 `{{ $.UserName }}`。



##### 字符串格式化

Template 提供了三个内置函数进行文本输出，分别是 `print`、`printf`、`println`，等价于 fmt 包中的 Sprint、Sprintf、Sprintln。

```go
{{ print 12 }}         {{/* => 12 */}}
{{ printf "%03d" 12 }} {{/* => 012 */}}
{{ println 12 }}       {{/* => 12\n */}}
```



### hugo 模板

Go模板提供了一种极其简单的模板语言，它坚持只有最基本的逻辑才属于模板或视图层的信念。



#### 访问预变量

一个预定义的变量可以是一个已经存在于当前作用域中的变量（如下面变量部分中的 `.Title` 示例），也可以是一个自定义变量（如同一部分中的 `$address` 示例）。

```
{{ .Title }}
{{ $address }}
```

函数的参数使用空格分隔。一般语法：

```
{{ FUNCTION ARG1 ARG2 .. }}
```

下面的示例使用输入 `1` 和 `2` 调用 `add` 函数：

```
{{ add 1 2 }}
```



### 使用 content 参数

Hugo 文档中使用了一个示例。大多数页面都受益于提供目录，但有时目录没有多大意义。我们`notoc`在前面定义了一个变量，当专门设置为 时，该变量将阻止呈现目录`true`。

```
---
notoc: true
title: Example
---
```

`toc.html` [以下是可在部分模板](https://gohugo.io/templates/partials)中使用的相应代码的示例：

```bash
{{ if not .Params.notoc }}
<aside>
  <header>
    <a href="#{{ .Title | urlize }}">
    <h3>{{ .Title }}</h3>
    </a>
  </header>
  {{ .TableOfContents }}
</aside>
<a href="#" id="toc-toggle"></a>
{{ end }}
```

除非另有指定，否则我们希望页面的*默认*行为包含目录。该模板进行检查以确保`notoc:`该页面的首页中的字段不是`true`。



### 模板的查找顺序

Hugo 使用以下规则为给定页面选择模板，从最具体的开始。



#### 查找规则

Hugo 在为给定页面选择模板时会考虑下面列出的参数。模板按特异性排序。这应该感觉很自然，但请查看下表，了解不同参数变化的具体示例。

+ 种类

  页面`Kind`（主页就是其中之一）。请参阅下面每种类型的示例表。这也决定了它是**单个页面**（即常规内容页面。然后我们在 HTML 中查找模板`_default/single.html`）还是**列表页面**（部分列表、主页、分类列表、分类术语。然后我们在`_default/list.html`对于 HTML）。

+ 布局: 可以设置在前面。

+ 输出格式: 请参阅[自定义输出格式](https://gohugo.io/templates/output-formats)。输出格式同时具有 a `name`（例如`rss`, `amp`, `html`）和 a `suffix`（例如`xml`, `html`）。我们更喜欢两者都匹配（例如`index.amp.html`，但寻找不太具体的模板。

请注意，如果输出格式的媒体类型定义了多个后缀，则仅考虑第一个。

+ 语言： 我们将考虑模板名称中的语言标签。如果网站语言是`fr`，`index.fr.amp.html`会胜出`index.amp.html`，但`index.amp.html`会选择之前`index.fr.html`。
+ 类型：如果在前面设置，则为值`type`，否则为根部分的名称（例如“博客”）。它总是有一个值，所以如果没有设置，该值为“page”。
+ 部分：`section`与、`taxonomy`和类型相关`term`。

模板可以位于项目或主题的布局文件夹中，并且将选择最具体的模板。Hugo 将交织下面列出的查找，找到项目或主题中最具体的查找。



#### Home Page

| Example                                                 | OutputFormat | Suffix | Template Lookup Order                                        |
| :------------------------------------------------------ | :----------- | :----- | :----------------------------------------------------------- |
| Home page                                               | html         | html   | `layouts/index.html.htmllayouts/home.html.htmllayouts/list.html.htmllayouts/index.htmllayouts/home.htmllayouts/list.htmllayouts/_default/index.html.htmllayouts/_default/home.html.htmllayouts/_default/list.html.htmllayouts/_default/index.htmllayouts/_default/home.htmllayouts/_default/list.html` |
| Base template for home page                             | html         | html   | `layouts/index-baseof.html.htmllayouts/home-baseof.html.htmllayouts/list-baseof.html.htmllayouts/baseof.html.htmllayouts/index-baseof.htmllayouts/home-baseof.htmllayouts/list-baseof.htmllayouts/baseof.htmllayouts/_default/index-baseof.html.htmllayouts/_default/home-baseof.html.htmllayouts/_default/list-baseof.html.htmllayouts/_default/baseof.html.htmllayouts/_default/index-baseof.htmllayouts/_default/home-baseof.htmllayouts/_default/list-baseof.htmllayouts/_default/baseof.html` |
| Home page with type set to "demotype"                   | html         | html   | `layouts/demotype/index.html.htmllayouts/demotype/home.html.htmllayouts/demotype/list.html.htmllayouts/demotype/index.htmllayouts/demotype/home.htmllayouts/demotype/list.htmllayouts/index.html.htmllayouts/home.html.htmllayouts/list.html.htmllayouts/index.htmllayouts/home.htmllayouts/list.htmllayouts/_default/index.html.htmllayouts/_default/home.html.htmllayouts/_default/list.html.htmllayouts/_default/index.htmllayouts/_default/home.htmllayouts/_default/list.html` |
| Base template for home page with type set to "demotype" | html         | html   | `layouts/demotype/index-baseof.html.htmllayouts/demotype/home-baseof.html.htmllayouts/demotype/list-baseof.html.htmllayouts/demotype/baseof.html.htmllayouts/demotype/index-baseof.htmllayouts/demotype/home-baseof.htmllayouts/demotype/list-baseof.htmllayouts/demotype/baseof.htmllayouts/index-baseof.html.htmllayouts/home-baseof.html.htmllayouts/list-baseof.html.htmllayouts/baseof.html.htmllayouts/index-baseof.htmllayouts/home-baseof.htmllayouts/list-baseof.htmllayouts/baseof.htmllayouts/_default/index-baseof.html.htmllayouts/_default/home-baseof.html.htmllayouts/_default/list-baseof.html.htmllayouts/_default/baseof.html.htmllayouts/_default/index-baseof.htmllayouts/_default/home-baseof.htmllayouts/_default/list-baseof.htmllayouts/_default/baseof.html` |
| Home page with layout set to "demolayout"               | html         | html   | `layouts/demolayout.html.htmllayouts/index.html.htmllayouts/home.html.htmllayouts/list.html.htmllayouts/demolayout.htmllayouts/index.htmllayouts/home.htmllayouts/list.htmllayouts/_default/demolayout.html.htmllayouts/_default/index.html.htmllayouts/_default/home.html.htmllayouts/_default/list.html.htmllayouts/_default/demolayout.htmllayouts/_default/index.htmllayouts/_default/home.htmllayouts/_default/list.html` |
| AMP home, French language                               | amp          | html   | `layouts/index.fr.amp.htmllayouts/home.fr.amp.htmllayouts/list.fr.amp.htmllayouts/index.amp.htmllayouts/home.amp.htmllayouts/list.amp.htmllayouts/index.fr.htmllayouts/home.fr.htmllayouts/list.fr.htmllayouts/index.htmllayouts/home.htmllayouts/list.htmllayouts/_default/index.fr.amp.htmllayouts/_default/home.fr.amp.htmllayouts/_default/list.fr.amp.htmllayouts/_default/index.amp.htmllayouts/_default/home.amp.htmllayouts/_default/list.amp.htmllayouts/_default/index.fr.htmllayouts/_default/home.fr.htmllayouts/_default/list.fr.htmllayouts/_default/index.htmllayouts/_default/home.htmllayouts/_default/list.html` |
| JSON home                                               | json         | json   | `layouts/index.json.jsonlayouts/home.json.jsonlayouts/list.json.jsonlayouts/index.jsonlayouts/home.jsonlayouts/list.jsonlayouts/_default/index.json.jsonlayouts/_default/home.json.jsonlayouts/_default/list.json.jsonlayouts/_default/index.jsonlayouts/_default/home.jsonlayouts/_default/list.json` |
| RSS home                                                | rss          | xml    | `layouts/index.rss.xmllayouts/home.rss.xmllayouts/rss.xmllayouts/list.rss.xmllayouts/index.xmllayouts/home.xmllayouts/list.xmllayouts/_default/index.rss.xmllayouts/_default/home.rss.xmllayouts/_default/rss.xmllayouts/_default/list.rss.xmllayouts/_default/index.xmllayouts/_default/home.xmllayouts/_default/list.xmllayouts/_internal/_default/rss.xml` |

#### Single pages

| Example                                                      | OutputFormat | Suffix | Template Lookup Order                                        |
| :----------------------------------------------------------- | :----------- | :----- | :----------------------------------------------------------- |
| Single page in "posts" section                               | html         | html   | `layouts/posts/single.html.htmllayouts/posts/single.htmllayouts/_default/single.html.htmllayouts/_default/single.html` |
| Base template for single page in "posts" section             | html         | html   | `layouts/posts/single-baseof.html.htmllayouts/posts/baseof.html.htmllayouts/posts/single-baseof.htmllayouts/posts/baseof.htmllayouts/_default/single-baseof.html.htmllayouts/_default/baseof.html.htmllayouts/_default/single-baseof.htmllayouts/_default/baseof.html` |
| Single page in "posts" section with layout set to "demolayout" | html         | html   | `layouts/posts/demolayout.html.htmllayouts/posts/single.html.htmllayouts/posts/demolayout.htmllayouts/posts/single.htmllayouts/_default/demolayout.html.htmllayouts/_default/single.html.htmllayouts/_default/demolayout.htmllayouts/_default/single.html` |
| Base template for single page in "posts" section with layout set to "demolayout" | html         | html   | `layouts/posts/demolayout-baseof.html.htmllayouts/posts/single-baseof.html.htmllayouts/posts/baseof.html.htmllayouts/posts/demolayout-baseof.htmllayouts/posts/single-baseof.htmllayouts/posts/baseof.htmllayouts/_default/demolayout-baseof.html.htmllayouts/_default/single-baseof.html.htmllayouts/_default/baseof.html.htmllayouts/_default/demolayout-baseof.htmllayouts/_default/single-baseof.htmllayouts/_default/baseof.html` |
| AMP single page                                              | amp          | html   | `layouts/posts/single.amp.htmllayouts/posts/single.htmllayouts/_default/single.amp.htmllayouts/_default/single.html` |
| AMP single page, French language                             | html         | html   | `layouts/posts/single.fr.html.htmllayouts/posts/single.html.htmllayouts/posts/single.fr.htmllayouts/posts/single.htmllayouts/_default/single.fr.html.htmllayouts/_default/single.html.htmllayouts/_default/single.fr.htmllayouts/_default/single.html` |

#### Section pages

A section page is a list of pages within a given section.

| Example                                                  | OutputFormat | Suffix | Template Lookup Order                                        |
| :------------------------------------------------------- | :----------- | :----- | :----------------------------------------------------------- |
| Section list for "posts"                                 | html         | html   | `layouts/posts/posts.html.htmllayouts/posts/section.html.htmllayouts/posts/list.html.htmllayouts/posts/posts.htmllayouts/posts/section.htmllayouts/posts/list.htmllayouts/section/posts.html.htmllayouts/section/section.html.htmllayouts/section/list.html.htmllayouts/section/posts.htmllayouts/section/section.htmllayouts/section/list.htmllayouts/_default/posts.html.htmllayouts/_default/section.html.htmllayouts/_default/list.html.htmllayouts/_default/posts.htmllayouts/_default/section.htmllayouts/_default/list.html` |
| Section list for "posts" with type set to "blog"         | html         | html   | `layouts/blog/posts.html.htmllayouts/blog/section.html.htmllayouts/blog/list.html.htmllayouts/blog/posts.htmllayouts/blog/section.htmllayouts/blog/list.htmllayouts/posts/posts.html.htmllayouts/posts/section.html.htmllayouts/posts/list.html.htmllayouts/posts/posts.htmllayouts/posts/section.htmllayouts/posts/list.htmllayouts/section/posts.html.htmllayouts/section/section.html.htmllayouts/section/list.html.htmllayouts/section/posts.htmllayouts/section/section.htmllayouts/section/list.htmllayouts/_default/posts.html.htmllayouts/_default/section.html.htmllayouts/_default/list.html.htmllayouts/_default/posts.htmllayouts/_default/section.htmllayouts/_default/list.html` |
| Section list for "posts" with layout set to "demolayout" | html         | html   | `layouts/posts/demolayout.html.htmllayouts/posts/posts.html.htmllayouts/posts/section.html.htmllayouts/posts/list.html.htmllayouts/posts/demolayout.htmllayouts/posts/posts.htmllayouts/posts/section.htmllayouts/posts/list.htmllayouts/section/demolayout.html.htmllayouts/section/posts.html.htmllayouts/section/section.html.htmllayouts/section/list.html.htmllayouts/section/demolayout.htmllayouts/section/posts.htmllayouts/section/section.htmllayouts/section/list.htmllayouts/_default/demolayout.html.htmllayouts/_default/posts.html.htmllayouts/_default/section.html.htmllayouts/_default/list.html.htmllayouts/_default/demolayout.htmllayouts/_default/posts.htmllayouts/_default/section.htmllayouts/_default/list.html` |
| Section list for "posts"                                 | rss          | xml    | `layouts/posts/section.rss.xmllayouts/posts/rss.xmllayouts/posts/list.rss.xmllayouts/posts/section.xmllayouts/posts/list.xmllayouts/section/section.rss.xmllayouts/section/rss.xmllayouts/section/list.rss.xmllayouts/section/section.xmllayouts/section/list.xmllayouts/_default/section.rss.xmllayouts/_default/rss.xmllayouts/_default/list.rss.xmllayouts/_default/section.xmllayouts/_default/list.xmllayouts/_internal/_default/rss.xml` |

#### Taxonomy pages

A taxonomy page is a list of terms within a given taxonomy. The examples below assume the following site configuration:

hugo.

yamltomljson

```yaml
taxonomies:
  category: categories
```

| Example                        | OutputFormat | Suffix | Template Lookup Order                                        |
| :----------------------------- | :----------- | :----- | :----------------------------------------------------------- |
| Taxonomy list for "categories" | html         | html   | `layouts/categories/category.terms.html.htmllayouts/categories/terms.html.htmllayouts/categories/taxonomy.html.htmllayouts/categories/list.html.htmllayouts/categories/category.terms.htmllayouts/categories/terms.htmllayouts/categories/taxonomy.htmllayouts/categories/list.htmllayouts/category/category.terms.html.htmllayouts/category/terms.html.htmllayouts/category/taxonomy.html.htmllayouts/category/list.html.htmllayouts/category/category.terms.htmllayouts/category/terms.htmllayouts/category/taxonomy.htmllayouts/category/list.htmllayouts/taxonomy/category.terms.html.htmllayouts/taxonomy/terms.html.htmllayouts/taxonomy/taxonomy.html.htmllayouts/taxonomy/list.html.htmllayouts/taxonomy/category.terms.htmllayouts/taxonomy/terms.htmllayouts/taxonomy/taxonomy.htmllayouts/taxonomy/list.htmllayouts/_default/category.terms.html.htmllayouts/_default/terms.html.htmllayouts/_default/taxonomy.html.htmllayouts/_default/list.html.htmllayouts/_default/category.terms.htmllayouts/_default/terms.htmllayouts/_default/taxonomy.htmllayouts/_default/list.html` |
| Taxonomy list for "categories" | rss          | xml    | `layouts/categories/category.terms.rss.xmllayouts/categories/terms.rss.xmllayouts/categories/taxonomy.rss.xmllayouts/categories/rss.xmllayouts/categories/list.rss.xmllayouts/categories/category.terms.xmllayouts/categories/terms.xmllayouts/categories/taxonomy.xmllayouts/categories/list.xmllayouts/category/category.terms.rss.xmllayouts/category/terms.rss.xmllayouts/category/taxonomy.rss.xmllayouts/category/rss.xmllayouts/category/list.rss.xmllayouts/category/category.terms.xmllayouts/category/terms.xmllayouts/category/taxonomy.xmllayouts/category/list.xmllayouts/taxonomy/category.terms.rss.xmllayouts/taxonomy/terms.rss.xmllayouts/taxonomy/taxonomy.rss.xmllayouts/taxonomy/rss.xmllayouts/taxonomy/list.rss.xmllayouts/taxonomy/category.terms.xmllayouts/taxonomy/terms.xmllayouts/taxonomy/taxonomy.xmllayouts/taxonomy/list.xmllayouts/_default/category.terms.rss.xmllayouts/_default/terms.rss.xmllayouts/_default/taxonomy.rss.xmllayouts/_default/rss.xmllayouts/_default/list.rss.xmllayouts/_default/category.terms.xmllayouts/_default/terms.xmllayouts/_default/taxonomy.xmllayouts/_default/list.xmllayouts/_internal/_default/rss.xml` |

#### Term pages

A term page is a list of pages associated with a given term. The examples below assume the following site configuration:

hugo.

yamltomljson

```yaml
taxonomies:
  category: categories
```

| Example                    | OutputFormat | Suffix | Template Lookup Order                                        |
| :------------------------- | :----------- | :----- | :----------------------------------------------------------- |
| Term list for "categories" | html         | html   | `layouts/categories/term.html.htmllayouts/categories/category.html.htmllayouts/categories/taxonomy.html.htmllayouts/categories/list.html.htmllayouts/categories/term.htmllayouts/categories/category.htmllayouts/categories/taxonomy.htmllayouts/categories/list.htmllayouts/term/term.html.htmllayouts/term/category.html.htmllayouts/term/taxonomy.html.htmllayouts/term/list.html.htmllayouts/term/term.htmllayouts/term/category.htmllayouts/term/taxonomy.htmllayouts/term/list.htmllayouts/taxonomy/term.html.htmllayouts/taxonomy/category.html.htmllayouts/taxonomy/taxonomy.html.htmllayouts/taxonomy/list.html.htmllayouts/taxonomy/term.htmllayouts/taxonomy/category.htmllayouts/taxonomy/taxonomy.htmllayouts/taxonomy/list.htmllayouts/category/term.html.htmllayouts/category/category.html.htmllayouts/category/taxonomy.html.htmllayouts/category/list.html.htmllayouts/category/term.htmllayouts/category/category.htmllayouts/category/taxonomy.htmllayouts/category/list.htmllayouts/_default/term.html.htmllayouts/_default/category.html.htmllayouts/_default/taxonomy.html.htmllayouts/_default/list.html.htmllayouts/_default/term.htmllayouts/_default/category.htmllayouts/_default/taxonomy.htmllayouts/_default/list.html` |
| Term list for "categories" | rss          | xml    | `layouts/categories/term.rss.xmllayouts/categories/category.rss.xmllayouts/categories/taxonomy.rss.xmllayouts/categories/rss.xmllayouts/categories/list.rss.xmllayouts/categories/term.xmllayouts/categories/category.xmllayouts/categories/taxonomy.xmllayouts/categories/list.xmllayouts/term/term.rss.xmllayouts/term/category.rss.xmllayouts/term/taxonomy.rss.xmllayouts/term/rss.xmllayouts/term/list.rss.xmllayouts/term/term.xmllayouts/term/category.xmllayouts/term/taxonomy.xmllayouts/term/list.xmllayouts/taxonomy/term.rss.xmllayouts/taxonomy/category.rss.xmllayouts/taxonomy/taxonomy.rss.xmllayouts/taxonomy/rss.xmllayouts/taxonomy/list.rss.xmllayouts/taxonomy/term.xmllayouts/taxonomy/category.xmllayouts/taxonomy/taxonomy.xmllayouts/taxonomy/list.xmllayouts/category/term.rss.xmllayouts/category/category.rss.xmllayouts/category/taxonomy.rss.xmllayouts/category/rss.xmllayouts/category/list.rss.xmllayouts/category/term.xmllayouts/category/category.xmllayouts/category/taxonomy.xmllayouts/category/list.xmllayouts/_default/term.rss.xmllayouts/_default/category.rss.xmllayouts/_default/taxonomy.rss.xmllayouts/_default/rss.xmllayouts/_default/list.rss.xmllayouts/_default/term.xmllayouts/_default/category.xmllayouts/_default/taxonomy.xmllayouts/_default/list.xmllayouts/_internal/_default/rss.xml` |



### 基本模板和块

基本结构和块结构允许您定义主模板的外壳（即页面的镶边）。

该`block`关键字允许您定义页面的一个或多个主模板的外壳，然后根据需要填充或覆盖部分。

下面定义了一个简单的基本模板`_default/baseof.html`。作为默认模板，它是渲染所有页面的 shell，除非您指定另一个更`*baseof.html`接近查找顺序开头的模板。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ block "title" . }}
      <!-- Blocks may include default content. -->
      {{ .Site.Title }}
    {{ end }}</title>
  </head>
  <body>
    <!-- Code that all your templates share, like a header -->
    {{ block "main" . }}
      <!-- The part of the page that begins to differ between templates -->
    {{ end }}
    {{ block "footer" . }}
    <!-- More shared code, perhaps a footer but that can be overridden if need be in  -->
    {{ end }}
  </body>
</html>
```

从上面的基本模板中，您可以定义[默认列表模板](https://gohugo.io/templates/lists)。默认列表模板将继承上面定义的所有代码，然后可以`"main"`从以下位置实现自己的块：

```html
{{ define "main" }}
  <h1>Posts</h1>
  {{ range .Pages }}
    <article>
      <h2>{{ .Title }}</h2>
      {{ .Content }}
    </article>
  {{ end }}
{{ end }}
```

这会将我们的（基本上是空的）“主”块的内容替换为对列表模板有用的内容。在本例中，我们没有定义`"title"`块，因此基本模板中的内容在列表中保持不变。



### 单页模板

在 [Hugo](https://gohugo.io/) —— 一个流行的静态站点生成器 —— 中，"单页模板"（Single Page Template）通常指的是用于渲染单一内容文件的模板。在Hugo的上下文中，每个内容文件通常对应网站的一个页面。这些内容文件通常是Markdown文件，包含了页面的主要内容和一些元数据（例如标题、日期等）。

单页模板用于定义如何渲染这些内容文件。例如，如果你有一个博客帖子的内容文件，单页模板可以定义如何显示这个帖子的标题、内容、日期等信息。Hugo使用[Go模板](https://gohugo.io/templates/introduction/)来定义这些页面的结构和显示逻辑。

这里有一些关键点关于Hugo的单页模板：

+ **模板结构**：单页模板通常位于`layouts/_default/single.html`。这个模板定义了内容文件如何被渲染成HTML页面。
+ **变量访问**：在单页模板中，你可以访问内容文件的各种属性（例如`.Title`访问标题，`.Content`访问主体内容等）。
+ **自定义模板**：你也可以为特定的内容类型创建自定义的单页模板。例如，如果你有一个名为`product`的内容类型，你可以创建一个`layouts/product/single.html`模板来定义如何渲染这些特定类型的页面。
+ **部分模板**：你还可以使用部分模板（partials）来重用模板代码。例如，你可能有一个部分模板用于渲染页脚，这个部分模板可以在多个地方被重用。
+ **列表页面与单页模板的区别**：与单页模板不同，列表页面模板用于渲染显示多个内容项的页面（例如博客的首页，显示多个帖子的摘要）。

Hugo 中内容的主要视图是单一视图。Hugo 将渲染提供有相应单个模板的每个 Markdown 文件。



#### `posts/single.html`

此单页模板利用 Hugo[基本模板](https://gohugo.io/templates/base/)、日期[`.Format`函数和 https://gohugo.io/functions/format/  以及 [.WordCount页面变量](https://gohugo.io/variables/page/)以及单个内容的特定[分类法](https://gohugo.io/templates/taxonomy-templates/#list-terms-assigned-to-a-page)的范围。[with](https://gohugo.io/functions/go-template/with/)还用于检查分类法是否设置在前面的内容中。

```html
{{ define "main" }}
  <section id="main">
    <h1 id="title">{{ .Title }}</h1>
    <div>
      <article id="content">
        {{ .Content }}
      </article>
    </div>
  </section>
  <aside id="meta">
    <div>
      <section>
        <h4 id="date"> {{ .Date.Format "Mon Jan 2, 2006" }} </h4>
        <h5 id="wordcount"> {{ .WordCount }} Words </h5>
      </section>
      {{ with .GetTerms "topics" }}
        <ul id="topics">
          {{ range . }}
            <li><a href="{{ .RelPermalink }}">{{ .LinkTitle }}</a></li>
          {{ end }}
        </ul>
      {{ end }}
      {{ with .GetTerms "tags" }}
        <ul id="tags">
          {{ range . }}
            <li><a href="{{ .RelPermalink }}">{{ .LinkTitle }}</a></li>
          {{ end }}
        </ul>
      {{ end }}
    </div>
    <div>
      {{ with .PrevInSection }}
        <a class="previous" href="{{ .Permalink }}"> {{ .Title }}</a>
      {{ end }}
      {{ with .NextInSection }}
        <a class="next" href="{{ .Permalink }}"> {{ .Title }}</a>
      {{ end }}
    </div>
  </aside>
{{ end }}
```

要轻松生成具有预先配置的标题的内容类型的新实例（例如，`.md`类似部分中的新文件`project/`），请使用[内容原型](https://gohugo.io/content-management/archetypes/)。



### 列表模板

列表页面模板是用于在单个 HTML 页面中呈现多条内容的模板。此规则的例外是主页，它仍然是一个列表，但有自己的[专用模板](https://gohugo.io/templates/homepage/)。

以下是典型 Hugo 项目目录内容的示例：

```txt
.
...
├── content
|   ├── posts
|   |   ├── _index.md
|   |   ├── post-01.md
|   |   └── post-02.md
|   └── quote
|   |   ├── quote-01.md
|   |   └── quote-02.md
...
```

使用上面的示例，我们假设您有以下内容`content/posts/_index.md`：

```md
---
title: My Go Journey
date: 2017-03-23
publishdate: 2017-03-24
---

I decided to start learning Go in March 2017.

Follow my journey through this new blog.
```

您现在可以在列表模板中访问此 `_index.md` 内容：

```heml
{{ define "main" }}
  <main>
    <article>
      <header>
        <h1>{{ .Title }}</h1>
      </header>
      <!-- "{{ .Content }}" pulls from the markdown content of the corresponding _index.md -->
      {{ .Content }}
    </article>
    <ul>
      <!-- Ranges through content/posts/*.md -->
      {{ range .Pages }}
        <li>
          <a href="{{ .Permalink }}">{{ .Date.Format "2006-01-02" }} | {{ .Title }}</a>
        </li>
      {{ end }}
    </ul>
  </main>
{{ end }}
```

上面将输出以下 HTML：

```go-html-template
<!--top of your baseof code-->
<main>
  <article>
    <header>
      <h1>My Go Journey</h1>
    </header>
    <p>I decided to start learning Go in March 2017.</p>
    <p>Follow my journey through this new blog.</p>
  </article>
  <ul>
    <li><a href="/posts/post-01/">Post 1</a></li>
    <li><a href="/posts/post-02/">Post 2</a></li>
  </ul>
</main>
<!--bottom of your baseof-->
```

#### 列出没有的页面`_index.md`

您不必*为*`_index.md`每个列表页面（即部分、分类、分类术语等）或主页创建文件。如果 Hugo 在渲染列表模板时在相应的内容部分中找不到`_index.md`，则将创建页面，但没有且`{{ .Content }}`只有默认值`.Title`等。

使用相同的`layouts/_default/list.html`模板并将其应用到`quotes`上面的部分将呈现以下输出。请注意，`quotes`没有可`_index.md`从中提取的文件：

`example.com/quote/index.html`

```bash
<!--baseof-->
<main>
  <article>
    <header>
      <!-- Hugo assumes that .Title is the name of the section since there is no _index.md content file from which to pull a "title:" field -->
      <h1>Quotes</h1>
    </header>
  </article>
  <ul>
    <li><a href="https://example.com/quote/quotes-01/">Quote 1</a></li>
    <li><a href="https://example.com/quote/quotes-02/">Quote 2</a></li>
  </ul>
</main>
<!--baseof-->
```

Hugo 的默认行为是复数列表标题；`quote`因此，当使用`.Title` [page 变量](https://gohugo.io/variables/page/)调用时，该部分会变形为“Quotes” 。您可以通过[站点配置](https://gohugo.io/getting-started/configuration/)`pluralizeListTitles`中的指令更改此设置。

#### 列表模板示例

##### 部分模板

[此列表模板对spf13.com](https://spf13.com/)中最初使用的模板进行了轻微修改。它使用[部分模板](https://gohugo.io/templates/partials/)来渲染页面的镶边，而不是使用[基本模板](https://gohugo.io/templates/base/)。下面的示例也使用[内容视图模板](https://gohugo.io/templates/views/) `li.html`或`summary.html`.

布局`/section/posts.html`

```go-html-template
{{ partial "header.html" . }}
{{ partial "subheader.html" . }}
<main>
  <div>
    <h1>{{ .Title }}</h1>
    <ul>
      <!-- Renders the li.html content view for each content/posts/*.md -->
      {{ range .Pages }}
        {{ .Render "li" }}
      {{ end }}
    </ul>
  </div>
</main>
{{ partial "footer.html" . }}
```

#### 分类模板

布局`/_default/taxonomy.html`

```go-html-template
{{ define "main" }}
<main>
  <div>
    <h1>{{ .Title }}</h1>
    <!-- ranges through each of the content files associated with a particular taxonomy term and renders the summary.html content view -->
    {{ range .Pages }}
      {{ .Render "summary" }}
    {{ end }}
  </div>
</main>
{{ end }}
```

#### 订单内容

[Hugo 列表根据您在前面](https://gohugo.io/content-management/front-matter/)提供的元数据呈现内容。除了合理的默认设置之外，Hugo 还提供了多种方法来快速排序列表模板内的内容：

#### 默认：权重 > 日期 > 链接标题 > 文件路径

布局`/partials/default-order.html`

```go-html-template
<ul>
  {{ range .Pages }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按重量

权重越低，优先级越高。因此，重量较轻的内容将首先出现。

布局`/partials/by-weight.html`

```go-html-template
<ul>
  {{ range .Pages.ByWeight }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按日期

布局`/partials/by-date.html`

```go-html-template
<ul>
  <!-- orders content according to the "date" field in front matter -->
  {{ range .Pages.ByDate }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按发布日期

布局`/partials/by-publish-date.html`

```go-html-template
<ul>
  <!-- orders content according to the "publishdate" field in front matter -->
  {{ range .Pages.ByPublishDate }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按有效期

布局`/partials/by-expiry-date.html`

```go-html-template
<ul>
  {{ range .Pages.ByExpiryDate }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 截至上次修改日期

布局`/partials/by-last-mod.html`

```go-html-template
<ul>
  <!-- orders content according to the "lastmod" field in front matter -->
  {{ range .Pages.ByLastmod }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按长度

布局`/partials/by-length.html`

```go-html-template
<ul>
  <!-- orders content according to content length in ascending order (i.e., the shortest content will be listed first) -->
  {{ range .Pages.ByLength }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按标题

布局`/partials/by-title.html`

```go-html-template
<ul>
  <!-- ranges through content in ascending order according to the "title" field set in front matter -->
  {{ range .Pages.ByTitle }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按链接标题

布局 `/partials/by-link-title.html`

```go-html-template
<ul>
  <!-- ranges through content in ascending order according to the "linktitle" field in front matter. If a "linktitle" field is not set, the range will start with content that only has a "title" field and use that value for .LinkTitle -->
  {{ range .Pages.ByLinkTitle }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .LinkTitle }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```

#### 按页面参数

根据指定的前事项参数进行排序。没有指定标题字段的内容将使用网站的`.Site.Params`默认值。如果在某些条目中根本找不到该参数，则这些条目将一起出现在排序的末尾。

布局`/partials/by- rating.html`

```go-html-template
<!-- Ranges through content according to the "rating" field set in front matter -->
{{ range (.Pages.ByParam "rating") }}
  <!-- ... -->
{{ end }}
```

如果目标前文字段嵌套在另一个字段下方，您可以使用点表示法访问该字段。

布局`/partials/by-nested-param.html`

```go-html-template
{{ range (.Pages.ByParam "author.last_name") }}
  <!-- ... -->
{{ end }}
```

#### 相反的顺序

倒序可以应用于上述任何方法。下面以使用`ByDate`为例：

布局/partials/by-date-reverse.html

```go-html-template
<ul>
  {{ range .Pages.ByDate.Reverse }}
    <li>
      <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
      <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
    </li>
  {{ end }}
</ul>
```



### 将内容和前言添加到主页

[主页与 Hugo 中的其他列表页面](https://gohugo.io/templates/lists/)类似，接受文件中的内容和标题`_index.md`。该文件应位于`content`文件夹的根目录下（即`content/_index.md`）。然后，您可以像添加任何其他内容文件一样将正文和元数据添加到主页。

请参阅下面的主页模板或[内容组织，](https://gohugo.io/content-management/organization/)了解有关`_index.md`向列表页面添加内容和标题的作用的更多信息。

以下是主页模板的示例，该模板使用[部分](https://gohugo.io/templates/partials/)模板、[基本](https://gohugo.io/templates/base/)模板和内容文件 at`content/_index.md`来填充`{{ .Title }}`和`{{ .Content }}` [页面变量](https://gohugo.io/variables/page/)。

布局 `/index.html`

```bash
{{ define "main" }}
  <main aria-role="main">
    <header class="homepage-header">
      <h1>{{ .Title }}</h1>
      {{ with .Params.subtitle }}
        <span class="subtitle">{{ . }}</span>
      {{ end }}
    </header>
    <div class="homepage-content">
      <!-- Note that the content for index.html, as a sort of list page, will pull from content/_index.md -->
      {{ .Content }}
    </div>
    <div>
      {{ range first 10 .Site.RegularPages }}
        {{ .Render "summary" }}
      {{ end }}
    </div>
  </main>
{{ end }}
```

在 Hugo 中，`layouts/_index.html` 是一个特殊的模板文件，它用于渲染内容部分的首页。这个模板通常用于展示一个内容部分的概览或摘要。例如，如果你有一个博客部分，`layouts/_index.html` 可能用于渲染博客的首页，展示最新的帖子摘要或其他相关内容。

#### `layouts/_index.html`

这个文件是一个模板文件，它定义了部分首页的 HTML 结构。它可以访问在 `content/_index.md` 中定义的内容和元数据，并且可以包含用于渲染页面的逻辑。

#### `content/_index.md`

这个文件包含部分首页的内容和元数据。元数据通常位于文件的顶部，并使用 YAML、TOML 或 JSON 格式。文件的其余部分包含要在页面上显示的内容，通常使用 Markdown 格式。

#### 关系

+ `layouts/_index.html` 使用在 `content/_index.md` 中定义的内容和元数据来渲染页面。
+ `content/_index.md` 中的内容可以使用 `.Content` 变量在 `layouts/_index.html` 中访问。
+ `content/_index.md` 中的元数据（例如标题或描述）可以使用 `.Title`、`.Params` 等变量在 `layouts/_index.html` 中访问。

#### content/_index.md 这个文件包含部分首页的内容和元数据。

```
---
title: "Welcome to Our Blog"
description: "This is the homepage of our blog section, where you can find the latest articles."
---

Welcome to our blog! Here, we share the latest news, articles, and insights. Check out our most recent posts below.
```

#### layouts/_index.html 这个模板文件定义了如何渲染部分首页的 HTML。

```heml
{{ define "main" }}
  <header>
    <h1>{{ .Title }}</h1>
    <p>{{ .Params.description }}</p>
  </header>
  <section>
    {{ .Content }}
  </section>
  <section>
    <h2>Latest Posts</h2>
    <ul>
      {{ range first 5 .Site.RegularPages }}
        <li>
          <a href="{{ .Permalink }}">{{ .Title }}</a>
          <p>{{ .Summary }}</p>
        </li>
      {{ end }}
    </ul>
  </section>
{{ end }}
```



### 分类模板

分类模板包括分类列表页面、分类术语页面以及在单页模板中使用分类。

Hugo 支持用户定义的内容分组，称为**分类法**。分类法是展示内容之间逻辑关系的分类。如果您不熟悉 Hugo 如何利用这一强大功能，请参阅[内容管理下的分类法。](https://gohugo.io/content-management/taxonomies)

在 Hugo 中，分类模板用于渲染你的内容的不同分类。这些模板允许你为站点的不同部分或分类创建特定的布局和样式。下面我们将深入探讨 Hugo 中的分类模板，包括它们的用途和如何使用它们。

#### 分类模板的用途

+ **组织内容**：分类模板帮助你按类别组织内容，使用户能够轻松浏览和查找相关的帖子或页面。
+ **定制布局**：你可以为不同的分类创建不同的布局和样式，以便为用户提供独特和相关的体验。
+ **生成分类列表**：你可以使用分类模板来生成站点上每个分类的列表页面。

#### 分类模板的类型

1. **列表模板**：用于显示特定分类下的所有内容的列表。
2. **单一模板**：用于显示单一内容项的详细信息。



### 分页

在 Hugo 中，分页允许你将内容列表分割成多个页面，每个页面显示一定数量的内容项。这在博客或新闻网站中特别有用，因为它们通常会有大量的文章或帖子。分页确保页面不会过于拥挤，同时提高了页面加载速度和用户体验。

[`where`](https://gohugo.io/functions/collections/where)当与该函数及其类似 `SQL` 的运算符：[`first`](https://gohugo.io/functions/collections/first/)、[`last`](https://gohugo.io/functions/collections/last/)和结合使用时，Hugo 分页的真正威力就会显现出来[`after`](https://gohugo.io/functions/collections/after/)。您甚至可以按照您习惯的 Hugo 方式[订购内容。](https://gohugo.io/templates/lists/)



**配置：**

+ `paginate`

  默认= `10`. 可以在模板内覆盖此设置。

+ `paginatePath`

  默认= `page`. 允许您为分页页面设置不同的路径。

设置`paginate`为正值会将主页、部分和分类的列表页面拆分为该大小的块。但请注意，章节、分类法和主页的分页页面的生成是*惰性的*——如果没有被引用，则不会创建页面`.Paginator`（见下文）。

`paginatePath`用于使 适应`URL`分页器中的页面（默认设置将在表单上生成 URL `/page/1/`。



### 简短代码 shortcodes

您可以使用与单个页面和列表页面相同的模板语法创建自己的短代码，从而扩展 Hugo 的内置短代码。

短代码是一种将模板整合为小型、可重复使用的片段的方法，您可以将这些片段直接嵌入到内容中。

在 Hugo 中，**Shortcodes** 是一种自定义的简短标记，它允许你在 Markdown 或其他内容文件中快速插入预定义的 HTML、JavaScript 或其他代码片段。Shortcodes 是 Hugo 提供的一种非常强大的功能，它允许你轻松地在内容中嵌入复杂的元素和结构，而无需在 Markdown 文件中插入大量的 HTML 代码。



## i18n

Hugo 的 `i18n`（国际化）功能允许你创建多语言的网站。这意味着你可以为网站的每个部分提供多种语言的翻译，并允许用户根据他们的偏好或地理位置选择语言。下面是关于 Hugo `i18n` 功能的一些关键点和步骤：



### 配置语言

在你的 Hugo 网站的配置文件中（如 `config.toml`、`config.yaml` 或 `config.json`），你需要定义支持的语言及其属性。

```yaml
languages:
  en:
    title: My Website
    weight: 1
  es:
    title: Mi Sitio Web
    weight: 2
```

在这个例子中，我们定义了两种语言：英语（`en`）和西班牙语（`es`）。`title` 是每种语言的网站标题，`weight` 决定了语言选择菜单中的语言顺序。



### 创建 i18n 文件

你需要为每种语言创建一个 i18n 文件，其中包含该语言的所有翻译字符串。这些文件通常放在项目的 `i18n` 目录中，并以语言代码命名（例如 `en.toml`、`es.toml` 等）

```yaml
hello:
  other: Hello
world:
  other: World
```

再比如说 es:

```yaml
[hello]
other = "Hola"

[world]
other = "Mundo"
```



### 使用翻译字符串

在你的模板和内容文件中，你可以使用 Hugo 的 `i18n` 函数来引用翻译字符串。

```bash
<h1>{{ i18n "hello" }} {{ i18n "world" }}</h1>
```

根据用户选择的语言，这将输出相应语言的 "Hello World" 或 "Hola Mundo"。



### 链接到其他语言的页面

你可以使用 `relLangURL` 或 `relPermalink` 函数来创建指向其他语言版本页面的链接。

```bash
<a href="{{ .Permalink | relLangURL "es" }}">Español</a>
```



### 语言选择器

你可能还想在你的网站上添加一个语言选择器，让用户可以手动选择他们的首选语言。

```bash
{{ range .Site.Home.AllTranslations }}
  <a href="{{ .Permalink }}">{{ .Language.LanguageName }}</a>
{{ end }}
```



### 日期和数字格式化

你还可以使用 `i18n` 功能来格式化日期和数字，以适应不同语言的格式习惯。



## data

在 Hugo 中，`data` 文件夹用于存储配置文件，这些文件可以在你的 Hugo 项目的模板和内容文件中使用。这些数据文件可以是 YAML、JSON 或 TOML 格式，并且可以用来存储你希望在多个地方重用的任何类型的数据。这样，你可以在模板中使用这些数据，而无需多次重复相同的内容。



### 数据文件的结构

你可以在 `data` 文件夹中创建任意结构的数据文件。例如：

```yaml
data/
├── authors/
│   ├── john.yaml
│   └── jane.json
└── settings.toml
```



### 数据文件的格式

+ **YAML**

```yaml
# data/authors/john.yaml
name: John Doe
email: john@example.com
```



+ **JSON**

```json
// data/authors/jane.json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```



+ **TOML**

```toml
# data/settings.toml
[owner]
name = "Hugo Website"
```



### 在模板中使用数据文件

你可以在模板文件中使用 `.Site.Data` 变量来访问 `data` 文件夹中的数据。

**访问单个数据文件**

```yaml
{{ $john := .Site.Data.authors.john }}
<p>{{ $john.name }} - {{ $john.email }}</p>
```

**遍历数据文件**

如果你有一个数据文件的集合，你可以遍历它们。

```
{{ range .Site.Data.authors }}
  <p>{{ .name }} - {{ .email }}</p>
{{ end }}
```

注意：在这个例子中，Hugo 会遍历 `authors` 文件夹中的所有数据文件。

**在内容文件中使用数据文件**

你也可以在内容文件中使用数据文件，但通常这是通过在相关的模板中设置变量来完成的。

**使用数据文件的实际应用**

+ **作者信息**: 你可以在 `data` 文件夹中存储关于每个作者的信息，并在博客帖子模板中引用它，以显示关于作者的信息。
+ **站点设置**: 你可以使用 `data` 文件来存储站点的全局设置，比如社交媒体链接、联系信息等。
+ **产品信息**: 如果你的网站有一个产品部分，你可以在 `data` 文件中存储产品的信息，并在产品页面模板中引用它。

**例如：**

```yaml
data/
└── authors/
    ├── john.yaml
    └── jane.yaml

```

其中 john.yaml：

```bash
name: John Doe
email: john@example.com
bio: "John is a software engineer."
```

**jane.yaml**

```yaml
name: Jane Doe
email: jane@example.com
bio: "Jane is a web designer."
```
