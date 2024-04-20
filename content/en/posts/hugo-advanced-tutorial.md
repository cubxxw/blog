---
title: 'Hugo Advanced Tutorial'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-11-06T13:44:09+08:00
draft : false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - blog
categories:
  - Development
description: >
    hugo advanced tutorial
---

# 136: Hugo Advanced

Coming to the advanced part, you need to learn some advanced Hugo techniques in depth.



## Module

**Hugo modules** are the core building blocks of Hugo. A module can be your main project or a smaller module that provides one or more of the 7* component types defined in Hugo: **static**, **content**, **layouts**, **data**, **assets**, **i18n** and **archetypes**.

You can combine modules in any combination you like, and you can even mount directories from non-Hugo projects to form a large virtual union file system.

Hugo modules are powered by Go modules. For more information about Go modules, see:

+ https://github.com/golang/go/wiki/Modules
+ https://go.dev/blog/using-go-modules



Some example projects:

+ https://github.com/bep/docuapi is a theme that has been ported to Hugo Modules while testing this feature. This is a good example of installing non-Hugo projects into the Hugo folder structure. It even shows the JS Bundler implementation in regular Go templates.
+ https://github.com/bep/my-modular-site is a very simple website for testing.





### Module configuration: top level

**💡A simple case is as follows:**

```yaml
module:
   noProxy: none
   noVendor: ""
   private: '*.*'
   proxy:direct
   replacements: ""
   workspace: "off"
```



#### noVendor

An optional Glob pattern matching module path to skip when vending, e.g. `github.com/**`



#### vendorClosest

Once enabled, we will select the vendor module closest to the module using it. The default behavior is to select the first one. Note that a given module path can still only have one dependency, so once it is used, it cannot be redefined.



#### proxy

Defines the proxy server used to download remote modules. The default is `direct`, meaning "git clone" or similar.



#### noproxy

Comma separated list of globs matching paths that should not use the proxy configured above.



#### private

Comma separated list of globs to match paths that should be treated as private.



#### workspaces

The workspace file to use. This will enable Go workspace mode. Note that this can also be set via the OS env, e.g. `export HUGO_MODULE_WORKSPACE=/my/hugo.work` which only works with Go 1.18+. In Hugo `v0.109.0` we changed the default to `off` and now we can resolve any relative working filename relative to the working directory.



### Using hugo module

How to use Hugo modules to build and manage your website.

Most commands of the Hugo module require installation of a newer version of Go (see https://golang.org/dl/) and the associated VCS client (eg: Git, see https://git-scm.com/downloads /). If you are running an "older" site on Netlify, you may need to set GO_VERSION to 1.12 in your environment settings.





## Templates (modules)

I think hugo templates are the most troublesome part of hugo. Templates are HTML files that contain template actions and are located in the `layouts` directory of a project, theme or module.

It can be made very simple, or it can be made very, very rich and complex.

Hugo uses Go's `html/template` and `text/template` libraries as the basis for templates. If you want to learn more about the template function of hugo, we can learn more about the `template` of the go language.



### go language template

Package template implements data-driven templates for generating text output.

To generate HTML output, see html/template, which has the same interface as this package but automatically protects HTML output from certain attacks.



#### html/template

Package template (html/template) implements data-driven templates for generating secure HTML output to prevent code injection. It provides the same interface as text/template and should be used instead of text/template whenever the output is HTML.

So where is the safety? Let’s start learning:

First this package wraps text/template so you can share its template API to safely parse and execute HTML templates.

```go
tmpl, err := template.New("name").Parse(...)
// Error checking elided
err = tmpl.Execute(out, data)
```

HTML templates treat data values as plain text that should be encoded so that they can be safely embedded in HTML documents. Escaping is context-sensitive, so operations can occur in JavaScript, CSS, and URI contexts.

The security model used by this package assumes that the template author is trusted, while the data parameter of Execute is not. More details are provided below.

```go
import "text/template"
...
t, err := template.New("foo").Parse(`{{define "T"}}Hello, {{.}}!{{end}}`)
err = t.ExecuteTemplate(out, "T", "<script>alert('you have been pwned')</script>")
```

Output:

```bash
Hello, <script>alert('you have been pwned')</script>!
```

This is in text/template, but the context in html/template is automatically escaped

```go
import "html/template"
...
t, err := template.New("foo").Parse(`{{define "T"}}Hello, {{.}}!{{end}}`)
err = t.ExecuteTemplate(out, "T", "<script>alert('you have been pwned')</script>")
```

Generated safe output:

```bash'
Hello, &lt;script&gt;alert(&#39;you have been pwned&#39;)&lt;/script&gt;!
```



**Contexts package**

This package understands HTML, CSS, JavaScript and URIs. It adds cleanup functionality to every simple operation pipeline, so,

```bash
<a href="/search?q={{.}}">{{.}}</a>
```

Each {{.}} is overridden during parsing to add escape functions as needed. In this case it becomes

```html
<a href="/search?q={{. | urlescaper | attrescaper}}">{{. | htmlescaper}}</a>
```

Among them, urlescaper, attrescaper and htmlescaper are aliases of internal escape functions.

For these internal escape functions, if the operation pipeline evaluates to a nil interface value, it is treated as an empty string.

Templates are executed by applying them to data structures.

Annotations in templates reference elements of the data structure (usually fields of the structure or keys in a map) to control execution and derive values to be displayed. Execution of the template traverses the structure and sets the cursor, represented by the period '. ' and called a "dot", which converts the value at the current position in the structure into a value as execution proceeds.

The input text of the template is UTF-8 encoded text in any format. "Operations" -- data evaluation or control structures -- are separated by `{{` and `}}`; all text outside of actions is copied unchanged to the output.

Once parsed, templates can safely be executed in parallel, although if a shared Writer is executed in parallel, the output can be interleaved.

Here is a simple example that prints `17 items are made of wool`.

```go
type inventory struct {
Material string
Count uint
}
sweaters := Inventory{"wool", 17}
tmpl, err := template.New("test").Parse("{{.Count}} items are made of {{.Material}}")
if err != nil { panic(err) }
err = tmpl.Execute(os.Stdout, sweaters)
if err != nil { panic(err) }
```



#### Text and spaces

By default, when a template is executed, all text between actions is copied verbatim. For example, the string "items are made of" in the example above appears on standard output when the program is run.

However, to help format template source code, if the left delimiter of an operation ("`{{`" by default) is immediately followed by a minus sign and a white color, all trailing whitespace will be trimmed from the text that immediately precedes it. . Similarly, if the right delimiter ("`}}`") is preceded by white and a minus sign, all leading whitespace will be trimmed from the following text. In these trim markers, white must be present: `{{- 3}}` is like `{{3}}`, but trims the text immediately preceding it, whereas "`{{-3}}`" resolves to Operations containing the number -3.

For example, when executing its source as

```bash
"{{23 -}} < {{- 45}}"
```

The generated output will be

```bash
"23<45"
```

For this trimming, white characters are defined the same as in Go: spaces, horizontal tabs, carriage returns, and newlines.

The usage of `{{-` and `-}}` is used to trim whitespace characters. The use of these two symbols can control the format of the template rendering output, especially when dealing with whitespace characters and newlines.

+ `{{-` will trim off all whitespace characters and newlines to the left of it.
+ `-}}` will trim off all whitespace characters and newlines to the right.



##### Do not use pruning

```bash
{{/* Comment 1 */}}
Hello
{{/* Comment 2 */}}
World
```

Output:

```
Hello

World

```



##### Use pruning

```bash
{{- /* Comment 1 */ -}}
Hello
{{- /* Comment 2 */ -}}
World
```

Output:

```
HelloWorld
```



#### actions

Below is a list of actions. "Parameters" and "Pipelines" are evaluations of data and are defined in detail in the corresponding sections below.

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
If the value ofthe pipeline is empty, no output is generated;
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

在这些例子中，`.` 表示当前的上下文对象。在 `range` 或 `with` 动作中，`.` 会被重新赋值为当前迭代的元素或新的上下文对象。##### Multiple pipelines

You can also use multiple `pipelines` in a template action. For example, in an `if-else` structure:

```bash
{{if .Var1}}
     {{.Var1}}
{{else if .Var2}}
     {{.Var2}}
{{else}}
     Neither Var1 nor Var2 is available.
{{end}}
```

In this example, `.Var1` and `.Var2` are both `pipeline`, and they are evaluated in different `if` and `else if` branches respectively.

pipeline may be a chained sequence of "commands". A command is a simple value (argument) or a function or method call, possibly with multiple arguments:

```bash
Argument
The result is the value of evaluating the argument.
.Method [Argument...]
The method can be alone or the last element of a chain but,
Unlike methods in the middle of a chain, it can take arguments.
The result is the value of calling the method with the
arguments:
dot.Method(Argument1, etc.)
functionName [Argument...]
The result is the value of calling the function associated
with the name:
function(Argument1, etc.)
Functions and function names are described below.
```

Pipelines can be "chained" by delimiting sequences of commands with a "string" of pipeline characters. `|'.` In a chained pipeline, the result of each command is passed as the last argument of the next command. The output of the last command in the pipeline is the pipeline value.



#### Variables

The pipeline inside the action can initialize a variable to capture the result. Initialization has the syntax

```bash
$variable := pipeline
```

where `$variable` is the name of the variable. The operation of declaring a variable produces no output.

Previously declared variables can also be assigned a value, using the syntax

```
$variable = pipeline
```

If a "range" operation initializes a variable, the variable is set to successive elements of the iteration. Additionally, "scope" can declare two variables, separated by commas:

```bash
range $index, $element := pipeline
```

In this case, `$index` and `$element` are set to the `array/slice` index or map key and consecutive values of the element respectively. Note that if there is only one variable, it is assigned the element; this is contrary to convention in Go scope clauses.

The scope of a variable extends to the "end" action ("if", "with", or "range") of the control structure in which the variable is declared, or to the end of the template if there is no such control structure. Template calls do not inherit variables from the call site.



#### Scope

When you use `{{ . }}` in a template, you are actually accessing the current data context passed to the template.

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

In this example, `{{ . }}` refers to the string `"World"` passed to the template.



**Use `{{ . }}` in `range` loop**

```bash
tmpl := template.Must(template.New("test").Parse(`
{{ range . }}
     Hello, {{ . }}!
{{ end }}
`))
tmpl.Execute(os.Stdout, []string{"Alice", "Bob", "Charlie"})

```

In the `range` loop, `{{ . }}` refers to `"Alice"`, `"Bob"`, and `"Charlie"` in the slice respectively.



**Use `{{ . }}`** in the structure

When the context is a struct, you can access its fields using `{{ .FieldName }}`.

```bash
type Person struct {
Name string
Age int
}

tmpl := template.Must(template.New("test").Parse(`
Name: {{ .Name }}
Age: {{ .Age }}
`))
tmpl.Execute(os.Stdout, Person{Name: "Alice", Age: 30})
```

Here, `{{ .Name }}` and `{{ .Age }}` respectively access the `Name` and `Age` fields of the `Person` structure.



**Use `with` statement**

The `with` statement can change the current context.

```
tmpl := template.Must(template.New("test").Parse(`
{{ with .Name }}
     Hello, {{ . }}!
{{ end }}
`))
tmpl.Execute(os.Stdout, Person{Name: "Alice", Age: 30})

```

In the `with` block, `{{ . }}` refers to the value of the `.Name` field.

In the previous example, we used `{{ . }}` to input a variable, where `.` represents the object value of the current scope. In this example, the current scope is the global scope, so `.` is actually the variable passed in when we execute Execute.

The entire template file, a single range module, a single with module, a single block module, etc. can be a scope.

The scope object can also be passed in a more complex structure.

```go
type Params struct {
UserName string
SiteName string
}

tmpl, _ := template.New("").Parse("Hello, this is {{ .SiteName }} of {{ .UserName }}.")
_ = tmpl.Execute(os.Stdout, Params{
     UserName: "Xinwei Xiong",
     SiteName: "Blog",
})
```

Object values in the global scope can be accessed through `$`. In the above example, `{{ .UserName }}` is equivalent to `{{ $.UserName }}`.



##### String formatting

Template provides three built-in functions for text output, namely `print`, `printf`, and `println`, which are equivalent to Sprint, Sprintf, and Sprintln in the fmt package.

```go
{{ print 12 }} {{/* => 12 */}}
{{ printf "%03d" 12 }} {{/* => 012 */}}
{{ println 12 }} {{/* => 12\n */}}
```



### hugo template

Go templates provide an extremely simple templating language that adheres to the belief that only the most basic logic belongs in the template or view layer.



#### Access prevariables

A predefined variable can be a variable that already exists in the current scope (like the `.Title` example in the Variables section below), or it can be a custom variable (like the `$address` example in the section below).

```
{{ .Title }}
{{ $address }}
```

Function parameters are separated by spaces. General syntax:

```
{{ FUNCTION ARG1 ARG2 .. }}
```

The following example calls the `add` function with inputs `1` and `2`:

```
{{ add 1 2 }}
```



### Use the content parameter

An example is used in the Hugo documentation. Most pages benefit from providing a table of contents, but sometimes a table of contents doesn't make much sense. We `notoc` defined a variable earlier that will prevent the directory from being rendered when specifically set to `true`.

```
---
notoc: true
title: Example
---
```

`toc.html` [The following is an example of the corresponding code that can be used in partial templates](https://gohugo.io/templates/partials):

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

Unless otherwise specified, we want the *default* behavior of pages to include directories. This template checks to make sure that the `notoc:` field in the homepage of the page is not `true`.



### Template search order

Hugo uses the following rules to select a template for a given page, starting with the most specific.



#### Search rules

Hugo considers the parameters listed below when selecting a template for a given page. Templates are ordered by specificity. This should feel natural, but check out the table below for specific examples of different parameter variations.

+ Type

   Pages `Kind` (the home page is one of them). See sample tables for each type below. This also determines whether it is a **single page** (i.e. a regular content page. We then look for the template `_default/single.html` in the HTML) or a **list page** (partial list, homepage, category list, category term. Then we have _default/list.html for HTML).

+ Layout: Can be set in front.

+ Output format: Please refer to [Custom output format](https://gohugo.io/templates/output-formats). The output format has both a `name` (e.g. `rss`, `amp`, `html`) and a `suffix` (e.g. `xml`, `html`). We prefer to match both (e.g. `index.amp.html`, but look for less specific templates.

Note that if the output format's media type defines multiple suffixes, only the first one is considered.

+ Language: We will consider the language tag in the template name. If the website language is `fr`, `index.fr.amp.html` will win over `index.amp.html`, but `index.amp.html` will choose the previous `index.fr.html`.
+ type: The value `type` if set previously, otherwise the name of the root section (e.g. "blog"). It always has a value, so if not set, the value is "page".
+ Section: `section` is related to `taxonomy` and type `term`.

Templates can be located in the layout folder of a project or theme, and the most specific template will be selected. Hugo will interweave the searches listed below to find the most specific search for your project or topic.



#### Home Page

| Example | OutputFormat | Suffix | Template Lookup Order                                        |
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

A taxonomy page is a list ofterms within a given taxonomy. The examples below assume the following site configuration:

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
| Term list for "categories" | rss          | xml    | `layouts/categories/term.rss.xmllayouts/categories/category.rss.xmllayouts/categories/taxonomy.rss.xmllayouts/categories/rss.xmllayouts/categories/list.rss.xmllayouts/categories/term.xmllayouts/categories/category.xmllayouts/categories/taxonomy.xmllayouts/categories/list.xmllayouts/term/term.rss.xmllayouts/term/category.rss.xmllayouts/term/taxonomy.rss.xmllayouts/term/rss.xmllayouts/term/list.rss.xmllayouts/term/term.xmllayouts/term/category.xmllayouts/term/taxonomy.xmllayouts/term/list.xmllayouts/taxonomy/term.rss.xmllayouts/taxonomy/category.rss.xmllayouts/taxonomy/taxonomy.rss.xmllayouts/taxonomy/rss.xmllayouts/taxonomy/list.rss.xmllayouts/taxonomy/term.xmllayouts/taxonomy/category.xmllayouts/taxonomy/taxonomy.xmllayouts/ taxonomy/list.xmllayouts/category/term.rss.xmllayouts/category/category.rss.xmllayouts/category/taxonomy.rss.xmllayouts/category/rss.xmllayouts/category/list.rss.xmllayouts/category/term.xmllayouts/ category/category.xmllayouts/category/taxonomy.xmllayouts/category/list.xmllayouts/_default/term.rss.xmllayouts/_default/category.rss.xmllayouts/_default/taxonomy.rss.xmllayouts/_default/rss.xmllayouts/_default/ list.rss.xmllayouts/_default/term.xmllayouts/_default/category.xmllayouts/_default/taxonomy.xmllayouts/_default/list.xmllayouts/_internal/_default/rss.xml` |



### Basic templates and blocks

Basic and block structures allow you to define the shell of the main template (i.e. the chrome of the page).

The `block` keyword allows you to define a shell for one or more main templates of the page, then fill in or overlay sections as needed.

A simple base template `_default/baseof.html` is defined below. As the default template, it is the shell that renders all pages unless you specify another template closer to the beginning of the search order `*baseof.html`.

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
     <!-- More shared code, perhaps a footer but that can be overridden if need be in -->
     {{ end }}
   </body>
</html>
```

From the base template above, you can define a [default list template](https://gohugo.io/templates/lists). The default list template will inherit all the code defined above, and you can then implement your own blocks from `"main"`:

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

This will replace the contents of our (basically empty) "main" block with something useful for the list template. In this example, we haven't defined the "title" block, so the content from the base template remains unchanged in the list.



### Single page template

In [Hugo](https://gohugo.io/) - a popular static site generator - a "Single Page Template" usually refers to a template used to render a single content file. In the context of Hugo, each content file typically corresponds to a page of the website. These content files are usually Markdown files that contain the main content of the page and some metadata (such as title, date, etc.).

Single-page templates are used to define how these content files are rendered. For example, if you have a content file for a blog post, a single-page template can define how to display the post's title, content, date, and other information. Hugo uses [Go template](https://gohugo.io/templates/introduction/) to define the structure and display logic of these pages.

Here are some key points about Hugo’s single page template:

+ **Template structure**: Single-page templates are usually located in `layouts/_default/single.html`. This template defines how content files are rendered into HTML pages.
+ **Variable access**: In a single-page template, you can access various properties of the content file (such as `.Title` to access the title, `.Content` to access the main content, etc.).
+ **Custom Templates**: You can also create custom single-page templates for specific content types. For example, if you have a content type called `product`, you can create a `layouts/product/single.html` template to define how to render pages of these specific types.
+ **Partial Templates**: You can also use partial templates to reuse template code. For example, you might have a partial template for rendering a footer that can be reused in multiple places.
+ **The difference between list page and single-page templates**: Unlike single-page templates, list page templates are used to render pages that display multiple content items (such as the homepage of a blog, which displays summaries of multiple posts).

The primary view for content in Hugo is a single view. Hugo will render every Markdown file provided with a corresponding single template.



#### `posts/single.html`

This single page template utilizes Hugo [Basic Template](https://gohugo.io/templates/base/), date [`.Format` function and https://gohugo.io/functions/format/ and [.WordCount page Variables](https://gohugo.io/variables/page/) and specific [taxonomy](https://gohugo.io/templates/taxonomy-templates/#list-terms-assigned-to-a -page) range. [with](https://gohugo.io/functions/go-template/with/) is also used to check if the taxonomy is set in the previous content.

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

To easily generate new instances of a content type with preconfigured headers (e.g., a new .md file in a `project/`-like section), use [Content Prototype](https://gohugo.io/content- management/archetypes/).



### List template

List page templates are templates used to render multiple pieces of content in a single HTML page. The exception to this rule is the homepage, which is still a list but has its own [private template](https://gohugo.io/templates/homepage/).

The following is an example of the contents of a typical Hugo project directory:

```txt
.
...
├── content
| ├── posts
| | ├── _index.md
| | ├── post-01.md
| | └── post-02.md
| └── quote
| | ├── quote-01.md
| | └── quote-02.md
...
```

Using the example above, let's assume you have the following `content/posts/_index.md`:

```md
---
title: My Go Journey
date: 2017-03-23
publishdate: 2017-03-24
---

I decided to start learning Go in March 2017.

Follow my journey through this new blog.
```

You can now access this `_index.md` content in the list template:

```heml
{{ define "main" }}
   <main>
     <article>
       <header>
         <h1>{{ .Title }}</h1>
       </header>
       <!-- "{{ .Content }}" pulls from the markdown content of the corresponding _index.md -->{{ .Content }}
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

The above will output the following HTML:

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

#### List the missing pages `_index.md`

You don't have to create a `_index.md` file for each list page (i.e. section, category, category term, etc.) or homepage. If Hugo cannot find `_index.md` in the corresponding content section when rendering the list template, the page will be created but without and `{{ .Content }}` with only the default `.Title` etc.

Using the same `layouts/_default/list.html` template and applying it to the `quotes` section above will render the following output. Note that `quotes` has no file to extract from `_index.md`:

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

Hugo's default behavior is to pluralize list titles; `quote` therefore, when called with `.Title` [page variable](https://gohugo.io/variables/page/), this part will be transformed into "Quotes". You can change this setting through the directive in `pluralizeListTitles` in [Site Configuration](https://gohugo.io/getting-started/configuration/).

#### List template example

##### Partial template

[This listing template is slightly modified from the template originally used at spf13.com](https://spf13.com/). It uses Partial Templates to render the page's chrome instead of Base Templates. The following examples also use [Content View Template](https://gohugo.io/templates/views/) `li.html` or `summary.html`.

Layout `/section/posts.html`

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

#### Classification template

Layout `/_default/taxonomy.html`

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

#### Order content

[Hugo lists render content based on the metadata you provide in front](https://gohugo.io/content-management/front-matter/). In addition to sensible defaults, Hugo provides several ways to quickly sort content within list templates:

#### Default: Weight > Date > Link Title > File Path

Layout `/partials/default-order.html`

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

#### By weight

The lower the weight, the higher the priority. Therefore, the lighter weight content will appear first.

Layout `/partials/by-weight.html`

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

#### By date

Layout `/partials/by-date.html`

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

#### By release date

Layout `/partials/by-publish-date.html`

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

#### According to validity period

Layout `/partials/by-expiry-date.html`

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

#### As of last modified date

Layout `/partials/by-last-mod.html`

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

#### By length

Layout `/partials/by-length.html`

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

#### By title

Layout `/partials/by-title.html`

```go-html-template
<ul>
   <!-- rAnges through content in ascending order according to the "title" field set in front matter -->
   {{ range .Pages.ByTitle }}
     <li>
       <h1><a href="{{ .Permalink }}">{{ .Title }}</a></h1>
       <time>{{ .Date.Format "Mon, Jan 2, 2006" }}</time>
     </li>
   {{ end }}
</ul>
```

#### Press link title

Layout `/partials/by-link-title.html`

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

#### By page parameters

Sort according to the specified precedence parameters. Content that does not specify a title field will use the site's `.Site.Params` default value. If the parameter is not found at all in some entries, these entries will appear together at the end of the sort.

Layout `/partials/by-rating.html`

```go-html-template
<!-- Ranges through content according to the "rating" field set in front matter -->
{{ range (.Pages.ByParam "rating") }}
   <!-- ... -->
{{ end }}
```

If the target preceding field is nested below another field, you can access the field using dot notation.

Layout `/partials/by-nested-param.html`

```go-html-template
{{ range (.Pages.ByParam "author.last_name") }}
   <!-- ... -->
{{ end }}
```

#### Reverse order

Reverse order can be applied to any of the above methods. The following uses `ByDate` as an example:

layout/partials/by-date-reverse.html

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



### Add content and preface to home page

[Homepage is similar to other list pages in Hugo](https://gohugo.io/templates/lists/), accepting content and title `_index.md` from a file. This file should be located in the root of the `content` folder (i.e. `content/_index.md`). You can then add body text and metadata to the homepage just like any other content file.

See the homepage template below or [Content Organization,](https://gohugo.io/content-management/organization/) for more information on the role of `_index.md` in adding content and titles to list pages.

Here is an example of a homepage template that uses the [Partial](https://gohugo.io/templates/partials/) template, the [Basic](https://gohugo.io/templates/base/) template and content files at `content/_index.md` to fill in `{{ .Title }}` and `{{ .Content }}` [page variables](https://gohugo.io/variables/page/).

Layout `/index.html`

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

In Hugo, `layouts/_index.html` is a special template file that is used to render the home page of the content section. This template is typically used to present an overview or summary of a content section. For example, if you have a blog section, `layouts/_index.html` might be used to render the homepage of the blog, displaying a summary of the latest posts or other relevant content.

#### `layouts/_index.html`

This file is a template file that defines the HTML structure of part of the homepage. It has access to content and metadata defined in `content/_index.md` and can contain logic for rendering the page.

#### `content/_index.md`

This file contains some of the home page content and metadata. Metadata is usually located at the top of the file and uses YAML, TOML, or JSON format. The rest of the file contains the content to be displayed on the page, typically using Markdown format.

#### relation

+ `layouts/_index.html` renders the page using the content and metadata defined in `content/_index.md`.
+ Content in `content/_index.md` can be accessed in `layouts/_index.html` using the `.Content` variable.
+ Metadata in `content/_index.md` (such as title or description) can be accessed in `layouts/_index.html` using variables such as `.Title`, `.Params`, etc.

#### content/_index.md This file contains part of the home page content and metadata.

```
---
title: "Welcome to Our Blog"
description: "This is the homepage of our blog section, where you can find the latest articles."
---

Welcome to our blog! Here, we share the latest news, articles, and insights. Check out our most recent posts below.
```

#### layouts/_index.html This template file defines how to render the HTML of part of the homepage.

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



### Classification template

Category templates include category list pages, category term pages, and the use of categories in single-page templates.

Hugo supports user-defined groupings of content called taxonomies. A taxonomy is a classification that shows logical relationships between content. If you're unfamiliar with how Hugo leverages this powerful feature, see Taxonomy under Content Management. ](https://gohugo.io/content-management/taxonomies)

In Hugo, category templates are used to render different categories of your content. These templates allow you to create specific layouts and styles for different sections or categories of your site. Below we’ll take a deep dive into classification templates in Hugo, including their purpose and how to use them.

#### Purpose of classification template

+ **Organize Content**: Category templates help you organize your content by categories, making it easy for users to browse and find related posts or pages.
+ **Customized layouts**: You can create different layouts and styles for different categories to provide users with a unique and relevant experience.
+ **Generate Category List**: You can use category templates to generate a list page for each category on your site.

#### Type of classification template

1. **List Template**: Used to display a list of all content under a specific category.
2. **Single Template**: Used to display detailed information of a single content item.



### Pagination

In Hugo, pagination allows you to split a content list into multiple pages, each page displaying a certain number of content items. This is especially useful in blogs or news sites, as they often have a large number of articles or posts. Pagination ensures pages don’t become overcrowded while improving page loading speed and user experience.

[`where`](https://gohugo.io/functions/collections/where) When used with this function and its `SQL`-like operators: [`first`](https://gohugo.io/functions/ collections/first/), [`last`](https://gohugo.io/functions/collections/last/) and [`after`](https:/ /gohugo.io/functions/collections/after/). You can even order content the Hugo way you're used to. ](https://gohugo.io/templates/lists/)



**Configuration:**

+ `paginate`

   Default = `10`. Can be configured in moduleThis setting is overridden within the board.

+ `paginatePath`

   Default = `page`. Allows you to set different paths for paginated pages.

Setting `paginate` to a positive value will split home, section and category list pages into chunks of that size. Note, however, that the generation of pagination pages for chapters, taxonomies and homepages is *lazy* - if not referenced, the page `.Paginator` will not be created (see below).

`paginatePath` is used to adapt the page to the `URL` paginator (the default setting will generate the URL `/page/1/` on the form.



### shortcodes shortcodes

You can extend Hugo's built-in shortcodes by creating your own shortcodes using the same template syntax as single and list pages.

Shortcodes are a way to consolidate templates into small, reusable snippets that you can embed directly into your content.

In Hugo, **Shortcodes** are custom short tags that allow you to quickly insert predefined HTML, JavaScript, or other code snippets in Markdown or other content files. Shortcodes are a very powerful feature provided by Hugo that allow you to easily embed complex elements and structures in your content without inserting a lot of HTML code in the Markdown file.

#### Create Shortcodes

Shortcodes files are usually stored in the `layouts/shortcodes` directory of the Hugo project. Each Shortcode is a separate HTML file, and the file name (not including the extension) is the name of the Shortcode.

For example, create a Shortcode with the file path `layouts/shortcodes/greet.html`:

```bash
<!-- layouts/shortcodes/greet.html -->
Hello, {{ .Get 0 }}!
```


### Configuration language

In your Hugo website's configuration file (such as `config.toml`, `config.yaml` or `config.json`) you need to define the supported languages and their properties.

```yaml
languages:
   en:
     title: My Website
     weight: 1
   es:
     title: Mi Sitio Web
     weight: 2
```

In this example, we define two languages: English (`en`) and Spanish (`es`). `title` is the website title for each language, and `weight` determines the order of languages in the language selection menu.



### Create i18n file

You need to create an i18n file for each language that contains all the translation strings for that language. These files are usually placed in the project's `i18n` directory and named after the language code (e.g. `en.toml`, `es.toml`, etc.)

```yaml
hello:
   other: Hello
world:
   other: World
```

Another example is es:

```yaml
[hello]
other = "Hola"

[world]
other = "Mundo"
```



### Use translation strings

In your templates and content files, you can use Hugo's `i18n` function to reference translation strings.

```bash
<h1>{{ i18n "hello" }} {{ i18n "world" }}</h1>
```

Depending on the language selected by the user, this will output either "Hello World" or "Hola Mundo" in the appropriate language.



### Links to pages in other languages

You can use the `relLangURL` or `relPermalink` functions to create links to pages in other languages.

```bash
<a href="{{ .Permalink | relLangURL "es" }}">Español</a>
```



### Language selector

You may also want to add a language selector to your website to allow users to manually select their preferred language.

```bash
{{ range .Site.Home.AllTranslations }}
   <a href="{{ .Permalink }}">{{ .Language.LanguageName }}</a>
{{ end }}
```



### Date and number formatting

You can also use the `i18n` function to format dates and numbers to adapt to the formatting conventions of different languages.



## data

In Hugo, the `data` folder is used to store configuration files that can be used in the templates and content files of your Hugo project. These data files can be in YAML, JSON or TOML format and can be used to store any type of data you wish to reuse in multiple places. This way, you can use this data in your templates without repeating the same content multiple times.



### Structure of data file

You can create data files of any structure in the `data` folder. For example:

```yaml
data/
├── authors/
│ ├── john.yaml
│ └── jane.json
└── settings.toml
```



### Data file format

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



### Using data files in templates

You can use the `.Site.Data` variable in the template file to access the data in the `data` folder.

**Access a single data file**

```yaml
{{ $john := .Site.Data.authors.john }}
<p>{{ $john.name }} - {{ $john.email }}</p>
```

**Traverse data files**

If you have a collection of data files, you can iterate over them.

```
{{ range .Site.Data.authors }}
   <p>{{ .name }} - {{ .email }}</p>
{{ end }}
```

Note: In this example, Hugo will iterate through all data files in the `authors` folder.

**Using data files in content files**

You can also use data files in content files, but usually this is done by setting variables in the relevant template.

**Practical applications using data files**

+ **Author Information**: You can store information about each author in the `data` folder and reference it in the blog post template to display information about the author.
+ **Site Settings**: You can use `data` files to store global settings for your site, such as social media links, contact information, etc.
+ **Product Information**: If your website has a products section, you can store the product's information in a `data` file and reference it in the product page template.

**For example:**

```yaml
data/
└── authors/
     ├── john.yaml
     └── jane.yaml

```

Where john.yaml:

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